import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createClient } from "redis";
import { jsPDF } from "jspdf";
import { NextRequest } from "next/server";
import { GET as pdfData } from "../app/api/report/[reportId]/pdf/route";
import { saveServerReport } from "../server/security/reportAccess";
import { applyVerifiedPayment, saveOrder, type CheckoutOrder } from "../server/payments/orders";
import { reportKey } from "../server/storage/paymentStore";
import { buildPdfReportModel } from "../server/pdf/reportModel";
import { buildLegacyFreePdfModel, loadPdfExportModel } from "../lib/pdf-download";
import { buildReportPdf, generateReportPdf, type PdfFonts } from "../lib/pdf-generator";
import { adaptReport } from "../lib/report-adapter";
import { mapBackendToFrontend } from "../lib/mapper";
import ResultsScreen from "../components/ResultsScreen";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";
import { extractWebsiteSnapshot } from "../lib/content-extractor";
import { assessPurchaseReadiness } from "../services/scoring/purchaseReadiness";
import { GET as paidReportData } from "../app/api/report/[reportId]/route";

async function main() {
  const redisUrl = new URL(process.env.PAYMENT_TEST_REDIS_URL || "redis://127.0.0.1:6379/15");
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(redisUrl.hostname) && redisUrl.pathname === "/15", "Use a disposable local Redis database 15");
  const redis = createClient({ url: redisUrl.toString(), socket: { connectTimeout: 3000, reconnectStrategy: false } });
  redis.on("error", () => {});
  await redis.connect(); await redis.flushDb();
  const savedEnv = { ...process.env }, originalFetch = globalThis.fetch, originalSave = jsPDF.API.save;
  const globals = ["window", "document", "self", "HTMLElement", "Element", "SVGElement", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle", "IS_REACT_ACT_ENVIRONMENT"];
  const savedGlobals = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let dom: JSDOM | undefined, root: Root | null = null;
  let assertions = 0, outage = false, failFonts = false, savedPdf: { name: string; pages: number } | undefined;
  let pdfCalls = 0;
  const check = (condition: unknown, message: string) => { assert.ok(condition, message); assertions++; };
  const fonts: PdfFonts = {
    regular: (await readFile(new URL("../public/fonts/pdf/DejaVuSans.ttf", import.meta.url))).toString("base64"),
    bold: (await readFile(new URL("../public/fonts/pdf/DejaVuSans-Bold.ttf", import.meta.url))).toString("base64"),
  };
  const request = (id: string, token?: string, query = "") => pdfData(new NextRequest(`https://strangerlens.example/api/report/${id}/pdf${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }), { params: Promise.resolve({ reportId: id }) });
  const encode = (value: any): any => typeof value === "string" && value !== "OK" ? Buffer.from(value).toString("base64") : Array.isArray(value) ? value.map(encode) : value;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://pdf-test.upstash.io")) {
      if (outage) return Response.json({ error: "storage unavailable" }, { status: 503 });
      const execute = async (command: any[]) => {
        try { return { result: encode(await redis.sendCommand(command.map(String))) }; }
        catch (error) { return { error: (error as Error).message }; }
      };
      const body = JSON.parse(String(init?.body));
      return Response.json(Array.isArray(body[0]) ? await Promise.all(body.map(execute)) : await execute(body));
    }
    if (url.startsWith("/api/report/") && url.endsWith("/pdf")) {
      pdfCalls++;
      return request(url.split("/").at(-2)!, new Headers(init?.headers).get("authorization")?.replace(/^Bearer /, ""));
    }
    if (url.startsWith("/fonts/pdf/")) return failFonts ? new Response("unavailable", { status: 503 }) : new Response(await readFile(new URL(`../public${url}`, import.meta.url)));
    throw new Error(`Unexpected request (PDF export must not scan, call AI or change Dodo): ${url}`);
  };
  const create = () => saveServerReport({ domain: "example.com", normalizedUrl: "https://example.com/original-analysis", snapshot: paymentSnapshot, fullAnalysis: structuredClone(paymentAnalysis) });
  const unmount = async () => { if (root) await act(async () => { root!.unmount(); root = null; }); };
  try {
    process.env.UPSTASH_REDIS_REST_URL = "https://pdf-test.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.DODO_ENVIRONMENT = "test_mode"; process.env.DODO_PAYMENTS_API_KEY = "test-key"; process.env.DODO_PRODUCT_ID = "pdt_single";
    const free = await create(), paid = await create();
    const order: CheckoutOrder = { orderId: randomUUID(), reportId: paid.reportId, environment: "test_mode", productId: "pdt_single", createdAt: Date.now(), sessionId: "cks_pdf_fixture" };
    await saveOrder(order); await applyVerifiedPayment(order, "pay_pdf_fixture", true);
    const stored = JSON.parse((await redis.get(reportKey(paid.reportId)))!);
    stored.createdAt = Date.UTC(2025, 4, 9);
    await redis.set(reportKey(paid.reportId), JSON.stringify(stored));
    const before = await redis.get(reportKey(paid.reportId));
    check((await request(paid.reportId)).status === 404, "paid export requires original report ownership");
    check((await request(paid.reportId, free.reportToken)).status === 404, "another report's token cannot export premium");
    check((await request(randomUUID(), paid.reportToken)).status === 404, "missing report returns controlled error");
    const freeResponse = await request(free.reportId, free.reportToken, "?paid=true&unlocked=true&tier=paid&payment_id=pay_pdf_fixture");
    const freeModel = (await freeResponse.json()).report;
    check(freeModel.tier === "free" && !JSON.stringify(freeModel).includes(privateText), "forged client tier/payment ID cannot leak premium PDF data");
    check(freeModel.actions.length === 0 && freeModel.evidence.length === 0 && freeModel.signals.every((s: any) => !s.explanation && !s.working.length && !s.improvements.length), "free PDF DTO strips every detailed/locked section");
    const paidResponse = await request(paid.reportId, paid.reportToken);
    const paidModel = (await paidResponse.json()).report;
    check(paidResponse.headers.get("cache-control") === "private, no-store" && paidResponse.headers.get("vary") === "Authorization", "PDF API is private and non-cacheable");
    check(paidModel.tier === "paid" && paidModel.url.endsWith("/original-analysis") && paidModel.analysisDate === "2025-05-09T00:00:00.000Z", "PDF uses original stored URL and date, never current export date");
    check(paidModel.score === paymentAnalysis.overall_score && paidModel.signals.length === 5 && paidModel.signals.every((s: any) => s.score === 72), "all six original scores remain unchanged");
    for (const title of ["First Impression", "Audience", "Value", "Trust", "Action"]) check(paidModel.signals.some((s: any) => s.title === title && s.explanation === privateText), `${title} includes actual diagnostics`);
    check(paidModel.actions.some((i: any) => i.paragraphs.some((p: string) => p.includes("Check my website"))), "paid PDF includes actual copy-ready improvement");
    check(paidModel.evidence.some((i: any) => i.paragraphs.includes("Build clearer websites")), "paid evidence comes from verified report references");
    const categorized = structuredClone(stored);
    categorized.fullAnalysis.risks[0].category = "first_impression";
    check(buildPdfReportModel(categorized, true).signals[0].unclear.includes("Show a concrete example"), "first_impression risk keys keep their original signal association");
    check(!JSON.stringify(paidModel).includes(paid.reportToken) && !JSON.stringify(paidModel).includes(stored.tokenHash) && !JSON.stringify(paidModel).includes("test-key"), "export DTO contains no entitlement/database/Dodo secrets");
    check(await redis.get(reportKey(paid.reportId)) === before, "PDF export does not modify Upstash payment/report records");
    process.env.DODO_ENVIRONMENT = "live_mode";
    check((await request(paid.reportId, paid.reportToken)).status === 403, "test entitlement cannot export premium in live mode");
    process.env.DODO_ENVIRONMENT = "test_mode";
    stored.payment.active = false; await redis.set(reportKey(paid.reportId), JSON.stringify(stored));
    check((await request(paid.reportId, paid.reportToken)).status === 403, "refunded entitlement cannot export premium or silently downgrade");
    stored.payment.active = true; await redis.set(reportKey(paid.reportId), JSON.stringify(stored));
    outage = true; check((await request(paid.reportId, paid.reportToken)).status === 503, "database outage fails closed"); outage = false;

    const preview = { ...mapBackendToFrontend(paymentAnalysis, paid.normalizedUrl, paymentSnapshot), reportId: paid.reportId, reportToken: paid.reportToken, score: 999, isFreeTierOnly: false };
    const canonical = adaptReport(preview);
    check((await loadPdfExportModel(canonical)).score === 72, "tampered browser score never enters paid PDF");
    const legacy = adaptReport({ ...preview, reportId: undefined, reportToken: undefined });
    check(buildLegacyFreePdfModel(legacy).tier === "free" && !JSON.stringify(buildLegacyFreePdfModel(legacy)).includes(privateText), "legacy previews have a strict free-only whitelist even with premium client flags");
    jsPDF.API.save = function (name: string) { savedPdf = { name, pages: this.getNumberOfPages() }; return this; };
    failFonts = true;
    await assert.rejects(() => generateReportPdf(canonical, true), /fonts could not be loaded/); assertions++;
    check(!savedPdf, "font failures do not download an incomplete PDF");
    failFonts = false; await generateReportPdf(canonical, false);
    check(savedPdf?.name === "StrangerLens-Full-Report.pdf" && savedPdf.pages > 1, "only server authorization selects premium filename, regardless of frontend flag");
    savedPdf = undefined;
    await generateReportPdf(adaptReport({ ...preview, reportId: free.reportId, reportToken: free.reportToken }), true);
    check(savedPdf?.name === "StrangerLens-Free-Report.pdf", "an owned unpaid report still downloads only the free PDF even with a forged paid UI flag");
    savedPdf = undefined; await generateReportPdf(legacy, true);
    check(savedPdf?.name === "StrangerLens-Free-Report.pdf", "frontend paid flag alone can only produce a free legacy summary");

    const outputDirectory = process.env.PDF_QA_OUTPUT_DIR || path.join(tmpdir(), "strangerlens-pdf-qa");
    await mkdir(outputDirectory, { recursive: true });
    const purchaseSnapshot = extractWebsiteSnapshot('<main><section><h1>Build clearer websites</h1><p>Our paid plans include 20 reports. Save time writing reports.</p><a href="/pricing">Pricing</a></section><section id="pricing"><h2>Our paid plans</h2><div class="pricing-card"><h3>Pro plan</h3><span class="price">$19/month</span><button>Buy now</button></div><p>Cancel anytime. Contact support for refund questions.</p></section></main>', {baseUrl:"https://example.com"});
    const purchaseAnalysis = {...structuredClone(paymentAnalysis), purchase_readiness:assessPurchaseReadiness(purchaseSnapshot)!};
    purchaseAnalysis.purchase_readiness.details!.recommendations.push("PAID_PURCHASE_RECOMMENDATION_SENTINEL");
    const purchaseReport = await saveServerReport({domain:"example.com",normalizedUrl:"https://example.com/purchase",snapshot:purchaseSnapshot,fullAnalysis:purchaseAnalysis});
    const purchaseFree = (await (await request(purchaseReport.reportId,purchaseReport.reportToken,"?paid=true")).json()).report;
    check(purchaseFree.tier==="free" && purchaseFree.signals.length===6 && !JSON.stringify(purchaseFree).includes("PAID_PURCHASE_RECOMMENDATION_SENTINEL"), "purchase PDF route ignores forged paid query and redacts the sixth signal");
    const purchaseOrder: CheckoutOrder = {orderId:randomUUID(),reportId:purchaseReport.reportId,environment:"test_mode",productId:"pdt_single",createdAt:Date.now(),sessionId:"cks_purchase_fixture"};
    await saveOrder(purchaseOrder); await applyVerifiedPayment(purchaseOrder,"pay_purchase_fixture",true);
    check((await request(purchaseReport.reportId,free.reportToken)).status===404,"another report's token cannot access purchase details");
    const purchasePaidStored = JSON.parse((await redis.get(reportKey(purchaseReport.reportId)))!);
    buildPdfReportModel(purchasePaidStored, true);
    const purchasePaidResponse = await request(purchaseReport.reportId,purchaseReport.reportToken);
    const purchasePaidPayload = await purchasePaidResponse.json();
    assert.equal(purchasePaidResponse.status, 200, JSON.stringify(purchasePaidPayload));
    const purchasePaid = purchasePaidPayload.report;
    check(purchasePaid.tier==="paid" && JSON.stringify(purchasePaid).includes("PAID_PURCHASE_RECOMMENDATION_SENTINEL"), "sixth-signal PDF findings require verified server payment");
    const fullPurchaseResponse = await paidReportData(new NextRequest(`https://example.com/api/report/${purchaseReport.reportId}`,{headers:{Authorization:`Bearer ${purchaseReport.reportToken}`}}),{params:Promise.resolve({reportId:purchaseReport.reportId})});
    const fullPurchase = (await fullPurchaseResponse.json()).analysis.purchase_readiness;
    check(fullPurchase.score===purchaseAnalysis.purchase_readiness.score,"stored paid report/history retrieval returns the original independent assessment");
    check(Array.isArray(fullPurchase.details.hesitations) && Array.isArray(fullPurchase.details.pricingAndValueIssues), "paid assessment arrays survive existing Redis payment Lua/cjson round-trip");
    const purchaseStored:any = await redis.get(reportKey(purchaseReport.reportId));
    const refunded=JSON.parse(purchaseStored);refunded.payment.active=false;await redis.set(reportKey(purchaseReport.reportId),JSON.stringify(refunded));
    check((await request(purchaseReport.reportId,purchaseReport.reportToken)).status===403,"refund revokes purchase-readiness premium PDF access");
    await redis.set(reportKey(purchaseReport.reportId),purchaseStored);
    await writeFile(path.join(outputDirectory,"purchase-free.pdf"),Buffer.from(buildReportPdf(purchaseFree,fonts).output("arraybuffer")));
    await writeFile(path.join(outputDirectory,"purchase-paid.pdf"),Buffer.from(buildReportPdf(purchasePaid,fonts).output("arraybuffer")));
    const docs = { free: buildReportPdf(freeModel, fonts), paid: buildReportPdf(paidModel, fonts) };
    for (const [name, doc] of Object.entries(docs)) {
      await writeFile(path.join(outputDirectory, `${name}.pdf`), Buffer.from(doc.output("arraybuffer")));
      check(doc.getNumberOfPages() >= 1, `${name} PDF generates real pages`);
      check(doc.internal.pageSize.getWidth() > 209 && doc.internal.pageSize.getWidth() < 211 && doc.internal.pageSize.getHeight() > 296, `${name} PDF uses A4`);
    }
    const missing = structuredClone(stored);
    missing.fullAnalysis.first_seconds = {}; missing.fullAnalysis.risks = []; missing.fullAnalysis.other_improvements = [];
    missing.fullAnalysis.visitor_thought = undefined; missing.fullAnalysis.priority_fix = undefined;
    for (const signal of Object.values(missing.fullAnalysis.signals) as any[]) { signal.explanation = ""; signal.evidence = []; }
    const missingModel = buildPdfReportModel(missing, true);
    check(missingModel.signals.every(s => !s.working.length && !s.unclear.length && !s.improvements.length), "missing findings never create generic advice or score-based claims");
    await writeFile(path.join(outputDirectory, "missing.pdf"), Buffer.from(buildReportPdf(missingModel, fonts).output("arraybuffer")));
    const long = structuredClone(stored);
    long.normalizedUrl = `https://example.com/${"long-path-without-spaces-".repeat(45)}`;
    long.fullAnalysis.signals.audience.explanation = Array.from({ length: 100 }, (_, i) => `LONG_LINE_${i} This is original detailed audience evidence with enough content to exercise wrapping and page breaks.`).join("\n");
    long.fullAnalysis.other_improvements[0].copyable_suggestion = "Start improving your website with one clear next step. ".repeat(100) + "COPY_END_MARKER";
    long.fullAnalysis.signals.trust.status = "Recorded trust status ".repeat(30);
    const longDoc = buildReportPdf(buildPdfReportModel(long, true), fonts);
    check(longDoc.getNumberOfPages() > docs.paid.getNumberOfPages(), "long text paginates without truncation");
    await writeFile(path.join(outputDirectory, "long.pdf"), Buffer.from(longDoc.output("arraybuffer")));
    const multilingual = structuredClone(paidModel);
    multilingual.actions.push({ title: "Recorded multilingual text", paragraphs: ["Café résumé - Ελληνικά - Русский - naïve façade"] });
    await writeFile(path.join(outputDirectory, "multilingual.pdf"), Buffer.from(buildReportPdf(multilingual, fonts).output("arraybuffer")));

    // Use the actual unchanged Results layout and PDF click handler at both widths.
    for (const width of [390, 1440]) {
      dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", { url: "https://strangerlens.example/", pretendToBeVisual: true });
      for (const key of globals) {
        let value: any = key === "window" || key === "self" ? dom.window : key === "document" ? dom.window.document : key === "IS_REACT_ACT_ENVIRONMENT" ? true : (dom.window as any)[key];
        if (["requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle"].includes(key)) value = value.bind(dom.window);
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
      }
      Object.defineProperty(dom.window, "innerWidth", { value: width });
      let alertMessage = ""; (globalThis as any).alert = (message: string) => { alertMessage = message; };
      root = createRoot(dom.window.document.getElementById("app")!);
      await act(async () => { root!.render(<ResultsScreen rawUrl={paid.normalizedUrl} analysisData={preview} isUnlocked={true} onBackToLanding={() => {}} />); });
      const button = [...dom.window.document.querySelectorAll("button")].find(b => b.textContent?.includes("Download PDF"))!;
      savedPdf = undefined; const callsBefore = pdfCalls;
      await act(async () => { button.click(); });
      check(button.disabled && button.textContent?.includes("Generating PDF"), `${width}px download provides loading feedback`);
      for (let i = 0; i < 100 && !savedPdf; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
      check(savedPdf?.name === "StrangerLens-Full-Report.pdf" && pdfCalls > callsBefore && !button.disabled, `${width}px PDF click reauthorizes and downloads premium`);
      outage = true;
      await act(async () => { button.click(); });
      for (let i = 0; i < 100 && !alertMessage; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
      check(alertMessage.includes("PDF generation failed") && !button.disabled, `${width}px failure shows error and restores button`);
      outage = false; await unmount(); dom.window.close(); dom = undefined;
    }
    console.log(`PASS: ${assertions} PDF/security/download assertions. Actual PDF fixtures written to ${outputDirectory}. No real payment, scan or AI request was made.`);
  } finally {
    await unmount(); dom?.window.close();
    for (const [key, descriptor] of savedGlobals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; }
    delete (globalThis as any).alert;
    if (originalSave) jsPDF.API.save = originalSave; else delete jsPDF.API.save;
    globalThis.fetch = originalFetch; process.env = savedEnv;
    await redis.flushDb(); await redis.quit();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

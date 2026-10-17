import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createClient } from "redis";
import { jsPDF } from "jspdf";
import { NextRequest } from "next/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { POST as history } from "../app/api/my-reports/route";
import { GET as fullReport } from "../app/api/report/[reportId]/route";
import { GET as pdfReport } from "../app/api/report/[reportId]/pdf/route";
import { readFile } from "node:fs/promises";
import { saveServerReport } from "../server/security/reportAccess";
import { saveOrder, applyVerifiedPayment, type CheckoutOrder } from "../server/payments/orders";
import { reportKey } from "../server/storage/paymentStore";
import { rememberReportAccess } from "../lib/payment-checkout";
import { readReportReferences, fetchReportHistory, fetchPurchasedReport, downloadPurchasedReport } from "../lib/report-history";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";
import MyReports from "../components/MyReports";
import PurchasedReport from "../components/PurchasedReport";
import LandingPage from "../app/page";
import { GET as paymentStatus } from "../app/api/payments/status/route";

async function main() {
  const redisUrl = new URL(process.env.PAYMENT_TEST_REDIS_URL || "redis://127.0.0.1:6379/15");
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(redisUrl.hostname) && redisUrl.pathname === "/15", "Use only disposable local Redis database 15");
  const redis = createClient({ url: redisUrl.toString(), socket: { connectTimeout: 3000, reconnectStrategy: false } });
  redis.on("error", () => {});
  await redis.connect();
  await redis.flushDb();
  const env = { ...process.env };
  const originalFetch = globalThis.fetch;
  const previousWindow = (globalThis as any).window;
  const previousDocument = (globalThis as any).document;
  const domGlobalKeys = ["self", "HTMLElement", "Element", "SVGElement", "IntersectionObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"];
  const previousGlobals = new Map(domGlobalKeys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalSave = jsPDF.API.save;
  const previousAct = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  let dom: JSDOM | undefined;
  let root: Root | null = null;
  let assertions = 0;
  let outage = false;
  let savedPdf: { name: string; content: string; pages: number } | undefined;
  let historyCalls = 0;
  const check = (condition: unknown, message: string) => { assert.ok(condition, message); assertions++; };
  const reference = (report: Awaited<ReturnType<typeof saveServerReport>>) => ({ reportId: report.reportId, token: report.reportToken });
  const historyRequest = (references: unknown) => history(new NextRequest("https://strangerlens.example/api/my-reports", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references }),
  }));
  const encode = (value: any): any => typeof value === "string" && value !== "OK" ? Buffer.from(value).toString("base64") : Array.isArray(value) ? value.map(encode) : value;
  const bridge: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://history-test.upstash.io")) {
      if (outage) return Response.json({ error: "storage unavailable" }, { status: 503 });
      const execute = async (command: any[]) => {
        try { return { result: encode(await redis.sendCommand(command.map(String))) }; }
        catch (error) { return { error: (error as Error).message }; }
      };
      const body = JSON.parse(String(init?.body));
      return Response.json(Array.isArray(body[0]) ? await Promise.all(body.map(execute)) : await execute(body));
    }
    if (url === "/api/my-reports") {
      historyCalls++;
      return history(new NextRequest(`https://strangerlens.example${url}`, init));
    }
    if (url === "/api/payments/status") return paymentStatus();
    if (url.startsWith("/api/report/")) {
      if (url.endsWith("/pdf")) return pdfReport(new NextRequest(`https://strangerlens.example${url}`, init), { params: Promise.resolve({ reportId: url.split("/").at(-2)! }) });
      return fullReport(new NextRequest(`https://strangerlens.example${url}`, init), { params: Promise.resolve({ reportId: url.split("/").at(-1)! }) });
    }
    if (url.startsWith("/fonts/pdf/")) return new Response(await readFile(new URL(`../public${url}`, import.meta.url)));
    throw new Error(`Unexpected request (no scans, AI or Dodo calls are allowed): ${url}`);
  };
  const create = async (domain: string, purchased = true) => {
    const report = await saveServerReport({ domain, normalizedUrl: `https://${domain}`, snapshot: paymentSnapshot, fullAnalysis: paymentAnalysis });
    if (purchased) {
      const order: CheckoutOrder = { orderId: randomUUID(), reportId: report.reportId, environment: "test_mode", productId: "pdt_single", createdAt: Date.now(), sessionId: "cks_fixture" };
      await saveOrder(order);
      await applyVerifiedPayment(order, `pay_${domain.replaceAll(".", "_")}`, true);
    }
    return report;
  };
  const unmount = async () => { if (root) await act(async () => { root!.unmount(); root = null; }); };
  const browser = async (storage: Record<string, string> = {}, path = "/my-reports") => {
    await unmount();
    dom?.window.close();
    dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", { url: `https://strangerlens.example${path}`, pretendToBeVisual: true });
    // jsdom has no layout/viewport engine; unrelated landing-page animations
    // should not run during header navigation tests.
    (dom.window as any).IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    for (const key of domGlobalKeys) {
      const value = key === "self" ? dom.window : (dom.window as any)[key];
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(dom.window) : value });
    }
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    for (const [key, value] of Object.entries(storage)) dom.window.localStorage.setItem(key, value);
  };
  const mount = async (component: React.ReactNode) => {
    root = createRoot(dom!.window.document.getElementById("app")!);
    await act(async () => { root!.render(<React.StrictMode>{component}</React.StrictMode>); });
  };
  const wait = async (condition: () => boolean) => {
    for (let i = 0; i < 100 && !condition(); i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); });
    check(condition(), `DOM settled: ${dom!.window.document.body.textContent?.slice(0, 400)}`);
  };
  try {
    process.env.UPSTASH_REDIS_REST_URL = "https://history-test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.DODO_ENVIRONMENT = "test_mode";
    process.env.DODO_PAYMENTS_API_KEY = "test-key";
    process.env.DODO_PRODUCT_ID = "pdt_single";
    globalThis.fetch = bridge;
    jsPDF.API.save = function (name: string) { savedPdf = { name, content: this.output(), pages: this.getNumberOfPages() }; return this; };

    const paid = await create("original.example");
    const older = await create("older.example");
    const free = await create("free.example", false);
    const refunded = await create("refunded.example");
    const refundedStored = JSON.parse((await redis.get(reportKey(refunded.reportId)))!);
    refundedStored.payment.active = false;
    await redis.set(reportKey(refunded.reportId), JSON.stringify(refundedStored));
    const olderStored = JSON.parse((await redis.get(reportKey(older.reportId)))!);
    olderStored.createdAt = Date.UTC(2026, 0, 3);
    await redis.set(reportKey(older.reportId), JSON.stringify(olderStored));
    const refs = [reference(paid), reference(older), reference(free), reference(refunded)];
    const response = await historyRequest(refs);
    const payload = await response.json();
    check(response.status === 200 && response.headers.get("cache-control")?.includes("no-store"), "history is private and never cached");
    check(payload.reports.find((r: any) => r.reportId === paid.reportId)?.status === "paid", "server marks durable paid report active");
    check(payload.reports.find((r: any) => r.reportId === older.reportId)?.createdAt === olderStored.createdAt, "uses original stored analysis date");
    check(payload.reports.find((r: any) => r.reportId === paid.reportId)?.score === paymentAnalysis.overall_score, "uses stored authoritative score");
    check(payload.reports.find((r: any) => r.reportId === free.reportId)?.status === "unpaid", "unpaid references never become purchases");
    check(payload.reports.find((r: any) => r.reportId === refunded.reportId)?.status === "revoked", "server detects revoked/refunded payment");
    check(!JSON.stringify(payload).includes(paid.reportToken) && !JSON.stringify(payload).includes(privateText) && !JSON.stringify(payload).includes("snapshot"), "history never returns tokens, hashes or premium analysis");
    check(await redis.ttl(reportKey(paid.reportId)) === -1, "paid report survives browser/server restart without expiry");
    const forged = await (await historyRequest([{ ...reference(free), paid: true, status: "paid", score: 100 }])).json();
    check(forged.reports[0].status === "unpaid" && !forged.reports[0].domain, "client payment flags and metadata cannot grant access");
    const wrong = await (await historyRequest([{ reportId: paid.reportId, token: free.reportToken }])).json();
    const missing = await (await historyRequest([{ reportId: randomUUID(), token: paid.reportToken }])).json();
    check(wrong.reports[0].status === "unavailable" && missing.reports[0].status === "unavailable" && !wrong.reports[0].domain, "wrong ownership and missing report disclose no purchase metadata");
    process.env.DODO_ENVIRONMENT = "live_mode";
    check((await (await historyRequest([reference(paid)])).json()).reports[0].status === "unpaid", "test-mode purchases do not appear as live paid reports");
    process.env.DODO_ENVIRONMENT = "test_mode";
    for (const invalid of [null, {}, [{ reportId: paid.reportId }], [{ reportId: "../../secrets", token: paid.reportToken }], Array(21).fill(reference(paid))]) {
      check((await historyRequest(invalid)).status === 400, "invalid/missing/unbounded references rejected");
    }
    check((await history(new NextRequest("https://strangerlens.example/api/my-reports", { method: "POST", body: "{" }))).status === 400, "malformed JSON handled");
    check((await history(new NextRequest("https://strangerlens.example/api/my-reports", { method: "POST", body: " ".repeat(8193) }))).status === 413, "oversized body rejected");
    check((await (await historyRequest([reference(paid), reference(paid)])).json()).reports.length === 1, "duplicate references deduplicated");
    outage = true;
    check((await historyRequest([reference(paid)])).status === 503, "Upstash outage fails closed with retryable error");
    outage = false;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    check((await historyRequest([reference(paid)])).status === 503, "missing durable storage never falls back to preview memory");
    process.env.UPSTASH_REDIS_REST_URL = "https://history-test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    await browser();
    for (const ref of refs) rememberReportAccess(ref.reportId, ref.token);
    dom!.window.localStorage.setItem("sl_report_access_v1:not-an-id", "forged");
    dom!.window.localStorage.setItem("sl_report_access_v1:" + randomUUID(), "bad-token");
    dom!.window.localStorage.setItem("strangerlens_active_report_v1", JSON.stringify({ paid: true, score: 100 }));
    check(readReportReferences().length === 4, "reuses pre-existing checkout references and ignores malformed/unrelated storage");
    const archive = await fetchReportHistory(readReportReferences());
    check(archive.length === 3 && !archive.some(e => e.reportId === free.reportId), "client list shows purchases, excludes free reports");
    check(archive.at(-1)?.reportId === older.reportId, "reports sorted by original analysis date newest first");
    const beforeBatch = historyCalls;
    check((await fetchReportHistory(Array.from({ length: 45 }, () => ({ reportId: randomUUID(), token: paid.reportToken })))).length === 45 && historyCalls - beforeBatch === 3, "history retrieves all references in bounded batches without truncating");
    outage = true;
    check((await fetchReportHistory([reference(paid)]))[0].status === "error", "transient error remains visible rather than masquerading as empty history");
    outage = false;
    check(readReportReferences().length === 4, "failed verification preserves original local references");
    const loaded = await fetchPurchasedReport(paid.reportId);
    check(loaded.data.score === paymentAnalysis.overall_score && loaded.data.otherImprovements.length > 0 && loaded.data.isFreeTierOnly === false, "open retrieves original full paid analysis through actual server handler");
    await assert.rejects(() => fetchPurchasedReport(refunded.reportId), /refunded|revoked/); assertions++;
    await assert.rejects(() => fetchPurchasedReport(free.reportId), /could not be verified/); assertions++;
    await downloadPurchasedReport(paid.reportId);
    check(savedPdf?.name === "StrangerLens-Full-Report.pdf" && savedPdf.content.startsWith("%PDF") && savedPdf.pages > 1, "download reuses actual Phase 1 premium PDF generator");
    savedPdf = undefined;
    const activeStored = JSON.parse((await redis.get(reportKey(paid.reportId)))!);
    activeStored.payment.active = false;
    await redis.set(reportKey(paid.reportId), JSON.stringify(activeStored));
    await assert.rejects(() => downloadPurchasedReport(paid.reportId), /refunded|revoked/); assertions++;
    check(!savedPdf, "refund after list verification prevents PDF generation");
    activeStored.payment.active = true;
    await redis.set(reportKey(paid.reportId), JSON.stringify(activeStored));

    await mount(<MyReports />);
    await wait(() => Boolean(dom!.window.document.querySelector('ul[aria-label="Purchased reports"]')));
    check(dom!.window.document.querySelectorAll("li").length === 3 && !dom!.window.document.body.textContent?.includes("free.example"), "DOM renders purchased reports only");
    check(dom!.window.document.body.textContent?.includes("original.example") && dom!.window.document.body.textContent.includes("2026"), "cards show original domain, score and date");
    check(Boolean(dom!.window.document.querySelector(`a[href='/my-reports/${paid.reportId}']`)), "Open Report routes to original purchased report");
    const revokedCard = [...dom!.window.document.querySelectorAll("li")].find(li => li.textContent?.includes("refunded.example"))!;
    check(revokedCard.querySelectorAll("button[disabled]").length === 2 && revokedCard.textContent?.includes("refunded"), "refunded DOM disables open and PDF actions and explains revocation");
    const snapshot = Object.fromEntries(Object.keys(dom!.window.localStorage).map(key => [key, dom!.window.localStorage.getItem(key)!]));
    await browser(snapshot);
    check(dom!.window.sessionStorage.length === 0, "browser restart simulation has no sessionStorage or React state");
    await mount(<MyReports />);
    await wait(() => Boolean(dom!.window.document.querySelector(`a[href='/my-reports/${paid.reportId}']`)));
    check(dom!.window.document.body.textContent?.includes("original.example"), "purchases survive restart using only durable browser references and Upstash");
    await unmount();

    const router = { push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: async () => {} };
    await mount(<AppRouterContext.Provider value={router}><PurchasedReport reportId={paid.reportId} /></AppRouterContext.Provider>);
    await wait(() => dom!.window.document.body.textContent?.includes("original.example") === true);
    check(Boolean([...dom!.window.document.querySelectorAll("a")].find(a => a.textContent === "My Reports")), "purchased viewer retains My Reports header navigation");
    check(!dom!.window.document.body.textContent?.includes("Unable to open"), "original Results UI renders server-verified paid report");
    // A refund in another tab/session must remove an open report on focus.
    activeStored.payment.active = false;
    await act(async () => {
      await redis.set(reportKey(paid.reportId), JSON.stringify(activeStored));
      dom!.window.dispatchEvent(new dom!.window.Event("focus"));
    });
    await wait(() => dom!.window.document.body.textContent?.includes("Unable to open this report") === true);
    check(!dom!.window.document.body.textContent?.includes("original.example"), "viewer removes revoked premium content after revalidation");
    await unmount();
    outage = true;
    await mount(<MyReports />);
    await wait(() => dom!.window.document.body.textContent?.includes("Couldn’t verify a saved report") === true);
    check(!dom!.window.document.body.textContent?.includes("No purchased reports were found"), "outage is an error, not empty history");
    outage = false;
    const refreshButton = [...dom!.window.document.querySelectorAll("button")].find(b => b.textContent?.includes("Refresh"))!;
    await act(async () => { refreshButton.click(); });
    await wait(() => dom!.window.document.body.textContent?.includes("older.example") === true);
    await browser();
    await mount(<MyReports />);
    await wait(() => dom!.window.document.body.textContent?.includes("No purchased reports were found") === true);
    check(Boolean(dom!.window.document.querySelector('a[href="/"]')), "empty state links to analyzer");
    await unmount();
    Object.defineProperty(dom!.window, "localStorage", { configurable: true, get() { throw new Error("Storage blocked"); } });
    await mount(<MyReports />);
    await wait(() => dom!.window.document.body.textContent?.includes("Browser storage is unavailable") === true);
    check(dom!.window.document.body.textContent?.includes("please do not pay again"), "blocked browser storage has actionable error without charging again");
    await browser({}, `/my-reports/${paid.reportId}`);
    await mount(<AppRouterContext.Provider value={router}><PurchasedReport reportId={paid.reportId} /></AppRouterContext.Provider>);
    await wait(() => dom!.window.document.body.textContent?.includes("Unable to open this report") === true);
    check(dom!.window.document.body.textContent?.includes("not available in this browser"), "direct report URL without original browser token fails closed");
    await browser({}, "/");
    await mount(<LandingPage />);
    await wait(() => Boolean(dom!.window.document.querySelector('nav[aria-label="Primary Navigation"] a[href="/my-reports"]')));
    check(Boolean(dom!.window.document.querySelector('nav[aria-label="Primary Navigation"] a[href="/my-reports"]')), "desktop header links to My Reports");
    const hamburger = dom!.window.document.querySelector('button[aria-label="Open navigation menu"]') as HTMLButtonElement;
    await act(async () => { hamburger.click(); });
    check(Boolean(dom!.window.document.querySelector('nav[aria-label="Mobile Navigation"] a[href="/my-reports"]')), "mobile header menu links to My Reports");
    console.log(`PASS: ${assertions} history/security/DOM/PDF assertions with real Redis and actual API handlers. No scan, AI request or Dodo transaction was made.`);
  } finally {
    await unmount();
    dom?.window.close();
    (globalThis as any).window = previousWindow;
    (globalThis as any).document = previousDocument;
    for (const [key, descriptor] of previousGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key];
    }
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousAct;
    if (originalSave) jsPDF.API.save = originalSave; else delete jsPDF.API.save;
    globalThis.fetch = originalFetch;
    process.env = env;
    await redis.flushDb();
    await redis.quit();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

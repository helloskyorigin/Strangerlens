import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { useReportPayments } from "../hooks/useReportPayments";
import { rememberReportAccess, startReportCheckout } from "../lib/payment-checkout";

export async function runPaymentDomTests({ report, order, fetchImpl, getReport, check, sessions }: any) {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", { url: `https://strangerlens.example/?checkout=return&reportId=${report.reportId}&orderId=${order.orderId}` });
  const previousWindow = (globalThis as any).window;
  const previousDocument = (globalThis as any).document;
  const previousFetch = globalThis.fetch;
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let current: ReturnType<typeof useReportPayments>;
  let restored: any;
  const controller = { restoreSession: (_url: string, data: any) => { restored = data; } };
  function Harness({ data }: { data: any }) {
    current = useReportPayments(data, controller);
    return <div data-unlocked={current.unlockedReportId || ""}>{current.paymentMessage}</div>;
  }
  const mount = async (data: any) => {
    root = createRoot(dom.window.document.getElementById("app")!);
    await act(async () => { root!.render(<React.StrictMode><Harness data={data} /></React.StrictMode>); });
  };
  const waitUntil = async (predicate: () => boolean) => {
    for (let i=0; i<100 && !predicate(); i++) await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    if (!predicate()) throw new Error(`DOM payment flow did not complete: ${dom.window.document.body.textContent}`);
  };
  try {
    globalThis.fetch = fetchImpl;
    rememberReportAccess(report.reportId, report.reportToken);
    await mount({ reportId: report.reportId, reportToken: report.reportToken, isFreeTierOnly: true });
    await waitUntil(() => current!.paymentState === "success");
    check(current!.unlockedReportId === report.reportId && restored?.isFreeTierOnly === false, "return verification loads premium report into React state");
    check(!dom.window.location.search.includes("checkout"), "successful return removes payment query parameters");
    check(restored.reportId === report.reportId && restored.otherImprovements.length > 0, "return restores original report rather than running another scan");
    await act(async () => { root!.unmount(); });
    root = null;
    restored = undefined;
    await mount({ reportId: report.reportId, reportToken: report.reportToken, isFreeTierOnly: false });
    await waitUntil(() => current!.unlockedReportId === report.reportId);
    check(Boolean(restored), "refresh restores paid access from server verification and durable storage");
    await act(async () => { root!.unmount(); });
    root = null;

    const oldFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (String(url).startsWith("/api/report/")) return Response.json({ error: "PAYMENT_REQUIRED" }, { status: 403 });
      return oldFetch(url, init);
    }) as typeof fetch;
    await mount({ reportId: report.reportId, reportToken: report.reportToken, isFreeTierOnly: false });
    await act(async () => { await new Promise(r=>setTimeout(r,80)); });
    check(current!.unlockedReportId === null, "forged/stale client paid flag does not unlock React UI");
    await act(async () => { root!.unmount(); });
    root = null;
    globalThis.fetch = fetchImpl;
    const started = await startReportCheckout(report.reportId, report.reportToken);
    check(started.alreadyPaid === true, "frontend handles already paid without redirecting to undefined");

    dom.window.localStorage.clear();
    dom.window.history.replaceState({}, "", `/?checkout=return&reportId=${report.reportId}&orderId=${order.orderId}`);
    await mount(null);
    await waitUntil(() => current!.paymentState === "error");
    check(current!.paymentMessage?.includes("do not pay again"), "missing browser ownership shows support/recovery message instead of charging again");
  } finally {
    if (root) await act(async () => { root!.unmount(); });
    dom.window.close();
    (globalThis as any).window = previousWindow;
    (globalThis as any).document = previousDocument;
    globalThis.fetch = previousFetch;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;
  }
}

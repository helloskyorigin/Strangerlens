import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { startReportCheckout } from "../lib/payment-checkout";

async function main() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://strangerlens.ai.studio/" });
  const oldWindow = globalThis.window;
  const oldFetch = globalThis.fetch;
  (globalThis as any).window = dom.window;
  let calls = 0;
  let checkoutUrl = "";
  globalThis.fetch = (async () => {
    calls++;
    return Response.json({ checkoutUrl, orderId: "order-123", sessionId: "session-123" });
  }) as typeof fetch;
  try {
    for (const hostile of [
      "https://evildodopayments.com/session/123",
      "https://checkout.dodopayments.com.evil.example/session/123",
      "https://user:password@checkout.dodopayments.com/session/123",
      "http://checkout.dodopayments.com/session/123",
      "https://attacker.example/session/123",
      "javascript:alert(1)",
    ]) {
      checkoutUrl = hostile;
      await assert.rejects(startReportCheckout("fixture-report", "fixture-token"), /valid checkout session/);
    }
    checkoutUrl = "https://checkout.dodopayments.com/session/legit";
    const valid = await startReportCheckout("fixture-report", "fixture-token");
    assert.equal(valid.alreadyPaid, false);
    assert.equal(valid.checkoutUrl, checkoutUrl);
    assert.equal(calls, 7);
    assert.equal(JSON.parse(dom.window.localStorage.getItem("sl_pending_checkout_v1:fixture-report") || "{}").sessionId, "session-123");
    console.log("PASS: spoofed checkout hostnames, insecure redirects and embedded credentials rejected; legitimate Dodo checkout preserved.");
  } finally {
    dom.window.close();
    (globalThis as any).window = oldWindow;
    globalThis.fetch = oldFetch;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

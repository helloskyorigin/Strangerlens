import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { trackFunnelEvent } from "../lib/ui-funnel-events";

const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
const dom = new JSDOM("<html><body></body></html>", { url: "https://strangerlens.ai.studio" });
try {
  Object.defineProperty(globalThis, "window", {
    configurable: true, writable: true, value: dom.window,
  });
  const received: Array<{ event: string; product: string }> = [];
  dom.window.addEventListener("strangerlens:funnel", (event: Event) => {
    received.push((event as CustomEvent).detail);
  });
  (dom.window as any).dataLayer = [];
  trackFunnelEvent("landing_view");
  trackFunnelEvent("post_scan_offer_shown");
  trackFunnelEvent("upgrade_clicked");
  assert.deepEqual(received.map(d => d.event), [
    "strangerlens_landing_view", "strangerlens_post_scan_offer_shown",
    "strangerlens_upgrade_clicked",
  ]);
  assert.equal((dom.window as any).dataLayer.length, 3);
  assert.deepEqual(Object.keys(received[0]).sort(), ["event", "product"]);
  assert.ok(!JSON.stringify(received).includes("example.com"));
  delete (dom.window as any).dataLayer;
  trackFunnelEvent("scan_completed"); // No configured analytics must remain safe.
  assert.equal(received.length, 4);
  console.log("PASS: optional funnel milestones emit no scanned URL or personal data.");
} finally {
  dom.window.close();
  if (previous) Object.defineProperty(globalThis, "window", previous);
  else delete (globalThis as any).window;
}

/**
 * Privacy-conscious frontend conversion milestones.
 * Does not transmit events itself. Existing analytics/tag-manager listeners may
 * consume `strangerlens:funnel` or dataLayer events if installed.
 * Never include scanned URLs, report tokens, email addresses or payment IDs.
 */
export type FunnelEvent =
  | "landing_view"
  | "url_input_focused"
  | "scan_submitted"
  | "scan_completed"
  | "scan_failed"
  | "post_scan_offer_shown"
  | "post_scan_offer_dismissed"
  | "upgrade_clicked"
  | "checkout_opened"
  | "checkout_failed"
  | "payment_verified";

export function trackFunnelEvent(event: FunnelEvent): void {
  if (typeof window === "undefined") return;
  const detail = { event: `strangerlens_${event}`, product: "strangerlens" };
  try {
    window.dispatchEvent(new window.CustomEvent("strangerlens:funnel", { detail }));
    const analyticsWindow = window as Window & {
      dataLayer?: Array<Record<string, string>>;
    };
    if (Array.isArray(analyticsWindow.dataLayer)) {
      analyticsWindow.dataLayer.push(detail);
    }
    // Optional first-party aggregate counters (no URLs, IDs, secrets or emails).
    // Respect the browser's Do Not Track preference. Measurement never blocks UX.
    if (window.navigator?.doNotTrack !== "1" && typeof window.fetch === "function") {
      try {
        void window.fetch("/api/analytics/funnel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event }),
          keepalive: true,
          credentials: "omit",
        }).catch(() => {});
      } catch { /* Analytics is strictly optional. */ }
    }

  } catch {
    // Tracking is optional and must never interrupt scanning or checkout.
  }
}

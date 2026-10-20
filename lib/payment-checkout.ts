export interface PendingCheckout { reportId: string; orderId: string; sessionId: string }
const accessKey = (id: string) => `sl_report_access_v1:${id}`;
const pendingKey = (id: string) => `sl_pending_checkout_v1:${id}`;

export function rememberReportAccess(reportId: string, token: string) {
  window.localStorage.setItem(accessKey(reportId), token);
}
export function readReportToken(reportId: string): string | null {
  try { return window.localStorage.getItem(accessKey(reportId)); } catch { return null; }
}
export function readPendingCheckout(reportId: string): PendingCheckout | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(pendingKey(reportId)) || "null");
    return value?.reportId === reportId && typeof value.orderId === "string" ? value : null;
  } catch { return null; }
}
export function clearPendingCheckout(reportId: string) {
  try { window.localStorage.removeItem(pendingKey(reportId)); } catch { /* Verification remains recoverable from the return URL. */ }
}

export async function paymentJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: init?.signal || AbortSignal.timeout(20000) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || data?.message || "Could not complete the payment request. Please try again.");
  return data;
}

export async function startReportCheckout(reportId: string, reportToken?: string) {
  const token = reportToken || readReportToken(reportId);
  if (!token) throw new Error("Report session is missing. Please run a new website check.");
  // Save proof of ownership before navigation. Without working browser storage,
  // the anonymous customer cannot safely recover this report after checkout.
  try { rememberReportAccess(reportId, token); }
  catch { throw new Error("Please allow browser storage before opening checkout so your report access can be saved."); }
  const data = await paymentJson("/api/payments/checkout", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reportId }),
  });
  if (data.alreadyPaid === true) return { alreadyPaid: true as const };
  // A string suffix alone accepts attacker-controlled evildodopayments.com.
  // Require a canonical HTTPS Dodo hostname with no embedded credentials.
  const rawCheckoutUrl = typeof data.checkoutUrl === "string" ? data.checkoutUrl : "";
  const url = new URL(rawCheckoutUrl || "/", window.location.origin);
  const trustedHost = url.hostname === "dodopayments.com" || url.hostname.endsWith(".dodopayments.com");
  if (!rawCheckoutUrl.startsWith("https://") || url.protocol !== "https:" || !trustedHost ||
      url.username || url.password ||
      typeof data.orderId !== "string" || typeof data.sessionId !== "string") {
    throw new Error("Payment provider did not return a valid checkout session.");
  }
  window.localStorage.setItem(pendingKey(reportId), JSON.stringify({ reportId, orderId: data.orderId, sessionId: data.sessionId }));
  return { alreadyPaid: false as const, checkoutUrl: url.toString() };
}

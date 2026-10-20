import { PaymentError } from "./dodo";

/** A paid checkout may return only to our own app's canonical origin.
 * Prefer NEXT_PUBLIC_APP_URL for production custom domains. Host/Origin and
 * Referer request headers must not control the customer's return destination.
 */
export function resolveCheckoutReturnOrigin(requestOrigin: string, configuredAppUrl?: string): string {
  const candidate = configuredAppUrl?.trim() || requestOrigin;
  let url: URL;
  try { url = new URL(candidate); }
  catch { throw new PaymentError(503, "Public app URL is invalid. Checkout is unavailable until the deployment URL is configured."); }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username || url.password || url.search || url.hash ||
      (url.pathname !== "/" && url.pathname !== "")) {
    throw new PaymentError(503, "Public app URL must be a secure website origin.");
  }
  return url.origin;
}

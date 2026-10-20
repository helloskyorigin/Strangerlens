import { cleanEnvString } from "@/server/storage/paymentStore";

/** Secret configuration stays on the server. Environment selects the API host. */
export function getDodoConfig() {
  const apiKey = cleanEnvString(process.env.DODO_PAYMENTS_API_KEY);
  const productId = cleanEnvString(process.env.DODO_PRODUCT_ID);
  const rawEnv = cleanEnvString(process.env.DODO_ENVIRONMENT) || "test_mode";
  const environment = rawEnv === "live_mode" ? "live_mode" : "test_mode";
  if (!apiKey || !productId) {
    throw new Error("Payment configuration: DODO_PAYMENTS_API_KEY and DODO_PRODUCT_ID are required.");
  }
  return {
    environment: environment as "test_mode" | "live_mode",
    apiKey,
    productId,
    baseUrl: environment === "live_mode"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com",
  };
}

export class PaymentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function dodoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getDodoConfig();
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", ...init?.headers },
      signal: AbortSignal.timeout(15000), cache: "no-store",
    });
  } catch { throw new PaymentError(502, "Could not connect to the payment provider. Please try again."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Dodo API rejected request", { status: response.status, environment: config.environment });
    const authMessage = config.environment === "test_mode"
      ? "Payment provider authentication failed (401). When DODO_ENVIRONMENT=test_mode, DODO_PAYMENTS_API_KEY and DODO_PRODUCT_ID must be from the Dodo Test Mode dashboard, not Live mode."
      : "Payment provider authentication failed. Please verify live payment credentials.";
    throw new PaymentError(502, response.status === 401 || response.status === 403
      ? authMessage
      : (data?.message || data?.error || "Payment provider could not complete the request. Please try again or contact support."));
  }
  if (!data) throw new PaymentError(502, "Payment provider returned an invalid response. Please try again.");
  return data as T;
}


/**
 * Never advertise a $3 Full Analysis while redirecting to a $5 Dodo product.
 * Product amount must be the actual configured, one-time USD 300-cent price.
 * Dodo remains the authority for prices and may apply taxes or local currency
 * conversion at checkout according to the customer's location.
 */
export const FULL_REPORT_USD_CENTS = 300;

export function validateFullReportDodoProduct(product: unknown): boolean {
  if (!product || typeof product !== "object") return false;
  const data = product as {
    price?: { type?: string; price?: unknown; currency?: unknown } | number;
    price_detail?: { type?: string; price?: unknown; currency?: unknown };
    currency?: unknown;
    archived?: boolean;
    is_active?: boolean;
  };
  if (data.archived === true || data.is_active === false) return false;
  const details = data.price && typeof data.price === "object"
    ? data.price
    : data.price_detail;
  if (!details || details.type !== "one_time_price") return false;
  return details.currency === "USD" && details.price === FULL_REPORT_USD_CENTS;
}

export async function assertFullReportProductPrice(): Promise<void> {
  const config = getDodoConfig();
  const product = await dodoRequest<unknown>(`/products/${encodeURIComponent(config.productId)}`, { method: "GET" });
  if (!validateFullReportDodoProduct(product)) {
    throw new PaymentError(
      503,
      "The $3 report checkout is being updated. No payment was started. Please try again after the new price is configured."
    );
  }
}

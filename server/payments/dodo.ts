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

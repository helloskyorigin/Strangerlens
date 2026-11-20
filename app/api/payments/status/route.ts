import { NextResponse } from "next/server";
import { isPaymentInfrastructureConfigured } from "@/server/security/reportAccess";
import { assertFullReportProductPrice, FULL_REPORT_USD_CENTS } from "@/server/payments/dodo";

export const dynamic = "force-dynamic";
export async function GET() {
  const configured = isPaymentInfrastructureConfigured();
  let priceVerified = false;
  if (configured) {
    try { await assertFullReportProductPrice(); priceVerified = true; }
    catch { /* Checkout stays disabled when provider price cannot be verified. */ }
  }
  return NextResponse.json({
    checkoutEnabled: configured && priceVerified,
    environment: process.env.DODO_ENVIRONMENT?.trim() === "live_mode" ? "live_mode" : "test_mode",
    priceUsd: FULL_REPORT_USD_CENTS / 100,
  }, { headers: { "Cache-Control": "no-store" } });
}

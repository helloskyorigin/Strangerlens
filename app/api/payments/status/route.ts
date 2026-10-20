import { NextResponse } from "next/server";
import { isPaymentInfrastructureConfigured } from "@/server/security/reportAccess";
import { assertFullReportProductPrice } from "@/server/payments/dodo";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isPaymentInfrastructureConfigured();
  let priceVerified = false;
  if (configured) {
    try { await assertFullReportProductPrice(); priceVerified = true; }
    catch { /* Never enable a misleading or unverified checkout. */ }
  }
  return NextResponse.json({
    checkoutEnabled: configured && priceVerified,
    environment: process.env.DODO_ENVIRONMENT?.trim() === "live_mode" ? "live_mode" : "test_mode",
    priceUsd: 3,
  }, { headers: { "Cache-Control": "no-store" } });
}

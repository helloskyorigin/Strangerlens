import { NextResponse } from "next/server";
import { isPaymentInfrastructureConfigured } from "@/server/security/reportAccess";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    checkoutEnabled: isPaymentInfrastructureConfigured(),
    environment: process.env.DODO_ENVIRONMENT?.trim() === "live_mode" ? "live_mode" : "test_mode",
  }, { headers: { "Cache-Control": "no-store" } });
}

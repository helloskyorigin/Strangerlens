import { NextRequest, NextResponse } from "next/server";
import { getServerReport, hasReportAccess, extractEntitlementTokenFromHeaders, verifyServerEntitlement } from "@/server/security/reportAccess";
import { buildPdfReportModel } from "@/server/pdf/reportModel";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization", "X-Content-Type-Options": "nosniff" };

/** PDF data only. A caller cannot select the paid tier or supply report content.
 * Existing server payment verification determines the export tier on EACH click. */
export async function GET(req: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  try {
    const { reportId } = await context.params;
    const stored = await getServerReport(reportId);
    const token = extractEntitlementTokenFromHeaders(req.headers);
    if (!stored || !hasReportAccess(stored, token)) {
      return NextResponse.json({ error: "This report could not be accessed. Reopen your original report and try again." }, { status: 404, headers });
    }
    const entitlement = await verifyServerEntitlement(reportId, token);
    // An expired/revoked/different-mode purchase must not silently download a
    // free PDF under the full-report button.
    if (stored.payment && !entitlement.authorized) {
      return NextResponse.json({ error: "Paid report access could not be verified. The payment may have been refunded or access revoked." }, { status: 403, headers });
    }
    return NextResponse.json({ reportId, report: buildPdfReportModel(stored, entitlement.authorized) }, { headers });
  } catch {
    return NextResponse.json({ error: "PDF export is temporarily unavailable. Please try again; you do not need to pay again." }, { status: 503, headers });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  getServerReport,
  extractEntitlementTokenFromHeaders,
  hasReportAccess,
} from "@/server/security/reportAccess";
import { getOrder } from "@/server/payments/orders";
import { verifyCheckoutOrder } from "@/server/payments/fulfillment";
import { paymentFailure } from "@/server/payments/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { reportId, orderId } = body || {};
    if (
      typeof reportId !== "string" ||
      !/^[a-f0-9-]{36}$/.test(reportId) ||
      typeof orderId !== "string" ||
      !/^[a-f0-9-]{36}$/.test(orderId)
    ) {
      return NextResponse.json(
        { error: "Valid reportId and orderId are required" },
        { status: 400 }
      );
    }

    const storedReport = await getServerReport(reportId);
    if (!storedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const token = extractEntitlementTokenFromHeaders(req.headers);
    if (!hasReportAccess(storedReport, token)) {
      return NextResponse.json(
        { error: "Unauthorized access to report" },
        { status: 403 }
      );
    }

    const order = await getOrder(orderId);
    if (!order || order.reportId !== reportId) {
      return NextResponse.json(
        { error: "Order does not match report" },
        { status: 404 }
      );
    }

    if (storedReport.payment?.active) {
      return NextResponse.json({
        verified: true,
        reportId,
        alreadyPaid: true,
        status: "succeeded",
      });
    }

    const verificationResult = await verifyCheckoutOrder(order);

    return NextResponse.json({
      verified: verificationResult.verified,
      status: verificationResult.paymentStatus,
      reportId,
    });
  } catch (error) {
    return paymentFailure(error);
  }
}

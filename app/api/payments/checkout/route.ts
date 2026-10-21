import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getServerReport,
  extractEntitlementTokenFromHeaders,
  hasReportAccess,
  isPaymentInfrastructureConfigured,
} from "@/server/security/reportAccess";
import { getDodoConfig, PaymentError, dodoRequest, assertFullReportProductPrice } from "@/server/payments/dodo";
import {
  saveOrder,
  indexOrder,
  getRecentOrder,
  withCheckoutLock,
  limitPaymentRequests,
  type CheckoutOrder,
} from "@/server/payments/orders";
import { paymentFailure } from "@/server/payments/http";
import { resolveCheckoutReturnOrigin } from "@/server/payments/checkout-origin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const reportId = body?.reportId;
    if (typeof reportId !== "string" || !/^[a-f0-9-]{36}$/.test(reportId)) {
      return NextResponse.json({ error: "Valid reportId is required" }, { status: 400 });
    }

    if (!isPaymentInfrastructureConfigured()) {
      return NextResponse.json(
        { error: "Payment infrastructure is not configured." },
        { status: 503 }
      );
    }

    const storedReport = await getServerReport(reportId);
    if (!storedReport) {
      return NextResponse.json(
        { error: "Report not found or not eligible for purchase." },
        { status: 403 }
      );
    }

    const token = extractEntitlementTokenFromHeaders(req.headers);
    if (!hasReportAccess(storedReport, token)) {
      return NextResponse.json(
        { error: "Unauthorized access to report." },
        { status: 403 }
      );
    }

    if (storedReport.analysisMode === "heuristic") {
      return NextResponse.json(
        { error: "Only a limited heuristic preview was available. Please retry when AI Full Analysis is ready." },
        { status: 422 }
      );
    }

    if (storedReport.payment?.active) {
      return NextResponse.json({ alreadyPaid: true, reportId });
    }

    const config = getDodoConfig();
    const origin = resolveCheckoutReturnOrigin(
      req.nextUrl.origin, process.env.NEXT_PUBLIC_APP_URL, config.environment
    );
    await limitPaymentRequests(reportId, "checkout", 10);

    return await withCheckoutLock(config.environment, reportId, async () => {
      const existingReport = await getServerReport(reportId);
      if (existingReport?.payment?.active) {
        return NextResponse.json({ alreadyPaid: true, reportId });
      }

      // Never reuse an old $5 checkout session. Dodo is the actual price source.
      await assertFullReportProductPrice();
      const recentOrder = await getRecentOrder(config.environment, reportId);
      if (
        recentOrder &&
        recentOrder.productId === config.productId &&
        recentOrder.checkoutUrl &&
        recentOrder.sessionId &&
        recentOrder.status !== "succeeded" &&
        // Never reuse a stored live session carrying an obsolete V1 return URL.
        (config.environment !== "live_mode" || recentOrder.returnOrigin === origin)
      ) {
        return NextResponse.json({
          alreadyPaid: false,
          reportId,
          orderId: recentOrder.orderId,
          sessionId: recentOrder.sessionId,
          checkoutUrl: recentOrder.checkoutUrl,
          environment: recentOrder.environment,
        });
      }

      const orderId = randomUUID();
      const returnUrl = `${origin}/?checkout=return&reportId=${encodeURIComponent(
        reportId
      )}&orderId=${encodeURIComponent(orderId)}`;

      const session = await dodoRequest<{
        session_id?: string;
        id?: string;
        checkout_url?: string;
        payment_link?: string;
      }>("/checkouts", {
        method: "POST",
        body: JSON.stringify({
          product_cart: [{ product_id: config.productId, quantity: 1 }],
          return_url: returnUrl,
          metadata: {
            reportId,
            orderId,
          },
        }),
      });

      const checkoutUrl = session.checkout_url || session.payment_link;
      const sessionId = session.session_id || session.id;

      if (!checkoutUrl || !sessionId) {
        throw new PaymentError(502, "Payment provider did not return a valid checkout session.");
      }

      const parsedUrl = new URL(checkoutUrl);
      if (
        parsedUrl.protocol !== "https:" ||
        (parsedUrl.hostname !== "checkout.dodopayments.com" &&
          parsedUrl.hostname !== "test.checkout.dodopayments.com")
      ) {
        throw new PaymentError(502, "Untrusted checkout URL returned by payment provider.");
      }

      const order: CheckoutOrder = {
        orderId,
        reportId,
        environment: config.environment,
        productId: config.productId,
        createdAt: Date.now(),
        sessionId,
        checkoutUrl,
        returnOrigin: origin,
        status: "pending",
      };

      await saveOrder(order);
      await indexOrder(order);

      return NextResponse.json({
        alreadyPaid: false,
        reportId,
        orderId: order.orderId,
        sessionId: order.sessionId,
        checkoutUrl: order.checkoutUrl,
        environment: order.environment,
      });
    });
  } catch (error) {
    return paymentFailure(error);
  }
}

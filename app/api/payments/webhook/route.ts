import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { fulfillPaymentWebhook } from "@/server/payments/fulfillment";
import { paymentFailure } from "@/server/payments/http";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  if (Number(req.headers.get("content-length")) > 1024 * 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const payload = await req.text();
  if (Buffer.byteLength(payload) > 1024 * 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let event: { type?: string; data?: { payment_id?: string } };
  try {
    event = new Webhook(secret).verify(payload, {
      "webhook-id": req.headers.get("webhook-id") || "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
      "webhook-signature": req.headers.get("webhook-signature") || "",
    }) as typeof event;
  } catch { return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 }); }
  try {
    if (["payment.succeeded", "payment.failed", "payment.cancelled", "refund.succeeded"].includes(event.type || "") && event.data?.payment_id) {
      // Repeated events safely apply current provider state to the same report.
      await fulfillPaymentWebhook(event.data.payment_id);
    }
    return NextResponse.json({ received: true });
  } catch (error) { return paymentFailure(error); } // Non-2xx requests are retried by Dodo.
}

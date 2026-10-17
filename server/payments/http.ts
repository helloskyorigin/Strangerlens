import { NextResponse } from "next/server";
import { PaymentError } from "./dodo";

export function paymentFailure(error: unknown) {
  if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message === "PAYMENT_RATE_LIMITED") {
    return NextResponse.json({ error: "Too many payment requests. Please wait one minute and try again." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  if (error instanceof Error && error.message === "CHECKOUT_IN_PROGRESS") {
    return NextResponse.json({ error: "Checkout is already opening. Please wait a moment and try again." }, { status: 409 });
  }
  console.error("Payment request failed", { type: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: "Checkout is temporarily unavailable. Your payment has not been verified; please try again or contact support." }, { status: 503 });
}

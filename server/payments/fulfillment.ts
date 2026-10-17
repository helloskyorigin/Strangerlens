import { PaymentError, dodoRequest, getDodoConfig } from "./dodo";
import { type CheckoutOrder, applyVerifiedPayment, getOrder, saveOrder } from "./orders";

interface PaymentDetails {
  payment_id: string;
  status: string;
  refund_status?: string | null;
  metadata?: Record<string, string>;
  product_cart?: Array<{ product_id: string; quantity: number }> | null;
}

export async function settleOrderPayment(order: CheckoutOrder, paymentId: string) {
  if (order.environment !== getDodoConfig().environment) throw new PaymentError(409, "This checkout belongs to a different payment mode.");
  if (!/^pay_[a-zA-Z0-9_-]+$/.test(paymentId)) throw new PaymentError(400, "Invalid payment reference.");
  const payment = await dodoRequest<PaymentDetails>(`/payments/${encodeURIComponent(paymentId)}`);
  const actualPaymentId = payment.payment_id || (payment as any).id;
  const cartItem = payment.product_cart?.find(
    (item) => item.product_id === order.productId && Number(item.quantity) === 1
  );
  if (
    actualPaymentId !== paymentId ||
    payment.metadata?.reportId !== order.reportId ||
    payment.metadata?.orderId !== order.orderId ||
    !cartItem
  ) {
    throw new PaymentError(409, "Payment does not match this report and product. Please contact support.");
  }
  let active = payment.status === "succeeded" && payment.refund_status !== "full";
  if (payment.status === "succeeded" || order.paymentId === paymentId) {
    if (!await applyVerifiedPayment(order, paymentId, active)) active = false;
  }
  return { verified: active, paymentStatus: payment.refund_status === "full" ? "refunded" : payment.status };
}

export async function verifyCheckoutOrder(order: CheckoutOrder) {
  if (order.environment !== getDodoConfig().environment) throw new PaymentError(409, "This checkout belongs to a different payment mode.");
  if (!order.sessionId) throw new PaymentError(409, "Checkout is still being prepared. Please try again.");
  const session = await dodoRequest<{ id?: string; session_id?: string; payment_id: string | null; payment_status: string | null; status?: string }>(`/checkouts/${encodeURIComponent(order.sessionId)}`);
  const sessionId = session.id || session.session_id;
  if (sessionId !== order.sessionId) throw new PaymentError(409, "Checkout session does not match this order.");
  const paymentStatus = session.payment_status || session.status;
  if (paymentStatus !== "succeeded" || !session.payment_id) {
    // Keep the pending order, so a customer can retry verification without paying again.
    if (!order.paymentId) await saveOrder({ ...order, status: paymentStatus || "pending" });
    return { verified: false, paymentStatus: paymentStatus || "pending" };
  }
  return settleOrderPayment(order, session.payment_id);
}

// Webhook payload metadata only locates our order. Fulfillment always checks the
// latest authoritative payment object, including product and refund status.
export async function fulfillPaymentWebhook(paymentId: string) {
  if (!/^pay_[a-zA-Z0-9_-]+$/.test(paymentId)) throw new PaymentError(400, "Invalid payment reference.");
  const payment = await dodoRequest<PaymentDetails>(`/payments/${encodeURIComponent(paymentId)}`);
  const orderId = payment.metadata?.orderId;
  if (!orderId) return; // A payment for a different product/application.
  const order = await getOrder(orderId);
  if (!order) return;
  await settleOrderPayment(order, paymentId);
}

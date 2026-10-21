import { randomUUID } from "node:crypto";
import { paymentStore, orderKey, orderIndexKey, reportKey, paymentKey, UNPAID_RETENTION_SECONDS } from "@/server/storage/paymentStore";

export interface CheckoutOrder {
  orderId: string;
  reportId: string;
  environment: "test_mode" | "live_mode";
  productId: string;
  createdAt: number;
  sessionId?: string;
  checkoutUrl?: string;
  returnOrigin?: string; // Dodo return_url must point to this public app origin.
  paymentId?: string;
  status?: string;
}

export async function saveOrder(order: CheckoutOrder) {
  await paymentStore().set(orderKey(order.orderId), order, order.status === "succeeded" ? {} : { ex: UNPAID_RETENTION_SECONDS });
}
export async function getOrder(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  return paymentStore().get<CheckoutOrder>(orderKey(id));
}

// Atomically bind payment, order and report. Paid reports/orders have no expiry.
// Current provider state is read before this function, so stale webhook payloads
// cannot restore access after a refund. A payment cannot be used for two reports.
export async function applyVerifiedPayment(order: CheckoutOrder, paymentId: string, active: boolean) {
  const result = await paymentStore().eval(`
    local reportJson = redis.call('GET', KEYS[1])
    local orderJson = redis.call('GET', KEYS[2])
    if not reportJson or not orderJson then return 'REPORT_NOT_FOUND' end
    local binding = redis.call('GET', KEYS[3])
    if binding and binding ~= ARGV[1] then return 'PAYMENT_ALREADY_BOUND' end
    local report = cjson.decode(reportJson)
    local order = cjson.decode(orderJson)
    if order.reportId ~= ARGV[1] then return 'ORDER_MISMATCH' end
    if report.payment and report.payment.active and report.payment.paymentId ~= ARGV[2]
      and report.payment.environment == ARGV[3] then return 'ALREADY_PAID' end
    if report.payment and report.payment.paymentId ~= ARGV[2] and ARGV[4] == '0' then return 'IGNORED' end
    if report.payment and report.payment.paymentId == ARGV[2] and report.payment.active == false and ARGV[4] == '1' then return 'REVOKED' end
    report.payment = {paymentId=ARGV[2], environment=ARGV[3], orderId=order.orderId, active=ARGV[4]=='1', verifiedAt=tonumber(ARGV[5])}
    order.paymentId = ARGV[2]
    order.status = ARGV[4]=='1' and 'succeeded' or 'revoked'
    redis.call('SET', KEYS[1], cjson.encode(report))
    redis.call('SET', KEYS[2], cjson.encode(order))
    redis.call('SET', KEYS[3], ARGV[1])
    return 'OK'
  `, [reportKey(order.reportId), orderKey(order.orderId), paymentKey(order.environment, paymentId)],
  [order.reportId, paymentId, order.environment, active ? "1" : "0", Date.now()]);
  if (result === "REVOKED") return false;
  if (!["OK", "ALREADY_PAID", "IGNORED"].includes(String(result))) throw new Error(String(result));
  return true;
}

export async function withCheckoutLock<T>(environment: string, reportId: string, task: () => Promise<T>): Promise<T> {
  const key = `sl:v1:checkout-lock:${environment}:${reportId}`;
  const token = randomUUID();
  if (!await paymentStore().set(key, token, { nx: true, ex: 60 })) throw new Error("CHECKOUT_IN_PROGRESS");
  try { return await task(); }
  finally {
    await paymentStore().eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", [key], [token]).catch(() => {});
  }
}

export async function getRecentOrder(environment: string, reportId: string) {
  const id = await paymentStore().get<string>(orderIndexKey(environment, reportId));
  return id ? getOrder(id) : null;
}
export async function indexOrder(order: CheckoutOrder) {
  await paymentStore().set(orderIndexKey(order.environment, order.reportId), order.orderId, { ex: UNPAID_RETENTION_SECONDS });
}

export async function limitPaymentRequests(reportId: string, scope: string, maximum: number) {
  const count = await paymentStore().eval(`local count=redis.call('INCR', KEYS[1]); if count==1 then redis.call('EXPIRE',KEYS[1],60) end; return count`, [`sl:v1:payment-limit:${scope}:${reportId}`], []);
  if (Number(count) > maximum) throw new Error("PAYMENT_RATE_LIMITED");
}

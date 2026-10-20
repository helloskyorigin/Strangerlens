import assert from "node:assert/strict";
import { createClient } from "redis";
import { Webhook } from "standardwebhooks";
import { NextRequest } from "next/server";
import { POST as checkout } from "../app/api/payments/checkout/route";
import { POST as verify } from "../app/api/payments/verify/route";
import { POST as webhook } from "../app/api/payments/webhook/route";
import { GET as fullReport } from "../app/api/report/[reportId]/route";
import { GET as paymentStatus } from "../app/api/payments/status/route";
import { saveServerReport, redactAnalysisForFreeTier } from "../server/security/reportAccess";
import { reportKey, orderKey, paymentKey } from "../server/storage/paymentStore";
import { applyVerifiedPayment } from "../server/payments/orders";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";
import { runPaymentDomTests } from "./payment-return-dom";

async function main() {
  const redisUrl = new URL(process.env.PAYMENT_TEST_REDIS_URL || "redis://127.0.0.1:6379/15");
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(redisUrl.hostname) && redisUrl.pathname === "/15", "Payment tests may only use a disposable local Redis database 15");
  const redis = createClient({ url: redisUrl.toString(), socket: { connectTimeout: 3000, reconnectStrategy: false } });
  redis.on("error", () => {});
  await redis.connect();
  await redis.flushDb();
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  let assertions = 0;
  const check = (condition: unknown, message: string) => { assert.ok(condition, message); assertions++; };
  const sessions = new Map<string, any>();
  const payments = new Map<string, any>();
  let providerCalls = 0;
  let createdSessions = 0;
  let databaseUnavailable = false;
  let providerFailure = false;
  let invalidCheckout = false;
  let providerProductAmount = 300;
  let lastPayload: any;
  const request = (path: string, body: unknown, token?: string) => new NextRequest(`https://strangerlens.example${path}`, {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const getReport = (id: string, token?: string) => fullReport(new NextRequest(`https://strangerlens.example/api/report/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }), { params: Promise.resolve({ reportId: id }) });
  const encode = (value: any): any => typeof value === "string" && value !== "OK" ? Buffer.from(value).toString("base64") : Array.isArray(value) ? value.map(encode) : value;
  const execute = async (command: any[]) => {
    try { return { result: encode(await redis.sendCommand(command.map(String))) }; }
    catch (error) { return { error: (error as Error).message }; }
  };
  const backendFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://payment-test.upstash.io")) {
      if (databaseUnavailable) return Response.json({ error: "storage unavailable" }, { status: 503 });
      const body = JSON.parse(init?.body as string);
      const result = Array.isArray(body[0]) ? await Promise.all(body.map(execute)) : await execute(body);
      return Response.json(result);
    }
    if (url.startsWith("https://test.dodopayments.com") || url.startsWith("https://live.dodopayments.com")) {
      providerCalls++;
      if (providerFailure) return new Response("<html>Unauthorized</html>", { status: 401 });
      if (url.includes("/products/")) {
        return Response.json({ price: { type: "one_time_price", price: providerProductAmount, currency: "USD" }, archived: false });
      }
      if (init?.method === "POST") {
        createdSessions++;
        lastPayload = JSON.parse(init.body as string);
        const sessionId = `cks_test${createdSessions}`;
        sessions.set(sessionId, { id: sessionId, payment_id: null, payment_status: null });
        const host = url.includes("/live.") ? "checkout.dodopayments.com" : "test.checkout.dodopayments.com";
        return Response.json({ session_id: sessionId, checkout_url: invalidCheckout ? "https://attacker.example/checkout" : `https://${host}/session/${sessionId}` });
      }
      const id = decodeURIComponent(new URL(url).pathname.split("/").at(-1)!);
      const value = url.includes("/checkouts/") ? sessions.get(id) : payments.get(id);
      return value ? Response.json(value) : Response.json({ error: "not found" }, { status: 404 });
    }
    // Route the browser DOM harness through the actual application handlers.
    if (url.startsWith("/api/")) {
      const token = new Headers(init?.headers).get("authorization")?.replace(/^Bearer /, "");
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url === "/api/payments/status") return paymentStatus();
      if (url === "/api/payments/checkout") return checkout(request(url, body, token));
      if (url === "/api/payments/verify") return verify(request(url, body, token));
      if (url.startsWith("/api/report/")) return getReport(url.split("/").at(-1)!, token);
    }
    throw new Error(`Unexpected request in payment suite: ${url}`);
  };
  const createReport = () => saveServerReport({ normalizedUrl: "https://example.com", domain: "example.com", snapshot: paymentSnapshot, fullAnalysis: paymentAnalysis });
  const newCheckout = async (report: any) => {
    const response = await checkout(request("/api/payments/checkout", { reportId: report.reportId }, report.reportToken));
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  };
  const verification = (report: any, order: any) => verify(request("/api/payments/verify", { reportId: report.reportId, orderId: order.orderId }, report.reportToken));
  const markSuccess = (report: any, order: any, id: string) => {
    sessions.set(order.sessionId, { id: order.sessionId, payment_id: id, payment_status: "succeeded" });
    payments.set(id, { payment_id: id, status: "succeeded", refund_status: null, metadata: { reportId: report.reportId, orderId: order.orderId }, product_cart: [{ product_id: process.env.DODO_PRODUCT_ID, quantity: 1 }] });
  };
  try {
    globalThis.fetch = backendFetch;
    delete process.env.DODO_PAYMENTS_API_KEY;
    delete process.env.DODO_PRODUCT_ID;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.NEXT_PUBLIC_APP_URL;
    check((await checkout(request("/api/payments/checkout", { reportId: 123 }))).status === 400, "invalid report input rejected");
    const preview = await createReport();
    check((await newCheckoutResponse(preview)).status === 503, "missing database/config cannot charge");
    process.env.DODO_PAYMENTS_API_KEY = "test-key";
    process.env.DODO_PRODUCT_ID = "pdt_single";
    process.env.DODO_ENVIRONMENT = "test_mode";
    check((await newCheckoutResponse(preview)).status === 503, "Dodo keys alone do not enable checkout");
    process.env.UPSTASH_REDIS_REST_URL = "https://payment-test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    check((await newCheckoutResponse(preview)).status === 403, "volatile preview cannot be purchased after database is connected");
    const report = await createReport();
    const other = await createReport();
    check((await checkout(request("/api/payments/checkout", { reportId: report.reportId }))).status === 403, "checkout requires report ownership");
    check((await getReport(report.reportId, report.reportToken)).status === 403, "unpaid report denies premium");
    const redacted = redactAnalysisForFreeTier(paymentAnalysis);
    check(!JSON.stringify(redacted).includes(privateText), "free API strips premium signal and first-seconds explanations");
    providerProductAmount = 500;
    check((await newCheckoutResponse(report)).status === 503, "Old $5 product must not open a checkout advertised as $3");
    providerProductAmount = 300;
    const order = await newCheckout(report);
    check(lastPayload.product_cart[0].product_id === "pdt_single" && lastPayload.product_cart[0].quantity === 1, "server owns checkout product and quantity");
    check(lastPayload.metadata.reportId === report.reportId && lastPayload.metadata.orderId === order.orderId, "order/report bound in provider metadata");
    check(new URL(lastPayload.return_url).pathname === "/" && !lastPayload.return_url.includes(report.reportToken), "return URL exists and contains no access token");
    const count = createdSessions;
    const reused = await newCheckout(report);
    check(reused.sessionId === order.sessionId && createdSessions === count, "retry reuses pending checkout instead of creating another charge");
    check((await verification(report, order)).status === 200, "unsubmitted session is a pending response");
    check((await (await verification(report, order)).json()).verified === false, "pending session never unlocks");
    check((await verify(request("/api/payments/verify", { reportId: report.reportId, orderId: order.orderId, status: "succeeded" }, other.reportToken))).status === 403, "forged success and other report token rejected");
    check((await verification(other, order)).status === 404, "checkout for report A cannot unlock report B");
    markSuccess(report, order, "pay_success");
    payments.get("pay_success").metadata.reportId = other.reportId;
    check((await verification(report, order)).status === 409, "provider metadata mismatch rejected");
    payments.get("pay_success").metadata.reportId = report.reportId;
    payments.get("pay_success").product_cart[0].product_id = "pdt_wrong";
    check((await verification(report, order)).status === 409, "wrong product rejected");
    payments.get("pay_success").product_cart[0] = { product_id: "pdt_single", quantity: 2 };
    check((await verification(report, order)).status === 409, "wrong quantity rejected");
    payments.get("pay_success").product_cart[0].quantity = 1;
    check((await (await verification(report, order)).json()).verified === true, "server verified successful payment unlocks");
    check((await getReport(report.reportId)).status === 403, "paid content still requires the original report token");
    const paidResponse = await getReport(report.reportId, report.reportToken);
    check(paidResponse.status === 200 && (await paidResponse.json()).analysis.other_improvements.length === 1, "paid report returns original full analysis without rescanning");
    check(await redis.ttl(reportKey(report.reportId)) === -1 && await redis.ttl(orderKey(order.orderId)) === -1, "paid report and order have no automatic expiry");
    check(await redis.get(paymentKey("test_mode", "pay_success")) === report.reportId, "payment binding is durable in Redis");
    check((await (await verification(report, order)).json()).verified === true, "verification retry is idempotent");
    check((await (await newCheckoutResponse(report)).json()).alreadyPaid === true, "already paid customer is not sent to another checkout");
    const persisted = JSON.parse((await redis.get(reportKey(report.reportId)))!);
    check(!JSON.stringify(persisted).includes(report.reportToken), "database stores only hashed report capability");
    // Directly exercise the atomic Lua payment binding against real Redis.
    const otherOrder = await newCheckout(other);
    const otherStored = JSON.parse((await redis.get(orderKey(otherOrder.orderId)))!);
    await assert.rejects(() => applyVerifiedPayment(otherStored, "pay_success", true), /PAYMENT_ALREADY_BOUND/);
    assertions++;
    process.env.DODO_ENVIRONMENT = "live_mode";
    check((await getReport(report.reportId, report.reportToken)).status === 403, "test payment never grants live access");
    check((await verification(report, order)).status === 409, "test checkout cannot verify in live mode");
    const liveOrder = await newCheckout(other);
    check(liveOrder.environment === "live_mode" && liveOrder.checkoutUrl.startsWith("https://checkout.dodopayments.com/"), "live checkout uses live API and hosted checkout");
    process.env.DODO_ENVIRONMENT = "test_mode";

    const secret = `whsec_${Buffer.alloc(32, 7).toString("base64")}`;
    process.env.DODO_PAYMENTS_WEBHOOK_KEY = secret;
    const webhookRequest = (type: string, id: string, signed = true, timestamp = new Date()) => {
      const payload = JSON.stringify({ type, data: { payment_id: id } });
      const msgId = "msg_test";
      return new NextRequest("https://strangerlens.example/api/payments/webhook", { method: "POST", body: payload, headers: { "webhook-id": msgId, "webhook-timestamp": String(Math.floor(timestamp.getTime()/1000)), "webhook-signature": signed ? new Webhook(secret).sign(msgId, timestamp, payload) : "v1,invalid" } });
    };
    check((await webhook(webhookRequest("payment.succeeded", "pay_success", false))).status === 401, "invalid webhook signatures rejected");
    check((await webhook(webhookRequest("payment.succeeded", "pay_success", true, new Date(Date.now()-86400000)))).status === 401, "expired webhook replay rejected");
    check((await webhook(webhookRequest("payment.succeeded", "pay_success"))).status === 200, "valid signed webhook fulfills idempotently");
    check((await webhook(webhookRequest("payment.succeeded", "pay_success"))).status === 200, "duplicate webhook safely acknowledged");
    payments.get("pay_success").refund_status = "full";
    check((await webhook(webhookRequest("refund.succeeded", "pay_success"))).status === 200, "full refund updates stored access");
    check((await getReport(report.reportId, report.reportToken)).status === 403, "refunded payment no longer unlocks report");
    check((await webhook(webhookRequest("payment.succeeded", "pay_success"))).status === 200 && (await getReport(report.reportId, report.reportToken)).status === 403, "stale succeeded webhook does not restore refunded access");

    databaseUnavailable = true;
    const callsBeforeOutage = providerCalls;
    check((await newCheckoutResponse(other)).status === 503, "database outage returns visible error");
    check(providerCalls === callsBeforeOutage, "database failure does not create payable session");
    databaseUnavailable = false;
    providerFailure = true;
    check((await verification(other, otherOrder)).status === 502, "non-JSON provider auth error returns controlled failure");
    providerFailure = false;
    const invalid = await createReport();
    invalidCheckout = true;
    check((await newCheckoutResponse(invalid)).status === 502, "untrusted hosted checkout URL rejected");
    invalidCheckout = false;
    const concurrent = await createReport();
    const concurrentResponses = await Promise.all([newCheckoutResponse(concurrent), newCheckoutResponse(concurrent)]);
    check(concurrentResponses.some(r=>r.status === 200) && concurrentResponses.some(r=>r.status === 409), "shared checkout lock prevents concurrent session creation");
    const uiReport = await createReport();
    const uiOrder = await newCheckout(uiReport);
    markSuccess(uiReport, uiOrder, "pay_ui_success");
    await runPaymentDomTests({ report: uiReport, order: uiOrder, fetchImpl: backendFetch, getReport, check, sessions });
    console.log(`PASS: ${assertions} payment/security assertions using real Redis + actual API handlers; browser DOM return/unlock/refresh checks passed. No real Dodo transaction was made.`);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = savedEnv;
    await redis.flushDb();
    await redis.quit();
  }
  function newCheckoutResponse(report: any) { return checkout(request("/api/payments/checkout", { reportId: report.reportId }, report.reportToken)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

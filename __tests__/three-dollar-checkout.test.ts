import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FULL_REPORT_USD_CENTS, validateFullReportDodoProduct } from "../server/payments/dodo";
import { resolveCheckoutReturnOrigin } from "../server/payments/checkout-origin";

assert.equal(FULL_REPORT_USD_CENTS, 900, "$9 USD must equal 900 cents.");
assert.equal(resolveCheckoutReturnOrigin("https://strangerlens.ai.studio"), "https://strangerlens.ai.studio");
assert.equal(resolveCheckoutReturnOrigin("https://old-deployment.run.app", "https://strangerlens.ai.studio/"),
  "https://strangerlens.ai.studio", "Canonical domain wins after hosting migration.");
assert.equal(resolveCheckoutReturnOrigin("http://localhost:3000"), "http://localhost:3000");
assert.equal(resolveCheckoutReturnOrigin("https://old-cloud.run.app", "https://old-cloud.run.app", "live_mode"),
  "https://strangerlens.ai.studio", "Live returns use the V7 canonical website.");
assert.equal(resolveCheckoutReturnOrigin("https://staging.example", undefined, "live_mode"),
  "https://strangerlens.ai.studio");
assert.throws(() => resolveCheckoutReturnOrigin("https://strangerlens.ai.studio", "https://evil.example/redirect?token=a"));
assert.throws(() => resolveCheckoutReturnOrigin("https://strangerlens.ai.studio", "http://evil.example"));
assert.throws(() => resolveCheckoutReturnOrigin("javascript:alert(1)"));
const checkoutSource=readFileSync("app/api/payments/checkout/route.ts","utf8");
assert.ok(checkoutSource.includes("resolveCheckoutReturnOrigin("));
assert.ok(!checkoutSource.includes('req.headers.get("origin")') && !checkoutSource.includes('req.headers.get("referer")'));
assert.ok(!checkoutSource.includes("ais-dev-3kmita5xl7cdxgwm5afweq"), "No hardcoded old hosting redirect.");
const price = (amount:number, currency="USD", type="one_time_price") => ({
  price:{price:amount,currency,type}, archived:false
});
assert.equal(validateFullReportDodoProduct(price(900)), true);
assert.equal(validateFullReportDodoProduct(price(300)), false,"Previous $3 product is not eligible.");
assert.equal(validateFullReportDodoProduct(price(500)), false,"Previous $5 product is not eligible.");
assert.equal(validateFullReportDodoProduct(price(900,"EUR")), false);
assert.equal(validateFullReportDodoProduct(price(900,"USD","recurring_price")),false);
assert.equal(validateFullReportDodoProduct({...price(900),archived:true}),false);
assert.equal(validateFullReportDodoProduct(null),false);

const files=["app/page.tsx","components/ResultsScreen.tsx","components/PostScanUpgradeModal.tsx",
  "components/CompleteReportPreview.tsx","components/landing/FullReportTour.tsx",
  "components/landing/InteractiveReportPreview.tsx","lib/legal-config.ts"];
for(const path of files){
  const s=readFileSync(path,"utf8");
  assert.ok(!/\$3\b/.test(s),`No stale $3 offer in ${path}`);
  assert.ok(!/\$5\b/.test(s),`No stale $5 offer in ${path}`);
  assert.ok(s.includes("$9")||s.includes("price: 9"),`$9 price exists in ${path}`);
}
assert.ok(readFileSync("PAYMENT_SETUP.md","utf8").includes("$9"),"Migration documentation describes new $9 product.");
const checkout=readFileSync("app/api/payments/checkout/route.ts","utf8");
assert.ok(checkout.includes("await assertFullReportProductPrice()"));
assert.ok(checkout.includes("recentOrder.productId === config.productId"),"Old pending checkout must not be reused.");
const status=readFileSync("app/api/payments/status/route.ts","utf8");
assert.ok(status.includes("assertFullReportProductPrice()"),"Checkout availability reflects provider price.");
console.log("PASS: $9 one-time price across UI, backend Dodo validation and previous session rejection.");

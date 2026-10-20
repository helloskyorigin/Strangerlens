import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FULL_REPORT_USD_CENTS, validateFullReportDodoProduct } from "../server/payments/dodo";

assert.equal(FULL_REPORT_USD_CENTS, 300, "$3 USD must equal 300 cents.");
const price = (amount:number, currency="USD", type="one_time_price") => ({
  price:{price:amount,currency,type}, archived:false
});
assert.equal(validateFullReportDodoProduct(price(300)), true);
assert.equal(validateFullReportDodoProduct(price(500)), false,"Previous $5 product is not eligible.");
assert.equal(validateFullReportDodoProduct(price(300,"EUR")), false);
assert.equal(validateFullReportDodoProduct(price(300,"USD","recurring_price")),false);
assert.equal(validateFullReportDodoProduct({...price(300),archived:true}),false);
assert.equal(validateFullReportDodoProduct(null),false);

const files=["app/page.tsx","components/ResultsScreen.tsx","components/PostScanUpgradeModal.tsx",
  "components/CompleteReportPreview.tsx","components/landing/FullReportTour.tsx",
  "components/landing/InteractiveReportPreview.tsx","lib/legal-config.ts","PAYMENT_SETUP.md"];
for(const path of files){
  const s=readFileSync(path,"utf8");
  assert.ok(!/\$5\b/.test(s),`No stale $5 offer in ${path}`);
  assert.ok(s.includes("$3")||s.includes("price: 3"),`$3 price exists in ${path}`);
}
const checkout=readFileSync("app/api/payments/checkout/route.ts","utf8");
assert.ok(checkout.includes("await assertFullReportProductPrice()"));
assert.ok(checkout.includes("recentOrder.productId === config.productId"),"Old pending checkout must not be reused.");
const status=readFileSync("app/api/payments/status/route.ts","utf8");
assert.ok(status.includes("assertFullReportProductPrice()"),"Checkout availability reflects provider price.");
console.log("PASS: $3 one-time price across UI, backend Dodo validation and previous $5 session rejection.");

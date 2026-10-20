import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FULL_REPORT_USD_CENTS, validateFullReportDodoProduct } from "../server/payments/dodo";

assert.equal(FULL_REPORT_USD_CENTS, 300, "A $3 USD one-time report is 300 minor units.");
const product = (price: number, currency = "USD", type = "one_time_price") => ({
  name: "StrangerLens Full Analysis",
  price: { price, currency, type },
  archived: false,
});
assert.equal(validateFullReportDodoProduct(product(300)), true);
assert.equal(validateFullReportDodoProduct(product(500)), false, "Old $5 product must not be purchasable.");
assert.equal(validateFullReportDodoProduct(product(300, "EUR")), false, "Wrong currency must be rejected.");
assert.equal(validateFullReportDodoProduct(product(300, "USD", "recurring_price")), false, "No recurring billing.");
assert.equal(validateFullReportDodoProduct({ ...product(300), archived: true }), false);
assert.equal(validateFullReportDodoProduct({ ...product(300), is_active: false }), false);
assert.equal(validateFullReportDodoProduct({price: 300,currency:"USD"}),false,"Incomplete Dodo product evidence is not enough.");
assert.equal(validateFullReportDodoProduct(null),false);

const priceSurfaces = [
  "app/page.tsx",
  "components/ResultsScreen.tsx",
  "components/PostScanUpgradeModal.tsx",
  "components/CompleteReportPreview.tsx",
  "components/landing/FullReportTour.tsx",
  "components/landing/InteractiveReportPreview.tsx",
  "lib/legal-config.ts",
  "PAYMENT_SETUP.md",
];
for (const path of priceSurfaces) {
  const source = readFileSync(path, "utf8");
  assert.ok(!/\$5\b/.test(source), `No stale $5 StrangerLens offer in ${path}`);
  assert.ok(source.includes("$3") || source.includes("price: 3"), `Current price documented in ${path}`);
}
const check = readFileSync("app/api/payments/checkout/route.ts", "utf8");
assert.ok(check.includes("await assertFullReportProductPrice()"),"Server must verify actual Dodo price before starting checkout.");
assert.ok(check.includes("recentOrder.productId === config.productId"),"Cannot reuse previous $5 product checkout.");
const status = readFileSync("app/api/payments/status/route.ts", "utf8");
assert.ok(status.includes("assertFullReportProductPrice()"),"Payment button must be disabled for outdated Dodo products.");
const scan = readFileSync("components/ScanScreen.tsx", "utf8");
assert.ok(scan.includes("Public website content inspected"));
assert.ok(!scan.includes("Homepage content inspected") && !scan.includes("inspecting homepage content"),"Scanner wording must not imply homepage-only analysis.");

console.log("PASS: $3 pricing consistency, protected Dodo checkout, no old checkout reuse and revised scanning copy.");

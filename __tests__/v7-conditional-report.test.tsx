import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

const mapped = mapBackendToFrontend(structuredClone(paymentAnalysis), "https://example.com", paymentSnapshot);
const bare = { ...mapped, purchaseReadiness: undefined, purchaseReadinessLocked: undefined };
const commercial = { ...bare, purchaseReadinessLocked: true as const };
const premium = { ...bare, purchaseReadiness: {
  applicable: true as const, method: "purchase-evidence-v1" as const,
  score: 68, status: "understandable" as const,
  summary: "Purchase information was identified in the inspected offer.",
} };
function render(data: typeof mapped, paid=false) {
  return new JSDOM(renderToStaticMarkup(<ResultsScreen rawUrl="https://example.com"
    analysisData={data} isUnlocked={paid} checkoutEnabled={true}/>)).window.document;
}
const free = render(bare);
assert.ok(free.querySelector(".sl-v7-intro h1"), "V7 report opens with website-specific editorial heading");
assert.ok(free.querySelector(".sl-v7-score") && free.querySelector(".sl-v7-signal-list"), "Strong score and grouped signals");
assert.equal(free.querySelectorAll('[data-signal]').length,5,"Only five core signals on non-commercial websites");
assert.ok(!free.body.textContent?.includes("Purchase Readiness"),"No purchase card or claim for a free/unknown website");
assert.ok(free.querySelector("#complete-report-preview"),"One visible $3 premium offer follows all core signals");
assert.ok(!free.body.textContent?.includes(privateText),"Unpaid page does not expose private diagnostic content");
const locked=render(commercial);
assert.equal(locked.querySelectorAll('[data-signal]').length,5);
assert.equal(locked.querySelectorAll('[data-testid="purchase-readiness-locked"]').length,1,
  "Detected commercial website gains only one sixth locked signal");
assert.ok(!locked.querySelector('[data-testid="purchase-readiness-locked"]')?.textContent?.includes("/100"),
  "Locked commercial check does not reveal its numeric score");
assert.ok(locked.querySelector("#complete-report-preview")?.textContent?.includes("Purchase Readiness included"),
  "Offer describes sixth signal only when detected");
const paid = render(premium as typeof mapped,true);
assert.equal(paid.querySelectorAll('[data-signal]').length,6,
  "Unlocked commercial website displays sixth scored signal in overview");
assert.ok(paid.querySelector('[data-signal="purchaseReadiness"]')?.textContent?.includes("68/100"));
assert.ok(!paid.querySelector('[data-testid="purchase-readiness-locked"]'),"Verified premium removes lock placeholder");
assert.ok(!paid.querySelector("#complete-report-preview"),"Paid customer sees no repeated sales panel");
assert.ok(paid.querySelector("#complete-paid-report") && paid.querySelector("#your-improvement-plan"),
  "Deep dives and implementation workbench remain accessible after unlock");
assert.ok(paid.querySelector("#report-export-actions"),"Paid PDF export remains accessible");
console.log("PASS: V7 light-first semantics, conditional sixth signal, no free leakage and intact premium workspace.");

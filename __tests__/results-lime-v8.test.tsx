import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

const analysis = structuredClone(paymentAnalysis);
const data = mapBackendToFrontend(analysis, "https://example.com", paymentSnapshot);

function render(isUnlocked: boolean) {
  return new JSDOM(renderToStaticMarkup(
    <ResultsScreen rawUrl="https://example.com" analysisData={data}
      isUnlocked={isUnlocked} checkoutEnabled onBackToLanding={() => {}}/>
  )).window.document;
}

const free = render(false);
assert.ok(free.querySelector(".sl-v8-header .sl-v8-nav-brand"), "Results use VYLENS-style floating brand navbar.");
assert.ok(free.querySelector("#report-first-look .sl-v7-score-number"), "First look prominently shows backend score.");
assert.ok(free.querySelector("#report-clarity-signals .sl-v7-signal-list"), "Signals have their own section.");
assert.ok(free.querySelector(".sl-v8-score-insight"), "The score includes the short insight.");
assert.ok(!free.querySelector(".sl-v8-report-navigation"), "No extra navigation breaks the flow.");
assert.equal(free.querySelectorAll('[data-signal]').length, 5, "Only five core scores visible in free non-purchase sample.");
assert.ok(free.querySelector("#complete-report-preview"), "Paid upgrade remains present.");
assert.ok(!free.querySelector("#your-improvement-plan"), "Free view does not expose the premium plan.");
assert.ok(!free.body.textContent?.includes(privateText), "Free view cannot leak paid report findings.");

const paid = render(true);
assert.ok(!paid.querySelector("#complete-report-preview"), "Already paid users do not get free-tier upsell.");
assert.equal(paid.querySelectorAll(".sl-paid-card-trigger").length,5,"Five paid report cards replace long scroll sections.");
assert.equal(paid.querySelectorAll('[aria-expanded="true"].sl-paid-card-trigger').length,0, "Paid cards start collapsed.");
assert.ok(paid.querySelector("#full-analysis-unlocked") && paid.querySelector("#report-export-actions"),"Paid report and PDF available after payment.");
for (const doc of [free, paid]) {
  assert.ok(!doc.querySelector("#implementation-checklist"), "Extra fix-checklist UI is removed.");
  assert.ok(!doc.querySelector("#recheck-comparison-panel"), "Score comparison is not a displayed feature.");
  assert.ok(!doc.body.textContent?.includes("StrangerLens-Share.png"), "Share PNG UI is removed.");
}
assert.ok(paid.querySelector("#report-export-actions button"), "PDF remains a report utility.");

assert.ok(!paid.body.textContent?.includes(privateText), "Closed paid panels do not render long diagnosis text until opened.");
assert.ok(paid.querySelector("#paid-card-trigger-fixes") && paid.querySelector("#paid-card-trigger-copy"),
  "Verified users can open their detailed fixes and rewrites.");

console.log("PASS: VYLENS-inspired results hierarchy, anchored navigation and protected premium report boundaries.");

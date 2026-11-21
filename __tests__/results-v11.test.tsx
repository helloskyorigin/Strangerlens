import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

const fixed = structuredClone(paymentAnalysis);
const make = (analysis: typeof paymentAnalysis, paid = false, checkout = true) =>
  new JSDOM(renderToStaticMarkup(<ResultsScreen
    rawUrl="https://example.com" analysisData={mapBackendToFrontend(analysis, "https://example.com", paymentSnapshot)}
    checkoutEnabled={checkout} isUnlocked={paid} paymentEnvironment="live_mode" onBackToLanding={() => {}}/>)).window.document;
const free = make(fixed);
const summary = free.querySelector(".sl-v11-summary");
const first = summary?.querySelector("#report-first-look");
const signals = summary?.querySelector("#report-clarity-signals");
const offer = free.querySelector("#complete-report-preview");
assert.ok(summary && first && signals && offer, "Score, five signals and paid offer all render");
assert.equal(first.nextElementSibling, signals, "Score comes directly before the signals");
assert.equal(free.querySelectorAll(".sl-v11-signal").length, 5, "Only five free signals");
assert.equal(free.querySelectorAll(".sl-v11-signal-explanation").length, 5, "Each free signal has one short sentence");
for (const sentence of free.querySelectorAll(".sl-v11-signal-explanation")) {
  const value = sentence.textContent?.trim() || "";
  assert.ok(value.length > 19 && value.length < 110 && value.endsWith("."), "Signal explanation is one readable sentence");
  assert.ok(!/public content|evidence refs|heuristic|supporting context|score normalized/i.test(value), "No jargon");
}
assert.equal(free.querySelectorAll(".sl-v11-badge").length, 5);
assert.ok(free.querySelector("#report-first-look .sl-v8-score-insight"), "Score gets a clear headline");
assert.equal(offer.querySelectorAll(".sl-v8-unlock-item").length, 5, "Paid offer has five benefits");
assert.equal(offer.querySelectorAll(".sl-v11-benefit-copy p").length, 5, "Each benefit has one explanation");
assert.equal(offer.querySelectorAll(".sl-v7-upgrade-button").length, 1, "Exactly one checkout button");
assert.ok(offer.textContent?.includes("You know your scores. Now know exactly what to fix."));
assert.ok(offer.textContent?.includes("Get Better Words, Ready to Use"));
assert.ok(offer.textContent?.includes("Unlock Full Analysis — $9"));
assert.ok(!free.body.textContent?.includes(privateText), "Detailed paid analysis must remain protected");
assert.equal(free.querySelectorAll(".sl-v7-upgrade-reason, .sl-v7-intro, .sl-v8-summary-strip").length, 0, "No repeated extras");
const offerWrapper = free.querySelector(".sl-v11-offer-wrap");
assert.ok(offerWrapper?.contains(offer), "Paid block follows the score/signals in the same visual width");
assert.ok(summary.compareDocumentPosition(offerWrapper!) & free.defaultView!.Node.DOCUMENT_POSITION_FOLLOWING);
const later = structuredClone(paymentAnalysis);
later.signals.audience.score = 92;
const changed = make(later);
const currentAudience = free.querySelector('[data-signal="audience"] .sl-v11-signal-explanation')?.textContent;
const newAudience = changed.querySelector('[data-signal="audience"] .sl-v11-signal-explanation')?.textContent;
assert.notEqual(currentAudience, newAudience, "Visible sentence changes when the actual score changes");
assert.equal(changed.querySelector('[data-signal="audience"] .sl-v11-badge')?.textContent, "Strong");
const missing = structuredClone(paymentAnalysis);
(missing.signals.trust as any).score = null;
const unknown = make(missing);
assert.equal(unknown.querySelector('[data-signal="trust"] .sl-v11-badge')?.textContent, "Not checked");
assert.ok(unknown.querySelector('[data-signal="trust"] .sl-v8-signal-score')?.textContent?.includes("—"));
const paid = make(fixed, true);
assert.equal(paid.querySelector("#complete-report-preview"), null, "Paid customers never see the $9 offer again");
assert.equal(paid.querySelectorAll(".sl-paid-card-trigger").length, 5, "Paid report presents five expandable cards");
assert.equal(paid.querySelectorAll('.sl-paid-card-trigger[aria-expanded="true"]').length, 0, "Every card starts closed");
assert.ok(paid.querySelector("#full-analysis-unlocked") && paid.querySelector("#report-export-actions"),
  "Paid report and full PDF access remain present");
const offline = make(fixed, false, false);
assert.ok(offline.querySelector("#complete-report-preview button[disabled]"), "Checkout cannot be clicked while unavailable");
const stylesheet = readFileSync("components/results-lime-v8.css", "utf8");
assert.ok(stylesheet.includes(".sl-v11-summary") && stylesheet.includes(".sl-v11-offer-wrap"), "Production styles included");
assert.ok(stylesheet.includes("@media(max-width:360px)") && stylesheet.includes("prefers-reduced-motion:reduce"), "Small mobile and reduced motion covered");
console.log("PASS: screenshot-style score, five honest one-line signals, one five-benefit $9 card, paid security and checkout states.");

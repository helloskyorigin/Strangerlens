import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { redactAnalysisForFreeTier, redactFrontendDataForFreeTier } from "../server/security/reportAccess";
import { projectFreeFrontendReport } from "../lib/free-report-projection";
import { mapBackendToFrontend } from "../lib/mapper";
import ResultsScreen from "../components/ResultsScreen";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";

const full = structuredClone(paymentAnalysis);
full.verdict.text = "PRIVATE_VERDICT_EXACT_CONCERN";
full.website_message.summary = "PRIVATE_WEBSITE_MESSAGE";
full.priority_fix.title = "PRIVATE_PRIMARY_FIX";
full.priority_fix.reason = "PRIVATE_REASON";
full.priority_fix.clearer_direction = "PRIVATE_REWRITE";
full.signals.value.explanation = "PRIVATE_VALUE_EXPLANATION";
if (full.risks[0]) full.risks[0].description = "PRIVATE_RISK_DESCRIPTION";
const protectedStrings = [
  "PRIVATE_VERDICT_EXACT_CONCERN", "PRIVATE_WEBSITE_MESSAGE",
  "PRIVATE_PRIMARY_FIX", "PRIVATE_REASON", "PRIVATE_REWRITE",
  "PRIVATE_VALUE_EXPLANATION", "PRIVATE_RISK_DESCRIPTION",
];

const freeAnalysis = redactAnalysisForFreeTier(full);
assert.equal(freeAnalysis.overall_score, full.overall_score, "Real overall score stays free.");
for (const key of ["first_impression", "audience", "value", "trust", "action"] as const) {
  assert.equal(freeAnalysis.signals[key].score, full.signals[key].score, "Five authentic scores stay free.");
  assert.equal(freeAnalysis.signals[key].status, full.signals[key].status, "Signal status stays free.");
  assert.deepEqual(freeAnalysis.signals[key].evidence, [], "Detailed evidence never leaves the server.");
}
assert.equal(freeAnalysis.priority_fix.title, "");
assert.equal(freeAnalysis.priority_fix.clearer_direction, "");
assert.deepEqual(freeAnalysis.risks, []);
assert.equal(freeAnalysis.website_message.summary, "");
assert.deepEqual(freeAnalysis.first_seconds.what_is_this.evidence, []);
for (const secret of protectedStrings) {
  assert.ok(!JSON.stringify(freeAnalysis).includes(secret), "Free API response leaks protected text: " + secret);
}

const paidData = mapBackendToFrontend(full, "https://example.com", paymentSnapshot);
const safeFromServer = redactFrontendDataForFreeTier(paidData);
const safeFromBrowser = projectFreeFrontendReport(paidData);
const freeMappedSnapshot = projectFreeFrontendReport(
  mapBackendToFrontend(freeAnalysis, "https://example.com", paymentSnapshot)
);
for (const freeData of [safeFromServer, safeFromBrowser, freeMappedSnapshot]) {
  assert.equal(freeData.score, paidData.score);
  assert.equal(freeData.signals.length, 5);
  assert.ok(freeData.signals.every(signal => signal.description === ""));
  assert.equal(freeData.recommendation.strongerDirection, "");
  assert.equal(freeData.evidence.homepageExcerpt, "");
  assert.deepEqual(freeData.evidence.missingFindings, []);
  assert.equal(freeData.premiumWorkbench, undefined);
  for (const secret of protectedStrings) {
    assert.ok(!JSON.stringify(freeData).includes(secret), "Browser free data leaks protected text: " + secret);
  }
}
const free = new JSDOM(renderToStaticMarkup(
  <ResultsScreen rawUrl="https://example.com" analysisData={paidData}
    checkoutEnabled isUnlocked={false} postScanOfferReportId="new-scan-report"/>
)).window.document;
assert.equal(free.querySelectorAll(".sl-v7-signal-row").length, 5, "Five free signal scores are visible.");
assert.ok(free.querySelector(".sl-v7-score-number"), "Overall score stays visible.");
assert.ok(free.querySelector(".sl-v8-score-insight"), "A short next step appears inside the score card.");
assert.ok(free.querySelector("#complete-report-preview"), "On-page $9 full analysis offer exists.");
assert.ok(!free.querySelector(".sl-upgrade-dialog"), "A scan never opens an automatic checkout popup.");
assert.ok(!free.querySelector('[role="dialog"][aria-modal="true"]'), "Free results appear without a modal.");
assert.ok(!free.querySelector("#your-improvement-plan"), "The premium plan stays locked.");
assert.ok(!free.querySelector("#evidence-to-fix"), "Detailed source evidence stays locked.");
assert.ok(!free.querySelector("#better-copy-studio"), "Suggested rewrites stay locked.");
assert.ok(free.body.textContent?.includes("Unlock Full Analysis"), "The $9 upgrade action is clearly offered.");
for (const secret of protectedStrings) {
  assert.ok(!free.body.textContent?.includes(secret), "Free DOM leaks protected text: " + secret);
}
const paid = new JSDOM(renderToStaticMarkup(
  <ResultsScreen rawUrl="https://example.com" analysisData={paidData} checkoutEnabled isUnlocked={true}/>
)).window.document;
assert.equal(paid.querySelectorAll('.sl-paid-card-trigger').length, 5, "Five paid benefits unlock as expandable cards.");
assert.ok(["stranger", "problems", "hesitation", "fixes", "copy"].every(name =>
  paid.querySelector('#paid-card-trigger-' + name)), "Each promised topic has its own trigger.");
assert.ok(!paid.body.textContent?.includes("PRIVATE_VERDICT_EXACT_CONCERN"), "Closed cards hide long report text until requested.");
assert.ok(paid.querySelector("#report-export-actions button")?.textContent?.includes("Download Full PDF"), "Full PDF remains accessible.");

console.log("PASS: scores-first $0 preview, no forced popup, server+browser redaction, protected $9 report and five paid features.");

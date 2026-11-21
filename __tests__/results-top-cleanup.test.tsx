import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";

for (const paid of [false, true]) {
  const report = mapBackendToFrontend(paymentAnalysis, "https://example.com", paymentSnapshot);
  const doc = new JSDOM(renderToStaticMarkup(<ResultsScreen
    analysisData={report} rawUrl="https://example.com" isUnlocked={paid}
    checkoutEnabled={true} onBackToLanding={() => {}}/>)).window.document;
  const title = doc.querySelector("#report-first-look h1");
  assert.equal(title?.textContent, "Website Clarity Score", "Single score heading");
  assert.ok(doc.querySelector("#report-first-look .sl-v7-score-number"), "Score is immediately visible");
  assert.ok(!doc.querySelector("#report-first-look button, #scoring-dialog-title, #report-first-look .sl-v8-result-domain"),
    "Score contains no unnecessary tooltip or verbose metadata");
  assert.equal(doc.querySelector("#report-first-look .sl-v13-domain")?.textContent, "example.com",
    "Saved audit is identified by its domain alone");
  assert.equal(doc.querySelectorAll(".sl-v11-signal").length, 5, "Five clear signal rows");
  assert.equal(doc.querySelectorAll('button[aria-label^="About "]').length, 10,
    "Every signal still has its responsive info tooltip");
  assert.ok(doc.querySelector('.sl-v8-header .sl-v8-nav-left [data-testid="theme-toggle"]'),
    "Dark mode toggle is on the left of results");
  assert.equal(doc.querySelectorAll('.sl-v8-header a').length,0,
    "No My Reports or brand navigation links");
  assert.ok(doc.querySelector(".sl-v8-header .sl-v8-new-check"), "New Check remains available");
  const upper = doc.querySelector("main")?.textContent || "";
  for (const noise of ["Public website content", "Report Complete", "YOUR OUTSIDE PERSPECTIVE",
    "01 Score", "02 Clarity signals", "03 Unlock fixes", "How scoring works", "Five first-impression checks"]) {
    assert.ok(!upper.includes(noise), "Remove report preamble clutter: " + noise);
  }
  assert.ok(!doc.querySelector(".sl-v11-score-note"), "Technical score note is removed");
  if (paid) {
    assert.equal(doc.querySelectorAll(".sl-paid-card-trigger").length, 5,
      "Paid five-card accordion remains intact");
    assert.ok(doc.querySelector("#report-export-actions"), "Paid PDF option preserved");
  } else {
    assert.ok(doc.querySelector("#complete-report-preview .sl-v7-upgrade-button"),
      "Single $9 offer follows free signals");
  }
}
const css = readFileSync("components/results-lime-v8.css","utf8");
assert.ok(css.includes("@media(max-width:440px)"),"Small screens retain responsive layout");
assert.ok(!readFileSync("components/ResultsScreen.tsx","utf8").includes('href="/my-reports"'),
  "Results never show My Reports");
console.log("PASS: clean score-first screen, five info tooltips, compact mobile header, unchanged offer/paid report/PDF.");

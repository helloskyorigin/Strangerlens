import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

const report = mapBackendToFrontend(
  structuredClone(paymentAnalysis), "https://example.com", paymentSnapshot
);
const make = (paid: boolean) => new JSDOM(renderToStaticMarkup(
  <ResultsScreen rawUrl="https://example.com" analysisData={report}
    checkoutEnabled isUnlocked={paid} paymentEnvironment="live_mode"
    onBackToLanding={() => {}} />
)).window.document;
const free = make(false);
const paid = make(true);

const score = free.querySelector("#report-first-look")!;
const signals = free.querySelector("#report-clarity-signals")!;
const upgrade = free.querySelector("#complete-report-preview")!;
const exportUtility = free.querySelector("#report-export-actions")!;

assert.ok(score && signals && upgrade && exportUtility);
assert.equal(score.nextElementSibling?.id, "report-clarity-signals",
  "The five clarity signals follow the overall score directly; no duplicate preview panels interrupt the flow.");
assert.equal(free.querySelectorAll(".sl-v7-signal-row").length, 5,
  "Free preview has exactly five scored signals.");
assert.equal(free.querySelectorAll(".sl-v8-summary-strip, .sl-v7-intro, .sl-v8-report-navigation, [data-testid='purchase-readiness-locked']").length, 0,
  "No extra intro, sixth free card, navigation or bottom strip.");
assert.ok(score.querySelector(".sl-v8-score-insight"), "The score has a one-line insight.");
assert.equal(free.querySelectorAll(".sl-v8-next-step, .sl-v8-verdict-panel, .sl-v7-tier-compare, .sl-v7-upgrade-reason").length, 0,
  "Old duplicated explanation, next-step and free/paid comparison cards are removed.");
assert.equal(upgrade.querySelectorAll(".sl-v8-unlock-item").length, 5,
  "The paid offer always shows exactly five benefits.");
assert.ok(upgrade.querySelector('[aria-label="Included in Full Analysis"]'));
assert.ok(!upgrade.textContent?.includes("YOU HAVE") && !upgrade.textContent?.includes("Five-Signal Diagnosis"));
assert.ok(upgrade.textContent?.includes("Unlock Full Analysis — $9"));
assert.ok(!free.body.textContent?.includes(privateText), "No premium text leaks to free visitors.");
assert.ok(!free.body.textContent?.includes("Public website content"), "No jargon appears in the free report.");
assert.ok(upgrade.compareDocumentPosition(exportUtility) & free.defaultView!.Node.DOCUMENT_POSITION_FOLLOWING,
  "The $9 value proposition comes immediately after the signal report, ahead of the free PDF utility.");
assert.equal(free.querySelectorAll("#report-export-actions button").length, 1);
assert.ok(free.querySelector("#report-export-actions button")?.textContent?.includes("Download Free PDF"));

assert.equal(paid.querySelectorAll("#report-export-actions button").length, 1);
assert.ok(paid.querySelector("#report-export-actions button")?.textContent?.includes("Download Full PDF"));
assert.equal(paid.querySelector("#complete-report-preview"), null, "Paid report has no repeated unlock pitch.");
for (const id of ["strangers-view", "complete-paid-report", "evidence-to-fix", "smart-priority", "better-copy-studio"]) {
  assert.ok(paid.getElementById(id), "The original paid feature survives: " + id);
}
const stylesheet = readFileSync("components/results-lime-v8.css", "utf8");
assert.ok(stylesheet.includes("#report-first-look .sl-v8-score-panel") &&
  stylesheet.includes("#report-clarity-signals{margin-top:19px}"),
  "The score and signals use a compact desktop spacing system.");
assert.ok(stylesheet.includes(".sl-v7-signal-row{padding:15px 17px;min-height:0!important") &&
  stylesheet.includes("@media(max-width:650px)") &&
  stylesheet.includes(".sl-v7-signal-row{padding:13px 15px}"),
  "Cards cannot expand to a minimum desktop height and mobile cards use tighter spacing.");
assert.ok(stylesheet.includes("#report-export-actions button *{color:#FFFFFF!important}") ||
  stylesheet.includes("#report-export-actions button *,"),
  "PDF button children cannot inherit dark text on a dark background.");
assert.ok(stylesheet.includes("background:#111510!important") && stylesheet.includes("color:#FFFFFF!important"),
  "The free PDF button has explicit high-contrast foreground and background colors.");
assert.ok(stylesheet.includes(".sl-v8-unlock-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))") &&
  stylesheet.includes(".sl-v8-unlock-list{grid-template-columns:1fr"),
  "The compact $9 offer supports both two-column desktop and single-column mobile layouts.");
const nextConfig = readFileSync("next.config.ts", "utf8");
assert.ok(nextConfig.includes("devIndicators: false"), "The preview no longer overlays cards with the Next.js N badge.");
console.log("PASS: screenshot-driven score → signals → one $9 offer hierarchy, no repeated panels, accessible PDF contrast, responsive card sizing, and protected paid chapters.");

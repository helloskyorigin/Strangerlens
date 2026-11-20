import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import ScanScreen from "../components/ScanScreen";
import ResultsScreen from "../components/ResultsScreen";
import PostScanUpgradeModal from "../components/PostScanUpgradeModal";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";

const scan = renderToStaticMarkup(<ScanScreen rawUrl="https://example.com" onBackToLanding={() => {}} isVerifying={true}/>);
assert.ok(scan.includes("sl-scan-running") && scan.includes("sl-scan-lens-scene"), "Scanning matches the compact centered VYLENS inspection.");
assert.ok(scan.includes("sl-scan-lens-beam") && scan.includes("sl-scan-subject"), "A quiet scanning animation and domain card are shown.");
assert.ok(scan.includes("Taking a closer look"), "Single-focus scanning headline.");
assert.ok(!scan.includes("sl-scan-stages") && !scan.includes("sl-scan-workspace"), "Old desktop two-column step list is gone.");
assert.ok(!scan.includes("aria-valuenow") && !scan.includes("Open my report"), "No fake progress or premature report link.");

const mapped = mapBackendToFrontend(structuredClone(paymentAnalysis), "https://example.com", paymentSnapshot);
const freeDoc = new JSDOM(renderToStaticMarkup(<ResultsScreen rawUrl="https://example.com" analysisData={mapped} checkoutEnabled={true}/>)).window.document;
const preview = freeDoc.querySelector('#complete-report-preview');
const score = [...freeDoc.querySelectorAll("h2")].find(el => el.textContent?.includes("Website Clarity Score"));
const signals = [...freeDoc.querySelectorAll("h2")].find(el => el.textContent?.includes("Your Clarity Signals"));
assert.ok(preview && score && signals, "Score, compact signal list and single upgrade card coexist.");
assert.ok(freeDoc.querySelector('[data-testid="full-report-upgrade-anchor"] > #complete-report-preview'),
  "Mobile sticky $9 CTA tracks the actual visible upgrade card, not an unbound ref.");

assert.ok(Boolean(score.compareDocumentPosition(signals) & 4), "Free scores follow the score.");
assert.ok(Boolean(signals.compareDocumentPosition(preview) & 4), "One $9 paid offer follows free signals.");
assert.ok(preview.textContent?.includes("Unlock Full Analysis — $9"), "Single premium CTA is priced correctly.");
assert.ok(!freeDoc.querySelector('section[aria-label="Unlock the detailed report"]'), "No redundant early upsell panel.");
assert.equal([...freeDoc.querySelectorAll('#complete-report-preview button')].filter(x=>x.textContent?.includes('Unlock')).length,1, "Just one preview checkout action.");
assert.ok(!freeDoc.querySelector('#your-improvement-plan'),"No paid findings before payment.");
assert.ok(!freeDoc.querySelector(".sl-upgrade-dialog"), "Free results do not auto-open the old modal.");

const paidDoc = new JSDOM(renderToStaticMarkup(<ResultsScreen rawUrl="https://example.com" analysisData={mapped} isUnlocked={true} checkoutEnabled={true}/>)).window.document;
assert.ok(!paidDoc.querySelector('#complete-report-preview'), "Paid accounts never see the free upsell.");
assert.ok(paidDoc.querySelector('#your-improvement-plan'), "Paid account retains full implementation workbench.");

const modal = new JSDOM(renderToStaticMarkup(<PostScanUpgradeModal open
  domain="example.com" overallScore="73/100"
  signals={[
    { title: "First Impression", scoreDisplay: "75/100" },
    { title: "Audience", scoreDisplay: "62/100" },
    { title: "Value", scoreDisplay: "85/100" },
    { title: "Trust", scoreDisplay: "44/100" },
    { title: "Action", scoreDisplay: "95/100" },
  ]} canCheckout isTestMode={false} busy={false}
  onContinueFree={() => {}} onUpgrade={() => {}}/>)).window.document;
const pricedCheckout = [...modal.querySelectorAll("button")].find(b => b.textContent?.includes("Unlock Complete Report — $9"));
const personalReason = [...modal.querySelectorAll("p")].find(p => p.textContent?.includes("Trust scored 44/100"));
assert.ok(pricedCheckout && personalReason, "Centered mobile offer explains a score-specific reason to unlock.");
assert.ok(Boolean(personalReason!.compareDocumentPosition(pricedCheckout!) & 4), "Personalized reason is visible before the single centered mobile CTA.");
assert.ok(modal.querySelector('button[aria-label="Close and view free results"]'), "Upgrade modal remains dismissible.");
assert.ok([...modal.querySelectorAll("button")].some(b => b.textContent?.includes("Continue with free results")), "Free route is available in mobile modal.");
console.log("PASS: compact scan, above-signal mobile upgrade, mobile popup action order, and premium entitlement.");

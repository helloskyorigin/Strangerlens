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
assert.ok(scan.includes('max-w-[620px]'), "Scanning is a compact centered flow.");
assert.ok(!scan.includes("Communication map") && !scan.includes("Schematic preview"), "Oversized audit workspace was removed.");
assert.ok(scan.includes("Connecting to your website.") && scan.includes("Website connection verified"), "Real verification UI is shown.");
assert.ok(!scan.includes("Verify website connection") || !scan.includes("Session status"), "No old giant stage panel.");

const mapped = mapBackendToFrontend(structuredClone(paymentAnalysis), "https://example.com", paymentSnapshot);
const freeDoc = new JSDOM(renderToStaticMarkup(<ResultsScreen rawUrl="https://example.com" analysisData={mapped} checkoutEnabled={true}/>)).window.document;
const card = freeDoc.querySelector('section[aria-label="Unlock the detailed report"]');
const score = [...freeDoc.querySelectorAll("h2")].find(element => element.textContent?.includes("Website Clarity Score"));
const signals = [...freeDoc.querySelectorAll("h2")].find(element => element.textContent?.includes("Your Clarity Signals"));
assert.ok(card && score && signals, "Score, immediate mobile offer, and free signal list coexist.");
assert.ok(Boolean(score.compareDocumentPosition(card) & 4), "Mobile pay offer is AFTER the overall score.");
assert.ok(Boolean(card.compareDocumentPosition(signals) & 4), "Mobile pay offer appears BEFORE five stacked scores.");
assert.ok(card.textContent?.includes("Unlock Complete Analysis — $3"), "First-screen mobile upgrade mentions the actual price.");
assert.ok(card.className.includes("sm:hidden"), "Early offer is mobile-only; desktop keeps prior composition.");
assert.ok(!freeDoc.querySelector('#your-improvement-plan'), "Early offer does not leak paid findings.");
assert.ok(freeDoc.querySelector('#complete-report-preview'), "Full report preview is still available below free scores.");

const paidDoc = new JSDOM(renderToStaticMarkup(<ResultsScreen rawUrl="https://example.com" analysisData={mapped} isUnlocked={true} checkoutEnabled={true}/>)).window.document;
assert.ok(!paidDoc.querySelector('section[aria-label="Unlock the detailed report"]'), "Paid accounts never see mobile upsell.");
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
const firstMobilePayment = [...modal.querySelectorAll("button")].find(b => b.textContent?.includes("Unlock Full Analysis — $3"));
const desktopDetails = [...modal.querySelectorAll("p")].find(p => p.textContent?.includes("Your five clarity signals"));
assert.ok(firstMobilePayment && desktopDetails, "Mobile sheet has an early priced payment CTA.");
assert.ok(Boolean(firstMobilePayment.compareDocumentPosition(desktopDetails) & 4), "Mobile CTA comes BEFORE detailed signal breakdown.");
assert.ok(modal.querySelector('button[aria-label="Close and view free results"]'), "Upgrade modal remains dismissible.");
assert.ok([...modal.querySelectorAll("button")].some(b => b.textContent?.includes("Continue with free results")), "Free route is available in mobile modal.");
console.log("PASS: compact scan, above-signal mobile upgrade, mobile popup action order, and premium entitlement.");

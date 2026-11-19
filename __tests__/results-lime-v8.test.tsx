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
assert.ok(free.querySelector(".sl-v8-summary-strip"), "Report highlights weaker and stronger scored signals.");
assert.ok(free.querySelector('.sl-v8-report-navigation a[href="#report-first-look"]'), "Navigation starts with first look.");
assert.ok(free.querySelector('.sl-v8-report-navigation a[href="#report-clarity-signals"]'), "Navigation links to signals.");
assert.ok(free.querySelector('.sl-v8-report-navigation a[href="#complete-report-preview"]'), "Free next step links to authorized upsell.");
assert.equal(free.querySelectorAll('[data-signal]').length, 5, "Only five core scores visible in free non-purchase sample.");
assert.ok(free.querySelector("#complete-report-preview"), "Paid upgrade remains present.");
assert.ok(!free.querySelector("#your-improvement-plan"), "Free view does not expose the premium plan.");
assert.ok(!free.body.textContent?.includes(privateText), "Free view cannot leak paid report findings.");

const paid = render(true);
assert.ok(!paid.querySelector("#complete-report-preview"), "Already paid users do not get free-tier upsell.");
assert.ok(paid.querySelector("#complete-paid-report"), "Paid report deep dive remains accessible.");
assert.ok(paid.querySelector("#your-improvement-plan"), "Paid improvements remain accessible.");
assert.ok(paid.body.textContent?.includes(privateText), "Verified unlocked report contains protected findings.");
assert.ok(paid.querySelector('.sl-v8-report-navigation a[href="#complete-paid-report"]'), "Paid next step targets paid chapters.");

console.log("PASS: VYLENS-inspired results hierarchy, anchored navigation and protected premium report boundaries.");

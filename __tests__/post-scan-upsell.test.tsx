import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import PostScanUpgradeModal from "../components/PostScanUpgradeModal";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

let assertions = 0;
const check = (value: unknown, message: string) => { assert.ok(value, message); assertions++; };
const modalProps = {
  domain: "example.com",
  overallScore: "79/100",
  signals: [
    { title: "First Impression", scoreDisplay: "90/100" },
    { title: "Audience", scoreDisplay: "62/100" },
    { title: "Value", scoreDisplay: "85/100" },
    { title: "Trust", scoreDisplay: "60/100" },
    { title: "Action", scoreDisplay: "90/100" },
  ],
  canCheckout: true, isTestMode: false, busy: false,
  onContinueFree: () => {}, onUpgrade: () => {},
};

const offer = new JSDOM(renderToStaticMarkup(<PostScanUpgradeModal open={true} {...modalProps} />));
const doc = offer.window.document;
const text = doc.body.textContent || "";
check(doc.querySelector('[role="dialog"][aria-modal="true"]'), "post-scan offer has an accessible dialog");
check(doc.querySelector('button[aria-label="Close and view free results"]'), "modal has close button");
check([...doc.querySelectorAll("button")].some(b => b.textContent?.includes("Continue with my free results")), "free report is accessible without purchase");
check([...doc.querySelectorAll("button")].some(b => b.textContent?.includes("Unlock Complete Report — $3")), "premium CTA is for the complete report at $3");
check(modalProps.signals.every(signal => text.includes(signal.title) && text.includes(signal.scoreDisplay)), "modal lists every public signal score");
check(!text.includes(privateText), "private paid content is never placed in the popup");
offer.window.close();

const hidden = renderToStaticMarkup(<PostScanUpgradeModal open={false} {...modalProps} />);
check(hidden === "", "dismissed modal renders nothing");
const unavailable = new JSDOM(renderToStaticMarkup(<PostScanUpgradeModal open={true} {...modalProps} canCheckout={false} />));
check(!!unavailable.window.document.querySelector('button:disabled'), "offline checkout disables paid button");
check(unavailable.window.document.body.textContent?.includes("Your free report is ready below"), "free report survives checkout errors");
unavailable.window.close();

const freeReport = mapBackendToFrontend(structuredClone(paymentAnalysis), "https://example.com", paymentSnapshot);
const freeMarkup = renderToStaticMarkup(<ResultsScreen analysisData={freeReport} rawUrl="https://example.com" checkoutEnabled={true} />);
check(freeMarkup.includes('id="complete-report-preview"'), "full report preview is present for free users");
check(freeMarkup.includes("First Impression") && freeMarkup.includes("Audience") && freeMarkup.includes("Trust"), "five signal preview remains populated");
check(freeMarkup.includes('id="complete-report-preview"') && !freeMarkup.includes('id="your-improvement-plan"'), "no paid plan rendered in free report");

const paidMarkup = renderToStaticMarkup(<ResultsScreen analysisData={freeReport} rawUrl="https://example.com" checkoutEnabled={true} isUnlocked={true} />);
check(!paidMarkup.includes('id="complete-report-preview"'), "paid users do not see locked preview");
check(paidMarkup.includes('id="complete-paid-report"') && paidMarkup.includes('id="your-improvement-plan"'), "verified paid users see full chapter explorer and actionable plan");
console.log(`PASS: ${assertions} full-report popup, five-signal preview, free access and premium gating assertions.`);

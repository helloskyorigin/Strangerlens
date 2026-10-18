import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import PostScanUpgradeModal from "../components/PostScanUpgradeModal";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

let assertions = 0;
const check = (test: unknown, message: string) => { assert.ok(test, message); assertions++; };
const modalProps = {
  domain: "example.com", overallScore: "79/100",
  weakestSignal: { title: "Trust", score: 60 },
  canCheckout: true, isTestMode: false, busy: false,
  onContinueFree: () => {}, onUpgrade: () => {},
};

const offer = new JSDOM(renderToStaticMarkup(<PostScanUpgradeModal open={true} {...modalProps} />));
const doc = offer.window.document;
check(doc.querySelector('[role="dialog"][aria-modal="true"]'), "post-scan offer is an accessible dialog");
check(doc.querySelector('button[aria-label="Close and view free results"]'), "modal offers a close button");
check([...doc.querySelectorAll("button")].some(b => b.textContent?.includes("Continue with my free results")), "free report always remains directly accessible");
check([...doc.querySelectorAll("button")].some(b => b.textContent?.includes("Unlock Full Analysis — $5")), "paid offer has one-time price");
check(doc.body.textContent?.includes("Trust") && doc.body.textContent?.includes("60/100"), "weakest free signal is correctly personalized");
check(!doc.body.textContent?.includes(privateText), "premium private content never appears in modal");
offer.window.close();

const hidden = renderToStaticMarkup(<PostScanUpgradeModal open={false} {...modalProps} />);
check(hidden === "", "modal renders nothing when dismissed");
const unavailable = new JSDOM(renderToStaticMarkup(<PostScanUpgradeModal open={true} {...modalProps} canCheckout={false} />));
check(Boolean(unavailable.window.document.querySelector('button:disabled')), "checkout action disabled honestly if checkout unavailable");
check(unavailable.window.document.body.textContent?.includes("Your free report is ready below"), "free report still available when checkout is down");
unavailable.window.close();

const free = structuredClone(paymentAnalysis);
const freeReport = mapBackendToFrontend(free, "https://example.com", paymentSnapshot);
const freeMarkup = renderToStaticMarkup(<ResultsScreen analysisData={freeReport} rawUrl="https://example.com" checkoutEnabled={true} />);
check(freeMarkup.includes("A Clarity Opportunity"), "results promote a personalized opportunity above the signals");
check(freeMarkup.includes("See Detailed Fixes — $5"), "above-the-fold paid CTA exists");
check(freeMarkup.includes("Website Clarity Score"), "core free overall score is preserved");
check(freeMarkup.includes("Your Clarity Signals"), "all five free signal scores remain available");
check(!freeMarkup.includes(privateText), "free report markup does not expose private paid findings");

const paidMarkup = renderToStaticMarkup(<ResultsScreen analysisData={freeReport} rawUrl="https://example.com" checkoutEnabled={true} isUnlocked={true} />);
check(!paidMarkup.includes("A Clarity Opportunity"), "verified paid reports omit upgrade teaser");

console.log(`PASS: ${assertions} post-scan modal, free-access, and premium-isolation UX assertions.`);

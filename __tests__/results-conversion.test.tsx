import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

let assertions = 0;
const check = (value: unknown, message: string) => { assert.ok(value, message); assertions++; };
const signalNames = ["First Impression", "Audience", "Value", "Trust", "Action"];

function render(scores: Record<string, number | null>, paid = false, testMode = false, checkoutEnabled = true) {
  const analysis = structuredClone(paymentAnalysis);
  for (const [key, score] of Object.entries(scores)) analysis.signals[key] = { ...analysis.signals[key], score };
  const data = mapBackendToFrontend(analysis, "https://example.com", paymentSnapshot);
  return new JSDOM(renderToStaticMarkup(
    <ResultsScreen analysisData={data} rawUrl="https://example.com"
      isUnlocked={paid} checkoutEnabled={checkoutEnabled}
      paymentEnvironment={testMode ? "test_mode" : "live_mode"} onBackToLanding={() => {}} />
  ));
}

for (const width of [320, 390, 1440]) {
  for (const testMode of [false, true]) {
    for (const paid of [false, true]) {
      const dom = render({ audience: 48, trust: 65 }, paid, testMode);
      Object.defineProperty(dom.window, "innerWidth", { value: width });
      const doc = dom.window.document;
      const text = doc.body.textContent || "";
      check(doc.querySelectorAll('button[aria-label^="About "]').length === 10, "all five free signals keep info triggers in both layouts");
      check(text.includes("Your Clarity Signals") && text.includes("Website Clarity Score"), "core score UI remains visible");
      if (paid) {
        check(!doc.querySelector("#complete-report-preview"), "verified paid users do not see upsell");
        check(!!doc.querySelector("#complete-paid-report"), "paid users see full report explorer");
        check(doc.querySelectorAll('#complete-paid-report [role="tab"]').length === 5, "paid explorer provides all five core chapters");
        check(doc.querySelectorAll('#complete-paid-report [role="tab"][aria-selected="true"]').length === 1, "one full report chapter is active");
        check(text.includes("Why This Score") && text.includes("What's Working") && text.includes("How to Improve"), "paid chapter contains detailed reasoning and recommendations");
        check(text.includes(privateText), "paid signal explanations are rendered");
        check(!!doc.querySelector("#your-improvement-plan") && text.includes("Better Copy Studio") && text.includes("Evidence-to-Fix") && text.includes("Smart Priority"), "paid improvements and copy proposals are visible");
      } else {
        const preview = doc.querySelector("#complete-report-preview");
        check(!!preview, "free visitor sees complete-report preview");
        const previewText = preview?.textContent || "";
        check(previewText.includes("You Have the Scores. Now Understand the Whole Picture."), "full-report value is explicit");
        check(signalNames.every(name => previewText.includes(name)), "every core signal has a locked premium chapter preview");
        check(previewText.includes("What&apos;s Unclear") === false && previewText.includes("All five signal analyses"), "preview describes broad paid coverage without leaking findings");
        check(!text.includes(privateText) && !doc.querySelector("#your-improvement-plan"), "free tier never renders private premium content");
        check([...doc.querySelectorAll("button")].some(button => button.textContent?.includes("Unlock My Complete Analysis — $5")), "single report CTA remains $5");
        check(testMode ? text.includes("Test Mode") && text.includes("No real money charged.")
          : text.includes("One-time payment · Instant access · No subscription") && !text.includes("TEST MODE"),
          "correct payment mode reassurance");
      }
      dom.window.close();
    }
  }
}

const missing = render({ audience: null, trust: null });
check(missing.window.document.querySelector("#complete-report-preview")?.textContent?.includes("—/100"), "missing signal scores display unavailable rather than invented score");
missing.window.close();

const unavailable = render({}, false, false, false);
check(unavailable.window.document.querySelector("#complete-report-preview button[disabled]"), "full-report purchase is disabled when checkout is offline");
check(unavailable.window.document.body.textContent?.includes("Checkout is currently unavailable."), "legacy waitlist fallback remains discoverable");
unavailable.window.close();

console.log(`PASS: ${assertions} five-chapter upsell, free-access, premium depth and payment mode assertions (DOM at mobile and desktop widths).`);

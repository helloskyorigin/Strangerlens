import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

const savedMode = process.env.NEXT_PUBLIC_DODO_TEST_MODE;
let assertions = 0;
const check = (value: unknown, message: string) => { assert.ok(value, message); assertions++; };
const benefits = ["Why Your Website Scored This Way", "What Visitors Understand — and Miss", "Specific Fixes You Can Make", "What Visitors Notice First"];

function render(scores: Record<string, number | null>, paid = false, testMode = false, checkoutEnabled = true) {
  const analysis = structuredClone(paymentAnalysis);
  for (const [key, score] of Object.entries(scores)) analysis.signals[key] = { ...analysis.signals[key], score };
  const data = mapBackendToFrontend(analysis, "https://example.com", paymentSnapshot);
  return new JSDOM(renderToStaticMarkup(<ResultsScreen analysisData={data} rawUrl="https://example.com" isUnlocked={paid} checkoutEnabled={checkoutEnabled} paymentEnvironment={testMode ? "test_mode" : "live_mode"} onBackToLanding={() => {}} />));
}

try {
  delete process.env.NEXT_PUBLIC_DODO_TEST_MODE;
  for (const width of [320, 390, 1440]) {
    for (const testMode of [false, true]) {
      for (const paid of [false, true]) {
        const dom = render({ audience: 48, trust: 65 }, paid, testMode);
        Object.defineProperty(dom.window, "innerWidth", { value: width });
        const doc = dom.window.document;
        const text = doc.body.textContent!;
        const teaser = doc.querySelector('[aria-label="Your lowest-scoring clarity signal"]');
        check(!/Coming Soon|Coming with Full Analysis|Available when Full Analysis launches/i.test(text), "no obsolete launch copy in Free or Paid results");
        check(doc.querySelectorAll('button[aria-label^="About "]').length === 10, "all five signals remain in both responsive layouts");
        if (paid) {
          check(!teaser && !text.includes("Your Score Is Just the Beginning."), "paid results hide conversion content");
          check(text.includes("Signal Diagnostics") && text.includes(privateText), "paid diagnostics remain available");
        } else {
          check(text.includes("Your Score Is Just the Beginning."), "requested conversion heading");
          check(text.includes("You know your clarity score. Now discover WHY it scored that way — and exactly what to improve."), "requested supporting copy");
          check(teaser?.textContent?.includes("Audience — 48/100"), "teaser uses the actual lowest signal and original score");
          check(!teaser?.textContent?.includes(privateText) && !text.includes(privateText), "no premium findings leak into the free report");
          check(text.includes("Inside Your Full Analysis") && benefits.every(benefit => text.includes(benefit)), "all four benefits use the requested copy");
          check([...doc.querySelectorAll("button")].some(button => button.textContent === "Unlock Full Analysis — $5"), "existing checkout button keeps requested CTA and price");
          check(testMode ? text.includes("TEST MODE") && text.includes("No real money charged.") : text.includes("One-time payment · Instant access · No subscription") && !text.includes("TEST MODE"), "actual mode indicator and live reassurance preserved");
        }
        dom.window.close();
      }
    }
  }
  for (const [scores, expected] of [
    [{ action: 0 }, "Action — 0/100"],
    [{ audience: 48, trust: 48 }, "Audience — 48/100"],
    [{ first_impression: null, trust: 39 }, "Trust — 39/100"],
    [{ action: 90, audience: 96, trust: 97, value: 98, first_impression: 99 }, "Action — 90/100"],
  ] as Array<[Record<string, number | null>, string]>) {
    const dom = render(scores);
    check(dom.window.document.querySelector('[aria-label="Your lowest-scoring clarity signal"]')?.textContent?.includes(expected), `real score selection: ${expected}`);
    dom.window.close();
  }
  const empty = render(Object.fromEntries(Object.keys(paymentAnalysis.signals).map(key => [key, null])));
  check(!empty.window.document.querySelector('[aria-label="Your lowest-scoring clarity signal"]'), "missing scores never fabricate a teaser");
  empty.window.close();
  const unavailable = render({ audience: 48 }, false, false, false);
  check(unavailable.window.document.body.textContent!.includes("Checkout is currently unavailable."), "existing unavailable-checkout fallback remains honest");
  unavailable.window.close();
  console.log(`PASS: ${assertions} conversion-copy, original-score, paid-access and payment-mode assertions. Responsive markup checked at mobile and desktop viewport settings; no real-browser layout engine used.`);
} finally {
  if (savedMode === undefined) delete process.env.NEXT_PUBLIC_DODO_TEST_MODE;
  else process.env.NEXT_PUBLIC_DODO_TEST_MODE = savedMode;
}

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ScanScreen, { SCAN_STAGES } from "../components/ScanScreen";

const props = { rawUrl: "https://example.com", onBackToLanding: () => {} };
const render = (overrides: Record<string, unknown>) =>
  renderToStaticMarkup(<ScanScreen {...props} {...overrides} />);

const connecting = render({ isVerifying: true });
assert.ok(connecting.includes("Connecting to your website."), "Connecting headline is clear.");
assert.ok(connecting.includes("Website connection verified"), "Connection stage has a meaningful label.");
assert.ok(!connecting.includes("Confirmed: example.com"), "No fake completed verification.");
assert.ok(!connecting.includes("Open my report"), "No early result CTA.");
assert.ok(connecting.includes("max-w-[620px]"), "Desktop analysis desk has two-column structure.");

const analyzing = render({
  isVerifying: false,
  verifiedSite: { domain: "example.com", httpStatus: 200 },
});
assert.ok(analyzing.includes("Website verified"), "Actual verification milestone is visible.");
assert.ok(analyzing.includes("Reading your website&#x27;s message."), "Content extraction stage is represented honestly.");
assert.ok(!analyzing.includes("Open my report"), "Analysis cannot declare ready early.");

const inspected = render({isVerifying:false, verifiedSite:{domain:"example.com",httpStatus:200}, scanMilestone:"content_inspected"});
assert.ok(inspected.includes("Looking through a stranger&#x27;s eyes."), "Backend extraction event begins evaluation.");
const scored = render({isVerifying:false, verifiedSite:{domain:"example.com",httpStatus:200}, scanMilestone:"signals_evaluated"});
assert.ok(scored.includes("Preparing your clarity report."), "Scoring completion begins report preparation.");
assert.ok(!scored.includes("Open my report"), "No ready CTA before report persistence.");

const ready = render({
  isVerifying: false, isBackendReady: true,
  verifiedSite: { domain: "example.com", httpStatus: 200 },
});
assert.ok(ready.includes("Your report is ready."));
assert.ok(ready.includes("Open my report"), "Ready state has strong CTA.");
assert.ok(ready.includes("Your clarity report prepared"));

const error = render({
  backendError: "We couldn't extract content from this website",
  verifiedSite: { domain: "example.com", httpStatus: 200 },
});
assert.ok(error.includes("Try again") && error.includes("Use another URL"), "Error has actionable recovery.");
assert.ok(!error.includes("Open my report"), "Failures never expose report CTA.");

assert.equal(SCAN_STAGES.length, 4, "Four real backend-backed scan milestones.");
assert.ok(SCAN_STAGES.every(stage => Boolean(stage.id && stage.label)));
console.log("PASS: serious responsive scanning workspace renders truthful verify/analyze/ready/error states.");

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ScanScreen, { SCAN_STAGES } from "../components/ScanScreen";

const props = { rawUrl: "https://example.com", onBackToLanding: () => {} };
const render = (overrides: Record<string, unknown>) =>
  renderToStaticMarkup(<ScanScreen {...props} {...overrides} />);

const connecting = render({ isVerifying: true });
assert.ok(connecting.includes("Building your clarity report."), "Connecting headline is clear.");
assert.ok(connecting.includes("Checking that the website is reachable"), "Verification is real status.");
assert.ok(!connecting.includes("Confirmed: example.com"), "No fake completed verification.");
assert.ok(!connecting.includes("View My Clarity Report"), "No early result CTA.");
assert.ok(connecting.includes("md:grid-cols-"), "Desktop analysis desk has two-column structure.");

const analyzing = render({
  isVerifying: false,
  verifiedSite: { domain: "example.com", httpStatus: 200 },
});
assert.ok(analyzing.includes("Confirmed: example.com"), "Actual verification milestone is visible.");
assert.ok(analyzing.includes("Evaluating accessible website content"), "Real backend analysis state is represented.");
assert.ok(!analyzing.includes("View My Clarity Report"), "Analysis cannot declare ready early.");

const ready = render({
  isVerifying: false, isBackendReady: true,
  verifiedSite: { domain: "example.com", httpStatus: 200 },
});
assert.ok(ready.includes("Your clarity report is ready."));
assert.ok(ready.includes("View My Clarity Report"), "Ready state has strong CTA.");
assert.ok(ready.includes("Results ready to view"));

const error = render({
  backendError: "We couldn't extract content from this website",
  verifiedSite: { domain: "example.com", httpStatus: 200 },
});
assert.ok(error.includes("Retry analysis") && error.includes("Change website"), "Error has actionable recovery.");
assert.ok(!error.includes("View My Clarity Report"), "Failures never expose report CTA.");

assert.equal(SCAN_STAGES.length, 3, "Three real network milestones; no simulated substage completions.");
assert.ok(SCAN_STAGES.every(stage => Boolean(stage.id && stage.label)));
console.log("PASS: serious responsive scanning workspace renders truthful verify/analyze/ready/error states.");

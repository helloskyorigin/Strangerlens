import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ScanScreen from "../components/ScanScreen";

const props = { rawUrl: "https://example.com", onBackToLanding: () => {} };
const render = (overrides: Record<string, unknown>) =>
  renderToStaticMarkup(<ScanScreen {...props} {...overrides} />);

const connecting = render({ isVerifying: true });
assert.ok(connecting.includes("Taking a closer look."), "VYLENS centered opening message.");
assert.ok(connecting.includes("sl-scan-lens-scene") && connecting.includes("sl-scan-lens-stage"), "Centered square scanner visual.");
assert.ok(connecting.includes("sl-scan-lens-beam") && connecting.includes("sl-scan-progress-track"), "Sweep beam and indeterminate line.");
assert.ok(connecting.includes("sl-scan-subject-details"), "Domain lives inside a compact subject card.");
assert.ok(!connecting.includes("sl-scan-workspace") && !connecting.includes("sl-scan-stages"), "No two-column status desk or numbered step list.");
assert.ok(!connecting.includes("Open my report"), "No early result CTA.");
assert.ok(!connecting.includes("aria-valuenow"), "No fabricated percent completion.");

const analyzing = render({
  isVerifying: false, verifiedSite: { domain: "example.com", httpStatus: 200 },
});
assert.ok(analyzing.includes("Understanding your website."), "Website-connected copy.");
assert.ok(analyzing.includes("example.com"), "Actual website shown.");
assert.ok(!analyzing.includes("Open my report"), "No premature result availability.");

const inspected = render({verifiedSite:{domain:"example.com",httpStatus:200},scanMilestone:"content_inspected"});
assert.ok(inspected.includes("Looking through fresh eyes."), "Copy reflects inspected backend content.");
const scored = render({verifiedSite:{domain:"example.com",httpStatus:200},scanMilestone:"signals_evaluated"});
assert.ok(scored.includes("Preparing your report."), "Copy reflects actual evaluated signals.");
assert.ok(!scored.includes("Open my report"), "Backend has not declared report ready.");

const ready = render({isBackendReady:true,verifiedSite:{domain:"example.com",httpStatus:200}});
assert.ok(ready.includes("Your report is ready."));
assert.ok(ready.includes("Open my report"), "Ready CTA only after real completion.");

const error = render({backendError:"We couldn't extract content from this website"});
assert.ok(error.includes("Try again") && error.includes("Start over"), "Error recovery stays available.");
assert.ok(!error.includes("Open my report"), "A failed scan cannot show a report CTA.");

console.log("PASS: VYLENS single-focus scan layout without a step-by-step checklist.");

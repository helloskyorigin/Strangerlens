import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ScanScreen from "../components/ScanScreen";

const render = (props: Partial<React.ComponentProps<typeof ScanScreen>> = {}) =>
  renderToStaticMarkup(<ScanScreen rawUrl="https://example.com" onBackToLanding={() => {}} {...props} />);

const connecting = render({ isVerifying: true });
assert.match(connecting, /sl-scan-v2/);
assert.match(connecting, /Taking a closer look/);
assert.match(connecting, /STRANGERLENS IS LOOKING CLOSER/);
assert.match(connecting, /sl-scan-lens-stage/);
assert.match(connecting, /sl-scan-lens-beam/);
assert.match(connecting, /sl-scan-progress-indicator/);
assert.match(connecting, /sl-scan-subject/);
assert.match(connecting, /example\.com/);
assert.match(connecting, /Time spent scanning/);
assert.match(connecting, /Exit/);
assert.doesNotMatch(connecting, /sl-scan-stages|sl-scan-stage-icon|aria-valuenow|\/ 4|4 checks/);
assert.doesNotMatch(connecting, /100% done|50% finished|live visitors recorded/i);
assert.doesNotMatch(connecting, /Open my report/, "The report must not open while scanning.");

const connected = render({ verifiedSite: { domain: "example.com", httpStatus: 200 }, scanMilestone: "connected" });
assert.match(connected, /Understanding your website/);
const inspected = render({ verifiedSite: { domain: "example.com", httpStatus: 200 }, scanMilestone: "content_inspected" });
assert.match(inspected, /Checking what stands out/);
assert.doesNotMatch(inspected, /fresh eyes|public content analysis/i);
const evaluated = render({ verifiedSite: { domain: "example.com", httpStatus: 200 }, scanMilestone: "signals_evaluated" });
assert.match(evaluated, /Preparing your report/);
assert.doesNotMatch(evaluated, /Open my report/);

const ready = render({ verifiedSite: { domain: "example.com", httpStatus: 200 }, isBackendReady: true, scanMilestone: "report_ready" });
assert.match(ready, /Your report is ready/);
assert.match(ready, /Open my report/);
assert.match(ready, /ANALYSIS COMPLETE/);
assert.doesNotMatch(ready, /sl-scan-lens-beam/);
assert.doesNotMatch(ready, /Time spent scanning/);

const error = render({ backendError: "Website not reachable" });
assert.match(error, /INSPECTION PAUSED/);
assert.match(error, /Website not reachable/);
assert.match(error, /Try again/);
assert.match(error, /Start over/);
assert.doesNotMatch(error, /Open my report/);

const safe = render({ backendError: "API_KEY=secret at internalCall()" });
assert.doesNotMatch(safe, /API_KEY=secret/);
console.log("PASS: actual VYLENS single-focus layout, backend-based scan copy, real timing, accessible recovery and report readiness.");

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ScanScreen from "../components/ScanScreen";

const render = (props: Partial<React.ComponentProps<typeof ScanScreen>> = {}) =>
  renderToStaticMarkup(
    <ScanScreen rawUrl="https://example.com" onBackToLanding={() => {}} {...props} />
  );

const connecting = render({ isVerifying: true });
assert.match(connecting, /sl-scan-v2/);
assert.match(connecting, /Connecting to your website\./);
assert.match(connecting, /Website connection verified/);
assert.match(connecting, /aria-valuenow="0"/);
assert.match(connecting, /Cancel scan and return home/);
assert.doesNotMatch(connecting, /100% done|50% finished|live visitors recorded/i);

const connected = render({ verifiedSite: { domain: "example.com", httpStatus: 200 }, scanMilestone: "connected" });
assert.match(connected, /aria-valuenow="1"/);
assert.match(connected, /Reading your website/);

const inspected = render({ verifiedSite: { domain: "example.com", httpStatus: 200 }, scanMilestone: "content_inspected" });
assert.match(inspected, /aria-valuenow="2"/);

const evaluated = render({ verifiedSite: { domain: "example.com", httpStatus: 200 }, scanMilestone: "signals_evaluated" });
assert.match(evaluated, /aria-valuenow="3"/);
assert.match(evaluated, /Preparing your clarity report/);

const ready = render({ verifiedSite: { domain: "example.com", httpStatus: 200 }, isBackendReady: true, scanMilestone: "report_ready" });
assert.match(ready, /aria-valuenow="4"/);
assert.match(ready, /Open my report/);
assert.match(ready, /REPORT READY/);

const error = render({ backendError: "Website not reachable" });
assert.match(error, /SCAN INTERRUPTED/);
assert.match(error, /Website not reachable/);
assert.match(error, /Try again/);
assert.match(error, /Use another URL/);

const safe = render({ backendError: "API_KEY=secret at internalCall()" });
assert.doesNotMatch(safe, /API_KEY=secret/);

console.log("PASS: VYLENS-style StrangerLens scan states, verified milestones, action accessibility, and error safety.");

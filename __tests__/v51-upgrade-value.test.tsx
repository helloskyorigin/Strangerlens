import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describePublicOpportunity, publicScoreFromDisplay } from "../lib/upgrade-offer";
import CompleteReportPreview from "../components/CompleteReportPreview";
import PostScanUpgradeModal from "../components/PostScanUpgradeModal";
import { adaptReport } from "../lib/report-adapter";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

assert.equal(publicScoreFromDisplay("62/100"),62);
assert.equal(publicScoreFromDisplay("—/100"),null);
assert.equal(publicScoreFromDisplay("101/100"),null);
assert.equal(publicScoreFromDisplay("12.2/100"),null);

const weak=describePublicOpportunity([
  {title:"Audience",score:62},{title:"Trust",score:39},{title:"Value",score:90}
]);
assert.equal(weak.signal,"Trust");
assert.ok(weak.detail.includes("Trust scored 39/100"));
const strong=describePublicOpportunity([{title:"Audience",score:90},{title:"Value",score:94}]);
assert.match(strong.heading,/working/);
assert.ok(!strong.detail.includes("biggest problem"));
const unknown=describePublicOpportunity([{title:"Audience",score:null}]);
assert.equal(unknown.signal,null);
assert.ok(!unknown.detail.includes("/100"));

const data=mapBackendToFrontend(structuredClone(paymentAnalysis),"https://example.com",paymentSnapshot);
const report=adaptReport(data);
const sample=renderToStaticMarkup(<CompleteReportPreview
  signals={report.signalsList} purchaseReadinessApplicable canCheckout isTestMode={false}
  busy={false} onUnlock={()=>{}} onViewExample={()=>{}}/>);
assert.ok(sample.includes("Know what to fix. And how."));
assert.ok(sample.includes("See an example report"));
assert.ok(sample.includes("Five")||sample.includes("five"));
assert.ok(sample.includes("Smart Priority"));
assert.ok(sample.includes("editable copy")||sample.includes("edit and copy"));
assert.ok(sample.includes("Unlock Full Analysis — $3"));
assert.ok(!sample.includes(privateText),"No premium findings in unpaid upgrade card.");
const modal=renderToStaticMarkup(<PostScanUpgradeModal open domain="example.com"
  overallScore="79/100" signals={[
    {title:"First Impression",scoreDisplay:"90/100"},
    {title:"Audience",scoreDisplay:"62/100"},
    {title:"Value",scoreDisplay:"85/100"},
    {title:"Trust",scoreDisplay:"60/100"},
    {title:"Action",scoreDisplay:"90/100"}
  ]} canCheckout busy={false} isTestMode={false} onUpgrade={()=>{}} onContinueFree={()=>{}}/>);
assert.ok(modal.includes("Trust scored 60/100"));
assert.equal((modal.match(/Unlock Complete Report — \$3/g)||[]).length,1,"Only one payment action in the modal.");
assert.ok(modal.includes("Continue with free results"));
assert.ok(!modal.includes(privateText));

const resultSource=readFileSync("components/ResultsScreen.tsx","utf8");
assert.ok(!resultSource.includes("setVerifiedUnlocked(true)"),"Client-only verification cannot independently unlock premium content.");
assert.ok(!resultSource.includes('fetch("/api/payments/verify"'),"Avoid racing two independent payment verification requests.");
assert.ok(resultSource.includes("onRefreshPaidReport"),"Already-paid checkout triggers authoritative report fetch.");
assert.ok(resultSource.includes("your-improvement-plan"),"Paid user can reach the full implementation plan.");
const payments=readFileSync("hooks/useReportPayments.ts","utf8");
assert.ok(payments.includes("await loadPaidReport(reportId, token"),"Successful verification restores paid data before unlocking.");
assert.ok(payments.includes("setUnlockedReportId(reportId)"),"Unlock flag comes only after protected paid data is fetched.");
const atmosphere=readFileSync("app/landing-v3.css","utf8");
assert.ok(atmosphere.includes("@keyframes sl-color-flow"));
assert.ok(atmosphere.includes("prefers-reduced-motion:reduce"));
const landing=readFileSync("app/page.tsx","utf8");
assert.ok(landing.includes("Free scan · No signup · Full report $3"));
console.log("PASS: personalized public-score upgrade, paid-only report gating, compact landing and slow accessible aurora.");

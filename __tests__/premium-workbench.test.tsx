import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildPremiumWorkbench } from "../lib/premium-workbench";
import { mapBackendToFrontend } from "../lib/mapper";
import { redactAnalysisForFreeTier, redactFrontendDataForFreeTier } from "../server/security/reportAccess";
import EvidenceToFix from "../components/EvidenceToFix";
import SmartPriority from "../components/SmartPriority";
import BetterCopyStudio from "../components/BetterCopyStudio";
import ResultsScreen from "../components/ResultsScreen";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";

const full: any = structuredClone(paymentAnalysis);
const known = { source: "hero", element: "h1", text: "Build clearer websites", status: "verified", matchType: "exact" };
const unsupported = { source: "hero", element: "h1", text: "FABRICATED_UNVERIFIED_MARKETING_CLAIM", status: "rejected" };
full.priority_fix.evidence = [known, unsupported];
full.other_improvements[0].evidence = [known, unsupported];
full.other_improvements[0].title = "Improve CTA copy";
full.signals.first_impression.score = 90;
full.signals.first_impression.evidence = [known];
const original = JSON.stringify(full);

const workbench = buildPremiumWorkbench(full, paymentSnapshot);
assert.equal(JSON.stringify(full), original, "Workbench does not mutate original stored report.");
assert.equal(workbench.evidenceFixes.length, 2);
assert.equal(workbench.evidenceFixes[0].evidence[0].text, "Build clearer websites");
assert.ok(workbench.evidenceFixes.every(f => !f.evidence.some(e => e.text.includes("FABRICATED"))), "Never display unverified quotes.");
assert.ok(workbench.priorities.some(p => p.lane === "do-first"));
assert.ok(workbench.priorities.some(p => p.lane === "quick-win"), "Grounded small CTA copy edit is only suggested as a quick win.");
assert.ok(workbench.priorities.some(p => p.lane === "keep-as-is"), "Verified strong signal should be preserved.");
assert.equal(workbench.copyOpportunities.length, 2);
assert.ok(workbench.copyOpportunities.every(op => op.recommended.length > 0));

const evidenceHtml = renderToStaticMarkup(<EvidenceToFix fixes={workbench.evidenceFixes}/>);
assert.ok(evidenceHtml.includes("Build clearer websites") && evidenceHtml.includes("Matched inspected content"));
assert.ok(!evidenceHtml.includes("FABRICATED_UNVERIFIED_MARKETING_CLAIM"));
const missingHtml = renderToStaticMarkup(<EvidenceToFix fixes={[{
  ...workbench.evidenceFixes[0], evidence: [], sourceAvailable: false,
}]}/>);
assert.ok(missingHtml.includes("Exact source quote unavailable"), "Missing proof is explicit.");
const prioritiesHtml = renderToStaticMarkup(<SmartPriority priorities={workbench.priorities}/>);
assert.ok(["Do First", "Quick Win", "Worth Testing", "Keep As Is"].every(lane => prioritiesHtml.includes(lane)));
assert.ok(!prioritiesHtml.includes("conversion lift") || prioritiesHtml.includes("not predicted conversion lift"));
const copyHtml = renderToStaticMarkup(<BetterCopyStudio opportunities={workbench.copyOpportunities}/>);
assert.ok(copyHtml.includes("Suggested") && copyHtml.includes("My edit") && copyHtml.includes("Copy this version"));
assert.ok(copyHtml.includes("Build clearer websites"));

const front = mapBackendToFrontend(full, "https://example.com", paymentSnapshot);
assert.ok(front.premiumWorkbench?.evidenceFixes.length === 2, "Full-report mapping exposes workbench.");
const freeViaFrontend = redactFrontendDataForFreeTier(front);
assert.equal(freeViaFrontend.premiumWorkbench, undefined, "Redaction removes new workbench from client state.");
const freeViaBackend = mapBackendToFrontend(redactAnalysisForFreeTier(full), "https://example.com", paymentSnapshot);
assert.equal(freeViaBackend.premiumWorkbench, undefined, "Free backend projection cannot regenerate workbench.");
const freeHtml = renderToStaticMarkup(<ResultsScreen analysisData={freeViaFrontend} checkoutEnabled={true}/>);
assert.ok(!freeHtml.includes('id="evidence-to-fix"'));
assert.ok(!freeHtml.includes('id="smart-priority"'));
assert.ok(!freeHtml.includes('id="better-copy-studio"'));
assert.ok(!freeHtml.includes("FABRICATED_UNVERIFIED_MARKETING_CLAIM"));
const paidHtml = renderToStaticMarkup(<ResultsScreen analysisData={front} isUnlocked={true} checkoutEnabled={true}/>);
assert.ok(paidHtml.includes('id="evidence-to-fix"'));
assert.ok(paidHtml.includes('id="smart-priority"'));
assert.ok(paidHtml.includes('id="better-copy-studio"'));
assert.ok(paidHtml.includes("Build clearer websites"));
assert.ok(!paidHtml.includes("FABRICATED_UNVERIFIED_MARKETING_CLAIM"));
console.log("PASS: grounded evidence-to-fix, editable copy studio, honest priority lanes, legacy-safe rendering and premium redaction.");

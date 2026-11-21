"use client";

import React, { useState } from "react";
import { ChevronDown, Check, ShieldCheck } from "lucide-react";
import type { CanonicalReport, CanonicalSignal } from "@/lib/report-adapter";
import type { AnalysisData } from "@/components/ResultsScreen";
import { legacyWorkbench } from "@/components/PremiumActionPlan";
import EvidenceToFix from "@/components/EvidenceToFix";
import SmartPriority from "@/components/SmartPriority";
import BetterCopyStudio from "@/components/BetterCopyStudio";

type CardId = "stranger" | "problems" | "hesitation" | "fixes" | "copy";
type Severity = "red" | "amber" | "green";
const names: Record<CardId, string> = {
  stranger: "The Stranger's View",
  problems: "What's Holding Your Website Back",
  hesitation: "Why Visitors Might Hesitate",
  fixes: "Your Fix-First Action Plan",
  copy: "Better Copy & Rewrites",
};
const cardIds: CardId[] = ["stranger", "problems", "hesitation", "fixes", "copy"];
const meaningful = (text: unknown): text is string => typeof text === "string" && Boolean(text.trim());
function unique(items: unknown[]): string[] {
  const seen = new Set<string>();
  return items.filter(meaningful).map(text => text.trim()).filter(text => {
    const key = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function countText(value: number, singular: string, plural: string) {
  return value === 0 ? "" : `${value} ${value === 1 ? singular : plural}`;
}
function BulletList({ items, empty }: { items: string[]; empty?: string }) {
  const list = unique(items);
  if (!list.length) return empty ? <p className="sl-paid-muted">{empty}</p> : null;
  return <ul className="sl-paid-bullets">{list.map((text, i) => <li key={i}>{text}</li>)}</ul>;
}
function SignalNotes({ signal }: { signal: CanonicalSignal }) {
  return <div className="sl-paid-signal-detail" data-paid-signal={signal.key}>
    <div className="sl-paid-signal-title">
      <strong>{signal.title}</strong><span>{signal.scoreDisplay}</span>
    </div>
    {signal.explanation && <p className="sl-paid-muted">{signal.explanation}</p>}
    {signal.concerns.length > 0 && <>
      <h4>What needs attention</h4>
      <BulletList items={signal.concerns}/>
    </>}
    {signal.positiveFindings.length > 0 && <>
      <h4>What's already clear</h4>
      <BulletList items={signal.positiveFindings}/>
    </>}
    {!signal.explanation && !signal.concerns.length && !signal.positiveFindings.length &&
      <p className="sl-paid-muted">No detailed finding was saved for this area.</p>}
  </div>;
}
function IntroFinding({ title, explanation }: { title: string; explanation: string }) {
  return <li className="sl-paid-finding">
    <strong>{title}</strong>
    <p>{explanation}</p>
  </li>;
}
function RiskList({ items }: { items: NonNullable<AnalysisData["risks"]> }) {
  return <div className="sl-paid-risk-stack">{items.map((risk, i) => (
    <article className="sl-paid-risk" key={`${risk.title}-${i}`}>
      <div className="sl-paid-risk-heading">
        <strong>{risk.title}</strong>
        <span className={`sl-paid-risk-tag sl-paid-risk-tag--${risk.severity}`}>
          {risk.severity === "high" ? "High priority" : risk.severity === "medium" ? "Worth checking" : "Lower priority"}
        </span>
      </div>
      {risk.description && <p>{risk.description}</p>}
      {risk.why_it_matters && <p className="sl-paid-muted">{risk.why_it_matters}</p>}
    </article>
  ))}</div>;
}
function isTrustRisk(risk: NonNullable<AnalysisData["risks"]>[number]): boolean {
  return /trust|credib|proof|review|testimoni|refund|return|policy|policies|privacy|terms|confidence|payment|billing|buying|checkout|security|support/i
    .test(`${risk.category} ${risk.title}`);
}

/** All five panels use only data from the verified, paid report supplied by ResultsScreen. */
export default function PaidReportAccordion({ report, data }: {
  report: CanonicalReport; data: AnalysisData;
}) {
  // A single open card; no paid section starts expanded.
  const [open, setOpen] = useState<CardId | null>(null);
  const workbench = data.premiumWorkbench ?? legacyWorkbench(data.recommendation, data.otherImprovements ?? []);
  const allRisks = Array.isArray(data.risks) ? data.risks.filter(r => meaningful(r?.title)) : [];
  const trustRisks = allRisks.filter(isTrustRisk);
  const otherRisks = allRisks.filter(risk => !isTrustRisk(risk));
  const trust = report.signals.trust;
  const nonTrustSignals = report.signalsList.filter(signal => signal.key !== "trust");
  const concerns = nonTrustSignals.reduce((total, signal) => total + unique(signal.concerns).length, 0) + otherRisks.length;
  const doubts = unique(trust.concerns).length + trustRisks.length +
    (report.purchaseReadiness?.details?.dimensions?.filter(item => item.points < 20).length ?? 0);
  const firstImpressions = report.firstSeconds.understandItems.length + report.firstSeconds.missItems.length;
  const cardSubtitles: Record<CardId, string> = {
    stranger: countText(firstImpressions, "first impression", "first impressions") || "How the page comes across",
    problems: countText(concerns, "area to review", "areas to review") || "What the scan found",
    hesitation: countText(doubts, "possible concern", "possible concerns") || "Trust and visitor confidence",
    fixes: countText(workbench.priorities.filter(p => p.lane !== "keep-as-is").length, "recommended step", "recommended steps") ||
      "What to improve first",
    copy: countText(workbench.copyOpportunities.length + (report.purchaseReadiness?.details?.copyImprovements?.length ?? 0),
      "suggested rewrite", "suggested rewrites") || "Only useful rewrites, no filler",
  };
  const tones: Record<CardId, Severity> = {
    stranger: report.firstSeconds.missItems.length ? "amber" : "green",
    problems: concerns && (nonTrustSignals.some(s => s.score !== null && s.score < 50) ||
      otherRisks.some(r => r.severity === "high")) ? "red" : concerns ? "amber" : "green",
    hesitation: doubts && (trust.score !== null && trust.score < 50 || trustRisks.some(r => r.severity === "high")) ?
      "red" : doubts ? "amber" : "green",
    fixes: "green",
    copy: "green",
  };
  const renderBody = (card: CardId) => {
    switch (card) {
      case "stranger":
        return <div id="strangers-view" className="sl-paid-body-stack">
          <p className="sl-paid-intro">A possible first impression based on what your page actually says.</p>
          <div className="sl-paid-two-col">
            <section className="sl-paid-soft-panel">
              <h4>What visitors may understand</h4>
              {report.firstSeconds.understandItems.length
                ? <ul className="sl-paid-finding-list">{report.firstSeconds.understandItems.map((item,i) =>
                  <IntroFinding key={i} title={item.title} explanation={item.explanation}/>)}</ul>
                : <p className="sl-paid-muted">No specific first-impression strengths were recorded.</p>}
            </section>
            <section className="sl-paid-soft-panel">
              <h4>What visitors may miss</h4>
              {report.firstSeconds.missItems.length
                ? <ul className="sl-paid-finding-list">{report.firstSeconds.missItems.map((item,i) =>
                  <IntroFinding key={i} title={item.title} explanation={item.explanation}/>)}</ul>
                : <p className="sl-paid-muted">No specific first-impression gaps were recorded.</p>}
            </section>
          </div>
          {meaningful(data.visitorThought) && <div className="sl-paid-soft-panel">
            <h4>How a stranger might describe it</h4>
            <p>{data.visitorThought}</p>
            <p className="sl-paid-note">AI interpretation, not a real visitor recording.</p>
          </div>}
        </div>;
      case "problems":
        return <div id="complete-paid-report" className="sl-paid-body-stack">
          <p className="sl-paid-intro">A closer look at what is clear and what could confuse someone visiting for the first time.</p>
          {!!otherRisks.length && <div className="sl-paid-section">
            <h4>Issues worth reviewing</h4>
            <RiskList items={otherRisks}/>
          </div>}
          {nonTrustSignals.map(signal => <SignalNotes key={signal.key} signal={signal}/>)}
          <p className="sl-paid-note">These are possible clarity issues, not measured reasons people leave your site.</p>
        </div>;
      case "hesitation": {
        const purchase = report.purchaseReadiness;
        const details = purchase?.details;
        return <div id="why-visitors-hesitate" className="sl-paid-body-stack">
          <p className="sl-paid-intro">Where people may need more confidence before taking the next step.</p>
          <SignalNotes signal={trust}/>
          {trustRisks.length > 0 && <div className="sl-paid-section">
            <h4>Other possible doubts</h4>
            <RiskList items={trustRisks}/>
          </div>}
          {purchase && <section data-testid="purchase-decision-deep-dive" className="sl-paid-section">
            <h4>Buying confidence <span className="sl-paid-small-score">{purchase.scoreDisplay}</span></h4>
            {meaningful(purchase.summary) && <p className="sl-paid-muted">{purchase.summary}</p>}
            {details?.dimensions?.map(item => <div className="sl-paid-signal-detail" key={item.key}>
              <div className="sl-paid-signal-title"><strong>{item.label}</strong><span>{item.points}/20</span></div>
              <p className="sl-paid-muted">{item.observation}</p>
              {item.evidence.length > 0 && <div className="sl-paid-source">
                <strong>What we found on the website</strong>
                {item.evidence.slice(0,2).map((ev,i)=><p key={i}>“{ev.text}” <small>· {ev.source}</small></p>)}
              </div>}
              {!item.evidence.length && <p className="sl-paid-note">No supporting page text was confirmed for this check. It may still exist elsewhere.</p>}
            </div>)}
            {Boolean(details?.recommendations?.length) && <>
              <h4>How to build more confidence</h4>
              <BulletList items={details!.recommendations}/>
            </>}
            {Boolean(details?.limitations?.length) && <>
              <h4>What we couldn't confirm</h4>
              <BulletList items={details!.limitations}/>
            </>}
          </section>}
          {!trust.concerns.length && !trustRisks.length && !purchase && <p className="sl-paid-note">
            The scan did not record a specific trust concern. That does not confirm every claim or legal requirement.
          </p>}
        </div>;
      }
      case "fixes":
        return <div id="your-improvement-plan" className="sl-paid-body-stack">
          <p className="sl-paid-intro">Start with the most useful changes instead of trying to fix everything at once.</p>
          <SmartPriority priorities={workbench.priorities} compact/>
          <EvidenceToFix fixes={workbench.evidenceFixes} compact/>
          {workbench.evidenceFixes.length === 0 && report.signalsList.some(s => s.recommendations.length) && <div className="sl-paid-section">
            <h4>More changes to consider</h4>
            {report.signalsList.filter(s => s.recommendations.length > 0).map(signal =>
              <div key={signal.key} className="sl-paid-signal-detail">
                <strong>{signal.title}</strong>
                <BulletList items={signal.recommendations}/>
              </div>)}
          </div>}
        </div>;
      case "copy":
        return <div id="rewrite-suggestions" className="sl-paid-body-stack">
          <p className="sl-paid-intro">Use the suggested wording as a starting point. Check that every claim is accurate before publishing.</p>
          <BetterCopyStudio opportunities={workbench.copyOpportunities} compact/>
          {Boolean(report.purchaseReadiness?.details?.copyImprovements?.length) && <div className="sl-paid-section">
            <h4>Make buying buttons clearer</h4>
            {report.purchaseReadiness!.details!.copyImprovements.map((item,i) =>
              <div className="sl-paid-signal-detail" key={i}>
                <p className="sl-paid-note">Current: {item.current}</p>
                <p><strong>Suggested:</strong> {item.suggested}</p>
              </div>)}
          </div>}
        </div>;
    }
  };

  return <section id="full-analysis-unlocked" className="sl-paid-report" aria-labelledby="paid-report-heading">
    <div className="sl-paid-heading">
      <span className="sl-paid-unlocked"><ShieldCheck size={16} aria-hidden="true"/> FULL REPORT UNLOCKED</span>
      <h2 id="paid-report-heading">Your Full Report</h2>
      <p>Tap a card to see your findings. Everything below is included in your purchase.</p>
    </div>
    <div className="sl-paid-card-list">
      {cardIds.map((card,index) => {
        const expanded = open === card;
        const triggerId = `paid-card-trigger-${card}`;
        const panelId = `paid-card-panel-${card}`;
        return <article className={`sl-paid-card sl-paid-card--${tones[card]} ${expanded ? "is-open" : ""}`} key={card}>
          <h3 className="sl-paid-card-head">
            <button id={triggerId} type="button" className="sl-paid-card-trigger"
              aria-expanded={expanded} aria-controls={panelId}
              onClick={() => setOpen(current => current === card ? null : card)}>
              <span className="sl-paid-card-stripe" aria-hidden="true"/>
              <span className="sl-paid-card-label">
                <strong>{names[card]}</strong>
                <span>{cardSubtitles[card]}</span>
              </span>
              <ChevronDown className="sl-paid-card-chevron" size={20} aria-hidden="true"/>
            </button>
          </h3>
          <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!expanded} className="sl-paid-card-content">
            {expanded && renderBody(card)}
          </div>
        </article>;
      })}
    </div>
    <p className="sl-paid-report-footnote"><Check size={14} aria-hidden="true"/> All five sections are included. Open any card to explore its details.</p>
  </section>;
}

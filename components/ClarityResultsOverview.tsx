"use client";
import React, { useState } from "react";
import type { CanonicalReport, CanonicalSignal, CanonicalPurchaseSignal } from "@/lib/report-adapter";
import ClaritySignalTooltip from "@/components/ClaritySignalTooltip";

interface Props {
  report: CanonicalReport;
  isUnlocked: boolean;
  unlockedPurchase?: CanonicalPurchaseSignal;
}
type Band = "strong" | "good" | "review" | "weak" | "unknown";
function bandFor(score: number | null): Band {
  if (score === null || !Number.isFinite(score)) return "unknown";
  if (score >= 80) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "review";
  return "weak";
}
const labels: Record<Band, string> = {
  strong: "Strong", good: "Good", review: "Needs work", weak: "Weak", unknown: "Not checked",
};
// One free sentence grounded in the returned score, not in locked evidence.
// Detailed sources, buyer concerns and exact changes remain paid-only.
const shortLines: Record<string, Record<Band, string>> = {
  firstImpression: {
    strong: "The main message looks easy to understand.",
    good: "Visitors can get the idea, but it could be sharper.",
    review: "Your main message may take longer to understand.",
    weak: "The first message may leave visitors unsure what you do.",
    unknown: "We couldn't check the first impression clearly.",
  },
  audience: {
    strong: "It's easy to see who this website is for.",
    good: "The intended audience is mostly clear.",
    review: "Who this is meant for could stand out more.",
    weak: "Visitors may struggle to tell if this is for them.",
    unknown: "We couldn't check who this website is for.",
  },
  value: {
    strong: "The main benefit comes across clearly.",
    good: "The benefit is understandable, but could stand out more.",
    review: "The value of this offer could be clearer.",
    weak: "What visitors gain may be hard to understand.",
    unknown: "We couldn't check how clearly the value comes across.",
  },
  trust: {
    strong: "The page gives visitors reasons to feel confident.",
    good: "Some reassurance could be easier to notice.",
    review: "A few confidence-building details may need more attention.",
    weak: "Visitors may need clearer reasons to feel confident.",
    unknown: "We couldn't check the page's trust signals clearly.",
  },
  action: {
    strong: "The next step looks easy to find.",
    good: "The next step is there, but could stand out more.",
    review: "The next step could be easier to spot.",
    weak: "Visitors may not know what to do next.",
    unknown: "We couldn't check the next step clearly.",
  },
  purchaseReadiness: {
    strong: "The buying steps look easy to understand.",
    good: "The buying steps are mostly clear.",
    review: "Some buying details could be clearer.",
    weak: "Buyers may need a clearer path to purchase.",
    unknown: "We couldn't check the buying steps clearly.",
  },
};
function overallHeadline(score: number | null): string {
  if (score === null) return "We couldn't score this page clearly.";
  if (score >= 80) return "Your message looks clear at first glance.";
  if (score >= 65) return "Your message could be clearer.";
  return "Your website's first message needs attention.";
}
export default function ClarityResultsOverview({
  report, isUnlocked, unlockedPurchase,
}: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const signals: Array<CanonicalSignal | CanonicalPurchaseSignal> =
    unlockedPurchase ? [...report.signalsList, unlockedPurchase] : report.signalsList;
  const renderTooltip = (signal: CanonicalSignal | CanonicalPurchaseSignal, mode: "mobile" | "desktop") => {
    const id = mode + "-" + signal.id;
    return <ClaritySignalTooltip signalKey={signal.key} name={signal.title}
      isOpen={activeTooltip === id} onOpen={() => setActiveTooltip(id)}
      onClose={() => setActiveTooltip(current => current === id ? null : current)} />;
  };
  return <>
    <section id="report-first-look" className="sl-v7-score sl-v8-overview" aria-labelledby="sl-v7-score-title">
      <div className="sl-v8-score-panel">
        <div className="sl-v8-score-header">
          <div className="sl-v8-score-heading">
            <h1 id="sl-v7-score-title" className="sl-v7-eyebrow">Website Clarity Score</h1>
          </div>
        </div>
        <div className="sl-v8-score-mainline">
          <div className="sl-v7-score-number">
            {report.overallScore === null ? "—" : report.overallScore}<span>/100</span>
          </div>
        </div>
        <p className="sl-v8-score-insight">{overallHeadline(report.overallScore)}</p>
        <p className="sl-v13-domain">{report.domain}</p>
      </div>
    </section>
    <section id="report-clarity-signals" className="sl-v7-breakdown" aria-labelledby="sl-v7-signal-title">
      <div className="sl-v7-section-head">
        <h2 id="sl-v7-signal-title">Your Clarity Signals<span className="sl-v8-period">.</span></h2>
      </div>
      <div className="sl-v7-signal-list">
        {signals.map(signal => {
          const band = bandFor(signal.score);
          const scorePercent = signal.score === null ? 0 : Math.min(100, Math.max(0, signal.score));
          const tone = band === "strong" || band === "good" ? "good" :
            band === "review" ? "caution" : band === "weak" ? "weak" : "neutral";
          const explanation = shortLines[signal.key]?.[band] || "This part needs a closer look.";
          return <article key={signal.key} className="sl-v7-signal-row sl-v11-signal" data-signal={signal.key}>
            <div className="sl-v8-signal-topline">
              <span className="sl-v7-signal-name">
                {signal.title}
                <span className="sl-v8-tooltip-desktop hidden sm:inline-flex">{renderTooltip(signal, "desktop")}</span>
                <span className="sl-v8-tooltip-mobile sm:hidden">{renderTooltip(signal, "mobile")}</span>
              </span>
              <strong className="sl-v8-signal-score">{signal.score === null ? "—/100" : signal.score}</strong>
              <span className={`sl-v7-signal-status sl-v11-badge sl-v11-badge--${band}`}>{labels[band]}</span>
            </div>
            <div className="sl-v7-meter" role="progressbar" aria-label={signal.title + " clarity score"}
              aria-valuemin={0} aria-valuemax={100}
              {...(signal.score === null ? { "aria-valuetext": "Not checked" } : { "aria-valuenow": signal.score })}>
              <span className={"sl-v7-meter-fill sl-v7-meter-" + tone} style={{ width: String(scorePercent) + "%" }}/>
            </div>
            <p className="sl-v11-signal-explanation">{explanation}</p>
            {signal.key === "purchaseReadiness" && unlockedPurchase && (
              <p className="sl-v7-purchase-summary">{unlockedPurchase.summary}</p>
            )}
          </article>;
        })}
      </div>
    </section>
  </>;
}

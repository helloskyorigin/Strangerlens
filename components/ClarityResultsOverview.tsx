"use client";
import React, { useState } from "react";
import { Info } from "lucide-react";
import type { CanonicalReport, CanonicalSignal, CanonicalPurchaseSignal } from "@/lib/report-adapter";
import ClaritySignalTooltip from "@/components/ClaritySignalTooltip";

interface Props {
  report: CanonicalReport;
  isUnlocked: boolean;
  unlockedPurchase?: CanonicalPurchaseSignal;
  onExplainScore: () => void;
}
const questionBySignal: Record<string, string> = {
  firstImpression: "What do visitors notice first?",
  audience: "Is it clear who this is for?",
  value: "Is the benefit easy to understand?",
  trust: "Does the page feel trustworthy?",
  action: "Is the next step obvious?",
};
function statusLabel(value: string): string {
  const result = value.replace(/_/g, " ").trim();
  return result ? result.charAt(0).toUpperCase() + result.slice(1) : "Not available";
}
// The free overview contains only scores and short, non-paid explanations.
export default function ClarityResultsOverview({
  report, isUnlocked, unlockedPurchase, onExplainScore,
}: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const signals: Array<CanonicalSignal | CanonicalPurchaseSignal> =
    unlockedPurchase ? [...report.signalsList, unlockedPurchase] : report.signalsList;
  const available = report.signalsList.filter(s => typeof s.score === "number");
  const weakest = available.length
    ? available.reduce((min, s) => (s.score! < min.score! ? s : min)) : null;
  const overallTone = /^(excellent|good|clear)$/i.test(report.overallStatus.trim()) ? "good"
    : report.overallScore !== null && report.overallScore < 50 ? "weak" : "caution";
  const insight = report.overallScore === null
    ? "There wasn't enough information to give this page a score."
    : weakest && typeof weakest.score === "number" && weakest.score < 80
      ? `Start with ${weakest.title.toLowerCase()} — it's the clearest area to improve.`
      : "Your message looks clear in the areas we checked.";
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
            <p className="sl-v8-result-domain">Results for {report.domain}</p>
            <h1 id="sl-v7-score-title" className="sl-v7-eyebrow">Website Clarity Score</h1>
          </div>
          <button type="button" onClick={onExplainScore} className="sl-v8-scoring-link"
            aria-label="Score details" title="About your clarity score">
            <Info size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="sl-v8-score-mainline">
          <div className="sl-v7-score-number">
            {report.overallScore === null ? "—" : report.overallScore}<span>/100</span>
          </div>
          <span className={"sl-v7-status sl-v7-status--" + overallTone}>
            <span className="sl-v7-status-dot" aria-hidden="true" /> {statusLabel(report.overallStatus)}
          </span>
        </div>
        <p className="sl-v8-score-insight">{insight}</p>
        <p className="sl-v8-score-note">Scores are estimates, not actual sales data.</p>
      </div>
    </section>
    <section id="report-clarity-signals" className="sl-v7-breakdown" aria-labelledby="sl-v7-signal-title">
      <div className="sl-v7-section-head">
        <h2 id="sl-v7-signal-title">Your Clarity Signals<span className="sl-v8-period">.</span></h2>
        <span className="sl-v8-check-count">{isUnlocked && unlockedPurchase ? "5 + buying check" : "5 checks"}</span>
      </div>
      <div className="sl-v7-signal-list">
        {signals.map((signal, index) => {
          const scorePercent = signal.score === null ? 0 : Math.min(100, Math.max(0, signal.score));
          const tone = signal.score === null ? "neutral" : signal.badgeType === "clear" ? "good"
            : signal.badgeType === "amber" ? "caution" : "weak";
          return <article key={signal.key} className="sl-v7-signal-row" data-signal={signal.key}>
            <div className="sl-v8-signal-topline">
              <span className="sl-v8-signal-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="sl-v7-signal-name">
                {signal.title}
                <span className="sl-v8-tooltip-desktop hidden sm:inline-flex">{renderTooltip(signal, "desktop")}</span>
                <span className="sl-v8-tooltip-mobile sm:hidden">{renderTooltip(signal, "mobile")}</span>
              </span>
              <strong className="sl-v8-signal-score">{signal.scoreDisplay}</strong>
            </div>
            <div className="sl-v8-signal-bottom">
              <p className="sl-v8-signal-question">{questionBySignal[signal.key] || "Does buying feel straightforward?"}</p>
              <span className="sl-v7-signal-status">{statusLabel(signal.status)}</span>
            </div>
            <div className="sl-v7-meter" aria-label={signal.title + " " + signal.scoreDisplay}>
              <span className={"sl-v7-meter-fill sl-v7-meter-" + tone} style={{ width: String(scorePercent) + "%" }} />
            </div>
            {signal.key === "purchaseReadiness" && unlockedPurchase && <p className="sl-v7-purchase-summary">
              Separate from the five core scores. {unlockedPurchase.summary}
            </p>}
          </article>;
        })}
      </div>
    </section>
  </>;
}

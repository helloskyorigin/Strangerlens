"use client";

import React, { useState } from "react";
import { ArrowDownRight, ArrowRight, Info, LockKeyhole } from "lucide-react";
import type { CanonicalReport, CanonicalSignal, CanonicalPurchaseSignal } from "@/lib/report-adapter";
import ClaritySignalTooltip from "@/components/ClaritySignalTooltip";

interface Props {
  report: CanonicalReport;
  isUnlocked: boolean;
  showLockedPurchase: boolean;
  unlockedPurchase?: CanonicalPurchaseSignal;
  onExplainScore: () => void;
}

const questionBySignal: Record<string, string> = {
  firstImpression: "What is this?",
  audience: "Is this for me?",
  value: "What's the value?",
  trust: "Can I trust this?",
  action: "What do I do next?",
};

function statusLabel(value: string): string {
  const result = value.replace(/_/g, " ").trim();
  return result ? result.charAt(0).toUpperCase() + result.slice(1) : "Not available";
}

/** Public score summary first, then five signals. Detailed observations,
 * inspected quotes, specific reasons and recommendations are paid-only. */
export default function ClarityResultsOverview({
  report, isUnlocked, showLockedPurchase, unlockedPurchase, onExplainScore,
}: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const signals: Array<CanonicalSignal | CanonicalPurchaseSignal> =
    unlockedPurchase ? [...report.signalsList, unlockedPurchase] : report.signalsList;
  const available = report.signalsList.filter(s => typeof s.score === "number");
  const weakest = available.length
    ? available.reduce((min, s) => (s.score! < min.score! ? s : min)) : null;
  const strongest = available.length
    ? available.reduce((max, s) => (s.score! > max.score! ? s : max)) : null;
  const hasScoreSpread = available.length > 1 && weakest?.score !== strongest?.score;
  const overallTone = /^(excellent|good|clear)$/i.test(report.overallStatus.trim()) ? "good"
    : report.overallScore !== null && report.overallScore < 50 ? "weak" : "caution";

  const renderTooltip = (signal: CanonicalSignal | CanonicalPurchaseSignal, mode: "mobile" | "desktop") => {
    const id = mode + "-" + signal.id;
    return <ClaritySignalTooltip signalKey={signal.key} name={signal.title}
      isOpen={activeTooltip === id} onOpen={() => setActiveTooltip(id)}
      onClose={() => setActiveTooltip(current => current === id ? null : current)} />;
  };

  return <>
    <section className="sl-v7-intro" aria-label="Website report introduction">
      <div className="sl-v8-report-label"><span className="sl-v8-report-dot" /> YOUR OUTSIDE PERSPECTIVE <span className="sl-v8-intro-divider">/</span> REPORT COMPLETE</div>
      <h1>Your website, through <span>fresh eyes.</span></h1>
      <p className="sl-v7-domain">{report.domain} <span aria-hidden="true">·</span> Public website content</p>
    </section>

    <nav className="sl-v8-report-navigation" aria-label="Report sections">
      <a href="#report-first-look"><span>01</span> Score</a>
      <a href="#report-clarity-signals"><span>02</span> Clarity signals</a>
      <a href={isUnlocked ? "#complete-paid-report" : "#complete-report-preview"}>
        <span>03</span> {isUnlocked ? "Full analysis" : "Unlock fixes"}
      </a>
    </nav>

    <section id="report-first-look" className="sl-v7-score sl-v8-overview" aria-labelledby="sl-v7-score-title">
      <div className="sl-v8-score-panel">
        <div className="sl-v8-score-header">
          <h2 id="sl-v7-score-title" className="sl-v7-eyebrow">Website Clarity Score</h2>
          <span className="sl-v8-score-access">{isUnlocked ? "Full report" : "Free result"}</span>
        </div>
        <div className="sl-v8-score-mainline">
          <div className="sl-v7-score-number">{report.overallScore === null ? "—" : report.overallScore}<span>/100</span></div>
          <div className="sl-v8-score-meta">
            <span className={"sl-v7-status sl-v7-status--" + overallTone}>
              <span className="sl-v7-status-dot" aria-hidden="true" /> {statusLabel(report.overallStatus)}
            </span>
            <button type="button" onClick={onExplainScore} className="sl-v8-scoring-link">
              <Info size={15} aria-hidden="true"/> How scoring works
            </button>
          </div>
        </div>
      </div>
      <p className="sl-v8-score-disclaimer">AI assessment of inspected public content, not measured visitor behavior or conversion rates.</p>
    </section>

    <section id="report-clarity-signals" className="sl-v7-breakdown" aria-labelledby="sl-v7-signal-title">
      <div className="sl-v7-section-head">
        <div>
          <p className="sl-v8-section-kicker">FIVE FIRST-IMPRESSION CHECKS</p>
          <h2 id="sl-v7-signal-title">Your Clarity Signals<span className="sl-v8-period">.</span></h2>
        </div>
        <span className="sl-v8-check-count">5 scores</span>
      </div>
      <div className="sl-v7-signal-list">
        {signals.map((signal, index) => {
          const scorePercent = signal.score === null ? 0 : Math.min(100, Math.max(0, signal.score));
          const tone = signal.score === null ? "neutral" : signal.badgeType === "clear" ? "good" :
            signal.badgeType === "amber" ? "caution" : "weak";
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
              <p className="sl-v8-signal-question">{questionBySignal[signal.key] || "Is buying straightforward?"}</p>
              <span className="sl-v7-signal-status">{statusLabel(signal.status)}</span>
            </div>
            <div className="sl-v7-meter" aria-label={signal.title + " " + signal.scoreDisplay}>
              <span className={"sl-v7-meter-fill sl-v7-meter-" + tone} style={{ width: String(scorePercent) + "%" }}/>
            </div>
            {signal.key === "purchaseReadiness" && unlockedPurchase && <p className="sl-v7-purchase-summary">
              Separate from the overall score. {unlockedPurchase.summary}
            </p>}
          </article>;
        })}
        {showLockedPurchase && <div data-testid="purchase-readiness-locked" className="sl-v7-purchase-locked">
          <span className="sl-v7-purchase-icon"><LockKeyhole size={18} aria-hidden="true"/></span>
          <div className="sl-v7-purchase-copy">
            <div className="sl-v7-purchase-heading">
              <strong>Purchase Readiness</strong>
              <ClaritySignalTooltip signalKey="purchaseReadiness" name="Purchase Readiness"
                isOpen={activeTooltip === "locked-purchase"}
                onOpen={() => setActiveTooltip("locked-purchase")}
                onClose={() => setActiveTooltip(current => current === "locked-purchase" ? null : current)}/>
            </div>
            <p>Paid offer detected <span className="sl-v7-premium-label">· Included in Full Analysis</span></p>
          </div>
        </div>}
      </div>
      <div className="sl-v8-summary-strip" aria-label="Lowest-scoring area">
        <div className="sl-v8-summary-cell">
          <span className="sl-v8-summary-icon"><ArrowDownRight size={17} aria-hidden="true"/></span>
          <div>
            <span>LOWEST-SCORING AREA</span>
            <strong>{hasScoreSpread && weakest ? weakest.title : "No single lowest signal"}</strong>
          </div>
        </div>
        <a className="sl-v8-summary-link" href={isUnlocked ? "#complete-paid-report" : "#complete-report-preview"}>
          {isUnlocked ? "See the diagnosis" : "See why & how to fix it"} <ArrowRight size={17} aria-hidden="true"/>
        </a>
      </div>
    </section>
  </>;
}

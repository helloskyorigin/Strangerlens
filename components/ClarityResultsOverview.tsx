"use client";

import React, { useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Eye, Info, LockKeyhole, ScanSearch, Sparkles } from "lucide-react";
import type { CanonicalReport, CanonicalSignal, CanonicalPurchaseSignal } from "@/lib/report-adapter";
import ClaritySignalTooltip from "@/components/ClaritySignalTooltip";

interface Props {
  report: CanonicalReport;
  isUnlocked: boolean;
  showLockedPurchase: boolean;
  unlockedPurchase?: CanonicalPurchaseSignal;
  publicObservation?: string;
  onExplainScore: () => void;
}

const questionBySignal: Record<string, string> = {
  firstImpression: "What is this?",
  audience: "Is it meant for me?",
  value: "Why does it matter?",
  trust: "Can I trust the claims?",
  action: "What should I do next?",
};

function statusLabel(value: string): string {
  const result = value.replace(/_/g, " ").trim();
  return result ? result.charAt(0).toUpperCase() + result.slice(1) : "Not available";
}

/** Only publicly authorized report fields reach this presentation.
 * Never infer detailed paid findings from a free score or create visitor quotes. */
export default function ClarityResultsOverview({
  report, isUnlocked, showLockedPurchase, unlockedPurchase, publicObservation, onExplainScore,
}: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const signals: Array<CanonicalSignal | CanonicalPurchaseSignal> =
    unlockedPurchase ? [...report.signalsList, unlockedPurchase] : report.signalsList;
  const available = report.signalsList.filter(s => typeof s.score === "number");
  const weakest = available.length
    ? available.reduce((min, s) => (s.score! < min.score! ? s : min)) : null;
  const strongest = available.length
    ? available.reduce((max, s) => (s.score! > max.score! ? s : max)) : null;
  const overallTone = /^(excellent|good|clear)$/i.test(report.overallStatus.trim()) ? "good"
    : report.overallScore !== null && report.overallScore < 50 ? "weak" : "caution";
  const observation = typeof publicObservation === "string" ? publicObservation.trim() : "";

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
      <a href="#report-first-look"><span>01</span> First look</a>
      <a href="#report-clarity-signals"><span>02</span> Clarity signals</a>
      <a href={isUnlocked ? "#complete-paid-report" : "#complete-report-preview"}><span>03</span> {isUnlocked ? "Full analysis" : "Next steps"}</a>
    </nav>

    <section id="report-first-look" className="sl-v7-score sl-v8-overview" aria-labelledby="sl-v7-score-title">
      <div className="sl-v8-overview-main">
        <div className="sl-v8-score-panel">
          <span id="sl-v7-score-title" className="sl-v7-eyebrow">Website Clarity Score</span>
          <div className="sl-v7-score-number">{report.overallScore === null ? "—" : report.overallScore}<span>/100</span></div>
          <span className={"sl-v7-status sl-v7-status--" + overallTone}>
            <span className="sl-v7-status-dot" aria-hidden="true" /> {statusLabel(report.overallStatus)}
          </span>
          <button type="button" onClick={onExplainScore} className="sl-v8-scoring-link">
            <Info size={15} aria-hidden="true"/> How scoring works
          </button>
        </div>
        <div className="sl-v8-verdict-panel">
          <span className="sl-v7-eyebrow">THE BIG PICTURE</span>
          <h2>What the page communicates.</h2>
          <p>{report.verdict || "The inspected content was assessed for first-time visitor clarity."}</p>
          {observation && !isUnlocked &&
            <div className="sl-v7-observation">
              <ScanSearch size={18} aria-hidden="true"/>
              <div><strong className="sl-v7-observation-title">What stood out</strong><p>{observation}</p></div>
            </div>}
        </div>
      </div>
      <div className="sl-v8-summary-strip">
        <div className="sl-v8-summary-cell">
          <span className="sl-v8-summary-icon"><ArrowDownRight size={17}/></span>
          <div><span>WORTH A CLOSER LOOK</span>
            <strong>{weakest ? weakest.title : "Not available"}</strong>
            <p>{weakest ? "Lowest of the scored clarity signals" : "No signal score available"}</p>
          </div>
        </div>
        <div className="sl-v8-summary-cell">
          <span className="sl-v8-summary-icon"><CheckCircle2 size={17}/></span>
          <div><span>STRONGEST SIGNAL</span>
            <strong>{strongest ? strongest.title : "Not available"}</strong>
            <p>{strongest ? "Highest of the scored clarity signals" : "No signal score available"}</p>
          </div>
        </div>
        <a href="#report-clarity-signals" className="sl-v8-summary-link">
          Explore your signals <ArrowRight size={17} />
        </a>
      </div>
      <p className="sl-v8-score-disclaimer">Scores reflect an AI assessment of inspected public content, not observed visitor behavior or measured conversion rates.</p>
    </section>

    <section id="report-clarity-signals" className="sl-v7-breakdown" aria-labelledby="sl-v7-signal-title">
      <div className="sl-v7-section-head">
        <div>
          <p className="sl-v8-section-kicker">YOUR WEBSITE, QUESTION BY QUESTION</p>
          <h2 id="sl-v7-signal-title">Your Clarity Signals<span className="sl-v8-period">.</span></h2>
          <p>Five core communication checks{(showLockedPurchase || unlockedPurchase) ? ", plus a separate purchase-readiness assessment when applicable" : ""}.</p>
        </div>
        <span className="sl-v8-check-count">{signals.length + (showLockedPurchase ? 1 : 0)} checks</span>
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
                {renderTooltip(signal, "desktop")}
              </span>
              <strong className="sl-v8-signal-score">{signal.scoreDisplay}</strong>
            </div>
            <p className="sl-v8-signal-question">{questionBySignal[signal.key] || (signal.key === "purchaseReadiness" ? "Is the buying decision clear?" : "How clearly is this communicated?")}</p>
            <div className="sl-v8-signal-bottom">
              <span className="sl-v7-signal-status">{statusLabel(signal.status)}</span>
              <div className="sl-v7-meter" aria-label={signal.title + " " + signal.scoreDisplay}>
                <span className={"sl-v7-meter-fill sl-v7-meter-" + tone} style={{ width: String(scorePercent) + "%" }}/>
              </div>
            </div>
            {signal.key === "purchaseReadiness" && unlockedPurchase && <p className="sl-v7-purchase-summary">
              Separate from Overall Clarity Score · {unlockedPurchase.summary}
            </p>}
          </article>;
        })}
        {showLockedPurchase && <div data-testid="purchase-readiness-locked" className="sl-v7-purchase-locked">
          <span className="sl-v7-purchase-icon"><LockKeyhole size={19} aria-hidden="true"/></span>
          <div className="sl-v7-purchase-copy">
            <div className="sl-v7-purchase-heading"><strong>Purchase Readiness</strong><span className="sl-v7-premium-label">06 / Full Analysis</span></div>
            <p>This website offers paid products or services. The full report includes a separate check of how clearly the buying decision is presented.</p>
            <p className="sl-v7-purchase-detail">Pricing clarity · Buyer confidence · Purchase next steps</p>
          </div>
        </div>}
      </div>
    </section>

    <section className="sl-v8-next-step" aria-label="Report next step">
      <span className="sl-v8-next-icon"><Eye size={19} aria-hidden="true"/></span>
      <div><span className="sl-v8-section-kicker">WHERE TO GO NEXT</span>
        <h2>{isUnlocked ? "Explore your detailed findings." : "Your scores are the starting point."}</h2>
        <p>{isUnlocked
          ? "Review the report chapters below for inspected evidence and practical improvements."
          : "The full report explains the reasons behind the scores, includes page evidence when available, and suggests what to improve."}</p>
      </div>
      <a href={isUnlocked ? "#complete-paid-report" : "#complete-report-preview"}>
        {isUnlocked ? "View full findings" : "See the full report"} <ArrowUpRight size={17} aria-hidden="true"/>
      </a>
    </section>
  </>;
}

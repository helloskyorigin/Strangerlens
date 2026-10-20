"use client";

import React, { useState } from "react";
import { Info, LockKeyhole, ScanSearch } from "lucide-react";
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

/** Score and findings come only from the normalized report. This view does not
 * infer new scores, claim visitor behavior, or receive premium data as a teaser. */
export default function ClarityResultsOverview({
  report, isUnlocked, showLockedPurchase, unlockedPurchase, publicObservation, onExplainScore,
}: Props) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const signals: Array<CanonicalSignal | CanonicalPurchaseSignal> =
    unlockedPurchase ? [...report.signalsList, unlockedPurchase] : report.signalsList;

  const renderTooltip = (signal: CanonicalSignal | CanonicalPurchaseSignal, mode: "mobile" | "desktop") => {
    const id = `${mode}-${signal.id}`;
    return <ClaritySignalTooltip signalKey={signal.key} name={signal.title}
      isOpen={activeTooltip === id} onOpen={() => setActiveTooltip(id)}
      onClose={() => setActiveTooltip(current => current === id ? null : current)} />;
  };
  const statusLabel = (value: string) => {
    const text = value.replace(/_/g, " ").trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Not available";
  };
  const overallTone = /^(excellent|good|clear)$/i.test(report.overallStatus.trim()) ? "good"
    : report.overallScore !== null && report.overallScore < 50 ? "weak" : "caution";
  const observation = typeof publicObservation === "string" && publicObservation.trim()
    ? publicObservation.trim() : "";

  return <>
    <section className="sl-v7-intro" aria-label="Website report introduction">
      <p className="sl-v7-eyebrow">WEBSITE ANALYSIS</p>
      <h1>Your website, through fresh eyes.</h1>
      <p className="sl-v7-domain">{report.domain} <span aria-hidden="true">·</span> Public website content</p>
    </section>

    <section className="sl-v7-score" aria-labelledby="sl-v7-score-title">
      <div className="sl-v7-score-head">
        <div>
          <h2 id="sl-v7-score-title" className="sl-v7-eyebrow">Website Clarity Score</h2>
          <div className="sl-v7-score-number">{report.overallScore === null ? "—" : report.overallScore}
            <span>/100</span>
          </div>
        </div>
        <div className="sl-v7-score-summary">
          <span className={`sl-v7-status sl-v7-status--${overallTone}`}><span className="sl-v7-status-dot" aria-hidden="true"/>
            {statusLabel(report.overallStatus)}
          </span>
          {report.verdict && <p>{report.verdict}</p>}
        </div>
      </div>
      {observation && !isUnlocked && <div className="sl-v7-observation">
        <ScanSearch className="h-4 w-4 shrink-0" aria-hidden="true"/>
        <div>
          <p className="sl-v7-observation-title">What stood out</p>
          <p>{observation}</p>
        </div>
      </div>}
      <div className="sl-v7-score-foot">
        <p>Assessment of inspected public content, not recorded visitor behavior.</p>
        <button type="button" onClick={onExplainScore}>
          <Info className="h-3.5 w-3.5" aria-hidden="true"/> How scoring works
        </button>
      </div>
    </section>

    <section className="sl-v7-breakdown" aria-labelledby="sl-v7-signal-title">
      <div className="sl-v7-section-head">
        <div>
          <h2 id="sl-v7-signal-title">Your Clarity Signals</h2>
          <p>Five core clarity checks{(showLockedPurchase || unlockedPurchase) ? " · Purchase check available" : ""}</p>
        </div>
        <span>{signals.length + (showLockedPurchase ? 1 : 0)} signals</span>
      </div>
      <div className="sl-v7-signal-list">
        {signals.map(signal => {
          const scorePercent = signal.score === null ? 0 : Math.min(100, Math.max(0, signal.score));
          const tone = signal.score === null ? "neutral" : signal.badgeType === "clear" ? "good" :
            signal.badgeType === "amber" ? "caution" : "weak";
          return <div key={signal.key} className="sl-v7-signal-row" data-signal={signal.key}>
            <div className="sl-v7-signal-mobile sm:hidden">
              <div className="sl-v7-signal-top">
                <span className="sl-v7-signal-name">{signal.title}{renderTooltip(signal, "mobile")}</span>
                <strong>{signal.scoreDisplay}</strong>
              </div>
              <div className="sl-v7-signal-sub">
                <span className="sl-v7-signal-status">{statusLabel(signal.status)}</span>
                {signal.key === "purchaseReadiness" && <span>Separate purchase assessment</span>}
              </div>
              <div className="sl-v7-meter" aria-label={`${signal.title} ${signal.scoreDisplay}`}>
                <span className={`sl-v7-meter-fill sl-v7-meter-${tone}`} style={{width:`${scorePercent}%`}}/>
              </div>
            </div>
            <div className="sl-v7-signal-desktop hidden sm:flex">
              <span className="sl-v7-signal-name">{signal.title}{renderTooltip(signal, "desktop")}</span>
              <span className="sl-v7-signal-status">{statusLabel(signal.status)}</span>
              <div className="sl-v7-meter" aria-label={`${signal.title} ${signal.scoreDisplay}`}>
                <span className={`sl-v7-meter-fill sl-v7-meter-${tone}`} style={{width:`${scorePercent}%`}}/>
              </div>
              <strong>{signal.scoreDisplay}</strong>
            </div>
            {signal.key === "purchaseReadiness" && unlockedPurchase && <p className="sl-v7-purchase-summary">
              Separate from Overall Clarity Score · {unlockedPurchase.summary}
            </p>}
          </div>;
        })}
        {showLockedPurchase && <div data-testid="purchase-readiness-locked" className="sl-v7-purchase-locked">
          <div className="sl-v7-purchase-icon"><LockKeyhole className="h-4 w-4" aria-hidden="true"/></div>
          <div className="sl-v7-purchase-copy">
            <div className="sl-v7-purchase-heading">
              <span>Purchase Readiness
                <ClaritySignalTooltip signalKey="purchaseReadiness" name="Purchase Readiness"
                  isOpen={activeTooltip === "purchase-locked"}
                  onOpen={() => setActiveTooltip("purchase-locked")}
                  onClose={() => setActiveTooltip(current => current === "purchase-locked" ? null : current)}/>
              </span>
              <span className="sl-v7-premium-label">Premium · 06</span>
            </div>
            <p>This website offers paid products, subscriptions or services. The detailed purchase-readiness check unlocks with Full Analysis.</p>
            <p className="sl-v7-purchase-detail">Pricing clarity · Buyer confidence · Purchase next steps · Separate from your five-signal score</p>
          </div>
        </div>}
      </div>
    </section>
  </>;
}

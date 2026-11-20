"use client";
import React from "react";
import { ArrowRight, Check, Eye, FileSearch, ListChecks, LockKeyhole, PencilLine, ListOrdered } from "lucide-react";
import type { CanonicalSignal } from "@/lib/report-adapter";
import { canonicalPublicScores, describePublicOpportunity } from "@/lib/upgrade-offer";

interface Props {
  signals: CanonicalSignal[];
  purchaseReadinessApplicable: boolean;
  canCheckout: boolean;
  isTestMode?: boolean;
  busy: boolean;
  onUnlock: () => void;
  onViewExample?: () => void;
}
/** Only public scores and evergreen feature names enter the unpaid offer. */
export default function CompleteReportPreview({
  signals, purchaseReadinessApplicable, canCheckout, isTestMode = false, busy, onUnlock, onViewExample,
}: Props) {
  const opportunity = describePublicOpportunity(canonicalPublicScores(signals));
  const benefits = [
    { title:"Stranger's View", detail:"The first-five-seconds perspective and what a new visitor may miss", Icon:Eye },
    { title:"Five-Signal Diagnosis", detail:"The reasoning behind each signal score", Icon:ListChecks },
    { title:"Evidence-to-Fix", detail:"Inspected page wording and recommended changes where evidence exists", Icon:FileSearch },
    { title:"Smart Priority", detail:"A focused order of improvements worth making first", Icon:ListOrdered },
    { title:"Better Copy Studio", detail:"Get editable copy suggestions you can review and use", Icon:PencilLine },
  ];
  return <section id="complete-report-preview" aria-labelledby="complete-report-title" className="sl-v7-upgrade">
    <div className="sl-v7-upgrade-head">
      <div>
        <p className="sl-v7-upgrade-eyebrow">COMPLETE REPORT</p>
        <h2 id="complete-report-title">Know what to fix. And how.</h2>
      </div>
      <div className="sl-v7-price"><strong>$5</strong><span>one-time</span></div>
    </div>
    <p className="sl-v7-upgrade-intro">You have the scores. Now see the reasons, evidence and improvements behind them.</p>
    <div className="sl-v7-tier-compare" aria-label="Free preview versus complete report">
      <div className="sl-v7-tier-col">
        <span>YOU HAVE · FREE</span>
        <strong>Know where you stand</strong>
        <p>Overall score · Five clarity scores and statuses · Lowest-scoring area</p>
      </div>
      <div className="sl-v7-tier-col sl-v7-tier-paid">
        <span>UNLOCK · $5 ONCE</span>
        <strong>Know exactly what to improve</strong>
        <p>Stranger&apos;s View · Five-Signal Diagnosis · Evidence-to-Fix · Smart Priority · Better Copy Studio {purchaseReadinessApplicable ? "· Purchase Readiness bonus" : ""}</p>
      </div>
    </div>
    <div className="sl-v7-upgrade-reason">
      <p className="sl-v7-reason-heading">{opportunity.heading}</p>
      <p>{opportunity.detail}</p>
      <small><LockKeyhole className="h-3 w-3" aria-hidden="true"/> Detailed findings remain locked until payment.</small>
    </div>
    <div className="sl-v7-upgrade-benefits">
      {benefits.map(({title,detail,Icon}) => <div key={title} className="sl-v7-upgrade-benefit">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true"/>
        <div><p className="sl-v7-benefit-title">{title}</p><p>{detail}</p></div>
      </div>)}
    </div>
    {purchaseReadinessApplicable && <p className="sl-v7-purchase-benefit"><Check className="h-4 w-4" aria-hidden="true"/>
      Purchase Readiness included for this commercial website
    </p>}
    <button type="button" disabled={!canCheckout || busy} onClick={onUnlock} className="sl-v7-upgrade-button">
      <LockKeyhole className="h-4 w-4" aria-hidden="true"/>
      {busy ? "Opening checkout…" : "Unlock Full Analysis — $5"}
      {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true"/>}
    </button>
    <p className="sl-v7-upgrade-assurance">
      {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription · PDF download included after verified payment"}
    </p>
    {onViewExample && <button type="button" onClick={onViewExample} className="sl-v7-example-link">
      See an example report <ArrowRight className="ml-1 inline h-3 w-3" aria-hidden="true"/>
    </button>}
    {!canCheckout && <p role="status" className="sl-v7-upgrade-warning">Checkout is currently unavailable. Your free scores remain available.</p>}
  </section>;
}

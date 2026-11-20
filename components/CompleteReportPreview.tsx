"use client";
import React from "react";
import { ArrowRight, Check, Eye, FileSearch, ListChecks, LockKeyhole, PencilLine, ListOrdered } from "lucide-react";
import type { CanonicalSignal } from "@/lib/report-adapter";

interface Props {
  signals: CanonicalSignal[];
  purchaseReadinessApplicable: boolean;
  canCheckout: boolean;
  isTestMode?: boolean;
  busy: boolean;
  onUnlock: () => void;
  onViewExample?: () => void;
}

/** One compact, specific $9 offer. Never expose the paid report's findings
 * or show an additional free-vs-paid comparison after the scores. */
export default function CompleteReportPreview({
  signals, purchaseReadinessApplicable, canCheckout, isTestMode = false, busy, onUnlock, onViewExample,
}: Props) {
  const benefits = [
    { title: "Stranger's View", value: "See what a first-time visitor may miss in 5 seconds", Icon: Eye },
    { title: "Five-Signal Diagnosis", value: "Understand the reasons behind your scores", Icon: ListChecks },
    { title: "Evidence-to-Fix", value: "Connect inspected page evidence to practical changes", Icon: FileSearch },
    { title: "Smart Priority", value: "Know which improvements deserve attention first", Icon: ListOrdered },
    { title: "Better Copy Studio", value: "Get editable suggestions for clearer website copy", Icon: PencilLine },
  ];
  return <section id="complete-report-preview" aria-labelledby="complete-report-title" className="sl-v7-upgrade sl-v8-compact-upgrade">
    <div className="sl-v7-upgrade-head">
      <div>
        <p className="sl-v7-upgrade-eyebrow">YOUR FULL ANALYSIS</p>
        <h2 id="complete-report-title">Know why. Know what to fix.</h2>
        <p className="sl-v7-upgrade-intro">Turn {signals.length || 5} scores into a focused, evidence-led improvement plan.</p>
      </div>
      <div className="sl-v7-price" aria-label="Nine US dollars, paid once"><strong>$9</strong><span>once</span></div>
    </div>
    <ul className="sl-v8-unlock-list" aria-label="Included in Full Analysis">
      {benefits.map(({ title, value, Icon }) => <li key={title} className="sl-v8-unlock-item">
        <span className="sl-v8-unlock-icon"><Icon size={18} aria-hidden="true"/></span>
        <span className="sl-v8-unlock-copy"><strong>{title}</strong><span>{value}</span></span>
      </li>)}
      {purchaseReadinessApplicable && <li className="sl-v8-unlock-item sl-v8-unlock-bonus">
        <span className="sl-v8-unlock-icon"><Check size={18} aria-hidden="true"/></span>
        <span className="sl-v8-unlock-copy"><strong>Purchase Readiness · bonus</strong><span>Review clarity around the buying decision</span></span>
      </li>}
    </ul>
    <button type="button" disabled={!canCheckout || busy} onClick={onUnlock} className="sl-v7-upgrade-button">
      <LockKeyhole className="h-4 w-4" aria-hidden="true"/>
      {busy ? "Opening checkout…" : "Unlock Full Analysis — $9"}
      {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true"/>}
    </button>
    <p className="sl-v7-upgrade-assurance">
      {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription · Full PDF included"}
    </p>
    {onViewExample && <button type="button" onClick={onViewExample} className="sl-v7-example-link">
      See an example report <ArrowRight className="ml-1 inline h-3 w-3" aria-hidden="true"/>
    </button>}
    {!canCheckout && <p role="status" className="sl-v7-upgrade-warning">Checkout is currently unavailable. Your free scores remain available.</p>}
  </section>;
}

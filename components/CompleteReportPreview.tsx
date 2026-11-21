"use client";
import React from "react";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
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
/** Five practical benefits, one price, one verified-payment entry point. */
export default function CompleteReportPreview({
  purchaseReadinessApplicable, canCheckout, isTestMode = false, busy, onUnlock, onViewExample,
}: Props) {
  const benefits = [
    "See your site through a visitor's eyes",
    "Find what's confusing and why",
    "Know which fixes to make first",
    "Get clearer headlines and button text",
    purchaseReadinessApplicable ? "Check what could make buying difficult" : "Save your full report as a PDF",
  ];
  return <section id="complete-report-preview" aria-labelledby="complete-report-title"
    className="sl-v7-upgrade sl-v8-compact-upgrade sl-simple-upgrade">
    <div className="sl-v7-upgrade-head">
      <div>
        <p className="sl-v7-upgrade-eyebrow">FULL REPORT</p>
        <h2 id="complete-report-title">Know what to fix. And how.</h2>
        <p className="sl-v7-upgrade-intro">Clear answers. Practical changes you can make.</p>
      </div>
      <div className="sl-v7-price" aria-label="Nine US dollars, one-time"><strong>$9</strong><span>once</span></div>
    </div>
    <ul className="sl-v8-unlock-list" aria-label="Included in Full Analysis">
      {benefits.map(benefit => <li key={benefit} className="sl-v8-unlock-item">
        <span className="sl-v8-unlock-icon"><Check size={17} aria-hidden="true" /></span>
        <strong>{benefit}</strong>
      </li>)}
    </ul>
    <button type="button" disabled={!canCheckout || busy} onClick={onUnlock} className="sl-v7-upgrade-button">
      <LockKeyhole className="h-4 w-4" aria-hidden="true" />
      {busy ? "Opening checkout…" : "Unlock Full Analysis — $9"}
      {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </button>
    <p className="sl-v7-upgrade-assurance">
      {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription · Full PDF included"}
    </p>
    {onViewExample && <button type="button" onClick={onViewExample} className="sl-v7-example-link">
      See an example report <ArrowRight className="ml-1 inline h-3 w-3" aria-hidden="true" />
    </button>}
    {!canCheckout && <p role="status" className="sl-v7-upgrade-warning">Checkout is currently unavailable. Your free scores remain available.</p>}
  </section>;
}

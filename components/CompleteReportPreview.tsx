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
const benefits = [
  { title: "See Your Website Through a Stranger's Eyes",
    description: "Discover what first-time visitors may misunderstand or overlook." },
  { title: "Find What's Holding Your Website Back",
    description: "See specific problems, backed by what we found on your site." },
  { title: "Know Why Visitors Might Hesitate",
    description: "Understand possible trust concerns and what could hold people back." },
  { title: "Get Your Fix-First Action Plan",
    description: "Know what to improve first, what to change, and how." },
  { title: "Get Better Words, Ready to Use",
    description: "Clearer headlines, descriptions, and buttons you can copy." },
] as const;
/** One checkout, five understandable benefits, no private analysis shown for free. */
export default function CompleteReportPreview({
  canCheckout, isTestMode = false, busy, onUnlock, onViewExample,
}: Props) {
  return <section id="complete-report-preview" aria-labelledby="complete-report-title"
    className="sl-v7-upgrade sl-v8-compact-upgrade sl-simple-upgrade sl-v11-offer">
    <div className="sl-v7-upgrade-head">
      <div>
        <p className="sl-v7-upgrade-eyebrow">UNLOCK YOUR FULL REPORT</p>
        <h2 id="complete-report-title">You know your scores. Now know exactly what to fix.</h2>
        <p className="sl-v7-upgrade-intro">
          Go beyond the numbers. See what's unclear, why it matters, and how to make your website better.
        </p>
      </div>
      <div className="sl-v7-price" aria-label="Nine US dollars, one-time"><strong>$9</strong><span>one-time</span></div>
    </div>
    <ul className="sl-v8-unlock-list" aria-label="Included in Full Analysis">
      {benefits.map(item => <li key={item.title} className="sl-v8-unlock-item">
        <span className="sl-v8-unlock-icon" aria-hidden="true"><Check size={18}/></span>
        <div className="sl-v11-benefit-copy">
          <strong>{item.title}</strong>
          <p>{item.description}</p>
        </div>
      </li>)}
    </ul>
    <button type="button" disabled={!canCheckout || busy} onClick={onUnlock} className="sl-v7-upgrade-button">
      <LockKeyhole className="h-4 w-4" aria-hidden="true"/>
      <span>{busy ? "Opening checkout…" : "Unlock Full Analysis — $9"}</span>
      {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true"/>}
    </button>
    <p className="sl-v7-upgrade-assurance">
      {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription · Full PDF included"}
    </p>
    {onViewExample && <button type="button" onClick={onViewExample} className="sl-v7-example-link">
      See an example report <ArrowRight className="ml-1 inline h-3 w-3" aria-hidden="true"/>
    </button>}
    {!canCheckout && <p role="status" className="sl-v7-upgrade-warning">
      Checkout is currently unavailable. Your free scores remain available.
    </p>}
  </section>;
}

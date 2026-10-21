"use client";

import React from "react";
import { ArrowUpRight, CheckCircle2, ClipboardList, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import type { PurchaseReadiness } from "@/types/purchase-readiness";

interface Props { details: NonNullable<PurchaseReadiness["details"]> }

/** Only paid, server-returned Purchase Readiness details reach this component.
 * All insight text and quotes come from the saved assessment; no synthetic prices,
 * fabricated objections, unverifiable benefits or conversion predictions. */
export default function PurchaseReadinessDeepDive({ details }: Props) {
  const checked = details.dimensions ?? [];
  const gaps = checked.filter(d => d.points < 20).sort((a,b) => a.points - b.points);
  const clear = checked.filter(d => d.points === 20);
  const label = (points: number) => points >= 20 ? "Clear supporting text" : points >= 10 ? "Partly explained" : "Not identified";
  const next: Record<string,string> = {
    reasons: "Explain what the buyer actually receives and why it matters beside the offer.",
    pricing: "Show the price or quote basis with billing terms near the purchase action.",
    value: "Connect concrete inclusions or deliverables to the intended customer outcome.",
    confidence: "Make applicable support and purchase policies visible. Use only genuine proof.",
    action: "Make the next purchase or quote step explicit; confirm the destination works."
  };

  return <section data-testid="purchase-decision-deep-dive" aria-label="Full buyer decision analysis" className="sl-purchase-deep-dive space-y-5 py-6">
    <div className="sl-purchase-intro">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="sl-purchase-kicker"><Sparkles className="h-4 w-4" aria-hidden="true"/> BUYER DECISION ANALYSIS</p>
        <span className="sl-purchase-count">{checked.length} evidence checks</span>
      </div>
      <h4 className="sl-purchase-heading">Can a visitor confidently decide to pay?</h4>
      <p className="sl-purchase-description">A separate communication assessment of what the public offer makes clear, and which questions a buyer may still have. Each check contributes up to 20 points; this is not a conversion forecast.</p>
      {checked.length>0 && <div className="sl-purchase-summary-grid">
        <div><strong>{clear.length}<small>/{checked.length}</small></strong><span>Clearly supported</span></div>
        <div><strong>{gaps.length}<small>/{checked.length}</small></strong><span>Need a closer look</span></div>
        <div><strong>{checked.reduce((sum,d)=>sum+d.points,0)}<small>/100</small></strong><span>Separate readiness score</span></div>
      </div>}
    </div>

    {checked.length > 0 ? <div className="sl-purchase-dimension-list">
      <div className="sl-purchase-list-head">
        <h4 className="flex items-center gap-2 font-bold"><ClipboardList className="h-4 w-4" aria-hidden="true"/> The five purchase checks</h4>
        <span>0–20 points each</span>
      </div>
      {checked.map((item,index) => <article key={item.key} className="sl-purchase-dimension" data-purchase-dimension={item.key}>
        <div className="sl-purchase-dimension-title">
          <span className="sl-purchase-index">{String(index+1).padStart(2,"0")}</span>
          <div className="min-w-0 flex-1">
            <h5>{item.label}</h5>
            <p>{label(item.points)}</p>
          </div>
          <strong>{item.points}<small>/20</small></strong>
        </div>
        <div className="sl-purchase-track" role="progressbar" aria-label={item.label} aria-valuenow={item.points} aria-valuemin={0} aria-valuemax={20}>
          <span style={{width:`${Math.max(0,Math.min(20,item.points))/20*100}%`}}/>
        </div>
        <p className="sl-purchase-observation">{item.observation}</p>
        {item.evidence.length>0 ? <div className="sl-purchase-evidence">
          <p><FileSearch className="h-3.5 w-3.5" aria-hidden="true"/> Observed Website Evidence</p>
          {item.evidence.slice(0,2).map((ev,i)=><div key={`${ev.source}-${i}`}>
            <blockquote>“{ev.text}”</blockquote>
            <cite>{ev.source === "homepage" ? "Submitted public page" : ev.source}</cite>
          </div>)}
        </div> : <p className="sl-purchase-no-evidence">No supporting text for this check was identified in the accessible content—not proof it is absent everywhere.</p>}
        {item.points<20 && <p className="sl-purchase-direction"><ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true"/><span><strong>Improvement direction:</strong> {next[item.key] ?? "Clarify the offer with accurate, relevant evidence."}</span></p>}
      </article>)}
    </div> : <p className="sl-purchase-no-evidence">The detailed check breakdown was not recorded for this report.</p>}

    {gaps.length>0 && <section className="sl-purchase-priorities" aria-labelledby="purchase-priorities-title">
      <p className="sl-purchase-kicker"><ArrowUpRight className="h-4 w-4" aria-hidden="true"/> START WITH THESE GAPS</p>
      <h4 id="purchase-priorities-title" className="sl-purchase-heading">What to improve first</h4>
      <ol className="sl-purchase-priority-list">
        {gaps.slice(0,3).map((item,i)=><li key={item.key}>
          <span>{i+1}</span>
          <div><strong>{item.label} · {item.points}/20</strong><p>{next[item.key] ?? item.observation}</p></div>
        </li>)}
      </ol>
    </section>}
    {gaps.length===0 && checked.length===5 && <p className="sl-purchase-positive"><CheckCircle2 className="h-4 w-4" aria-hidden="true"/> All five checks have clear supporting text in the inspected content. That does not guarantee purchases or verify the claims.</p>}

    {details.copyImprovements.length>0 && <section className="sl-purchase-copy">
      <p className="sl-purchase-kicker"><Sparkles className="h-4 w-4" aria-hidden="true"/> PURCHASE ACTION COPY</p>
      <h4 className="sl-purchase-heading">Make the next action clearer</h4>
      {details.copyImprovements.map((c,i)=><div key={i} className="sl-purchase-copy-pair">
        <div><span>CURRENT BUTTON</span><p>{c.current}</p></div>
        <div><span>SUGGESTED DIRECTION</span><p>{c.suggested}</p></div>
      </div>)}
      <p className="sl-purchase-disclaimer">Only existing, clearly identified purchase actions receive suggested wording. Check the destination and terms before applying a rewrite.</p>
    </section>}

    {details.recommendations.length>0 && <details className="sl-purchase-details">
      <summary><ShieldCheck className="h-4 w-4" aria-hidden="true"/> All recorded recommendations ({details.recommendations.length})</summary>
      <ol>{details.recommendations.map((r,i)=><li key={i}>{r}</li>)}</ol>
    </details>}
    {details.limitations.length>0 && <details className="sl-purchase-details">
      <summary><FileSearch className="h-4 w-4" aria-hidden="true"/> What this assessment cannot verify</summary>
      <ul>{details.limitations.map((r,i)=><li key={i}>{r}</li>)}</ul>
    </details>}
  </section>;
}

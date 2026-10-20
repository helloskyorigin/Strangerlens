"use client";
import React from "react";
import { ArrowRight, Check, Eye, FileDown, FileSearch, LockKeyhole, PencilLine } from "lucide-react";
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
/** Score-specific preview, never exposing paid findings in the unpaid DOM. */
export default function CompleteReportPreview({
  signals, purchaseReadinessApplicable, canCheckout, isTestMode = false, busy, onUnlock, onViewExample,
}: Props) {
  const opportunity = describePublicOpportunity(canonicalPublicScores(signals));
  const included = [
    { title: "Understand every score", detail: "All five detailed explanations, strengths and clarity gaps", Icon: Eye },
    { title: "Know what to fix first", detail: "Evidence when available, action steps and Smart Priority", Icon: FileSearch },
    { title: "Get usable copy suggestions", detail: "Review, edit and copy recommendations", Icon: PencilLine },
    { title: "Keep your complete report", detail: "PDF export and a practical fix checklist", Icon: FileDown },
  ];
  return <section id="complete-report-preview" aria-labelledby="complete-report-title"
    className="rounded-2xl border border-[#30445F] bg-[#121824] p-5 sm:p-7">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-[.11em] text-blue-400">Your Complete Analysis</span>
        <h2 id="complete-report-title" className="mt-2 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
          Know what to fix. And how.
        </h2>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-2xl font-bold text-white">$3</span>
        <p className="mt-0.5 text-[11px] text-[#94A3B8]">one-time</p>
      </div>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-[#A9BBD3]">
      Your free scores show where your website stands. Full Analysis explains what they mean and gives you a plan for what to improve.
    </p>
    <div className="mt-4 rounded-xl border border-[#354962] bg-[#19283B] p-3.5">
      <p className="text-sm font-semibold text-white">{opportunity.heading}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#B8CADF]">{opportunity.detail}</p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#9CB5D3]">
        <LockKeyhole className="h-3 w-3" aria-hidden="true"/> Detailed findings unlock after payment
      </p>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-x-6">
      {included.map(({ title,detail,Icon })=><div key={title} className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden="true"/>
        <div><p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#A9BBD3]">{detail}</p></div>
      </div>)}
    </div>
    {purchaseReadinessApplicable && <p className="mt-4 inline-flex items-center gap-2 text-xs text-[#A9BBD3]">
      <Check className="h-4 w-4 text-emerald-400" aria-hidden="true"/> Purchase Readiness included for this commercial website
    </p>}
    <button type="button" disabled={!canCheckout || busy} onClick={onUnlock}
      className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50">
      <LockKeyhole className="h-4 w-4" aria-hidden="true"/>
      {busy ? "Opening checkout…" : "Unlock Full Analysis — $3"}
      {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true"/>}
    </button>
    <div className="mt-3 flex flex-col items-center gap-1.5">
      <p className="text-center text-xs text-[#A9BBD3]">
        {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription · Access after verified payment"}
      </p>
      {onViewExample && <button type="button" onClick={onViewExample}
        className="min-h-9 rounded-full px-3 text-xs font-semibold text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        See an example report <ArrowRight className="ml-1 inline h-3 w-3" aria-hidden="true"/>
      </button>}
    </div>
    {!canCheckout && <p className="mt-2 text-center text-xs text-amber-300" role="status">
      Checkout temporarily unavailable. Your free scores remain accessible.
    </p>}
  </section>;
}

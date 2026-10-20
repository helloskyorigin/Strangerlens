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
}
/** Only public scores / evergreen feature names. Premium findings remain gated. */
export default function CompleteReportPreview({
  purchaseReadinessApplicable, canCheckout, isTestMode = false, busy, onUnlock,
}: Props) {
  return <section id="complete-report-preview" aria-labelledby="complete-report-title"
    className="overflow-hidden rounded-2xl border border-[#30445f] bg-[#121824] p-5 sm:p-7">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-[.11em] text-blue-400">Full Analysis</span>
        <h2 id="complete-report-title" className="mt-2 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
          Know exactly what to improve.
        </h2>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-2xl font-bold leading-none text-white">$3</span>
        <p className="mt-1 text-[11px] text-[#94A3B8]">one-time</p>
      </div>
    </div>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A9BBD3]">
      Five detailed signal explanations, evidence-based fixes when available, prioritized improvements,
      editable copy suggestions and a downloadable PDF.
    </p>
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#A9BBD3]">
      <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400"/> Five deep dives</span>
      <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400"/> Evidence &amp; fixes</span>
      <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400"/> Copy Studio &amp; PDF</span>
      {purchaseReadinessApplicable && <span className="inline-flex items-center gap-1.5">
        <Check className="h-3.5 w-3.5 text-emerald-400"/> Purchase Readiness
      </span>}
    </div>
    <button type="button" disabled={!canCheckout || busy} onClick={onUnlock}
      className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50">
      <LockKeyhole className="h-4 w-4" aria-hidden="true"/>
      {busy ? "Opening checkout…" : "Unlock Full Analysis — $3"}
      {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true"/>}
    </button>
    <p className="mt-3 text-center text-xs text-[#94A3B8]">
      {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription"}
    </p>
    {!canCheckout && <p className="mt-2 text-center text-xs text-amber-300" role="status">
      Checkout temporarily unavailable. Your free scores remain accessible.
    </p>}
  </section>;
}

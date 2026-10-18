"use client";
import React from "react";

import { ArrowRight, Check, FileDown, LockKeyhole, Sparkles } from "lucide-react";
import type { CanonicalSignal } from "@/lib/report-adapter";
import { CLARITY_REPORT_CHAPTERS } from "@/lib/clarity-report-chapters";

interface CompleteReportPreviewProps {
  signals: CanonicalSignal[];
  purchaseReadinessApplicable: boolean;
  canCheckout: boolean;
  isTestMode?: boolean;
  busy: boolean;
  onUnlock: () => void;
}

/** Only five PUBLIC scores plus evergreen chapter descriptions.
 * Paid explanations and suggestions are never passed to the free preview. */
export default function CompleteReportPreview({
  signals, purchaseReadinessApplicable, canCheckout, isTestMode = false, busy, onUnlock,
}: CompleteReportPreviewProps) {
  return (
    <section id="complete-report-preview" aria-labelledby="complete-report-title"
      className="overflow-hidden rounded-[24px] border border-[#30445f] bg-[#111b2a] shadow-[0_24px_60px_-38px_rgba(29,98,217,.38)]">
      <div className="relative border-b border-[#293b52] p-5 sm:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-44 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#82B3FF]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Inside Your Full Analysis
          </span>
          <h2 id="complete-report-title" className="mt-3 max-w-2xl text-[24px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">
            You Have the Scores. Now Understand the Whole Picture.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#BBC9DA] sm:text-[15px]">
            Five complete clarity breakdowns — not just a fix for your lowest score.
            Learn what is working, what is unclear, why it matters, and what you can improve across your homepage.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#B5C7DE]">
            <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> All five signal analyses</span>
            <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Evidence &amp; practical guidance</span>
            <span className="inline-flex items-center gap-2"><FileDown className="h-3.5 w-3.5" /> Downloadable full PDF</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-2 sm:px-8">
        {CLARITY_REPORT_CHAPTERS.map((chapter, index) => {
          const publicSignal = signals.find(signal => signal.key === chapter.key);
          return (
            <div key={chapter.key} className="flex items-start gap-3 border-b border-[#26374c] py-4 last:border-b-0 sm:gap-4">
              <span className="mt-0.5 w-6 shrink-0 text-xs font-semibold tabular-nums text-[#7086A4]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-sm font-bold text-[#F1F5F9] sm:text-base">{chapter.title}</h3>
                  {publicSignal && <span className="text-xs font-semibold tabular-nums text-[#8EABCC]">{publicSignal.scoreDisplay}</span>}
                </div>
                <p className="mt-1 text-sm font-medium leading-snug text-[#D6E2F0]">{chapter.question}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#92A7C0]">{chapter.focus}</p>
              </div>
              <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-[#6381A9]" aria-label="Detailed breakdown available in Full Analysis" />
            </div>
          );
        })}
        {purchaseReadinessApplicable && (
          <div className="my-3 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[.07] p-3.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold text-white">Bonus: Purchase Readiness</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#A6B9D0]">
                This website may offer paid products or services. Your full report includes a separate analysis of pricing, buyer hesitation and purchase CTAs when applicable.
              </p>
              <p className="mt-1 text-[11px] text-[#8497AF]">Separate from your overall five-signal score.</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#2A3E58] bg-[#142137] px-5 py-5 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">Your premium implementation workbench</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["Evidence-to-Fix", "Link recommendations to verified page wording when available."],
            ["Smart Priority", "Know what to do first, test next, and preserve."],
            ["Better Copy Studio", "Review, shorten when safe, edit and copy drafts."],
          ].map(([name, description]) => (
            <div key={name} className="rounded-xl border border-[#34506E] bg-[#1B2D45] p-3.5">
              <p className="text-sm font-semibold text-white">{name}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#9FB6D0]">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#30445f] bg-[#152238] px-5 py-5 sm:px-8 sm:py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Unlock the complete report</p>
            <p className="mt-1 text-xs text-[#A4B7CF]">Five deep dives · First 5 Seconds · Priority plan · Copy-ready suggestions</p>
          </div>
          <div className="text-right">
            <span className="text-[27px] font-bold leading-none text-white">$5</span>
            <p className="mt-1 text-[11px] text-[#A4B7CF]">one-time</p>
          </div>
        </div>
        <button type="button" disabled={!canCheckout || busy} onClick={onUnlock}
          className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          {busy ? "Opening checkout…" : "Unlock My Complete Analysis — $5"}
          {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
        <p className="mt-3 text-center text-xs text-[#92A7C0]">
          {isTestMode
            ? "Test Mode — Use Dodo test card to unlock. No real money charged."
            : "One-time payment · Instant access · No subscription · Free scores stay available"}
        </p>
        {!canCheckout && <p role="status" className="mt-2 text-center text-xs text-amber-300">Checkout is temporarily unavailable. Your free report remains available.</p>}
      </div>
    </section>
  );
}

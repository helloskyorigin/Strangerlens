"use client";
import React from "react";
import { ArrowUpRight, CheckCircle2, FileSearch, SearchX } from "lucide-react";
import type { EvidenceFix } from "@/types/premiumWorkbench";
import { CLARITY_REPORT_CHAPTERS } from "@/lib/clarity-report-chapters";

export default function EvidenceToFix({ fixes }: { fixes: EvidenceFix[] }) {
  return (
    <section id="evidence-to-fix" className="space-y-4 scroll-mt-24" aria-labelledby="evidence-to-fix-title">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300">
          <FileSearch className="h-5 w-5" aria-hidden="true"/>
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">01 · Evidence-to-Fix</p>
          <h3 id="evidence-to-fix-title" className="mt-1 text-xl font-bold text-white sm:text-2xl">See what informed each recommendation</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#AFC0D5]">Verified website wording on the left, recommended action beside it. When source evidence is missing, we say so rather than inventing a quote.</p>
        </div>
      </div>
      {!fixes.length && <p className="rounded-xl border border-[#30405A] bg-[#172336] p-5 text-sm text-[#ADC0D6]">No detailed improvements were recorded for this report. The signal explorer still contains your available diagnostic guidance.</p>}
      <div className="space-y-3">
        {fixes.map((fix, index) => {
          const chapter = CLARITY_REPORT_CHAPTERS.find(ch => ch.key === fix.signalKey);
          return (
            <article key={fix.id} className="overflow-hidden rounded-2xl border border-[#30415C] bg-[#121C2B]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2D3D53] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tabular-nums text-[#7996B9]">{String(index + 1).padStart(2,"0")}</span>
                  <span className="text-sm font-bold text-white">{fix.title}</span>
                </div>
                <span className="rounded-full bg-[#1E3047] px-2.5 py-1 text-[11px] text-[#BCD2EE]">{fix.isPrimary ? "Report priority" : chapter?.title || "Cross-signal"}</span>
              </div>
              <div className="grid gap-0 md:grid-cols-2">
                <div className="border-b border-[#2D3D53] px-4 py-4 md:border-b-0 md:border-r sm:px-5">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#96AAC4]">
                    <FileSearch className="h-3.5 w-3.5" aria-hidden="true"/> Observed website evidence
                  </p>
                  {fix.evidence.length ? (
                    <div className="mt-3 space-y-3">
                      {fix.evidence.map((ev, i) => (
                        <div key={i} className="rounded-xl border border-[#31435C] bg-[#1A293B] p-3.5">
                          <p className="break-words text-sm leading-relaxed text-[#E4EDF7]">“{ev.text}”</p>
                          <p className="mt-2 text-[11px] text-[#A8BBD2]">{ev.source}{ev.element ? ` · ${ev.element}` : ""}</p>
                          <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300"><CheckCircle2 className="h-3 w-3"/> Matched inspected content</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-[#41516A] bg-[#182334] p-3.5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-[#D3DFEB]"><SearchX className="h-4 w-4"/> Exact source quote unavailable</p>
                      <p className="mt-2 text-xs leading-relaxed text-[#9DB0C8]">This recommendation is based on the analysis, but a verified matching quote was not attached. Confirm it on your website before applying changes.</p>
                    </div>
                  )}
                </div>
                <div className="px-4 py-4 sm:px-5">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-blue-300">
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true"/> Recommended direction
                  </p>
                  {fix.reason && <p className="mt-3 text-sm leading-relaxed text-[#AFC1D5]">{fix.reason}</p>}
                  {fix.suggestedAction && <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/[.07] p-3.5 text-sm font-medium leading-relaxed text-[#EEF5FF]">{fix.suggestedAction}</div>}
                  <p className="mt-3 text-[11px] text-[#859BB6]">Interpretation and suggestion, not measured visitor behavior or a guaranteed conversion improvement.</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

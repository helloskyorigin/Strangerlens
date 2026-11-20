"use client";
import React from "react";
import { ArrowUpRight, CheckCircle2, FileSearch, SearchX } from "lucide-react";
import type { EvidenceFix } from "@/types/premiumWorkbench";
import { CLARITY_REPORT_CHAPTERS } from "@/lib/clarity-report-chapters";

export default function EvidenceToFix({ fixes }: { fixes: EvidenceFix[] }) {
  return (
    <section id="evidence-to-fix" className="space-y-4 scroll-mt-24" aria-labelledby="evidence-to-fix-title">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#CAE3B9] bg-[#EDF9E0] text-[#578129]">
          <FileSearch className="h-5 w-5" aria-hidden="true"/>
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#578129]">01 · Evidence-to-Fix</p>
          <h3 id="evidence-to-fix-title" className="mt-1 text-xl font-bold text-[#182516] sm:text-2xl">See what informed each recommendation</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64765E]">Verified website wording on the left, recommended action beside it. When source evidence is missing, we say so rather than inventing a quote.</p>
        </div>
      </div>
      {!fixes.length && <p className="rounded-xl border border-[#E2EADD] bg-[#F7FAF3] p-5 text-sm text-[#52664B]">No detailed improvements were recorded for this report. The signal explorer still contains your available diagnostic guidance.</p>}
      <div className="space-y-3">
        {fixes.map((fix, index) => {
          const chapter = CLARITY_REPORT_CHAPTERS.find(ch => ch.key === fix.signalKey);
          return (
            <article key={fix.id} className="overflow-hidden rounded-2xl border border-[#DCE8D5] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2EADD] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tabular-nums text-[#7996B9]">{String(index + 1).padStart(2,"0")}</span>
                  <span className="text-sm font-bold text-[#182516]">{fix.title}</span>
                </div>
                <span className="rounded-full bg-[#EDF6E8] px-2.5 py-1 text-[11px] text-[#4A6E30]">{fix.isPrimary ? "Report priority" : chapter?.title || "Cross-signal"}</span>
              </div>
              <div className="grid gap-0 md:grid-cols-2">
                <div className="border-b border-[#E2EADD] px-4 py-4 md:border-b-0 md:border-r sm:px-5">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#74866F]">
                    <FileSearch className="h-3.5 w-3.5" aria-hidden="true"/> Observed website evidence
                  </p>
                  {fix.evidence.length ? (
                    <div className="mt-3 space-y-3">
                      {fix.evidence.map((ev, i) => (
                        <div key={i} className="rounded-xl border border-[#DCE8D5] bg-[#F7FAF3] p-3.5">
                          <p className="break-words text-sm leading-relaxed text-[#1C2B19]">“{ev.text}”</p>
                          <p className="mt-2 text-[11px] text-[#74866F]">{ev.source}{ev.element ? ` · ${ev.element}` : ""}</p>
                          <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#367A28]"><CheckCircle2 className="h-3 w-3"/> Matched inspected content</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-[#41516A] bg-[#F7FAF3] p-3.5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-[#405837]"><SearchX className="h-4 w-4"/> Exact source quote unavailable</p>
                      <p className="mt-2 text-xs leading-relaxed text-[#74866F]">This recommendation is based on the analysis, but a verified matching quote was not attached. Confirm it on your website before applying changes.</p>
                    </div>
                  )}
                </div>
                <div className="px-4 py-4 sm:px-5">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#578129]">
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true"/> Recommended direction
                  </p>
                  {fix.reason && <p className="mt-3 text-sm leading-relaxed text-[#64765E]">{fix.reason}</p>}
                  {fix.suggestedAction && <div className="mt-3 rounded-xl border border-[#CEE3BA] bg-[#F3FAEC] p-3.5 text-sm font-medium leading-relaxed text-[#1C2B19]">{fix.suggestedAction}</div>}
                  <p className="mt-3 text-[11px] text-[#74866F]">Interpretation and suggestion, not measured visitor behavior or a guaranteed conversion improvement.</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

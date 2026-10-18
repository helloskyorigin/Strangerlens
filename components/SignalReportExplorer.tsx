"use client";

import { useState, type KeyboardEvent } from "react";
import { AlertCircle, ArrowRight, BookOpenText, CheckCircle2, SearchCheck, Wrench } from "lucide-react";
import { CLARITY_REPORT_CHAPTERS } from "@/lib/clarity-report-chapters";
import type { CanonicalPurchaseSignal, CanonicalSignal } from "@/lib/report-adapter";

interface SignalReportExplorerProps {
  signals: CanonicalSignal[];
  purchaseReadiness?: CanonicalPurchaseSignal;
}

function FindingList({ items, empty }: { items: string[]; empty: string }) {
  const visibleItems = items.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (!visibleItems.length) {
    return <p className="text-sm leading-relaxed text-[#9AACBF]">{empty}</p>;
  }
  return <ul className="space-y-2.5">
    {visibleItems.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-[#D0DCE9]">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7D9CC4]" aria-hidden="true" />
        <span className="min-w-0 break-words">{item}</span>
      </li>
    ))}
  </ul>;
}

/** Actual paid report data only; parent must enforce verified paid access. */
export default function SignalReportExplorer({
  signals, purchaseReadiness,
}: SignalReportExplorerProps) {
  const [selectedKey, setSelectedKey] = useState<string>("firstImpression");
  const fullSignals: Array<CanonicalSignal | CanonicalPurchaseSignal> =
    purchaseReadiness ? [...signals, purchaseReadiness] : signals;

  const activeSignal = fullSignals.find(s => s.key === selectedKey) || signals[0];
  if (!activeSignal) return null;
  const chapterIndex = CLARITY_REPORT_CHAPTERS.findIndex(chapter => chapter.key === activeSignal.key);
  const chapter = CLARITY_REPORT_CHAPTERS[chapterIndex];
  const nextIndex = fullSignals.findIndex(s => s.key === activeSignal.key) + 1;
  const nextChapter = nextIndex < fullSignals.length ? fullSignals[nextIndex] : null;
  const activePurchase = activeSignal.key === "purchaseReadiness" ? purchaseReadiness : undefined;
  const purchaseDetails = activePurchase?.details;
  const goodScore = activeSignal.score !== null && activeSignal.score >= 70;

  // Vertical chapter navigation is operable by mouse, touch, Tab, and arrow keys.
  const onChapterKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = fullSignals.length;
    let next = index;
    switch (event.key) {
      case "ArrowDown": next = (index + 1) % count; break;
      case "ArrowUp": next = (index - 1 + count) % count; break;
      case "Home": next = 0; break;
      case "End": next = count - 1; break;
      default: return;
    }
    event.preventDefault();
    setSelectedKey(fullSignals[next].key);
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  };

  return (
    <section id="complete-paid-report" aria-labelledby="complete-paid-report-title" className="space-y-5 sm:space-y-6">
      <div className="rounded-[22px] border border-blue-500/25 bg-gradient-to-br from-[#162741] via-[#111b2c] to-[#121824] p-5 sm:p-7">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300">
          <BookOpenText className="h-4 w-4" aria-hidden="true" /> Your Complete Analysis
        </span>
        <h2 id="complete-paid-report-title" className="mt-3 text-[25px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">
          Five Signals. The Full Story Behind Every Score.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#B9CBDF]">
          Explore each signal to understand what your website communicates well, where clarity could improve,
          and what actions the analysis recommends. Strong signals deserve attention too — not just your lowest score.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#A4C0DC]">
          <span>5 detailed core chapters</span>
          <span>Evidence-aware findings</span>
          <span>Actionable next steps</span>
          {purchaseReadiness && <span>+ Purchase Readiness</span>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(220px,290px)_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Full report chapters" className="rounded-2xl border border-[#2B3950] bg-[#121824] p-2.5 lg:sticky lg:top-24">
          <p className="px-2.5 pb-2.5 pt-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#90A6C2]">Explore all chapters</p>
          <div role="tablist" aria-label="Detailed clarity chapters" aria-orientation="vertical" className="space-y-1.5">
            {fullSignals.map((signal, index) => {
              const isSelected = activeSignal.key === signal.key;
              return (
                <button key={signal.key} type="button" role="tab"
                  id={`chapter-tab-${signal.key}`} aria-controls="chapter-detail-panel"
                  aria-selected={isSelected} tabIndex={isSelected ? 0 : -1}
                  onKeyDown={(event) => onChapterKeyDown(event, index)}
                  onClick={() => setSelectedKey(signal.key)}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${isSelected
                    ? "border-blue-500/40 bg-[#1C3352] text-white"
                    : "border-transparent text-[#C1D0DF] hover:border-[#354A65] hover:bg-[#1B2738]"}`}>
                  <span className={`text-xs font-semibold tabular-nums ${isSelected ? "text-blue-300" : "text-[#6E87A5]"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{signal.title}</span>
                    {signal.key === "purchaseReadiness" &&
                      <span className="block text-[10px] text-[#9AAEC7]">Independent assessment</span>}
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-[#A9C5E5]">{signal.scoreDisplay}</span>
                </button>
              );
            })}
          </div>
          <p className="px-2.5 pb-1 pt-3 text-[11px] leading-relaxed text-[#7F96B1]">
            Choose a chapter to view its own findings and improvements.
          </p>
        </nav>

        <article id="chapter-detail-panel" role="tabpanel" aria-labelledby={`chapter-tab-${activeSignal.key}`}
          className="min-w-0 overflow-hidden rounded-2xl border border-[#2B3950] bg-[#121824]">
          <div className="border-b border-[#2B3950] bg-[#172235] p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#90A9C6]">
              {chapterIndex >= 0 ? `Chapter ${String(chapterIndex + 1).padStart(2, "0")} of 05` : "Bonus chapter · Independent score"}
            </p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-white">{activeSignal.title}</h3>
                <p className="mt-1 text-xs font-medium text-[#B1C7DD]">{activeSignal.status}</p>
              </div>
              <div className="rounded-xl border border-[#3C5068] bg-[#10192A] px-4 py-2 text-xl font-bold tabular-nums text-white">
                {activeSignal.scoreDisplay}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#B9C8DA]">
              {chapter?.question || "How clearly can a visitor evaluate the purchase decision?"}
            </p>
            {chapter && (
              <p className="mt-1 text-xs text-[#889EB7]">{chapter.focus}</p>
            )}
            {goodScore && <p className="mt-3 text-xs font-medium text-emerald-300">
              A stronger score can still reveal ideas worth preserving or refining.
            </p>}
          </div>

          <div className="divide-y divide-[#27364A] px-5 sm:px-6">
            <div className="py-5">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
                <SearchCheck className="h-4 w-4 text-blue-300" aria-hidden="true" /> Why This Score
              </h4>
              <p className="text-sm leading-relaxed text-[#C3D1E0]">
                {activeSignal.explanation || "A detailed explanation was not available in the analyzed content."}
              </p>
            </div>
            <div className="py-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" /> What&apos;s Working
              </h4>
              <FindingList items={activeSignal.positiveFindings}
                empty="No specific strengths were recorded for this signal in the inspected content." />
            </div>
            <div className="py-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden="true" /> What Could Be Clearer
              </h4>
              <FindingList items={activeSignal.concerns}
                empty="No specific clarity gaps were recorded for this signal." />
            </div>
            <div className="py-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Wrench className="h-4 w-4 text-blue-300" aria-hidden="true" /> How to Improve
              </h4>
              <FindingList items={activeSignal.recommendations}
                empty="No additional changes were recommended for this signal in the available analysis." />
            </div>
            {purchaseDetails && (
              <div className="space-y-5 py-5">
                <p className="text-xs leading-relaxed text-[#91A7BE]">Purchase Readiness is separate from the Overall Clarity Score.</p>
                {purchaseDetails.pricingAndValueIssues.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-bold text-white">Pricing and Value Communication</h4>
                    <FindingList items={purchaseDetails.pricingAndValueIssues} empty="No pricing issues recorded." />
                  </div>
                )}
                {purchaseDetails.copyImprovements.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-white">Suggested Purchase CTA Copy</h4>
                    <div className="space-y-3">
                      {purchaseDetails.copyImprovements.map((copy, index) => (
                        <div key={index} className="rounded-xl bg-[#1B2A3E] p-3.5 text-sm">
                          <p className="text-[#94A9C0]">Current: {copy.current}</p>
                          <p className="mt-2 font-semibold text-white">Suggested: {copy.suggested}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {purchaseDetails.evidence.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-white">Observed Website Evidence</h4>
                    {purchaseDetails.evidence.map((ev, index) => (
                      <blockquote key={index} className="mb-3 border-l-2 border-blue-500/40 pl-3 text-sm leading-relaxed text-[#C3D0E0]">
                        <p>“{ev.text}”</p>
                        <cite className="mt-1 block break-all text-xs not-italic text-[#8FA4BC]">{ev.source}</cite>
                      </blockquote>
                    ))}
                  </div>
                )}
                {purchaseDetails.limitations.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-white">Inspection Limitations</h4>
                    <FindingList items={purchaseDetails.limitations} empty="No additional limitations recorded." />
                  </div>
                )}
              </div>
            )}
          </div>

          {nextChapter && (
            <button type="button" onClick={() => setSelectedKey(nextChapter.key)}
              className="flex w-full items-center justify-between gap-3 border-t border-[#2B3950] bg-[#162236] px-5 py-4 text-left text-sm font-semibold text-white hover:bg-[#1C2D45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 sm:px-6">
              <span>Next chapter: {nextChapter.title}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
            </button>
          )}
        </article>
      </div>
      <p className="text-xs leading-relaxed text-[#7F97B2]">
        These findings evaluate accessible website content and first-impression clarity. They are not recordings of actual visitor behavior or measured conversions.
      </p>
    </section>
  );
}

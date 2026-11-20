"use client";

import React, { useState, type KeyboardEvent } from "react";
import { AlertCircle, ArrowRight, BookOpenText, CheckCircle2, SearchCheck, Wrench } from "lucide-react";
import { CLARITY_REPORT_CHAPTERS } from "@/lib/clarity-report-chapters";
import PurchaseReadinessDeepDive from "@/components/PurchaseReadinessDeepDive";
import type { CanonicalPurchaseSignal, CanonicalSignal } from "@/lib/report-adapter";

interface SignalReportExplorerProps {
  signals: CanonicalSignal[];
  purchaseReadiness?: CanonicalPurchaseSignal;
}

function FindingList({ items, empty }: { items: string[]; empty: string }) {
  const visibleItems = items.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (!visibleItems.length) {
    return <p className="text-sm leading-relaxed text-[#667963]">{empty}</p>;
  }
  return <ul className="space-y-2.5">
    {visibleItems.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-[#465B42]">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#85B65B]" aria-hidden="true" />
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

  // The next-chapter action lives after the findings. Bring the new panel
  // into view rather than leaving visitors at the bottom of stale content.
  const moveToNextChapter = () => {
    if (!nextChapter) return;
    setSelectedKey(nextChapter.key);
    window.requestAnimationFrame(() => {
      const panel = document.getElementById("chapter-detail-panel");
      if (!panel) return;
      panel.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
      panel.focus({ preventScroll: true });
    });
  };

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
      <div className="rounded-[22px] border border-[#CAE3B9] bg-[#F4FBEA] p-5 sm:p-7">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#578129]">
          <BookOpenText className="h-4 w-4" aria-hidden="true" /> Your Complete Analysis
        </span>
        <h2 id="complete-paid-report-title" className="mt-3 text-[25px] font-bold leading-tight tracking-tight text-[#182516] sm:text-[30px]">
          Five Signals. The Full Story Behind Every Score.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#667963]">
          Explore each signal to understand what your website communicates well, where clarity could improve,
          and what actions the analysis recommends. Strong signals deserve attention too — not just your lowest score.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#677B5F]">
          <span>5 detailed core chapters</span>
          <span>Evidence-aware findings</span>
          <span>Actionable next steps</span>
          {purchaseReadiness && <span>+ Purchase Readiness</span>}
        </div>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(215px,280px)_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Full report chapters" className="rounded-2xl border border-[#E2EADD] bg-white p-2.5 lg:sticky lg:top-24">
          <p className="px-2.5 pb-2.5 pt-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#7A8D72]">Explore all chapters</p>
          <div role="tablist" aria-label="Detailed clarity chapters" aria-orientation="vertical" className="space-y-1.5">
            {fullSignals.map((signal, index) => {
              const isSelected = activeSignal.key === signal.key;
              return (
                <button key={signal.key} type="button" role="tab"
                  id={`chapter-tab-${signal.key}`} aria-controls="chapter-detail-panel"
                  aria-selected={isSelected} tabIndex={isSelected ? 0 : -1}
                  onKeyDown={(event) => onChapterKeyDown(event, index)}
                  onClick={() => setSelectedKey(signal.key)}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ACB3A] ${isSelected
                    ? "border-[#BDE49A] bg-[#E9F8D7] text-[#182516]"
                    : "border-transparent text-[#52634E] hover:border-[#BDDEA5] hover:bg-[#F2F9EA]"}`}>
                  <span className={`text-xs font-semibold tabular-nums ${isSelected ? "text-[#578129]" : "text-[#809179]"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{signal.title}</span>
                    {signal.key === "purchaseReadiness" &&
                      <span className="block text-[10px] text-[#809179]">Independent assessment</span>}
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-[#405837]">{signal.scoreDisplay}</span>
                </button>
              );
            })}
          </div>
          <p className="px-2.5 pb-1 pt-3 text-[11px] leading-relaxed text-[#809179]">
            Choose a chapter to view its own findings and improvements.
          </p>
        </nav>

        <article id="chapter-detail-panel" role="tabpanel" tabIndex={-1} aria-labelledby={`chapter-tab-${activeSignal.key}`}
          className="min-w-0 overflow-hidden rounded-2xl border border-[#E2EADD] bg-white">
          <div className="border-b border-[#E2EADD] bg-[#F4FAEC] p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#7A8D72]">
              {chapterIndex >= 0 ? `Chapter ${String(chapterIndex + 1).padStart(2, "0")} of 05` : "Bonus chapter · Independent score"}
            </p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-[#182516]">{activeSignal.title}</h3>
                <p className="mt-1 text-xs font-medium text-[#667963]">{activeSignal.status}</p>
              </div>
              <div className="rounded-xl border border-[#DCE8D5] bg-[#EDFADE] px-4 py-2 text-xl font-bold tabular-nums text-[#182516]">
                {activeSignal.scoreDisplay}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#667963]">
              {chapter?.question || "How clearly can a visitor evaluate the purchase decision?"}
            </p>
            {chapter && (
              <p className="mt-1 text-xs text-[#809179]">{chapter.focus}</p>
            )}
            {goodScore && <p className="mt-3 text-xs font-medium text-[#367A28]">
              A stronger score can still reveal ideas worth preserving or refining.
            </p>}
          </div>

          {purchaseDetails
            ? <div className="px-5 sm:px-6"><PurchaseReadinessDeepDive details={purchaseDetails}/></div>
            : (
          <div className="divide-y divide-[#27364A] px-5 sm:px-6">
            <div className="py-5">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#182516]">
                <SearchCheck className="h-4 w-4 text-[#578129]" aria-hidden="true" /> Why This Score
              </h4>
              <p className="text-sm leading-relaxed text-[#52634E]">
                {activeSignal.explanation || "A detailed explanation was not available in the analyzed content."}
              </p>
            </div>
            <div className="py-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#182516]">
                <CheckCircle2 className="h-4 w-4 text-[#367A28]" aria-hidden="true" /> What&apos;s Working
              </h4>
              <FindingList items={activeSignal.positiveFindings}
                empty="No specific strengths were recorded for this signal in the inspected content." />
            </div>
            <div className="py-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#182516]">
                <AlertCircle className="h-4 w-4 text-[#9C7123]" aria-hidden="true" /> What Could Be Clearer
              </h4>
              <FindingList items={activeSignal.concerns}
                empty="No specific clarity gaps were recorded for this signal." />
            </div>
            <div className="py-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#182516]">
                <Wrench className="h-4 w-4 text-[#578129]" aria-hidden="true" /> How to Improve
              </h4>
              <FindingList items={activeSignal.recommendations}
                empty="No additional changes were recommended for this signal in the available analysis." />
            </div>

          </div>

            )}

          {nextChapter && (
            <button type="button" onClick={moveToNextChapter}
              className="flex w-full items-center justify-between gap-3 border-t border-[#E2EADD] bg-[#F1F9E6] px-5 py-4 text-left text-sm font-semibold text-[#182516] hover:bg-[#E8F8D5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8ACB3A] sm:px-6">
              <span>Next chapter: {nextChapter.title}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#578129]" aria-hidden="true" />
            </button>
          )}
        </article>
      </div>
      <p className="text-xs leading-relaxed text-[#809179]">
        These findings evaluate accessible website content and first-impression clarity. They are not recordings of actual visitor behavior or measured conversions.
      </p>
    </section>
  );
}

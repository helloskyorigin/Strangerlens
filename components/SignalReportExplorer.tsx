"use client";

import React, { useState, type KeyboardEvent } from "react";
import { AlertCircle, CheckCircle2, SearchCheck, Wrench } from "lucide-react";
import { CLARITY_REPORT_CHAPTERS } from "@/lib/clarity-report-chapters";
import PurchaseReadinessDeepDive from "@/components/PurchaseReadinessDeepDive";
import type {
  CanonicalPurchaseSignal,
  CanonicalSignal,
  CanonicalSignalKey,
} from "@/lib/report-adapter";

interface SignalReportExplorerProps {
  signals: CanonicalSignal[];
  purchaseReadiness?: CanonicalPurchaseSignal;
  selectedKey?: string;
  onSelectKey?: (key: string) => void;
}

function FindingList({ items, empty }: { items: string[]; empty: string }) {
  const visibleItems = items.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  );
  if (!visibleItems.length) {
    return (
      <p className="text-sm leading-relaxed text-[var(--v8-muted)]">{empty}</p>
    );
  }
  return (
    <ul className="space-y-2">
      {visibleItems.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--v8-secondary)]"
        >
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#85B65B]"
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Actual paid report data only; parent must enforce verified paid access. */
export default function SignalReportExplorer({
  signals,
  purchaseReadiness,
  selectedKey: controlledKey,
  onSelectKey,
}: SignalReportExplorerProps) {
  const [uncontrolledKey, setUncontrolledKey] = useState<string>("firstImpression");
  const fullSignals: Array<CanonicalSignal | CanonicalPurchaseSignal> =
    purchaseReadiness ? [...signals, purchaseReadiness] : signals;

  const currentKey = controlledKey ?? uncontrolledKey;
  const activeSignal =
    fullSignals.find((s) => s.key === currentKey) || signals[0];
  if (!activeSignal) return null;

  const setKey = (key: string) => {
    if (onSelectKey) onSelectKey(key);
    else setUncontrolledKey(key);
  };

  const chapterIndex = CLARITY_REPORT_CHAPTERS.findIndex(
    (chapter) => chapter.key === activeSignal.key
  );
  const chapter = CLARITY_REPORT_CHAPTERS[chapterIndex];
  const activePurchase =
    activeSignal.key === "purchaseReadiness" ? purchaseReadiness : undefined;
  const purchaseDetails = activePurchase?.details;

  const onTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const count = fullSignals.length;
    let next = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setKey(fullSignals[next].key);
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]'
      );
    buttons?.[next]?.focus();
  };

  const nextChapter =
    fullSignals[
      fullSignals.findIndex((s) => s.key === activeSignal.key) + 1
    ] ?? null;

  return (
    <section
      id="complete-paid-report"
      aria-labelledby="complete-paid-report-title"
      className="sl-signal-explorer scroll-mt-24 space-y-4"
    >
      <div className="sl-explorer-head">
        <div>
          <p className="sl-v8-section-kicker">SIGNAL REFERENCE</p>
          <h2 id="complete-paid-report-title" className="sl-unified-title">
            Five Signals. The Full Story Behind Every Score.
          </h2>
          <p className="sl-unified-subtitle">
            Review the reasoning and working strengths behind each score
            {purchaseReadiness ? ", plus your dedicated Purchase Readiness check" : ""}.
          </p>
        </div>
      </div>

      {/* Horizontal Segmented Signal Tabs — Zero Sticky Sidebar */}
      <div
        role="tablist"
        aria-label="Detailed clarity chapters"
        aria-orientation="horizontal"
        className="sl-explorer-tabs"
      >
        {fullSignals.map((signal, index) => {
          const isSelected = activeSignal.key === signal.key;
          const tone =
            signal.score === null
              ? "neutral"
              : signal.badgeType === "clear"
              ? "good"
              : signal.badgeType === "amber"
              ? "caution"
              : "weak";
          return (
            <button
              key={signal.key}
              type="button"
              role="tab"
              id={`chapter-tab-${signal.key}`}
              aria-controls="chapter-detail-panel"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              onClick={() => setKey(signal.key)}
              className={`sl-explorer-tab ${isSelected ? "is-active" : ""}`}
            >
              <span className={`sl-tab-dot sl-tab-dot-${tone}`} aria-hidden="true" />
              <span className="truncate">{signal.title}</span>
              <span className="sl-tab-score tabular-nums">
                {signal.scoreDisplay}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Signal Panel */}
      <article
        id="chapter-detail-panel"
        role="tabpanel"
        tabIndex={-1}
        aria-labelledby={`chapter-tab-${activeSignal.key}`}
        className="sl-explorer-panel"
      >
        <div className="sl-explorer-panel-head">
          <div className="min-w-0">
            <p className="sl-explorer-kicker">
              {chapterIndex >= 0
                ? `Signal ${String(chapterIndex + 1).padStart(2, "0")} of 05`
                : "Independent check · Buying decision"}
            </p>
            <h3 className="mt-1 text-xl font-bold text-[var(--v8-ink)] sm:text-2xl">
              {activeSignal.title}
            </h3>
            <p className="mt-1 text-xs font-medium text-[var(--v8-muted)]">
              {chapter?.question ||
                "How clearly can a visitor evaluate the purchase decision?"}
              {" · "}
              <span>{activeSignal.status}</span>
            </p>
          </div>
          <div className="sl-explorer-score tabular-nums">
            {activeSignal.scoreDisplay}
          </div>
        </div>

        {purchaseDetails ? (
          <div className="px-4 sm:px-6">
            <PurchaseReadinessDeepDive details={purchaseDetails} />
          </div>
        ) : (
          <div className="sl-explorer-sections">
            <div className="sl-explorer-section">
              <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--v8-ink)]">
                <SearchCheck
                  className="h-4 w-4 shrink-0 text-[#608F2D]"
                  aria-hidden="true"
                />
                Why This Score
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-[var(--v8-secondary)]">
                {activeSignal.explanation ||
                  "A detailed explanation was not available in the analyzed content."}
              </p>
            </div>

            <div className="sl-explorer-section">
              <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--v8-ink)]">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-[#16A34A]"
                  aria-hidden="true"
                />
                What&apos;s Working
              </h4>
              <div className="mt-2.5">
                <FindingList
                  items={activeSignal.positiveFindings}
                  empty="No specific strengths were recorded for this signal in the inspected content."
                />
              </div>
            </div>

            <details className="sl-explorer-details">
              <summary className="sl-explorer-details-summary">
                <span>Signal-level gaps &amp; improvement notes</span>
                <span className="sl-explorer-details-count tabular-nums">
                  {activeSignal.concerns.length + activeSignal.recommendations.length} notes
                </span>
              </summary>
              <div className="sl-explorer-details-body">
                <div className="sl-explorer-section">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--v8-ink)]">
                    <AlertCircle
                      className="h-4 w-4 shrink-0 text-[#D97706]"
                      aria-hidden="true"
                    />
                    What Could Be Clearer
                  </h4>
                  <div className="mt-2.5">
                    <FindingList
                      items={activeSignal.concerns}
                      empty="No specific clarity gaps were recorded for this signal."
                    />
                  </div>
                </div>

                <div className="sl-explorer-section">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--v8-ink)]">
                    <Wrench
                      className="h-4 w-4 shrink-0 text-[#608F2D]"
                      aria-hidden="true"
                    />
                    How to Improve
                  </h4>
                  <div className="mt-2.5">
                    <FindingList
                      items={activeSignal.recommendations}
                      empty="No additional changes were recommended for this signal in the available analysis."
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {nextChapter && (
          <button
            type="button"
            onClick={() => setKey(nextChapter.key)}
            className="sl-explorer-next-row"
          >
            <span>Next chapter: {nextChapter.title}</span>
            <span className="text-xs font-semibold tabular-nums text-[var(--v8-muted)]">
              {nextChapter.scoreDisplay} →
            </span>
          </button>
        )}
      </article>
    </section>
  );
}

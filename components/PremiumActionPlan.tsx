"use client";

import { useState } from "react";
import { Check, Clipboard, FileText, ListChecks, Lightbulb, Quote, Sparkles } from "lucide-react";

interface Improvement {
  id?: string;
  title: string;
  description?: string;
  whyItMatters?: string;
  whatToImprove?: string;
  copyableSuggestion?: string;
}
interface PriorityFix {
  title?: string;
  subhead?: string;
  explanation?: string;
  currentDirection?: string;
  strongerDirection?: string;
}
interface ReportEvidence {
  locationTag?: string;
  homepageExcerpt?: string;
  clearFindings?: string[];
  missingFindings?: string[];
}
interface PremiumActionPlanProps {
  recommendation?: PriorityFix;
  otherImprovements?: Improvement[];
  evidence?: ReportEvidence;
  visitorThought?: string;
}
const isMeaningful = (text: unknown): text is string =>
  typeof text === "string" && text.replace(/[“”\s]/g, "").length > 0 &&
  !/\bundefined\b/i.test(text);
const unique = (items: Array<string | undefined>) => [...new Set(items.filter(isMeaningful))];

/** Renders only already-authorized report content passed by ResultsScreen. */
export default function PremiumActionPlan({
  recommendation, otherImprovements = [], evidence, visitorThought,
}: PremiumActionPlanProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const hasPriority = recommendation && (
    isMeaningful(recommendation.subhead) || isMeaningful(recommendation.explanation) ||
    isMeaningful(recommendation.strongerDirection)
  );
  const refinements = otherImprovements.filter((item) => item && isMeaningful(item.title));
  const suggestions = refinements.filter(item => isMeaningful(item.copyableSuggestion));
  const observed = unique([evidence?.homepageExcerpt, ...(evidence?.clearFindings ?? []),
    ...(evidence?.missingFindings ?? [])]);

  const copySuggestion = async (value: string, index: number) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
    } catch {
      // User can still select and copy the visible text manually.
    }
  };

  return (
    <section id="your-improvement-plan" aria-labelledby="improvement-plan-title" className="space-y-5 sm:space-y-6">
      <div className="border-b border-[#28384E] pb-4">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-blue-300">
          <Sparkles className="h-4 w-4" /> Turn insights into changes
        </span>
        <h2 id="improvement-plan-title" className="mt-2 text-2xl font-bold tracking-tight text-white">
          Your Website Improvement Plan
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#AFC1D7]">
          Turn the full signal analysis into a prioritized first move, supporting refinements,
          and suggested wording you can review and adapt to your brand.
        </p>
      </div>

      {hasPriority && (
        <article className="overflow-hidden rounded-2xl border border-[#3A5480] bg-[#16243A]">
          <div className="border-b border-[#344962] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">Recommended first move</p>
            <h3 className="mt-1 text-xl font-bold text-white">{recommendation.subhead || recommendation.title || "Top Priority"}</h3>
            {isMeaningful(recommendation.explanation) &&
              <p className="mt-2 text-sm leading-relaxed text-[#C4D3E4]">{recommendation.explanation}</p>}
          </div>
          {(isMeaningful(recommendation.currentDirection) || isMeaningful(recommendation.strongerDirection)) && (
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {isMeaningful(recommendation.currentDirection) && (
                <div className="rounded-xl border border-[#35465B] bg-[#111B2A] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#91A7C0]">Current wording / direction</p>
                  <p className="mt-2 break-words text-sm leading-relaxed text-[#D9E2EE]">{recommendation.currentDirection}</p>
                </div>
              )}
              {isMeaningful(recommendation.strongerDirection) && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">Suggested direction</p>
                  <p className="mt-2 break-words text-sm leading-relaxed text-white">{recommendation.strongerDirection}</p>
                </div>
              )}
            </div>
          )}
        </article>
      )}

      <div className="rounded-2xl border border-[#2B3B50] bg-[#121824] p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <ListChecks className="h-5 w-5 text-blue-300" /> More Ways to Improve
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-[#91A6C0]">Additional recommendations recorded in this report.</p>
        {refinements.length ? (
          <div className="mt-4 divide-y divide-[#2A394D]">
            {refinements.map((item, index) => (
              <article key={item.id || index} className="flex items-start gap-3 py-4 first:pt-1 last:pb-0">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#354966] bg-[#1B2A3D] text-xs font-bold tabular-nums text-blue-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 space-y-2">
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  {unique([item.description, item.whatToImprove]).map((line, lineIndex) => (
                    <p key={lineIndex} className="text-sm leading-relaxed text-[#C5D1E0]">{line}</p>
                  ))}
                  {isMeaningful(item.whyItMatters) && (
                    <p className="text-xs leading-relaxed text-[#93A7BE]">
                      Why it matters: {item.whyItMatters}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-[#9DACBF]">No additional improvements were recorded beyond the signal-level guidance.</p>}
      </div>

      <div className="rounded-2xl border border-[#2B3B50] bg-[#121824] p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Clipboard className="h-5 w-5 text-blue-300" /> Copy-Ready Improvements
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-[#9DB1C8]">
          Suggested wording from the report. Review it for accuracy before publishing.
        </p>
        {suggestions.length ? (
          <div className="mt-4 space-y-3">
            {suggestions.map((item, index) => (
              <div key={item.id || index} className="rounded-xl border border-[#354963] bg-[#1B293B] p-4">
                <p className="text-xs font-semibold text-[#A9C3E0]">{item.title}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white" style={{ userSelect: "text" }}>
                  {item.copyableSuggestion}
                </p>
                <button type="button" onClick={() => copySuggestion(item.copyableSuggestion!, index)}
                  className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-[#3D5878] px-3.5 text-xs font-semibold text-[#D8E8FF] hover:bg-[#263A55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                  {copiedIndex === index ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                  {copiedIndex === index ? "Copied" : "Copy suggestion"}
                </button>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-[#A1B2C6]">No copy-ready alternatives were included in this report. See the individual signal recommendations above.</p>}
      </div>

      {(observed.length > 0 || isMeaningful(visitorThought)) && (
        <div className="rounded-2xl border border-[#2B3B50] bg-[#121824] p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <FileText className="h-5 w-5 text-blue-300" /> Content Behind the Assessment
          </h3>
          <p className="mt-1 text-xs text-[#91A6C0]">
            {evidence?.locationTag || "Public website content inspected during this scan"}
          </p>
          {observed.length > 0 && (
            <div className="mt-4 space-y-2">
              {observed.map((text, index) => (
                <blockquote key={index} className="border-l-2 border-[#3D5878] pl-3 text-sm leading-relaxed text-[#C0D1E4]">
                  {text}
                </blockquote>
              ))}
            </div>
          )}
          {isMeaningful(visitorThought) && (
            <div className="mt-5 border-t border-[#2B3B50] pt-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#92A9C4]">
                <Quote className="h-3.5 w-3.5" /> Simulated first-time visitor impression
              </p>
              <p className="text-sm leading-relaxed text-[#D1DEEC]">{visitorThought}</p>
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-[#7D91AA]">AI interpretation of accessible page content, not actual user testing.</p>
        </div>
      )}
    </section>
  );
}

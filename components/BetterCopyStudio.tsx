"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardCopy, PencilLine, SlidersHorizontal } from "lucide-react";
import type { CopyOpportunity } from "@/types/premiumWorkbench";

type CopyMode = "recommended" | "concise" | "my-edit";

/** Shortening only drops later complete sentences; it never adds unsourced
 * features, statistics, users or guarantees. Show it only when meaning survives. */
function conciseDraft(value: string): string | null {
  const sentence = value.trim().match(/^(.{28,220}?[.!?])\s+\S/);
  if (!sentence) return null;
  const first = sentence[1].trim();
  return first !== value.trim() && first.length >= 28 ? first : null;
}

export default function BetterCopyStudio({ opportunities }: { opportunities: CopyOpportunity[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState<CopyMode>("recommended");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const selected = opportunities[activeIndex] || opportunities[0];
  const shortened = useMemo(() => selected ? conciseDraft(selected.recommended) : null, [selected]);
  const edited = selected ? (drafts[selected.id] ?? selected.recommended) : "";
  const activeText = !selected ? "" : mode === "concise" && shortened ? shortened
    : mode === "my-edit" ? edited : selected.recommended;

  const copy = async () => {
    if (!selected || !activeText.trim()) return;
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(`${selected.id}:${mode}`);
      setCopyError(false);
    } catch {
      // HTTPS/permission restrictions must never block manual copy.
      setCopyError(true);
    }
  };

  return (
    <section id="better-copy-studio" aria-labelledby="copy-studio-title" className="scroll-mt-24 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300"><PencilLine className="h-5 w-5" aria-hidden="true"/></span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">03 · Better Copy Studio</p>
          <h3 id="copy-studio-title" className="mt-1 text-xl font-bold text-white sm:text-2xl">Turn recommendations into usable words</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#B5C6D8]">
            Compare website wording with suggested copy, use a shorter option when safely available, or edit your own version. Drafts stay in this browser session.
          </p>
        </div>
      </div>
      {!selected ? (
        <div className="rounded-2xl border border-[#35435A] bg-[#172336] p-5 text-sm text-[#BBCBD9]">
          No copy-ready drafts were included in this scan. Use the Evidence-to-Fix recommendations instead; the tool will not invent product claims.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#30415B] bg-[#121B2A]">
          <div className="border-b border-[#2B3A51] p-4 sm:p-5">
            <label htmlFor="studio-select" className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#A3B8D2]">Choose a copy opportunity</label>
            <select id="studio-select" value={selected.id}
              onChange={event => {
                const i = opportunities.findIndex(item => item.id === event.target.value);
                if (i >= 0) { setActiveIndex(i); setMode("recommended"); }
              }}
              className="min-h-11 w-full rounded-xl border border-[#425878] bg-[#1C2B40] px-3 py-2 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-blue-400">
              {opportunities.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            <div className="border-b border-[#2C3C52] p-4 md:border-b-0 md:border-r sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#97AEC9]">Observed wording</p>
              {selected.originalQuote ? (
                <>
                  <blockquote className="mt-3 break-words rounded-xl border border-[#30445C] bg-[#1B293C] p-4 text-sm leading-relaxed text-[#E7EEF8]">“{selected.originalQuote.text}”</blockquote>
                  <p className="mt-2 text-[11px] text-emerald-300">Verified source · {selected.originalQuote.source}</p>
                </>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-[#435470] p-4">
                  <p className="text-sm text-[#B5C4D8]">No verified original wording was attached to this particular rewrite.</p>
                  <p className="mt-2 text-xs text-[#849DB8]">Confirm the relevant page text manually before replacing anything.</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">Draft workspace</p>
              <div role="group" aria-label="Copy draft mode" className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setMode("recommended")} aria-pressed={mode === "recommended"}
                  className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${mode === "recommended" ? "bg-blue-600 text-white" : "border border-[#425878] text-[#C0D0E1] hover:bg-[#273A55]"}`}>Suggested</button>
                {shortened && <button type="button" onClick={() => setMode("concise")} aria-pressed={mode === "concise"}
                  className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${mode === "concise" ? "bg-blue-600 text-white" : "border border-[#425878] text-[#C0D0E1] hover:bg-[#273A55]"}`}>Shorter draft</button>}
                <button type="button" onClick={() => setMode("my-edit")} aria-pressed={mode === "my-edit"}
                  className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${mode === "my-edit" ? "bg-blue-600 text-white" : "border border-[#425878] text-[#C0D0E1] hover:bg-[#273A55]"}`}>My edit</button>
              </div>
              {mode === "my-edit" ? (
                <textarea value={edited} onChange={event => setDrafts(previous => ({...previous, [selected.id]:event.target.value.slice(0,1500)}))}
                  aria-label="Edit suggested copy" rows={5} maxLength={1500}
                  className="mt-3 min-h-32 w-full resize-y rounded-xl border border-[#425878] bg-[#1C2B40] p-3.5 text-sm leading-relaxed text-white outline-none focus:ring-2 focus:ring-blue-400"/>
              ) : (
                <div className="mt-3 min-h-32 whitespace-pre-wrap break-words rounded-xl border border-blue-500/20 bg-blue-500/[.07] p-4 text-sm font-medium leading-relaxed text-[#EFF5FE]" style={{userSelect:"text"}}>
                  {activeText}
                </div>
              )}
              <button type="button" onClick={copy} disabled={!activeText.trim()}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-4 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                {copied === `${selected.id}:${mode}` ? <Check className="h-4 w-4" aria-hidden="true"/> : <ClipboardCopy className="h-4 w-4" aria-hidden="true"/>}
                {copied === `${selected.id}:${mode}` ? "Copied to clipboard" : "Copy this version"}
              </button>
              {copyError && <p role="status" className="mt-2 text-xs text-amber-300">Automatic copying is unavailable. Select the visible text and copy manually.</p>}
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#92A9C0]">
                <SlidersHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true"/> The suggested draft comes from the scan. The shorter draft removes later sentences only; it does not add new claims. Review accuracy, context and audience before publishing.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

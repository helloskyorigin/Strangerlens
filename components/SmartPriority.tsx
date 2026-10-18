"use client";
import { ArrowRight, CheckCircle2, ClipboardList, FlaskConical, Sparkles } from "lucide-react";
import type { PriorityItem, PriorityLane } from "@/types/premiumWorkbench";
import { CLARITY_REPORT_CHAPTERS } from "@/lib/clarity-report-chapters";

const LANES: Array<{ id: PriorityLane; title: string; description: string; accent: string }> = [
  { id: "do-first", title: "Do First", description: "The report's primary recommended change.", accent: "text-blue-300" },
  { id: "quick-win", title: "Quick Win", description: "Potentially small copy changes with source evidence.", accent: "text-emerald-300" },
  { id: "worth-testing", title: "Worth Testing", description: "Review and validate before investing effort.", accent: "text-amber-300" },
  { id: "keep-as-is", title: "Keep As Is", description: "Clear signals worth preserving, not rewriting blindly.", accent: "text-[#B5B5FF]" },
];

export default function SmartPriority({ priorities }: { priorities: PriorityItem[] }) {
  return (
    <section id="smart-priority" aria-labelledby="smart-priority-title" className="scroll-mt-24 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10 text-blue-300">
          <ClipboardList className="h-5 w-5" aria-hidden="true"/>
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300">02 · Smart Priority</p>
          <h3 id="smart-priority-title" className="mt-1 text-xl font-bold text-white sm:text-2xl">Know what to do next</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#AFC0D5]">
            A suggested order based on the report's primary recommendation, wording cues and verified evidence — not predicted conversion lift or a measured effort estimate.
          </p>
        </div>
      </div>
      {priorities.length === 0 && (
        <p className="rounded-xl border border-[#30405A] bg-[#172336] p-4 text-sm text-[#AFC0D5]">No prioritized recommendations were available in this report.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {LANES.map(lane => {
          const items = priorities.filter(item => item.lane === lane.id);
          return <div key={lane.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#30415A] bg-[#131F2D]">
            <div className="flex items-center justify-between border-b border-[#283A51] px-4 py-3.5">
              <h4 className={`text-sm font-bold ${lane.accent}`}>{lane.title}</h4>
              <span className="rounded-full bg-[#223248] px-2.5 py-0.5 text-xs tabular-nums text-[#CAD8E9]">{items.length}</span>
            </div>
            <div className="p-4">
              <p className="mb-3 text-xs leading-relaxed text-[#91A9C4]">{lane.description}</p>
              {items.length ? <div className="space-y-3">
                {items.map(item => {
                  const chapter = CLARITY_REPORT_CHAPTERS.find(ch => ch.key === item.signalKey);
                  return <div key={item.id} className="rounded-xl border border-[#2D435B] bg-[#1A293A] p-3.5">
                    <div className="flex items-start gap-2">
                      {lane.id === "do-first" ? <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true"/> :
                       lane.id === "keep-as-is" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true"/> :
                       lane.id === "worth-testing" ? <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true"/> :
                       <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true"/>}
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold leading-snug text-white">{item.title}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#AFC1D6]">{item.reason}</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#91A7C0]">{item.effortNote}</p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {chapter && <span className="rounded-full border border-[#35516E] px-2 py-1 text-[10px] font-semibold text-blue-200">{chapter.title}</span>}
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${item.evidenceCount ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/20 text-amber-300"}`}>
                            {item.evidenceCount ? `${item.evidenceCount} verified quote${item.evidenceCount === 1 ? "" : "s"}` : "Verify before changing"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>;
                })}
              </div> : <p className="text-xs text-[#8196AF]">No recommendations in this group.</p>}
            </div>
          </div>;
        })}
      </div>
    </section>
  );
}

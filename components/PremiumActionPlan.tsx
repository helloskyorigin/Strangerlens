"use client";
import React from "react";

import { Layers3 } from "lucide-react";
import EvidenceToFix from "@/components/EvidenceToFix";
import BetterCopyStudio from "@/components/BetterCopyStudio";
import SmartPriority from "@/components/SmartPriority";
import type { PremiumWorkbench, EvidenceFix, PriorityItem, CopyOpportunity } from "@/types/premiumWorkbench";

interface LegacyImprovement {
  id?: string;
  title: string;
  description?: string;
  whyItMatters?: string;
  whatToImprove?: string;
  copyableSuggestion?: string;
}
interface LegacyPriority {
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
  workbench?: PremiumWorkbench;
  recommendation?: LegacyPriority;
  otherImprovements?: LegacyImprovement[];
  evidence?: ReportEvidence;
  visitorThought?: string;
  reportId?: string | null;
}
const meaningful = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && !/\bundefined\b/i.test(value);

/** Previous full reports may not contain the new workbench field. Preserve
 * their recommendations, but never manufacture or claim verified quotations. */
function legacyWorkbench(priority?: LegacyPriority, improvements: LegacyImprovement[] = []): PremiumWorkbench {
  const fixes: EvidenceFix[] = [];
  if (priority && (meaningful(priority.subhead) || meaningful(priority.explanation))) {
    fixes.push({
      id: "legacy-primary",
      title: priority.subhead || priority.title || "Primary recommended improvement",
      signalKey: null, reason: priority.explanation || "",
      suggestedAction: priority.strongerDirection || priority.explanation || "",
      evidence: [], sourceAvailable: false, isPrimary: true,
      ...(meaningful(priority.strongerDirection) ? { draftCopy: priority.strongerDirection } : {}),
    });
  }
  improvements.filter(x => x && meaningful(x.title)).forEach((item, index) => {
    fixes.push({
      id: `legacy-${index}`, title: item.title, signalKey: null,
      reason: item.whyItMatters || item.description || "",
      suggestedAction: item.whatToImprove || item.description || "",
      evidence: [], sourceAvailable: false, isPrimary: false,
      ...(meaningful(item.copyableSuggestion) ? { draftCopy: item.copyableSuggestion } : {}),
    });
  });
  const copies: CopyOpportunity[] = fixes
    .filter((fix): fix is EvidenceFix & { draftCopy: string } => meaningful(fix.draftCopy))
    .map((fix): CopyOpportunity => ({
      id: fix.id, label: fix.title, signalKey: fix.signalKey,
      recommended: fix.draftCopy,
      origin: fix.isPrimary ? "priority" : "additional",
    }));
  const priorities: PriorityItem[] = fixes.map(fix => ({
    id: fix.id, title: fix.title, signalKey: null, evidenceCount: 0,
    lane: fix.isPrimary ? "do-first" : "worth-testing",
    reason: fix.reason || fix.suggestedAction,
    effortNote: fix.isPrimary ? "Primary recommendation from the saved report"
      : "Older report: confirm source context before editing",
  }));
  return { evidenceFixes: fixes, copyOpportunities: copies, priorities };
}

export default function PremiumActionPlan({
  workbench, recommendation, otherImprovements = [],
}: PremiumActionPlanProps) {
  const report = workbench || legacyWorkbench(recommendation, otherImprovements);

  return (
    <section id="your-improvement-plan" className="scroll-mt-24 space-y-8 sm:space-y-10" aria-labelledby="improvement-workbench-title">
      <div className="overflow-hidden rounded-2xl border border-[#375577] bg-gradient-to-br from-[#142742] via-[#121D30] to-[#101824] p-5 sm:p-7">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-blue-300">
          <Layers3 className="h-4 w-4" aria-hidden="true"/> THREE TOOLS THAT MAKE THE REPORT USEFUL
        </p>
        <h2 id="improvement-workbench-title" className="mt-3 text-2xl font-bold leading-tight tracking-tight text-white sm:text-[30px]">
          What to fix. Why it matters. What to say.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#B7C9DD]">
          Review source-backed findings, work from a clear priority order, and write a better version. Three focused tools, not a wall of features.
        </p>
        <nav aria-label="Implementation workbench sections" className="mt-4 flex flex-wrap gap-2">
          <a href="#evidence-to-fix" className="rounded-full border border-[#415D82] bg-[#1D3351] px-3 py-2 text-xs font-semibold text-[#D2E6FF] hover:bg-[#284668]">Evidence-to-Fix</a>
          <a href="#smart-priority" className="rounded-full border border-[#415D82] bg-[#1D3351] px-3 py-2 text-xs font-semibold text-[#D2E6FF] hover:bg-[#284668]">Smart Priority</a>
          <a href="#better-copy-studio" className="rounded-full border border-[#415D82] bg-[#1D3351] px-3 py-2 text-xs font-semibold text-[#D2E6FF] hover:bg-[#284668]">Better Copy Studio</a>
        </nav>
      </div>

      <EvidenceToFix fixes={report.evidenceFixes}/>
      <SmartPriority priorities={report.priorities}/>
      <BetterCopyStudio opportunities={report.copyOpportunities}/>

    </section>
  );
}

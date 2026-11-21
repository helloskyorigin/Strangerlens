"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  FileSearch,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { CLARITY_REPORT_CHAPTERS } from "@/lib/clarity-report-chapters";
import type {
  CanonicalSignal,
  CanonicalSignalKey,
} from "@/lib/report-adapter";
import type {
  EvidenceFix,
  PremiumWorkbench,
  PriorityItem,
  PriorityLane,
} from "@/types/premiumWorkbench";

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

interface RiskItem {
  category: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  why_it_matters: string;
}

export interface UnifiedFindingsPlanProps {
  workbench?: PremiumWorkbench;
  recommendation?: LegacyPriority;
  otherImprovements?: LegacyImprovement[];
  risks?: RiskItem[];
  signals?: CanonicalSignal[];
  activeSignalFilter?: CanonicalSignalKey | "all";
  onClearSignalFilter?: () => void;
}

type CopyMode = "recommended" | "concise" | "my-edit";
type SeverityLevel = "high" | "medium" | "low";
type LaneFilter = "all" | "do-first" | "quick-win" | "worth-testing";

export interface UnifiedFinding {
  id: string;
  title: string;
  signalKey: CanonicalSignalKey | null;
  signalLabel: string;
  lane: PriorityLane;
  severity: SeverityLevel;
  severityLabel: string;
  priorityLabel: string;
  concern: string;
  recommendedFix: string;
  evidence: EvidenceFix["evidence"];
  sourceAvailable: boolean;
  draftCopy?: string;
  verificationNote: string;
}

const meaningful = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && !/\bundefined\b/i.test(value);

function normalizeTitle(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function mapCategoryToSignalKey(category?: string): CanonicalSignalKey | null {
  const lower = (category || "").toLowerCase();
  if (lower.includes("first") || lower.includes("impression")) return "firstImpression";
  if (lower.includes("audience")) return "audience";
  if (lower.includes("value")) return "value";
  if (lower.includes("trust")) return "trust";
  if (lower.includes("action") || lower.includes("cta")) return "action";
  return null;
}

/** Only remove a trailing generic "learn more" invitation. */
function conciseDraft(value: string): string | null {
  const sentence = value.trim().match(/^(.{28,220}?[.!?])\s+(.+)$/);
  if (!sentence) return null;
  const first = sentence[1].trim();
  const trailing = sentence[2].trim();
  if (
    !/^(?:learn more|find out more|read more|explore more|discover more|get started today)[.!?]?$/i.test(
      trailing
    )
  ) {
    return null;
  }
  return first;
}

function legacyWorkbench(
  priority?: LegacyPriority,
  improvements: LegacyImprovement[] = []
): PremiumWorkbench {
  const fixes: EvidenceFix[] = [];
  if (priority && (meaningful(priority.subhead) || meaningful(priority.explanation))) {
    fixes.push({
      id: "legacy-primary",
      title: priority.subhead || priority.title || "Primary recommended improvement",
      signalKey: null,
      reason: priority.explanation || "",
      suggestedAction: priority.strongerDirection || priority.explanation || "",
      evidence: [],
      sourceAvailable: false,
      isPrimary: true,
      ...(meaningful(priority.strongerDirection)
        ? { draftCopy: priority.strongerDirection }
        : {}),
    });
  }
  improvements
    .filter((x) => x && meaningful(x.title))
    .forEach((item, index) => {
      fixes.push({
        id: `legacy-${index}`,
        title: item.title,
        signalKey: null,
        reason: item.whyItMatters || item.description || "",
        suggestedAction: item.whatToImprove || item.description || "",
        evidence: [],
        sourceAvailable: false,
        isPrimary: false,
        ...(meaningful(item.copyableSuggestion)
          ? { draftCopy: item.copyableSuggestion }
          : {}),
      });
    });

  const priorities: PriorityItem[] = fixes.map((fix) => ({
    id: fix.id,
    title: fix.title,
    signalKey: null,
    evidenceCount: 0,
    lane: fix.isPrimary ? "do-first" : "worth-testing",
    reason: fix.reason || fix.suggestedAction,
    effortNote: fix.isPrimary
      ? "Primary recommendation from the saved report"
      : "Confirm source context before editing",
  }));

  return { evidenceFixes: fixes, copyOpportunities: [], priorities };
}

function buildVerificationNote(
  evidence: EvidenceFix["evidence"],
  signalLabel: string
): string {
  if (evidence.length > 0) {
    const first = evidence[0];
    const source = first.source || "your website";
    const elementNote = first.element ? ` (${first.element})` : "";
    return `Locate the quoted wording in ${source}${elementNote}, review surrounding context on desktop and mobile, and publish only what reflects your real offering.`;
  }
  return `No exact source quote was attached for this item. Inspect the ${signalLabel.toLowerCase()} section on your live desktop and mobile views before making changes.`;
}

export function buildUnifiedFindings({
  workbench,
  recommendation,
  otherImprovements = [],
  risks = [],
  signals = [],
}: Pick<
  UnifiedFindingsPlanProps,
  "workbench" | "recommendation" | "otherImprovements" | "risks" | "signals"
>): {
  findings: UnifiedFinding[];
  keepAsIs: PriorityItem[];
} {
  const sourceWorkbench =
    workbench || legacyWorkbench(recommendation, otherImprovements);
  const priorityById = new Map<string, PriorityItem>();
  for (const item of sourceWorkbench.priorities || []) {
    priorityById.set(item.id, item);
  }
  const copyById = new Map<string, string>();
  for (const op of sourceWorkbench.copyOpportunities || []) {
    if (meaningful(op.recommended)) copyById.set(op.id, op.recommended);
  }

  const seenTitles = new Set<string>();
  const rawFindings: UnifiedFinding[] = [];

  for (const fix of sourceWorkbench.evidenceFixes || []) {
    if (!fix || !meaningful(fix.title)) continue;
    const norm = normalizeTitle(fix.title);
    seenTitles.add(norm);

    const pItem = priorityById.get(fix.id);
    const lane: PriorityLane =
      pItem?.lane || (fix.isPrimary ? "do-first" : "worth-testing");
    const chapter = CLARITY_REPORT_CHAPTERS.find((c) => c.key === fix.signalKey);
    const matchingSignal = signals.find((s) => s.key === fix.signalKey);
    const signalLabel = chapter?.title || "Cross-signal";

    const isCritical =
      lane === "do-first" ||
      fix.isPrimary ||
      (matchingSignal?.score !== null &&
        matchingSignal?.score !== undefined &&
        matchingSignal.score < 50);

    const severity: SeverityLevel = isCritical ? "high" : "medium";
    const severityLabel = isCritical ? "High priority" : "Needs attention";
    const priorityLabel =
      lane === "do-first"
        ? "Do first"
        : lane === "quick-win"
        ? "Quick win"
        : "Worth testing";

    const draft =
      (meaningful(fix.draftCopy) ? fix.draftCopy : undefined) ||
      copyById.get(fix.id);

    rawFindings.push({
      id: fix.id,
      title: fix.title,
      signalKey: fix.signalKey,
      signalLabel,
      lane,
      severity,
      severityLabel,
      priorityLabel,
      concern: fix.reason || pItem?.reason || "",
      recommendedFix: fix.suggestedAction || fix.reason || "",
      evidence: fix.evidence || [],
      sourceAvailable: Boolean(fix.sourceAvailable && fix.evidence?.length),
      draftCopy: draft,
      verificationNote: buildVerificationNote(fix.evidence || [], signalLabel),
    });
  }

  // Include distinct high/medium risks not already represented by an evidenceFix
  risks.forEach((risk, idx) => {
    if (!risk || !meaningful(risk.title)) return;
    const norm = normalizeTitle(risk.title);
    const alreadyCovered = Array.from(seenTitles).some(
      (t) => t === norm || t.includes(norm) || norm.includes(t)
    );
    if (alreadyCovered) return;
    seenTitles.add(norm);

    const signalKey = mapCategoryToSignalKey(risk.category);
    const chapter = CLARITY_REPORT_CHAPTERS.find((c) => c.key === signalKey);
    const signalLabel = chapter?.title || "Page clarity";
    const isHigh = risk.severity === "high";

    rawFindings.push({
      id: `risk-${idx}`,
      title: risk.title,
      signalKey,
      signalLabel,
      lane: isHigh ? "do-first" : "worth-testing",
      severity: risk.severity || "medium",
      severityLabel: isHigh ? "High priority" : "Needs attention",
      priorityLabel: isHigh ? "Do first" : "Worth testing",
      concern: risk.why_it_matters || risk.description || "",
      recommendedFix: risk.description || risk.why_it_matters || "",
      evidence: [],
      sourceAvailable: false,
      verificationNote: buildVerificationNote([], signalLabel),
    });
  });

  // Sort strictly by priority: do-first -> quick-win -> worth-testing
  const laneOrder: Record<PriorityLane, number> = {
    "do-first": 0,
    "quick-win": 1,
    "worth-testing": 2,
    "keep-as-is": 3,
  };
  rawFindings.sort((a, b) => laneOrder[a.lane] - laneOrder[b.lane]);

  const keepAsIs = (sourceWorkbench.priorities || []).filter(
    (p) => p.lane === "keep-as-is"
  );

  return { findings: rawFindings, keepAsIs };
}

export default function UnifiedFindingsPlan({
  workbench,
  recommendation,
  otherImprovements = [],
  risks = [],
  signals = [],
  activeSignalFilter = "all",
  onClearSignalFilter,
}: UnifiedFindingsPlanProps) {
  const { findings, keepAsIs } = useMemo(
    () =>
      buildUnifiedFindings({
        workbench,
        recommendation,
        otherImprovements,
        risks,
        signals,
      }),
    [workbench, recommendation, otherImprovements, risks, signals]
  );

  const [laneFilter, setLaneFilter] = useState<LaneFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copyModes, setCopyModes] = useState<Record<string, CopyMode>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyErrorId, setCopyErrorId] = useState<string | null>(null);
  const [showStrengths, setShowStrengths] = useState(false);

  const filteredFindings = useMemo(() => {
    return findings.filter((item) => {
      if (
        activeSignalFilter !== "all" &&
        item.signalKey !== activeSignalFilter
      ) {
        return false;
      }
      if (laneFilter !== "all" && item.lane !== laneFilter) {
        return false;
      }
      return true;
    });
  }, [findings, activeSignalFilter, laneFilter]);

  const counts = useMemo(
    () => ({
      all: findings.length,
      "do-first": findings.filter((f) => f.lane === "do-first").length,
      "quick-win": findings.filter((f) => f.lane === "quick-win").length,
      "worth-testing": findings.filter((f) => f.lane === "worth-testing")
        .length,
    }),
    [findings]
  );

  const isExpanded = (id: string, index: number) =>
    id in expandedIds ? expandedIds[id] : index === 0;

  const toggleExpand = (id: string, index: number) => {
    const currentlyOpen = isExpanded(id, index);
    setExpandedIds((prev) => ({ ...prev, [id]: !currentlyOpen }));
  };

  const allExpanded =
    filteredFindings.length > 0 &&
    filteredFindings.every((f, idx) => isExpanded(f.id, idx));

  const toggleAll = () => {
    const target = !allExpanded;
    const next: Record<string, boolean> = { ...expandedIds };
    for (const f of filteredFindings) next[f.id] = target;
    setExpandedIds(next);
  };

  const copyText = async (id: string, text: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(`${id}:${text}`);
      setCopyErrorId(null);
      window.setTimeout(() => {
        setCopiedKey((current) =>
          current === `${id}:${text}` ? null : current
        );
      }, 2400);
    } catch {
      setCopyErrorId(id);
    }
  };

  const activeSignalTitle =
    activeSignalFilter !== "all"
      ? CLARITY_REPORT_CHAPTERS.find((c) => c.key === activeSignalFilter)
          ?.title || activeSignalFilter
      : null;

  return (
    <section
      id="your-improvement-plan"
      aria-labelledby="improvement-workbench-title"
      className="sl-unified-plan scroll-mt-24 space-y-5"
    >
      <div className="sl-unified-head">
        <div>
          <p className="sl-v8-section-kicker">PRIORITIZED SOLUTIONS</p>
          <h2 id="improvement-workbench-title" className="sl-unified-title">
            What to fix, why it matters, and what to say
          </h2>
          <p className="sl-unified-subtitle">
            Each issue is grouped with its observed evidence, potential buyer concern, recommended fix, copy draft, and verification steps.
          </p>
        </div>
        {filteredFindings.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="sl-unified-expand-all"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      {(findings.length > 0 || activeSignalTitle) && (
        <div className="sl-unified-filters" aria-label="Filter findings">
          <div className="sl-unified-filter-tabs" role="group" aria-label="Priority filter">
            {(
              [
                ["all", `All (${counts.all})`],
                ["do-first", `Do first (${counts["do-first"]})`],
                ["quick-win", `Quick wins (${counts["quick-win"]})`],
                ["worth-testing", `Worth testing (${counts["worth-testing"]})`],
              ] as Array<[LaneFilter, string]>
            )
              .filter(([key]) => key === "all" || counts[key] > 0)
              .map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={laneFilter === key}
                  onClick={() => setLaneFilter(key)}
                  className={`sl-filter-tab ${
                    laneFilter === key ? "is-active" : ""
                  }`}
                >
                  {label}
                </button>
              ))}
          </div>

          {activeSignalTitle && onClearSignalFilter && (
            <button
              type="button"
              onClick={onClearSignalFilter}
              className="sl-signal-filter-reset"
            >
              Signal: {activeSignalTitle} · Show all
            </button>
          )}
        </div>
      )}

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="sl-unified-empty">
          <CheckCircle2 className="h-5 w-5 text-[#16A34A] shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-[var(--v8-ink)]">
              {activeSignalTitle || laneFilter !== "all"
                ? "No issues match the selected filter."
                : "No priority clarity blockers were recorded in this report."}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--v8-secondary)]">
              {activeSignalTitle || laneFilter !== "all"
                ? "Reset the filter or review the full signal breakdown below."
                : "Review the signal-by-signal breakdown below to see what is working well and any optional refinements."}
            </p>
            {(activeSignalTitle || laneFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setLaneFilter("all");
                  onClearSignalFilter?.();
                }}
                className="sl-finding-toggle mt-2.5 underline underline-offset-4"
              >
                Show all findings
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding, index) => {
            const open = isExpanded(finding.id, index);
            const mode = copyModes[finding.id] || "recommended";
            const shortened = finding.draftCopy
              ? conciseDraft(finding.draftCopy)
              : null;
            const editedText =
              customDrafts[finding.id] ?? finding.draftCopy ?? "";
            const activeCopy = !finding.draftCopy
              ? ""
              : mode === "concise" && shortened
              ? shortened
              : mode === "my-edit"
              ? editedText
              : finding.draftCopy;
            const isCopied = copiedKey === `${finding.id}:${activeCopy}`;

            return (
              <article
                key={finding.id}
                className={`sl-finding-card ${open ? "is-open" : ""}`}
                data-finding-lane={finding.lane}
              >
                <div className="sl-finding-main">
                  {/* Unboxed Typographic Meta Row */}
                  <div className="sl-finding-meta">
                    <span
                      className={`sl-severity-tag sl-severity-${finding.severity}`}
                    >
                      {finding.severity === "high" ? (
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{finding.priorityLabel}</span>
                    </span>
                    <span className="sl-meta-sep" aria-hidden="true">·</span>
                    <span className="sl-finding-signal">{finding.signalLabel}</span>
                    <span className="sl-meta-sep" aria-hidden="true">·</span>
                    <span
                      className={`sl-evidence-status ${
                        finding.sourceAvailable ? "is-verified" : "is-missing"
                      }`}
                    >
                      {finding.sourceAvailable
                        ? "Verified page quote"
                        : "Verify on live site"}
                    </span>
                  </div>

                  {/* Problem Title */}
                  <h3 className="sl-finding-title">{finding.title}</h3>

                  {/* Primary Recommended Fix (always visible) */}
                  <p className="sl-finding-fix">{finding.recommendedFix}</p>

                  {/* Compact Quick-Copy Strip when collapsed and copy suggestion exists */}
                  {!open && finding.draftCopy && (
                    <div className="sl-finding-quick-copy">
                      <div className="min-w-0 flex-1">
                        <span className="sl-quick-copy-label">Suggested copy:</span>{" "}
                        <span className="sl-quick-copy-text">
                          “{finding.draftCopy}”
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(finding.id, finding.draftCopy!)}
                        className="sl-quick-copy-btn"
                      >
                        {copiedKey === `${finding.id}:${finding.draftCopy}` ? (
                          <>
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Copied
                          </>
                        ) : (
                          <>
                            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Toggle Button */}
                  <div className="sl-finding-actions-row">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`finding-details-${finding.id}`}
                      onClick={() => toggleExpand(finding.id, index)}
                      className="sl-finding-toggle"
                    >
                      <span>
                        {open
                          ? "Hide evidence & copy details"
                          : finding.draftCopy
                          ? "Evidence, buyer concern & edit copy"
                          : "Evidence, buyer concern & verification"}
                      </span>
                      {open ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progressive Disclosure Details */}
                {open && (
                  <div
                    id={`finding-details-${finding.id}`}
                    className="sl-finding-drawer"
                  >
                    {/* 1. Observed Evidence */}
                    <div className="sl-drawer-block">
                      <h4 className="sl-drawer-heading">
                        <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                        Observed evidence
                      </h4>
                      {finding.evidence.length > 0 ? (
                        <div className="mt-2.5 space-y-2.5">
                          {finding.evidence.map((ev, i) => (
                            <div key={i} className="sl-evidence-quote">
                              <blockquote className="break-words text-sm leading-relaxed">
                                “{ev.text}”
                              </blockquote>
                              <p className="mt-1.5 text-[11px] text-[var(--v8-muted)]">
                                {ev.source}
                                {ev.element ? ` · ${ev.element}` : ""}
                                <span aria-hidden="true"> · </span>
                                <span className="sl-evidence-status is-verified">
                                  Matched inspected content
                                </span>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="sl-evidence-unavailable mt-2">
                          <p className="flex items-center gap-1.5 text-xs font-semibold">
                            <SearchX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            Exact source quote unavailable
                          </p>
                          <p className="mt-1 text-xs leading-relaxed">
                            This finding is based on overall page analysis, not a single attached quote. Check your live page section before updating wording.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 2. Potential Buyer Concern */}
                    {finding.concern && (
                      <div className="sl-drawer-block">
                        <h4 className="sl-drawer-heading">Potential buyer concern</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-[var(--v8-secondary)]">
                          {finding.concern}
                        </p>
                      </div>
                    )}

                    {/* 3. Inline Copy-Ready Suggestion & Editor */}
                    {finding.draftCopy && (
                      <div className="sl-drawer-block">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="sl-drawer-heading">
                            Copy-ready suggestion
                          </h4>
                          <div
                            role="group"
                            aria-label={`Copy draft mode for ${finding.title}`}
                            className="flex flex-wrap gap-1.5"
                          >
                            <button
                              type="button"
                              aria-pressed={mode === "recommended"}
                              onClick={() =>
                                setCopyModes((p) => ({
                                  ...p,
                                  [finding.id]: "recommended",
                                }))
                              }
                              className={`sl-copy-mode-btn ${
                                mode === "recommended" ? "is-active" : ""
                              }`}
                            >
                              Suggested
                            </button>
                            {shortened && (
                              <button
                                type="button"
                                aria-pressed={mode === "concise"}
                                onClick={() =>
                                  setCopyModes((p) => ({
                                    ...p,
                                    [finding.id]: "concise",
                                  }))
                                }
                                className={`sl-copy-mode-btn ${
                                  mode === "concise" ? "is-active" : ""
                                }`}
                              >
                                Shorter draft
                              </button>
                            )}
                            <button
                              type="button"
                              aria-pressed={mode === "my-edit"}
                              onClick={() =>
                                setCopyModes((p) => ({
                                  ...p,
                                  [finding.id]: "my-edit",
                                }))
                              }
                              className={`sl-copy-mode-btn ${
                                mode === "my-edit" ? "is-active" : ""
                              }`}
                            >
                              My edit
                            </button>
                          </div>
                        </div>

                        {mode === "my-edit" ? (
                          <textarea
                            value={editedText}
                            onChange={(e) =>
                              setCustomDrafts((prev) => ({
                                ...prev,
                                [finding.id]: e.target.value.slice(0, 1500),
                              }))
                            }
                            aria-label={`Edit suggested copy for ${finding.title}`}
                            rows={3}
                            maxLength={1500}
                            className="sl-copy-textarea mt-2.5"
                          />
                        ) : (
                          <div
                            className="sl-copy-preview mt-2.5"
                            style={{ userSelect: "text" }}
                          >
                            {activeCopy}
                          </div>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={!activeCopy.trim()}
                            onClick={() => copyText(finding.id, activeCopy)}
                            className="sl-copy-primary-btn"
                          >
                            {isCopied ? (
                              <Check className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
                            )}
                            <span>
                              {isCopied ? "Copied to clipboard" : "Copy this version"}
                            </span>
                          </button>
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--v8-muted)]">
                            <SlidersHorizontal className="h-3 w-3 shrink-0" aria-hidden="true" />
                            Review accuracy before publishing.
                          </span>
                        </div>
                        {copyErrorId === finding.id && (
                          <p role="status" className="sl-signal-tone-caution mt-2 text-xs font-medium">
                            Automatic copying is unavailable. Select the visible text above and copy manually.
                          </p>
                        )}
                      </div>
                    )}

                    {/* 4. Verification Instructions */}
                    <div className="sl-drawer-block">
                      <h4 className="sl-drawer-heading">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Verification instructions
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--v8-secondary)]">
                        {finding.verificationNote}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Keep As Is — Verified Clear Strengths (collapsed cleanly by default unless 0 issues) */}
      {keepAsIs.length > 0 && (
        <div className="sl-keep-asis-wrap">
          <button
            type="button"
            aria-expanded={showStrengths || findings.length === 0}
            onClick={() => setShowStrengths((prev) => !prev)}
            className="sl-keep-asis-trigger"
          >
            <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--v8-ink)]">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A]" aria-hidden="true" />
              Keep as is · {keepAsIs.length} strong{" "}
              {keepAsIs.length === 1 ? "message" : "messages"} verified
            </span>
            {showStrengths || findings.length === 0 ? (
              <ChevronUp className="h-4 w-4 text-[var(--v8-muted)]" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--v8-muted)]" aria-hidden="true" />
            )}
          </button>
          {(showStrengths || findings.length === 0) && (
            <div className="sl-keep-asis-list">
              {keepAsIs.map((item) => (
                <div key={item.id} className="sl-keep-asis-item">
                  <p className="text-sm font-semibold text-[var(--v8-ink)]">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--v8-secondary)]">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

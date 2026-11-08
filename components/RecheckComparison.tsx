"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, ArrowUpRight } from "lucide-react";

export interface ScoreSummary {
  reportId: string;
  domain: string;
  overall: number;
  date?: string;
  signals?: Record<string, number>;
}

export interface ScoreDiff {
  total: number;
  signals?: Record<string, number>;
}

export function summarizeScores(report: any, reportId: string): ScoreSummary | null {
  if (!report || !reportId) return null;
  const domain = report.domain || (report.url ? new URL(report.url).hostname : "example.com");
  const overall = typeof report.overallScore === "number" ? report.overallScore : (report.clarityScore ?? 50);
  return {
    reportId,
    domain,
    overall,
    date: new Date().toISOString(),
  };
}

export function compareScores(prev: ScoreSummary, curr: ScoreSummary): ScoreDiff | null {
  if (!prev || !curr) return null;
  if (prev.reportId === curr.reportId) return null;
  if (prev.domain !== curr.domain) return null;
  return {
    total: curr.overall - prev.overall,
  };
}

function readSnapshots(): Record<string, ScoreSummary> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("strangerlens_score_snapshots");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function RecheckComparison({
  report,
  reportId,
  onRecheck,
}: {
  report: any;
  reportId?: string | null;
  onRecheck?: () => void;
}) {
  const current = reportId ? summarizeScores(report, reportId) : null;
  const [ready, setReady] = useState(false);
  const [comparison, setComparison] = useState<ScoreDiff | null>(null);

  useEffect(() => {
    if (!current) {
      queueMicrotask(() => setReady(true));
      return;
    }
    try {
      const all = readSnapshots();
      const existing = all[current.domain];
      if (existing && existing.reportId !== current.reportId) {
        queueMicrotask(() => setComparison(compareScores(existing, current)));
      }
      all[current.domain] = current;
      try {
        window.localStorage.setItem("strangerlens_score_snapshots", JSON.stringify(all));
      } catch {
        /* storage full or private browsing */
      }
    } catch {
      /* ignore */
    }
    queueMicrotask(() => setReady(true));
  }, [reportId, current]);

  return (
    <section
      className="rounded-2xl border border-[#2D415B] bg-[#121D2E] p-4 sm:p-6 sl-recheck-section"
      aria-labelledby="recheck-title"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 id="recheck-title" className="text-lg font-bold text-white">
            Recheck &amp; Compare
          </h2>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Compare changes against previous runs. Snapshots are saved privately on this device.
          </p>
        </div>
        {onRecheck && (
          <button
            type="button"
            onClick={onRecheck}
            className="inline-flex items-center gap-2 rounded-full bg-[#246BFD] hover:bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recheck website</span>
          </button>
        )}
      </div>
      {comparison && (
        <div className="mt-4 pt-3 border-t border-[#263044] text-xs text-[#CBD5E1] flex items-center gap-1.5">
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          <span>
            Score change: {comparison.total > 0 ? `+${comparison.total}` : comparison.total} points
          </span>
        </div>
      )}
    </section>
  );
}

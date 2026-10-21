"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ResultsScreen from "@/components/ResultsScreen";
import ReportsHeader from "@/components/ReportsHeader";
import { downloadPurchasedReport, fetchPurchasedReport } from "@/lib/report-history";

type PaidReport = Awaited<ReturnType<typeof fetchPurchasedReport>>;

export default function PurchasedReport({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<PaidReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    // Never render a locally restored paid flag or stale report while verifying.
    setReport(null);
    setError(null);
    try {
      const result = await fetchPurchasedReport(reportId, controller.signal);
      if (!controller.signal.aborted) setReport(result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Your report could not be loaded. Please try again.");
    }
  }, [reportId]);

  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => { if (mounted) void load(); });
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === `sl_report_access_v1:${reportId}`) void load();
    };
    window.addEventListener("focus", load);
    window.addEventListener("pageshow", visible);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("storage", storage);
    return () => {
      mounted = false;
      request.current?.abort();
      window.removeEventListener("focus", load);
      window.removeEventListener("pageshow", visible);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("storage", storage);
    };
  }, [load, reportId]);

  if (report) return <ResultsScreen rawUrl={report.normalizedUrl} analysisData={report.data} isUnlocked={true}
    onDownloadPdf={async () => {
      try { await downloadPurchasedReport(reportId); }
      catch (cause) { void load(); throw cause; }
    }}
    onBackToLanding={() => router.push("/")} onRunNewCheck={() => router.push("/")} />;

  return <div className="sl-app-theme min-h-screen bg-[#090D15] text-[#F1F5F9]">
    <ReportsHeader />
    <main className="mx-auto max-w-xl px-5 py-20">
      {error ? <section role="alert" className="rounded-2xl border border-[#263044] bg-[#121824] p-7">
        <h1 className="text-xl font-semibold text-white">Unable to open this report</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">{error}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button type="button" onClick={() => void load()} className="rounded-full bg-[#246BFD] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Try again</button>
          <Link href="/my-reports" className="py-2.5 text-sm text-blue-400 underline underline-offset-4">Back to My Reports</Link>
          <Link href="/contact" className="py-2.5 text-sm text-blue-400 underline underline-offset-4">Contact support</Link>
        </div>
      </section> : <p role="status" className="flex items-center justify-center gap-3 text-sm text-[#94A3B8]"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />Verifying your report access…</p>}
    </main>
  </div>;
}

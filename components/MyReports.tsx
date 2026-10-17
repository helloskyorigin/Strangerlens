"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import ReportsHeader from "@/components/ReportsHeader";
import { downloadPurchasedReport, fetchReportHistory, readReportReferences } from "@/lib/report-history";
import type { ReportHistoryEntry } from "@/types/report-history";

const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#263044] bg-[#171F2D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#263044] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#246BFD] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export default function MyReports() {
  const [entries, setEntries] = useState<ReportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ reportId: string; message: string } | null>(null);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setStorageError(false);
    // Remove previously verified summaries while fresh access checks are pending.
    setEntries([]);
    try {
      const references = readReportReferences();
      const reports = await fetchReportHistory(references, controller.signal);
      if (!controller.signal.aborted) setEntries(reports);
    } catch {
      if (!controller.signal.aborted) setStorageError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => { if (mounted) void refresh(); });
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith("sl_report_access_v1:")) void refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      request.current?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function download(reportId: string) {
    setDownloading(reportId);
    setDownloadError(null);
    try { await downloadPurchasedReport(reportId); }
    catch (error) {
      setDownloadError({ reportId, message: error instanceof Error ? error.message : "The PDF could not be downloaded. Please try again." });
      void refresh();
    } finally { setDownloading(null); }
  }

  return <div className="min-h-screen bg-[#090D15] text-[#F1F5F9]">
    <ReportsHeader />
    <main className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Your clarity archive</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">My Reports</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#94A3B8] sm:text-base">Your purchased analyses, ready to revisit. Open the original report or keep a premium PDF.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className={secondaryButton}>
          {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />} Refresh
        </button>
      </div>

      <div className="mb-8 flex gap-3 rounded-2xl border border-[#263044] bg-[#121824] p-4 text-sm leading-relaxed text-[#94A3B8]">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <p>Available in this browser, including after a restart. Keep this site&apos;s browser data to retain access. Need help with a missing purchase? <Link href="/contact" className="text-blue-400 underline underline-offset-4">Contact support</Link>.</p>
      </div>

      {downloadError && <div role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/5 p-4 text-sm text-rose-200">
        <p>{downloadError.message}</p>
        <button type="button" onClick={() => void download(downloadError.reportId)} disabled={downloading !== null} className={`${secondaryButton} mt-3`}>Retry download</button>
      </div>}

      {loading ? <div role="status" className="flex min-h-60 items-center justify-center gap-3 text-[#94A3B8]"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />Verifying your saved reports…</div>
        : storageError ? <div role="alert" className="rounded-2xl border border-amber-400/30 bg-[#121824] p-7">
          <h2 className="text-lg font-semibold text-white">Browser storage is unavailable</h2>
          <p className="mt-2 text-sm text-[#94A3B8]">Allow this site to use browser storage, then refresh. If your purchase is missing, contact support with your receipt; please do not pay again.</p>
          <button type="button" onClick={() => void refresh()} className={`${secondaryButton} mt-5`}>Try again</button>
        </div>
          : entries.length === 0 ? <section className="rounded-3xl border border-dashed border-[#263044] px-6 py-16 text-center">
            <FileText aria-hidden="true" className="mx-auto mb-5 h-9 w-9 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Your reports will feel at home here.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#94A3B8]">No purchased reports were found in this browser. Unlock a full analysis and it will appear here automatically.</p>
            <Link href="/" className={`${primaryButton} mt-7`}>Analyze a website <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </section>
            : <ul aria-label="Purchased reports" className="space-y-4">
              {entries.map((entry) => <li key={entry.reportId} className="rounded-2xl border border-[#263044] bg-[#121824] p-5 sm:p-6">
                {"domain" in entry ? <>
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${entry.status === "paid" ? "bg-blue-400/10 text-blue-300" : "bg-amber-400/10 text-amber-300"}`}>{entry.status === "paid" ? "Purchased" : "Access revoked"}</span>
                        <time dateTime={new Date(entry.createdAt).toISOString()} className="text-xs text-[#94A3B8]">{new Date(entry.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time>
                      </div>
                      <h2 className="break-all text-lg font-semibold text-white">{entry.domain}</h2>
                      <p className="mt-2 text-sm text-[#94A3B8]">Clarity score <span className="ml-1 font-semibold text-white">{entry.score}<span className="font-normal text-[#64748B]"> / 100</span></span></p>
                    </div>
                    <div className="flex flex-col gap-2 min-[400px]:flex-row sm:shrink-0">
                      {entry.status === "paid" ? <>
                        <Link href={`/my-reports/${entry.reportId}`} className={primaryButton} aria-label={`Open report for ${entry.domain}`}>Open Report <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                        <button type="button" disabled={downloading !== null} onClick={() => void download(entry.reportId)} className={secondaryButton} aria-label={`Download PDF for ${entry.domain}`}>
                          {downloading === entry.reportId ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />} {downloading === entry.reportId ? "Downloading…" : "Download PDF"}
                        </button>
                      </> : <><button type="button" disabled className={`${secondaryButton} cursor-not-allowed`}>Open Report</button><button type="button" disabled className={`${secondaryButton} cursor-not-allowed`}>Download PDF</button></>}
                    </div>
                  </div>
                  {entry.status === "revoked" && <p className="mt-4 text-sm text-amber-200/90">This payment was refunded or its access was revoked. This report can no longer be opened or downloaded.</p>}
                </> : <div role="status">
                  <h2 className="font-semibold text-white">{entry.status === "error" ? "Couldn’t verify a saved report" : "Saved report unavailable"}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{entry.status === "error" ? "There was a connection or storage issue. Refresh to try again; your saved reference has been kept." : "This report could not be found or access could not be verified. Contact support with your receipt; please do not pay again."}</p>
                  <p className="mt-2 break-all text-xs text-[#64748B]">Report reference: {entry.reportId}</p>
                  <button type="button" onClick={() => void refresh()} className={`${secondaryButton} mt-4`}>Try again</button>
                </div>}
              </li>)}
            </ul>}
    </main>
  </div>;
}

"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Check, LockKeyhole, X } from "lucide-react";

interface PublicSignal {
  title: string;
  scoreDisplay: string;
}
interface PostScanUpgradeModalProps {
  open: boolean;
  domain: string;
  overallScore: string;
  signals: PublicSignal[];
  purchaseReadinessApplicable?: boolean;
  canCheckout: boolean;
  isTestMode: boolean;
  busy: boolean;
  paymentError?: string | null;
  onContinueFree: () => void;
  onUpgrade: () => void;
}

/** Shown once after a fresh scan. The full free report remains available
 * without paying; no premium finding or sixth signal score is sent here. */
export default function PostScanUpgradeModal({
  open, domain, overallScore, signals, purchaseReadinessApplicable = false,
  canCheckout, isTestMode, busy, paymentError, onContinueFree, onUpgrade,
}: PostScanUpgradeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const freeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => freeButtonRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onContinueFree(); return; }
      if (event.key !== "Tab") return;
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      ) ?? []);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, onContinueFree]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-5">
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={onContinueFree}
        className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div ref={dialogRef} role="dialog" aria-modal="true"
        aria-labelledby="post-scan-offer-title" aria-describedby="post-scan-offer-description"
        className="relative z-10 w-full max-w-[520px] max-h-[94dvh] overflow-y-auto rounded-t-[28px] border border-[#34465F] bg-[#111a29] p-5 pb-[max(22px,env(safe-area-inset-bottom))] text-[#F1F5F9] shadow-[0_30px_90px_rgba(0,0,0,.65)] sm:rounded-[28px] sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Your free scan is ready
          </span>
          <button onClick={onContinueFree} type="button" aria-label="Close and view free results"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#A7B4C7] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4">
          <p className="break-all text-xs text-[#A8B5C9]">{domain} · Overall {overallScore}</p>
          <h2 id="post-scan-offer-title" className="mt-2 text-[24px] font-bold leading-tight tracking-tight text-white sm:text-[28px]">
            Five Scores. Five Complete Breakdowns.
          </h2>
          <p id="post-scan-offer-description" className="mt-2 text-sm leading-relaxed text-[#B4C1D1]">
            Your scores are free. The complete report explains every signal — what works, what is unclear, why it matters,
            and what you can improve. Not just a fix for your lowest score.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-[#344760] bg-[#19283b] p-3.5">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#9DBCE2]">Your five clarity signals</p>
            <LockKeyhole className="h-4 w-4 text-[#8DAACD]" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
            {signals.slice(0, 5).map(signal => (
              <div key={signal.title} className="flex min-w-0 items-center justify-between gap-2 border-b border-[#33475d] pb-2">
                <span className="truncate text-[#DAE5F0]">{signal.title}</span>
                <span className="shrink-0 font-semibold tabular-nums text-white">{signal.scoreDisplay}</span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-[#95A9C1]">Unlock the explanation and actionable guidance behind all five.</p>
        </div>

        <div className="mt-4 grid gap-2 text-[13px] text-[#DCE7F2]">
          <div className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>Why each score, what&apos;s working and what&apos;s unclear</span></div>
          <div className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>Improvements across your website and priority action plan</span></div>
          <div className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>First 5 Seconds, copy-ready ideas and downloadable full PDF</span></div>
          {purchaseReadinessApplicable && (
            <div className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
              <span>Bonus Purchase Readiness assessment (when applicable)</span></div>
          )}
        </div>

        {paymentError && <p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{paymentError}</p>}
        <div className="mt-5 space-y-2.5">
          <button type="button" onClick={onUpgrade} disabled={!canCheckout || busy}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            {busy ? "Opening checkout…" : "Unlock Complete Report — $5"}
            {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button ref={freeButtonRef} type="button" onClick={onContinueFree}
            className="flex min-h-[46px] w-full items-center justify-center rounded-full border border-[#354257] bg-[#1b2738] px-4 py-3 text-sm font-semibold text-[#E5ECF5] transition hover:bg-[#26364b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            Continue with my free results
          </button>
          <p className="text-center text-xs text-[#A8B5C9]">
            {isTestMode ? "Test checkout only — no real payment" : "One-time payment · No subscription · Free report stays available"}
          </p>
          {!canCheckout && <p className="text-center text-xs text-amber-300">Checkout is temporarily unavailable. Your free report is ready below.</p>}
        </div>
      </div>
    </div>
  );
}

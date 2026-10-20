"use client";

import React, { useEffect, useRef } from "react";
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
  const mobileFreeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const mobile = window.matchMedia?.("(max-width: 639px)").matches;
      (mobile ? mobileFreeButtonRef : freeButtonRef).current?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onContinueFree(); return; }
      if (event.key !== "Tab") return;
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      ) ?? []).filter(node => node.getClientRects().length > 0);
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={onContinueFree}
        className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div ref={dialogRef} role="dialog" aria-modal="true"
        aria-labelledby="post-scan-offer-title" aria-describedby="post-scan-offer-description"
        className="sl-upgrade-dialog relative z-10 w-full max-w-[500px] max-h-[min(90dvh,730px)] overflow-y-auto overscroll-contain rounded-[24px] border border-[#34465F] bg-[#111a29] p-5 text-[#F1F5F9] shadow-[0_30px_90px_rgba(0,0,0,.65)] sm:rounded-[28px] sm:p-7">
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
          <p id="post-scan-offer-description" className="mt-2 text-[13px] leading-relaxed text-[#B4C1D1] sm:text-sm">
            <span className="sm:hidden">Your free scores are ready. Unlock what works, what needs attention, and specific improvements across all five signals.</span>
            <span className="hidden sm:inline">Your scores are free. The complete report explains every signal — what works, what is unclear, why it matters,
            and what you can improve. Not just a fix for your lowest score.</span>
          </p>
        </div>

        {/* Primary conversion action comes BEFORE the long details on small screens. */}
        <div className="mt-4 space-y-2 sm:hidden">
          {paymentError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{paymentError}</p>}
          <button type="button" onClick={onUpgrade} disabled={!canCheckout || busy}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            <LockKeyhole className="h-4 w-4" aria-hidden="true"/>
            {busy ? "Opening checkout…" : "Unlock Full Analysis — $3"}
            {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true"/>}
          </button>
          <button ref={mobileFreeButtonRef} type="button" onClick={onContinueFree}
            className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#354257] bg-[#1B2738] px-4 text-xs font-semibold text-[#E5ECF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            Continue with free results
          </button>
          <p className="text-center text-[11px] text-[#9FB0C6]">
            {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription"}
          </p>
          {!canCheckout && <p className="text-center text-xs text-amber-300">Checkout unavailable. Free results remain accessible.</p>}
        </div>

        <div className="mt-4 hidden rounded-2xl border border-[#344760] bg-[#19283b] p-3.5 sm:block">
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

        <div className="mt-4 grid gap-1.5 text-xs text-[#DCE7F2] sm:gap-2 sm:text-[13px]">
          <div className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>Why each score, what&apos;s working and what&apos;s unclear</span></div>
          <div className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>Evidence-to-Fix, Smart Priority and a practical action plan</span></div>
          <div className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>Better Copy Studio, First 5 Seconds and full PDF</span></div>
          {purchaseReadinessApplicable && (
            <div className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
              <span>Bonus Purchase Readiness assessment (when applicable)</span></div>
          )}
        </div>

        {paymentError && <p role="alert" className="mt-4 hidden rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 sm:block">{paymentError}</p>}
        <div className="mt-5 hidden space-y-2.5 sm:block">
          <button type="button" onClick={onUpgrade} disabled={!canCheckout || busy}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            {busy ? "Opening checkout…" : "Unlock Complete Report — $3"}
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

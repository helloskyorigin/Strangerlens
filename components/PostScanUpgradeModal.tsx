"use client";

import React, { useEffect, useRef } from "react";
import { ArrowRight, Check, LockKeyhole, X } from "lucide-react";
import { describePublicOpportunity, publicScoreFromDisplay } from "@/lib/upgrade-offer";

interface PublicSignal { title: string; scoreDisplay: string; }
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
/** One honest opt-in prompt after a fresh scan, never blocking free access. */
export default function PostScanUpgradeModal({
  open, domain, overallScore, signals, purchaseReadinessApplicable = false,
  canCheckout, isTestMode, busy, paymentError, onContinueFree, onUpgrade,
}: PostScanUpgradeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const freeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const opportunity = describePublicOpportunity(signals.map(signal => ({
    title: signal.title, score: publicScoreFromDisplay(signal.scoreDisplay),
  })));

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => freeButtonRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onContinueFree(); return; }
      if (event.key !== "Tab") return;
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      ) ?? []).filter(node => node.getClientRects().length > 0);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
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
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
    <button type="button" tabIndex={-1} aria-hidden="true" onClick={onContinueFree}
      className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="post-scan-offer-title"
      aria-describedby="post-scan-offer-description"
      className="sl-upgrade-dialog relative z-10 w-full max-w-[480px] max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl border border-[#34465F] bg-[#111a29] p-5 text-[#F1F5F9] shadow-[0_30px_90px_rgba(0,0,0,.65)] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
          <Check className="h-4 w-4" aria-hidden="true"/> Your free scan is ready
        </span>
        <button type="button" aria-label="Close and view free results" onClick={onContinueFree}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#A7B4C7] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          <X className="h-5 w-5" aria-hidden="true"/>
        </button>
      </div>
      <p className="mt-3 break-all text-xs text-[#A8B5C9]">{domain} · Overall {overallScore}</p>
      <h2 id="post-scan-offer-title" className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-[28px]">
        Your scores are ready. Here&apos;s what&apos;s behind them.
      </h2>
      <p id="post-scan-offer-description" className="mt-3 text-sm leading-relaxed text-[#B4C1D1]">
        Unlock detailed reasons, actionable fixes, editable copy suggestions and the complete PDF for $3.
      </p>
      <div className="mt-4 rounded-xl border border-[#344760] bg-[#19283B] p-3.5">
        <p className="text-sm font-semibold text-white">{opportunity.heading}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#B7CBE0]">{opportunity.detail}</p>
      </div>
      <div className="mt-4 space-y-2 text-xs text-[#DCE7F2] sm:text-sm">
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true"/> All five detailed signal explanations</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true"/> Prioritized fixes and evidence where available</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true"/> Editable copy, fix checklist and downloadable PDF</p>
        {purchaseReadinessApplicable && <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true"/> Purchase Readiness for this website</p>}
      </div>
      {paymentError && <p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{paymentError}</p>}
      <div className="mt-5 space-y-2.5">
        <button type="button" onClick={onUpgrade} disabled={!canCheckout || busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
          <LockKeyhole className="h-4 w-4" aria-hidden="true"/>
          {busy ? "Opening checkout…" : "Unlock Complete Report — $3"}
          {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true"/>}
        </button>
        <button ref={freeButtonRef} type="button" onClick={onContinueFree}
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#354257] bg-[#1B2738] px-4 text-sm font-semibold text-[#E5ECF5] hover:bg-[#26364B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
          Continue with free results
        </button>
        <p className="text-center text-xs text-[#A8B5C9]">
          {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription · Free scores stay available"}
        </p>
        {!canCheckout && <p className="text-center text-xs text-amber-300">Checkout is temporarily unavailable. Your free report remains accessible.</p>}
      </div>
    </div>
  </div>;
}

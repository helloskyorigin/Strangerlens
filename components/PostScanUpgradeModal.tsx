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
      className="absolute inset-0 bg-[#111710]/55 backdrop-blur-sm"/>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="post-scan-offer-title"
      aria-describedby="post-scan-offer-description"
      className="sl-upgrade-dialog relative z-10 w-full max-w-[480px] max-h-[90dvh] overflow-y-auto overscroll-contain rounded-3xl border border-[#DDE8D7] bg-white p-5 text-[#182516] shadow-[0_30px_90px_rgba(0,0,0,.65)] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#528225]">
          <Check className="h-4 w-4" aria-hidden="true"/> Your free scan is ready
        </span>
        <button type="button" aria-label="Close and view free results" onClick={onContinueFree}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#667762] hover:bg-[#ECF9E1] hover:text-[#182516] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC83A]">
          <X className="h-5 w-5" aria-hidden="true"/>
        </button>
      </div>
      <p className="mt-3 break-all text-xs text-[#74836E]">{domain} · Overall {overallScore}</p>
      <h2 id="post-scan-offer-title" className="mt-2 text-2xl font-bold leading-tight tracking-tight text-[#182516] sm:text-[28px]">
        Your scores are ready. Here&apos;s what&apos;s behind them.
      </h2>
      <p id="post-scan-offer-description" className="mt-3 text-sm leading-relaxed text-[#667660]">
        Unlock detailed reasons, actionable fixes, editable copy suggestions and the complete PDF for $9.
      </p>
      <div className="mt-4 rounded-xl border border-[#DBEACC] bg-[#F5FBEF] p-3.5">
        <p className="text-sm font-semibold text-[#182516]">{opportunity.heading}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#64765E]">{opportunity.detail}</p>
      </div>
      <div className="mt-4 space-y-2 text-xs text-[#465B42] sm:text-sm">
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#528225]" aria-hidden="true"/> All five detailed signal explanations</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#528225]" aria-hidden="true"/> Prioritized fixes and evidence where available</p>
        <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#528225]" aria-hidden="true"/> Editable copy suggestions and downloadable PDF</p>
        {purchaseReadinessApplicable && <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#528225]" aria-hidden="true"/> Purchase Readiness for this website</p>}
      </div>
      {paymentError && <p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-[#A44737]">{paymentError}</p>}
      <div className="mt-5 space-y-2.5">
        <button type="button" onClick={onUpgrade} disabled={!canCheckout || busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#273523] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC83A]">
          <LockKeyhole className="h-4 w-4" aria-hidden="true"/>
          {busy ? "Opening checkout…" : "Unlock Complete Report — $9"}
          {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true"/>}
        </button>
        <button ref={freeButtonRef} type="button" onClick={onContinueFree}
          className="flex min-h-11 w-full items-center justify-center rounded-full border border-[#D2E3C5] bg-[#F4FBEF] px-4 text-sm font-semibold text-[#425E32] hover:bg-[#E3F6D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CC83A]">
          Continue with free results
        </button>
        <p className="text-center text-xs text-[#74836E]">
          {isTestMode ? "Test mode · No real charge" : "One-time payment · No subscription · Free scores stay available"}
        </p>
        {!canCheckout && <p className="text-center text-xs text-[#97701F]">Checkout is temporarily unavailable. Your free report remains accessible.</p>}
      </div>
    </div>
  </div>;
}

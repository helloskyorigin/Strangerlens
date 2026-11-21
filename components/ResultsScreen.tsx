"use client";
import React, { useState, useEffect, useRef } from "react";
import CompleteReportPreview from "@/components/CompleteReportPreview";
import ClarityResultsOverview from "@/components/ClarityResultsOverview";
import PaidReportAccordion from "@/components/PaidReportAccordion";
import { trackFunnelEvent } from "@/lib/ui-funnel-events";
import { persistActiveReportSession } from "@/lib/active-report-session";
import { escapeHtmlText } from "@/lib/escape-html";
import { Download, Check, X, Lock, Loader2, AlertCircle, ArrowRight, FileText } from "lucide-react";
import { LandingThemeSwitcher } from "@/components/landing/LandingThemeSwitcher";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import { adaptReport } from "@/lib/report-adapter";
import { projectFreeFrontendReport } from "@/lib/free-report-projection";
import { generateReportPdf } from "@/lib/pdf-generator";
import type { PdfDownloadResult } from "@/lib/pdf-generator";
import type { PremiumWorkbench } from "@/types/premiumWorkbench";
import ClaritySignalTooltip from "@/components/ClaritySignalTooltip";
import BrandMark from "@/components/BrandMark";
import {
  startReportCheckout,
  rememberReportAccess,
} from "@/lib/payment-checkout";

export interface AnalysisData {
  purchaseReadiness?: import("@/types/purchase-readiness").PurchaseReadiness;
  purchaseReadinessLocked?: true;
  scanCoverage?: { level: "sufficient" | "limited" | "unreadable"; note: string; observedCharacters: number };
  analysisMode?: "ai" | "heuristic";
  domain: string;
  score: number;
  scoreStatus: "Needs improvement" | "Good" | "Needs work" | "Excellent";
  verdict: string;
  verdictSubtext: string;
  quickSignals: Array<{
    label: string;
    type: "clear" | "amber" | "coral";
  }>;
  firstSeconds: Array<{
    question: string;
    label: string;
    type: "clear" | "partly" | "unclear";
  }>;
  visitorThought: string;
  evidence: {
    locationTag: string;
    homepageExcerpt: string;
    clearFindings: string[];
    missingFindings: string[];
  };
  signals: Array<{
    id: string;
    title: string;
    score: number;
    badgeText: string;
    badgeType: "clear" | "amber" | "coral";
    description: string;
    icon: string;
  }>;
  websiteMessage?: {
    summary: string;
    confidence: "high" | "medium" | "low";
  };
  risks?: Array<{
    category: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    why_it_matters: string;
  }>;
  recommendation: {
    title: string;
    subhead: string;
    explanation: string;
    impact?: "high" | "medium";
    currentDirection: string;
    strongerDirection: string;
  };
  premiumWorkbench?: PremiumWorkbench;
  otherImprovements: Array<{
    id: string;
    title: string;
    description: string;
    whyItMatters: string;
    whatToImprove: string;
    copyableSuggestion?: string;
    icon: string;
    color: string;
  }>;
  supportingContext?: any;
  isFreeTierOnly?: boolean;
  isPartialAccess?: boolean;
  isAccessError?: boolean;
  checkedAt?: string;
  lockedPreviewCounts?: {
    actionSteps: number;
    secondaryFixes: number;
    copyRewrites: number;
    totalRisks: number;
  };
}

export default function ResultsScreen({
  rawUrl,
  analysisData: data,
  isUnlocked = false,
  checkoutEnabled = false,
  paymentEnvironment,
  paymentState,
  paymentMessage,
  onVerifyPayment,
  onRefreshPaidReport,
  onDownloadPdf,
  onBackToLanding,
  onRunNewCheck,
  onRecheck,
  onOpenFaq,
  onOpenPricing,
}: any) {
  const [activeSignalTooltip, setActiveSignalTooltip] = useState<string | null>(null);
  const [isEarlySuccessModalOpen, setIsEarlySuccessModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [earlyEmail, setEarlyEmail] = useState("");
  const [earlyStatus, setEarlyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [earlyErrorMessage, setEarlyErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const mobileUpgradeRef = useRef<HTMLDivElement | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [readyPdf, setReadyPdf] = useState<{ href: string; filename: string; reportKey: string; unlocked: boolean } | null>(null);
  const pdfObjectUrl = useRef<string | null>(null);
  useEffect(() => () => {
    if (pdfObjectUrl.current && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(pdfObjectUrl.current);
    }
    pdfObjectUrl.current = null;
  }, [data?.reportId, isUnlocked]);


  const isTestMode = paymentEnvironment === "test_mode";

  const isCheckoutAvailable = Boolean(checkoutEnabled);

  // Only the payment hook can mark this report unlocked after the server has
  // verified the payment AND supplied the protected full report.
  const isReportUnlocked = Boolean(isUnlocked);
  const isVerifyingPayment = paymentState === "verifying" || paymentState === "pending";

  // Canonical report normalized from authoritative analysis data
  const report = adaptReport(!isReportUnlocked && data ? projectFreeFrontendReport(data) : data);
  const unlockedPurchase = isReportUnlocked ? report.purchaseReadiness : undefined;
  const showLockedPurchase = !unlockedPurchase && Boolean(report.purchaseReadinessLocked || report.purchaseReadiness);
  // Results always paint first; no automatic paywall or post-scan interruption.
  const currentReportId: string | null = data?.reportId || report.rawReport?.reportId || null;

  // The parent payment hook is the single owner of checkout return,
  // verification retries and restoring the server-authorized paid report.
  // Never set an independent local paid flag on a verification response.

  useEffect(() => {
    if (!isReportUnlocked || paymentState !== "success") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("full-analysis-unlocked")?.scrollIntoView({
        behavior: "auto", block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isReportUnlocked, paymentState]);



  const shouldReduceMotion = useReducedMotion();
  const gotItButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalCardRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Accessible Escape and Tab key listener for the Thank You modal
  useEffect(() => {
    if (!isEarlySuccessModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEarlySuccessModalOpen(false);
      } else if (e.key === "Tab") {
        const focusable = modalCardRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEarlySuccessModalOpen]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isEarlySuccessModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isEarlySuccessModalOpen]);

  // Focus management: move focus into modal when opened, restore when closed
  useEffect(() => {
    if (isEarlySuccessModalOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        gotItButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus?.();
      previousActiveElement.current = null;
    }
  }, [isEarlySuccessModalOpen]);

  // Semantic color mapping matching status semantics:
  // Clear / Understandable: Green
  // Partly clear / Needs work / Needs improvement: Amber
  // Unclear / Poor: Rose
  const getStatusTheme = (status: string, badgeType?: string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === "clear" || s === "understandable" || s === "excellent" || s === "good") {
      return {
        text: "text-emerald-400",
        bg: "bg-emerald-500",
        dot: "bg-emerald-400",
      };
    }
    if (s === "partly clear" || s === "needs work" || s === "needs improvement" || s === "partly") {
      return {
        text: "text-amber-400",
        bg: "bg-amber-500",
        dot: "bg-amber-400",
      };
    }
    if (s === "unclear" || s === "poor" || s === "bad") {
      return {
        text: "text-rose-400",
        bg: "bg-rose-500",
        dot: "bg-rose-400",
      };
    }
    if (badgeType === "clear") return { text: "text-emerald-400", bg: "bg-emerald-500", dot: "bg-emerald-400" };
    if (badgeType === "amber") return { text: "text-amber-400", bg: "bg-amber-500", dot: "bg-amber-400" };
    if (badgeType === "coral") return { text: "text-rose-400", bg: "bg-rose-500", dot: "bg-rose-400" };
    return { text: "text-[#94A3B8]", bg: "bg-[#263044]", dot: "bg-[#94A3B8]" };
  };

  const formatStatusText = (str: string): string => {
    if (!str) return "";
    const lower = str.toLowerCase().trim();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const overallTheme = getStatusTheme(report.overallStatus);

  const handleUnlockFullAnalysis = async () => {
    trackFunnelEvent("upgrade_clicked");
    setLoading(true);
    setPaymentError(null);
    try {
      const targetReportId = data?.reportId || report.rawReport?.reportId;
      const targetReportToken = data?.reportToken || report.rawReport?.reportToken;
      if (!targetReportId) {
        setPaymentError("Report session missing. Please run a website scan first.");
        return;
      }
      if (targetReportToken) {
        rememberReportAccess(targetReportId, targetReportToken);
      }
      const result = await startReportCheckout(targetReportId, targetReportToken);
      if (result.alreadyPaid) {
        if (onRefreshPaidReport) {
          await onRefreshPaidReport();
        }
      } else if (result.checkoutUrl) {
        // Synchronously preserve this exact V7 report before Dodo navigation.
        persistActiveReportSession(window.sessionStorage, rawUrl, data);
        trackFunnelEvent("checkout_opened");
        window.location.assign(result.checkoutUrl);
      }
    } catch (err) {
      trackFunnelEvent("checkout_failed");
      setPaymentError(err instanceof Error ? err.message : "Failed to open checkout.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (isGeneratingPdf) return;
    setPdfError(null);
    setIsGeneratingPdf(true);
    setReadyPdf(null);
    if (pdfObjectUrl.current && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(pdfObjectUrl.current);
      pdfObjectUrl.current = null;
    }
    try {
      // The PDF API decides the tier from verified server entitlement; a
      // client-side paid flag cannot unlock premium PDF content.
      const result: PdfDownloadResult | undefined = onDownloadPdf
        ? await onDownloadPdf()
        : await generateReportPdf(report, isReportUnlocked);
      let manualLinkReady = false;
      if (result?.blob && typeof URL.createObjectURL === "function") {
        try {
          const href = URL.createObjectURL(result.blob);
          pdfObjectUrl.current = href;
          setReadyPdf({ href, filename: result.filename, reportKey: currentReportId || "", unlocked: isReportUnlocked });
          manualLinkReady = true;
        } catch {
          // An unsupported blob URL must not turn a successful native save
          // into a false failure notification.
        }
      }
      if (result?.automaticSaveRequested === false && !manualLinkReady) {
        setPdfError("Your PDF was prepared, but this browser blocked saving it. Open StrangerLens directly in Chrome or Safari and try again.");
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      setPdfError(reason && reason.length < 200
        ? reason
        : "The PDF could not be prepared. Check your connection and try again; you do not need to pay again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderPdfActions = (bottom = false) => (
    <div id={bottom ? "report-export-actions-bottom" : "report-export-actions"}
      className={`${isReportUnlocked ? "" : "sl-free-pdf-utility "}flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-[#D9E8CE] bg-[#F8FCF4] p-4 scroll-mt-24`}>
      <button type="button" disabled={isGeneratingPdf} onClick={downloadPdf}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2B3B22] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BCB36]">
        {isGeneratingPdf
          ? <Loader2 className="h-4 w-4 animate-spin text-[#B9FC22]" aria-hidden="true" />
          : <Download className="h-4 w-4 text-[#B9FC22]" aria-hidden="true" />}
        {isGeneratingPdf ? "Preparing PDF…" : isReportUnlocked ? "Download Full PDF" : "Download Free PDF"}
      </button>
      {readyPdf && readyPdf.reportKey === (currentReportId || "") && readyPdf.unlocked === isReportUnlocked && (
        <a href={readyPdf.href} download={readyPdf.filename} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#A8D17D] bg-white px-4 py-2 text-sm font-semibold text-[#365E24] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BCB36]">
          PDF ready — tap to save
        </a>
      )}
      {pdfError && <p role="alert" className="w-full text-center text-sm text-[#A3493C]">{pdfError}</p>}
      {!pdfError && !readyPdf && !isGeneratingPdf && isReportUnlocked &&
        <p className="text-center text-xs text-[#6C7D64]">Your full report, including the detailed findings.</p>}
    </div>
  );

  if (!data) return null;

  return (
    <div id="results-content" className={`sl-app-theme sl-results-v7 min-h-screen bg-white text-[#172116] font-sans antialiased flex flex-col `}>
      {/* EARLY ACCESS THANK YOU SUCCESS MODAL */}
      <AnimatePresence>
        {isEarlySuccessModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="early-access-success-title"
            aria-describedby="early-access-success-desc"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            {/* Dark Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
              onClick={() => setIsEarlySuccessModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Card Surface with Subtle Blue Glow */}
            <motion.div
              ref={modalCardRef}
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.95, y: 8 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, y: 6 }
              }
              transition={{
                duration: shouldReduceMotion ? 0.05 : 0.25,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-md bg-[#121824] border border-[#263044] rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_-10px_rgba(36,107,253,0.3)] overflow-hidden"
            >
              {/* Subtle ambient blue glow */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#246BFD]/12 rounded-full blur-3xl pointer-events-none" />

              {/* Close (×) Button */}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsEarlySuccessModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#171F2D] hover:bg-[#1E293B] border border-[#263044] text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD]"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Animated Success Checkmark */}
              <motion.div
                initial={shouldReduceMotion ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 22,
                  delay: 0.08,
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10"
              >
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.8}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    initial={shouldReduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.05 : 0.35,
                      delay: 0.15,
                      ease: "easeOut",
                    }}
                  />
                </svg>
              </motion.div>

              {/* Heading */}
              <h3
                id="early-access-success-title"
                className="text-xl sm:text-2xl font-extrabold text-white mb-2 tracking-tight"
              >
                You&apos;re on the list! 🎉
              </h3>

              {/* Description */}
              <div
                id="early-access-success-desc"
                className="space-y-1 mb-6 text-sm sm:text-base text-[#94A3B8] leading-relaxed"
              >
                <p>Thanks for joining StrangerLens Early Access.</p>
                <p className="text-xs sm:text-sm text-[#64748B]">
                  We&apos;ll email you when Full Analysis becomes available.
                </p>
              </div>

              {/* Primary Action Button */}
              <button
                ref={gotItButtonRef}
                type="button"
                onClick={() => setIsEarlySuccessModalOpen(false)}
                className="w-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white font-semibold py-3 px-6 rounded-full text-sm transition-all shadow-md shadow-blue-500/25 cursor-pointer inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121824]"
              >
                <span>Got it →</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING RESULTS NAV · VYLENS DESIGN LANGUAGE */}
      <header className="sl-v8-header">
        <div className="sl-v8-header-inner">
          <div className="sl-v8-nav-left">
            <button type="button" onClick={onBackToLanding} className="sl-v8-nav-brand"
              aria-label="Return to StrangerLens home">
              <BrandMark className="h-9 w-9" />
              <span>StrangerLens<i>.</i></span>
            </button>
            <span className="sl-v8-nav-divider" aria-hidden="true" />
            <span className="sl-v8-nav-title">Results</span>
          </div>
          <div className="sl-v8-nav-right">
            <LandingThemeSwitcher compact />
            <Link href="/my-reports" className="sl-v8-my-reports" aria-label="My Reports" title="My Reports"><FileText size={18} aria-hidden="true"/> <span>My Reports</span></Link>
            <button type="button" onClick={onRunNewCheck || onBackToLanding} className="sl-v8-new-check">
              New Check <ArrowRight size={16} aria-hidden="true"/>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className={`flex-1 w-full max-w-[1080px] mx-auto px-4 py-6 sm:py-10 ${isReportUnlocked ? "space-y-8 sm:space-y-12" : "space-y-5 sm:space-y-6"}`}>
        {data?.analysisMode === "heuristic" && (
          <section role="note" aria-label="Limited heuristic preview" className="rounded-2xl border border-amber-500/30 bg-[#30271A] p-4 sm:p-5">
            <p className="text-sm font-bold text-amber-200">Limited preview · AI analysis unavailable</p>
            <p className="mt-1 text-xs leading-relaxed text-[#E5D3AD]">
              AI analysis wasn't available for this scan, so these scores are basic rules-based indicators.
              A complete $9 AI report cannot be purchased from this preview. Please retry when the AI service is available.
            </p>
            {onRecheck && <button type="button" onClick={onRecheck}
              className="mt-3 min-h-10 rounded-full border border-amber-500/35 px-4 text-xs font-bold text-amber-200 hover:bg-amber-500/10">
              Retry for full AI analysis
            </button>}
          </section>
        )}
        {data?.scanCoverage?.level === "limited" && (
          <section role="note" aria-label="Limited website inspection" className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-[#2D2619] p-4 text-[#E9D7B1] sm:p-5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold">Limited static-page coverage</p>
              <p className="mt-1 text-xs leading-relaxed text-[#D8C8A9]">{data.scanCoverage.note}</p>
            </div>
          </section>
        )}
        {paymentMessage && ["verifying", "pending", "error", "failed"].includes(paymentState) &&
          <div role="status" aria-live="polite" className="rounded-xl border border-[#CADFC0] bg-[#F6FCEB] p-4 text-sm text-[#4B663F]">
            <p>{paymentMessage}</p>
            {["pending", "error"].includes(paymentState) && onVerifyPayment &&
              <button type="button" onClick={onVerifyPayment}
                className="mt-2 min-h-10 rounded-full border border-[#AACB90] px-4 text-xs font-semibold text-[#345924]">
                Check payment status
              </button>}
          </div>}
        <div className="sl-v11-summary">
          <ClarityResultsOverview
            report={report}
            isUnlocked={isReportUnlocked}
          />
        </div>


        {/* A single $9 offer follows the free signals, with no duplicate pitch. */}
        {!isReportUnlocked && (
          <>
            <div ref={mobileUpgradeRef} className="sl-v11-offer-wrap" data-testid="full-report-upgrade-anchor">
            <CompleteReportPreview
              signals={report.signalsList}
              purchaseReadinessApplicable={showLockedPurchase}
              canCheckout={isCheckoutAvailable}
              isTestMode={isTestMode}
              busy={loading || isVerifyingPayment}
              onUnlock={handleUnlockFullAnalysis}
            />
            </div>
            {renderPdfActions()}
            {paymentError &&
              <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{paymentError}</p>}
          </>
        )}

        {/* EARLY ACCESS SECTION */}
        {!isReportUnlocked && !isCheckoutAvailable && (
          <section className="bg-[#121824] border border-[#263044] rounded-2xl p-6 sm:p-8 text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-lg mx-auto">
              <span className="inline-block text-[11px] font-bold tracking-widest text-[#3B82F6] uppercase bg-[#171F2D] px-3 py-1 rounded-full border border-[#263044] mb-3 shadow-xs">
                {isTestMode ? "TEST MODE" : isCheckoutAvailable ? "FULL ANALYSIS" : "EARLY ACCESS"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold leading-tight mb-3 text-white">Your Complete Five-Signal Report</h2>
              <div className="text-base sm:text-lg font-bold text-white mb-3">
                $9 <span className="text-xs sm:text-sm text-[#94A3B8] font-normal">· One-time payment</span>
              </div>
              <p className="text-[#94A3B8] text-sm mb-2 max-w-md mx-auto leading-relaxed">
                The full report explores all five signals in depth, from existing strengths to actionable improvements. Your free scores stay available.
              </p>
              {isCheckoutAvailable ? (
                <div className="mt-6 space-y-4">
                  {paymentError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                      {paymentError}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={loading || isVerifyingPayment}
                    onClick={handleUnlockFullAnalysis}
                    className="w-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3.5 px-6 rounded-full text-sm transition-all shadow-md shadow-blue-500/25 cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    {loading || isVerifyingPayment ? (
                      <span>Processing...</span>
                    ) : (
                      <span>Unlock Full Analysis — $9</span>
                    )}
                  </button>
                  <p className={`text-xs leading-relaxed font-medium ${isTestMode ? "text-amber-400/90" : "text-[#94A3B8]"}`}>
                    {isTestMode ? "Test Mode — Use Dodo test card to unlock. No real money charged." : "One-time payment · Instant access · No subscription"}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#94A3B8] mb-6 font-medium">
                    Checkout is currently unavailable. Leave your email for an availability update.
                  </p>

                  {earlyStatus === "success" ? (
                    <div className="bg-[#171F2D] border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2 my-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-2 font-bold text-base">
                        ✓
                      </div>
                      <h3 className="text-lg font-bold text-white">You&apos;re on the list!</h3>
                      <p className="text-xs sm:text-sm text-[#94A3B8]">
                        We&apos;ll email you when full analysis becomes available.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (earlyStatus === "loading") return;
                        if (!earlyEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(earlyEmail)) {
                          setEarlyErrorMessage("Please enter a valid email address.");
                          setEarlyStatus("error");
                          return;
                        }
                        setEarlyStatus("loading");
                        setEarlyErrorMessage(null);
                        try {
                          const res = await fetch("/api/early-access", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: earlyEmail }),
                          });
                          const data = await res.json().catch(() => null);
                          if (res.ok && data?.success) {
                            setEarlyStatus("success");
                            setIsEarlySuccessModalOpen(true);
                          } else {
                            setEarlyStatus("error");
                            setEarlyErrorMessage(data?.message || "Failed to submit. Please try again.");
                          }
                        } catch {
                          setEarlyStatus("error");
                          setEarlyErrorMessage("Network error. Please check your connection and try again.");
                        }
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label htmlFor="earlyAccessEmail" className="sr-only">
                          Enter your email
                        </label>
                        <input
                          id="earlyAccessEmail"
                          type="email"
                          value={earlyEmail}
                          onChange={(e) => {
                            setEarlyEmail(e.target.value);
                            if (earlyStatus === "error") setEarlyStatus("idle");
                          }}
                          placeholder="Enter your email"
                          required
                          className="w-full bg-[#171F2D] border border-[#263044] focus:border-[#3B82F6] text-white placeholder:text-[#64748B] text-sm rounded-xl px-4 py-3 outline-none transition-all shadow-xs"
                        />
                      </div>
                      {earlyStatus === "error" && earlyErrorMessage && (
                        <p className="text-xs text-rose-400 text-left font-medium px-1">
                          {earlyErrorMessage}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={earlyStatus === "loading"}
                        className="w-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        <span>{earlyStatus === "loading" ? "Joining..." : "Join Early Access"}</span>
                        <span>→</span>
                      </button>
                    </form>
                  )}

                  <p className="text-xs text-[#94A3B8] mt-4 leading-relaxed">
                    No payment required today. We&apos;ll email you when full analysis is available.
                    <br />
                    <span className="block mt-1.5 text-[11px] text-slate-500">
                      Submitted email addresses are stored securely and used solely to notify you about StrangerLens Full Analysis availability. Waitlist emails are received and retained in the operator&apos;s Gmail inbox. To request removal, contact hello.skyorigin@gmail.com. Review our{" "}
                      <Link href="/privacy" className="text-[#3B82F6] hover:underline font-medium">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        {isReportUnlocked && data && (
          <>
            <PaidReportAccordion report={report} data={data}/>
            {renderPdfActions()}
          </>
        )}

      </main>
    </div>
  );
}

export function buildReportSummaryForExport(data: any, isUnlocked: boolean): string {
  if (!isUnlocked) {
    return `STRANGERLENS FREE PREVIEW SUMMARY
URL: ${data?.url || data?.domain || ""}
FIVE SIGNAL OVERVIEW:
${data?.signals?.map((s: any) => `- ${s.name}: ${s.score}/100`).join("\n") || ""}
BIGGEST ISSUE + EVIDENCE:
${data?.biggestIssue?.title || ""} - ${data?.biggestIssue?.description || ""}
YOUR #1 PRIORITY FIX:
${data?.priorityFix?.action || ""}`;
  }
  return `STRANGERLENS FULL FIRST-IMPRESSION REPORT
URL: ${data?.url || data?.domain || ""}
FIRST-TIME VISITOR IMPRESSION:
${data?.visitorThought || ""}
FIVE DETAILED SIGNAL BREAKDOWN:
${data?.signals?.map((s: any) => `- ${s.name}: ${s.score}/100 (${s.explanation || ""})`).join("\n") || ""}
COMMUNICATION RISKS:
${data?.risks?.map((r: any) => `- ${r}`).join("\n") || ""}`;
}

"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import CompleteReportPreview from "@/components/CompleteReportPreview";
import ClarityResultsOverview from "@/components/ClarityResultsOverview";
import SignalReportExplorer from "@/components/SignalReportExplorer";
import PremiumActionPlan from "@/components/PremiumActionPlan";
import RecheckComparison from "@/components/RecheckComparison";
import PostScanUpgradeModal from "@/components/PostScanUpgradeModal";
import { trackFunnelEvent } from "@/lib/ui-funnel-events";
import { escapeHtmlText } from "@/lib/escape-html";
import { Share2, Download, Check, Info, X, Lock, Loader2, AlertCircle, ArrowRight, FileText } from "lucide-react";
import { LandingThemeSwitcher } from "@/components/landing/LandingThemeSwitcher";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import { adaptReport } from "@/lib/report-adapter";
import { generateReportPdf } from "@/lib/pdf-generator";
import type { PremiumWorkbench } from "@/types/premiumWorkbench";
import ClaritySignalTooltip from "@/components/ClaritySignalTooltip";
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
  postScanOfferReportId = null,
}: any) {
  const [activeSignalTooltip, setActiveSignalTooltip] = useState<string | null>(null);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isEarlySuccessModalOpen, setIsEarlySuccessModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [earlyEmail, setEarlyEmail] = useState("");
  const [earlyStatus, setEarlyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [earlyErrorMessage, setEarlyErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  // Initialize the fresh-scan offer BEFORE first Results paint. Previously
  // waiting 700ms made the report flash underneath a delayed modal.
  const [isPostScanOfferOpen, setIsPostScanOfferOpen] = useState(() => {
    const fresh = Boolean(postScanOfferReportId && data?.reportId === postScanOfferReportId &&
      checkoutEnabled && !isUnlocked && paymentState !== "pending" && paymentState !== "success");
    if (!fresh || typeof window === "undefined") return false;
    try { return window.sessionStorage.getItem(`sl_post_scan_offer_v1:${postScanOfferReportId}`) !== "shown"; }
    catch { return true; }
  });
  const mobileUpgradeRef = useRef<HTMLDivElement | null>(null);
  const [showMobileUpgradeBar, setShowMobileUpgradeBar] = useState(false);

  const offeredReportRef = useRef<string | null>(null);
  const closePostScanOffer = useCallback(() => {
    trackFunnelEvent("post_scan_offer_dismissed");
    setIsPostScanOfferOpen(false);
  }, []);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);

  const isTestMode = paymentEnvironment === "test_mode";

  const isCheckoutAvailable = Boolean(checkoutEnabled);

  // Only the payment hook can mark this report unlocked after the server has
  // verified the payment AND supplied the protected full report.
  const isReportUnlocked = Boolean(isUnlocked);
  const isVerifyingPayment = paymentState === "verifying" || paymentState === "pending";

  // Canonical report normalized from authoritative analysis data
  const report = adaptReport(data);
  const unlockedPurchase = isReportUnlocked ? report.purchaseReadiness : undefined;
  const showLockedPurchase = !unlockedPurchase && Boolean(report.purchaseReadinessLocked || report.purchaseReadiness);
  const displaySignals = unlockedPurchase ? [...report.signalsList, unlockedPurchase] : report.signalsList;
  // Keep a compact $3 entry point available while mobile visitors scroll the
  // free report. Hide it when either upgrade card is in view or the modal opens.
  useEffect(() => {
    if (isReportUnlocked || !isCheckoutAvailable) return;
    const updateVisibility = () => {
      const entry = mobileUpgradeRef.current;
      const checkoutSection = document.getElementById("complete-report-preview");
      if (!entry) return;
      const entryAboveViewport = entry.getBoundingClientRect().bottom < 0;
      const previewRect = checkoutSection?.getBoundingClientRect();
      const previewVisible = Boolean(previewRect && previewRect.top < window.innerHeight - 65 && previewRect.bottom > 65);
      setShowMobileUpgradeBar(entryAboveViewport && !previewVisible);
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [isReportUnlocked, isCheckoutAvailable, data?.reportId]);

  // Offer only after a FRESH, successfully completed scan (never on restore,
  // back navigation, a purchased report, or after returning from checkout).
  const currentReportId: string | null = data?.reportId || report.rawReport?.reportId || null;
  useEffect(() => {
    if (!postScanOfferReportId || currentReportId !== postScanOfferReportId ||
      !isCheckoutAvailable || isReportUnlocked || isVerifyingPayment ||
      paymentState === "pending" || paymentState === "success") return;
    if (offeredReportRef.current === currentReportId) return;
    try {
      if (window.sessionStorage.getItem(`sl_post_scan_offer_v1:${currentReportId}`) === "shown") return;
    } catch { /* Private browsing may disable session storage. */ }
    offeredReportRef.current = currentReportId;
    try { window.sessionStorage.setItem(`sl_post_scan_offer_v1:${currentReportId}`, "shown"); } catch { /* no-op */ }
    // A new report triggers this only once. The initial state is already open
    // on the first client paint; effect handles report changes while mounted.
    setIsPostScanOfferOpen(true);
    trackFunnelEvent("post_scan_offer_shown");
  }, [postScanOfferReportId, currentReportId, isCheckoutAvailable,
      isReportUnlocked, isVerifyingPayment, paymentState]);


  // The parent payment hook is the single owner of checkout return,
  // verification retries and restoring the server-authorized paid report.
  // Never set an independent local paid flag on a verification response.

  useEffect(() => {
    if (!isReportUnlocked || paymentState !== "success") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("your-improvement-plan")?.scrollIntoView({
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
    if (isEarlySuccessModalOpen || isScoreModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isEarlySuccessModalOpen, isScoreModalOpen]);

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

  if (!data) return null;

  return (
    <div id="results-content" className={`sl-app-theme sl-results-v7 min-h-screen bg-[#090D15] text-[#F1F5F9] font-sans antialiased flex flex-col ${!isReportUnlocked && isCheckoutAvailable ? "pb-16 sm:pb-0" : ""}`}>
      <PostScanUpgradeModal
        open={isPostScanOfferOpen && !isReportUnlocked && isCheckoutAvailable}
        domain={report.domain}
        overallScore={report.overallScoreDisplay}
        signals={report.signalsList.map(signal => ({
          title: signal.title, scoreDisplay: signal.scoreDisplay,
        }))}
        purchaseReadinessApplicable={showLockedPurchase}
        canCheckout={isCheckoutAvailable}
        isTestMode={isTestMode}
        busy={loading || isVerifyingPayment}
        paymentError={paymentError}
        onContinueFree={closePostScanOffer}
        onUpgrade={handleUnlockFullAnalysis}
      />
      {/* Mobile-only compact offer stays available while long free results scroll.
          Never blocks the report, the checkout modal, or the main premium CTA. */}
      {!isReportUnlocked && isCheckoutAvailable && showMobileUpgradeBar && !isPostScanOfferOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#355275] bg-[#101B2B]/95 px-4 py-2.5 shadow-[0_-10px_35px_rgba(0,0,0,.45)] backdrop-blur-xl sm:hidden"
          style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Complete 5-signal report</p>
              <p className="text-[11px] text-[#A6BCD5]">$3 once · Full findings &amp; fixes</p>
            </div>
            <button type="button" onClick={handleUnlockFullAnalysis} disabled={loading || isVerifyingPayment}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#246BFD] px-4 text-xs font-bold text-white disabled:opacity-50">
              {loading || isVerifyingPayment ? "Opening…" : "Unlock — $3"} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true"/>
            </button>
          </div>
        </div>
      )}
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

      {/* SCORE CALCULATION MODAL */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121824] border border-[#263044] rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-4">How scoring works</h3>
            <p className="text-[#94A3B8] text-sm mb-6">Your overall clarity score is a weighted average of your five signal scores: First Impression (25%), Audience (20%), Value (25%), Trust (15%), and Action (15%).</p>
            <button onClick={() => setIsScoreModalOpen(false)} className="w-full bg-[#171F2D] hover:bg-[#263044] text-white font-bold py-3 rounded-lg text-sm cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="w-full bg-[#090D15]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1000px] mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Return to StrangerLens home"
          >
            <span className="font-bold text-base sm:text-xl tracking-tight text-white hover:text-slate-200 transition-colors">
              StrangerLens
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1 sm:gap-4">
                <LandingThemeSwitcher compact />
            <Link href="/my-reports" aria-label="My Reports" className="inline-flex min-h-10 items-center gap-1 rounded text-xs sm:text-sm font-medium text-[#94A3B8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><FileText className="h-4 w-4 min-[420px]:hidden" aria-hidden="true"/><span className="hidden min-[420px]:inline">My Reports</span></Link>
            <button
              type="button"
              onClick={onRunNewCheck || onBackToLanding}
              className="rounded-full bg-[#171F2D] hover:bg-[#263044] text-white font-semibold px-3 sm:px-4 py-2 transition text-xs sm:text-sm cursor-pointer"
            >
              New Check
            </button>
          </div>
        </div>
        <div className="max-w-[1000px] mx-auto px-4 py-2 flex items-center justify-between text-sm text-[#94A3B8]">
          <span className="font-medium text-[#F1F5F9]">{report.domain}</span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {data?.analysisMode === "heuristic" && (
          <section role="note" aria-label="Limited heuristic preview" className="rounded-2xl border border-amber-500/30 bg-[#30271A] p-4 sm:p-5">
            <p className="text-sm font-bold text-amber-200">Limited preview · AI analysis unavailable</p>
            <p className="mt-1 text-xs leading-relaxed text-[#E5D3AD]">
              AI analysis wasn't available for this scan, so these scores are basic rules-based indicators.
              A complete $3 AI report cannot be purchased from this preview. Please retry when the AI service is available.
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
        {isReportUnlocked && (
          <section aria-label="Full analysis unlocked" className="flex flex-col gap-4 rounded-2xl border border-emerald-500/25 bg-[#132A30] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
                <Check className="h-4 w-4" aria-hidden="true" /> Full Analysis Unlocked
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Your complete clarity report is ready.</h2>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-[#B8D0CC]">
                All five detailed signals, the first-five-seconds assessment, improvement plan, and copy suggestions are below.
              </p>
            </div>
            <nav aria-label="Jump to paid report sections" className="flex shrink-0 flex-wrap gap-2">
              <a href="#your-improvement-plan" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#1E815F] px-4 text-xs font-bold text-white hover:bg-[#24936E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Start with fixes →</a>
              <a href="#complete-paid-report" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#385C62] px-4 text-xs font-semibold text-[#D6EDE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Five deep dives</a>
              <a href="#better-copy-studio" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#385C62] px-4 text-xs font-semibold text-[#D6EDE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Copy Studio</a>
              <a href="#report-export-actions" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#385C62] px-4 text-xs font-semibold text-[#D6EDE7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Export PDF</a>
            </nav>
          </section>
        )}
        {paymentMessage && ["verifying", "pending", "error", "failed"].includes(paymentState) &&
          <div role="status" aria-live="polite" className="rounded-xl border border-[#35516E] bg-[#19283B] p-4 text-sm text-[#D6E4F5]">
            <p>{paymentMessage}</p>
            {["pending", "error"].includes(paymentState) && onVerifyPayment &&
              <button type="button" onClick={onVerifyPayment}
                className="mt-2 min-h-10 rounded-full border border-[#496995] px-4 text-xs font-semibold text-[#D6E4F5]">
                Check payment status
              </button>}
          </div>}
        <ClarityResultsOverview
          report={report}
          isUnlocked={isReportUnlocked}
          showLockedPurchase={showLockedPurchase}
          unlockedPurchase={unlockedPurchase}
          publicObservation={Array.isArray(data?.evidence?.missingFindings)
            && typeof data.evidence.missingFindings[0] === "string"
            ? data.evidence.missingFindings[0] : undefined}
          onExplainScore={() => setIsScoreModalOpen(true)}
        />

        {/* One clear upgrade card after the free clarity signals. */}
        {!isReportUnlocked && (
          <>
            <div ref={mobileUpgradeRef} data-testid="full-report-upgrade-anchor">
            <CompleteReportPreview
              signals={report.signalsList}
              purchaseReadinessApplicable={showLockedPurchase}
              canCheckout={isCheckoutAvailable}
              isTestMode={isTestMode}
              busy={loading || isVerifyingPayment}
              onUnlock={handleUnlockFullAnalysis}
              onViewExample={() => {
                onBackToLanding?.();
                window.setTimeout(() => {
                  document.getElementById("full-report-demo")?.scrollIntoView({
                    behavior: shouldReduceMotion ? "auto" : "smooth", block: "start",
                  });
                }, 480);
              }}
            />
            </div>
            {paymentError && !isPostScanOfferOpen &&
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
                $3 <span className="text-xs sm:text-sm text-[#94A3B8] font-normal">· One-time payment</span>
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
                      <span>Unlock Full Analysis — $3</span>
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

        {isReportUnlocked ? (
          <>
            {/* Verified paid access unlocks the complete multi-chapter analysis. */}
            <SignalReportExplorer
              signals={report.signalsList}
              purchaseReadiness={unlockedPurchase}
            />

            {/* FIRST 5 SECONDS */}
            <section>
              <h2 className="text-xl font-bold mb-2 text-white">First 5 Seconds</h2>
              <p className="text-[#94A3B8] text-sm mb-6">What a first-time visitor grasps in the first 5 seconds.</p>
              <div className="grid gap-6">
                <div className="bg-[#121824] border border-[#263044] rounded-xl p-5">
                  <h3 className="font-bold text-emerald-400 text-xs mb-3 tracking-widest uppercase">WHAT VISITORS UNDERSTAND</h3>
                  {report.firstSeconds.understandItems.length > 0 ? (
                    <div className="space-y-3">
                      {report.firstSeconds.understandItems.map((item, i) => (
                        <div key={i} className="text-sm">
                          <div className="font-semibold text-white">{item.title}</div>
                          <div className="text-[#94A3B8] mt-0.5">{item.explanation}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#94A3B8] text-sm">No elements detected as immediately clear on initial load.</p>
                  )}
                </div>
                <div className="bg-[#121824] border border-[#263044] rounded-xl p-5">
                  <h3 className="font-bold text-amber-400 text-xs mb-3 tracking-widest uppercase">WHAT VISITORS MISS</h3>
                  {report.firstSeconds.missItems.length > 0 ? (
                    <div className="space-y-3">
                      {report.firstSeconds.missItems.map((item, i) => (
                        <div key={i} className="text-sm">
                          <div className="font-semibold text-white">{item.title}</div>
                          <div className="text-[#94A3B8] mt-0.5">{item.explanation}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#94A3B8] text-sm">No immediate comprehension blockers identified.</p>
                  )}
                </div>
              </div>
            </section>

            <PremiumActionPlan reportId={currentReportId}
              recommendation={data?.recommendation}
              otherImprovements={Array.isArray(data?.otherImprovements) ? data.otherImprovements : []}
              evidence={data?.evidence}
              visitorThought={data?.visitorThought}
              workbench={data?.premiumWorkbench}
            />
          </>
        ) : null}

        {/* Compact utility actions stay separate from the single paid CTA. */}
        <div id="report-export-actions" className="flex flex-wrap items-center justify-center gap-2 border-t border-[#263044] pt-4 scroll-mt-24">
          {onRecheck && <button type="button" onClick={onRecheck}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#263044] px-4 text-xs font-medium text-[#94A3B8] hover:bg-[#171F2D] hover:text-white">
            Recheck
          </button>}
          <button type="button" onClick={() => setShowUtilities(v => !v)}
            aria-expanded={showUtilities} aria-controls="recheck-comparison-panel"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#263044] px-4 text-xs font-medium text-[#94A3B8] hover:bg-[#171F2D] hover:text-white">
            {showUtilities ? "Hide comparison" : "Compare scores"}
          </button>
        </div>
        <div id="recheck-comparison-panel" className={showUtilities ? "" : "hidden"} aria-hidden={!showUtilities}>
          <RecheckComparison report={report} reportId={currentReportId} onRecheck={onRecheck}/>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button 
            onClick={async () => {
              const card = document.createElement('div');
              card.style.position = 'fixed';
              card.style.top = '-9999px';
              card.style.left = '-9999px';
              card.style.width = '600px';
              card.style.backgroundColor = '#090D15';
              card.style.color = '#F1F5F9';
              card.style.padding = '32px';
              card.style.borderRadius = '24px';
              card.style.fontFamily = 'system-ui, -apple-system, sans-serif';
              card.style.border = '1px solid #263044';
              card.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';

              card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                  <div>
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">StrangerLens</div>
                    <div style="font-size: 12px; color: #94A3B8; margin-top: 2px;">Website Clarity Diagnostic</div>
                  </div>
                  <div style="background: #171F2D; border: 1px solid #263044; padding: 6px 12px; border-radius: 9999px; font-size: 12px; color: #3B82F6; font-weight: 600;">
                    ${escapeHtmlText(report.domain)}
                  </div>
                </div>
                
                <div style="background: #121824; border: 1px solid #263044; border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #94A3B8; font-weight: 700; letter-spacing: 0.5px;">Overall Clarity Score</div>
                    <div style="font-size: 36px; font-weight: 900; color: #FFFFFF; margin-top: 4px;">${escapeHtmlText(report.overallScoreDisplay)}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: 600; color: #38BDF8;">${escapeHtmlText(report.overallStatus)}</div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 2px;">First-time visitor perspective</div>
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                  ${displaySignals.map(s => `
                    <div style="background: #121824; border: 1px solid #263044; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 14px; font-weight: 600; color: #F1F5F9;">${escapeHtmlText(s.title)}${s.key === "purchaseReadiness" ? ' <span style="font-size: 10px; color: #94A3B8;">(separate score)</span>' : ""}</span>
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 12px; color: #94A3B8;">${escapeHtmlText(s.status)}</span>
                        <span style="font-size: 14px; font-weight: 700; color: #FFFFFF; min-width: 45px; text-align: right;">${escapeHtmlText(s.scoreDisplay)}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <div style="text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid #263044; padding-top: 16px;">
                  Analyzed with StrangerLens · strangerlens.ai.studio
                </div>
              `;

              document.body.appendChild(card);

              try {
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: '#090D15' });
                document.body.removeChild(card);

                canvas.toBlob(async (blob) => {
                  if (!blob) return;
                  const file = new File([blob], 'StrangerLens-Share.png', { type: 'image/png' });

                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                      await navigator.share({
                        title: `StrangerLens Report: ${report.domain}`,
                        text: `Website Clarity Score: ${report.overallScoreDisplay} for ${report.domain}`,
                        files: [file],
                      });
                      return;
                    } catch (err: any) {
                      if (err.name === 'AbortError') return;
                    }
                  }

                  const link = document.createElement('a');
                  link.download = 'StrangerLens-Share.png';
                  link.href = URL.createObjectURL(blob);
                  link.click();
                  // Revoking in the same task can cancel downloads on mobile browsers.
                  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
                }, 'image/png');
              } catch (err) {
                if (document.body.contains(card)) {
                  document.body.removeChild(card);
                }
              }
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#263044] bg-[#171F2D] px-4 text-xs font-medium text-[#94A3B8] transition hover:text-white cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-blue-400" />
            <span>Share</span>
          </button>
          <button 
            disabled={isGeneratingPdf}
            onClick={async () => {
              setIsGeneratingPdf(true);
              try {
                // PDF export verifies its tier on /api/report/[id]/pdf. The
                // full-report endpoint intentionally rejects free reports.
                if (onDownloadPdf) await onDownloadPdf();
                else await generateReportPdf(report, isReportUnlocked);
              } catch (err: any) {
                alert(`PDF generation failed: ${err?.message || "Please try again."}`);
              } finally {
                setIsGeneratingPdf(false);
              }
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#263044] bg-[#171F2D] px-4 text-xs font-medium text-[#94A3B8] transition hover:text-white disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-blue-400" />
            )}
            <span>{isGeneratingPdf ? "Generating…" : isReportUnlocked ? "Full PDF" : "Export summary"}</span>
          </button>
        </div>
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

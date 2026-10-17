"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link2, Clock, Share2, Download, AlertCircle, Check, Zap, Info, X, Lock, Mail, ArrowRight, Sparkles, Shield, Users, Eye, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import { adaptReport, SIGNAL_ID_TO_KEY } from "@/lib/report-adapter";
import { generateReportPdf } from "@/lib/pdf-generator";
import {
  startReportCheckout,
  rememberReportAccess,
  readReportToken,
  readPendingCheckout,
} from "@/lib/payment-checkout";

export interface AnalysisData {
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
  const [activeExplorerSignalId, setActiveExplorerSignalId] = useState("first-impression");
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isEarlySuccessModalOpen, setIsEarlySuccessModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [earlyEmail, setEarlyEmail] = useState("");
  const [earlyStatus, setEarlyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [earlyErrorMessage, setEarlyErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifiedUnlocked, setVerifiedUnlocked] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isTestMode =
    process.env.NEXT_PUBLIC_DODO_TEST_MODE === "true" ||
    paymentEnvironment === "test_mode" ||
    (typeof window !== "undefined" &&
      (window.location.hostname.includes("ais-dev") ||
       window.location.hostname.includes("ais-pre") ||
       window.location.hostname === "localhost" ||
       window.location.hostname === "127.0.0.1"));

  const isCheckoutAvailable = Boolean(checkoutEnabled) || isTestMode;

  const isReportUnlocked = Boolean(isUnlocked) || verifiedUnlocked;

  // Canonical report normalized from authoritative analysis data
  const report = adaptReport(data);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get("checkout");
    const status = params.get("status");
    const orderId = params.get("orderId");
    const targetReportId = params.get("reportId") || data?.reportId || report.rawReport?.reportId;

    if ((checkoutParam === "return" || status === "success") && targetReportId && !verifiedUnlocked) {
      const token = readReportToken(targetReportId) || data?.reportToken || report.rawReport?.reportToken;
      const effectiveOrderId = orderId || readPendingCheckout(targetReportId)?.orderId;
      if (!effectiveOrderId || !token) {
        return;
      }
      queueMicrotask(() => setIsVerifyingPayment(true));
      fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: effectiveOrderId, reportId: targetReportId }),
      })
        .then((res) => res.json())
        .then(async (resData) => {
          if (resData.verified) {
            setVerifiedUnlocked(true);
            if (onRefreshPaidReport) {
              void onRefreshPaidReport().catch(() => {});
            }
            const cleanUrl = new URL(window.location.href);
            for (const key of ["checkout", "reportId", "orderId", "status", "session_id", "checkout_id", "payment_id"]) {
              cleanUrl.searchParams.delete(key);
            }
            window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
          } else {
            setPaymentError("Payment verification pending or failed. Please refresh or contact support.");
          }
        })
        .catch(() => {
          setPaymentError("Error verifying payment with server.");
        })
        .finally(() => {
          setIsVerifyingPayment(false);
        });
    } else if (status === "cancelled") {
      queueMicrotask(() => setPaymentError("Checkout was cancelled. Your free report remains available."));
    }
  }, [report, verifiedUnlocked, data, onRefreshPaidReport]);

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

  const explorerTabs = [
    { id: "first-impression", label: "First Impression" },
    { id: "audience", label: "Audience" },
    { id: "value", label: "Value" },
    { id: "trust", label: "Trust" },
    { id: "action", label: "Action" },
  ];

  const activeSignalKey = SIGNAL_ID_TO_KEY[activeExplorerSignalId] || "firstImpression";
  const activeSignal = report.signals[activeSignalKey];

  if (!data) return null;

  return (
    <div id="results-content" className="min-h-screen bg-[#090D15] text-[#F1F5F9] font-sans antialiased flex flex-col">
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
            <span className="font-bold text-xl tracking-tight text-white hover:text-slate-200 transition-colors">
              StrangerLens
            </span>
          </button>
          <div className="flex items-center gap-2 sm:gap-5">
            <Link href="/my-reports" className="rounded text-xs sm:text-sm font-medium text-[#94A3B8] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">My Reports</Link>
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
        {/* OVERALL CLARITY SCORE */}
        <section className="bg-[#121824] border border-[#263044] rounded-2xl p-5 sm:p-6 shadow-xs">
          <h2 className="text-xs sm:text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
            Website Clarity Score
          </h2>
          <div className="space-y-1.5">
            <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              {report.overallScoreDisplay}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${overallTheme.dot}`} aria-hidden="true" />
              <span className={`text-sm sm:text-base font-medium ${overallTheme.text}`}>
                {formatStatusText(report.overallStatus)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-[#263044]/70">
            <button
              type="button"
              onClick={() => setIsScoreModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>How scoring works</span>
            </button>
          </div>
        </section>

        {/* 1. FREE: FIVE CLARITY SIGNALS */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-[#F1F5F9]">Your Clarity Signals</h2>
          <div className="bg-[#121824] border border-[#263044] rounded-xl overflow-hidden divide-y divide-[#263044]/70">
            {report.signalsList.map((signal) => {
              const theme = getStatusTheme(signal.status, signal.badgeType);
              return (
                <div key={signal.id} className="p-4 sm:p-4.5 transition-colors">
                  {/* Mobile Layout (< sm) */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-[#F1F5F9]">{signal.title}</span>
                      <span className="font-semibold text-sm text-white">{signal.scoreDisplay}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} aria-hidden="true" />
                      <span className={`text-xs font-normal ${theme.text}`}>
                        {formatStatusText(signal.status)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#171F2D] border border-[#263044]/40 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${theme.bg}`}
                        style={{ width: `${Math.min(100, Math.max(0, signal.score ?? 0))}%` }}
                      />
                    </div>
                  </div>

                  {/* Desktop Layout (>= sm) */}
                  <div className="hidden sm:flex items-center justify-between">
                    <span className="font-medium text-[#F1F5F9]">{signal.title}</span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-white text-sm">{signal.scoreDisplay}</div>
                        <div className={`text-xs font-medium flex items-center justify-end gap-1.5 ${theme.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} aria-hidden="true" />
                          <span>{formatStatusText(signal.status)}</span>
                        </div>
                      </div>
                      <div className="w-20 h-1.5 bg-[#171F2D] border border-[#263044]/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${theme.bg}`}
                          style={{ width: `${Math.min(100, Math.max(0, signal.score ?? 0))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* EARLY ACCESS SECTION */}
        {!isReportUnlocked && (
          <section className="bg-[#121824] border border-[#263044] rounded-2xl p-6 sm:p-8 text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-lg mx-auto">
              <span className="inline-block text-[11px] font-bold tracking-widest text-[#3B82F6] uppercase bg-[#171F2D] px-3 py-1 rounded-full border border-[#263044] mb-3 shadow-xs">
                {isTestMode ? "TEST MODE" : isCheckoutAvailable ? "FULL ANALYSIS" : "EARLY ACCESS"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white">Unlock Your Full Analysis</h2>
              <div className="text-base sm:text-lg font-bold text-white mb-3">
                $5 <span className="text-xs sm:text-sm text-[#94A3B8] font-normal">{isCheckoutAvailable ? "· One-time payment" : "one-time · Coming Soon"}</span>
              </div>
              <p className="text-[#94A3B8] text-sm mb-2 max-w-md mx-auto leading-relaxed">
                Go beyond your scores. Discover what&apos;s working, what&apos;s unclear, and what to improve across all five clarity signals.
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
                    onClick={async () => {
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
                          setVerifiedUnlocked(true);
                          if (onRefreshPaidReport) {
                            await onRefreshPaidReport();
                          }
                        } else if (result.checkoutUrl) {
                          window.location.assign(result.checkoutUrl);
                        }
                      } catch (err) {
                        setPaymentError(err instanceof Error ? err.message : "Failed to open checkout.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3.5 px-6 rounded-full text-sm transition-all shadow-md shadow-blue-500/25 cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    {loading || isVerifyingPayment ? (
                      <span>Processing...</span>
                    ) : (
                      <span>Unlock Full Analysis — $5</span>
                    )}
                  </button>
                  <p className="text-xs text-amber-400/90 font-medium">
                    {isTestMode ? "Test Mode — Use Dodo test card to unlock. No real money charged." : "One-time payment · Instant access"}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#94A3B8] mb-6 font-medium">
                    Be first to know when full analysis launches.
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
                      Submitted email addresses are stored securely and used solely to notify you when StrangerLens Full Analysis launches. Waitlist emails are received and retained in the operator&apos;s Gmail inbox. To request removal, contact hello.skyorigin@gmail.com. Review our{" "}
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

        {/* 4. UPCOMING FEATURES PREVIEW (WHEN FULL ANALYSIS IS COMING SOON / UNLOCKED IS FALSE) */}
        {!isReportUnlocked ? (
          <section className="bg-[#121824] border border-[#263044] rounded-2xl p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5">
                Coming with Full Analysis
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                A deeper look at what your website communicates — and what needs improvement.
              </p>
            </div>

            {/* Four Compact Feature Rows */}
            <div className="space-y-3.5">
              {/* Feature 01 */}
              <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#171F2D]/70 border border-[#263044]/80">
                <span className="shrink-0 text-xs font-mono font-bold text-[#3B82F6] bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
                  01
                </span>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-white">
                    Detailed Signal Diagnostics
                  </h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Understand the reasoning behind each of your five clarity scores.
                  </p>
                </div>
              </div>

              {/* Feature 02 */}
              <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#171F2D]/70 border border-[#263044]/80">
                <span className="shrink-0 text-xs font-mono font-bold text-[#3B82F6] bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
                  02
                </span>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-white">
                    What&apos;s Working &amp; What&apos;s Unclear
                  </h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Discover what your website communicates well and where visitors may get confused.
                  </p>
                </div>
              </div>

              {/* Feature 03 */}
              <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#171F2D]/70 border border-[#263044]/80">
                <span className="shrink-0 text-xs font-mono font-bold text-[#3B82F6] bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
                  03
                </span>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-white">
                    Actionable Improvements
                  </h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    See specific ways to make your website&apos;s message clearer.
                  </p>
                </div>
              </div>

              {/* Feature 04 */}
              <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-[#171F2D]/70 border border-[#263044]/80">
                <span className="shrink-0 text-xs font-mono font-bold text-[#3B82F6] bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
                  04
                </span>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-white">
                    First 5 Seconds
                  </h3>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    Explore what a first-time visitor may understand or miss.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#263044]/70 flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Available when Full Analysis launches.</span>
            </div>
          </section>
        ) : (
          <>
            {/* PREMIUM: INTERACTIVE ANALYSIS (ONLY RENDERED WHEN FULL ANALYSIS IS UNLOCKED) */}
            <section>
              <h2 className="text-xl font-bold mb-6 text-white">Signal Diagnostics</h2>
              
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {explorerTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveExplorerSignalId(tab.id)}
                    className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition cursor-pointer ${activeExplorerSignalId === tab.id ? "bg-blue-600 text-white" : "bg-[#121824] border border-[#263044] text-[#94A3B8]"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-[#121824] border border-[#263044] rounded-xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">{activeSignal.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusTheme(activeSignal.status, activeSignal.badgeType).dot}`} aria-hidden="true" />
                      <span className={`text-xs font-medium ${getStatusTheme(activeSignal.status, activeSignal.badgeType).text}`}>
                        {formatStatusText(activeSignal.status)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white">{activeSignal.scoreDisplay}</div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-blue-400 mb-2 tracking-widest uppercase">Why This Score</h4>
                    <p className="text-[#94A3B8] text-sm">
                      {activeSignal.explanation || "Diagnostic analysis not available for this signal."}
                    </p>
                  </div>
                  <div className="border-t border-[#263044]"></div>
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-400 mb-2 tracking-widest uppercase">What&apos;s Working</h4>
                    {activeSignal.positiveFindings.length > 0 ? (
                      <ul className="text-[#94A3B8] text-sm space-y-1.5">
                        {activeSignal.positiveFindings.map((finding, i) => (
                          <li key={i}>✓ {finding}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[#94A3B8] text-sm">No clear positive signals detected in the initial content.</p>
                    )}
                  </div>
                  <div className="border-t border-[#263044]"></div>
                  <div>
                    <h4 className="text-[10px] font-bold text-amber-400 mb-2 tracking-widest uppercase">What&apos;s Unclear</h4>
                    {activeSignal.concerns.length > 0 ? (
                      <ul className="text-[#94A3B8] text-sm space-y-1.5">
                        {activeSignal.concerns.map((concern, i) => (
                          <li key={i}>! {concern}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[#94A3B8] text-sm">No significant ambiguities identified for this signal.</p>
                    )}
                  </div>
                  <div className="border-t border-[#263044]"></div>
                  <div>
                    <h4 className="text-[10px] font-bold text-rose-400 mb-2 tracking-widest uppercase">How to Improve</h4>
                    {activeSignal.recommendations.length > 0 ? (
                      <ul className="text-[#94A3B8] text-sm space-y-1.5">
                        {activeSignal.recommendations.map((rec, i) => (
                          <li key={i}>→ {rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[#94A3B8] text-sm">Maintain current messaging clarity in this area.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

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
          </>
        )}

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#263044]">
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
                    ${report.domain}
                  </div>
                </div>
                
                <div style="background: #121824; border: 1px solid #263044; border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-size: 11px; text-transform: uppercase; color: #94A3B8; font-weight: 700; letter-spacing: 0.5px;">Overall Clarity Score</div>
                    <div style="font-size: 36px; font-weight: 900; color: #FFFFFF; margin-top: 4px;">${report.overallScoreDisplay}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 14px; font-weight: 600; color: #38BDF8;">${report.overallStatus}</div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 2px;">First-time visitor perspective</div>
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                  ${report.signalsList.map(s => `
                    <div style="background: #121824; border: 1px solid #263044; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 14px; font-weight: 600; color: #F1F5F9;">${s.title}</span>
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 12px; color: #94A3B8;">${s.status}</span>
                        <span style="font-size: 14px; font-weight: 700; color: #FFFFFF; min-width: 45px; text-align: right;">${s.scoreDisplay}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <div style="text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid #263044; padding-top: 16px;">
                  Analyzed with StrangerLens · strangerlens.ai
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
                  URL.revokeObjectURL(link.href);
                }, 'image/png');
              } catch (err) {
                if (document.body.contains(card)) {
                  document.body.removeChild(card);
                }
              }
            }}
            className="flex-1 bg-[#171F2D] hover:bg-[#263044] text-white font-semibold py-3 px-6 rounded-xl text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-blue-400" />
            <span>Share Result</span>
          </button>
          <button 
            disabled={isGeneratingPdf}
            onClick={async () => {
              setIsGeneratingPdf(true);
              try {
                if (onDownloadPdf) await onDownloadPdf();
                else await generateReportPdf(report, isReportUnlocked);
              } catch (err: any) {
                alert(`PDF generation failed: ${err?.message || "Please try again."}`);
              } finally {
                setIsGeneratingPdf(false);
              }
            }}
            className="flex-1 bg-[#171F2D] hover:bg-[#263044] disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl text-sm transition inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-blue-400" />
            )}
            <span>{isGeneratingPdf ? "Generating PDF…" : "Download PDF"}</span>
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

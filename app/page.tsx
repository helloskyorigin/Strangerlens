"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Check, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import ScanScreen from "@/components/ScanScreen";
import StrangerLensLanding from "@/components/landing/StrangerLensLanding";
import ResultsScreen from "@/components/ResultsScreen";
import { useReportPayments } from "@/hooks/useReportPayments";
import { readPendingCheckout } from "@/lib/payment-checkout";
import { readActiveReportSession, persistActiveReportSession, clearActiveReportSession } from "@/lib/active-report-session";
import { createScanFlowController } from "@/lib/scan-flow-controller";
import { trackFunnelEvent } from "@/lib/ui-funnel-events";
import { EASE_OUT_EXPO } from "@/components/motion/Reveal";


interface PricingPlan {
  id: string;
  name: string;
  price: number;
  paymentLabel: string;
  badge: string | null;
  positioning: string;
  description: string;
  features: string[];
  creditNote?: string;
  cta: string;
  disabledCta: string;
  popular: boolean;
  isPaid: boolean;
}

// PRICING CONFIG (Free and $5 One-Time Full Clarity Report)
const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free Preview",
    price: 0,
    paymentLabel: "FREE",
    badge: null,
    positioning: "Instant clarity evaluation.",
    description: "Discover your overall website clarity score and five core signal scores. Purchase Readiness is a conditional premium signal.",
    features: [
      "Overall Website Clarity Score (0–100)",
      "Five Core Signal Scores and Statuses",
      "Signal Statuses (Clear / Partly clear / Needs work)",
    ],
    cta: "Analyze My Website Free",
    disabledCta: "Analyze My Website Free",
    popular: false,
    isPaid: false,
  },
  {
    id: "complete",
    name: "Unlock Your Full Analysis",
    price: 5,
    paymentLabel: "ONE-TIME",
    badge: "FULL ANALYSIS",
    positioning: "Actionable clarity & diagnostics.",
    description: "Go beyond your clarity scores. Discover what's working, what's unclear, and how to improve your website.",
    features: [
      "Five Detailed Signal Diagnostics",
      "Evidence-to-Fix (verified wording when available)",
      "Smart Priority & Action Plan",
      "Better Copy Studio (review, edit & copy)",
      "First 5 Seconds + Premium PDF",
      "Purchase Readiness (when applicable)",
    ],
    cta: "Check Your Website First",
    disabledCta: "Check Your Website First",
    popular: true,
    isPaid: true,
  },
];

// REQUIRED FAQ ITEMS
const FAQ_ITEMS = [
  {
    question: "What does StrangerLens analyse?",
    answer:
      "StrangerLens is an AI-powered website first-impression clarity analyzer. It evaluates First Impression, Audience, Value, Trust, and Action using inspected website content. A sixth signal, Purchase Readiness, appears when a genuine paid offering is identified. Its separate score does not affect the Overall Clarity Score.",
  },
  {
    question: "Does StrangerLens work with any website?",
    answer:
      "StrangerLens works with publicly reachable websites whose text and structure are accessible in the initial HTML response, including SaaS products, developer tools, B2B services, and landing pages.",
  },
  {
    question: "Is the analysis based on real website content?",
    answer:
      "Yes. StrangerLens inspects your live public website URL and extracts visible text, headings, value propositions, and calls to action to ground its findings in your actual inspected content.",
  },
  {
    question: "Is StrangerLens a security, SEO, or human test panel?",
    answer:
      "No. StrangerLens is an AI website first-impression clarity analyzer focused on visitor comprehension, audience alignment, value perception, trust cues, and call-to-action clarity. It does not conduct human usability panels, nor is it a technical SEO or vulnerability scanner.",
  },
  {
    question: "What is included in the free analysis?",
    answer:
      "The Free Preview ($0) gives you your Overall Website Clarity Score and five core signal scores and statuses with zero signup or credit card required. When paid products, subscriptions or services are identified, Purchase Readiness appears as a locked premium card. Its separate score and findings unlock with verified Full Analysis.",
  },
  {
    question: "What does Full Analysis cost?",
    answer:
      "Full Analysis costs $5 per report, paid once with no subscription. Run a free preview first, then unlock five detailed signal analyses, Evidence-to-Fix findings with verified quotes when available, a Smart Priority plan, an editable Better Copy Studio, and the First 5 Seconds breakdown. Checkout availability is shown on your report.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No account or signup is required. Enter any public website URL to run an instant analysis.",
  },
];


export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [currentView, setCurrentView] = useState<"landing" | "scan" | "results">("landing");
  const [submittedUrl, setSubmittedUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<"faq" | "pricing" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);


  useEffect(() => {
    if (isMounted && currentView === "landing") trackFunnelEvent("landing_view");
  }, [isMounted, currentView]);

  // API Integration States
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [verifiedSite, setVerifiedSite] = useState<{domain:string;httpStatus:number|null}|null>(null);
  const [scanMilestone, setScanMilestone] = useState<import("@/lib/scan-flow-controller").ScanMilestone>("connecting");
  const [backendError, setBackendError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  // Fresh-scan-only upsell: never auto-open on restoring an existing report.
  const [postScanOfferReportId, setPostScanOfferReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisData?.reportId) return;
    // Private browsing, storage restrictions or a corrupted legacy list must
    // never crash a successful scan or block a customer's paid report.
    try {
      const parsed = JSON.parse(localStorage.getItem("strangerlens_reports") || "[]");
      const saved: Array<{ reportId: string }> = Array.isArray(parsed) ? parsed : [];
      if (!saved.some((entry) => entry?.reportId === analysisData.reportId)) {
        localStorage.setItem("strangerlens_reports", JSON.stringify([...saved, { reportId: analysisData.reportId }]));
      }
    } catch { /* Report access uses its separate server-verified token store. */ }
  }, [analysisData?.reportId]);

  // FAQ accordion state — all answers closed by default
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();


  const clearPersistedReportSession = () => {
    if (typeof window === "undefined") return;
    clearActiveReportSession(window.sessionStorage);
  };

  const [scanController] = useState(() =>
    createScanFlowController({
      deferResultsNavigation: true,
      onStateChange: (nextState) => {
        setUrl(nextState.url);
        setSubmittedUrl(nextState.submittedUrl);
        setCurrentView(nextState.currentView);
        setIsVerifying(nextState.isVerifying);
        setIsPending(nextState.isPending);
        setVerifiedSite(nextState.verifiedSite);
        setScanMilestone(nextState.scanMilestone);
        setErrorMessage(nextState.errorMessage);
        setBackendError(nextState.backendError);
        setAnalysisData(nextState.analysisData);
      },
    })
  );

  const payments = useReportPayments(analysisData, scanController);

  function scrollToInput() {
    if (activeInfoModal) setActiveInfoModal(null);
    if (mobileMenuOpen) setMobileMenuOpen(false);
    const wasNotOnLanding = currentView !== "landing";
    if (wasNotOnLanding) {
      clearPersistedReportSession();
      scanController.cancelScan();
    }
    setTimeout(() => {
      const landingInput = (document.getElementById("slr-website-url") as HTMLInputElement | null) ?? inputRef.current;
      if (landingInput) {
        landingInput.scrollIntoView({
          behavior: shouldReduceMotion ? "auto" : "smooth",
          block: "center",
        });
        landingInput.focus();
      }
    }, wasNotOnLanding ? 180 : 60);
  }

  // Handle Browser Back / Forward and popstate events without unintended rescanning
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial history state if not present
    if (!window.history.state || !window.history.state.strangerLens) {
      const params = new URLSearchParams(window.location.search);
      const expectedId = params.get("checkout") === "return" ? params.get("reportId") : null;
      const initialView = readActiveReportSession(window.sessionStorage, expectedId) ? "results" : "landing";
      window.history.replaceState({ strangerLens: true, view: initialView }, "");
    }

    const handlePopState = (event: PopStateEvent) => {
      const histState = event.state;
      const targetView = histState?.view || "landing";

      if (targetView === "landing") {
        // Navigating back to landing: MUST NOT RESCAN
        scanController.navigateToLanding();
      } else if (targetView === "results") {
        // Navigating forward or back to results: MUST NOT RESCAN
        const existingData = scanController.getState().analysisData;
        if (existingData) {
          scanController.navigateToResults();
        } else {
          const params = new URLSearchParams(window.location.search);
          const expectedId = params.get("checkout") === "return" ? params.get("reportId") : null;
          const session = readActiveReportSession(window.sessionStorage, expectedId);
          if (session) {
            scanController.restoreSession(session.rawUrl, session.analysisData);
            return;
          }
          scanController.navigateToLanding();
        }
      } else if (targetView === "scan") {
        // If back to scan screen, do not automatically rescan; navigate to landing safely
        scanController.navigateToLanding();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [scanController]);

  // Restore active report from sessionStorage if user refreshed results or returned from legal page
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId: number | null = null;
    const params = new URLSearchParams(window.location.search);
    const expectedId = params.get("checkout") === "return" ? params.get("reportId") : null;
    const session = readActiveReportSession(window.sessionStorage, expectedId);
    if (session) {
      rafId = requestAnimationFrame(() => {
        if (scanController.getState().currentView === "landing" &&
            !scanController.getState().analysisData) {
          scanController.restoreSession(session.rawUrl, session.analysisData);
        }
      });
    }
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [scanController]);

  // When returning via browser Back from Dodo's checkout BFCache, reload the
  // latest app build and restore its matching V7 report without rescanning.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const session = readActiveReportSession(window.sessionStorage);
      if (session && readPendingCheckout(session.analysisData.reportId)) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Persist active report in sessionStorage while viewing results
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentView === "results" && analysisData && submittedUrl) {
      persistActiveReportSession(window.sessionStorage, submittedUrl, analysisData);
      window.history.replaceState({ strangerLens: true, view: "results" }, "");
    }
  }, [currentView, analysisData, submittedUrl]);




  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activeInfoModal) setActiveInfoModal(null);
      else if (mobileMenuOpen) { setMobileMenuOpen(false); hamburgerButtonRef.current?.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, activeInfoModal]);

  // Close mobile overlay automatically on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  // Prevent background scrolling when mobile menu or modal is open
  useEffect(() => {
    if (mobileMenuOpen || activeInfoModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen, activeInfoModal]);

  const handleAnalyze = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    trackFunnelEvent("scan_submitted");
    payments.cancelPaymentFlow();
    setPostScanOfferReportId(null);
    clearPersistedReportSession();
    if (typeof window !== "undefined") {
      window.history.pushState({ strangerLens: true, view: "scan" }, "");
    }
    await scanController.startScan(overrideUrl);
    if (scanController.getState().errorMessage || scanController.getState().backendError) {
      trackFunnelEvent("scan_failed");
      if (typeof window !== "undefined") {
        window.history.replaceState({ strangerLens: true, view: "landing" }, "");
      }
      scrollToInput();
    }
  };

  const activeView = isMounted ? currentView : "landing";
  const activePaymentMessage = isMounted ? payments.paymentMessage : null;

  return (
    <div className="min-h-screen bg-[#090D15] text-[#F1F5F9] font-sans antialiased selection:bg-[#3B82F6]/30 selection:text-white flex flex-col overflow-x-hidden">
      {activeView !== "results" && activePaymentMessage && <div role="status" className="mx-auto my-4 w-full max-w-3xl rounded-xl border border-[#263044] bg-[#121824] p-4 text-sm">
        <p>{activePaymentMessage}</p>
        {["pending", "error"].includes(payments.paymentState) && <button className="mt-2 text-blue-400 underline" onClick={() => payments.verifyPayment(new URLSearchParams(window.location.search).get("reportId") || undefined, new URLSearchParams(window.location.search).get("orderId") || undefined)}>Check payment status</button>}
      </div>}
      <AnimatePresence mode="popLayout" initial={false}>
        {activeView === "landing" ? (
          <motion.div
            key="landing"
            initial={false}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full min-h-screen"
          >
            <StrangerLensLanding
              url={url}
              onUrlChange={(next) => scanController.setUrl(next)}
              onAnalyze={(event) => { void handleAnalyze(event); }}
              isVerifying={isVerifying}
              errorMessage={errorMessage || backendError}
            />
          </motion.div>
        ) : activeView === "scan" ? (
          <motion.div
            key="scan"
            initial={false}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full min-h-screen bg-[#090D15]"
          >
            <ScanScreen
              rawUrl={submittedUrl}
              isBackendReady={!isPending && !isVerifying && analysisData !== null}
              isScanning={isPending || isVerifying}
              isVerifying={isVerifying}
              verifiedSite={verifiedSite}
              scanMilestone={scanMilestone}
              backendError={backendError}
              onRetry={() => {
                scanController.retryScan();
              }}
              onCancel={() => {
                scanController.cancelScan();
                if (typeof window !== "undefined") {
                  window.history.replaceState({ strangerLens: true, view: "landing" }, "");
                }
              }}
              onBackToLanding={() => {
                scanController.cancelScan();
                if (typeof window !== "undefined") {
                  window.history.replaceState({ strangerLens: true, view: "landing" }, "");
                }
                setTimeout(() => scrollToInput(), 100);
              }}
              onOpenFaq={() => {
                setOpenFaqIndex(null);
                setActiveInfoModal("faq");
              }}
              onOpenPricing={() => setActiveInfoModal("pricing")}
              onGoToResults={() => {
                const freshReportId = scanController.getState().analysisData?.reportId;
                if (typeof freshReportId === "string") trackFunnelEvent("scan_completed");
                setPostScanOfferReportId(typeof freshReportId === "string" ? freshReportId : null);
                scanController.completeScanToResults();
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={false}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full min-h-screen bg-[#090D15]"
          >
            <ResultsScreen
              rawUrl={submittedUrl}
              analysisData={analysisData || undefined}
              postScanOfferReportId={postScanOfferReportId}
              isUnlocked={Boolean(analysisData?.reportId && payments.unlockedReportId === analysisData.reportId)}
              checkoutEnabled={payments.checkoutEnabled}
              paymentEnvironment={payments.environment}
              paymentState={payments.paymentReportId === analysisData?.reportId ? payments.paymentState : "idle"}
              paymentMessage={payments.paymentReportId === analysisData?.reportId ? payments.paymentMessage : null}
              onVerifyPayment={() => payments.verifyPayment()}
              onRefreshPaidReport={payments.refreshPaidReport}
              onBackToLanding={() => {
                // Logo/Home navigation: return to landing page without scanning
                scanController.navigateToLanding();
                if (typeof window !== "undefined") {
                  window.history.pushState({ strangerLens: true, view: "landing" }, "");
                }
                window.scrollTo({
                  top: 0,
                  behavior: shouldReduceMotion ? "auto" : "smooth",
                });
              }}
              onRunNewCheck={() => {
                payments.cancelPaymentFlow();
                setPostScanOfferReportId(null);
                // New Check: navigate to clean URL input screen, NEVER start scanning
                clearPersistedReportSession();
                scanController.resetToLanding(true);
                if (typeof window !== "undefined") {
                  window.history.pushState({ strangerLens: true, view: "landing" }, "");
                }
                setTimeout(() => {
                  scrollToInput();
                }, 60);
              }}
              onRecheck={() => {
                setPostScanOfferReportId(null);
                // Recheck Website: explicitly start exactly ONE new scan
                if (typeof window !== "undefined") {
                  window.history.pushState({ strangerLens: true, view: "scan" }, "");
                }
                scanController.retryScan();
              }}
              onOpenFaq={() => {
                setOpenFaqIndex(null);
                setActiveInfoModal("faq");
              }}
              onOpenPricing={() => setActiveInfoModal("pricing")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "faq" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Frequently Asked Questions"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="bg-[#121824] rounded-t-3xl sm:rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#263044] relative max-h-[85vh] flex flex-col z-10 text-[#F1F5F9]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#263044] shrink-0">
                <div>
                  <h3 className="font-bold text-white text-xl tracking-tight">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
                    Everything you need to know about StrangerLens first-impression reviews.
                  </p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-[#171F2D] flex items-center justify-center text-[#94A3B8] hover:text-white transition cursor-pointer"
                  aria-label="Close FAQ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 overflow-y-auto pr-1 divide-y divide-[#263044] flex-1">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  const modalAnswerId = `faq-modal-answer-${idx}`;
                  return (
                    <div key={idx} className="py-3.5 first:pt-2 last:pb-2">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-3 text-left py-1 group cursor-pointer bg-transparent border-0"
                        aria-expanded={isOpen}
                        aria-controls={modalAnswerId}
                      >
                        <span className="font-semibold text-white group-hover:text-[#3B82F6] transition-colors text-sm sm:text-base">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform ${
                            isOpen ? "rotate-180 text-[#3B82F6]" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={modalAnswerId}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="pt-2 pb-1 text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                              {item.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRICING MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "pricing" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pricing Plans"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="bg-[#121824] rounded-t-3xl sm:rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-[#263044] relative max-h-[85vh] flex flex-col z-10 text-[#F1F5F9]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#263044] shrink-0">
                <div>
                  <h3 className="font-bold text-white text-xl tracking-tight">
                    Simple, Transparent Pricing
                  </h3>
                  <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
                    Start with a free first-impression preview today. Full Analysis costs $5 per report, paid once.
                  </p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-[#171F2D] flex items-center justify-center text-[#94A3B8] hover:text-white transition cursor-pointer"
                  aria-label="Close Pricing"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto overflow-y-auto flex-1 pr-1 pb-1 pt-2">
                {PRICING_PLANS.map((plan) => {
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-5 flex flex-col justify-between relative ${
                        plan.popular
                          ? "bg-[#171F2D] border-2 border-[#3B82F6] shadow-md shadow-blue-500/10"
                          : "bg-[#171F2D] border border-[#263044]"
                      }`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-3 left-4 right-4 flex items-center justify-between gap-1.5 pointer-events-none">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                              plan.popular
                                ? "bg-[#246BFD] text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {plan.badge}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-white text-lg mb-0.5">
                          {plan.name}
                        </h4>
                        <p className="text-xs font-bold text-[#3B82F6] mb-1">
                          {plan.positioning}
                        </p>
                        <p className="text-xs text-[#94A3B8] mb-4 leading-relaxed">
                          {plan.description}
                        </p>
                        <div className="flex items-baseline gap-1.5 mb-4 pb-3 border-b border-[#263044] tabular-nums">
                          <span className="text-3xl font-extrabold text-white">
                            ${plan.price}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                            {plan.paymentLabel}
                          </span>
                        </div>
                        <div className="space-y-2 mb-6 text-xs text-[#F1F5F9]">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={scrollToInput}
                        className={`group w-full py-2.5 px-4 rounded-full text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                          plan.popular || !plan.isPaid
                            ? "bg-[#246BFD] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-[#121824] hover:bg-[#1C2638] text-white border border-[#263044]"
                        }`}
                      >
                        <span>
                          {`${plan.cta} →`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#263044] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#94A3B8] shrink-0">
                <span className="font-semibold text-white">
                  One-time payment · No subscription
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link href="/terms" className="hover:text-white underline underline-offset-2">
                    Terms
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/privacy" className="hover:text-white underline underline-offset-2">
                    Privacy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/refund-policy" className="hover:text-white underline underline-offset-2">
                    Refund Policy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/contact" className="hover:text-white underline underline-offset-2">
                    Support
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

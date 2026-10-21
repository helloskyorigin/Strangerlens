"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Globe2, LoaderCircle, RotateCcw, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { LandingThemeSwitcher } from "@/components/landing/LandingThemeSwitcher";
import BrandMark from "@/components/BrandMark";
import type { ScanMilestone } from "@/lib/scan-flow-controller";

interface VerifiedSite { domain: string; httpStatus: number | null }
interface ScanScreenProps {
  rawUrl: string;
  onBackToLanding: () => void;
  onCancel?: () => void;
  onGoToResults?: () => void;
  onRetry?: () => void;
  isBackendReady?: boolean;
  isScanning?: boolean;
  isVerifying?: boolean;
  verifiedSite?: VerifiedSite | null;
  scanMilestone?: ScanMilestone;
  backendError?: string | null;
  onOpenFaq?: () => void;
  onOpenPricing?: () => void;
}

export const SCAN_FOCUS_MESSAGES = [
  "Reading the public message your visitors encounter",
  "Looking for who the offer is for and why it matters",
  "Checking visible trust cues, policies and next steps",
  "Connecting real page evidence to clearer communication",
] as const;

export const SCAN_STAGES = [
  { id: "verify", label: "Website connection verified" },
  { id: "content", label: "Public website content inspected" },
  { id: "signals", label: "Communication and trust cues evaluated" },
  { id: "report", label: "Your clarity report prepared" },
] as const;

const COVERAGE = ["Website message", "Offers & pricing", "Trust & policies", "Next steps"];

function safeError(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "We couldn't complete this website scan. Please try again.";
  const message = raw.trim();
  if (!message || message.length > 320 ||
      /\b(?:API_KEY|Bearer\s|stack trace|TypeError|SyntaxError|ReferenceError|at\s+\S+\s+\()/i.test(message) ||
      message.startsWith("{") || message.includes("\n    at ")) {
    return "The website couldn't be analyzed right now. Try again or check another public URL.";
  }
  return message;
}

function hostname(value: string): string {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, "").slice(0, 90);
  } catch {
    return value.replace(/^https?:\/\//i, "").split("/")[0].slice(0, 90);
  }
}

export default function ScanScreen({
  rawUrl, onBackToLanding, onCancel, onGoToResults, onRetry,
  isBackendReady = false, isVerifying = false, verifiedSite = null,
  scanMilestone = "connecting", backendError = null,
}: ScanScreenProps) {
  const reduceMotion = useReducedMotion();
  const transitioned = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const phase = backendError ? "error" : isBackendReady ? "ready" :
    isVerifying || !verifiedSite ? "verify" :
    scanMilestone === "signals_evaluated" ? "prepare" :
    scanMilestone === "content_inspected" ? "evaluate" : "read";
  const domain = useMemo(() => hostname(verifiedSite?.domain || rawUrl), [verifiedSite?.domain, rawUrl]);

  useEffect(() => {
    if (backendError || isBackendReady) return;
    const id = window.setInterval(() => setElapsed(v => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [backendError, isBackendReady, rawUrl]);

  // Report-ready is a real backend event; keep the reveal brief, not a forced wait.
  useEffect(() => {
    if (!isBackendReady || backendError || !onGoToResults || transitioned.current) return;
    const id = window.setTimeout(() => {
      if (!transitioned.current) {
        transitioned.current = true;
        onGoToResults();
      }
    }, reduceMotion ? 100 : 850);
    return () => window.clearTimeout(id);
  }, [isBackendReady, backendError, onGoToResults, reduceMotion]);

  const showReport = () => {
    if (onGoToResults && !transitioned.current) {
      transitioned.current = true;
      onGoToResults();
    }
  };
  const restart = () => {
    transitioned.current = false;
    setElapsed(0);
    if (onRetry) onRetry();
    else onBackToLanding();
  };
  const stop = () => {
    transitioned.current = true;
    (onCancel || onBackToLanding)();
  };
  // Each completion is confirmed by a backend event. Nothing auto-advances on a timer.
  const active = phase === "verify" ? 0 : phase === "read" ? 1 :
    phase === "evaluate" ? 2 : phase === "prepare" ? 3 :
    phase === "ready" ? 4 : scanMilestone === "signals_evaluated" ? 3 :
    scanMilestone === "content_inspected" ? 2 : verifiedSite ? 1 : 0;
  const subtitle = phase === "verify" ? "Connecting securely to the public page you shared. No account required."
    : phase === "read" ? "Reading the real headlines, offer, navigation and next steps instead of guessing."
    : phase === "evaluate" ? "Checking who it's for, what it promises and whether visible evidence supports it. Available first-party policies inform trust."
    : phase === "prepare" ? "Turning inspected content into a clear overview. Detailed evidence and fixes unlock in the full report."
    : phase === "ready" ? "See what comes across clearly—and what deserves another look."
    : safeError(backendError);

  return (
    <div className="sl-app-theme flex min-h-dvh flex-col overflow-x-hidden bg-[#090D15] text-[#F1F5F9] antialiased">
      <header className="border-b border-[#243146]">
        <div className="mx-auto flex h-[62px] w-full max-w-3xl items-center justify-between gap-3 px-4 sm:h-[70px] sm:px-6">
          <button type="button" onClick={() => { transitioned.current = true; onBackToLanding(); }}
            className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Return to StrangerLens home">
            <BrandMark className="h-8 w-8" />
            <span className="truncate text-[15px] font-bold tracking-tight sm:text-base">StrangerLens</span>
          </button>
          <div className="ml-auto flex items-center gap-1.5"><LandingThemeSwitcher compact />
          <button type="button" onClick={stop}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-[#A8B9CF] transition hover:bg-[#192438] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <X className="h-4 w-4" aria-hidden="true"/> Cancel
          </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[620px] flex-1 flex-col justify-center px-5 py-7 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-full items-center gap-2 rounded-full border border-[#2D405A] bg-[#121D30] px-3.5 py-2 text-xs font-semibold text-[#C4D5EB]">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-[#8EAFE0]" aria-hidden="true"/>
          <span className="min-w-0 truncate" title={domain}>{domain || "Website"}</span>
          {verifiedSite && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label="Website verified"/>}
        </div>

        {/* The actual StrangerLens mark leads this scan, with understated,
            reduced-motion-safe activity rings; no eye or fake activity logs. */}
        <div className="sl-scan-mark-stage relative mx-auto mt-7 flex h-[116px] w-[116px] items-center justify-center sm:mt-9 sm:h-[144px] sm:w-[144px]"
          data-scan-state={phase}>
          <div className="absolute inset-0 rounded-full border border-[#304761] bg-[#111F33]"/>
          <div className="absolute inset-[12px] rounded-full border border-[#345477]/70"/>
          {phase !== "error" && phase !== "ready" && !reduceMotion && (
            <>
              <motion.div aria-hidden="true" className="absolute inset-[8px] rounded-full border-2 border-transparent border-t-[#69C8FF] border-r-[#755EF2]/30"
                animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}/>
              <motion.div aria-hidden="true" className="absolute inset-[23px] rounded-full border border-[#79A8FF]/35"
                animate={{ scale: [1, 1.09, 1], opacity: [0.7, 0.28, 0.7] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}/>
            </>
          )}
          <motion.div className="relative z-10"
            animate={reduceMotion || phase === "error" || phase === "ready" ? {} : { y: [0, -3, 0], scale: [1, 1.035, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
            <BrandMark className="h-[65px] w-[65px] shadow-[0_15px_38px_-17px_rgba(80,128,250,.85)] sm:h-[75px] sm:w-[75px]" />
          </motion.div>
          {phase === "error" && <AlertCircle className="absolute -bottom-1 -right-1 z-20 h-6 w-6 rounded-full bg-[#111F33] p-1 text-rose-300" aria-label="Scan interrupted"/>}
          {phase === "ready" && <Check className="absolute -bottom-1 -right-1 z-20 h-6 w-6 rounded-full bg-[#111F33] p-1 text-emerald-300" aria-label="Scan complete"/>}
        </div>

        <div className="mt-5 space-y-2 text-center sm:mt-7">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#82ADF0]">
            {phase === "error" ? "SCAN INTERRUPTED" : phase === "ready" ? "SCAN COMPLETE" : "WEBSITE CLARITY ANALYSIS"}
          </p>
          <h1 className="text-[25px] font-bold leading-[1.15] tracking-[-.035em] text-white sm:text-[34px]">
            {phase === "error" ? "We couldn't finish this scan."
              : phase === "ready" ? "Your report is ready."
              : phase === "verify" ? "Connecting to your website."
              : phase === "read" ? "Reading what your visitors see."
              : phase === "evaluate" ? "Seeing your website through fresh eyes."
              : "Turning findings into your clarity report."}
          </h1>
          <p className="mx-auto max-w-[400px] text-[13px] leading-relaxed text-[#9DB0C9] sm:text-sm">{subtitle}</p>
        </div>

        {/* A slim real-state progress list. Each check appears only after its backend milestone. */}
        <section aria-label="Scan progress" className="mx-auto mt-7 w-full max-w-[435px] rounded-2xl border border-[#2B3B52] bg-[#111A29] px-4 py-3.5 sm:mt-8 sm:px-5 sm:py-4">
          <div className="space-y-3">
            {SCAN_STAGES.map((stage, index) => {
              const complete = phase !== "error" && (index < active || phase === "ready");
              const running = phase !== "error" && index === active && phase !== "ready";
              return <div key={stage.id} className="flex min-h-[25px] items-center gap-3">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-500/10 text-emerald-300" :
                  running ? "bg-blue-500/10 text-blue-300" : "text-[#5D7491]"}`}>
                  {complete ? <Check className="h-4 w-4" aria-hidden="true"/> :
                    running ? <LoaderCircle className={`h-4 w-4 ${reduceMotion ? "" : "animate-spin"}`} aria-hidden="true"/> :
                    <Circle className="h-3 w-3" aria-hidden="true"/>}
                </span>
                <span className={`flex-1 text-[13px] font-medium ${complete || running ? "text-[#E8F0FB]" : "text-[#7389A4]"}`}>{stage.label}</span>
                {complete && <span className="text-[10px] font-semibold text-emerald-300">Done</span>}
              </div>;
            })}
          </div>
        </section>

        {phase === "error" && (
          <div role="alert" className="mx-auto mt-4 w-full max-w-[435px] rounded-xl border border-rose-500/25 bg-rose-500/[.07] p-4">
            <p className="text-sm leading-relaxed text-[#F1C5CB]">{safeError(backendError)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={restart} type="button" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#246BFD] px-4 text-sm font-bold text-white hover:bg-blue-600">
                <RotateCcw className="h-4 w-4" aria-hidden="true"/> Retry analysis
              </button>
              <button onClick={onBackToLanding} type="button" className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#41516B] px-4 text-sm font-semibold text-[#D0DCEB] hover:bg-[#203149]">
                <ArrowLeft className="h-4 w-4" aria-hidden="true"/> Change website
              </button>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-4 w-full max-w-[435px]">
            <button onClick={showReport} type="button" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#246BFD] px-5 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              View My Clarity Report <ArrowRight className="h-4 w-4" aria-hidden="true"/>
            </button>
          </motion.div>
        )}
        {(phase === "read" || phase === "evaluate" || phase === "prepare") && (
          <p key={Math.floor(elapsed / 5) % SCAN_FOCUS_MESSAGES.length}
            className="sl-scan-focus mx-auto mt-4 max-w-[430px] text-center text-[12px] font-medium text-[#B8D7F3]" aria-live="off">
            {SCAN_FOCUS_MESSAGES[Math.floor(elapsed / 5) % SCAN_FOCUS_MESSAGES.length]}
          </p>
        )}
        <p className="mx-auto mt-4 max-w-[410px] text-center text-[11px] leading-relaxed text-[#7F94B1]">
          {phase === "ready" ? "Opening your results…" :
            phase === "error" ? "You can retry this URL or check another website." :
              elapsed > 35 ? "This check is taking longer than usual. No fixed completion time is guaranteed." :
                "We examine accessible public website content and first-party policies, with relevant supporting pages when available."}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] font-medium text-[#6D85A2]" aria-label="Areas inspected when available">
          {COVERAGE.map((name, index) => <React.Fragment key={name}>
            {index > 0 && <span aria-hidden="true" className="text-[#405570]">·</span>}
            <span>{name}</span>
          </React.Fragment>)}
        </div>
        <span className="sr-only" role="status" aria-live="polite">{phase === "verify" ? "Verifying website connection" :
          phase === "read" ? "Website verified; inspecting accessible website content" :
          phase === "evaluate" ? "Public content inspected; evaluating clarity signals" :
          phase === "prepare" ? "Clarity signals evaluated; preparing report" :
          phase === "ready" ? "Clarity report ready" : "Website scan failed"}</span>
      </main>
    </div>
  );
}

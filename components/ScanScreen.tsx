"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Clock3, Code2, Eye, FileSearch, Globe2, LoaderCircle, MousePointerClick, RotateCcw, ScanLine, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

interface VerifiedSite {
  domain: string;
  httpStatus: number | null;
}
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
  backendError?: string | null;
  onOpenFaq?: () => void;
  onOpenPricing?: () => void;
}

export const SCAN_FOCUS_MESSAGES = [
  "First-impression communication",
  "Audience and positioning",
  "Value proposition",
  "Trust and next-step clarity",
] as const;

/** This is real network progress, NOT a clock-based simulated checklist. */
export const SCAN_STAGES = [
  { id: "verify", label: "Verify website connection" },
  { id: "analyze", label: "Analyze accessible page content" },
  { id: "ready", label: "Prepare clarity report" },
] as const;

const DIMENSIONS = [
  { title: "First Impression", icon: Eye },
  { title: "Audience", icon: Users },
  { title: "Value", icon: Sparkles },
  { title: "Trust", icon: ShieldCheck },
  { title: "Action", icon: MousePointerClick },
] as const;

function safeError(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "We could not complete this website scan. Please try again.";
  const message = raw.trim();
  if (!message || message.length > 320 ||
    /\b(?:API_KEY|Bearer\s|stack trace|TypeError|SyntaxError|ReferenceError|at\s+\S+\s+\()/i.test(message) ||
    message.startsWith("{") || message.includes("\n    at ")) {
    return "The website could not be analyzed right now. Please try again, or scan another public URL.";
  }
  return message;
}

function safeDomain(value: string): string {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").slice(0, 100);
  } catch {
    return value.replace(/^https?:\/\//i, "").split("/")[0].slice(0, 100);
  }
}

export default function ScanScreen({
  rawUrl, onBackToLanding, onCancel, onGoToResults, onRetry,
  isBackendReady = false, isVerifying = false, verifiedSite = null,
  backendError = null,
}: ScanScreenProps) {
  const reduceMotion = useReducedMotion();
  const hasTransitioned = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const hasError = Boolean(backendError);
  const phase = hasError ? "error" : isBackendReady ? "ready"
    : isVerifying || !verifiedSite ? "verify" : "analyze";
  const domain = useMemo(() => safeDomain(verifiedSite?.domain || rawUrl), [verifiedSite?.domain, rawUrl]);
  const cancel = onCancel || onBackToLanding;

  useEffect(() => {
    if (hasError || isBackendReady) return;
    const interval = window.setInterval(() => setElapsed(v => v + 1), 1000);
    return () => window.clearInterval(interval);
  }, [hasError, isBackendReady, rawUrl]);

  useEffect(() => {
    if (!isBackendReady || hasError || !onGoToResults || hasTransitioned.current) return;
    // The completion reveal appears only AFTER the real analysis response.
    const timer = window.setTimeout(() => {
      if (!hasTransitioned.current) {
        hasTransitioned.current = true;
        onGoToResults();
      }
    }, reduceMotion ? 180 : 1350);
    return () => window.clearTimeout(timer);
  }, [isBackendReady, hasError, onGoToResults, reduceMotion]);

  const openResults = () => {
    if (onGoToResults && !hasTransitioned.current) {
      hasTransitioned.current = true;
      onGoToResults();
    }
  };
  const retry = () => {
    hasTransitioned.current = false;
    setElapsed(0);
    if (onRetry) onRetry();
    else onBackToLanding();
  };
  const status = phase === "verify"
    ? "Checking that the website is reachable"
    : phase === "analyze"
      ? "Evaluating accessible website content"
      : phase === "ready"
        ? "Your clarity report is ready"
        : "The analysis could not be completed";
  const info = phase === "verify"
    ? "Establishing a secure connection before beginning analysis."
    : phase === "analyze"
      ? "Reviewing first-impression communication across five clarity dimensions."
      : phase === "ready"
        ? "Your five clarity scores are ready to explore."
        : safeError(backendError);

  const stageIndex = phase === "verify" ? 0 : phase === "analyze" ? 1 : phase === "ready" ? 3 : verifiedSite ? 1 : 0;
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#090D15] font-sans text-[#F1F5F9] antialiased">
      {/* Restrained product chrome, not a full-screen animation. */}
      <header className="relative z-20 border-b border-[#202C3E] bg-[#0B111C]/95">
        <div className="mx-auto flex h-[62px] w-full max-w-[1160px] items-center justify-between gap-3 px-4 sm:h-[70px] sm:px-7">
          <button type="button" onClick={() => { hasTransitioned.current = true; onBackToLanding(); }}
            className="inline-flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Return to StrangerLens home">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#354760] bg-[#162136] text-blue-300">
              <ScanLine className="h-[18px] w-[18px] stroke-[1.8]" aria-hidden="true" />
            </span>
            <span className="truncate text-[15px] font-bold tracking-tight sm:text-base">StrangerLens</span>
            <span className="hidden text-sm text-[#6F86A3] sm:inline">/ Analysis</span>
          </button>
          <button type="button" onClick={() => { hasTransitioned.current = true; cancel(); }}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#2C3B50] px-3.5 text-xs font-semibold text-[#B3C2D4] transition hover:border-[#4A6280] hover:bg-[#182337] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <X className="h-3.5 w-3.5" aria-hidden="true"/> Cancel scan
          </button>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-[1160px] flex-1 flex-col px-4 pb-8 pt-7 sm:px-7 sm:pb-12 sm:pt-11">
        {/* Site context row: real URL identity, no fabricated preview screenshot. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#30425B] bg-[#121E2F] text-[#B8CBE1]">
              <Globe2 className="h-5 w-5 stroke-[1.7]" aria-hidden="true"/>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#F1F5F9]" title={domain}>{domain || "Website"}</p>
              <p className="mt-0.5 text-xs text-[#8298B4]">Website under review</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${phase === "error" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : phase === "ready" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-blue-500/30 bg-blue-500/10 text-blue-300"}`}>
            {phase === "error" ? <AlertCircle className="h-3.5 w-3.5"/> : phase === "ready" ? <CheckCircle2 className="h-3.5 w-3.5"/> :
              <LoaderCircle className={`h-3.5 w-3.5 ${reduceMotion ? "" : "animate-spin"}`}/>}
            {phase === "error" ? "Check failed" : phase === "ready" ? "Report ready" : phase === "verify" ? "Connecting" : "Analyzing"}
          </div>
        </div>

        {/* Bold but utilitarian visual hierarchy. */}
        <div className="mt-8 max-w-[710px] sm:mt-11">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">StrangerLens / First-impression review</p>
          <h1 className="mt-3 text-[clamp(27px,4vw,46px)] font-bold leading-[1.13] tracking-[-0.035em] text-white">
            {phase === "error" ? "Your scan needs attention."
              : phase === "ready" ? "Your clarity report is ready."
              : "Building your clarity report."}
          </h1>
          <p className="mt-3 max-w-[610px] text-[14px] leading-relaxed text-[#A5B8CE] sm:text-base">
            {phase === "error" ? "We couldn't finish this check. Nothing has been charged."
              : phase === "ready" ? "See what first-time visitors can understand, and where your website could communicate more clearly."
              : "A focused assessment of what your website says, who it speaks to, and how clearly it guides a new visitor."}
          </p>
        </div>

        <div className="mt-7 grid min-w-0 gap-4 md:mt-9 md:grid-cols-[minmax(0,1.42fr)_minmax(280px,1fr)] md:gap-5">
          {/* Focus inspection schematic. No pretend website screenshot or fake content. */}
          <section aria-label="Visual analysis illustration"
            className="relative flex min-h-[245px] flex-col overflow-hidden rounded-[22px] border border-[#2A3C53] bg-[#101A2A] p-4 shadow-[0_26px_65px_-48px_rgba(20,95,224,0.5)] sm:min-h-[330px] sm:p-6">
            <div className="pointer-events-none absolute inset-0 opacity-[0.20]"
              style={{ backgroundImage: "linear-gradient(#334968 1px, transparent 1px), linear-gradient(90deg, #334968 1px, transparent 1px)", backgroundSize: "34px 34px", maskImage: "linear-gradient(to bottom, transparent, black)" }} />
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#96AED0]">
                <Code2 className="h-4 w-4" aria-hidden="true"/> Communication map
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7C95B6]">Schematic preview</span>
            </div>

            <div className="relative mx-auto mt-5 w-full max-w-[480px] flex-1 sm:mt-8">
              <div className="relative overflow-hidden rounded-[13px] border border-[#3A516D] bg-[#152236] p-3.5 shadow-[0_15px_38px_rgba(0,0,0,.3)] sm:p-5">
                <div className="flex items-center gap-1.5 border-b border-[#33475E] pb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5E7698]"/>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5E7698]"/>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5E7698]"/>
                  <span className="ml-3 h-2 w-20 rounded bg-[#2F4560]"/>
                </div>
                <div className="space-y-3 py-5 sm:py-7">
                  <div className="h-2.5 w-20 rounded bg-[#2C405B]"/>
                  <div className="h-3.5 w-[80%] rounded bg-[#D4E7FF]/60"/>
                  <div className="h-3.5 w-[55%] rounded bg-[#A8C5E8]/35"/>
                  <div className="space-y-1.5 pt-1.5">
                    <div className="h-2 w-[92%] rounded bg-[#30455F]"/>
                    <div className="h-2 w-[72%] rounded bg-[#30455F]"/>
                    <div className="h-2 w-[81%] rounded bg-[#30455F]"/>
                  </div>
                  <div className="flex items-center gap-3 pt-1.5">
                    <div className="h-8 w-[95px] rounded-lg bg-[#296CE0]"/>
                    <div className="h-2 w-14 rounded bg-[#3A4D65]"/>
                  </div>
                </div>
                {phase !== "error" && !reduceMotion && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 h-[2px] bg-gradient-to-r from-transparent via-[#71B4FF] to-transparent shadow-[0_0_20px_rgba(87,162,255,.9)]"
                    initial={{ top: "16%" }}
                    animate={{ top: phase === "ready" ? "88%" : ["16%", "87%", "16%"] }}
                    transition={{ duration: phase === "ready" ? 0.45 : 4.2, repeat: phase === "ready" ? 0 : Infinity, ease: "easeInOut" }}
                  />
                )}
                {phase === "ready" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#14283C]/55 backdrop-blur-[2px]">
                    <motion.div initial={reduceMotion ? false : { scale: 0.87, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/35 bg-[#193D37] text-emerald-300">
                      <Check className="h-8 w-8" strokeWidth={2.5}/>
                    </motion.div>
                  </div>
                )}
                {phase === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#182031]/75 backdrop-blur-sm">
                    <AlertCircle className="h-10 w-10 text-rose-300" aria-hidden="true"/>
                  </div>
                )}
              </div>
              <p className="mt-3 text-center text-[11px] text-[#8199B7]">An abstract page layout · not your live website screenshot</p>
            </div>

            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#304258] pt-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[#C3D3E6]">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${phase === "error" ? "bg-rose-400" : phase === "ready" ? "bg-emerald-400" : "bg-blue-400"}`}/>
                {phase === "verify" ? "Verifying the website" : phase === "analyze" ? "First-impression analysis" : phase === "ready" ? "Analysis complete" : "Analysis paused"}
              </div>
              <span className="text-[11px] tabular-nums text-[#8399B3]">
                {phase === "ready" ? "Complete" : `${Math.floor(elapsed / 60).toString().padStart(2,"0")}:${(elapsed % 60).toString().padStart(2,"0")} elapsed`}
              </span>
            </div>
          </section>

          {/* True backend transitions only: no timer-driven completion promises. */}
          <section className="flex flex-col rounded-[22px] border border-[#2A3C53] bg-[#111B2A] p-4 sm:p-6" aria-labelledby="session-status-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="session-status-title" className="text-[11px] font-bold uppercase tracking-[.13em] text-[#9DB2CC]">Session status</h2>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#748FAB]">
                <Circle className="h-2.5 w-2.5 fill-current"/> Live status
              </span>
            </div>
            <div className="mt-6 space-y-6">
              {SCAN_STAGES.map((item, index) => {
                const complete = phase !== "error" && (index < stageIndex || phase === "ready");
                const active = phase !== "error" && index === stageIndex && phase !== "ready";
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${complete ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300" : active ? "border-blue-500/45 bg-blue-500/10 text-blue-300" : "border-[#33455F] bg-[#192536] text-[#697F9D]"}`}>
                      {complete ? <Check className="h-4 w-4" aria-hidden="true"/> : active ?
                        <LoaderCircle className={`h-3.5 w-3.5 ${reduceMotion ? "" : "animate-spin"}`} aria-hidden="true"/> :
                        <span className="h-1.5 w-1.5 rounded-full bg-current"/>}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className={`text-sm font-semibold ${complete || active ? "text-white" : "text-[#839AB6]"}`}>{item.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#8297B1]">
                        {index === 0 ? complete && verifiedSite ? `Confirmed: ${verifiedSite.domain}` : "Reachability and URL verification"
                          : index === 1 ? complete ? "Analysis response received" : active ? "Evaluating five clarity dimensions" : "Waiting for verified website"
                          : complete ? "Results ready to view" : "Waiting for analysis"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto border-t border-[#2B3D54] pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#87A3C4]">Current status</p>
              <p className="mt-2 text-sm font-semibold text-white" aria-hidden="true">{status}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#A2B4C9]">{info}</p>
            </div>
          </section>
        </div>

        {/* Honest assessment scope, instead of pretending individual signals already completed. */}
        <section className="mt-5 rounded-[20px] border border-[#293B52] bg-[#101928] px-4 py-4 sm:px-6" aria-labelledby="assessment-areas-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="assessment-areas-title" className="text-[11px] font-bold uppercase tracking-[.13em] text-[#9BAFCA]">Assessment areas</h2>
            <span className="text-[11px] text-[#7991AE]">Five clarity dimensions</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {DIMENSIONS.map(({title, icon: Icon}) => (
              <div key={title} className="flex min-h-11 items-center gap-2.5 rounded-xl border border-[#304359] bg-[#172436] px-3 py-2.5 text-xs font-medium text-[#C9D8EA]">
                <Icon className="h-4 w-4 shrink-0 text-[#80A6DA]" strokeWidth={1.8} aria-hidden="true"/>
                <span>{title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Failure handling must be actionable and never imply a successful scan. */}
        {phase === "error" && (
          <div className="mt-5 rounded-[20px] border border-rose-500/30 bg-rose-500/[.07] p-4 sm:p-5" role="alert">
            <p className="text-sm font-semibold text-rose-200">Unable to complete the scan</p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#DFC0C5]">{safeError(backendError)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={retry}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#246BFD] px-5 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                <RotateCcw className="h-4 w-4" aria-hidden="true"/> Retry analysis
              </button>
              <button type="button" onClick={onBackToLanding}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#415371] bg-[#1B273A] px-5 text-sm font-semibold text-white hover:bg-[#263651] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                <ArrowLeft className="h-4 w-4" aria-hidden="true"/> Change website
              </button>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex flex-col gap-3 rounded-[20px] border border-emerald-500/30 bg-[#102824] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            aria-label="Report ready">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true"/>
              <div>
                <p className="text-sm font-bold text-white">Your free clarity report is ready</p>
                <p className="mt-1 text-xs leading-relaxed text-[#A8CBC2]">Overall clarity and five independent signals, with the option to explore details.</p>
              </div>
            </div>
            <button type="button" onClick={openResults}
              className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#246BFD] px-5 text-sm font-bold text-white shadow-[0_8px_25px_rgba(36,107,253,.2)] hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:w-auto">
              View My Clarity Report <ArrowRight className="h-4 w-4" aria-hidden="true"/>
            </button>
          </motion.section>
        )}

        {phase !== "ready" && phase !== "error" && (
          <p className="mt-5 flex items-center gap-2 text-xs leading-relaxed text-[#8298B2]">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true"/>
            {elapsed >= 35 ? "This website is taking longer than usual. Analysis is still in progress; no time remaining is guaranteed."
              : "Live website checks can take some time. We'll open your report automatically when it is ready."}
          </p>
        )}
        <span className="sr-only" role="status" aria-live="polite">{status}</span>
      </main>
      <footer className="border-t border-[#1D293A] bg-[#0B111C] px-4 py-4 text-center text-[11px] text-[#8297B1]">
        First Impression · Audience · Value · Trust · Action
        <span className="mx-2 text-[#354861]">•</span>
        Based on accessible public website content
      </footer>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, Globe2, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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

function safeError(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "We couldn't complete this inspection. Please try again.";
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
    return new URL(/^https?:\/\//i.test(value) ? value : "https://" + value).hostname.replace(/^www\./, "").slice(0, 90);
  } catch {
    return value.replace(/^https?:\/\//i, "").split("/")[0].slice(0, 90);
  }
}

function clock(seconds: number): string {
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}

/**
 * Mirrors the actual VYLENS inspect.html experience: one centered focus, a
 * scanning beam over the brand mark, subtle indeterminate activity and a single
 * changing message. No fake percent, milestones list or time-based completion.
 *
 * Backend remains the only authority on report readiness and navigation.
 */
export default function ScanScreen({
  rawUrl, onBackToLanding, onCancel, onGoToResults, onRetry,
  isBackendReady = false, isVerifying = false, verifiedSite = null,
  scanMilestone = "connecting", backendError = null,
}: ScanScreenProps) {
  const reduceMotion = useReducedMotion();
  const transitioned = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [showLongWait, setShowLongWait] = useState(false);
  const isError = Boolean(backendError);
  const isReady = Boolean(isBackendReady && !isError);
  const domain = useMemo(() => hostname(verifiedSite?.domain || rawUrl), [verifiedSite?.domain, rawUrl]);

  // The clock measures actual elapsed time. It never drives completion or a percentage.
  useEffect(() => {
    if (isError || isReady) return;
    const started = Date.now();
    setElapsed(0);
    setShowLongWait(false);
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      setElapsed(seconds);
      setShowLongWait(seconds >= 35);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rawUrl, isError, isReady]);

  // The parent controller invokes this only after it has persisted a real report.
  useEffect(() => {
    if (!isReady || !onGoToResults || transitioned.current) return;
    const timeout = window.setTimeout(() => {
      if (!transitioned.current) {
        transitioned.current = true;
        onGoToResults();
      }
    }, reduceMotion ? 100 : 620);
    return () => window.clearTimeout(timeout);
  }, [isReady, onGoToResults, reduceMotion]);

  const stop = () => {
    transitioned.current = true;
    (onCancel || onBackToLanding)();
  };
  const retry = () => {
    transitioned.current = false;
    setElapsed(0);
    setShowLongWait(false);
    if (onRetry) onRetry();
    else onBackToLanding();
  };
  const openReport = () => {
    if (!isReady || !onGoToResults || transitioned.current) return;
    transitioned.current = true;
    onGoToResults();
  };

  const hasConnection = Boolean(verifiedSite);
  const stage = isReady ? "ready" : isError ? "error" : !hasConnection || isVerifying ? "verify" :
    scanMilestone === "signals_evaluated" ? "prepare" :
    scanMilestone === "content_inspected" ? "evaluate" : "inspect";
  // VYLENS-style quiet heartbeat: message variation is informational only.
  // The animation never advances the backend state, percent or completion.
  const heartbeat = Math.floor(elapsed / 9);
  const copy = stage === "ready"
    ? { title: "Your report is ready.", description: "Opening your clarity report and findings." }
    : stage === "verify"
    ? { title: "Taking a closer look.", description: "Connecting to your public website." }
    : stage === "inspect"
    ? { title: "Understanding your website.", description: "Reviewing what your visitors can see and the next steps your page presents." }
    : stage === "evaluate"
    ? { title: "Looking through fresh eyes.", description: "Evaluating the clarity of your message, audience, trust and next step." }
    : stage === "prepare"
    ? { title: "Preparing your report.", description: "Organizing inspected evidence into a clear, useful overview." }
    : { title: "Couldn't finish this one.", description: safeError(backendError) };

  const displayCopy = stage === "verify" && heartbeat >= 1
    ? { title: "Connecting to the public page.", description: "Some websites take a moment to respond. We're still checking availability." }
    : stage === "inspect" && heartbeat > 0
    ? heartbeat % 2
      ? { title: "Looking for a clearer message.", description: "Reviewing the accessible content and what it communicates to somebody new." }
      : { title: "Still taking a closer look.", description: "Checking the available website content without guessing about real visitors." }
    : copy;
  const copyKey = stage + "-" + (stage === "inspect" || stage === "verify" ? heartbeat : "0");

  return (
    <div className="sl-scan-v2" data-scan-state={stage}>
      <a className="sl-scan-skip" href="#scan-content">Skip to analysis</a>
      <header className="sl-scan-header">
        <nav className="sl-scan-header-inner" aria-label="Analysis navigation">
          <button className="sl-scan-brand" type="button" onClick={stop} aria-label="StrangerLens home">
            <BrandMark className="sl-scan-header-logo" />
            <span>StrangerLens<b>.</b></span>
          </button>
          <span className="sl-scan-nav-title">YOUR ANALYSIS</span>
          <button type="button" className="sl-scan-close" onClick={stop}>
            <span>Exit</span><X size={17} aria-hidden="true" />
          </button>
        </nav>
      </header>

      <main id="scan-content" className="sl-scan-main">
        {isError ? (
          <section className="sl-scan-error" role="alert" aria-labelledby="sl-scan-error-title">
            <span className="sl-scan-error-symbol"><AlertCircle size={31} aria-hidden="true" /></span>
            <span className="sl-scan-error-eyebrow">INSPECTION PAUSED</span>
            <h1 id="sl-scan-error-title">Couldn't finish this one.</h1>
            <p>{safeError(backendError)}</p>
            <div className="sl-scan-error-actions">
              <button type="button" onClick={retry} className="sl-scan-retry">
                Try again <ArrowUpRight size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={onBackToLanding} className="sl-scan-reset">Start over</button>
            </div>
          </section>
        ) : (
          <section className="sl-scan-running" aria-label="Website inspection in progress">
            <div className="sl-scan-status-row">
              <div className="sl-scan-eyebrow">
                <span className="sl-scan-live-dot" aria-hidden="true" />
                {isReady ? "ANALYSIS COMPLETE" : "STRANGERLENS IS LOOKING CLOSER"}
              </div>
              {!isReady && <span className="sl-scan-elapsed" role="timer" aria-label="Time spent scanning">{clock(elapsed)}</span>}
            </div>

            <div className="sl-scan-lens-scene" aria-hidden="true">
              <div className="sl-scan-lens-stage">
                <div className="sl-scan-lens-identity">
                  <BrandMark className="sl-scan-hero-logo" />
                </div>
                {!isReady && !reduceMotion && <span className="sl-scan-lens-beam" />}
              </div>
              <span className="sl-scan-progress-track"><span className={"sl-scan-progress-indicator" + (isReady ? " is-ready" : "")}/></span>
            </div>

            <AnimatePresence initial={false} mode="wait">
              <motion.div key={copyKey} className="sl-scan-copy"
                role="status" aria-live="polite" aria-atomic="true"
                initial={reduceMotion ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, y: -7 }}
                transition={{ duration: reduceMotion ? 0 : 0.24, ease: "easeOut" }}>
                <h1>{displayCopy.title.replace(/\.$/, "")}<span>.</span></h1>
                <p>{displayCopy.description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="sl-scan-subject" aria-label="Current inspection">
              <span className="sl-scan-subject-symbol"><Globe2 size={20} aria-hidden="true" /></span>
              <div className="sl-scan-subject-details">
                <span>WEBSITE ANALYSIS</span>
                <strong title={domain}>{domain || "Your website"}</strong>
              </div>
              <span className={isReady ? "sl-scan-subject-ready" : "sl-scan-subject-activity"} aria-hidden="true">
                {isReady ? "✓" : <><i/><i/><i/></>}
              </span>
            </div>

            {showLongWait && !isReady &&
              <p className="sl-scan-quiet">Still looking. Some public websites take longer to inspect.</p>}
            {isReady && <button type="button" onClick={openReport} className="sl-scan-open-report">
              Open my report <ArrowUpRight size={17} aria-hidden="true" />
            </button>}
          </section>
        )}
      </main>
      <footer className="sl-scan-footer">
        <span>© {new Date().getFullYear()} StrangerLens</span>
        <span>Website clarity, viewed from the outside.</span>
        <span>Public content analysis</span>
      </footer>
    </div>
  );
}

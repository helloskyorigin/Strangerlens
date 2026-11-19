"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowUpRight, Check, CheckCircle2, Circle, Globe2, LoaderCircle, RotateCcw, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
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
  { id: "verify", label: "Website connection verified", detail: "Confirming the public page can be reached." },
  { id: "content", label: "Public website content inspected", detail: "Reading accessible headings, offers and navigation." },
  { id: "signals", label: "Communication and trust cues evaluated", detail: "Considering the five clarity signals." },
  { id: "report", label: "Your clarity report prepared", detail: "Making the result ready to review." },
] as const;

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
    return new URL(/^https?:\/\//i.test(value) ? value : "https://" + value).hostname.replace(/^www\./, "").slice(0, 90);
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
    const interval = window.setInterval(() => setElapsed(v => v + 1), 1000);
    return () => window.clearInterval(interval);
  }, [backendError, isBackendReady, rawUrl]);

  // Only a real backend report-ready event can open results, never a timer-based fake completion.
  useEffect(() => {
    if (!isBackendReady || backendError || !onGoToResults || transitioned.current) return;
    const timeout = window.setTimeout(() => {
      if (!transitioned.current) {
        transitioned.current = true;
        onGoToResults();
      }
    }, reduceMotion ? 100 : 850);
    return () => window.clearTimeout(timeout);
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

  const lastConfirmed = scanMilestone === "report_ready" ? 4 :
    scanMilestone === "signals_evaluated" ? 3 :
    scanMilestone === "content_inspected" ? 2 :
    verifiedSite ? 1 : 0;
  const completeCount = phase === "ready" ? 4 : lastConfirmed;
  const active = phase === "error" || phase === "ready" ? -1 : Math.min(completeCount, 3);
  const currentStep = phase === "verify" ? "Connecting to your website." :
    phase === "read" ? "Reading your website's message." :
    phase === "evaluate" ? "Looking through a stranger's eyes." :
    phase === "prepare" ? "Preparing your clarity report." :
    phase === "ready" ? "Your report is ready." : "We couldn't finish this scan.";
  const description = phase === "verify" ? "First, we're checking that the public website is reachable." :
    phase === "read" ? "Reading the content people encounter before they know anything about your business." :
    phase === "evaluate" ? "Assessing what the page explains about its audience, value, trust and next step." :
    phase === "prepare" ? "Organizing the findings into a practical first-impression report." :
    phase === "ready" ? "Your outside perspective is ready to explore." :
    safeError(backendError);

  return (
    <div className="sl-scan-v2" data-scan-state={phase}>
      <a className="sl-scan-skip" href="#scan-content">Skip to scan progress</a>
      <header className="sl-scan-header">
        <div className="sl-scan-header-inner">
          <button type="button" onClick={() => { transitioned.current = true; onBackToLanding(); }}
            className="sl-scan-brand" aria-label="Return to StrangerLens home">
            <BrandMark className="sl-scan-header-logo" />
            <span>StrangerLens<span className="sl-scan-brand-dot">.</span></span>
          </button>
          <div className="sl-scan-header-actions">
            <span className={"sl-scan-status-pill" + (phase === "error" ? " is-error" : phase === "ready" ? " is-ready" : "")}>
              <span className="sl-scan-status-dot" aria-hidden="true" />
              {phase === "error" ? "SCAN INTERRUPTED" : phase === "ready" ? "REPORT READY" : "ANALYSIS IN PROGRESS"}
            </span>
            <button type="button" onClick={stop} className="sl-scan-close" aria-label="Cancel scan and return home">
              <X size={18} aria-hidden="true"/><span>Cancel</span>
            </button>
          </div>
        </div>
      </header>

      <main id="scan-content" className="sl-scan-main">
        <div className="sl-scan-intro max-w-[620px]">
          <div className="sl-scan-eyebrow"><span/> A DIFFERENT PERSPECTIVE</div>
          <h1>{currentStep}</h1>
          <p>{description}</p>
          <div className="sl-scan-domain" title={domain}>
            <Globe2 size={16} aria-hidden="true" />
            <span>{domain || "Website"}</span>
            {verifiedSite && <CheckCircle2 size={16} className="sl-scan-domain-check" aria-label="Website verified" />}
          </div>
        </div>

        <section className="sl-scan-workspace" aria-label="Scan progress">
          <div className="sl-scan-illustration">
            <div className="sl-scan-orbit" aria-hidden="true">
              <div className="sl-scan-orbit-ring sl-scan-orbit-ring-outer"/>
              <div className="sl-scan-orbit-ring sl-scan-orbit-ring-inner"/>
              {phase !== "error" && phase !== "ready" && !reduceMotion &&
                <motion.div className="sl-scan-orbit-track" animate={{ rotate: 360 }}
                  transition={{ duration: 7.5, repeat: Infinity, ease: "linear" }}>
                  <span />
                </motion.div>}
              <motion.div className="sl-scan-orbit-logo"
                animate={reduceMotion || phase === "error" || phase === "ready" ? {} : { y: [0, -3, 0] }}
                transition={{ duration: 3.3, repeat: Infinity, ease: "easeInOut" }}>
                <BrandMark className="sl-scan-hero-logo" />
              </motion.div>
              {phase === "error" &&
                <span className="sl-scan-orbit-state is-error"><AlertCircle size={22} aria-label="Scan interrupted"/></span>}
              {phase === "ready" &&
                <span className="sl-scan-orbit-state is-ready"><Check size={23} aria-label="Scan complete"/></span>}
            </div>
            <div className="sl-scan-illustration-meta">
              <span className="sl-scan-meta-label">{phase === "ready" ? "REVIEW COMPLETE" : phase === "error" ? "SCAN PAUSED" : "STRANGERLENS / LIVE CHECK"}</span>
              <strong>{phase === "ready" ? "Fresh perspective, ready." : phase === "error" ? "Couldn't complete the review." : "Seeing what your page communicates."}</strong>
              <p>{phase === "error" ? "Your website may be unavailable or the scan may have run into a temporary problem." :
                phase === "ready" ? "Explore your results to see the clarity scores and next steps." :
                  "Based on the public content we can actually inspect."}</p>
            </div>
            <div className="sl-scan-live-indicator" aria-hidden="true">
              <span className={phase === "error" ? "is-error" : phase === "ready" ? "is-complete" : ""}/>
              {phase === "ready" ? "Complete" : phase === "error" ? "Interrupted" : "Checking"}
            </div>
          </div>

          <div className="sl-scan-details">
            <div className="sl-scan-details-header">
              <div>
                <span className="sl-scan-section-label">YOUR WEBSITE REVIEW</span>
                <h2>{phase === "ready" ? "All checks complete" : phase === "error" ? "Scan progress" : "Finding the gaps"}</h2>
              </div>
              <span className="sl-scan-completed-count">{completeCount}<span> / 4</span></span>
            </div>
            <div className="sl-scan-progress-track" role="progressbar" aria-label="Confirmed scan stages completed"
              aria-valuemin={0} aria-valuemax={4} aria-valuenow={completeCount}>
              <span style={{ width: String((completeCount / 4) * 100) + "%" }}/>
            </div>
            <ol className="sl-scan-stages">
              {SCAN_STAGES.map((stage, index) => {
                const complete = index < completeCount;
                const running = index === active;
                return <li key={stage.id} className={"sl-scan-stage" + (complete ? " is-complete" : running ? " is-running" : "")}>
                  <span className="sl-scan-stage-icon">
                    {complete ? <Check size={17} aria-hidden="true" /> :
                      running ? <LoaderCircle size={17} className={reduceMotion ? "" : "sl-scan-spinner"} aria-hidden="true"/> :
                      <Circle size={11} aria-hidden="true" />}
                  </span>
                  <div className="sl-scan-stage-copy"><strong>{stage.label}</strong><span>{stage.detail}</span></div>
                  <span className="sl-scan-stage-state">{complete ? "Done" : running ? "Now" : ""}</span>
                </li>;
              })}
            </ol>
            {phase !== "ready" && phase !== "error" && (
              <div className="sl-scan-current-note">
                <span className="sl-scan-current-dot" aria-hidden="true" />
                {elapsed > 35 ? "Still working. Some public sites take longer to inspect." :
                  phase === "verify" ? "Waiting for the website connection..." :
                  phase === "read" ? SCAN_FOCUS_MESSAGES[0] :
                  phase === "evaluate" ? SCAN_FOCUS_MESSAGES[1] :
                  SCAN_FOCUS_MESSAGES[3]}
              </div>
            )}
          </div>
        </section>

        {phase === "error" && (
          <section role="alert" className="sl-scan-response sl-scan-error">
            <div className="sl-scan-response-title"><AlertCircle size={19} aria-hidden="true"/> We couldn't finish this check</div>
            <p>{safeError(backendError)}</p>
            <div className="sl-scan-response-actions">
              <button type="button" onClick={restart} className="sl-scan-button sl-scan-button-primary">
                <RotateCcw size={17} aria-hidden="true"/> Try again
              </button>
              <button type="button" onClick={onBackToLanding} className="sl-scan-button sl-scan-button-secondary">
                <ArrowLeft size={17} aria-hidden="true"/> Use another URL
              </button>
            </div>
          </section>
        )}
        {phase === "ready" && (
          <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }} className="sl-scan-response sl-scan-ready">
            <button type="button" onClick={showReport} className="sl-scan-button sl-scan-button-primary">
              Open my report <ArrowUpRight size={18} aria-hidden="true"/>
            </button>
          </motion.section>
        )}
        {phase !== "error" && phase !== "ready" && (
          <p className="sl-scan-bottom-note">
            Only confirmed scan stages advance above. <span>We're checking accessible public content, not recording visitors.</span>
          </p>
        )}
        <span className="sl-scan-sr-only" role="status" aria-live="polite">
          {phase === "verify" ? "Verifying website connection" :
            phase === "read" ? "Website verified; inspecting accessible website content" :
            phase === "evaluate" ? "Public content inspected; evaluating clarity signals" :
            phase === "prepare" ? "Clarity signals evaluated; preparing report" :
            phase === "ready" ? "Clarity report ready" : "Website scan failed"}
        </span>
      </main>
      <footer className="sl-scan-footer">
        <span>© {new Date().getFullYear()} StrangerLens</span>
        <span>See your website through a stranger's eyes.</span>
      </footer>
    </div>
  );
}

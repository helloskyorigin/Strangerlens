"use client";

import React from "react";
import { ArrowUpRight, Check, LockKeyhole } from "lucide-react";

/**
 * Fictional display data, showing the actual result screen's five-signal format.
 * Never imply this is measured traffic, a customer testimonial or a real audit.
 */
const previewSignals = [
  { name: "First Impression", score: 68, tone: "amber", status: "Needs work", detail: "The opening message could be more specific." },
  { name: "Audience", score: 62, tone: "amber", status: "Needs work", detail: "It's not immediately clear who this is for." },
  { name: "Value", score: 54, tone: "red", status: "Weak", detail: "The main benefit needs a clearer explanation." },
  { name: "Trust", score: 74, tone: "good", status: "Good", detail: "Some helpful reassurance is visible." },
  { name: "Action", score: 82, tone: "good", status: "Good", detail: "The next step is easy to find." },
] as const;

export default function LandingResultPreview() {
  return <aside className="slr-live-demo" aria-label="Illustrative StrangerLens result preview">
    <div className="slr-live-demo-top">
      <span className="slr-live-demo-label"><span className="slr-live-demo-dot" aria-hidden="true"/> YOUR RESULT, AT A GLANCE</span>
      <span className="slr-live-demo-tag">Example only</span>
    </div>
    <div className="slr-live-demo-score">
      <span className="slr-live-demo-kicker">WEBSITE CLARITY SCORE</span>
      <div className="slr-live-demo-scoreline">
        <strong>68<span>/100</span></strong>
        <span className="slr-live-demo-score-status">Needs improvement</span>
      </div>
      <p>A clear starting point. Some parts of the message need more work.</p>
      <span className="slr-live-demo-domain">sample-website.example</span>
    </div>
    <div className="slr-live-demo-signals">
      <div className="slr-live-demo-signals-head">
        <strong>Your Clarity Signals<span className="slr-live-demo-title-dot">.</span></strong>
        <span>5 signals</span>
      </div>
      <div className="slr-live-demo-list">
        {previewSignals.map(item =>
          <div className="slr-live-demo-row" key={item.name}>
            <div className="slr-live-demo-row-head">
              <strong>{item.name}</strong>
              <span className="slr-live-demo-row-score">{item.score}</span>
              <span className={`slr-live-demo-status slr-live-demo-status--${item.tone}`}>{item.status}</span>
            </div>
            <div className="slr-live-demo-meter" aria-label={`${item.name}: ${item.score} out of 100`}>
              <span className={`slr-live-demo-fill slr-live-demo-fill--${item.tone}`} style={{ width: `${item.score}%` }}/>
            </div>
            <p>{item.detail}</p>
          </div>)}
      </div>
    </div>
    <div className="slr-live-demo-unlock">
      <span className="slr-live-demo-lock"><LockKeyhole size={16} aria-hidden="true"/></span>
      <span><strong>Know exactly what to work on next.</strong><small>Deeper findings, suggested fixes and rewrites in the $9 report.</small></span>
      <ArrowUpRight size={18} aria-hidden="true"/>
    </div>
    <div className="slr-live-demo-foot"><Check size={13} aria-hidden="true"/> Illustrative example, not a live scan or actual visitor data.</div>
  </aside>;
}

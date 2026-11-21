"use client";

import React from "react";


/**
 * Fictional display data, showing the actual result screen's five-signal format.
 * Never imply this is measured traffic, a customer testimonial or a real audit.
 */
const previewSignals = [
  { name: "First Impression", score: 57, tone: "amber", status: "Needs work", detail: "What does this website actually promise me?" },
  { name: "Audience", score: 43, tone: "red", status: "Weak", detail: "Is this even meant for someone like me?" },
  { name: "Value", score: 36, tone: "red", status: "Weak", detail: "Why should I care instead of leaving?" },
  { name: "Trust", score: 73, tone: "good", status: "Good", detail: "There is proof here. That part feels reassuring." },
  { name: "Action", score: 66, tone: "amber", status: "Needs work", detail: "I see the button, but what happens next?" },
] as const;

export default function LandingResultPreview() {
  return <aside className="slr-live-demo" aria-label="Illustrative StrangerLens result preview">
    <div className="slr-live-demo-top">
      <span className="slr-live-demo-label"><span className="slr-live-demo-dot" aria-hidden="true"/> YOUR RESULT, AT A GLANCE</span>
      <span className="slr-live-demo-tag">Sample report</span>
    </div>
    <div className="slr-live-demo-score">
      <span className="slr-live-demo-kicker">WEBSITE CLARITY SCORE</span>
      <div className="slr-live-demo-scoreline">
        <strong>55<span>/100</span></strong>
        <span className="slr-live-demo-score-status">Needs improvement</span>
      </div>
      <p>Looks polished. But would a first-time visitor understand enough to stay?</p>
      <span className="slr-live-demo-domain">sample-site.example</span>
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
              <span className="slr-live-demo-row-score" style={{ color: "#D9FF9B", backgroundColor: "#24331C" }}>{item.score}</span>
              <span className={`slr-live-demo-status slr-live-demo-status--${item.tone}`}>{item.status}</span>
            </div>
            <div className="slr-live-demo-meter" aria-label={`${item.name}: ${item.score} out of 100`}>
              <span className={`slr-live-demo-fill slr-live-demo-fill--${item.tone}`} style={{ width: `${item.score}%` }}/>
            </div>
            <p className="slr-live-demo-visitor-thought">{item.detail}</p>
          </div>)}
      </div>
    </div>
    <div className="slr-live-demo-foot">Illustrative scores only. Your results depend on your own website.</div>
    
  </aside>;
}

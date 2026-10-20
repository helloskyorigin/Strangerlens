"use client";

import React, { useState } from "react";
import { ArrowUpRight, CheckCircle2, Eye, LockKeyhole, MousePointerClick, ShieldCheck, Sparkles, Users } from "lucide-react";

const SIGNALS = [
  { id: "impression", label: "First Impression", score: 85, status: "Clear", Icon: Eye,
    heading: "Your first five seconds matter.",
    body: "A first-time visitor should quickly understand what the page offers and why they should continue reading.",
    question: "What does the headline communicate immediately?" },
  { id: "audience", label: "Audience", score: 58, status: "Partly clear", Icon: Users,
    heading: "Who is this really for?",
    body: "Strong positioning makes the intended audience recognizable. Vague targeting can leave visitors guessing.",
    question: "Does the page explicitly identify the intended visitor?" },
  { id: "value", label: "Value", score: 72, status: "Understandable", Icon: Sparkles,
    heading: "Make the outcome concrete.",
    body: "Clear benefits help visitors distinguish a product's promise from general feature descriptions.",
    question: "Is the practical benefit easy to recognize?" },
  { id: "trust", label: "Trust", score: 30, status: "Needs work", Icon: ShieldCheck,
    heading: "Credibility deserves its own review.",
    body: "Check whether claims have visible support and whether visitors have enough context to feel confident.",
    question: "Which trust cues are visible on the page?" },
  { id: "action", label: "Action", score: 90, status: "Clear", Icon: MousePointerClick,
    heading: "The next step should feel obvious.",
    body: "An understandable call to action helps visitors know where to go without guessing what happens next.",
    question: "Is the action clear and easy to find?" },
] as const;

export default function InteractiveReportPreview() {
  const [selected, setSelected] = useState<(typeof SIGNALS)[number]["id"]>("audience");
  const active = SIGNALS.find(x => x.id === selected) || SIGNALS[0];
  const ActiveIcon = active.Icon;
  return (
    <div className="sl-demo" aria-label="Interactive example clarity report">
      <div className="sl-demo-header">
        <div className="sl-demo-identity">
          <span className="sl-demo-glyph"><Sparkles size={17} aria-hidden="true"/></span>
          <div>
            <p className="sl-demo-heading">Explore a Clarity Report</p>
            <p className="sl-demo-subtitle">Tap a signal to see what it evaluates.</p>
          </div>
        </div>
        <span className="sl-demo-overall">Example Score: 69/100</span>
      </div>
      <p className="sl-demo-disclaimer">Illustrative scores and guidance only — not a real customer report.</p>
      <div className="sl-demo-layout">
        <div className="sl-demo-signal-list" role="tablist" aria-label="Example clarity signals">
          {SIGNALS.map(item => (
            <button key={item.id} id={`demo-tab-${item.id}`} role="tab" type="button"
              aria-selected={selected === item.id} aria-controls="sl-example-detail"
              onClick={() => setSelected(item.id)}
              className={`sl-demo-signal ${selected === item.id ? "is-selected" : ""}`}>
              <span className="sl-demo-signal-name">{item.label}</span>
              <span className="sl-demo-signal-score">{item.score}/100</span>
              <span className="sl-demo-track"><span className="sl-demo-fill" style={{ width: `${item.score}%` }}/></span>
            </button>
          ))}
        </div>
        <section id="sl-example-detail" className="sl-demo-detail" role="tabpanel"
          aria-labelledby={`demo-tab-${active.id}`}>
          <div className="sl-demo-detail-icon"><ActiveIcon size={19} strokeWidth={1.7} aria-hidden="true"/></div>
          <p className="sl-demo-detail-kicker">{active.label} · {active.status}</p>
          <h3 className="sl-demo-detail-title">{active.heading}</h3>
          <p className="sl-demo-detail-body">{active.body}</p>
          <div className="sl-demo-insight"><CheckCircle2 size={15} aria-hidden="true"/><span>{active.question}</span></div>
          <div className="sl-demo-paid">
            <LockKeyhole size={14} aria-hidden="true"/>
            <span>Unlock evidence, improvements and copy suggestions with Full Analysis.</span>
          </div>
        </section>
      </div>
      <div className="sl-demo-bottom">
        <p>Five free core scores · Deeper findings from $3</p>
        <span>Interactive example <ArrowUpRight size={14} aria-hidden="true"/></span>
      </div>
    </div>
  );
}

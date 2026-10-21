"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, Globe2, MousePointerClick, ShieldCheck, ShoppingBag, Sparkles, Users, WandSparkles } from "lucide-react";
import BrandMark from "@/components/BrandMark";

/** Entirely fictional illustrations: no real site results or private report data. */
const SIGNALS = [
  {
    id:"impression", label:"First Impression", score:85, status:"Clear", Icon:Eye,
    heading:"A clear product, with room for a sharper promise.",
    intro:"The headline tells visitors they're looking at a project workspace, but the outcome still needs context.",
    evidence:"“One space for every project.”",
    strength:"The category is recognizable and the product sounds approachable.",
    friction:"The headline alone doesn't describe the concrete outcome.",
    fix:"Connect the product to the result the customer gets.",
    rewrite:"Plan projects, assign work, and keep every deadline in view."
  },
  {
    id:"audience", label:"Audience", score:58, status:"Partly clear", Icon:Users,
    heading:"A useful product. But for whom exactly?",
    intro:"The public message is broad enough that teams of very different sizes could interpret it differently.",
    evidence:"“The workspace for everyone.”",
    strength:"Simple language lowers the effort to understand the category.",
    friction:"The intended team or workflow isn't identified.",
    fix:"Name the type of team near the first headline.",
    rewrite:"A calmer project workspace for small, fast-moving teams."
  },
  {
    id:"value", label:"Value", score:72, status:"Understandable", Icon:Sparkles,
    heading:"Benefits that deserve the spotlight.",
    intro:"Feature names are easy to find, but the value to the visitor could be more specific.",
    evidence:"“Boards, lists, calendars, and more.”",
    strength:"Visitors can find the main capabilities.",
    friction:"The copy lists tools instead of saying how work improves.",
    fix:"Lead with the outcome, then show the features that create it.",
    rewrite:"Keep tasks, teammates, and deadlines together so work moves forward."
  },
  {
    id:"trust", label:"Trust", score:30, status:"Needs work", Icon:ShieldCheck,
    heading:"Give the promise a reason to be believed.",
    intro:"The public website makes strong claims without enough visible context for a cautious visitor.",
    evidence:"“Trusted by teams everywhere.”",
    strength:"The message communicates a desire to be reliable.",
    friction:"No specific supporting evidence is shown alongside the claim.",
    fix:"Use verifiable proof or narrow the claim to what the product can show.",
    rewrite:"See how ProjectNest organizes your next project—before you sign up."
  },
  {
    id:"action", label:"Action", score:90, status:"Clear", Icon:MousePointerClick,
    heading:"The next step is easy to understand.",
    intro:"The main action is visible and describes what happens next.",
    evidence:"“Start a free workspace”",
    strength:"A direct call to action reduces uncertainty.",
    friction:"The surrounding copy could say what setup requires.",
    fix:"Keep the existing button; add a short, accurate expectation.",
    rewrite:"Start a free workspace · Set up your first project in a few steps."
  },
  {
    id:"purchase", label:"Purchase Readiness", score:64, status:"Opportunity", Icon:ShoppingBag,
    heading:"A clear price needs a clear reason to pay.",
    intro:"This fictional sample sells team plans, so a separate purchase assessment is included.",
    evidence:"“Pro plans from $9 / month.”",
    strength:"A starting price helps set expectations.",
    friction:"The visible pricing claim doesn't explain which team benefits warrant upgrading.",
    fix:"Pair each paid tier with concrete inclusions and a precise next step.",
    rewrite:"Pro · $9/mo · Add team permissions and project reporting."
  }
] as const;
type SignalId = (typeof SIGNALS)[number]["id"];

export default function InteractiveReportPreview() {
  const [selected, setSelected] = useState<SignalId>("audience");
  const active = SIGNALS.find(x => x.id === selected) ?? SIGNALS[0];
  const ActiveIcon = active.Icon;
  return (
    <section className="sl-demo sl-demo--editorial" aria-label="Interactive example clarity report">
      <div className="sl-demo-topbar">
        <div className="sl-demo-brand">
          <BrandMark className="h-8 w-8" />
          <div>
            <p className="sl-demo-heading">Explore a Clarity Report</p>
            <p className="sl-demo-subtitle">A complete, interactive example. Every tab is open.</p>
          </div>
        </div>
        <span className="sl-demo-live"><span aria-hidden="true"/> INTERACTIVE SAMPLE</span>
      </div>

      <div className="sl-demo-hero">
        <div>
          <p className="sl-demo-hero-eyebrow"><Globe2 size={13} aria-hidden="true"/> PROJECTNEST.APP <span>·</span> FICTIONAL WEBSITE</p>
          <h2>Don't just get a score.<br/><span>See what to improve.</span></h2>
          <p>Explore the same report structure: evidence, what's working, what feels unclear and a better direction.</p>
        </div>
        <div className="sl-demo-hero-score" aria-label="Illustrative overall clarity score 69 out of 100">
          <span>CLARITY SCORE</span>
          <strong>69<small>/100</small></strong>
          <div className="sl-demo-score-progress"><i style={{width:"69%"}}/></div>
          <small>Illustrative · Five core signals</small>
        </div>
      </div>

      <div className="sl-demo-workspace">
        <div className="sl-demo-nav">
          <div className="sl-demo-nav-head"><span>CLARITY SIGNALS</span><span>06 VIEWS</span></div>
          <div className="sl-demo-signal-list" role="tablist" aria-label="Example clarity signals">
            {SIGNALS.map((item,i) => {
              const Icon=item.Icon;
              return <button key={item.id} id={`demo-tab-${item.id}`} role="tab" type="button"
                aria-selected={selected===item.id} aria-controls="sl-example-detail"
                tabIndex={selected===item.id?0:-1}
                onClick={()=>setSelected(item.id)}
                onKeyDown={event=>{
                  if(!["ArrowDown","ArrowUp","ArrowRight","ArrowLeft","Home","End"].includes(event.key))return;
                  event.preventDefault();
                  const next=event.key==="Home"?0:event.key==="End"?SIGNALS.length-1:
                    (i+(event.key==="ArrowUp"||event.key==="ArrowLeft"?-1:1)+SIGNALS.length)%SIGNALS.length;
                  setSelected(SIGNALS[next].id);
                  document.getElementById(`demo-tab-${SIGNALS[next].id}`)?.focus();
                }}
                className={`sl-demo-signal ${selected===item.id?"is-selected":""}`}>
                <span className="sl-demo-signal-main"><Icon size={16} strokeWidth={1.8} aria-hidden="true"/><span>{item.label}</span></span>
                <strong>{item.score}<small>/100</small></strong>
              </button>;
            })}
          </div>
          <p className="sl-demo-nav-note">Purchase Readiness is separate from the overall score and applies only when a paid offer is detected.</p>
        </div>

        <div id="sl-example-detail" className="sl-demo-report" role="tabpanel" aria-labelledby={`demo-tab-${active.id}`}>
          <div className="sl-demo-report-top">
            <div className="sl-demo-report-icon"><ActiveIcon size={20} strokeWidth={1.8} aria-hidden="true"/></div>
            <span className="sl-demo-report-status">{active.status}</span>
            <strong>{active.score}<small>/100</small></strong>
          </div>
          <p className="sl-demo-report-kicker">SIGNAL {String(SIGNALS.findIndex(x=>x.id===active.id)+1).padStart(2,"0")} · WHAT IT MEANS</p>
          <h3>{active.heading}</h3>
          <p className="sl-demo-report-intro">{active.intro}</p>
          <div className="sl-demo-evidence">
            <span><Eye size={14} aria-hidden="true"/> EXAMPLE PAGE EVIDENCE</span>
            <blockquote>{active.evidence}</blockquote>
            <small>Illustrative wording, not extracted from a real website</small>
          </div>
          <div className="sl-demo-findings">
            <div><p className="sl-demo-finding-label sl-demo-finding-label--positive"><CheckCircle2 size={15} aria-hidden="true"/> WHAT WORKS</p><p>{active.strength}</p></div>
            <div><p className="sl-demo-finding-label sl-demo-finding-label--caution">WHAT'S UNCLEAR</p><p>{active.friction}</p></div>
          </div>
          <div className="sl-demo-direction">
            <div className="sl-demo-direction-head"><span><WandSparkles size={16} aria-hidden="true"/> BETTER DIRECTION</span><span>EXAMPLE REWRITE</span></div>
            <p>{active.fix}</p>
            <strong>“{active.rewrite}”</strong>
          </div>
        </div>
      </div>
      <div className="sl-demo-bottom">
        <p><CheckCircle2 size={14} aria-hidden="true"/> All sample signals and fixes open · Real Full Analysis $3</p>
        <a href="#full-report-demo">Explore the full report walkthrough <ArrowRight size={14} aria-hidden="true"/></a>
      </div>
    </section>
  );
}

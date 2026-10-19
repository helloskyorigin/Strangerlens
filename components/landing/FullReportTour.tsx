"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, FileSearch, Layers3, LockKeyhole, PencilLine, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const TABS = [
  { id:"overview", title:"Overview", Icon:Layers3 },
  { id:"signals", title:"Signal deep dive", Icon:Sparkles },
  { id:"evidence", title:"Evidence-to-Fix", Icon:FileSearch },
  { id:"copy", title:"Copy Studio", Icon:PencilLine },
  { id:"priority", title:"Smart Priority", Icon:CheckCircle2 },
] as const;
type Tab = typeof TABS[number]["id"];

function Panel({ active }: { active: Tab }) {
  switch(active) {
    case "overview":
      return <div className="sl-tour-section">
        <p className="sl-tour-eyebrow">Your Clarity Snapshot</p>
        <div className="sl-tour-scoreline"><strong>69<span>/100</span></strong><span className="sl-tour-pill">Room to improve</span></div>
        <p className="sl-tour-text">A single score starts the story. Full Analysis explains five different parts of your homepage, so you're not paying for just one fix.</p>
        <div className="sl-tour-stat-row">
          <div><strong>5</strong><span>Signal chapters</span></div>
          <div><strong>01</strong><span>Priority action</span></div>
          <div><strong>$5</strong><span>One-time report</span></div>
        </div>
      </div>;
    case "signals":
      return <div className="sl-tour-section">
        <p className="sl-tour-eyebrow">Chapter 02 / Audience</p>
        <div className="sl-tour-scoreline"><h3>Audience Clarity</h3><strong className="sl-tour-sm-score">58/100</strong></div>
        <div className="sl-tour-insight"><span className="sl-tour-tag">Why this score</span>
          <p>The headline suggests a productivity product, but it doesn't immediately identify whom it serves.</p></div>
        <div className="sl-tour-insight"><span className="sl-tour-tag">What to improve</span>
          <p>Add a concise audience-specific subheading close to the headline. Keep the language understandable to the target visitor.</p></div>
        <p className="sl-tour-footnote">Five chapters follow this detailed structure. Example analysis only.</p>
      </div>;
    case "evidence":
      return <div className="sl-tour-section">
        <p className="sl-tour-eyebrow">Source → Finding → Action</p>
        <div className="sl-tour-quote"><span>Illustrative homepage wording</span><blockquote>“Everything you need to work smarter.”</blockquote></div>
        <div className="sl-tour-insight"><span className="sl-tour-tag">Why review it</span>
          <p>The claim is broad and doesn't explain the actual use case.</p></div>
        <div className="sl-tour-insight"><span className="sl-tour-tag">Action</span>
          <p>Replace vague promises with a concrete audience and outcome, using only facts the business can support.</p></div>
        <p className="sl-tour-footnote">Real paid reports show verified source evidence when available.</p>
      </div>;
    case "copy":
      return <div className="sl-tour-section">
        <p className="sl-tour-eyebrow">Better Copy Studio</p>
        <div className="sl-tour-quote"><span>Illustrative original</span><blockquote>“Everything you need to work smarter.”</blockquote></div>
        <div className="sl-tour-suggestion"><span>Illustrative rewrite</span><p>“Organize projects, tasks and deadlines in one workspace.”</p></div>
        <p className="sl-tour-text">Inside your own report, suggested wording can be reviewed, edited and copied before you publish anything.</p>
        <p className="sl-tour-footnote">This fictitious example does not describe a scanned customer website.</p>
      </div>;
    case "priority":
      return <div className="sl-tour-section">
        <p className="sl-tour-eyebrow">Your Improvement Roadmap</p>
        <div className="sl-tour-priority">
          <div><span className="sl-tour-pill is-blue">Do first</span><p>Make the intended audience unmistakable in the hero.</p></div>
          <div><span className="sl-tour-pill is-mint">Quick win</span><p>Clarify the primary call-to-action label.</p></div>
          <div><span className="sl-tour-pill is-amber">Worth testing</span><p>Try a more specific value proposition.</p></div>
          <div><span className="sl-tour-pill">Keep as is</span><p>Preserve an already understandable next step.</p></div>
        </div>
        <p className="sl-tour-footnote">Example order, not predicted conversion impact.</p>
      </div>;
  }
}

export default function FullReportTour({ onTryFree }: { onTryFree: () => void }) {
  const [active,setActive] = useState<Tab>("overview");
  const index = TABS.findIndex(t => t.id === active);
  const reduceMotion = useReducedMotion();
  return (
    <section id="full-report-demo" className="sl-tour-section-wrapper" aria-labelledby="sl-tour-heading">
      <div className="sl-tour-heading">
        <span className="sl-tour-kicker"><Sparkles size={15} aria-hidden="true"/> THE COMPLETE REPORT</span>
        <h2 id="sl-tour-heading">Know the score. Understand the whole picture.</h2>
        <p>Your free score shows where clarity stands. See what a detailed $5 report helps you explore—across every signal, not just the weakest one.</p>
      </div>
      <div className="sl-tour-shell">
        <div className="sl-tour-topline">
          <div><span className="sl-tour-browserdots"><i/><i/><i/></span><span>StrangerLens / Full Analysis</span></div>
          <span className="sl-tour-example-tag">Interactive example · Not a real scan</span>
        </div>
        <div className="sl-tour-body">
          <nav className="sl-tour-tabs" role="tablist" aria-label="Explore full report sections">
            {TABS.map(({id,title,Icon},i)=>(
              <button key={id} role="tab" type="button" id={`tour-tab-${id}`}
                aria-controls="sl-tour-panel" aria-selected={active===id} tabIndex={active===id?0:-1}
                onClick={()=>setActive(id)}
                onKeyDown={event=>{
                  if(!["ArrowRight","ArrowLeft","ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
                  event.preventDefault();
                  const next = event.key==="Home"?0:event.key==="End"?TABS.length-1:
                    (i+(event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:1)+TABS.length)%TABS.length;
                  setActive(TABS[next].id);
                  document.getElementById(`tour-tab-${TABS[next].id}`)?.focus();
                }}
                className={`sl-tour-tab ${active===id?"is-active":""}`}>
                <Icon size={16} aria-hidden="true"/><span>{title}</span>
                {active===id&&<span className="sl-tour-tab-indicator"/>}
              </button>
            ))}
          </nav>
          <div className="sl-tour-content" role="tabpanel" id="sl-tour-panel" aria-labelledby={`tour-tab-${active}`}>
            <motion.div key={active} initial={reduceMotion?false:{opacity:0,y:9}}
              animate={{opacity:1,y:0}} transition={{duration:.26}}>
              <Panel active={active}/>
            </motion.div>
          </div>
        </div>
        <div className="sl-tour-footer">
          <div><LockKeyhole size={15} aria-hidden="true"/><span>Five deep dives · Evidence · Copy Studio · Priority plan · PDF</span></div>
          <button type="button" onClick={onTryFree}>Try Your Website Free <ArrowRight size={15} aria-hidden="true"/></button>
        </div>
      </div>
      <p className="sl-tour-caption">This is an educational interface demonstration. Actual scan findings and rewrite suggestions are generated only from accessible website content.</p>
    </section>
  );
}

"use client";

import React, { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, Eye, FileSearch, FileText, Layers3, PencilLine, ShieldCheck, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const SECTIONS = [
  { id: "overview", title: "Full overview", Icon: Layers3 },
  { id: "signals", title: "Five deep dives", Icon: Eye },
  { id: "evidence", title: "Evidence → Fix", Icon: FileSearch },
  { id: "copy", title: "Better Copy Studio", Icon: PencilLine },
  { id: "priority", title: "Smart Priority", Icon: CheckCircle2 },
] as const;
type Section = (typeof SECTIONS)[number]["id"];

const SIGNALS = [
  { name:"First Impression", score:78, issue:"Headline is recognizable, but category could be clearer." },
  { name:"Audience", score:56, issue:"Your ideal customer is not immediately explicit." },
  { name:"Value", score:77, issue:"Benefits are understandable but could be more concrete." },
  { name:"Trust", score:45, issue:"Specific reassurance and credibility context is missing." },
  { name:"Action", score:88, issue:"The next step is easy to locate and understand." },
] as const;

function Row({name,score}:{name:string;score:number}) {
  return <div className="sl-report-signal-row">
    <span>{name}</span>
    <div className="sl-report-meter"><i style={{width:`${score}%`}}/></div>
    <strong>{score}<small>/100</small></strong>
  </div>;
}
function Detail({selected}:{selected:Section}){
  if(selected==="overview")return <div className="sl-showcase-section">
    <span className="sl-report-overline">01 · FIRST IMPRESSION REPORT</span>
    <h3>Here's what your public website communicates.</h3>
    <p className="sl-showcase-description">The visitor can identify a project workspace and find the primary action, but the audience and trust message deserve more attention.</p>
    <div className="sl-report-verdict"><Sparkles size={17}/><p><strong>Main verdict:</strong> Clear starting point. Strengthen audience specificity and supporting credibility before adding more features.</p></div>
    <div className="sl-report-two-col">
      <div className="sl-report-finding">
        <span className="sl-report-kicker"><CheckCircle2 size={15}/> WHAT'S WORKING</span>
        <p>The next action is visible, and the product category becomes understandable from surrounding copy.</p>
      </div>
      <div className="sl-report-finding is-warning">
        <span className="sl-report-kicker"><Eye size={15}/> WHAT'S UNCLEAR</span>
        <p>The current headline could describe many products. A new visitor may not know who benefits most.</p>
      </div>
    </div>
    <p className="sl-tour-footnote">Fictional public-website example. Supporting and legal pages add context only when accessible. No visitor behavior has been observed.</p>
  </div>;
  if(selected==="signals")return <div className="sl-showcase-section">
    <span className="sl-report-overline">02 · DEEP ANALYSIS / ALL FIVE SIGNALS</span>
    <h3>Not one generic score. Five useful explanations.</h3>
    <p className="sl-showcase-description">Every chapter explains its score, what's working, what's unclear, observed supporting content when available, and what to improve.</p>
    <div className="sl-report-chapter-list">{SIGNALS.map((signal,i)=>
      <div className="sl-report-chapter" key={signal.name}>
        <span className="sl-report-chapter-num">0{i+1}</span>
        <div><strong>{signal.name}</strong><p>{signal.issue}</p></div>
        <b>{signal.score}</b>
      </div>)}
    </div>
    <div className="sl-report-purchase-sample">
      <span className="sl-report-overline">06 · CONDITIONAL PURCHASE READINESS</span>
      <strong>64/100 · Is the reason to upgrade clear?</strong>
      <p>This fictional product has a paid plan. Its separate purchase check looks at pricing clarity, reasons to pay and the next step. It never changes the five-signal overall score.</p>
    </div>
    <p className="sl-tour-footnote">Illustrative scores and findings, not an actual audit.</p>
  </div>;
  if(selected==="evidence")return <div className="sl-showcase-section">
    <span className="sl-report-overline">03 · EVIDENCE-TO-FIX</span>
    <h3>See what informed the recommendation.</h3>
    <p className="sl-showcase-description">Specific observed wording and a practical change, side-by-side. Real reports don't invent missing evidence.</p>
    <div className="sl-report-evidence-grid">
      <div className="sl-report-evidence-before">
        <span>EXAMPLE HOMEPAGE / HERO</span>
        <blockquote>“Everything you need to work smarter.”</blockquote>
        <p>Illustrative source wording</p>
      </div>
      <div className="sl-report-evidence-after">
        <span><ArrowUpRight size={13}/> RECOMMENDED DIRECTION</span>
        <strong>Say who it's for and what outcome it delivers.</strong>
        <p>Describe the actual user and concrete benefit rather than making a broad productivity promise.</p>
      </div>
    </div>
    <p className="sl-tour-footnote">In real paid reports, only verified quotes are labeled as source evidence. Unavailable proof is clearly disclosed.</p>
  </div>;
  if(selected==="copy")return <div className="sl-showcase-section">
    <span className="sl-report-overline">04 · BETTER COPY STUDIO</span>
    <h3>Go from unclear copy to a usable draft.</h3>
    <p className="sl-showcase-description">Review a copy-ready suggestion, tailor the wording to your actual business, and copy the version you approve.</p>
    <div className="sl-report-copy-grid">
      <div><span>BEFORE · EXAMPLE</span><p>“Everything you need to work smarter.”</p></div>
      <div className="is-after"><span>AFTER · EXAMPLE REWRITE</span><p>“Organize projects, tasks and deadlines in one workspace.”</p></div>
    </div>
    <div className="sl-report-mini-tool"><PencilLine size={16}/><span>Inside your report: Suggested · Shorter when safe · My edit · Copy</span></div>
    <p className="sl-tour-footnote">Copy is illustrative. Every real rewrite should be checked against the site's actual features and claims.</p>
  </div>;
  return <div className="sl-showcase-section">
    <span className="sl-report-overline">05 · SMART PRIORITY PLAN</span>
    <h3>Stop guessing what to fix first.</h3>
    <p className="sl-showcase-description">A suggested order helps you act on issues while protecting the parts of the website that already communicate clearly.</p>
    <div className="sl-report-priority-grid">
      <div><span className="sl-report-pill is-first">DO FIRST</span><strong>Clarify your ideal visitor.</strong><p>Specify the target audience near the hero headline.</p></div>
      <div><span className="sl-report-pill is-fast">QUICK WIN</span><strong>Improve a vague label.</strong><p>Make the next step explicit where applicable.</p></div>
      <div><span className="sl-report-pill is-test">WORTH TESTING</span><strong>Try a clearer benefit.</strong><p>Compare specific outcomes with broad claims.</p></div>
      <div><span className="sl-report-pill is-keep">KEEP AS IS</span><strong>Preserve the clear CTA.</strong><p>Avoid rewriting elements without a reason.</p></div>
    </div>
    <p className="sl-tour-footnote">An example priority order, not predicted revenue uplift or measured conversion lift.</p>
  </div>;
}

export default function FullReportTour({onTryFree}:{onTryFree:()=>void}){
  const [selected,setSelected]=useState<Section>("overview");
  const reducedMotion=useReducedMotion();
  return <section id="full-report-demo" className="sl-tour-section-wrapper sl-report-showcase" aria-labelledby="sl-tour-heading">
    <div className="sl-tour-heading">
      <span className="sl-tour-kicker"><Sparkles size={15} aria-hidden="true"/> THE $3 COMPLETE REPORT</span>
      <h2 id="sl-tour-heading">From a clarity score to an actionable plan.</h2>
      <p>Explore every chapter of a fictional complete report—five core signals, conditional purchase context, page evidence, better wording and a prioritized action plan. No sample section is hidden.</p>
    </div>
    <div className="sl-tour-shell">
      <header className="sl-tour-topline">
        <div><span className="sl-tour-browserdots"><i/><i/><i/></span><span>StrangerLens / Full Clarity Report</span></div>
        <span className="sl-tour-example-tag">INTERACTIVE SAMPLE · ALL CHAPTERS OPEN</span>
      </header>
      <div className="sl-report-score-hero">
        <div>
          <span className="sl-report-overline">PROJECTNEST.APP / SAMPLE REPORT</span>
          <h3>Your first-impression clarity, explained.</h3>
          <p>A complete example: what helps the visitor, what creates hesitation and what to change next.</p>
        </div>
        <div className="sl-report-score"><strong>69<span>/100</span></strong><small>Overall clarity · Example</small></div>
      </div>
      <div className="sl-report-signal-summary">
        {SIGNALS.map(item=><Row key={item.name} name={item.name} score={item.score}/>)}
      </div>
      <div className="sl-tour-body">
        <div className="sl-tour-tabs" role="tablist" aria-label="Explore detailed paid report sections">
          {SECTIONS.map(({id,title,Icon},i)=><button key={id} type="button" role="tab" id={`tour-tab-${id}`}
            aria-controls="sl-tour-panel" aria-selected={selected===id} tabIndex={selected===id?0:-1}
            onClick={()=>setSelected(id)}
            onKeyDown={event=>{
              if(!["ArrowRight","ArrowLeft","ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
              event.preventDefault();
              const next=event.key==="Home"?0:event.key==="End"?SECTIONS.length-1:
                (i+(event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:1)+SECTIONS.length)%SECTIONS.length;
              setSelected(SECTIONS[next].id);
              document.getElementById(`tour-tab-${SECTIONS[next].id}`)?.focus();
            }} className={`sl-tour-tab ${selected===id?"is-active":""}`}>
            <Icon size={16} aria-hidden="true"/><span>{title}</span>
            {selected===id&&<span className="sl-tour-tab-indicator"/>}
          </button>)}
        </div>
        <div className="sl-tour-content" id="sl-tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${selected}`}>
          <motion.div key={selected} initial={reducedMotion?false:{opacity:0,y:9}} animate={{opacity:1,y:0}}
            transition={{duration:.25}}><Detail selected={selected}/></motion.div>
        </div>
      </div>
      <footer className="sl-tour-footer">
        <div><ShieldCheck size={16}/><span>Five detailed signals · Evidence · Copy Studio · Priority plan · PDF</span></div>
        <button type="button" onClick={onTryFree}>Analyze My Website Free <ArrowRight size={15} aria-hidden="true"/></button>
      </footer>
    </div>
    <p className="sl-tour-caption">Every example tab is available to explore. These fictional observations are not your website's findings; a real website-specific full report requires verified payment.</p>
  </section>;
}

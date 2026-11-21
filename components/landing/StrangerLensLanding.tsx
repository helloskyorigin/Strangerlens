"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp,
  Download, Eye, Link2, ListChecks, LockKeyhole, Menu,
  SearchCheck, ShieldCheck, Sparkles, Target, WandSparkles, X,
} from "lucide-react";
import { LEGAL_CONFIG, getSupportGmailComposeUrl } from "@/lib/legal-config";
import { LandingThemeSwitcher } from "@/components/landing/LandingThemeSwitcher";
import LandingResultPreview from "@/components/landing/LandingResultPreview";

interface StrangerLensLandingProps {
  url: string;
  onUrlChange: (next: string) => void;
  onAnalyze: (event: React.FormEvent<HTMLFormElement>) => void;
  isVerifying: boolean;
  errorMessage: string | null;
}

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const examples = [
  {
    label: "SaaS product",
    site: "SAMPLE / PROJECT SOFTWARE",
    headline: "Everything your team needs to move faster.",
    question: "Move faster doing what, exactly?",
    interpretation: "I can tell this is for teams, but I can't tell what the product actually helps them do.",
    evidence: "Everything your team needs to move faster.",
    diagnosis: "The headline talks about a broad outcome but leaves the actual product and job unclear.",
    fix: "Name the specific workflow and the people it helps. Keep the claim tied to your real product.",
    rewrite: "Plan client projects, assign tasks, and keep every deadline in one place.",
  },
  {
    label: "Service business",
    site: "SAMPLE / CREATIVE STUDIO",
    headline: "Your vision. Our passion. Endless possibilities.",
    question: "What can I actually hire you to do?",
    interpretation: "The tone feels professional, but I still don't know which service they provide.",
    evidence: "Your vision. Our passion. Endless possibilities.",
    diagnosis: "The opening message sounds polished without identifying the service, audience, or deliverable.",
    fix: "Say what you create and for whom before adding brand language.",
    rewrite: "Brand identity and web design for independent businesses ready to stand out.",
  },
  {
    label: "Online store",
    site: "SAMPLE / HOME GOODS",
    headline: "Live better. Every day.",
    question: "What are they selling here?",
    interpretation: "I see a lifestyle promise, but not enough information to know the category or products.",
    evidence: "Live better. Every day.",
    diagnosis: "The hero describes an aspiration instead of the products and their relevance.",
    fix: "Introduce the product category in the hero and make the next step easy to find.",
    rewrite: "Everyday organizers that make small spaces feel easier to live in.",
  },
];

const questions = [
  {
    q: "What exactly does StrangerLens analyze?",
    a: "StrangerLens inspects accessible public website content and evaluates five communication signals: First Impression, Audience, Value, Trust and Action. When a genuine paid offer is identified, a separate Purchase Readiness check may also appear in the full analysis.",
  },
  {
    q: "Is this a real visitor test?",
    a: "No. It's an AI interpretation grounded in the public website content it can inspect. StrangerLens does not record real visitors, track clicks or measure actual conversion rates.",
  },
  {
    q: "What do I see before paying?",
    a: "The free preview includes an overall clarity score and scores and statuses for the five core signals. Detailed reasons, evidence, copy suggestions and fixes are part of the Full Analysis.",
  },
  {
    q: "What is included in the $9 report?",
    a: "Five detailed signal analyses, evidence-to-fix recommendations when source wording is available, a prioritized improvement plan, Better Copy Studio, the First 5 Seconds breakdown and a downloadable PDF. Purchase Readiness appears when applicable.",
  },
  {
    q: "Does it edit my website for me?",
    a: "No. StrangerLens tells you what may be unclear and gives you wording and improvement directions to review. You stay in control of any changes.",
  },
  {
    q: "Will it work on any URL?",
    a: "It needs a public website with readable content. Password-protected pages, JavaScript-only content or sites that block automated access may produce limited results. If content can't be inspected reliably, the report should indicate the coverage limit.",
  },
  {
    q: "Can I reopen a purchased report?",
    a: "If you kept its direct report link, open it in the original browser. Access relies on saved browser references, so clearing data or switching devices may remove access. Keep your payment receipt and contact support if you need help.",
  },
  {
    q: "Do I need an account or a subscription?",
    a: "You can use the free preview without creating an account. Full Analysis is a $9 one-time purchase per report, not a subscription.",
  },
];

export default function StrangerLensLanding({
  url, onUrlChange, onAnalyze, isVerifying, errorMessage,
}: StrangerLensLandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const example = examples[exampleIndex];

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [menuOpen]);

  const goToScan = () => {
    setMenuOpen(false);
    document.getElementById("slr-scan")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="slr-page" id="top">
      <a href="#main-content" className="slr-skip">Skip to content</a>
      <header className="slr-header">
        <div className="slr-container slr-navbar">
          <a className="slr-brand" href="#top" aria-label="StrangerLens home" onClick={() => setMenuOpen(false)}>
            <img src="/strangerlens-mark.webp" alt="" width={40} height={40} />
            <span>StrangerLens<span className="slr-brand-dot">.</span></span>
          </a>
          <nav className="slr-navlinks" aria-label="Primary navigation">
            {navLinks.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
          </nav>
          <div className="slr-nav-actions">
            <LandingThemeSwitcher compact />
            <button type="button" className="slr-button slr-nav-cta" onClick={goToScan}>
              Get Free Score <ArrowUpRight size={16} />
            </button>
            <button type="button" className="slr-menu-toggle"
              onClick={() => setMenuOpen(open => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen} aria-controls="slr-mobile-menu">
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="slr-mobile-menu" className="slr-mobile-menu slr-container" aria-label="Mobile navigation">
            {navLinks.map(link => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}<ArrowUpRight size={16} /></a>)}
            <button type="button" className="slr-button" onClick={goToScan}>Get Free Score <ArrowUpRight size={16} /></button>
          </nav>
        )}
      </header>

      <main id="main-content">
        <section className="slr-hero slr-hero-proof slr-container" aria-labelledby="slr-hero-title">
          <div className="slr-hero-copy">
            <div className="slr-kicker"><span className="slr-kicker-dot"/> FREE WEBSITE CLARITY CHECK</div>
            <h1 id="slr-hero-title">Would a stranger<br/><span className="slr-underline">get your website?</span></h1>
            <p className="slr-hero-subtitle">Your homepage can look polished and still leave people guessing.</p>
            <p className="slr-hero-description">See how clearly it explains itself. Get a free score and five simple checks for your first impression, audience, value, trust and next step.</p>
            <form id="slr-scan" className="slr-scan-form slr-hero-scan" onSubmit={onAnalyze} noValidate>
              <div className="slr-input-wrap">
                <label htmlFor="slr-website-url" className="slr-sr-only">Your public website URL</label>
                <Link2 size={20} className="slr-input-icon" aria-hidden="true"/>
                <input id="slr-website-url" ref={inputRef} type="text" inputMode="url" autoComplete="url" spellCheck={false}
                  placeholder="yourwebsite.com" value={url} onChange={event=>onUrlChange(event.target.value)}
                  aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage?"slr-url-error":undefined}
                  disabled={isVerifying}/>
                <button className="slr-button slr-form-submit" type="submit" disabled={isVerifying}>
                  <span>{isVerifying?"Checking your website...":"Reveal My Clarity Score — Free"}</span>
                  <ArrowUpRight size={18} aria-hidden="true"/>
                </button>
              </div>
              {errorMessage&&<p id="slr-url-error" role="alert" className="slr-input-error">{errorMessage}</p>}
            </form>
            <div className="slr-hero-assurances">
              <span><Check size={14} aria-hidden="true"/> Free score &amp; 5 checks</span>
              <span><Check size={14} aria-hidden="true"/> No account needed</span>
              <span><Check size={14} aria-hidden="true"/> Full report optional · $9 once</span>
            </div>
          </div>
          <LandingResultPreview/>
        </section>

        <section className="slr-example slr-container" id="sample-report" aria-labelledby="slr-example-title">
          <div className="slr-section-heading slr-example-heading">
            <div><span className="slr-eyebrow">BEYOND A SCORE</span>
              <h2 id="slr-example-title">The words sound good.<br/><span>But what do they tell a stranger?</span></h2></div>
            <p>Explore three fictional examples of unclear messaging, with a specific fix and a stronger way to say it.</p>
          </div>
          <div className="slr-example-tabs" role="group" aria-label="Choose sample business type">
            {examples.map((item, index) => <button type="button" key={item.label} onClick={() => setExampleIndex(index)}
              className={index === exampleIndex ? "is-active" : ""} aria-pressed={index === exampleIndex}>{item.label}</button>)}
          </div>
          <div className="slr-example-layout" aria-live="polite">
            <div className="slr-example-original">
              <div className="slr-example-browser"><span className="slr-browser-dots"><i/><i/><i/></span><span>{example.site}</span></div>
              <div className="slr-example-site"><span>EXAMPLE HOMEPAGE</span><h3>{example.headline}</h3><p>Looks polished on the surface. But a new visitor may need more context.</p><span className="slr-example-faux-button">Get started <ArrowUpRight size={14}/></span></div>
            </div>
            <div className="slr-example-findings">
              <div className="slr-example-findings-head"><span><Eye size={17}/> STRANGER&apos;S PERSPECTIVE</span><span>Illustrative example</span></div>
              <div className="slr-example-thought"><span className="slr-example-question">The question it raises</span><strong>{example.question}</strong><p>{example.interpretation}</p></div>
              <div className="slr-example-evidence"><span>PAGE EVIDENCE</span><p>“{example.evidence}”</p><small>{example.diagnosis}</small></div>
              <div className="slr-example-fix"><span><WandSparkles size={15}/> IMPROVEMENT DIRECTION</span><p>{example.fix}</p><div><strong>Possible rewrite</strong><p>“{example.rewrite}”</p></div></div>
            </div>
          </div>
          <p className="slr-example-disclosure">All three examples are fictional. Actual reports only reference content inspected from the submitted website; suggested copy must be checked for accuracy before publishing.</p>
        </section>

        <section id="full-report" className="slr-section slr-paid-proof slr-container">
          <div className="slr-paid-proof-intro">
            <span className="slr-eyebrow">WHEN YOU WANT TO FIX IT</span>
            <h2>The score tells you where.<br/><span>The full report shows you what to change.</span></h2>
            <p>Start with the five free signals. Unlock the deeper findings only if you want a practical plan for your website.</p>
            <div className="slr-paid-proof-price"><strong>$9</strong><span>once per report<br/>No subscription</span></div>
            <button type="button" className="slr-button slr-paid-proof-cta" onClick={goToScan}>
              Check My Website First <ArrowUpRight size={16} aria-hidden="true"/>
            </button>
            <p className="slr-paid-proof-note"><Check size={14} aria-hidden="true"/> The free score appears before any payment.</p>
          </div>
          <div className="slr-paid-proof-cards">
            {[
              ["01","The Stranger's View","What someone could understand—or miss—at first glance."],
              ["02","What's Holding Your Website Back","Where the words leave important questions unanswered."],
              ["03","Why Visitors Might Hesitate","Trust and buying concerns, when the page supports them."],
              ["04","Your Fix-First Action Plan","Which useful changes to consider first, and why."],
              ["05","Better Copy & Rewrites","Suggested wording to review, edit and make your own."],
            ].map(([number,title,detail])=><article className="slr-paid-proof-item" key={number}>
              <span className="slr-paid-proof-index">{number}</span>
              <div><h3>{title}</h3><p>{detail}</p></div>
              <ArrowUpRight size={17} aria-hidden="true"/>
            </article>)}
          </div>
          <p className="slr-paid-proof-disclaimer">Purchase readiness is included when a real paid offer is detected. Suggestions come from accessible public content—not measured visitor activity.</p>
        </section>

        <section id="how-it-works" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">FROM URL TO CLARITY</span>
            <h2>Paste your URL. See what comes across<span className="slr-lime-period">.</span></h2></div>
          <div className="slr-steps">
            <div className="slr-step"><div className="slr-step-number">01</div><div><h3>Enter your website</h3><p>Give StrangerLens a public URL to inspect.</p></div></div>
            <ArrowRight className="slr-step-arrow" size={21} aria-hidden="true" />
            <div className="slr-step"><div className="slr-step-number">02</div><div><h3>See your five signals</h3><p>Review your clarity score and the areas worth checking.</p></div></div>
            <ArrowRight className="slr-step-arrow" size={21} aria-hidden="true" />
            <div className="slr-step"><div className="slr-step-number">03</div><div><h3>Decide what to improve</h3><p>Unlock detailed findings and suggested changes only if you want them.</p></div></div>
          </div>
        </section>

        <section id="pricing" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">STRAIGHTFORWARD PRICING</span>
            <h2>See the scores. Unlock the reasons<span className="slr-lime-period">.</span></h2>
            <p>Start with a clarity check. Get the deeper analysis for one fixed price.</p></div>
          <div className="slr-price-grid">
            <div className="slr-price-card">
              <span className="slr-price-label">CLARITY PREVIEW</span>
              <div className="slr-price"><strong>$0</strong><span>free</span></div>
              <p className="slr-price-description">Understand how clearly your website introduces itself.</p>
              <ul><li><Check size={17} /> Overall clarity score</li><li><Check size={17} /> Five core signal scores</li><li><Check size={17} /> Statuses and lowest-scoring area</li></ul>
              <button className="slr-button slr-price-button" type="button" onClick={goToScan}>Reveal My Clarity Score <ArrowUpRight size={17} /></button>
            </div>
            <div className="slr-price-card slr-price-featured">
              <span className="slr-price-label">FULL CLARITY REPORT <span className="slr-price-chip">ONE-TIME</span></span>
              <div className="slr-price"><strong>$9</strong><span>per report</span></div>
              <p className="slr-price-description">Move beyond a number. Understand what needs attention and how to improve it.</p>
              <ul><li><Check size={17} /> All detailed signal findings</li><li><Check size={17} /> Website evidence & practical recommendations</li><li><Check size={17} /> Prioritized improvement plan</li><li><Check size={17} /> Editable copy suggestions</li><li><Check size={17} /> Stranger&apos;s View & first-five-seconds breakdown</li><li><Check size={17} /> Purchase readiness when applicable</li></ul>
              <button className="slr-button slr-price-button" type="button" onClick={goToScan}>Check My Website First <ArrowUpRight size={17} /></button>
              <small>PDF download and saved report access included as utilities.</small>
            </div>
          </div>
          <p className="slr-pricing-disclosure">Digital reports are delivered on demand. <Link href="/refund-policy">Refund terms</Link> and <Link href="/terms">service terms</Link> apply.</p>
        </section>

        <section id="faq" className="slr-section slr-faq-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">BEFORE YOU TRY IT</span><h2>Good questions. Clear answers<span className="slr-lime-period">.</span></h2></div>
          <div className="slr-faq-list">
            {questions.map(({q,a}) => <details className="slr-faq" key={q}><summary><span>{q}</span><ChevronDown size={20} aria-hidden="true"/></summary><p>{a}</p></details>)}
          </div>
        </section>

        <section className="slr-bottom-cta slr-container">
          <div className="slr-bottom-panel">
            <span className="slr-eyebrow">KNOW WHAT NEEDS ATTENTION</span>
            <h2>See what your website is saying.<br />And what it isn&apos;t.</h2>
            <p>Your free first-impression score and five clarity signals are one URL away.</p>
            <button type="button" className="slr-button" onClick={goToScan}>Reveal My Clarity Score — Free <ArrowUpRight size={17}/></button>
          </div>
        </section>
      </main>

      <footer className="slr-footer slr-container">
        <div className="slr-footer-main"><a className="slr-brand" href="#top"><img src="/strangerlens-mark.webp" alt="" width={34} height={34}/><span>StrangerLens<span className="slr-brand-dot">.</span></span></a><p>Know what your website explains—and what it leaves unclear.</p></div>
        <div className="slr-footer-links">{LEGAL_CONFIG.links.map(link => <Link href={link.href} key={link.href}>{link.label}</Link>)}<a href={getSupportGmailComposeUrl()} target="_blank" rel="noopener noreferrer">Email support</a></div>
        <div className="slr-footer-bottom"><span>© {new Date().getFullYear()} StrangerLens. All rights reserved.</span><span>AI-based assessment of publicly accessible website content.</span></div>
      </footer>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp,
  Link2, Menu, X,
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
  { label: "Why it matters", href: "#why-it-matters" },
  { label: "Explore", href: "#explore" },
  { label: "Pricing", href: "#pricing" },
];

const questions = [
  {
    q: "What does StrangerLens actually check?",
    a: "StrangerLens evaluates how clearly your website explains its first impression, audience, value, trust and next action. It looks at the wording and information a visitor can see.",
  },
  {
    q: "Is it a real user test or a traffic analytics tool?",
    a: "Neither. It's an AI-powered clarity review of your website's message. It doesn't observe real visitors, track conversions or predict sales.",
  },
  {
    q: "Will it rewrite or change my live website?",
    a: "No. It can suggest clearer wording and improvements for you to review. You decide what to change.",
  },
  {
    q: "What kinds of websites can I check?",
    a: "Public websites that can be reached and read by the scanner. Login-only, blocked or inaccessible pages may not provide enough information.",
  },
  {
    q: "Do I need to prepare anything first?",
    a: "Just your website URL. No account is required to see the initial scores.",
  },
];

const exploreCases = [
  {
    label: "What is it?",
    signal: "VALUE",
    visitor: "What does this actually do?",
    before: "A smarter way to work.",
    after: "Plan projects, assign tasks and track deadlines together.",
    observation: "The second version names the job the product does. The first asks the visitor to guess.",
  },
  {
    label: "Who is it for?",
    signal: "AUDIENCE",
    visitor: "Is this meant for someone like me?",
    before: "Made for everyone. Built for anything.",
    after: "Project planning for small creative teams juggling client work.",
    observation: "A specific audience can recognize itself faster than it can decode a broad claim.",
  },
  {
    label: "What happens next?",
    signal: "ACTION",
    visitor: "What will happen when I click?",
    before: "Get started.",
    after: "Watch the 2-minute product walkthrough.",
    observation: "A specific next step makes the action easier to understand before taking it.",
  },
] as const;

export default function StrangerLensLanding({
  url, onUrlChange, onAnalyze, isVerifying, errorMessage,
}: StrangerLensLandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeExample, setActiveExample] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
            <p className="slr-hero-subtitle">You know your product. A first-time visitor doesn't.</p>
            <p className="slr-hero-description">StrangerLens looks at what your words actually communicate: what's clear, what might raise a question, and what deserves a second look. Start with five free clarity scores.</p>
            <form id="slr-scan" className="slr-scan-form slr-hero-scan" onSubmit={onAnalyze} noValidate>
              <div className="slr-input-wrap">
                <label htmlFor="slr-website-url" className="slr-sr-only">Your public website URL</label>
                <Link2 size={20} className="slr-input-icon" aria-hidden="true"/>
                <input id="slr-website-url" ref={inputRef} type="url" inputMode="url" autoComplete="url" autoCapitalize="off" spellCheck={false}
                  placeholder="yourwebsite.com" value={url} onChange={event=>onUrlChange(event.target.value)}
                  aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage?"slr-url-error":undefined}
                  disabled={isVerifying}/>
              </div>
              <button className="slr-button slr-form-submit" type="submit" disabled={isVerifying}>
                <span>{isVerifying?"Checking your website...":"Reveal My Clarity Score — Free"}</span>
                <ArrowUpRight size={18} aria-hidden="true"/>
              </button>
              {errorMessage&&<p id="slr-url-error" role="alert" className="slr-input-error">{errorMessage}</p>}
            </form>
            <div className="slr-hero-assurances">
              <span><Check size={14} aria-hidden="true"/> Free score &amp; 5 checks</span>
              <span><Check size={14} aria-hidden="true"/> No account needed</span>
            </div>
          </div>
          <LandingResultPreview/>
        </section>


        <section id="why-it-matters" className="slr-section slr-why slr-container" aria-labelledby="slr-why-title">
          <div className="slr-why-heading">
            <span className="slr-eyebrow">WHY STRANGERLENS EXISTS</span>
            <h2 id="slr-why-title">You're close to your product.<br/><span>Your visitor is seeing it for the first time.</span></h2>
            <p>You know the story behind every feature. Someone landing on your homepage doesn't. They have a few questions, and the page has to answer them without you standing there to explain.</p>
          </div>
          <div className="slr-perspective-grid">
            <article className="slr-perspective slr-perspective--founder">
              <span className="slr-perspective-tag">WHAT YOU KNOW</span>
              <h3>“Of course they’ll get it.”</h3>
              <p>You know who it's built for, which problem it solves and why the details matter.</p>
              <div className="slr-perspective-caption">The context in your head</div>
            </article>
            <article className="slr-perspective slr-perspective--visitor">
              <span className="slr-perspective-tag">WHAT THEY SEE</span>
              <h3>“Wait, what is this?”</h3>
              <p>A headline, a few claims and a button. They have to piece the whole story together.</p>
              <div className="slr-perspective-caption">The context on the page</div>
            </article>
          </div>
          <p className="slr-why-conclusion"><span aria-hidden="true">↳</span> StrangerLens was built for that gap: the distance between what you mean and what a new visitor can understand.</p>
        </section>

        <section id="explore" className="slr-section slr-explore slr-container" aria-labelledby="slr-explore-title">
          <div className="slr-section-heading slr-center">
            <span className="slr-eyebrow">EXPLORE THE DIFFERENCE</span>
            <h2 id="slr-explore-title">Same product. Clearer words<span className="slr-lime-period">.</span></h2>
            <p>Pick a question a new visitor might have. See how a small change in the message can help answer it.</p>
          </div>
          <div className="slr-explore-workbench">
            <div className="slr-explore-selector" role="group" aria-label="Explore visitor questions">
              <span className="slr-workbench-caption">A VISITOR IS THINKING…</span>
              {exploreCases.map((item,index)=>(
                <button key={item.signal} type="button" className={`slr-explore-choice ${activeExample===index?"is-active":""}`}
                  onClick={()=>setActiveExample(index)} aria-pressed={activeExample===index}>
                  <span className="slr-explore-choice-number">0{index+1}</span>
                  <span>{item.label}</span>
                  <ArrowUpRight size={16} aria-hidden="true"/>
                </button>
              ))}
              <div className="slr-explore-side-note">These are illustrative copy examples, not results from a real website.</div>
            </div>
            <div className="slr-explore-result" aria-live="polite" aria-atomic="true">
              <div className="slr-explore-topline">
                <span className="slr-workbench-caption">THE STRANGER'S QUESTION</span>
                <span className="slr-explore-signal">{exploreCases[activeExample].signal} SIGNAL</span>
              </div>
              <h3>“{exploreCases[activeExample].visitor}”</h3>
              <div className="slr-copy-comparison">
                <div className="slr-copy-block slr-copy-block--before">
                  <span>BEFORE · EASY TO MISREAD</span>
                  <p>“{exploreCases[activeExample].before}”</p>
                </div>
                <div className="slr-copy-block slr-copy-block--after">
                  <span>AFTER · MORE SPECIFIC</span>
                  <p>“{exploreCases[activeExample].after}”</p>
                </div>
              </div>
              <p className="slr-explore-explanation"><Check size={17} aria-hidden="true"/>{exploreCases[activeExample].observation}</p>
            </div>
          </div>
          <div className="slr-explore-footnote">StrangerLens checks five parts of your message: First Impression, Audience, Value, Trust and Action.</div>
        </section>

        <section id="how-it-works" className="slr-section slr-process slr-container" aria-labelledby="slr-process-title">
          <div className="slr-section-heading slr-center">
            <span className="slr-eyebrow">FROM GUT FEELING TO A CLEAR NEXT STEP</span>
            <h2 id="slr-process-title">Know what comes across.<br/>Then know what to improve.</h2>
            <p>It starts with a quick read of your website and ends with something more useful than “make the copy better.”</p>
          </div>
          <div className="slr-process-grid">
            <article className="slr-process-card">
              <span className="slr-process-number">01 / LOOK</span>
              <h3>Enter your website</h3>
              <p>StrangerLens reads your reachable homepage and supporting pages to understand the message you're putting out.</p>
            </article>
            <article className="slr-process-card">
              <span className="slr-process-number">02 / NOTICE</span>
              <h3>Find your weak spots</h3>
              <p>See an overall score and five signal scores. Find which parts of the message deserve attention first.</p>
            </article>
            <article className="slr-process-card">
              <span className="slr-process-number">03 / IMPROVE</span>
              <h3>Get a practical direction</h3>
              <p>Go deeper with page evidence, possible visitor doubts, prioritized fixes and wording suggestions you can adapt.</p>
            </article>
          </div>
          <div className="slr-process-bottom">
            <div><strong>Not another vague score.</strong><span>Every detailed finding should help you answer “why does this matter?” and “what could I change?”</span></div>
            <span className="slr-process-quiet">Advice, not automatic website edits.</span>
          </div>
        </section>

        <section id="faq" className="slr-section slr-faq-section slr-container">
          <div className="slr-section-heading slr-center">
            <span className="slr-eyebrow">BEFORE YOU TRY IT</span>
            <h2>FAQ<span className="slr-lime-period">.</span></h2>
          </div>
          <div className="slr-faq-list">
            {questions.map(({q,a}) => <details className="slr-faq" key={q}><summary><span>{q}</span><ChevronDown size={20} aria-hidden="true"/></summary><p>{a}</p></details>)}
          </div>
        </section>

        <section id="pricing" className="slr-section slr-final-offer slr-container" aria-labelledby="slr-pricing-title">
          <div className="slr-section-heading slr-center">
            <span className="slr-eyebrow">WHEN YOU'RE READY</span>
            <h2 id="slr-pricing-title">See the signals first.<br/><span>Choose the detail you need.</span></h2>
            <p>Start without paying. If you want the reasons behind the scores and a practical improvement plan, you can get the complete report.</p>
          </div>
          <div className="slr-price-grid slr-final-price-grid">
            <div className="slr-price-card">
              <span className="slr-price-label">THE FIRST LOOK</span>
              <div className="slr-price"><strong>$0</strong><span>free</span></div>
              <p className="slr-price-description">A quick picture of how clearly your site introduces itself.</p>
              <ul>
                <li><Check size={17}/> Overall clarity score</li>
                <li><Check size={17}/> Five signal scores and statuses</li>
                <li><Check size={17}/> Your lowest-scoring area</li>
              </ul>
            </div>
            <div className="slr-price-card slr-price-featured">
              <span className="slr-price-label">THE DEEPER LOOK <span className="slr-price-chip">ONE-TIME</span></span>
              <div className="slr-price"><strong>$9</strong><span>per report · no subscription</span></div>
              <p className="slr-price-description">Understand why your message might be unclear and what to change.</p>
              <ul>
                <li><Check size={17}/> Detailed findings and page evidence</li>
                <li><Check size={17}/> Prioritized improvement plan</li>
                <li><Check size={17}/> Suggested copy rewrites</li>
                <li><Check size={17}/> Downloadable PDF</li>
              </ul>
            </div>
          </div>
          <div className="slr-final-action">
            <button type="button" className="slr-button" onClick={goToScan}>Check My Website — Free <ArrowUpRight size={17} aria-hidden="true"/></button>
            <p>You'll see your initial scores before deciding whether to get the full report.</p>
            <p className="slr-pricing-disclosure"><Link href="/refund-policy">Refund Policy</Link> · <Link href="/terms">Terms of Service</Link></p>
          </div>
        </section>

      </main>

      <footer className="slr-footer slr-container">
        <div className="slr-footer-main"><a className="slr-brand" href="#top"><img src="/strangerlens-mark.webp" alt="" width={34} height={34}/><span>StrangerLens<span className="slr-brand-dot">.</span></span></a><p>Know what your website explains—and what it leaves unclear.</p></div>
        <div className="slr-footer-links">{LEGAL_CONFIG.links.map(link => <Link href={link.href} key={link.href}>{link.label}</Link>)}<a href={getSupportGmailComposeUrl()} target="_blank" rel="noopener noreferrer">Email support</a></div>
        <div className="slr-footer-bottom"><span>© {new Date().getFullYear()} StrangerLens. All rights reserved.</span><span>Website clarity, made simple.</span></div>
      </footer>
    </div>
  );
}

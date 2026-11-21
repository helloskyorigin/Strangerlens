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
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const questions = [
  {
    q: "What exactly does StrangerLens analyze?",
    a: "Enter your website link. StrangerLens evaluates how clearly your message explains what you do, who it's for, why it matters, whether it feels trustworthy, and what to do next. Paid websites may receive an extra buying-confidence check.",
  },
  {
    q: "Is this a real visitor test?",
    a: "No. StrangerLens reviews your website's message using AI. It doesn't watch visitors or measure real purchases.",
  },
  {
    q: "What do I see before paying?",
    a: "The free preview includes an overall clarity score and scores and statuses for the five core signals. Detailed reasons, evidence, copy suggestions and fixes are part of the Full Analysis.",
  },
  {
    q: "What is included in the $9 report?",
    a: "You'll get the stranger's view, what's holding your message back, possible buyer doubts, a prioritized fix-first plan, clearer wording suggestions, and a downloadable PDF.",
  },
  {
    q: "Does it edit my website for me?",
    a: "No. StrangerLens tells you what may be unclear and gives you wording and improvement directions to review. You stay in control of any changes.",
  },
  {
    q: "Will it work on any URL?",
    a: "Your website needs to be reachable and readable. Private or blocked pages may return limited results.",
  },
  {
    q: "Can I reopen a purchased report?",
    a: "Yes, using your original report link and browser. Save your receipt, and contact support if you lose access.",
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
            <p className="slr-hero-subtitle">Your homepage can look polished and still leave people guessing.</p>
            <p className="slr-hero-description">Find out what your website explains well, where visitors may hesitate, and what deserves attention. Your first five scores are free.</p>
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

        <section id="full-report" className="slr-section slr-paid-proof slr-container">
          <div className="slr-paid-proof-intro">
            <span className="slr-eyebrow">WHEN YOU WANT TO FIX IT</span>
            <h2>The score tells you where.<br/><span>The full report shows you what to change.</span></h2>
            <p>See your clarity score for free. Then unlock specific findings, fixes and better wording in one useful report.</p>
            <div className="slr-paid-proof-price"><strong>$9</strong><span>once per report<br/>No subscription</span></div>
            <button type="button" className="slr-button slr-paid-proof-cta" onClick={goToScan}>
              Check My Website First <ArrowUpRight size={16} aria-hidden="true"/>
            </button>
            <p className="slr-paid-proof-note"><Check size={14} aria-hidden="true"/> Free preview first. Pay only when you want the fixes.</p>
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
        </section>

        <section id="how-it-works" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">FROM URL TO CLARITY</span>
            <h2>Paste your URL. See what comes across<span className="slr-lime-period">.</span></h2></div>
          <div className="slr-steps">
            <div className="slr-step"><div className="slr-step-number">01</div><div><h3>Enter your website</h3><p>Paste the link to your website.</p></div></div>
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
              <small>Includes your downloadable full report.</small>
            </div>
          </div>
          <p className="slr-pricing-disclosure"><Link href="/refund-policy">Refund Policy</Link> · <Link href="/terms">Terms of Service</Link></p>
        </section>

        <section id="faq" className="slr-section slr-faq-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">HELPFUL ANSWERS</span><h2>FAQ<span className="slr-lime-period">.</span></h2></div>
          <div className="slr-faq-list">
            {questions.map(({q,a}) => <details className="slr-faq" key={q}><summary><span>{q}</span><ChevronDown size={20} aria-hidden="true"/></summary><p>{a}</p></details>)}
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

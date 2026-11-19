"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp,
  Download, Eye, Fingerprint, Link2, ListChecks,
  LockKeyhole, Menu, RefreshCw, SearchCheck,
  ShieldCheck, Sparkles, Target, WandSparkles, X,
} from "lucide-react";
import { LEGAL_CONFIG, getSupportGmailComposeUrl } from "@/lib/legal-config";

interface StrangerLensLandingProps {
  url: string;
  onUrlChange: (next: string) => void;
  onAnalyze: (event: React.FormEvent<HTMLFormElement>) => void;
  isVerifying: boolean;
  errorMessage: string | null;
}

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "What we check", href: "#what-we-check" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const signals = [
  { name: "First impression", subtitle: "The first five seconds", description: "What does your homepage communicate before someone starts exploring?", icon: Eye },
  { name: "Audience", subtitle: "Who is this for?", description: "Can a new visitor tell whether your product or service is meant for them?", icon: Target },
  { name: "Value", subtitle: "Why should I care?", description: "Is the benefit clear, specific, and easy to understand?", icon: Sparkles },
  { name: "Trust", subtitle: "Can I believe this?", description: "Does the accessible website content offer credible reasons to feel confident?", icon: ShieldCheck },
  { name: "Action", subtitle: "What happens next?", description: "Is the next step easy to recognize and understand?", icon: ArrowUpRight },
  { name: "Purchase readiness", subtitle: "For paid offers", description: "A separate assessment when a real paid product or service is detected.", icon: LockKeyhole, conditional: true },
];

const capabilities = [
  { title: "The stranger's view", copy: "A plain-language outside perspective on your homepage's message, without your insider knowledge.", icon: Eye },
  { title: "Evidence behind the issues", copy: "Understand why something was flagged, with inspected website wording when it is available.", icon: SearchCheck },
  { title: "What to fix first", copy: "A prioritized improvement plan instead of a long, unstructured list of advice.", icon: ListChecks },
  { title: "Better Copy Studio", copy: "Review, edit and copy clearer wording suggestions grounded in your actual offering.", icon: WandSparkles },
  { title: "Recheck & compare", copy: "Run a fresh check after making changes and compare the recorded clarity scores.", icon: RefreshCw },
  { title: "PDF + My Reports", copy: "Download your full report and reopen saved reports from the same browser.", icon: Download },
];

const questions = [
  { q: "What does StrangerLens actually check?", a: "It reviews accessible public website content for first-impression clarity, audience, value, trust and action. A separate Purchase Readiness assessment may appear for genuine paid offers. It is not an SEO, security, or live human usability test." },
  { q: "Do I need to create an account?", a: "No. You can run the free preview without an account or credit card." },
  { q: "What do I get for free?", a: "Your overall website clarity score, five core signal scores and their clarity statuses. More detailed evidence and recommended changes are in the full report." },
  { q: "What does the $5 Full Analysis include?", a: "Detailed signal findings, evidence-to-fix recommendations, a priority action plan, Better Copy Studio, first-five-seconds analysis and a downloadable report. Purchase Readiness is included when applicable." },
  { q: "Does StrangerLens watch real people use my website?", a: "No. It offers an AI-based interpretation of inspected public content, not recordings, interviews, or measurements of actual visitor behavior." },
  { q: "Can it check every website?", a: "It works best on public websites with readable text in their initial HTML. JavaScript-only pages, login-protected pages and websites that block automated access may have limited coverage." },
  { q: "Is it a subscription?", a: "No. Full Analysis is $5 per report, paid once. Run the free check before deciding to unlock it." },
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
    document.getElementById("slr-scan")?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus({ preventScroll: true });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="slr-page" id="top">
      <a href="#main-content" className="slr-skip">Skip to content</a>

      <header className="slr-header">
        <div className="slr-container slr-navbar">
          <a className="slr-brand" href="#top" aria-label="StrangerLens home" onClick={closeMenu}>
            <img src="/strangerlens-mark.webp" alt="" width={40} height={40} />
            <span>StrangerLens<span className="slr-brand-dot">.</span></span>
          </a>

          <nav className="slr-navlinks" aria-label="Primary navigation">
            {navLinks.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
            <Link href="/my-reports">My Reports</Link>
          </nav>

          <div className="slr-nav-actions">
            <button type="button" className="slr-button slr-nav-cta" onClick={goToScan}>
              Check my website <ArrowUpRight size={16} />
            </button>
            <button type="button" className="slr-menu-toggle" onClick={() => setMenuOpen(open => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="slr-mobile-menu">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="slr-mobile-menu" className="slr-mobile-menu slr-container" aria-label="Mobile navigation">
            {navLinks.map(link => <a key={link.href} href={link.href} onClick={closeMenu}>{link.label}<ArrowUpRight size={16} /></a>)}
            <Link href="/my-reports" onClick={closeMenu}>My Reports<ArrowUpRight size={16} /></Link>
            <button type="button" className="slr-button" onClick={goToScan}>Check my website <ArrowUpRight size={16} /></button>
          </nav>
        )}
      </header>

      <main id="main-content">
        <section className="slr-hero slr-container" aria-labelledby="slr-hero-title">
          <div className="slr-kicker"><span className="slr-kicker-dot" /> MADE FOR FOUNDERS, CREATORS & WEBSITE OWNERS</div>
          <h1 id="slr-hero-title">See your website through <span className="slr-underline">a stranger&apos;s eyes.</span></h1>
          <p className="slr-hero-subtitle">Your website makes sense to you. But does it make sense to someone seeing it for the first time?</p>
          <p className="slr-hero-description">Find what&apos;s unclear, what may be missing, and what to improve first — based on your website&apos;s actual public content.</p>

          <form id="slr-scan" className="slr-scan-form" onSubmit={onAnalyze} noValidate>
            <div className="slr-input-wrap">
              <label htmlFor="slr-website-url" className="slr-sr-only">Your public website URL</label>
              <Link2 size={20} className="slr-input-icon" aria-hidden="true" />
              <input id="slr-website-url" ref={inputRef} type="text" inputMode="url" autoComplete="url" spellCheck={false}
                placeholder="Paste your website URL..." value={url} onChange={event => onUrlChange(event.target.value)}
                aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? "slr-url-error" : "slr-form-note"} disabled={isVerifying} />
              <button className="slr-button slr-form-submit" type="submit" disabled={isVerifying}>
                <span>{isVerifying ? "Connecting..." : "Check my website free"}</span><ArrowUpRight size={18} aria-hidden="true" />
              </button>
            </div>
            {errorMessage && <p id="slr-url-error" role="alert" className="slr-input-error">{errorMessage}</p>}
            <p className="slr-form-note" id="slr-form-note"><Check size={15} /> Free first look <span>·</span> No signup <span>·</span> No card required</p>
          </form>
        </section>

        <section className="slr-preview-wrap slr-container" aria-label="Illustrative example of a StrangerLens report">
          <div className="slr-preview-panel">
            <div className="slr-preview-intro">
              <div className="slr-pill"><span className="slr-green-dot" /> THE OUTSIDE PERSPECTIVE</div>
              <h2>You built it.<br />Now see it with <span>fresh eyes.</span></h2>
              <p>Forget the endless scorecards. Understand the story your website communicates — and where that story could be clearer.</p>
              <span className="slr-sample-disclaimer">Illustrative report example, not a live visitor recording.</span>
            </div>
            <div className="slr-preview-report">
              <div className="slr-preview-top"><div className="slr-mini-brand"><span className="slr-mini-logo">S</span><strong>StrangerLens</strong></div><span>Sample report</span></div>
              <div className="slr-report-item"><span className="slr-report-icon"><Eye size={18} /></span><div><strong>Stranger&apos;s view</strong><p>“I can tell this is a productivity tool, but who is it really for?”</p></div></div>
              <div className="slr-report-item"><span className="slr-report-icon slr-report-warn"><CircleHelp size={18} /></span><div><strong>What&apos;s unclear</strong><p>The headline describes the category but not the specific benefit.</p></div></div>
              <div className="slr-report-item"><span className="slr-report-icon"><WandSparkles size={18} /></span><div><strong>What to improve</strong><p>Make the audience and outcome explicit in the first headline.</p></div></div>
              <div className="slr-preview-caption"><span className="slr-green-dot" /> Built around evidence, not invented visitor behavior</div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">THREE SIMPLE STEPS</span><h2>How it works<span className="slr-lime-period">.</span></h2><p>An outside perspective, without the guesswork.</p></div>
          <div className="slr-steps">
            <div className="slr-step"><div className="slr-step-number">01</div><div><h3>Paste your URL</h3><p>Enter any publicly accessible website you want to review.</p></div></div>
            <ArrowRight className="slr-step-arrow" size={21} aria-hidden="true" />
            <div className="slr-step"><div className="slr-step-number">02</div><div><h3>Get a fresh perspective</h3><p>See how your public website content comes across to someone new.</p></div></div>
            <ArrowRight className="slr-step-arrow" size={21} aria-hidden="true" />
            <div className="slr-step"><div className="slr-step-number">03</div><div><h3>Know what to improve</h3><p>Go from an unclear message to evidence-backed next steps.</p></div></div>
          </div>
        </section>

        <section id="what-we-check" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">WHAT A STRANGER NOTICES</span><h2>Six ways to see it clearer<span className="slr-lime-period">.</span></h2><p>Five core clarity signals, plus a separate check for applicable paid offers.</p></div>
          <div className="slr-signal-grid">
            {signals.map((signal, index) => {
              const Icon = signal.icon;
              return <article className={"slr-signal-card" + (signal.conditional ? " slr-signal-conditional" : "")} key={signal.name}>
                <div className="slr-signal-head"><span className="slr-card-icon"><Icon size={22} strokeWidth={1.9} /></span><span className="slr-signal-index">{String(index + 1).padStart(2, "0")} / 06</span></div>
                <h3>{signal.name}</h3><span className="slr-signal-tagline">{signal.subtitle}</span><p>{signal.description}</p>
                {signal.conditional && <span className="slr-conditional-note">Only when applicable · Full Analysis</span>}
              </article>;
            })}
          </div>
        </section>

        <section id="features" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">MORE THAN A CLARITY SCORE</span><h2>From first look to the next fix<span className="slr-lime-period">.</span></h2><p>Everything built into StrangerLens, organized around making your website easier to understand.</p></div>
          <div className="slr-feature-grid">
            {capabilities.map((feature, index) => {
              const Icon = feature.icon;
              return <article className={"slr-feature-card" + (index < 2 ? " slr-feature-featured" : "")} key={feature.title}>
                <span className="slr-card-icon"><Icon size={23} strokeWidth={1.85} /></span>
                <h3>{feature.title}</h3><p>{feature.copy}</p>
              </article>;
            })}
          </div>
          <p className="slr-feature-note"><Fingerprint size={17} /> First-five-seconds perspective, five detailed signal chapters and conditional Purchase Readiness are part of the full report. Recommendations are based on accessible content, not measured conversions.</p>
        </section>

        <section id="pricing" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">SIMPLE, ONE-TIME PRICING</span><h2>Look first. Decide later<span className="slr-lime-period">.</span></h2><p>See your clarity scores free. Pay only if you want the full reasons and fixes.</p></div>
          <div className="slr-price-grid">
            <div className="slr-price-card">
              <span className="slr-price-label">FREE PREVIEW</span>
              <div className="slr-price"><strong>$0</strong><span>no card needed</span></div>
              <p className="slr-price-description">A first outside look at how clearly your website communicates.</p>
              <ul><li><Check size={17} /> Overall clarity score</li><li><Check size={17} /> Five core signal scores</li><li><Check size={17} /> Clarity statuses</li><li><Check size={17} /> No account required</li></ul>
              <button className="slr-button slr-price-button slr-price-outline" type="button" onClick={goToScan}>Start free <ArrowUpRight size={17} /></button>
            </div>
            <div className="slr-price-card slr-price-featured">
              <span className="slr-price-label">FULL ANALYSIS <span className="slr-price-chip">ONE-TIME</span></span>
              <div className="slr-price"><strong>$5</strong><span>per report</span></div>
              <p className="slr-price-description">Know what is unclear, why it matters, and what you can improve.</p>
              <ul><li><Check size={17} /> Detailed signal findings</li><li><Check size={17} /> Evidence-to-fix recommendations</li><li><Check size={17} /> Priority action plan + copy studio</li><li><Check size={17} /> First-five-seconds breakdown</li><li><Check size={17} /> PDF report + applicable purchase check</li></ul>
              <button className="slr-button slr-price-button" type="button" onClick={goToScan}>Check your website first <ArrowUpRight size={17} /></button>
              <small>Start with a free scan, then unlock that report.</small>
            </div>
          </div>
        </section>

        <section id="faq" className="slr-section slr-faq-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">GOOD TO KNOW</span><h2>Questions? Answered<span className="slr-lime-period">.</span></h2></div>
          <div className="slr-faq-list">
            {questions.map(({q,a}) => <details className="slr-faq" key={q}><summary><span>{q}</span><ChevronDown size={20} aria-hidden="true" /></summary><p>{a}</p></details>)}
          </div>
        </section>

        <section className="slr-bottom-cta slr-container">
          <div className="slr-bottom-panel"><span className="slr-eyebrow">READY FOR AN OUTSIDE PERSPECTIVE?</span><h2>You know your website.<br />See what a stranger might miss.</h2><p>Your free clarity preview is just a URL away.</p><button type="button" className="slr-button" onClick={goToScan}>Check my website free <ArrowUpRight size={17} /></button></div>
        </section>
      </main>

      <footer className="slr-footer slr-container">
        <div className="slr-footer-main"><a className="slr-brand" href="#top"><img src="/strangerlens-mark.webp" alt="" width={34} height={34} /><span>StrangerLens<span className="slr-brand-dot">.</span></span></a><p>See your website through a stranger&apos;s eyes.</p></div>
        <div className="slr-footer-links"><Link href="/my-reports">My Reports</Link>{LEGAL_CONFIG.links.map(link => <Link href={link.href} key={link.href}>{link.label}</Link>)}<a href={getSupportGmailComposeUrl()} target="_blank" rel="noopener noreferrer">Support</a></div>
        <div className="slr-footer-bottom">© {new Date().getFullYear()} StrangerLens. All rights reserved. <span>AI assessment of publicly accessible website content.</span></div>
      </footer>
    </div>
  );
}

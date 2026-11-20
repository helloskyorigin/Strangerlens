"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp,
  Download, Eye, Link2, ListChecks, LockKeyhole, Menu,
  SearchCheck, ShieldCheck, Sparkles, Target, WandSparkles, X,
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
  { label: "Full report", href: "#full-report" },
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

const signals = [
  { name: "First impression", question: "What is this?", description: "Whether the opening message explains what the website is about.", icon: Eye },
  { name: "Audience", question: "Is this for me?", description: "Whether the people this is meant for can recognize themselves.", icon: Target },
  { name: "Value", question: "Why would I care?", description: "Whether the benefit is specific and understandable.", icon: Sparkles },
  { name: "Trust", question: "Can I believe it?", description: "Whether the inspected content provides credible support for its claims.", icon: ShieldCheck },
  { name: "Action", question: "What now?", description: "Whether the intended next step is clear from the page.", icon: ArrowUpRight },
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
    q: "How do I access an old report?",
    a: "Use My Reports in the same browser where you ran the check. Report access relies on browser-held references, so clearing your browser data or switching devices may remove access. Keep your payment receipt and contact support if you need help.",
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
            <Link href="/my-reports">My Reports</Link>
          </nav>
          <div className="slr-nav-actions">
            <button type="button" className="slr-button slr-nav-cta" onClick={goToScan}>
              Check my website <ArrowUpRight size={16} />
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
            <Link href="/my-reports" onClick={() => setMenuOpen(false)}>My Reports<ArrowUpRight size={16} /></Link>
            <button type="button" className="slr-button" onClick={goToScan}>Check my website <ArrowUpRight size={16} /></button>
          </nav>
        )}
      </header>

      <main id="main-content">
        <section className="slr-hero slr-container" aria-labelledby="slr-hero-title">
          <div className="slr-kicker"><span className="slr-kicker-dot" /> A FRESH LOOK AT YOUR WEBSITE</div>
          <h1 id="slr-hero-title">You know your website.<br /><span className="slr-underline">A stranger doesn&apos;t.</span></h1>
          <p className="slr-hero-subtitle">See your website through someone else&apos;s eyes.</p>
          <p className="slr-hero-description">Discover what your page communicates, where its message falls short, and what to improve — backed by the content actually on your site.</p>
          <form id="slr-scan" className="slr-scan-form" onSubmit={onAnalyze} noValidate>
            <div className="slr-input-wrap">
              <label htmlFor="slr-website-url" className="slr-sr-only">Your public website URL</label>
              <Link2 size={20} className="slr-input-icon" aria-hidden="true" />
              <input id="slr-website-url" ref={inputRef} type="text" inputMode="url" autoComplete="url" spellCheck={false}
                placeholder="yourwebsite.com" value={url} onChange={event => onUrlChange(event.target.value)}
                aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? "slr-url-error" : undefined}
                disabled={isVerifying} />
              <button className="slr-button slr-form-submit" type="submit" disabled={isVerifying}>
                <span>{isVerifying ? "Connecting to website..." : "See my website differently"}</span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </button>
            </div>
            {errorMessage && <p id="slr-url-error" role="alert" className="slr-input-error">{errorMessage}</p>}
          </form>
        </section>

        <section className="slr-story slr-container" aria-labelledby="slr-story-title">
          <div className="slr-story-heading">
            <span className="slr-eyebrow">THE PROBLEM WITH KNOWING YOUR PRODUCT TOO WELL</span>
            <h2 id="slr-story-title">You know what every sentence means.<br /><span>New visitors have to figure it out.</span></h2>
            <p>You know the features, the audience and the backstory. Someone arriving for the first time only has what&apos;s written on the page.</p>
          </div>
          <div className="slr-story-grid">
            <div className="slr-story-card slr-story-founder"><span className="slr-story-mark"><Check size={18}/></span><span className="slr-story-label">IN YOUR HEAD</span>
              <h3>“Of course they understand it.”</h3>
              <p>You already know who it&apos;s for, what it does and why it matters.</p>
              <div className="slr-story-quote">The product is obvious because you built it.</div>
            </div>
            <div className="slr-story-card slr-story-stranger"><span className="slr-story-mark"><CircleHelp size={19}/></span><span className="slr-story-label">ON THE FIRST VISIT</span>
              <h3>“Wait, what is this actually for?”</h3>
              <p>The headline may sound polished but still leave important questions unanswered.</p>
              <div className="slr-story-quote">The meaning has to work without an explanation.</div>
            </div>
          </div>
          <p className="slr-story-foot">StrangerLens helps you spot that gap using an AI assessment of inspected public website content.</p>
        </section>

        <section className="slr-example slr-container" id="sample-report" aria-labelledby="slr-example-title">
          <div className="slr-section-heading slr-example-heading">
            <div><span className="slr-eyebrow">THE KIND OF INSIGHT THAT MATTERS</span>
              <h2 id="slr-example-title">From “sounds good”<br />to <span>“now I get it.”</span></h2></div>
            <p>See how a familiar homepage line can sound different to somebody who has never heard of the business.</p>
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

        <section id="what-we-check" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">THE QUESTIONS A NEW VISITOR NEEDS ANSWERED</span>
            <h2>Five signals. One clearer story<span className="slr-lime-period">.</span></h2>
            <p>Not five random ratings. Five ways to understand whether your page explains itself.</p></div>
          <div className="slr-signal-grid">
            {signals.map((signal, index) => {
              const Icon = signal.icon;
              return <article className="slr-signal-card" key={signal.name}>
                <div className="slr-signal-head"><span className="slr-card-icon"><Icon size={23} strokeWidth={1.8} /></span><span className="slr-signal-index">{String(index + 1).padStart(2, "0")}</span></div>
                <h3>{signal.name}</h3><span className="slr-signal-tagline">{signal.question}</span><p>{signal.description}</p>
              </article>;
            })}
            <article className="slr-signal-extra"><div className="slr-signal-extra-icon"><LockKeyhole size={24}/></div>
              <div><span>ADDITIONAL / WHEN APPLICABLE</span><h3>Purchase readiness</h3><p>If the site offers something paid, the full analysis includes a separate look at how clearly the buying decision is presented. It doesn&apos;t change the five-signal clarity score.</p></div>
            </article>
          </div>
        </section>

        <section id="full-report" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">INSIDE YOUR FULL ANALYSIS</span>
            <h2>Don&apos;t just find confusion.<br /><span>Know what to change.</span></h2>
            <p>Six focused capabilities, one clear purpose: understand your website and improve what matters.</p></div>
          <div className="slr-deep-grid">
            <article className="slr-deep-card slr-deep-primary">
              <div className="slr-deep-icon"><SearchCheck size={24}/></div><span className="slr-deep-eyebrow">01 / EVIDENCE TO FIX</span>
              <h3>Understand the why behind each finding.</h3><p>See the exact inspected wording when available, what it makes unclear and the recommended direction.</p>
              <div className="slr-deep-mini-report"><small>EXAMPLE / HEADLINE</small><span>“Make work effortless.”</span><div><span>Observation</span><p>Doesn&apos;t explain which work or for whom.</p></div><div><span>Next edit</span><p>Describe the user, the job and the outcome.</p></div></div>
            </article>
            <article className="slr-deep-card slr-deep-priority">
              <div className="slr-deep-icon"><ListChecks size={24}/></div><span className="slr-deep-eyebrow">02 / PRIORITIZED IMPROVEMENTS</span>
              <h3>Know where to start.</h3><p>One primary recommendation and additional improvements, organized by priority instead of buried in a wall of feedback.</p>
              <div className="slr-deep-priority-list"><span><b>01</b> Most important change</span><span><b>02</b> Next useful improvement</span><span><b>03</b> Worth testing afterward</span></div>
            </article>
            <article className="slr-deep-card">
              <span className="slr-deep-icon"><WandSparkles size={22}/></span><h3>Better Copy Studio</h3>
              <p>Review, edit and copy suggested wording grounded in your offering.</p>
            </article>
            <article className="slr-deep-card">
              <span className="slr-deep-icon"><Eye size={22}/></span><h3>Stranger&apos;s View</h3>
              <p>Discover what your page communicates at first glance, including the first-five-seconds breakdown.</p>
            </article>
            <article className="slr-deep-card">
              <span className="slr-deep-icon"><Target size={22}/></span><h3>Five-Signal Diagnosis</h3>
              <p>Read why each clarity signal scored as it did, what works and what to improve.</p>
            </article>
            <article className="slr-deep-card">
              <span className="slr-deep-icon"><LockKeyhole size={22}/></span><h3>Purchase Readiness</h3>
              <p>A separate buyer-decision analysis when a real paid offer is detected.</p>
            </article>
          </div>
          <div className="slr-deep-foot"><ShieldCheck size={18}/><p>Findings are based on accessible website content, not invented testimonials, measured visitor behavior or promises of more sales.</p></div>
        </section>

        <section id="how-it-works" className="slr-section slr-container">
          <div className="slr-section-heading slr-center"><span className="slr-eyebrow">A BETTER VIEW IN THREE STEPS</span>
            <h2>Simple to start. Useful when it counts<span className="slr-lime-period">.</span></h2></div>
          <div className="slr-steps">
            <div className="slr-step"><div className="slr-step-number">01</div><div><h3>Enter your website</h3><p>Give StrangerLens a public URL to inspect.</p></div></div>
            <ArrowRight className="slr-step-arrow" size={21} aria-hidden="true" />
            <div className="slr-step"><div className="slr-step-number">02</div><div><h3>See the outside perspective</h3><p>Review the five clarity scores and the lowest-scoring area.</p></div></div>
            <ArrowRight className="slr-step-arrow" size={21} aria-hidden="true" />
            <div className="slr-step"><div className="slr-step-number">03</div><div><h3>Go deeper when it matters</h3><p>Unlock evidence, priority fixes and clearer wording in the full report.</p></div></div>
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
              <button className="slr-button slr-price-button" type="button" onClick={goToScan}>Check my website <ArrowUpRight size={17} /></button>
            </div>
            <div className="slr-price-card slr-price-featured">
              <span className="slr-price-label">FULL CLARITY REPORT <span className="slr-price-chip">ONE-TIME</span></span>
              <div className="slr-price"><strong>$9</strong><span>per report</span></div>
              <p className="slr-price-description">Move beyond a number. Understand what needs attention and how to improve it.</p>
              <ul><li><Check size={17} /> All detailed signal findings</li><li><Check size={17} /> Website evidence & practical recommendations</li><li><Check size={17} /> Prioritized improvement plan</li><li><Check size={17} /> Editable copy suggestions</li><li><Check size={17} /> Stranger&apos;s View & first-five-seconds breakdown</li><li><Check size={17} /> Purchase readiness when applicable</li></ul>
              <button className="slr-button slr-price-button" type="button" onClick={goToScan}>See what my website needs <ArrowUpRight size={17} /></button>
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
            <span className="slr-eyebrow">THE NEXT VISITOR WON&apos;T KNOW WHAT YOU KNOW</span>
            <h2>Find the gaps before<br />someone else has to.</h2>
            <p>Take one fresh look at the website you&apos;ve been staring at for months.</p>
            <button type="button" className="slr-button" onClick={goToScan}>Check my website <ArrowUpRight size={17}/></button>
          </div>
        </section>
      </main>

      <footer className="slr-footer slr-container">
        <div className="slr-footer-main"><a className="slr-brand" href="#top"><img src="/strangerlens-mark.webp" alt="" width={34} height={34}/><span>StrangerLens<span className="slr-brand-dot">.</span></span></a><p>A fresh perspective on what your website communicates.</p></div>
        <div className="slr-footer-links"><Link href="/my-reports">My Reports</Link>{LEGAL_CONFIG.links.map(link => <Link href={link.href} key={link.href}>{link.label}</Link>)}<a href={getSupportGmailComposeUrl()} target="_blank" rel="noopener noreferrer">Email support</a></div>
        <div className="slr-footer-bottom"><span>© {new Date().getFullYear()} StrangerLens. All rights reserved.</span><span>AI-based assessment of publicly accessible website content.</span></div>
      </footer>
    </div>
  );
}

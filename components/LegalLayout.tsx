import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, FileText, Mail, RefreshCcw, Shield } from "lucide-react";
import { BRAND_NAME, LEGAL_CONFIG, getSupportGmailComposeUrl } from "@/lib/legal-config";

interface LegalLayoutProps {
  activePage: "privacy" | "terms" | "refund" | "contact";
  badge: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const legalNav = [
  { id: "privacy", label: "Privacy Policy", href: "/privacy", icon: Shield },
  { id: "terms", label: "Terms of Service", href: "/terms", icon: FileText },
  { id: "refund", label: "Refund Policy", href: "/refund-policy", icon: RefreshCcw },
  { id: "contact", label: "Contact Support", href: "/contact", icon: Mail },
] as const;

export default function LegalLayout({ activePage, badge, title, subtitle, children }: LegalLayoutProps) {
  return (
    <div className="slr-legal">
      <header className="slr-legal-header">
        <div className="slr-legal-container slr-legal-nav">
          <Link href="/" className="slr-legal-brand" aria-label="StrangerLens home">
            <img src="/strangerlens-mark.webp" alt="" width={37} height={37}/>
            <span>StrangerLens<span className="slr-brand-dot">.</span></span>
          </Link>
          <span className="slr-legal-center-label">HELP, PRIVACY & TERMS</span>
          <Link href="/" className="slr-legal-back"><ArrowLeft size={16}/> <span>Back to website</span></Link>
        </div>
      </header>

      <main className="slr-legal-container slr-legal-main" id="main-content">
        <nav className="slr-legal-tabs" aria-label="Legal and support pages">
          {legalNav.map(item => {
            const Icon = item.icon;
            return <Link key={item.id} href={item.href} aria-current={activePage === item.id ? "page" : undefined}
              className={activePage === item.id ? "slr-legal-tab is-active" : "slr-legal-tab"}>
              <Icon size={16}/>{item.label}
            </Link>;
          })}
        </nav>

        <div className="slr-legal-intro">
          <div className="slr-legal-overline"><span>{badge}</span><span>Updated {LEGAL_CONFIG.lastUpdated}</span></div>
          <h1>{title}<span className="slr-lime-period">.</span></h1>
          <p>{subtitle}</p>
        </div>

        <article className="slr-legal-document">{children}</article>

        <section className="slr-legal-help" aria-label="Get help">
          <div>
            <span>NEED A HAND?</span>
            <h2>Questions about reports, payments or your data?</h2>
            <p>Reach support at <a href={getSupportGmailComposeUrl()} target="_blank" rel="noopener noreferrer">{LEGAL_CONFIG.supportEmail}</a></p>
          </div>
          {activePage !== "contact" && <Link href="/contact" className="slr-legal-help-button">Contact support <ArrowUpRight size={17}/></Link>}
        </section>
      </main>

      <footer className="slr-legal-footer">
        <div className="slr-legal-container slr-legal-footer-inner">
          <div><strong>{BRAND_NAME}</strong><span>© {new Date().getFullYear()} {BRAND_NAME}</span></div>
          <nav aria-label="Footer links">
            <Link href="/">Home</Link>
            {LEGAL_CONFIG.links.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </nav>
        </div>
      </footer>
    </div>
  );
}

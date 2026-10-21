import React from "react";

/** One crisp, scalable monochrome glyph on every product screen. */
export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`sl-brand-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" width="24" height="24" focusable="false">
        <rect x="3" y="3" width="26" height="26" rx="8" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M8.5 16c2.4-3.5 4.9-5.25 7.5-5.25s5.1 1.75 7.5 5.25c-2.4 3.5-4.9 5.25-7.5 5.25S10.9 19.5 8.5 16Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
        <circle cx="16" cy="16" r="2.4" fill="currentColor"/>
      </svg>
    </span>
  );
}

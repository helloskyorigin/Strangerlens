import React from "react";

/**
 * The StrangerLens mark: an open-ended S-shaped clarity path.
 * A blue → violet field with a cyan endpoint, no eye or generic lock symbol.
 * Renders as a scalable SVG and stays vivid in both themes.
 */
export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`sl-brand-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none" focusable="false">
        <path d="M29.4 11H17c-5.1 0-8.2 2.6-8.2 6.5s2.9 6.1 7.7 6.1h7.2c4.9 0 7.7 2.1 7.7 6.1s-3.1 6.4-8.2 6.4H10.6"
          stroke="#FFFFFF" strokeWidth="3.75" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -4)"/>
        <circle cx="30" cy="8.4" r="2.7" fill="#A9F2FF"/>
        <path d="M9.6 30.5h10.2" stroke="#B3DDFF" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </span>
  );
}

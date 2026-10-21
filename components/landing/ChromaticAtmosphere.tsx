"use client";

import React from "react";

/** Soft moving light only: intentionally no dot field or scattered particles. */
interface Props {
  variant?: "hero" | "threads" | "cta";
  className?: string;
}
export default function ChromaticAtmosphere({ variant = "hero", className = "" }: Props) {
  const threads = variant === "threads" || variant === "cta";
  return (
    <div aria-hidden="true" className={`sl-atmosphere sl-atmosphere--${variant} ${className}`}>
      <span className="sl-aurora sl-aurora--violet"/>
      <span className="sl-aurora sl-aurora--cyan"/>
      <span className="sl-aurora sl-aurora--peach"/>
      {threads && (
        <svg className="sl-focus-threads" viewBox="0 0 900 360" preserveAspectRatio="none" focusable="false">
          {Array.from({ length: 10 }, (_,i) =>
            <path key={i} className="sl-focus-thread"
              d={`M -35 ${100+i*12} C 210 ${-20+i*8}, 290 ${310-i*7}, 530 ${130+i*6} S 780 ${30+i*11}, 930 ${80+i*8}`}
              style={{ animationDelay: `${-i*0.6}s` }}/>)}
          <path className="sl-travel-line" d="M -35 145 C 210 20,290 265,530 160 S780 70,930 120"/>
        </svg>
      )}
    </div>
  );
}

"use client";

import React from "react";

/** Purely decorative, deterministic and cheap: no canvas loop, network images,
 * pointer tracking, animation timers or layout work on each frame. */
const DOTS = [
  [7,14,2.2],[15,37,1.7],[19,74,1.4],[23,20,1.6],[29,48,2.3],[32,83,1.2],
  [39,17,1.8],[43,66,1.3],[48,28,2],[52,83,1.1],[57,9,1.5],[61,42,1.9],
  [64,76,1.1],[69,18,2.2],[74,53,1.4],[80,8,1.8],[83,35,2],[88,70,1.7],
  [93,21,1.3],[96,81,1.6],[5,87,1.2],[12,57,1.3],[36,36,1.3],[72,89,1.8],
  [91,54,2.2],[56,58,1.3],[26,7,1.3],[77,26,1.5]
] as const;

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
      <div className="sl-dot-field">
        {DOTS.map(([x,y,size],i) => (
          <span key={i} className="sl-signal-dot"
            style={{
              left: `${x}%`, top: `${y}%`, width: `${size * 2}px`, height: `${size * 2}px`,
              animationDelay: `${-(i * 1.37).toFixed(2)}s`,
              animationDuration: `${(5.6 + (i % 7) * 0.72).toFixed(2)}s`
            }}/>
        ))}
      </div>
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

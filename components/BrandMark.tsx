import React from "react";

/** Shared StrangerLens mark. Uses the approved neon-lime S icon consistently
 * across scanning, results and other application views. */
export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={"sl-brand-mark " + className} aria-hidden="true">
      <img src="/strangerlens-mark.webp" alt="" width={96} height={96} decoding="async"/>
    </span>
  );
}

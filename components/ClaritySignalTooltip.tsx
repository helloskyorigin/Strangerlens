"use client";

import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import type { CanonicalSignalKey } from "@/lib/report-adapter";

export const CLARITY_SIGNAL_HELP: Record<CanonicalSignalKey, string> = {
  firstImpression: "How quickly visitors understand what your website does.",
  audience: "How clearly your website communicates who it's for.",
  value: "How clearly visitors understand the benefits you offer.",
  trust: "How effectively your website communicates credibility and trustworthiness.",
  action: "How clearly visitors understand what to do next.",
};

interface Viewport { left: number; top: number; width: number; height: number }
interface Anchor { left: number; right: number; top: number; bottom: number }

export function placeSignalTooltip(anchor: Anchor, height: number, viewport: Viewport) {
  const padding = 12, gap = 8;
  const width = Math.max(1, Math.min(288, viewport.width - padding * 2));
  const maxHeight = Math.max(1, viewport.height - padding * 2);
  const actualHeight = Math.min(height, maxHeight);
  const left = Math.max(viewport.left + padding, Math.min(
    (anchor.left + anchor.right - width) / 2,
    viewport.left + viewport.width - padding - width,
  ));
  const above = anchor.top - gap - actualHeight;
  const preferredTop = above >= viewport.top + padding ? above : anchor.bottom + gap;
  const top = Math.max(viewport.top + padding, Math.min(preferredTop, viewport.top + viewport.height - padding - actualHeight));
  return { left, top, width, maxHeight };
}

interface Props {
  signalKey: CanonicalSignalKey;
  name: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/** Controlled by Results so only one explanation can be open across the
 * responsive rows. A body portal escapes the signal card's overflow:hidden. */
export default function ClaritySignalTooltip({ signalKey, name, isOpen, onOpen, onClose }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const pointerFocus = useRef(false);
  const keyboardFocus = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<ReturnType<typeof placeSignalTooltip> | null>(null);

  const stopCloseTimer = () => {
    if (closeTimer.current !== null) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const dismiss = () => {
    stopCloseTimer(); pinned.current = false; keyboardFocus.current = false; onClose();
  };
  const leave = () => {
    stopCloseTimer();
    if (!pinned.current && !keyboardFocus.current) closeTimer.current = setTimeout(onClose, 140);
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      pinned.current = false;
      keyboardFocus.current = false;
      return;
    }
    const update = () => {
      if (!trigger.current || !bubble.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const visual = window.visualViewport;
      const viewport = { left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0,
        width: visual?.width ?? window.innerWidth, height: visual?.height ?? window.innerHeight };
      // Close if a responsive layout hides the trigger or it scrolls off screen.
      if ((!anchor.width && !anchor.height) || anchor.bottom < viewport.top || anchor.top > viewport.top + viewport.height) { onClose(); return; }
      const next = placeSignalTooltip(anchor, bubble.current.getBoundingClientRect().height, viewport);
      setPosition(previous => previous && Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !trigger.current?.contains(target) && !bubble.current?.contains(target)) {
        pinned.current = false; keyboardFocus.current = false; onClose();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); pinned.current = false; keyboardFocus.current = false; onClose(); }
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (bubble.current) observer?.observe(bubble.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      if (closeTimer.current !== null) { clearTimeout(closeTimer.current); closeTimer.current = null; }
      observer?.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [isOpen, onClose]);

  return <>
    <button
      ref={trigger}
      type="button"
      aria-label={`About ${name}`}
      aria-describedby={isOpen ? id : undefined}
      aria-expanded={isOpen}
      className="-m-1 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#64748B] transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      onPointerDown={() => { pointerFocus.current = true; }}
      onPointerCancel={() => { pointerFocus.current = false; }}
      onPointerEnter={event => {
        if (event.pointerType === "touch") return;
        stopCloseTimer(); onOpen();
      }}
      onPointerLeave={leave}
      onFocus={() => {
        if (!pointerFocus.current) { keyboardFocus.current = true; stopCloseTimer(); onOpen(); }
      }}
      onBlur={() => { pointerFocus.current = false; dismiss(); }}
      onClick={() => {
        pointerFocus.current = false; stopCloseTimer();
        if (isOpen && pinned.current) dismiss();
        else { pinned.current = true; onOpen(); }
      }}
    >
      <Info aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
    {isOpen && typeof document !== "undefined" ? createPortal(
      <div
        ref={bubble}
        id={id}
        role="tooltip"
        onPointerEnter={stopCloseTimer}
        onPointerLeave={leave}
        className="fixed z-[100] overflow-y-auto overscroll-contain rounded-xl border border-[#384660] bg-[#171F2D] px-3.5 py-3 text-left font-sans text-xs font-normal leading-5 text-[#E2E8F0] shadow-[0_12px_36px_rgba(0,0,0,0.4)] break-words"
        style={position ? { ...position, visibility: "visible" } : { width: "min(288px, calc(100vw - 24px))", visibility: "hidden" }}
      >{CLARITY_SIGNAL_HELP[signalKey]}</div>, document.body,
    ) : null}
  </>;
}

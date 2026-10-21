"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export type LandingThemePreference = "light" | "dark" | "system";
export const LANDING_THEME_KEY = "strangerlens-theme-v3";
export type ResolvedTheme = "light" | "dark";

function getSavedTheme(): ResolvedTheme {
  try {
    const stored = window.localStorage.getItem(LANDING_THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    if (stored === "system") {
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch { /* Browsers can deny local storage in private mode. */ }
  return "light";
}
function applyTheme(next: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.landingTheme = next;
  root.classList.toggle("dark", next === "dark");
}

/**
 * One tap, everywhere. Shared storage + a same-window event keep the landing,
 * scanning, results, paid history and legal pages visually synchronized.
 * The initial theme is applied pre-hydration in app/layout.tsx.
 */
export function LandingThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const sync = () => {
      const next = getSavedTheme();
      applyTheme(next);
      setTheme(next);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("strangerlens:theme-preference", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("strangerlens:theme-preference", sync);
    };
  }, []);

  const toggle = () => {
    const next: ResolvedTheme =
      document.documentElement.dataset.landingTheme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { window.localStorage.setItem(LANDING_THEME_KEY, next); } catch { /* optional persistence */ }
    setTheme(next);
    window.dispatchEvent(new window.Event("strangerlens:theme-preference"));
  };
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" onClick={toggle}
      className={`sl-theme-quick ${compact ? "sl-theme-quick--compact" : ""}`}
      data-testid="theme-toggle"
      aria-label={label} title={label} aria-pressed={dark}>
      <span className="sl-theme-quick-icon" aria-hidden="true">
        {dark ? <Sun size={17} strokeWidth={1.9}/> : <Moon size={17} strokeWidth={1.9}/>}
      </span>
      {!compact && <span className="sl-theme-quick-label">{dark ? "Light" : "Dark"}</span>}
    </button>
  );
}

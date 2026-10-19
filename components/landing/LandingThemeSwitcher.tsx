"use client";

import React, { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun, ChevronDown } from "lucide-react";

export type LandingThemePreference = "light" | "dark" | "system";
/** Shared by landing, analysis, reports and support pages. */
export const LANDING_THEME_KEY = "strangerlens-theme-v3";

function getPreference(): LandingThemePreference {
  try {
    const saved = window.localStorage.getItem(LANDING_THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch { /* storage may be restricted */ }
  return "light";
}
function resolveTheme(preference: LandingThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
const options = [
  { value: "light" as const, label: "Light", Icon: Sun },
  { value: "dark" as const, label: "Dark", Icon: Moon },
  { value: "system" as const, label: "System", Icon: Monitor },
];

/** Compact=true fits 320px header rows, with an accessible three-choice menu. */
export function LandingThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [choice, setChoice] = useState<LandingThemePreference>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preference = getPreference();
    setChoice(preference);
    const apply = () => {
      const resolved = resolveTheme(preference);
      document.documentElement.dataset.landingTheme = resolved;
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    apply();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== LANDING_THEME_KEY) return;
      const next = getPreference();
      setChoice(next);
      const resolved = resolveTheme(next);
      document.documentElement.dataset.landingTheme = resolved;
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    if (preference === "system") media?.addEventListener?.("change", apply);
    window.addEventListener("storage", syncStorage);
    window.addEventListener("strangerlens:theme-preference", syncStorage);
    return () => {
      if (preference === "system") media?.removeEventListener?.("change", apply);
      window.removeEventListener("storage", syncStorage);
      window.removeEventListener("strangerlens:theme-preference", syncStorage);
    };
  }, [choice]);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  const choose = (value: LandingThemePreference) => {
    try { window.localStorage.setItem(LANDING_THEME_KEY, value); } catch { /* private mode */ }
    const resolved = resolveTheme(value);
    document.documentElement.dataset.landingTheme = resolved;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    setChoice(value);
    window.dispatchEvent(new Event("strangerlens:theme-preference"));
    setMenuOpen(false);
  };

  if (compact) {
    const current = options.find(o => o.value === choice) || options[0];
    const CurrentIcon = current.Icon;
    return (
      <div className="sl-theme-compact" ref={menuRef}>
        <button type="button" className="sl-theme-compact-trigger"
          aria-label={`Appearance: ${current.label}. Choose theme`} aria-expanded={menuOpen}
          aria-haspopup="true" onClick={() => setMenuOpen(open => !open)}>
          <CurrentIcon size={17} aria-hidden="true"/><ChevronDown size={12} aria-hidden="true"/>
        </button>
        {menuOpen && <div className="sl-theme-menu" role="group" aria-label="Choose appearance">
          {options.map(({value,label,Icon}) => (
            <button key={value} type="button" aria-pressed={choice===value}
              className={`sl-theme-menu-option ${choice===value ? "is-active" : ""}`}
              onClick={() => choose(value)}>
              <Icon size={16} aria-hidden="true"/>{label}
            </button>
          ))}
        </div>}
      </div>
    );
  }

  return (
    <div className="sl-theme-switch" role="group" aria-label="Website appearance">
      {options.map(({value,label,Icon})=>(
        <button key={value} type="button" title={`${label} theme`}
          aria-label={`${label} appearance`} aria-pressed={choice===value}
          onClick={()=>choose(value)} className={`sl-theme-button ${choice===value?"is-active":""}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true"/>
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type LandingThemePreference = "light" | "dark" | "system";
export const LANDING_THEME_KEY = "strangerlens-theme-v3";

function resolveTheme(preference: LandingThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function LandingThemeSwitcher() {
  const [choice, setChoice] = useState<LandingThemePreference>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(LANDING_THEME_KEY);
    const preference: LandingThemePreference =
      saved === "dark" || saved === "system" || saved === "light" ? saved : "light";
    setChoice(preference);
    const apply = () => { document.documentElement.dataset.landingTheme = resolveTheme(preference); };
    apply();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (preference === "system") media?.addEventListener?.("change", apply);
    return () => { if (preference === "system") media?.removeEventListener?.("change", apply); };
  }, [choice]);

  const options = [
    { value: "light" as const, label: "Light", Icon: Sun },
    { value: "dark" as const, label: "Dark", Icon: Moon },
    { value: "system" as const, label: "System", Icon: Monitor },
  ];

  return (
    <div className="sl-theme-switch" role="group" aria-label="Landing page appearance">
      {options.map(({ value, label, Icon }) => (
        <button key={value} type="button" title={`${label} theme`}
          aria-label={`${label} appearance`} aria-pressed={choice === value}
          onClick={() => {
            try { window.localStorage.setItem(LANDING_THEME_KEY, value); } catch { /* private mode */ }
            setChoice(value);
            document.documentElement.dataset.landingTheme = resolveTheme(value);
          }}
          className={`sl-theme-button ${choice === value ? "is-active" : ""}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true"/>
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import ChromaticAtmosphere from "../components/landing/ChromaticAtmosphere";
import InteractiveReportPreview from "../components/landing/InteractiveReportPreview";
import { LandingThemeSwitcher, LANDING_THEME_KEY } from "../components/landing/LandingThemeSwitcher";

const atmosphere = renderToStaticMarkup(<ChromaticAtmosphere variant="hero" />);
assert.equal((atmosphere.match(/class="sl-signal-dot"/g) || []).length, 0, "No tiny background dots; ambient color stays clean.");
assert.ok(atmosphere.includes("aria-hidden=\"true\""), "Animated decoration is hidden from screen readers.");
const lines = renderToStaticMarkup(<ChromaticAtmosphere variant="threads" />);
assert.equal((lines.match(/class="sl-focus-thread"/g) || []).length, 10, "Quiet focus-line pattern.");

const preview = renderToStaticMarkup(<InteractiveReportPreview />);
assert.equal((preview.match(/role="tab"/g) || []).length, 6, "Five clarity signals and one separate fictional Purchase Readiness example.");
assert.ok(preview.includes("FICTIONAL WEBSITE") && preview.includes("Illustrative wording"), "Example is honestly labeled as fictional.");
assert.ok(preview.includes("69") && preview.includes("Illustrative · Five core signals"), "Overall score is clearly illustrative and excludes the purchase check.");
assert.ok(preview.includes("Every tab is open") && !preview.includes("LockKeyhole") && !preview.includes("Unlock evidence"), "Every fictional example is open.");

const css = readFileSync("app/landing-v3.css", "utf8");
for (const fragment of [
  'html[data-landing-theme="dark"] .landing-v3',
  'html[data-landing-theme="light"] .landing-v3 .text-white',
  '.sl-atmosphere--hero', '.sl-aurora', '.sl-travel-line',
  '.sl-v3-primary:focus-visible', '@media(prefers-reduced-motion:reduce)',
]) assert.ok(css.includes(fragment), `V3 CSS contains ${fragment}`);
const globalCss = readFileSync("app/globals.css", "utf8");
assert.ok(globalCss.includes('landing-v3.css'), "Landing styling loaded.");
assert.ok(!globalCss.includes("html.light .text-white"), "Unsafe global inversion removed.");

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: "https://strangerlens.ai.studio/", pretendToBeVisual: true,
});
const old: Record<string, PropertyDescriptor | undefined> = {};
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "IS_REACT_ACT_ENVIRONMENT"]) {
  old[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, {
    configurable: true, writable: true,
    value: key === "IS_REACT_ACT_ENVIRONMENT" ? true : key === "window" ? dom.window : (dom.window as any)[key],
  });
}
async function main() {
  const root = createRoot(dom.window.document.getElementById("app")!);
  try {
    await act(async () => { root.render(<LandingThemeSwitcher />); });
    const themeToggle = dom.window.document.querySelector<HTMLButtonElement>('[data-testid="theme-toggle"]');
    assert.ok(themeToggle, "One visible theme button exists.");
    assert.equal(dom.window.document.querySelectorAll('[data-testid="theme-toggle"]').length, 1);
    await act(async () => { themeToggle.click(); });
    assert.equal(dom.window.document.documentElement.dataset.landingTheme, "dark");
    assert.equal(dom.window.localStorage.getItem(LANDING_THEME_KEY), "dark");
    assert.equal(themeToggle.getAttribute("aria-label"), "Switch to light mode");
    await act(async () => { themeToggle.click(); });
    assert.equal(dom.window.document.documentElement.dataset.landingTheme, "light");

    await act(async () => { root.render(<InteractiveReportPreview />); });
    const tabs = Array.from(dom.window.document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    for (const tab of tabs) {
      await act(async () => { tab.click(); });
      assert.equal(tab.getAttribute("aria-selected"), "true");
      assert.equal(dom.window.document.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby"), tab.id);
    }
    console.log("PASS: chromatic landing theme switch, interactive sample, illustration honesty and motion safety.");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const key of ["window", "document", "HTMLElement", "Element", "Node", "IS_REACT_ACT_ENVIRONMENT"]) {
      if (old[key]) Object.defineProperty(globalThis, key, old[key]!);
      else delete (globalThis as any)[key];
    }
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });

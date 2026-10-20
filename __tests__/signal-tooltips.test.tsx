import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import ResultsScreen from "../components/ResultsScreen";
import { CLARITY_SIGNAL_HELP, placeSignalTooltip } from "../components/ClaritySignalTooltip";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";

async function main() {
  const globals = ["window", "document", "self", "HTMLElement", "Element", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "IS_REACT_ACT_ENVIRONMENT"];
  const saved = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalFetch = globalThis.fetch;
  let root: Root | null = null, dom: JSDOM | undefined, assertions = 0;
  let anchor = { left: 130, right: 158, top: 150, bottom: 178, width: 28, height: 28 };
  let hiddenTrigger: Element | null = null;
  const check = (condition: unknown, message: string) => { assert.ok(condition, message); assertions++; };
  const expected: Record<string, string> = {
    "First Impression": "How quickly visitors understand what your website does.",
    Audience: "How clearly your website communicates who it's for.",
    Value: "How clearly visitors understand the benefits you offer.",
    Trust: "How effectively your website communicates credibility and trustworthiness.",
    Action: "How clearly visitors understand what to do next.",
  };
  check(Object.values(CLARITY_SIGNAL_HELP).join("|") === Object.values(expected).join("|"), "all five explanations match the requested copy exactly");

  // Geometry tests cover corners, narrow screens, short viewports and zoomed
  // visual viewports; jsdom itself has no layout engine.
  for (const width of [240, 320, 390, 768, 1440]) {
    for (const edge of [0, width - 28]) {
      for (const top of [0, 150, 252]) {
        const position = placeSignalTooltip({ left: edge, right: edge + 28, top, bottom: top + 28 }, 84, { left: 0, top: 0, width, height: 280 });
        check(position.left >= 12 && position.left + position.width <= width - 12 && position.top >= 12 && position.top + 84 <= 268, `tooltip stays inside ${width}px viewport at both edges`);
      }
    }
  }
  const zoomed = placeSignalTooltip({ left: 105, right: 133, top: 205, bottom: 233 }, 84, { left: 100, top: 200, width: 320, height: 240 });
  check(zoomed.left >= 112 && zoomed.top >= 212 && zoomed.left + zoomed.width <= 408, "positioning respects visual viewport offsets when zoomed");
  check(placeSignalTooltip({ left: 10, right: 38, top: 10, bottom: 38 }, 1000, { left: 0, top: 0, width: 320, height: 200 }).maxHeight === 176, "oversized text can scroll within the viewport");

  const unmount = async () => { if (root) await act(async () => { root!.unmount(); root = null; }); };
  const tick = async (ms = 0) => { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
  const tooltip = () => dom!.window.document.querySelector('[role="tooltip"]') as HTMLDivElement | null;
  const pointer = (target: Element, type: string, pointerType = "mouse", relatedTarget: EventTarget | null = null) => {
    const event = new dom!.window.MouseEvent(type, { bubbles: true, relatedTarget });
    Object.defineProperty(event, "pointerType", { value: pointerType });
    target.dispatchEvent(event);
  };
  const click = async (button: HTMLButtonElement, pointerType = "mouse") => {
    await act(async () => { pointer(button, "pointerdown", pointerType); button.focus(); pointer(button, "pointerup", pointerType); button.click(); });
  };

  try {
    globalThis.fetch = async () => { throw new Error("Signal tooltips must never call an API, AI or payment service."); };
    for (const width of [320, 390, 1440]) {
      for (const paid of [false, true]) {
        dom = new JSDOM("<!doctype html><html><body><div id='app'></div><button id='outside'>Outside</button></body></html>", { url: "https://strangerlens.example/", pretendToBeVisual: true });
        for (const key of globals) {
          let value: any = key === "window" || key === "self" ? dom.window : key === "document" ? dom.window.document : key === "IS_REACT_ACT_ENVIRONMENT" ? true : (dom.window as any)[key];
          if (["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key)) value = value.bind(dom.window);
          Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
        }
        Object.defineProperty(dom.window, "innerWidth", { value: width, configurable: true });
        Object.defineProperty(dom.window, "innerHeight", { value: 300, configurable: true });
        anchor = { left: width - 42, right: width - 14, top: 150, bottom: 178, width: 28, height: 28 };
        hiddenTrigger = null;
        // Measure only the new trigger/bubble. All existing UI remains intact.
        const originalRect = dom.window.HTMLElement.prototype.getBoundingClientRect;
        dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
          if (this === hiddenTrigger) return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} };
          if (this.getAttribute("aria-label")?.startsWith("About ")) return { ...anchor, x: anchor.left, y: anchor.top, toJSON() {} };
          if (this.getAttribute("role") === "tooltip") return { left: 0, right: 288, top: 0, bottom: 84, width: 288, height: 84, x: 0, y: 0, toJSON() {} };
          return originalRect.call(this);
        };
        const data = mapBackendToFrontend(paymentAnalysis, "https://example.com", paymentSnapshot);
        const originalScores = data.signals.map(s => s.score).join(",");
        root = createRoot(dom.window.document.getElementById("app")!);
        await act(async () => { root!.render(<React.StrictMode><ResultsScreen rawUrl="https://example.com" analysisData={data} isUnlocked={paid} onBackToLanding={() => {}} /></React.StrictMode>); });
        const index = width < 640 ? 0 : 1;
        const buttonFor = (name: string) => dom!.window.document.querySelectorAll<HTMLButtonElement>(`button[aria-label="About ${name}"]`)[index];
        const first = buttonFor("First Impression");
        check(dom.window.document.querySelectorAll('button[aria-label^="About "]').length === 10, `${width}px ${paid ? "paid" : "free"}: each responsive layout has five info buttons`);
        check(!tooltip(), "no tooltip renders before interaction");

        // Tap/click for every explanation and tap outside to dismiss.
        for (const [name, content] of Object.entries(expected)) {
          const button = buttonFor(name);
          await click(button, width < 640 ? "touch" : "mouse");
          check(tooltip()?.textContent === content, `${width}px ${paid ? "paid" : "free"}: ${name} copy is readable`);
          check(tooltip()?.parentElement === dom.window.document.body, "portal escapes rounded card overflow without changing row layout");
          check(button.getAttribute("aria-describedby") === tooltip()?.id && button.getAttribute("aria-expanded") === "true", "info button has a unique accessible tooltip relationship");
          const bounds = tooltip()!.style;
          check(parseFloat(bounds.left) >= 12 && parseFloat(bounds.left) + parseFloat(bounds.width) <= width - 12, "actual portal style clamps to the viewport");
          await act(async () => { pointer(dom!.window.document.getElementById("outside")!, "pointerdown", "touch"); });
          check(!tooltip() && button.getAttribute("aria-expanded") === "false", "tap outside closes the tooltip");
        }

        // Touch hover events must not open a tooltip before a deliberate tap.
        await act(async () => { pointer(first, "pointerover", "touch"); });
        check(!tooltip(), "touch pointer entry alone does not open the tooltip");
        await click(first, "touch"); await click(first, "touch");
        check(!tooltip(), "second tap toggles the tooltip closed");

        // Keyboard focus reads the help; Escape closes without moving focus.
        await act(async () => { first.blur(); first.focus(); });
        check(Boolean(tooltip()) && dom.window.document.activeElement === first, "keyboard focus opens help for screen readers");
        await act(async () => { first.dispatchEvent(new dom!.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
        check(!tooltip() && dom.window.document.activeElement === first, "Escape dismisses while keeping focus on the info button");
        // Native type=button provides Enter/Space activation; jsdom needs click
        // to simulate the browser's default key activation.
        await act(async () => { first.click(); });
        check(Boolean(tooltip()) && first.type === "button", "native keyboard activation opens the tooltip without submitting forms");
        await act(async () => { first.click(); });
        check(!tooltip(), "repeated keyboard activation closes pinned help");
        await act(async () => { first.blur(); first.focus(); });
        await act(async () => { buttonFor("Audience").focus(); });
        check(dom.window.document.querySelectorAll('[role="tooltip"]').length === 1 && tooltip()?.textContent === expected.Audience, "moving keyboard focus closes previous help and opens only one tooltip");
        await act(async () => { (dom!.window.document.getElementById("outside") as HTMLButtonElement).focus(); });
        check(!tooltip(), "tabbing away dismisses help");

        // Mouse hover remains open while the pointer crosses into the bubble.
        await act(async () => { pointer(first, "pointerover"); });
        check(Boolean(tooltip()), "desktop pointer hover opens help");
        const bubble = tooltip()!;
        await act(async () => { pointer(first, "pointerout", "mouse", bubble); pointer(bubble, "pointerover", "mouse", first); });
        await tick(170);
        check(Boolean(tooltip()), "tooltip stays hoverable when moving from trigger to bubble");
        await act(async () => { pointer(bubble, "pointerout", "mouse", dom!.window.document.body); });
        await tick(170); check(!tooltip(), "moving away closes unpinned hover help");
        await act(async () => { pointer(first, "pointerover"); });
        await click(first);
        await act(async () => { pointer(first, "pointerout", "mouse", dom!.window.document.body); });
        await tick(170); check(Boolean(tooltip()), "click pins an already-hovered tooltip");
        await click(buttonFor("Trust"));
        check(dom.window.document.querySelectorAll('[role="tooltip"]').length === 1 && tooltip()?.textContent === expected.Trust, "clicking a different info icon replaces the existing tooltip");
        hiddenTrigger = buttonFor("Trust");
        await act(async () => { dom!.window.dispatchEvent(new dom!.window.Event("resize")); });
        check(!tooltip(), "responsive changes cannot leave a detached tooltip for a hidden trigger");
        hiddenTrigger = null;
        await click(first);
        anchor = { ...anchor, top: -100, bottom: -72 };
        await act(async () => { dom!.window.dispatchEvent(new dom!.window.Event("scroll")); });
        check(!tooltip(), "scrolling the trigger off-screen dismisses detached help");
        check(data.signals.map(s => s.score).join(",") === originalScores && data.score === 72, "tooltip interactions preserve every original score");
        check(dom.window.document.body.textContent?.includes("Share Result") && dom.window.document.body.textContent?.includes("Download PDF"), "existing Results actions remain present");
        await unmount(); check(!tooltip(), "unmount removes the portal and all open UI");
        dom.window.close(); dom = undefined;
      }
    }
    console.log(`PASS: ${assertions} signal-tooltip copy, pointer, touch, keyboard, accessibility, viewport and Free/Paid Results assertions. No network requests were made.`);
  } finally {
    await unmount(); dom?.window.close();
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; }
    globalThis.fetch = originalFetch;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

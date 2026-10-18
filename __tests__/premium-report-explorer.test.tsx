import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import SignalReportExplorer from "../components/SignalReportExplorer";
import PremiumActionPlan from "../components/PremiumActionPlan";
import { CLARITY_REPORT_CHAPTERS } from "../lib/clarity-report-chapters";
import type { CanonicalSignal } from "../lib/report-adapter";

const signals: CanonicalSignal[] = CLARITY_REPORT_CHAPTERS.map((ch, index) => ({
  key: ch.key,
  id: ch.key === "firstImpression" ? "first-impression" : ch.key,
  title: ch.title,
  score: [90,62,85,60,90][index],
  scoreDisplay: `${[90,62,85,60,90][index]}/100`,
  status: "Partly clear",
  badgeType: "amber",
  explanation: `WHY_${ch.key}`,
  positiveFindings: [`WORKS_${ch.key}`],
  concerns: [`GAP_${ch.key}`],
  recommendations: [`IMPROVE_${ch.key}`],
  hasRealScore: true,
  isAvailable: true,
}));

const staticHtml = renderToStaticMarkup(<SignalReportExplorer signals={signals} />);
assert.ok(staticHtml.includes("Five Signals. The Full Story Behind Every Score."));
assert.ok(staticHtml.includes("WHY_firstImpression"));
assert.ok(!staticHtml.includes("WHY_audience"), "Inactive paid chapter findings are not mixed into active chapter.");
assert.equal((staticHtml.match(/role="tab"/g) || []).length, 5);
assert.ok(staticHtml.includes("Next chapter: Audience"));

const planHtml = renderToStaticMarkup(<PremiumActionPlan
  recommendation={{
    title: "One focused priority",
    subhead: "Make audience relevance clearer",
    explanation: "The page does not yet explicitly identify its audience.",
    currentDirection: "Do more with tasks",
    strongerDirection: "Organize projects for solo founders",
  }}
  otherImprovements={[
    { title: "Improve CTA", description: "Clarify the next step", copyableSuggestion: "See how it works" },
    { title: "Add audience context", whatToImprove: "Mention the intended use case." },
  ]}
  evidence={{ locationTag: "Homepage", homepageExcerpt: "Do more with tasks" }}
  visitorThought="Simulated first-impression example." />);
assert.ok(planHtml.includes("Do First") && planHtml.includes("Smart Priority"));
assert.ok(planHtml.includes("Evidence-to-Fix") && planHtml.includes("Exact source quote unavailable"));
assert.ok(planHtml.includes("Better Copy Studio") && planHtml.includes("Organize projects for solo founders"), "Selected copy draft renders; alternative drafts appear when selected.");
assert.ok(planHtml.includes("Content Behind the Assessment"));

const dom = new JSDOM("<!doctype html><html><body><div id=\"app\"></div></body></html>", {
  url: "https://strangerlens.example", pretendToBeVisual: true,
});
const old: Record<string, PropertyDescriptor | undefined> = {};
const targets = ["window", "document", "HTMLElement", "Element", "Node", "IS_REACT_ACT_ENVIRONMENT"];
for (const key of targets) {
  old[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, {
    configurable: true, writable: true,
    value: key === "IS_REACT_ACT_ENVIRONMENT" ? true : key === "window" ? dom.window : (dom.window as any)[key],
  });
}
(async () => {
  const root = createRoot(dom.window.document.getElementById("app")!);
  try {
    await act(async () => { root.render(<SignalReportExplorer signals={signals} />); });
    for (const signal of signals) {
      const tab = [...dom.window.document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
        .find(el => el.textContent?.includes(signal.title));
      assert.ok(tab, `Chapter ${signal.title} can be selected.`);
      await act(async () => { tab.click(); });
      const panel = dom.window.document.querySelector('[role="tabpanel"]')!;
      assert.equal(tab.getAttribute("aria-selected"), "true");
      assert.ok(panel.textContent?.includes(`WHY_${signal.key}`));
      assert.ok(panel.textContent?.includes(`WORKS_${signal.key}`));
      assert.ok(panel.textContent?.includes(`GAP_${signal.key}`));
      assert.ok(panel.textContent?.includes(`IMPROVE_${signal.key}`));
    }
    console.log("PASS: all five chapters can be opened with their own complete findings; paid improvement plan renders stored data.");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const key of targets) {
      if (old[key]) Object.defineProperty(globalThis, key, old[key]!);
      else delete (globalThis as any)[key];
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

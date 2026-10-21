import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import BrandMark from "../components/BrandMark";
import InteractiveReportPreview from "../components/landing/InteractiveReportPreview";
import FullReportTour from "../components/landing/FullReportTour";
import ReportsHeader from "../components/ReportsHeader";
import { LandingThemeSwitcher, LANDING_THEME_KEY } from "../components/landing/LandingThemeSwitcher";

const logo=renderToStaticMarkup(<BrandMark className="h-8 w-8"/>);
assert.ok(logo.includes('viewBox="0 0 40 40"') && logo.includes("#A9F2FF"), "Distinctive scalable two-tone S mark");
assert.ok(readFileSync("app/landing-v3.css","utf8").includes("#1CAFE9") &&
  readFileSync("app/landing-v3.css","utf8").includes("#6849D8"),"Colored gradient identity, not monochrome");
assert.ok(readFileSync("app/icon.svg","utf8").includes("linearGradient"),"Favicon uses the same blue-violet identity");

const staticSample=renderToStaticMarkup(<InteractiveReportPreview/>);
assert.equal((staticSample.match(/role="tab"/g)||[]).length,6,"Five core analyses and one optional purchase sample are all present");
assert.ok(staticSample.includes("Every tab is open") && staticSample.includes("INTERACTIVE SAMPLE"));
assert.ok(staticSample.includes("Illustrative wording") && staticSample.includes("FICTIONAL WEBSITE"));
assert.ok(!staticSample.includes('type="password"') && !staticSample.includes("Unlock evidence"),"The fictional demo is not a paywall");
assert.ok(staticSample.includes("WHAT WORKS") && staticSample.includes("WHAT&#x27;S UNCLEAR"), "Full sample insights are shown");

const tour=renderToStaticMarkup(<FullReportTour onTryFree={()=>{}}/>);
assert.ok(tour.includes("ALL CHAPTERS OPEN"), "Every long-form demo chapter is accessible");
assert.equal((tour.match(/role="tab"/g)||[]).length,5,"All five walkthrough chapters visible");
const header=renderToStaticMarkup(<ReportsHeader/>);
assert.ok(header.includes('data-testid="theme-toggle"') && header.includes("sl-brand-mark"),"Report history header shares sitewide logo and one-tap control");
const landing=readFileSync("app/page.tsx","utf8");
assert.ok(landing.includes("<LandingThemeSwitcher />") && !landing.includes('hidden sm:block"><LandingThemeSwitcher'),"Theme toggle visible in the landing header at all widths");

const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{
  url:"https://strangerlens.ai.studio",pretendToBeVisual:true
});
const original:Record<string,PropertyDescriptor|undefined>={};
for(const k of ["window","document","HTMLElement","Element","Node","IS_REACT_ACT_ENVIRONMENT"]){
  original[k]=Object.getOwnPropertyDescriptor(globalThis,k);
  Object.defineProperty(globalThis,k,{configurable:true,writable:true,
    value:k==="IS_REACT_ACT_ENVIRONMENT"?true:k==="window"?dom.window:(dom.window as any)[k]});
}
async function run() {
  const root=createRoot(dom.window.document.getElementById("root")!);
  try {
    await act(async()=>root.render(<InteractiveReportPreview/>));
    const tabs=[...dom.window.document.querySelectorAll<HTMLButtonElement>('.sl-demo--editorial [role="tab"]')];
    assert.equal(tabs.length,6);
    for(const tab of tabs) {
      await act(async()=>tab.click());
      assert.equal(tab.getAttribute("aria-selected"),"true");
      const panel=dom.window.document.querySelector('[id="sl-example-detail"]');
      assert.equal(panel?.getAttribute("aria-labelledby"),tab.id);
      assert.ok(panel?.textContent?.includes("EXAMPLE PAGE EVIDENCE"));
      assert.ok(panel?.textContent?.includes("WHAT WORKS"));
      assert.ok(panel?.textContent?.includes("EXAMPLE REWRITE"));
    }
    assert.ok(dom.window.document.querySelector('#demo-tab-purchase'),"Purchase demo never hidden");
    await act(async()=>root.render(<LandingThemeSwitcher/>));
    const toggle=dom.window.document.querySelector<HTMLButtonElement>('[data-testid="theme-toggle"]')!;
    assert.ok(toggle);
    await act(async()=>toggle.click());
    assert.equal(dom.window.localStorage.getItem(LANDING_THEME_KEY),"dark");
    await act(async()=>toggle.click());
    assert.equal(dom.window.localStorage.getItem(LANDING_THEME_KEY),"light");
    console.log("PASS: branded logo/favicon, one-click cross-screen theme and six fully open fictional report examples.");
  } finally {
    await act(async()=>root.unmount());
    dom.window.close();
    for (const k of Object.keys(original)) {
      if(original[k])Object.defineProperty(globalThis,k,original[k]!);
      else delete (globalThis as any)[k];
    }
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});

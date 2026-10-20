import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import FullReportTour from "../components/landing/FullReportTour";
import ScanScreen from "../components/ScanScreen";
import ResultsScreen from "../components/ResultsScreen";
import { LandingThemeSwitcher, LANDING_THEME_KEY } from "../components/landing/LandingThemeSwitcher";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";

const css = readFileSync("app/app-theme.css", "utf8");
const globals = readFileSync("app/globals.css","utf8");
assert.ok(globals.includes('app-theme.css'), "Shared app theme CSS is loaded.");
assert.ok(css.includes('.sl-app-theme') && css.includes('html[data-landing-theme="light"]'), "Scoped light app palette exists.");
assert.ok(css.includes('button.bg-\\[\\#246BFD\\]'), "Paid primary CTAs preserve white-on-blue contrast.");
assert.ok(css.includes('.sl-theme-compact-trigger'), "Narrow-screen appearance menu has accessible styling.");

const scanHtml = renderToStaticMarkup(<ScanScreen rawUrl="https://example.com" onBackToLanding={()=>{}} isVerifying />);
assert.ok(scanHtml.includes('sl-app-theme'), "Scanning uses shared theme.");
assert.ok(scanHtml.includes("Choose theme"), "Scanning provides appearance control.");

const analysis = mapBackendToFrontend(structuredClone(paymentAnalysis), "https://example.com",paymentSnapshot);
for(const paid of [false,true]){
  const markup=renderToStaticMarkup(<ResultsScreen analysisData={analysis} rawUrl="https://example.com" checkoutEnabled={true} isUnlocked={paid}/>);
  assert.ok(markup.includes('sl-app-theme'), "Free/paid reports use shared theme.");
  assert.ok(markup.includes("Choose theme"), "Report header has compact appearance switcher.");
  assert.equal(markup.includes('id="your-improvement-plan"'),paid,"Premium workbench remains gated.");
}
const fullTour = renderToStaticMarkup(<FullReportTour onTryFree={()=>{}}/>);
assert.ok(fullTour.includes("THE $5 COMPLETE REPORT") && fullTour.includes("INTERACTIVE SAMPLE"), "Full walkthrough is clearly labeled as illustrative.");
assert.equal((fullTour.match(/role="tab"/g)||[]).length,5, "All five report chapters are demonstrated.");
assert.ok(fullTour.includes("Evidence → Fix") && fullTour.includes("Copy Studio") && fullTour.includes("Smart Priority"));

const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{url:"https://strangerlens.ai.studio",pretendToBeVisual:true});
const previous: Record<string,PropertyDescriptor|undefined>={};
for(const key of ["window","document","HTMLElement","Element","Node","StorageEvent","IS_REACT_ACT_ENVIRONMENT"]){
  previous[key]=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{configurable:true,writable:true,
    value:key==="IS_REACT_ACT_ENVIRONMENT"?true:key==="window"?dom.window:(dom.window as any)[key]});
}
async function run(){
  const root=createRoot(dom.window.document.getElementById("app")!);
  try{
    await act(async()=>root.render(<LandingThemeSwitcher compact/>));
    const toggle=dom.window.document.querySelector<HTMLButtonElement>("button[aria-haspopup]");
    assert.ok(toggle,"Mobile theme control is available.");
    await act(async()=>toggle.click());
    const choices=[...dom.window.document.querySelectorAll<HTMLButtonElement>(".sl-theme-menu-option")];
    assert.equal(choices.length,3);
    await act(async()=>choices[1].click());
    assert.equal(dom.window.document.documentElement.dataset.landingTheme,"dark");
    assert.ok(dom.window.document.documentElement.classList.contains("dark"));
    assert.equal(dom.window.localStorage.getItem(LANDING_THEME_KEY),"dark");
    await act(async()=>root.render(<LandingThemeSwitcher/>));
    const light=dom.window.document.querySelector<HTMLButtonElement>('button[aria-label="Light appearance"]');
    assert.ok(light);
    await act(async()=>light.click());
    assert.equal(dom.window.document.documentElement.dataset.landingTheme,"light");
    assert.ok(!dom.window.document.documentElement.classList.contains("dark"));
    await act(async()=>root.render(<FullReportTour onTryFree={()=>{}}/>));
    const tabs=[...dom.window.document.querySelectorAll<HTMLButtonElement>('.sl-tour-tabs button[role="tab"]')];
    for(const tab of tabs){
      await act(async()=>tab.click());
      assert.equal(tab.getAttribute("aria-selected"),"true");
      assert.equal(dom.window.document.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby"),tab.id);
    }
    console.log("PASS: consistent theme in scanning/free/paid screens, saved light/dark modes, mobile selector and interactive full report tour.");
  }finally{
    await act(async()=>root.unmount());dom.window.close();
    for(const key of ["window","document","HTMLElement","Element","Node","StorageEvent","IS_REACT_ACT_ENVIRONMENT"]){
      if(previous[key])Object.defineProperty(globalThis,key,previous[key]!);
      else delete (globalThis as any)[key];
    }
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});

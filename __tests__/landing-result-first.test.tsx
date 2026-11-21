import assert from "node:assert/strict";
import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import StrangerLensLanding from "../components/landing/StrangerLensLanding";

const props={url:"",onUrlChange:()=>{},onAnalyze:()=>{},isVerifying:false,errorMessage:null};
const doc = new JSDOM(renderToStaticMarkup(<StrangerLensLanding {...props}/>)).window.document;
const nav=doc.querySelector('nav[aria-label="Primary navigation"]')!;
assert.equal(nav.querySelectorAll('a').length,3,"Nav is down to How it works, Pricing and FAQ");
assert.deepEqual([...nav.querySelectorAll("a")].map(a=>a.textContent?.trim()),
  ["How it works","Pricing","FAQ"],"Removed redundant What we check and Full report links");
assert.equal(doc.querySelectorAll(".slr-nav-actions [data-testid='theme-toggle']").length,1,
  "Theme switch always visible on the landing navbar");
assert.equal(doc.querySelectorAll(".slr-nav-actions .slr-nav-cta").length,1,
  "Desktop has one primary CTA");
assert.equal(doc.querySelectorAll("h1").length,1,"One clear headline");
assert.ok(doc.querySelector(".slr-hero-proof .slr-hero-copy #slr-scan .slr-form-submit")?.textContent?.includes("Reveal My Clarity Score — Free"),
  "Real free URL form is available above results preview");
const sample=doc.querySelector('.slr-hero-proof .slr-live-demo')!;
assert.ok(sample && sample.getAttribute("aria-label")?.includes("Illustrative"),"Honest sample alongside hero");
assert.equal(sample.querySelectorAll(".slr-live-demo-row").length,5,"Exactly five real report signal categories");
assert.ok(sample.textContent?.includes("First Impression")&&sample.textContent?.includes("Audience") &&
  sample.textContent?.includes("Value")&&sample.textContent?.includes("Trust")&&sample.textContent?.includes("Action"),
  "Sample reflects the actual free signal categories");
assert.ok(sample.textContent?.includes("Sample report") &&
  sample.getAttribute("aria-label")?.includes("Illustrative"),
  "A single honest sample marker identifies the preview");
assert.ok(!doc.querySelector("#sample-report .slr-example-tabs"),"Weak generic SaaS/service/store example section is removed");
assert.equal(doc.querySelectorAll("main > section").length,5,"Landing has exactly five useful sections");
assert.equal(doc.querySelectorAll("#full-report .slr-paid-proof-item").length,5,
  "Paid value mirrors the five actual expandable report topics");
assert.ok(!doc.querySelector(".slr-story") && !doc.querySelector("#what-we-check"),
  "Repetitive scroll-heavy story and signal grid are removed");
assert.ok(doc.querySelector("#pricing")&&doc.querySelector("#faq")&&doc.querySelector("#how-it-works"),
  "Pricing, FAQ and workflow remain");
assert.ok(!doc.querySelector('a[href="/my-reports"]'),"Hidden My Reports navigation stays removed");
const css=readFileSync("components/landing/landing-result-proof.css","utf8");
assert.ok(css.includes("grid-template-columns:minmax(0,.93fr) minmax(0,1.07fr)") &&
  css.includes("@media(max-width:570px)")&&css.includes("@media(max-width:360px)"),
  "Desktop split hero and 570px/360px mobile breakpoints");
const brandDark=readFileSync("components/scalen-inspired-dark.css","utf8");
assert.ok(brandDark.includes('html[data-landing-theme="dark"] .slr-page .slr-live-demo') &&
  brandDark.includes("--scalen-lime:#bdfb54")&&brandDark.includes("--scalen-panel:#171718") &&
  brandDark.includes(".slr-live-demo-fill--good"),
  "Dark preview keeps readable charcoal plus signature lime signals");
const globals=readFileSync("app/globals.css","utf8");
assert.ok(globals.indexOf('landing-result-proof.css')>globals.indexOf("dark-monochrome.css") &&
  globals.indexOf('scalen-inspired-dark.css')>globals.indexOf('landing-result-proof.css') &&
  globals.indexOf('scalen-inspired-dark.css')<globals.indexOf(":root"),
  "SCALEN lime overrides all previous monochrome dark declarations");

const saved:Record<string,PropertyDescriptor|undefined>={};
const keys=["window","document","self","HTMLElement","Element","Node","SVGElement","IS_REACT_ACT_ENVIRONMENT"];
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:"https://strangerlens.example",pretendToBeVisual:true});
keys.forEach(k=>{saved[k]=Object.getOwnPropertyDescriptor(globalThis,k);Object.defineProperty(globalThis,k,{
  configurable:true,writable:true,value:k==="IS_REACT_ACT_ENVIRONMENT"?true:k==="window"?dom.window:(dom.window as any)[k]});});
dom.window.matchMedia=()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}} as any);
const root=createRoot(dom.window.document.getElementById("root")!);
(async()=>{try{
  await act(async()=>root.render(<StrangerLensLanding {...props}/>));
  const toggle=dom.window.document.querySelector<HTMLButtonElement>(".slr-nav-actions [data-testid='theme-toggle']")!;
  assert.ok(toggle,"Theme button is clickable");
  await act(async()=>toggle.click());
  assert.equal(dom.window.document.documentElement.dataset.landingTheme,"dark","Landing toggle selects dark mode");
  assert.equal(toggle.getAttribute("aria-label"),"Switch to light mode");
  await act(async()=>toggle.click());
  assert.equal(dom.window.document.documentElement.dataset.landingTheme,"light","Landing toggle selects light mode");
  const menu=dom.window.document.querySelector<HTMLButtonElement>("button.slr-menu-toggle")!;
  await act(async()=>menu.click());
  assert.ok(dom.window.document.querySelector('nav[aria-label="Mobile navigation"]'),"Mobile menu opens");
  assert.equal(dom.window.document.querySelectorAll('nav[aria-label="Mobile navigation"] a').length,3,
    "Mobile menu also has only three navigation links");
  console.log("PASS: report-first landing and responsive top navigation, accurate sample, theme toggle, honest paid features.");
}finally{
  await act(async()=>root.unmount());dom.window.close();
  keys.forEach(k=>saved[k]?Object.defineProperty(globalThis,k,saved[k]):delete (globalThis as any)[k]);
}})().catch(e=>{console.error(e);process.exitCode=1});

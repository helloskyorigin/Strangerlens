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
assert.equal(nav.querySelectorAll('a').length,3,"Three clear navigation choices");
assert.deepEqual([...nav.querySelectorAll("a")].map(a=>a.textContent?.trim()),
  ["Why it matters","Explore","Pricing"],"Navigation leads with value and exploration, not an early purchase");
assert.equal(doc.querySelectorAll(".slr-nav-actions [data-testid='theme-toggle']").length,1,
  "Theme switch always visible on the landing navbar");
assert.equal(doc.querySelectorAll(".slr-nav-actions .slr-nav-cta").length,1,
  "Desktop has one primary CTA");
assert.equal(doc.querySelectorAll("h1").length,1,"One clear headline");
assert.ok(doc.querySelector(".slr-hero-proof .slr-hero-copy #slr-scan .slr-form-submit")?.textContent?.includes("Reveal My Clarity Score — Free"),
  "Real free URL form is available above results preview");
// The URL field is its own rounded surface, never a box around the CTA.
const urlField=doc.querySelector("#slr-scan .slr-input-wrap")!;
const input=urlField.querySelector<HTMLInputElement>("#slr-website-url")!;
assert.ok(input,"URL input is inside its own rounded field");
assert.equal(input.type,"url","Mobile gets the URL keyboard");
assert.equal(input.getAttribute("autocomplete"),"url");
assert.equal(urlField.querySelectorAll("button").length,0,
  "The lime submit button must sit outside the URL field");
assert.ok(doc.querySelector("#slr-scan > .slr-form-submit"),
  "CTA is a separate sibling, not nested inside the URL field");
const inputPolish=readFileSync("components/landing/landing-story.css","utf8");
assert.ok(inputPolish.includes("URL field / autofill hardening") &&
  inputPolish.includes("input:is(:-webkit-autofill") &&
  inputPolish.includes("-webkit-box-shadow:0 0 0 1000px #1A1D19 inset!important") &&
  inputPolish.includes("outline:0!important") &&
  inputPolish.includes("border-radius:23px!important"),
  "Android autofill rectangle and focus outline are neutralized in light and dark modes");

const sample=doc.querySelector('.slr-hero-proof .slr-live-demo')!;
assert.ok(sample && sample.getAttribute("aria-label")?.includes("Illustrative"),"Honest sample alongside hero");
assert.equal(sample.querySelectorAll(".slr-live-demo-row").length,5,"Exactly five real report signal categories");

assert.equal(sample.querySelector(".slr-live-demo-scoreline strong")?.textContent?.trim(),"55/100",
  "Illustrative overall score matches the five example dimensions");
assert.deepEqual([...sample.querySelectorAll(".slr-live-demo-row-score")].map(el=>Number(el.textContent)),[57,43,36,73,66],
  "Sample signals are varied and show meaningful improvement opportunities");
assert.equal(sample.querySelectorAll(".slr-live-demo-visitor-thought").length,5,
  "Each signal has one concrete visitor question or observation");
assert.ok(sample.querySelector(".slr-live-demo-row-score")?.getAttribute("style")?.includes("background-color"),
  "Score chip has a durable readable surface even when dark-theme CSS is delayed");
const samplePolish=readFileSync("components/landing/landing-story.css","utf8");
for(const fragment of [".slr-live-demo-row-head .slr-live-demo-row-score","color:#D9FF9B!important",
  "background:#24331C!important","height:10px!important",
  "slr-live-demo-fill--red","slr-live-demo-fill--amber","slr-live-demo-fill--good",
  "slr-live-demo-visitor-thought"]){
  assert.ok(samplePolish.includes(fragment),"Sample contrast or distinct signal styling missing: "+fragment);
}

assert.ok(sample.textContent?.includes("First Impression")&&sample.textContent?.includes("Audience") &&
  sample.textContent?.includes("Value")&&sample.textContent?.includes("Trust")&&sample.textContent?.includes("Action"),
  "Sample reflects the actual free signal categories");
assert.ok(sample.textContent?.includes("Sample report") &&
  sample.getAttribute("aria-label")?.includes("Illustrative"),
  "A single honest sample marker identifies the preview");
assert.ok(!doc.querySelector("#sample-report .slr-example-tabs"),"Weak generic SaaS/service/store example section is removed");
assert.equal(doc.querySelectorAll("main > section").length,6,"Six purposeful landing sections");
assert.equal(doc.querySelectorAll("#explore .slr-explore-choice").length,3,
  "Three interactive visitor questions make the purpose tangible");
assert.ok(doc.querySelector("#why-it-matters")&&doc.querySelector("#explore")&&doc.querySelector("#how-it-works")&&doc.querySelector("#faq"),
  "Problem, exploration, workflow and FAQ all precede pricing");
assert.equal(doc.querySelector("main > section:last-child")?.id,"pricing","Pricing is the final section");
assert.equal(doc.querySelectorAll("main > section:not(#pricing) .slr-price-card").length,0,
  "No paid offers in educational sections");
assert.equal(doc.querySelectorAll("main > section:not(#pricing)").length,5);
assert.ok(![...doc.querySelectorAll("main > section:not(#pricing)")].some(section=>/[$]9|checkout|buy now/i.test(section.textContent||"")),
  "Price and order language are reserved for the bottom");
assert.equal(doc.querySelectorAll("#pricing .slr-final-action button").length,1,"One final free-check action");
assert.ok(!doc.querySelector('a[href="/my-reports"]'),"Hidden My Reports navigation stays removed");
const css=readFileSync("components/landing/landing-result-proof.css","utf8");
assert.ok(css.includes("grid-template-columns:minmax(0,.93fr) minmax(0,1.07fr)") &&
  css.includes("@media(max-width:570px)")&&css.includes("@media(max-width:360px)"),
  "Desktop split hero and 570px/360px mobile breakpoints");
// Protect the actual reported screenshot bugs: black CTA and invisible dark sample numbers.
const polish=readFileSync("components/landing/landing-story.css","utf8");
assert.ok(polish.includes(".slr-page .slr-hero-scan .slr-form-submit") &&
  polish.includes("background:#C7F36A!important") &&
  polish.includes("border-radius:999px!important") &&
  polish.includes("-webkit-text-fill-color:#17210D!important"),
  "Free score button stays electric lime, rounded, and high-contrast in both themes");
for(const selector of [
  ".slr-live-demo-scoreline strong",
  ".slr-live-demo-scoreline strong span",
  ".slr-live-demo-row-score",
  ".slr-live-demo-row-head > strong",
  ".slr-live-demo-score-status",
  ".slr-live-demo-status--red",
  ".slr-live-demo-status--good",
]){
  assert.ok(polish.includes(selector),"Dark sample contrast correction stays in place: "+selector);
}
assert.ok(polish.includes("color:#F5FFE9!important")&&
  polish.includes("-webkit-text-fill-color:#F5FFE9!important"),
  "Dark mode numbers use strong, explicit readable text color");
const luminance=(hex:string)=>{
  const channels=hex.match(/[0-9a-f]{2}/gi)!.map(x=>parseInt(x,16)/255)
    .map(v=>v<=0.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
};
const contrast=(a:string,b:string)=>{
  const la=luminance(a),lb=luminance(b);
  return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);
};
assert.ok(contrast("F5FFE9","171718")>=7,"Dark preview scores exceed AAA text contrast");
assert.ok(contrast("17210D","C7F36A")>=7,"Lime CTA label remains high contrast");
assert.ok(readFileSync("app/globals.css","utf8").indexOf("landing-story.css") >
  readFileSync("app/globals.css","utf8").indexOf("scalen-inspired-dark.css"),
  "Final bugfix selectors load after older theme-specific overrides");

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
  const choices=Array.from(dom.window.document.querySelectorAll<HTMLButtonElement>(".slr-explore-choice"));
  assert.equal(choices.length,3,"Explore controls are rendered");
  await act(async()=>choices[1].click());
  assert.equal(choices[1].getAttribute("aria-pressed"),"true","Interactive visitor question switches accessibly");
  assert.ok(dom.window.document.querySelector(".slr-explore-result")?.textContent?.includes("Is this meant for someone like me?"));
  console.log("PASS: story-first landing, final-only pricing, responsive navigation, theme toggle and interactive examples.");
}finally{
  await act(async()=>root.unmount());dom.window.close();
  keys.forEach(k=>saved[k]?Object.defineProperty(globalThis,k,saved[k]):delete (globalThis as any)[k]);
}})().catch(e=>{console.error(e);process.exitCode=1});

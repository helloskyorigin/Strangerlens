import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import StrangerLensLanding from "../components/landing/StrangerLensLanding";
import ResultsScreen from "../components/ResultsScreen";
import ScanScreen from "../components/ScanScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";

// Regression: fresh entry and SPA view transitions must not preserve mid-page scroll.
const pageSource=readFileSync("app/page.tsx","utf8");
assert.ok(pageSource.includes('window.history.scrollRestoration = "manual"'),
 "Prevent the browser from restoring the previous vertical position");
assert.ok(pageSource.includes('window.addEventListener("pageshow", onPageShow)'),
 "Reset scroll when mobile browsers restore a page from their cache");
assert.ok(pageSource.includes('}, [currentView]);') &&
  pageSource.includes("showScreenFromTop();"),
 "Each landing/scan/results transition starts at the top");
assert.ok(pageSource.includes('scrollToInput();'),
 "Explicit New Check URL input scrolling remains available");

const landing=renderToStaticMarkup(<StrangerLensLanding url="" onUrlChange={()=>{}} onAnalyze={()=>{}} isVerifying={false} errorMessage={null}/>);
const dl=new JSDOM(landing).window.document;
assert.ok(dl.querySelector("h1")?.textContent?.includes("Would a stranger"),"Hero talks directly about first impressions");
assert.ok(dl.querySelector(".slr-form-submit")?.textContent?.includes("Reveal My Clarity Score — Free"),"Free CTA previews the actual score");
assert.ok(!dl.querySelector('a[href="/my-reports"]'),"No My Reports link on the landing page");
assert.ok(!landing.includes("A FRESH LOOK AT YOUR WEBSITE") && !landing.includes("See my website differently"),"No abstract old CTA");
const data=mapBackendToFrontend(paymentAnalysis,"https://example.com",paymentSnapshot);
for(const paid of [false,true]){
 const doc=new JSDOM(renderToStaticMarkup(<ResultsScreen analysisData={data} rawUrl="https://example.com"
   checkoutEnabled isUnlocked={paid} onBackToLanding={()=>{}}/>)).window.document;
 assert.equal(doc.querySelectorAll(".sl-v8-header .sl-v8-nav-left [data-testid='theme-toggle']").length,1,
    "Appearance toggle is on the left");
 assert.equal(doc.querySelectorAll(".sl-v8-header .sl-v8-nav-right .sl-v8-new-check").length,1,
    "New Check is on the right");
 assert.equal(doc.querySelectorAll(".sl-v8-header a").length,0,"No old My Reports or brand links");
 assert.equal(doc.querySelectorAll('[data-signal]').length,5,"All five clarity signals remain");
 if(paid){
    assert.equal(doc.querySelectorAll(".sl-paid-card-trigger").length,5,"Five paid accordion cards remain");
    assert.ok(doc.querySelector("#report-export-actions"),"Paid PDF stays available");
 }else{
    assert.ok(doc.querySelector("#complete-report-preview .sl-v7-upgrade-button"),"Free paid CTA remains");
 }
}
// Guard the exact scanner Exit white-on-white regression and common theme controls.
// This CSS must load after the legacy theme rules to win the cascade.
const guard=readFileSync("components/theme-contrast-guard.css","utf8");
const imports=readFileSync("app/globals.css","utf8");
assert.ok(imports.includes('theme-contrast-guard.css') &&
  imports.indexOf("theme-contrast-guard.css")>imports.indexOf("landing-story.css") &&
  imports.indexOf("theme-contrast-guard.css")>imports.indexOf("scalen-inspired-dark.css"),
  "Contrast safeguards must load last");
for (const selector of [
  'html[data-landing-theme="dark"] .sl-scan-v2 .sl-scan-close',
  'html[data-landing-theme="light"] .sl-scan-v2 .sl-scan-close',
  'html[data-landing-theme="dark"] .sl-scan-v2 .sl-scan-close :is(span,svg)',
  'html[data-landing-theme="dark"] .sl-scan-v2 .sl-scan-status-row .sl-scan-elapsed',
  'html[data-landing-theme="dark"] .sl-scan-v2 .sl-scan-brand',
  'html[data-landing-theme="dark"] .sl-results-v7 .sl-v8-new-check',
  'html[data-landing-theme="light"] .sl-results-v7 .sl-v8-new-check',
  'html[data-landing-theme="dark"] .sl-results-v7 .sl-theme-quick :is(span,svg)',
  'html[data-landing-theme="dark"] .slr-legal .slr-legal-tab.is-active',
  'html[data-landing-theme="dark"] .slr-legal :is(.slr-legal-back,.slr-legal-help-button)',
  'html[data-landing-theme="light"] .slr-legal :is(.slr-legal-back,.slr-legal-help-button)'
]) assert.ok(guard.includes(selector),"Missing route/theme-specific contrast rule: "+selector);
const luminance=(hex:string)=>{
 const n=hex.match(/[A-F0-9]{2}/gi)!.map(c=>parseInt(c,16)/255)
   .map(c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4));
 return n[0]*.2126+n[1]*.7152+n[2]*.0722;
};
const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const [name,fg,bg] of [
  ["dark scanner Exit","F3FBEF","252C22"],
  ["light scanner Exit","20321B","F0F7EA"],
  ["dark results New Check","15200F","C7F36A"],
  ["light results New Check","FFFFFF","152014"],
  ["dark legal selected tab","18250F","C7F36A"],
  ["dark scanner timer","C7F36A","20291F"]
]) assert.ok(contrast(fg,bg)>=4.5,name+" must meet WCAG AA text contrast");
const scanMarkup=renderToStaticMarkup(<ScanScreen rawUrl="https://example.com" onBackToLanding={()=>{}}/>);
assert.ok(scanMarkup.includes('class="sl-scan-close"') && scanMarkup.includes("Exit"),
 "Scanner Exit button must remain visible and accessible");
assert.ok(scanMarkup.includes('class="sl-scan-brand"') && scanMarkup.includes("StrangerLens"),
 "Scanner branding stays in the header during theme switches");

const css=readFileSync("components/dark-monochrome.css","utf8");
const globals=readFileSync("app/globals.css","utf8");
assert.ok(globals.includes('@import "../components/dark-monochrome.css"') &&
  globals.indexOf("dark-monochrome.css")<globals.indexOf(":root"),"Dark overrides load before CSS declarations");
for(const name of [".slr-page",".sl-results-v7",".sl-scan-v2",".slr-legal",".sl-app-theme"]){
 assert.ok(css.includes(name),"Dark style covers "+name);
}
const scalen = readFileSync("components/scalen-inspired-dark.css","utf8");
assert.ok(scalen.includes("--scalen-panel:#171718") &&
  scalen.includes("--scalen-lime-text:#a9e66e") &&
  scalen.includes("--scalen-lime:#bdfb54"),
  "Dark mode is SCALEN-inspired charcoal and electric lime, not monochrome");
assert.ok(scalen.includes('.sl-v7-upgrade-button') &&
  scalen.includes("filter:none!important"),
  "Bright lime paid CTA and original lime logo stay visible");
assert.ok(globals.indexOf("scalen-inspired-dark.css")>globals.indexOf("landing-result-proof.css") &&
  globals.indexOf("scalen-inspired-dark.css")<globals.indexOf(":root"),
  "SCALEN color corrections load last");
assert.ok(globals.includes("color-scheme: light;") &&
  globals.includes("background-color: #f7faf4") &&
  globals.includes('html[data-landing-theme="light"]'),
  "New visits default to white and lime rather than dark");

console.log("PASS: strong landing CTA, minimal results navbar, monochrome dark CSS, paid flow & PDF access.");

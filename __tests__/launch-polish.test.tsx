import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import StrangerLensLanding from "../components/landing/StrangerLensLanding";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";

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

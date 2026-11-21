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
assert.ok(dl.querySelector("h1")?.textContent?.includes("What’s unclear on"),"Landing headline names the actual problem");
assert.ok(dl.querySelector(".slr-form-submit")?.textContent?.includes("Find My Website’s Weak Spots — Free"),"Free CTA explains the benefit");
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
assert.ok(css.includes("background:#050505!important") && css.includes("color:#f5f5f5!important")
 && css.includes(".sl-v7-upgrade-button"),"Black canvas and contrast-safe neutral paid CTA");
assert.ok(!/#(?:b9fc22|c7f36a|a8e452|d9f4b2|22301b|1f291d)/i.test(css),"No green tint in dark override");
console.log("PASS: strong landing CTA, minimal results navbar, monochrome dark CSS, paid flow & PDF access.");

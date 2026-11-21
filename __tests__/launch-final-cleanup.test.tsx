import assert from "node:assert/strict";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import StrangerLensLanding from "../components/landing/StrangerLensLanding";
import ScanScreen from "../components/ScanScreen";
import ContactPage from "../app/contact/page";
import PrivacyPage from "../app/privacy/page";
import TermsPage from "../app/terms/page";
import RefundPage from "../app/refund-policy/page";
import { LEGAL_CONFIG, getSupportGmailComposeUrl } from "../lib/legal-config";

const doc=new JSDOM(renderToStaticMarkup(<StrangerLensLanding url="" onUrlChange={()=>{}} onAnalyze={()=>{}} isVerifying={false} errorMessage={null}/>)).window.document;
assert.equal(doc.querySelectorAll("main > section").length,5,"Exactly five useful landing sections");
for(const id of ["full-report","how-it-works","pricing","faq"])assert.ok(doc.querySelector("#"+id),id+" preserved");
assert.ok(!doc.querySelector("#sample-report,.slr-bottom-cta,.slr-example"),"Weak examples and repeated ending removed");
assert.equal(doc.querySelector("#faq h2")?.textContent?.trim(),"FAQ.","FAQ has the requested simple heading");
assert.ok(!doc.querySelector(".slr-paid-proof-disclaimer,.slr-example-disclosure"),"No long technical caveats inside the sales flow");
assert.equal(doc.querySelectorAll(".slr-live-demo-row").length,5,"The five free score categories match the product");
assert.equal(doc.querySelectorAll(".slr-live-demo-tag").length,1,"One clearly labeled sample");
assert.ok(doc.querySelector(".slr-live-demo-tag")?.textContent?.includes("Sample report"));
const lp=doc.querySelector("main")?.textContent||"";
for(const unwanted of ["fresh eyes","publicly accessible website content","All three examples are fictional","Good questions. Clear answers"]) {
 assert.ok(!lp.toLowerCase().includes(unwanted.toLowerCase()),"Marketing language removed: "+unwanted);
}
const resultsCss=readFileSync("components/results-lime-v8.css","utf8");
assert.ok(resultsCss.includes("width:min(820px,calc(100% - 32px))!important"),"Sticky navbar matches the 820px score and purchase cards");
assert.ok(resultsCss.includes("grid-template-columns:minmax(0,1fr) max-content max-content"),"Desktop score/status/title have distinct columns");
assert.ok(resultsCss.includes("grid-template-columns:minmax(0,1fr) auto!important"),"Small screens separate title and score/status rows");
assert.ok(resultsCss.includes("padding:15px 17px!important"),"Signals get generous interior padding");
const scan=renderToStaticMarkup(<ScanScreen rawUrl="https://example.com"
 verifiedSite={{domain:"example.com",httpStatus:200}} scanMilestone="content_inspected"
 onBackToLanding={()=>{}}/>);
assert.ok(scan.includes("Checking what stands out"),"Scan communicates the real stage clearly");
assert.ok(!scan.toLowerCase().includes("fresh eyes"),"Rejected slogan removed from scan");
assert.equal(LEGAL_CONFIG.supportEmail,"hello.skyworking@gmail.com","Requested email is authoritative");
assert.equal(new URL(getSupportGmailComposeUrl()).searchParams.get("to"),LEGAL_CONFIG.supportEmail);
for(const page of [<ContactPage/>,<PrivacyPage/>,<TermsPage/>,<RefundPage/>]){
 const html=renderToStaticMarkup(page);
 assert.ok(html.includes(LEGAL_CONFIG.supportEmail),"Every legal page shows the correct support email");
 assert.ok(!html.includes("hello.skyorigin@gmail.com"),"Old email removed");
 assert.ok(!/test checkout is labeled|SAMPLE \/|example\.com/.test(html),"Legal pages contain no sample placeholders or test-mode marketing text");
 assert.ok(html.includes("Refund Policy")&&html.includes("Contact Support"),"Real terms and support navigation are present");
}
const layout=readFileSync("app/layout.tsx","utf8");
const switcher=readFileSync("components/landing/LandingThemeSwitcher.tsx","utf8");
assert.ok(layout.includes('data-landing-theme="light"') &&
 layout.includes('localStorage.getItem("strangerlens-theme-v4")') &&
 layout.includes('var dark=v==="dark";'),"New visits open white and lime and only intentional dark choices activate dark");
assert.ok(switcher.includes('LANDING_THEME_KEY = "strangerlens-theme-v4"') &&
 !switcher.includes("prefers-color-scheme: dark"),"OS dark mode no longer overrides the light default");
console.log("PASS: 820px result nav, collision-safe signals, five-section landing, focused FAQ, scan copy, real support email, accurate legal pages and default light.");

import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import PostScanUpgradeModal from "../components/PostScanUpgradeModal";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot } from "./fixtures/payment-report";
import { escapeHtmlText } from "../lib/escape-html";

const source=readFileSync("components/ResultsScreen.tsx","utf8");
assert.equal(escapeHtmlText('<img src=x onerror="bad()" /> &'), '&lt;img src=x onerror=&quot;bad()&quot; /&gt; &amp;');
assert.ok(!source.includes("StrangerLens-Share.png"), "Obsolete share-card generator is removed.");
assert.ok(!source.includes("document.createElement('div')"), "Results no longer assemble unsanitized image cards in the browser.");
const popup=readFileSync("components/PostScanUpgradeModal.tsx","utf8");
const scanRoute=readFileSync("app/api/check/route.ts","utf8");
assert.ok(!source.includes("sl_post_scan_offer_v1") && !source.includes("<PostScanUpgradeModal"),
  "Fresh results have no automatic post-scan upgrade modal.");
assert.ok(source.includes("<CompleteReportPreview"), "The offer is placed after the score breakdown.");
assert.ok(popup.includes('flex items-center justify-center p-4 sm:p-6'),
  "Mobile upgrade dialog is centered instead of anchored to the bottom.");
assert.ok(scanRoute.includes('onProgress?.("content_inspected")') &&
  scanRoute.includes('onProgress?.("signals_evaluated")'),"Server emits truthful content/scoring milestones.");

const lightCss=readFileSync("app/landing-v3.css","utf8");
const appCss=readFileSync("app/app-theme.css","utf8");
for(const css of [lightCss,appCss]){
  assert.ok(css.includes('button)[class~="bg-[#246BFD]"]'),"Blue filled CTAs preserve contrast in light mode.");
  assert.ok(css.includes('color:#FFFFFF!important'),"White text remains visible on filled actions.");
}
const sample=renderToStaticMarkup(<PostScanUpgradeModal
  open domain="example.com" overallScore="68/100"
  signals={[{title:"First Impression",scoreDisplay:"78/100"}]}
  canCheckout isTestMode={false} busy={false} onUpgrade={()=>{}} onContinueFree={()=>{}}/>);
assert.ok(sample.includes('sl-upgrade-dialog'));
assert.ok(sample.includes("Unlock Complete Report — $5"));

const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{
  url:"https://strangerlens.ai.studio",pretendToBeVisual:true
});
const old:Record<string,PropertyDescriptor|undefined>={};
for(const key of ["window","self","document","HTMLElement","Element","Node","IS_REACT_ACT_ENVIRONMENT"]){
  old[key]=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{
    configurable:true,writable:true,
    value:key==="IS_REACT_ACT_ENVIRONMENT"?true:(key==="window"||key==="self")?dom.window:(dom.window as any)[key],
  });
}
async function main(){
  const root=createRoot(dom.window.document.getElementById("root")!);
  const report={...mapBackendToFrontend(structuredClone(paymentAnalysis),"https://example.com",paymentSnapshot),
    reportId:"instant-offer-demo",checkoutEnabled:true};
  try{
    await act(async()=>root.render(<ResultsScreen rawUrl="https://example.com"
      analysisData={report} checkoutEnabled={true}
      postScanOfferReportId="instant-offer-demo" paymentState="idle"/>));
    assert.ok(!dom.window.document.querySelector('[role="dialog"][aria-modal="true"]'),
      "Free results display immediately without a blocking popup.");
    assert.ok(dom.window.document.querySelector("#results-content"));
    assert.ok(dom.window.document.querySelector("#report-first-look .sl-v7-score-number"));
    assert.equal(dom.window.document.querySelectorAll(".sl-v7-signal-row").length, 5);
    assert.ok(dom.window.document.querySelector("#complete-report-preview"));
    assert.ok(!dom.window.document.querySelector("#your-improvement-plan"));
    console.log("PASS: nonblocking results-first conversion with a visible $5 offer and protected details.");
  }finally{
    await act(async()=>root.unmount());
    dom.window.close();
    for(const key of ["window","self","document","HTMLElement","Element","Node","IS_REACT_ACT_ENVIRONMENT"]){
      if(old[key])Object.defineProperty(globalThis,key,old[key]!);
      else delete (globalThis as any)[key];
    }
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});

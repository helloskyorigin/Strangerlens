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

const source=readFileSync("components/ResultsScreen.tsx","utf8");
const popup=readFileSync("components/PostScanUpgradeModal.tsx","utf8");
const scanRoute=readFileSync("app/api/check/route.ts","utf8");
assert.ok(!source.includes("}, 700);"),"Fresh scan upgrade is not artificially delayed after showing results.");
assert.ok(source.includes('useState(() => {') && source.includes('sl_post_scan_offer_v1'),
  "Fresh scan modal is initialized before first Results paint.");
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
assert.ok(sample.includes("Unlock Full Analysis — $5"));

const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{
  url:"https://strangerlens.ai.studio",pretendToBeVisual:true
});
const old:Record<string,PropertyDescriptor|undefined>={};
for(const key of ["window","document","HTMLElement","Element","Node","IS_REACT_ACT_ENVIRONMENT"]){
  old[key]=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{
    configurable:true,writable:true,
    value:key==="IS_REACT_ACT_ENVIRONMENT"?true:key==="window"?dom.window:(dom.window as any)[key],
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
    assert.ok(dom.window.document.querySelector('[role="dialog"][aria-modal="true"]'),
      "Centered upgrade modal is present immediately after results mount.");
    const sheet=dom.window.document.querySelector(".sl-upgrade-dialog");
    assert.ok(sheet);
    const free=[...dom.window.document.querySelectorAll<HTMLButtonElement>("button")]
      .find(b=>b.textContent?.includes("Continue with free results"));
    assert.ok(free,"Free results remain one tap away.");
    await act(async()=>free.click());
    assert.ok(!dom.window.document.querySelector(".sl-upgrade-dialog"),
      "Dismiss immediately reveals the existing free report.");
    assert.ok(dom.window.document.querySelector("#results-content"));
    console.log("PASS: instant centered post-scan popup, available free choice, and light CTA contrast.");
  }finally{
    await act(async()=>root.unmount());
    dom.window.close();
    for(const key of ["window","document","HTMLElement","Element","Node","IS_REACT_ACT_ENVIRONMENT"]){
      if(old[key])Object.defineProperty(globalThis,key,old[key]!);
      else delete (globalThis as any)[key];
    }
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});

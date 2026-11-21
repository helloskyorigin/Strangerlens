import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import ResultsScreen from "../components/ResultsScreen";
import { mapBackendToFrontend } from "../lib/mapper";
import { paymentAnalysis, paymentSnapshot, privateText } from "./fixtures/payment-report";

const saved: Record<string, PropertyDescriptor | undefined> = {};
const props = ["window","self","document","HTMLElement","Element","Node","SVGElement","IS_REACT_ACT_ENVIRONMENT"];
const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{
  url: "https://strangerlens.example", pretendToBeVisual: true,
});
props.forEach(k => { saved[k] = Object.getOwnPropertyDescriptor(globalThis,k);
  Object.defineProperty(globalThis,k,{configurable:true,writable:true,
    value: k==="IS_REACT_ACT_ENVIRONMENT" ? true : k==="window" ? dom.window : (dom.window as any)[k]}); });
(async()=>{
const root=createRoot(dom.window.document.getElementById("app")!);
const get = (id:string) => dom.window.document.querySelector<HTMLButtonElement>("#paid-card-trigger-"+id)!;
const isOpen = (id:string) => get(id).getAttribute("aria-expanded")==="true";
try {
  const analysis=mapBackendToFrontend(structuredClone(paymentAnalysis),"https://example.com",paymentSnapshot);
  await act(async()=>root.render(<ResultsScreen analysisData={analysis} isUnlocked={true} checkoutEnabled={true}/>));
  const doc=dom.window.document;
  assert.equal(doc.querySelectorAll(".sl-paid-card-trigger").length,5,"Exactly five promised benefits");
  assert.equal(doc.querySelectorAll('.sl-paid-card-trigger[aria-expanded="true"]').length,0,"All panels initially closed");
  assert.equal(doc.querySelectorAll('[data-paid-signal]').length,0,"No lengthy findings open on arrival");
  assert.ok(doc.querySelector("#report-clarity-signals"),"Free scores persist on paid view");
  assert.equal(doc.querySelectorAll('[data-signal]').length,5,"Buying check does not become a sixth free signal");
  assert.equal(doc.querySelector("#complete-report-preview"),null,"No repeated purchase offer after paying");
  assert.ok(doc.querySelector("#report-export-actions button")?.textContent?.includes("Full PDF"),"Download is below accordion");
  await act(async()=>get("stranger").click());
  assert.ok(isOpen("stranger") && !!doc.querySelector("#strangers-view"),"Stranger card expands");
  assert.ok(doc.querySelector("#strangers-view")?.textContent?.includes(privateText),"Saved visitor impression is visible");
  await act(async()=>get("problems").click());
  assert.ok(!isOpen("stranger") && !doc.querySelector("#strangers-view"),"Previous card closes");
  assert.ok(isOpen("problems") && doc.querySelector("#complete-paid-report"),"Full diagnosis available");
  assert.ok(doc.querySelector("#complete-paid-report")?.textContent?.includes(privateText),"Actual signal analysis is inside");
  await act(async()=>get("hesitation").click());
  assert.ok(isOpen("hesitation") && !isOpen("problems"),"Trust doubts have their own panel");
  assert.ok(doc.querySelector("#why-visitors-hesitate")?.textContent?.includes("Trust"),"Trust details visible");
  await act(async()=>get("fixes").click());
  assert.ok(isOpen("fixes") && doc.querySelector("#evidence-to-fix") && doc.querySelector("#smart-priority"),"Real fixes and their priority available");
  assert.ok(doc.querySelector("#evidence-to-fix")?.textContent?.includes("Build clearer websites"),"Evidence retained");
  await act(async()=>get("copy").click());
  assert.ok(isOpen("copy") && !isOpen("fixes"),"Copy opens without other content");
  assert.ok(doc.querySelector("#better-copy-studio") && [...doc.querySelectorAll("#better-copy-studio button")].some(button => button.textContent?.includes("Copy this version")),"Editable copy tool is ready");
  await act(async()=>get("copy").click());
  assert.equal(doc.querySelectorAll('.sl-paid-card-trigger[aria-expanded="true"]').length,0,"Open card closes again");

  const legacy=structuredClone(paymentAnalysis);
  delete legacy.purchase_readiness;
  await act(async()=>root.render(<ResultsScreen analysisData={mapBackendToFrontend(legacy,"https://example.com",paymentSnapshot)} isUnlocked={true} checkoutEnabled={true}/>));
  await act(async()=>get("hesitation").click());
  assert.equal(doc.querySelector("[data-testid='purchase-decision-deep-dive']"),null,"No invented purchase analysis on legacy report");
  await act(async()=>root.render(<ResultsScreen analysisData={analysis} isUnlocked={false} checkoutEnabled={true}/>));
  assert.equal(doc.querySelector("#paid-card-trigger-copy"),null,"All paid cards disappear before verified payment");
  assert.equal(doc.body.textContent?.includes(privateText),false,"No paid content leaks into free results");
  console.log("PASS: five paid accordion cards, single-open interactions, grounded report sections, legacy/paid access and PDF.");
} finally {
  await act(async()=>root.unmount());
  dom.window.close();
  props.forEach(k=>saved[k] ? Object.defineProperty(globalThis,k,saved[k]) : delete (globalThis as any)[k]);
}
})().catch(err=>{console.error(err);process.exitCode=1});

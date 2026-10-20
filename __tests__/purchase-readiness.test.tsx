import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { extractWebsiteSnapshot } from "../lib/content-extractor";
import { assessPurchaseReadiness } from "../services/scoring/purchaseReadiness";
import { validateAndScoreAnalysis } from "../services/validation/analysisValidator";
import { generateDeterministicFallbackAnalysis } from "../services/ai/fallbackAnalyzer";
import { SIGNAL_WEIGHTS } from "../services/scoring/scoringConfig";
import { calculateOverallScore } from "../services/scoring/calculateOverallScore";
import { redactAnalysisForFreeTier, redactFrontendDataForFreeTier } from "../server/security/reportAccess";
import { mapBackendToFrontend } from "../lib/mapper";
import { adaptReport } from "../lib/report-adapter";
import { buildPdfReportModel } from "../server/pdf/reportModel";
import { buildLegacyFreePdfModel } from "../lib/pdf-download";
import ResultsScreen from "../components/ResultsScreen";
import type { SupportingPagesBundle } from "../lib/supporting-page-fetcher";

let assertions = 0;
function check(value: unknown, message: string) { assert.ok(value, message); assertions++; }
const snapshot = (body: string, title="Example") => extractWebsiteSnapshot(`<html><head><title>${title}</title></head><body><main>${body}</main></body></html>`, { baseUrl: "https://example.com" });
const cases: Array<[string,string,boolean,string?]> = [
  ["paid SaaS", '<section><h1>Automate team reports</h1><p>Our paid plans unlock reporting. Save time creating updates.</p><a href="/pricing">Pricing</a></section><section id="pricing"><h2>Paid plans</h2><div class="pricing-card"><h3>Pro plan</h3><span class="price">$19/month</span><p>Includes 20 reports and 5 seats.</p><a href="/checkout">Buy now</a></div><p>Cancel anytime. Contact us for support.</p></section>', true],
  ["ecommerce", '<section><h1>Handmade ceramic bowls</h1><p>Set of 4 bowls. Materials: clay.</p><p>$35 one-time purchase</p><button>Add to cart</button><p>Returns accepted within 14 days.</p></section>', true],
  ["freemium", '<section><h1>Create project plans</h1><p>Free forever plan. Upgrade to our paid plans for more projects.</p><a href="/pricing">Pricing</a><a href="/checkout">Upgrade to Pro</a></section><section id="pricing"><h2>Our plans</h2><div class="pricing-card"><h3>Free</h3><span class="price">$0</span></div><div class="pricing-card"><h3>Pro plan</h3><span class="price">₹499/month</span><p>Includes unlimited projects</p></div></section>', true],
  ["paid services", '<section><h1>Website design services</h1><p>Our consulting services deliver a project plan and design files.</p><a href="/quote">Request a quote</a></section>', true],
  ["priced services without purchase CTA", '<section><h1>Website design services</h1><p>Packages starting at $500 per project.</p><button>Contact us</button></section>', true],
  ["paid newsletter", '<section><h1>Expert weekly newsletter</h1><p>Our paid subscriptions cost $5 per month and include weekly reports.</p><button>Subscribe</button></section>', true],
  ["free tools", '<section><h1>Free image converter</h1><p>Completely free. No paid plans, subscriptions or payments.</p><button>Convert image</button></section>', false],
  ["blog", '<article><h1>Our guide to project tools</h1><p>A paid subscription costs $20/month. Here is our review of premium plans.</p><a href="/newsletter">Subscribe</a></article>', false, "Tool review blog"],
  ["unclear", '<section><h1>Build better projects</h1><p>Unlock your potential.</p><a href="/pricing">Pricing</a><a href="/signup">Get started</a></section>', false],
  ["free newsletter", '<section><h1>Developer newsletter</h1><p>Free updates every week.</p><button>Subscribe now</button></section>', false],
  ["donation", '<section><h1>Free community resources</h1><p>Donate $5 to support us.</p><button>Buy me a coffee</button></section>', false],
  ["affiliate review", '<article><h1>Software review</h1><p>Their subscription costs $20/month.</p><a href="https://another.example/buy">Buy now</a></article>', false, "Software review"],
  ["free services", '<section><h1>Community design services</h1><p>Our design services are completely free.</p><a href="/contact">Request a quote</a></section>', false],
  ["zero-price plan", '<section><h1>Free planning tool</h1></section><section id="pricing"><h2>Plan</h2><div class="pricing-card"><h3>Free forever</h3><span class="price">$0/month</span></div></section>', false],
  ["unpriced subscription", '<section><h1>Manage business projects</h1><p>Our premium plans include priority support and extra storage.</p><a href="/pricing">Pricing</a><button>Upgrade</button></section>', true],
];

async function main() {
  for (const [name,html,applies,title] of cases) {
    const s = snapshot(html,title);
    const before = JSON.stringify(s);
    const result = assessPurchaseReadiness(s);
    check(Boolean(result) === applies, `${name}: conditional detection from extracted HTML`);
    check(JSON.stringify(s) === before, `${name}: extraction is not mutated`);
    if (result) {
      check(Number.isInteger(result.score) && result.score >= 0 && result.score <= 100, `${name}: bounded actual assessment score`);
      check(result.details!.dimensions.reduce((sum,x)=>sum+x.points,0)===result.score, `${name}: transparent independent rubric`);
      check(result.details!.evidence.every(x=>x.status==="verified" && JSON.stringify(s).includes(x.text)), `${name}: all cited text is present in source HTML`);
      check(!JSON.stringify(result).match(/\d+(?:\.\d+)?%|conversion rate (?:is|of) \d/i), `${name}: no invented conversion figures`);
    }
  }
  const s = snapshot(cases[0][1]);
  const missingPeriod = snapshot('<section><h1>Create team reports</h1><p>Our paid plans include 20 reports</p><button>Buy now</button></section><div class="pricing-card"><h2>Pro plan</h2><span class="price">$19</span></div>');
  check(assessPurchaseReadiness(missingPeriod)?.details?.dimensions.find(x=>x.key==='pricing')?.points===10, 'extractor-default monthly period is never treated as website evidence');
  const analysis = validateAndScoreAnalysis(generateDeterministicFallbackAnalysis(s),s);
  const originalFive = { ...analysis.signals };
  check(Object.keys(analysis.signals).join(',') === 'first_impression,audience,value,trust,action', 'original five-signal container is unchanged');
  check(JSON.stringify(SIGNAL_WEIGHTS)===JSON.stringify({first_impression:.25,audience:.2,value:.25,trust:.15,action:.15}), 'original five weights remain exact');
  const expected = calculateOverallScore(Object.fromEntries(Object.entries(analysis.signals).map(([key,v])=>[key,v.score])) as any);
  check(expected.overallScore===analysis.overall_score, 'overall score uses only the original five scores');
  const full = analysis.purchase_readiness!;
  full.details!.recommendations.push('PREMIUM_PURCHASE_SENTINEL');
  const free = redactAnalysisForFreeTier(analysis);
  check(free.purchase_readiness_locked===true && !('purchase_readiness' in free), 'free API sends only applicability and omits the entire paid assessment');
  assert.deepEqual(redactAnalysisForFreeTier(free),free); assertions++;
  check(!('score' in (free.purchase_readiness || {})) && !('status' in (free.purchase_readiness || {})), 'free API has no purchase score or status');
  check(!JSON.stringify(free).includes('PREMIUM_PURCHASE_SENTINEL'), 'free response cannot contain premium purchase recommendations');
  const mapped = mapBackendToFrontend(analysis,'https://example.com',s);
  const freeMapped = redactFrontendDataForFreeTier(mapped);
  check(freeMapped.purchaseReadiness===undefined && freeMapped.purchaseReadinessLocked===true, 'frontend redactor removes score, status, summary and details');
  check(mapBackendToFrontend(free,'https://example.com',s).purchaseReadinessLocked===true, 'mapper preserves the public locked applicability marker');
  check(!adaptReport(freeMapped).purchaseReadiness && adaptReport(freeMapped).purchaseReadinessLocked, 'free adapter has no sixth scored signal');
  check(!redactAnalysisForFreeTier({...analysis,purchase_readiness:undefined}).purchase_readiness_locked, 'old reports never receive an invented locked marker');
  check(adaptReport(mapped).signalsList.length===5 && !!adaptReport(mapped).purchaseReadiness, 'adapter keeps independent sixth outside canonical five');
  const legacy = structuredClone(analysis); delete legacy.purchase_readiness;
  check(!adaptReport(mapBackendToFrontend(legacy,'https://example.com',s)).purchaseReadiness, 'old saved reports do not invent a new assessment');
  const stored:any = {normalizedUrl:'https://example.com',domain:'example.com',createdAt:1700000000000,fullAnalysis:analysis,snapshot:s};
  const freePdf = buildPdfReportModel(stored,false), paidPdf = buildPdfReportModel(stored,true);
  check(freePdf.signals.length===5 && !JSON.stringify(freePdf).includes('Purchase Readiness'), 'free PDF entirely omits the premium sixth assessment');
  check(!JSON.stringify(freePdf).includes('PREMIUM_PURCHASE_SENTINEL'), 'free PDF has no paid purchase details');
  check(JSON.stringify(paidPdf).includes('PREMIUM_PURCHASE_SENTINEL') && paidPdf.score===analysis.overall_score, 'paid PDF includes stored purchase findings without changing overall score');
  check(buildPdfReportModel({...stored,fullAnalysis:legacy},true).signals.length===5, 'old saved paid PDFs retain five signals');
  const legacyFreePdf=buildLegacyFreePdfModel(adaptReport(mapped));
  check(legacyFreePdf.signals.length===5 && !JSON.stringify(legacyFreePdf).includes('Purchase Readiness'), 'legacy free export cannot use cached/client sixth scores or findings');
  check(paidPdf.signals.length===6 && paidPdf.signals[5].score===full.score && !!paidPdf.signals[5].explanation, 'paid PDF retains original sixth score and explanation');
  check(paidPdf.evidence.some(e=>e.paragraphs.some(p=>full.details!.evidence.some(source=>source.text===p))), 'paid PDF contains real purchase evidence');
  const bundle = {pages:[{snapshot:s,finalUrl:'https://example.com/pricing'}]} as SupportingPagesBundle;
  const supporting = assessPurchaseReadiness(snapshot(cases.find(([name])=>name==="unclear")![1]),bundle);
  check(!!supporting && supporting.details!.evidence.some(e=>e.source==='https://example.com/pricing'), 'already-fetched supporting pricing page can establish eligibility with source attribution');
  check(!assessPurchaseReadiness(snapshot(cases.find(([name])=>name==="unclear")![1]),{pages:[]} as unknown as SupportingPagesBundle), 'a missing/unfetched pricing page never establishes eligibility');
  assert.deepEqual(analysis.signals,originalFive); assertions++;

  const saved = new Map<string,PropertyDescriptor | undefined>();
  const keys=['window','document','self','HTMLElement','Element','SVGElement','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','IS_REACT_ACT_ENVIRONMENT'];
  keys.forEach(k=>saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k)));
  const originalFetch=globalThis.fetch;
  try {
    globalThis.fetch=async()=>{throw new Error('Purchase Results must not start an analysis or payment request');};
    for(const width of [320,390,1440]) for(const paid of [false,true]) {
      const dom=new JSDOM('<html><body><div id="app"></div></body></html>',{url:'https://strangerlens.example',pretendToBeVisual:true});
      for(const k of keys){let value:any=k==='window'||k==='self'?dom.window:k==='IS_REACT_ACT_ENVIRONMENT'?true:(dom.window as any)[k];if(['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(k))value=value.bind(dom.window);Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});}
      Object.defineProperty(dom.window,'innerWidth',{value:width});
      const root=createRoot(dom.window.document.getElementById('app')!);
      await act(async()=>{root.render(<ResultsScreen analysisData={mapBackendToFrontend(paid?analysis:free,'https://example.com',s)} isUnlocked={paid} onBackToLanding={()=>{}}/>)});
      const doc=dom.window.document;
      const buttons=doc.querySelectorAll<HTMLButtonElement>('button[aria-label="About Purchase Readiness"]');
      check(buttons.length===(paid?2:1), `${width}px ${paid?'paid':'free'}: sixth info trigger exists in scored or locked card`);
      const trigger=buttons[paid && width>=640?1:0];
      trigger.getBoundingClientRect=()=>({left:150,right:178,top:150,bottom:178,width:28,height:28,x:150,y:150,toJSON(){}});
      await act(async()=>trigger.click());
      check(doc.querySelector('[role="tooltip"]')?.textContent?.includes('does not affect your Overall Clarity Score'), `${width}px: new tooltip opens with separate-score explanation`);
      await act(async()=>doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
      check(!doc.querySelector('[role="tooltip"]'), `${width}px: tooltip keyboard dismissal works`);
      if(paid){
        const tab=[...doc.querySelectorAll<HTMLButtonElement>('#complete-paid-report [role="tab"]')].find(x=>x.textContent?.includes('Purchase Readiness'))!;
        await act(async()=>tab.click());
        check(doc.body.textContent?.includes('PREMIUM_PURCHASE_SENTINEL') && doc.body.textContent?.includes('Observed Website Evidence'), `${width}px: authorized purchase tab displays original paid findings and evidence`);
      }else{
        const locked=doc.querySelector('[data-testid="purchase-readiness-locked"]')!;
        check(!!locked && locked.textContent?.includes('This website offers paid products'), `${width}px: free card explains commercial applicability`);
        check(!locked.textContent?.includes('/100') && !locked.textContent?.includes(full.summary) && !doc.body.textContent?.includes('PREMIUM_PURCHASE_SENTINEL'), `${width}px: free card hides score, status, findings and recommendations`);
        check(locked.querySelector('button:not([aria-label])')?.textContent==='Unlock Full Analysis — $5', `${width}px: locked card uses the existing $5 CTA`);
        // Even a stale full assessment in browser storage must remain locked in free Results.
        await act(async()=>root.render(<ResultsScreen analysisData={mapped} isUnlocked={false} onBackToLanding={()=>{}}/>));
        check(!!doc.querySelector('[data-testid="purchase-readiness-locked"]') && !doc.body.textContent?.includes(full.summary), `${width}px: old cached assessments cannot reveal the sixth score in free Results`);
        // A forged UI flag cannot manufacture missing server-redacted scores/findings.
        await act(async()=>root.render(<ResultsScreen analysisData={freeMapped} isUnlocked={true} onBackToLanding={()=>{}}/>));
        check(!!doc.querySelector('[data-testid="purchase-readiness-locked"]') && !doc.body.textContent?.includes('PREMIUM_PURCHASE_SENTINEL'), `${width}px: forged unlocked flag alone never creates a paid assessment`);
      }
      await act(async()=>root.render(<ResultsScreen analysisData={mapBackendToFrontend(legacy,'https://example.com',s)} isUnlocked={paid} onBackToLanding={()=>{}}/>));
      check(!doc.querySelector('button[aria-label="About Purchase Readiness"]') && ![...doc.querySelectorAll('h3')].some(x=>x.textContent==='Purchase Readiness'), `${width}px: switching to an old report removes the sixth signal and its findings`);
      if(paid)check([...doc.querySelectorAll<HTMLButtonElement>('#complete-paid-report [role="tab"]')].some(x=>x.textContent?.includes('First Impression') && x.getAttribute('aria-selected')==='true'), `${width}px: a removed optional signal falls back to the first diagnostic tab`);
      if(paid){
        for(const [name,html,applies,title] of cases){
          const sample=snapshot(html,title);
          const category=validateAndScoreAnalysis(generateDeterministicFallbackAnalysis(sample),sample);
          await act(async()=>root.render(<ResultsScreen analysisData={mapBackendToFrontend(category,'https://example.com',sample)} isUnlocked={true} onBackToLanding={()=>{}}/>));
          check(doc.querySelectorAll('button[aria-label="About Purchase Readiness"]').length===(applies?2:0), `${width}px: ${name} conditional paid-score visibility`);
          check(!doc.querySelector('[data-testid="purchase-readiness-locked"]'), `${width}px: ${name} paid report has no locked placeholder`);
        }
      }
      if(!paid){
        for(const [name,html,applies,title] of cases){
          const sample=snapshot(html,title);
          const category=validateAndScoreAnalysis(generateDeterministicFallbackAnalysis(sample),sample);
          const publicReport=redactAnalysisForFreeTier(category);
          await act(async()=>root.render(<ResultsScreen analysisData={mapBackendToFrontend(publicReport,'https://example.com',sample)} checkoutEnabled={true} onBackToLanding={()=>{}}/>));
          check(!!doc.querySelector('[data-testid="purchase-readiness-locked"]')===applies, `${width}px: ${name} conditional free-card visibility`);
          check(!publicReport.purchase_readiness, `${name}: no paid assessment sent before verification`);
        }
        let checkoutCalls=0;
        let refreshes=0;
        globalThis.fetch=async(input,init)=>{
          check(input==='/api/payments/checkout' && init?.method==='POST', 'new CTA reuses existing checkout endpoint only');
          check(new Headers(init?.headers).get('Authorization')==='Bearer fixture-token' && JSON.parse(String(init?.body)).reportId==='fixture-report', 'new CTA passes original report ownership proof');
          checkoutCalls++;
          return new Response(JSON.stringify({error:'Checkout fixture unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});
        };
        const checkoutData={...freeMapped,reportId:'fixture-report',reportToken:'fixture-token'};
        await act(async()=>root.render(<ResultsScreen analysisData={checkoutData} checkoutEnabled={true} onRefreshPaidReport={()=>{refreshes++;}} onBackToLanding={()=>{}}/>));
        await act(async()=>doc.querySelector<HTMLButtonElement>('[data-testid="purchase-readiness-locked"] button:not([aria-label])')!.click());
        check(checkoutCalls===1 && !!doc.querySelector('[data-testid="purchase-readiness-locked"]') && doc.body.textContent?.includes('Checkout fixture unavailable'), `${width}px: failed checkout shows error and keeps sixth assessment locked`);
        globalThis.fetch=async()=>new Response(JSON.stringify({alreadyPaid:true}),{status:200,headers:{'Content-Type':'application/json'}});
        await act(async()=>doc.querySelector<HTMLButtonElement>('[data-testid="purchase-readiness-locked"] button:not([aria-label])')!.click());
        check(refreshes===1 && !!doc.querySelector('[data-testid="purchase-readiness-locked"]'), `${width}px: already-paid checkout refreshes authorized data instead of inventing a score`);
        await act(async()=>root.render(<ResultsScreen analysisData={mapped} isUnlocked={true} onBackToLanding={()=>{}}/>));
        check(!doc.querySelector('[data-testid="purchase-readiness-locked"]') && doc.body.textContent?.includes(full.summary), `${width}px: verified full data replaces locked card`);
        globalThis.fetch=async()=>{throw new Error('Unexpected analysis/payment request');};
      }
      await act(async()=>root.unmount());dom.window.close();
    }
  }finally{globalThis.fetch=originalFetch;for(const k of keys){const desc=saved.get(k);if(desc)Object.defineProperty(globalThis,k,desc);else delete (globalThis as any)[k];}}
  console.log(`PASS: ${assertions} Purchase Readiness detection, independent scoring, access, legacy, PDF projection and responsive DOM assertions.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});

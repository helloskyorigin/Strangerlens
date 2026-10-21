import assert from "node:assert/strict";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import ChromaticAtmosphere from "../components/landing/ChromaticAtmosphere";
import BrandMark from "../components/BrandMark";
import ScanScreen, { SCAN_STAGES, SCAN_FOCUS_MESSAGES } from "../components/ScanScreen";
import CompleteReportPreview from "../components/CompleteReportPreview";
import PrivacyPolicyPage from "../app/privacy/page";
import RefundPolicyPage from "../app/refund-policy/page";
import ContactSupportPage from "../app/contact/page";

const hero = renderToStaticMarkup(<ChromaticAtmosphere variant="hero"/>);
const threads = renderToStaticMarkup(<ChromaticAtmosphere variant="threads"/>);
assert.ok(hero.includes('sl-aurora--violet') && hero.includes('sl-aurora--cyan'));
assert.ok(!hero.includes("sl-signal-dot") && !threads.includes("sl-signal-dot"), "No tiny ambient dots on any surface.");
assert.equal((threads.match(/class="sl-focus-thread"/g)||[]).length,10);
const brand=renderToStaticMarkup(<BrandMark className="h-8 w-8"/>);
assert.ok(brand.includes("viewBox") && brand.includes("#A9F2FF"), "Scalable colorful branded clarity mark.");
const scan=renderToStaticMarkup(<ScanScreen rawUrl="https://example.com" isVerifying onBackToLanding={()=>{}}/>);
assert.ok(scan.includes("BrandMark") || scan.includes('sl-brand-mark'), "Scan header shares the new logo.");
assert.ok(!scan.includes("Five clarity signals evaluated") && !scan.includes('aria-label="Five analysis dimensions"'));
assert.ok(SCAN_STAGES.length === 4 && SCAN_FOCUS_MESSAGES.length === 4);
assert.ok(SCAN_FOCUS_MESSAGES.some(x=>x.includes("policies")));
const app=readFileSync("app/page.tsx","utf8");
assert.ok(app.includes('<AnimatePresence mode="popLayout" initial={false}>'), "Cross-screen transitions cannot wait on an empty black frame.");
assert.ok(app.includes("accessible supporting and policy pages where available"), "Public site scope is truthful.");
const css=readFileSync("app/landing-v3.css","utf8");
const theme=readFileSync("app/app-theme.css","utf8");
const globals=readFileSync("app/globals.css","utf8");
assert.ok(css.includes('animation:sl-cloud-drift 32s') && css.includes("sl-scroll-veil"), "Gradient moves and scroll gently reveals the color field.");
assert.ok(css.includes('hover:text-white') && theme.includes('hover:text-white'), "Theme-specific hover visibility overrides exist.");
assert.ok(css.includes('.sl-brand-mark svg') && globals.includes('html[data-landing-theme="dark"]'), "Mark and document backgrounds follow appearance.");
const offer=renderToStaticMarkup(<CompleteReportPreview
 signals={[{key:"trust",id:"trust",title:"Trust",score:63,scoreDisplay:"63/100",status:"Needs work",badgeType:"amber"}] as any}
 purchaseReadinessApplicable canCheckout busy={false} onUnlock={()=>{}}/>);
assert.ok(offer.includes("Free preview versus complete report") && offer.includes("YOU HAVE") && offer.includes("UNLOCK"));
assert.ok(offer.includes("Purchase assessment") && offer.includes("Unlock Full Analysis — $3"));
assert.equal((offer.match(/Unlock Full Analysis — \$3/g)||[]).length,1,"Single $3 checkout button.");
for(const page of [<PrivacyPolicyPage/>,<RefundPolicyPage/>,<ContactSupportPage/>]){
 const html=renderToStaticMarkup(page);
 assert.ok(!html.includes("$5"), "Legal/support cannot advertise stale $5.");
 assert.ok(html.includes("StrangerLens"), "All legal pages share branded navigation.");
 assert.ok(html.includes("Privacy Policy") && html.includes("Contact Support"), "Legal navigation stays available.");
}
const privacy=renderToStaticMarkup(<PrivacyPolicyPage/>);
assert.ok(privacy.includes("sessionStorage") && privacy.includes("server always rechecks payment"), "Storage/entitlement policy matches the actual product.");
console.log("PASS: moving no-dot backdrop, seamless screen transitions, mono logo, clear scan, $3 legal parity, theme and tier boundaries.");

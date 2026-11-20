import assert from "node:assert/strict";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import ChromaticAtmosphere from "../components/landing/ChromaticAtmosphere";
import BrandMark from "../components/BrandMark";
import ScanScreen from "../components/ScanScreen";
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
assert.ok(brand.includes("strangerlens-mark.webp") && brand.includes("sl-brand-mark"), "Approved lime S is shared across screens.");
const scan=renderToStaticMarkup(<ScanScreen rawUrl="https://example.com" isVerifying onBackToLanding={()=>{}}/>);
assert.ok(scan.includes("BrandMark") || scan.includes('sl-brand-mark'), "Scan header shares the new logo.");
assert.ok(!scan.includes("Five clarity signals evaluated") && !scan.includes('aria-label="Five analysis dimensions"'));
assert.ok(scan.includes("sl-scan-lens-scene") && !scan.includes("sl-scan-stages"), "Scan follows the single-focus VYLENS experience, not a step checklist.");
const app=readFileSync("app/page.tsx","utf8");
assert.ok(app.includes('<AnimatePresence mode="popLayout" initial={false}>'), "Cross-screen transitions cannot wait on an empty black frame.");
const currentLanding=readFileSync("components/landing/StrangerLensLanding.tsx","utf8");
assert.ok(currentLanding.includes("inspects accessible public website content") && app.includes("public website URL"), "Current landing describes the inspected public-website scope accurately.");
const css=readFileSync("app/landing-v3.css","utf8");
const theme=readFileSync("app/app-theme.css","utf8");
const globals=readFileSync("app/globals.css","utf8");
assert.ok(css.includes('animation:sl-cloud-drift 32s') && css.includes("sl-scroll-veil"), "Gradient moves and scroll gently reveals the color field.");
assert.ok(css.includes('hover:text-white') && theme.includes('hover:text-white'), "Theme-specific hover visibility overrides exist.");
assert.ok(readFileSync("components/scan-screen-v2.css","utf8").includes(".sl-scan-lens-stage") && globals.includes('scan-screen-v2.css'), "Approved S and scanner styling are loaded.");
const offer=renderToStaticMarkup(<CompleteReportPreview
 signals={[{key:"trust",id:"trust",title:"Trust",score:63,scoreDisplay:"63/100",status:"Needs work",badgeType:"amber"}] as any}
 purchaseReadinessApplicable canCheckout busy={false} onUnlock={()=>{}}/>);
assert.ok(offer.includes("Included in Full Analysis") && !offer.includes("YOU HAVE") && !offer.includes("sl-v7-tier-compare"));
assert.ok(offer.includes("Purchase Readiness") && offer.includes("Unlock Full Analysis — $9"));
assert.equal((offer.match(/Unlock Full Analysis — \$9/g)||[]).length,1,"Single $9 checkout button.");
for(const page of [<PrivacyPolicyPage/>,<RefundPolicyPage/>,<ContactSupportPage/>]){
 const html=renderToStaticMarkup(page);
 assert.ok(!html.includes("Full Analysis — $3"), "Legal/support must not advertise a stale $3 checkout.");
 assert.ok(html.includes("StrangerLens"), "All legal pages share branded navigation.");
 assert.ok(html.includes("Privacy Policy") && html.includes("Contact Support"), "Legal navigation stays available.");
}
const privacy=renderToStaticMarkup(<PrivacyPolicyPage/>);
assert.ok(privacy.includes("sessionStorage") && privacy.includes("server always rechecks payment"), "Storage/entitlement policy matches the actual product.");
console.log("PASS: moving no-dot backdrop, seamless screen transitions, mono logo, clear scan, $9 legal parity, theme and tier boundaries.");

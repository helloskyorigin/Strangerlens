import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractWebsiteSnapshot } from "../lib/content-extractor";
import { assessScanCoverage } from "../lib/scan-coverage";
import { validateSingleEvidence } from "../services/validation/evidenceValidator";

const pages = [
 ["Indie SaaS","Simple project tracking for solo founders","Organize tasks without enterprise complexity.","Start Free"],
 ["Developer API","A TypeScript SDK for sending transactional emails","Integrate notification delivery using typed JavaScript APIs.","Read Docs"],
 ["Shop","Handmade ceramic cups and pottery","Browse handcrafted mugs and gift-ready homewares.","Shop Collection"],
 ["Portfolio","Independent design work by a visual designer","Explore selected brand identities and product interfaces.","See Work"],
 ["Education","Math lessons for curious middle-school students","Learn algebra with guided problems and live practice.","Explore Lessons"],
 ["Nonprofit","Protecting local freshwater ecosystems","Volunteer with community river restoration initiatives.","Join Us"],
 ["Restaurant","Seasonal Mediterranean food made fresh","Reserve your table and explore tonight's menu.","Reserve a Table"],
 ["Health Clinic","Physical therapy for runners and cyclists","Evidence-informed recovery sessions and injury prevention.","Book Appointment"],
 ["Astrology","Explore traditional birth-chart symbolism","Read a personalized reflection for entertainment.","Get Reading"],
 ["Banking","Simple expense tracking for households","Categorize your expenses and plan monthly spending.","View Features"],
 ["Cybersecurity","Phishing link detection for online shoppers","Review suspicious URLs before you click.","Check Link"],
 ["Community","A forum for independent software builders","Share your launch lessons with other founders.","Join Community"],
 ["Travel","City guides for independent travelers","Explore itineraries and practical local recommendations.","See Destinations"],
 ["Newsletter","A weekly digest of useful product research","Get curated articles about digital product development.","Subscribe"],
 ["Marketplace","Discover independent creators and makers","Browse original products from small studios.","Browse"],
 ["Job Board","Remote product design and engineering jobs","Find open roles published by verified employers.","View Jobs"],
 ["Analytics","Understand your newsletter engagement","See which topics your subscribers engage with.","See Dashboard"],
 ["Events","Upcoming design conferences and workshops","Find meetups, conferences and community sessions.","Browse Events"],
 ["Real Estate","Find apartment rentals in your city","Browse available homes by location and budget.","View Listings"],
 ["Documentation","Getting started with database migrations","Learn migration commands and common upgrade paths.","Read Guide"],
] as const;
assert.equal(pages.length,20);
let verified=0;
for (const [name,heading,subheading,cta] of pages) {
  const html=`<!doctype html><html><head><title>${name}</title>
    <meta name="description" content="${subheading}"></head><body>
    <header><nav><a href="/pricing">Pricing</a></nav></header>
    <main><section class="hero"><h1>${heading}</h1><p>${subheading}</p>
    <a class="btn-primary" href="/start">${cta}</a></section>
    <section><h2>How it works</h2><p>${subheading} Learn about the process and make an informed decision.</p></section>
    </main></body></html>`;
  const snapshot=extractWebsiteSnapshot(html,{baseUrl:"https://example.org"});
  assert.equal(snapshot.hero.headline,heading,`${name}: headline should come from HTML`);
  assert.notEqual(assessScanCoverage(snapshot).level,"unreadable",`${name}: real static page must not be classified as empty`);
  const good=validateSingleEvidence({source:"hero",element:"h1",text:heading},snapshot);
  assert.equal(good.status,"verified",`${name}: exact observed headline is evidence`);
  assert.equal(good.matchType,"exact");
  const fabricated=validateSingleEvidence({source:"hero",element:"h1",text:"Guaranteed 500% conversion improvement"},snapshot);
  assert.equal(fabricated.status,"rejected",`${name}: invented lift cannot pass`);
  verified++;
}
const jsShell=extractWebsiteSnapshot('<html><head><title>App</title></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
assert.equal(assessScanCoverage(jsShell).level,"unreadable","JS-only shell requires browser rendering and cannot be scored as a full page");
const fetched=readFileSync("lib/website-fetcher.ts","utf8");
assert.ok(!fetched.includes("generateFallbackHtml"),"Never fabricate fallback HTML after denied fetches.");
assert.ok(fetched.includes('error: "HTTP_ERROR"')&&fetched.includes('error: timedOut ? "WEBSITE_FETCH_TIMEOUT" : "FETCH_FAILED"'),"Blocked and timed-out sites return real errors.");
const checkout=readFileSync("app/api/payments/checkout/route.ts","utf8");
assert.ok(checkout.includes('storedReport.analysisMode === "heuristic"'),"Heuristic fallback can never be sold as full AI analysis.");
console.log(`PASS: ${verified} varied synthetic homepage evidence checks, JS-only shell detection, fail-closed network errors and heuristic premium boundary.`);

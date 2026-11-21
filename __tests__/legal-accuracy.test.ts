import { describe, test, expect } from "./test-harness";
import { extractWebsiteSnapshot } from "../lib/content-extractor";
import { discoverSupportingPages } from "../lib/supporting-page-discovery";
import { fetchSupportingPages } from "../lib/supporting-page-fetcher";
import { generateDeterministicFallbackAnalysis } from "../services/ai/fallbackAnalyzer";
import { correctContradictedLegalClaims, reconcileFalseLegalOnlyTrustPenalty } from "../services/validation/legalClaimGuard";
import { calculateOverallScore } from "../services/scoring/calculateOverallScore";

const base = "https://taskpocket.io/";
const homepage = `<html><head><title>TaskPocket - simple task manager</title></head>
<body><main><h1>Do the work. Not the list.</h1><p>An easy task manager for iPhone and web.</p>
<a href="/signup">Start free</a></main><footer>
<a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Service</a>
<a href="/legal/cookie-policy">Cookie Policy</a></footer></body></html>`;

describe("Trust legal policy accuracy regressions", () => {
  test("Core legal pages are discoverable even when a footer contains other excluded links", () => {
    const policies = discoverSupportingPages(homepage, base, { onlyLegalPolicies: true, maxPages: 3 });
    expect(policies.length).toBe(2);
    expect(policies.map(p => p.pageType).sort()).toEqual(["privacy_policy", "terms_of_service"]);
    expect(policies.every(p => p.sourceLocation === "footer")).toBe(true);
  });

  test("First-party legal pages are safely fetched; an inaccessible policy is never treated as verified", async () => {
    const policies = discoverSupportingPages(homepage, base, { onlyLegalPolicies: true, maxPages: 3 });
    const bundle = await fetchSupportingPages(policies, base, {
      fetcher: async (rawUrl: string) => rawUrl.includes("/privacy")
        ? {
            success: true as const, originalUrl: rawUrl, normalizedUrl: rawUrl,
            finalUrl: rawUrl, domain: "taskpocket.io", html: "<html><body><h1>Privacy Policy</h1></body></html>",
            status: 200, timingMs: 1, contentLength: 56, redirectCount: 0,
          } as any
        : {
            success: false as const, originalUrl: rawUrl, normalizedUrl: rawUrl,
            finalUrl: rawUrl, domain: "taskpocket.io", error: "FETCH_FAILED",
            message: "Request failed", status: 503, timingMs: 1,
          } as any,
    });
    expect(bundle.candidates.length).toBe(2);
    expect(bundle.pages.length).toBe(1);
    expect(bundle.pages[0].pageType).toBe("privacy_policy");
    expect(bundle.attempts.some(a => a.pageType === "terms_of_service" && !a.success)).toBe(true);
  });

  test("Reported absence of Privacy Policy and Terms is corrected without changing raw signal scores", () => {
    const snapshot = extractWebsiteSnapshot(homepage, { baseUrl: base });
    const analysis = generateDeterministicFallbackAnalysis(snapshot);
    const initialTrustScore = analysis.signals.trust.score;
    analysis.signals.trust.explanation = "Website lacks a Privacy Policy and Terms of Service.";
    analysis.risks = [{
      category: "trust", severity: "medium", title: "Lack of accessible legal documentation",
      description: "The website does not provide links to a Privacy Policy or Terms of Service.",
      why_it_matters: "Missing legal pages erode trust.", evidence_refs: [],
    }];
    analysis.priority_fix = {
      title: "Add Legal Transparency Links",
      reason: "The Privacy Policy and Terms of Service are missing.",
      clearer_direction: "Add a footer containing links to a Privacy Policy and Terms of Service.",
      evidence_refs: [],
    };
    const candidates = discoverSupportingPages(homepage, base, { onlyLegalPolicies: true, maxPages: 3 });
    const bundle = { candidates, pages: [], discoveredCount: 2, attemptedCount: 0,
      fetchedCount: 0, totalTimingMs: 0, attempts: [] };
    const corrected = correctContradictedLegalClaims(analysis, bundle);
    expect(corrected.signals.trust.score).toBe(initialTrustScore);
    expect(corrected.risks?.[0].description.includes("Links to Privacy Policy, Terms of Service")).toBe(true);
    expect(corrected.risks?.[0].title).toBe("Trust and credibility cues could be more prominent");
    expect(corrected.priority_fix.title).toBe("Surface existing trust information at decision points");
    expect(corrected.priority_fix.clearer_direction?.includes("existing policy links")).toBe(true);
    // Existing policy links refute absence claims; scores themselves must remain unchanged.
    expect(corrected.signals.trust.explanation.includes("lacks a Privacy Policy")).toBe(false);
  });

  test("Overall 79/100 remains needs_improvement until the authoritative 80-point threshold", () => {
    const result = calculateOverallScore({
      first_impression: 79, audience: 79, value: 79, trust: 79, action: 79,
    });
    expect(result.overallScore).toBe(79);
    expect(result.overallStatus).toBe("needs_improvement");
  });
  test("Finds each distinct legal policy despite many higher-ranked duplicate Privacy links", () => {
    const html = '<html><body><header>' +
      Array.from({ length: 5 }, (_, i) => '<a href="/privacy?ref=' + i + '">Privacy Policy</a>').join("") +
      '</header><footer><a href="/terms">Terms</a><a href="/refund-policy">Refund Policy</a></footer></body></html>';
    const found = discoverSupportingPages(html, base, { onlyLegalPolicies: true, maxPages: 3 });
    expect(found.map(p => p.pageType).sort()).toEqual(["privacy_policy", "refund_policy", "terms_of_service"]);
  });

  test("Reads accessible icon links and both ends of long HTML for legal policies", () => {
    const html = '<header><a href="/terms"><span> </span></a></header>' +
      '<main>' + "long filler ".repeat(26000) + '</main>' +
      '<footer><a href="/privacy" aria-label="Privacy Policy"><svg></svg></a><a href="/refund-policy">Refund Policy</a></footer>';
    const found = discoverSupportingPages(html, base, { onlyLegalPolicies: true, maxPages: 3 });
    expect(found.map(p => p.pageType).sort()).toEqual(["privacy_policy", "refund_policy", "terms_of_service"]);
  });

  test("Preserves policy links under generic /legal URLs after redirect verification", async () => {
    const html = '<footer><a href="/legal">Privacy Policy</a></footer>';
    const found = discoverSupportingPages(html, base, { onlyLegalPolicies: true, maxPages: 3 });
    expect(found.length).toBe(1);
    const bundle = await fetchSupportingPages(found, base, {
      fetcher: async (url: string) => ({
        success: true as const, originalUrl: url, normalizedUrl: url,
        finalUrl: url, domain: "taskpocket.io",
        html: '<html><head><title>Privacy Policy</title></head><body><h1>Privacy Policy</h1><p>We store minimal information to operate this service.</p></body></html>',
        status: 200, timingMs: 1, contentLength: 144, redirectCount: 0,
      } as any),
    });
    expect(bundle.pages.length).toBe(1);
  });

  test("Neutralizes only a disproven legal-only Trust penalty; never boosts on links alone", () => {
    const snapshot = extractWebsiteSnapshot(homepage, { baseUrl: base });
    const initial = generateDeterministicFallbackAnalysis(snapshot);
    initial.signals.trust.score = 30;
    initial.signals.trust.status = "unclear";
    initial.signals.trust.explanation = "Website is missing a Privacy Policy and Terms of Service.";
    const found = discoverSupportingPages(homepage, base, { onlyLegalPolicies: true, maxPages: 3 });
    const empty = { candidates: found, pages: [], attempts: [], discoveredCount: 2,
      attemptedCount: 0, fetchedCount: 0, totalTimingMs: 0 };
    expect(reconcileFalseLegalOnlyTrustPenalty(initial, empty).signals.trust.score).toBe(30);
    const inspected = { ...empty, pages: found.map(p => ({
      pageType: p.pageType, url: p.url, finalUrl: p.url
    })) } as any;
    expect(reconcileFalseLegalOnlyTrustPenalty(initial, inspected).signals.trust.score).toBe(70);
    const mixed = structuredClone(initial);
    mixed.signals.trust.explanation += " There are also no customer testimonials.";
    expect(reconcileFalseLegalOnlyTrustPenalty(mixed, inspected).signals.trust.score).toBe(30);
  });

  test("Rejects soft-404 and SPA fallback HTML despite an HTTP 200 response", async () => {
    const found = discoverSupportingPages(homepage, base, { onlyLegalPolicies: true, maxPages: 3 });
    const bundle = await fetchSupportingPages(found, base, {
      fetcher: async (url: string) => ({
        success: true as const, originalUrl: url, normalizedUrl: url, finalUrl: url,
        domain: "taskpocket.io", status: 200, timingMs: 1, contentLength: 160,
        redirectCount: 0,
        html: "<html><head><title>TaskPocket Home</title></head><body><h1>Page not found</h1><p>Return home</p></body></html>",
      } as any),
    });
    expect(bundle.pages.length).toBe(0);
    expect(bundle.attempts.every(attempt => !attempt.success)).toBe(true);
    expect(bundle.candidates.length).toBe(2);
  });
});

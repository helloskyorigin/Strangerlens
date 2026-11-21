import { NextRequest, NextResponse } from "next/server";
import { validateUrl, checkSsrf } from "@/lib/url-validator";
import { fetchWebsiteHomepage } from "@/lib/website-fetcher";
import { extractWebsiteSnapshot } from "@/lib/content-extractor";
import { assessScanCoverage } from "@/lib/scan-coverage";
import { discoverAndFetchLegalPages, discoverAndFetchSupportingPages } from "@/lib/supporting-page-fetcher";
import { analyzeWebsite } from "@/services/ai/analyzeWebsite";
import { validateAndScoreAnalysis } from "@/services/validation/analysisValidator";
import { generateSupportingPageContext } from "@/services/ai/supportingContextAnalyzer";
import { getCachedFetch, setCachedFetch } from "@/lib/fetch-cache";
import {
  getClientIp,
  checkAndAcquireRateLimit,
  releaseConcurrencySlot,
} from "@/server/security/rateLimiter";
import { SERVER_LIMITS } from "@/server/config/limits";
import {
  saveServerReport,
  redactAnalysisForFreeTier,
  computeLockedPreviewCounts,
  isPaymentInfrastructureConfigured,
  PAYMENT_INFRASTRUCTURE_BLOCKER,
} from "@/server/security/reportAccess";

export const dynamic = "force-dynamic";

/**
 * GET /api/check
 * Health check & diagnostic endpoint for URL checker API
 */
export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "StrangerLens Full Backend Pipeline (Validation, Fetching, Extraction, AI & Scoring)",
    phase: "Phase 1, Phase 2, Phase 3, Phase 4 & Multi-Page Phase 2 - Backend",
    supportingPagesEnabled: true,
    endpoints: {
      "POST /api/check": "Validates URL, checks SSRF safety, normalizes URL, fetches primary homepage, extracts WebsiteSnapshot, runs AI Analysis and Evidence Validation & Deterministic Scoring on the homepage, and optionally generates supporting-page context when enabled.",
    },
  });
}

/**
 * POST /api/check
 * Primary Backend Route (Phase 1 + Phase 2 + Phase 3 + Phase 4):
 * Accepts JSON payload `{ "url": "example.com" }`
 * Validates, normalizes, checks SSRF security rules, fetches website homepage, performs content extraction, runs AI analysis, and executes deterministic scoring & evidence validation.
 */
type BackendScanMilestone = "content_inspected" | "signals_evaluated";
type ProgressEmitter = (stage: BackendScanMilestone) => void;
async function runCheck(req: NextRequest, onProgress?: ProgressEmitter) {
  // 0. Rate Limiting & Concurrency Protection (Enforced before expensive processing)
  const clientIp = getClientIp(req);
  const limitCheck = checkAndAcquireRateLimit(clientIp, {
    scope: "check",
    maxPerMinute: SERVER_LIMITS.CHECK_RATE_LIMIT_PER_MINUTE,
    maxConcurrent: SERVER_LIMITS.CHECK_MAX_CONCURRENT_PER_IP,
  });

  if (!limitCheck.allowed) {
    const headers: Record<string, string> = {};
    if (limitCheck.retryAfterSeconds) {
      headers["Retry-After"] = String(limitCheck.retryAfterSeconds);
    }
    return NextResponse.json(
      {
        success: false,
        error: limitCheck.error || "RATE_LIMITED",
        message: limitCheck.message || "Too many checks are currently running. Please try again shortly.",
      },
      { status: 429, headers }
    );
  }

  try {
    let body: { url?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_URL",
          message: "Invalid or missing JSON payload in request body",
          originalUrl: "",
        },
        { status: 400 }
      );
    }

    const rawUrl = typeof body.url === "string" ? body.url : "";

    // 1. URL Validation & Structure Check
    const validation = validateUrl(rawUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "INVALID_URL",
          message: validation.message || "Please enter a valid website URL",
          originalUrl: rawUrl,
        },
        { status: 400 }
      );
    }

    // 2. SSRF Security Policy Check & Host Reachability
    const ssrfCheck = await checkSsrf(validation.normalizedUrl);
    if (!ssrfCheck.isSafe) {
      const isDnsError = ssrfCheck.isDnsFailure;
      return NextResponse.json(
        {
          success: false,
          error: isDnsError ? "FETCH_FAILED" : "SSRF_BLOCKED",
          message: ssrfCheck.reason || "Access to internal or private addresses is prohibited",
          originalUrl: rawUrl,
          normalizedUrl: validation.normalizedUrl,
        },
        { status: isDnsError ? 502 : 422 }
      );
    }

    // 3. Fetch Website Homepage (Use pre-scan cache if available)
    const pipelineController = new AbortController();
    const abortOnDisconnect = () => pipelineController.abort();
    if (req.signal.aborted) pipelineController.abort();
    else req.signal.addEventListener("abort", abortOnDisconnect, { once: true });
    const pipelineTimer = setTimeout(
      () => pipelineController.abort(),
      SERVER_LIMITS.ANALYSIS_TOTAL_TIMEOUT_MS
    );

    const overallStart = performance.now();

    try {
      const fetchStart = performance.now();
      let fetchResult =
        getCachedFetch(validation.normalizedUrl) ||
        (rawUrl ? getCachedFetch(rawUrl) : null);
      const cacheHit = Boolean(fetchResult);

      if (!fetchResult) {
        fetchResult = await fetchWebsiteHomepage(
          rawUrl,
          validation.normalizedUrl,
          {
            timeoutMs: SERVER_LIMITS.WEBSITE_FETCH_TIMEOUT_MS,
            maxRedirects: SERVER_LIMITS.WEBSITE_MAX_REDIRECTS,
            maxSizeBytes: SERVER_LIMITS.WEBSITE_MAX_RESPONSE_BYTES,
            signal: pipelineController.signal,
          }
        );

        if (fetchResult.success) {
          setCachedFetch(validation.normalizedUrl, fetchResult);
          if (fetchResult.finalUrl && fetchResult.finalUrl !== validation.normalizedUrl) {
            setCachedFetch(fetchResult.finalUrl, fetchResult);
          }
        }
      }

      const fetchDurationMs = Math.round(performance.now() - fetchStart);

      if (!fetchResult.success) {
        let httpStatus = 502;
        if (fetchResult.error === "INVALID_URL") httpStatus = 400;
        if (fetchResult.error === "SSRF_BLOCKED") httpStatus = 422;
        if (fetchResult.error === "FETCH_TIMEOUT" || fetchResult.error === "WEBSITE_FETCH_TIMEOUT") httpStatus = 504;
        if (fetchResult.error === "WEBSITE_RESPONSE_TOO_LARGE") httpStatus = 413;

        return NextResponse.json(fetchResult, { status: httpStatus });
      }

      // 4. Phase 2: Deterministic Content Extraction (Primary Homepage)
      const snapStart = performance.now();
      const snapshot = extractWebsiteSnapshot(fetchResult.html, {
        baseUrl: fetchResult.finalUrl,
      });
      const coverage = assessScanCoverage(snapshot);
      if (coverage.level === "unreadable") {
        return NextResponse.json(
          { success: false, error: "INSUFFICIENT_PAGE_CONTENT", message: coverage.note, scanCoverage: coverage },
          { status: 422, headers: { "Cache-Control": "private, no-store" } }
        );
      }
      const snapDurationMs = Math.round(performance.now() - snapStart);
      // This milestone is truthful: extraction and coverage validation have finished.
      onProgress?.("content_inspected");

      // 5. Inspect linked site pages AND legal pages before either scoring or AI.
      // Linked product/pricing/about pages are core evidence, not optional work
      // that can be silently discarded after a 10-second timer.
      const aiStart = performance.now();
      const maxLinkedPages = Math.min(12, Math.max(8, SERVER_LIMITS.SUPPORTING_PAGES_MAX_COUNT));
      const [legalPages, linkedPages] = await Promise.all([
        discoverAndFetchLegalPages(fetchResult.html, fetchResult.finalUrl, {
          signal: pipelineController.signal,
        }),
        discoverAndFetchSupportingPages(fetchResult.html, fetchResult.finalUrl, {
          signal: pipelineController.signal,
          maxPages: maxLinkedPages,
          concurrency: 8,
        }),
      ]);

      const legalUrls = new Set(legalPages.pages.map(page => page.finalUrl));
      const analysisPages = {
        ...legalPages,
        discoveredCount: legalPages.discoveredCount + linkedPages.discoveredCount,
        attemptedCount: legalPages.attemptedCount + linkedPages.attemptedCount,
        fetchedCount: legalPages.pages.length + linkedPages.pages.filter(page => !legalUrls.has(page.finalUrl)).length,
        totalTimingMs: Math.max(legalPages.totalTimingMs, linkedPages.totalTimingMs),
        candidates: [...legalPages.candidates, ...linkedPages.candidates.filter(
          p => !legalPages.candidates.some(legal => legal.url === p.url)
        )],
        pages: [...legalPages.pages, ...linkedPages.pages.filter(page => !legalUrls.has(page.finalUrl))],
        attempts: [...legalPages.attempts, ...linkedPages.attempts.filter(
          attempt => !legalPages.attempts.some(legal => legal.url === attempt.url)
        )],
      };
      const inspectedLinkedUrls = analysisPages.pages.map(page => page.finalUrl);
      const uninspectedLinkedUrls = analysisPages.attempts
        .filter(attempt => !attempt.success)
        .map(attempt => attempt.url);
      console.log(
        `[PERF] page inspection domain="${fetchResult.domain}" linked=${linkedPages.pages.length} legal=${legalPages.pages.length} inspected=${inspectedLinkedUrls.length} attempted=${analysisPages.attemptedCount}`
      );

      // Pass every fetched linked page to the main high-quality AI, with source
      // URLs. Separately synthesize supporting-page consistency from the SAME
      // fetched bundle; never fetch those pages twice or race them against a
      // timer that drops evidence.
      const provenance: { mode: "ai" | "heuristic" } = { mode: "heuristic" };
      const [rawAiAnalysis, optionalSupportingResult] = await Promise.all([
        analyzeWebsite(snapshot, analysisPages, {
          onSource: source => { provenance.mode = source === "deterministic" ? "heuristic" : "ai"; },
        }),
        linkedPages.pages.length > 0
          ? generateSupportingPageContext(
              snapshot, fetchResult.finalUrl, fetchResult.html,
              { enabled: true, supportingPagesBundle: linkedPages, signal: pipelineController.signal }
            )
          : Promise.resolve({}),
      ]);
      const aiDurationMs = Math.round(performance.now() - aiStart);
      const analysisMode: "ai" | "heuristic" = provenance.mode;

      // 6. Deterministic evidence validation & scoring
      const scoreStart = performance.now();
      const finalValidatedAnalysis = validateAndScoreAnalysis(
        rawAiAnalysis, snapshot, analysisPages
      );
      const scoreDurationMs = Math.round(performance.now() - scoreStart);
      // Never expose scores or findings here; only the completed milestone.
      onProgress?.("signals_evaluated");

      const totalDurationMs = Math.round(performance.now() - overallStart);

      // Server-side performance log (strictly safe: no secrets, no PII, no credentials)
      console.log(
        `[PERF] /api/check domain="${fetchResult.domain}" total=${totalDurationMs}ms (cacheHit=${cacheHit}, fetch=${fetchDurationMs}ms, snap=${snapDurationMs}ms, ai=${aiDurationMs}ms, score=${scoreDurationMs}ms)`
      );

      const serverTimingHeader = [
        `fetch;dur=${fetchDurationMs};desc="${cacheHit ? "Cache Hit" : "Network Fetch"}"`,
        `snap;dur=${snapDurationMs};desc="Content Extraction"`,
        `ai;dur=${aiDurationMs};desc="AI Analysis"`,
        `score;dur=${scoreDurationMs};desc="Deterministic Scoring"`,
        `total;dur=${totalDurationMs};desc="Total Server Processing"`,
      ].join(", ");

      // Omit raw HTML string from public API payload to prevent massive payloads,
      // memory pressure, and sensitive DOM leakage over the wire
      const { html: _omittedHtml, ...safeFetchMetadata } = fetchResult;

      const storedReport = await saveServerReport({
        normalizedUrl: fetchResult.finalUrl,
        domain: fetchResult.domain,
        snapshot,
        fullAnalysis: finalValidatedAnalysis,
        analysisMode,
        supportingContext: optionalSupportingResult.supportingContext,
      });

      const lockedPreviewCounts = computeLockedPreviewCounts(finalValidatedAnalysis);
      return NextResponse.json(
        {
          ...safeFetchMetadata,
          reportId: storedReport.reportId,
          reportToken: storedReport.reportToken,
          entitlement: {
            unlocked: false,
            tier: "free",
            checkoutEnabled: analysisMode === "ai" && isPaymentInfrastructureConfigured(),
            blocker: analysisMode === "heuristic"
              ? "Only a heuristic preview was available. AI Full Analysis is not ready for purchase; please retry later."
              : isPaymentInfrastructureConfigured() ? null : PAYMENT_INFRASTRUCTURE_BLOCKER,
          },
          lockedPreviewCounts,
          scanCoverage: coverage,
          pageInspection: {
            discovered: analysisPages.discoveredCount,
            attempted: analysisPages.attemptedCount,
            inspected: inspectedLinkedUrls.length,
            inspectedUrls: inspectedLinkedUrls,
            failedUrls: uninspectedLinkedUrls,
            limitedToHomepageLinks: true,
            maxLinkedPages,
          },
          analysisMode,
          snapshot,
          analysis: redactAnalysisForFreeTier(finalValidatedAnalysis),
        },
        {
          status: 200,
          headers: {
            "Server-Timing": serverTimingHeader,
            "Cache-Control": "private, no-store",
          },
        }
      );

    } finally {
      clearTimeout(pipelineTimer);
      req.signal.removeEventListener("abort", abortOnDisconnect);
    }
  } catch (error: unknown) {
    console.error("Error in /api/check endpoint:", error instanceof Error ? error.message : "Unknown error");

    const err = error as any;
    const isAiConfigError =
      err?.code === "AI_PROVIDER_NOT_CONFIGURED" ||
      err?.code === "AI_PROVIDER_AUTH_ERROR" ||
      (typeof err?.message === "string" &&
        (err.message.includes("Analysis is temporarily unavailable") ||
         err.message.includes("high demand") ||
         err.message.includes("503") ||
         err.message.includes("429") ||
         err.message.includes("RESOURCE_EXHAUSTED") ||
         err.message.includes("Quota exceeded") ||
         err.message.includes("rate-limits")));

    if (isAiConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: "AI_QUOTA_EXCEEDED",
          message: "AI model API quota or rate limit has been exceeded. Please try again later or check API configuration.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "An unexpected server error occurred while processing the website check. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    releaseConcurrencySlot(clientIp, "check");
  }
}

/**
 * Optional streaming response for first-party scanning UX.
 * Original JSON response remains the default for existing clients and tests.
 * NDJSON events reveal only stage identifiers; paid report content still uses
 * existing free-tier redaction and server-side entitlement checks.
 */
export async function POST(req: NextRequest): Promise<Response> {
  if (req.headers.get("x-strangerlens-progress") !== "ndjson") {
    return runCheck(req);
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (value: unknown) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(value) + "\n")); }
        catch { closed = true; }
      };
      const run = async () => {
        try {
          const response = await runCheck(req, stage => send({ type: "progress", stage }));
          // Rate limiting and errors retain their logical HTTP status here.
          // This streaming envelope itself is HTTP 200 by design.
          const payload = await response.json();
          send({ type: "result", status: response.status, payload });
        } catch {
          send({ type: "result", status: 500, payload: {
            success: false, error: "SERVER_ERROR",
            message: "Could not complete the website analysis. Please retry."
          } });
        } finally {
          if (!closed) { closed = true; try { controller.close(); } catch { /* detached request */ } }
        }
      };
      void run();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

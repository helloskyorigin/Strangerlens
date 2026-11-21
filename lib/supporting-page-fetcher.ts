import { SERVER_LIMITS } from "@/server/config/limits";
import {
  fetchWebsiteHomepage,
  type FetchOptions,
  type FetchResult,
} from "./website-fetcher";
import {
  extractWebsiteSnapshot,
  type WebsiteSnapshot,
} from "./content-extractor";
import {
  discoverSupportingPages,
  discoverExternalLegalLinks,
  isSameWebsiteDomain,
  isExcludedSupportingPath,
  normalizeSupportingPathname,
  type DiscoveredSupportingPageCandidate,
  type SupportingLinkLocation,
  type SupportingPageType,
} from "./supporting-page-discovery";

export interface SupportingPageRecord {
  url: string;
  finalUrl: string;
  path: string;
  pageType: SupportingPageType;
  anchorText: string;
  sourceLocation: SupportingLinkLocation;
  relevanceScore: number;
  status: number;
  timingMs: number;
  contentLength: number;
  redirectCount: number;
  snapshot: WebsiteSnapshot;
}

export interface SupportingPageFetchAttempt {
  url: string;
  finalUrl?: string;
  pageType: SupportingPageType;
  anchorText: string;
  sourceLocation: SupportingLinkLocation;
  relevanceScore: number;
  success: boolean;
  status?: number;
  error?: string;
  message?: string;
  timingMs: number;
}

export interface SupportingPagesBundle {
  discoveredCount: number;
  attemptedCount: number;
  fetchedCount: number;
  totalTimingMs: number;
  candidates: DiscoveredSupportingPageCandidate[];
  pages: SupportingPageRecord[];
  attempts: SupportingPageFetchAttempt[];
  /** Visible externally hosted policy links; their content is never fetched. */
  externalLegalLinks?: Array<{
    url: string; pageType: "privacy_policy" | "terms_of_service" | "refund_policy";
  }>;
}

export interface FetchSupportingPagesOptions {
  maxPages?: number;
  perPageTimeoutMs?: number;
  totalTimeoutMs?: number;
  maxRedirects?: number;
  maxSizeBytes?: number;
  maxHtmlChars?: number;
  concurrency?: number;
  signal?: AbortSignal;
  /** Optional custom fetcher for deterministic unit testing */
  fetcher?: (
    rawUrl: string,
    normalizedUrl: string,
    options?: FetchOptions
  ) => Promise<FetchResult>;
}

/**
 * Safely fetches up to `maxPages` (default 3) discovered supporting pages with
 * strict SSRF protection, cross-domain redirect blocking, size/timeout caps,
 * and partial-failure resilience. Never throws; returns structured results.
 */
export async function fetchSupportingPages(
  candidates: DiscoveredSupportingPageCandidate[],
  homepageFinalUrl: string,
  options: FetchSupportingPagesOptions = {}
): Promise<SupportingPagesBundle> {
  const startTime = performance.now();
  const maxPages = options.maxPages ?? SERVER_LIMITS.SUPPORTING_PAGES_MAX_COUNT;
  const perPageTimeoutMs =
    options.perPageTimeoutMs ?? SERVER_LIMITS.SUPPORTING_PAGE_FETCH_TIMEOUT_MS;
  const totalTimeoutMs =
    options.totalTimeoutMs ?? SERVER_LIMITS.SUPPORTING_PAGES_TOTAL_TIMEOUT_MS;
  const maxRedirects =
    options.maxRedirects ?? SERVER_LIMITS.SUPPORTING_PAGE_MAX_REDIRECTS;
  const maxSizeBytes =
    options.maxSizeBytes ?? SERVER_LIMITS.SUPPORTING_PAGE_MAX_RESPONSE_BYTES;
  const maxHtmlChars =
    options.maxHtmlChars ?? SERVER_LIMITS.SUPPORTING_PAGE_MAX_HTML_CHARS;
  const concurrency = Math.max(
    1,
    options.concurrency ?? SERVER_LIMITS.SUPPORTING_PAGES_CONCURRENCY
  );
  const fetcher = options.fetcher ?? fetchWebsiteHomepage;
  const parentSignal = options.signal;

  const boundedCandidates = candidates.slice(0, maxPages);

  if (boundedCandidates.length === 0 || !homepageFinalUrl) {
    return {
      discoveredCount: candidates.length,
      attemptedCount: 0,
      fetchedCount: 0,
      totalTimingMs: 0,
      candidates: boundedCandidates,
      pages: [],
      attempts: [],
    };
  }

  let homepageCanonicalPath = "/";
  try {
    homepageCanonicalPath = normalizeSupportingPathname(
      new URL(homepageFinalUrl).pathname
    );
  } catch {
    homepageCanonicalPath = "/";
  }

  // Global deadline controller for all supporting-page fetches combined
  const batchController = new AbortController();
  const batchTimer = setTimeout(() => batchController.abort(), totalTimeoutMs);
  const parentAbortHandler = () => batchController.abort();
  if (parentSignal) {
    if (parentSignal.aborted) {
      batchController.abort();
    } else {
      parentSignal.addEventListener("abort", parentAbortHandler, {
        once: true,
      });
    }
  }

  const attempts: SupportingPageFetchAttempt[] = new Array(
    boundedCandidates.length
  );
  const rawFetchedResults: Array<{
    index: number;
    candidate: DiscoveredSupportingPageCandidate;
    fetchResult: Extract<FetchResult, { success: true }>;
  } | null> = new Array(boundedCandidates.length).fill(null);

  try {
    let cursor = 0;

    const worker = async () => {
      while (cursor < boundedCandidates.length) {
        const index = cursor++;
        const candidate = boundedCandidates[index];
        const candidateStart = performance.now();

        if (batchController.signal.aborted) {
          attempts[index] = {
            url: candidate.url,
            pageType: candidate.pageType,
            anchorText: candidate.anchorText,
            sourceLocation: candidate.sourceLocation,
            relevanceScore: candidate.relevanceScore,
            success: false,
            error: "FETCH_TIMEOUT",
            message: "Supporting-page total fetch budget exceeded",
            timingMs: Math.round(performance.now() - candidateStart),
          };
          continue;
        }

        try {
          const fetchResult = await fetcher(
            candidate.url,
            candidate.normalizedUrl,
            {
              timeoutMs: perPageTimeoutMs,
              maxRedirects,
              maxSizeBytes,
              signal: batchController.signal,
            }
          );

          if (!fetchResult.success) {
            attempts[index] = {
              url: candidate.url,
              finalUrl: fetchResult.finalUrl,
              pageType: candidate.pageType,
              anchorText: candidate.anchorText,
              sourceLocation: candidate.sourceLocation,
              relevanceScore: candidate.relevanceScore,
              success: false,
              status: fetchResult.status,
              error: fetchResult.error,
              message: fetchResult.message,
              timingMs:
                fetchResult.timingMs ??
                Math.round(performance.now() - candidateStart),
            };
            continue;
          }

          // Post-fetch guard 1: Verify redirect did not leave the website's domain
          if (!isSameWebsiteDomain(fetchResult.finalUrl, homepageFinalUrl)) {
            attempts[index] = {
              url: candidate.url,
              finalUrl: fetchResult.finalUrl,
              pageType: candidate.pageType,
              anchorText: candidate.anchorText,
              sourceLocation: candidate.sourceLocation,
              relevanceScore: candidate.relevanceScore,
              success: false,
              status: fetchResult.status,
              error: "CROSS_DOMAIN_REDIRECT",
              message:
                "Supporting page redirected to an external domain and was skipped",
              timingMs: fetchResult.timingMs,
            };
            continue;
          }

          // Post-fetch guard 2: Verify finalUrl did not redirect back to the homepage or an excluded path
          let finalPathname = candidate.path;
          try {
            finalPathname = normalizeSupportingPathname(
              new URL(fetchResult.finalUrl).pathname
            );
          } catch {
            // keep candidate.path
          }

          if (
            finalPathname === "/" ||
            finalPathname === homepageCanonicalPath
          ) {
            attempts[index] = {
              url: candidate.url,
              finalUrl: fetchResult.finalUrl,
              pageType: candidate.pageType,
              anchorText: candidate.anchorText,
              sourceLocation: candidate.sourceLocation,
              relevanceScore: candidate.relevanceScore,
              success: false,
              status: fetchResult.status,
              error: "REDIRECTED_TO_HOMEPAGE",
              message:
                "Supporting page redirected back to the homepage and was skipped",
              timingMs: fetchResult.timingMs,
            };
            continue;
          }

          const finalPathExclusion = isExcludedSupportingPath(finalPathname, candidate.anchorText);
          if (finalPathExclusion.excluded) {
            attempts[index] = {
              url: candidate.url,
              finalUrl: fetchResult.finalUrl,
              pageType: candidate.pageType,
              anchorText: candidate.anchorText,
              sourceLocation: candidate.sourceLocation,
              relevanceScore: candidate.relevanceScore,
              success: false,
              status: fetchResult.status,
              error: "EXCLUDED_REDIRECT_TARGET",
              message: `Supporting page redirected to an excluded path (${finalPathname})`,
              timingMs: fetchResult.timingMs,
            };
            continue;
          }

          rawFetchedResults[index] = {
            index,
            candidate,
            fetchResult,
          };
        } catch (err: unknown) {
          attempts[index] = {
            url: candidate.url,
            pageType: candidate.pageType,
            anchorText: candidate.anchorText,
            sourceLocation: candidate.sourceLocation,
            relevanceScore: candidate.relevanceScore,
            success: false,
            error: "FETCH_FAILED",
            message:
              err instanceof Error
                ? err.message
                : "Unexpected error fetching supporting page",
            timingMs: Math.round(performance.now() - candidateStart),
          };
        }
      }
    };

    const workersCount = Math.min(concurrency, boundedCandidates.length);
    await Promise.allSettled(
      Array.from({ length: workersCount }, () => worker())
    );
  } finally {
    clearTimeout(batchTimer);
    if (parentSignal) {
      parentSignal.removeEventListener("abort", parentAbortHandler);
    }
  }

  // Deduplicate by final pathname and extract structured WebsiteSnapshot without retaining raw HTML
  const pages: SupportingPageRecord[] = [];
  const seenFinalPaths = new Set<string>([homepageCanonicalPath, "/"]);

  for (let i = 0; i < boundedCandidates.length; i++) {
    const item = rawFetchedResults[i];
    if (!item) continue;

    const { candidate, fetchResult } = item;
    let finalPath = candidate.path;
    try {
      finalPath = normalizeSupportingPathname(
        new URL(fetchResult.finalUrl).pathname
      );
    } catch {
      finalPath = candidate.path;
    }

    if (seenFinalPaths.has(finalPath)) {
      attempts[i] = {
        url: candidate.url,
        finalUrl: fetchResult.finalUrl,
        pageType: candidate.pageType,
        anchorText: candidate.anchorText,
        sourceLocation: candidate.sourceLocation,
        relevanceScore: candidate.relevanceScore,
        success: false,
        status: fetchResult.status,
        error: "DUPLICATE_FINAL_URL",
        message:
          "Supporting page resolved to a duplicate URL already included",
        timingMs: fetchResult.timingMs,
      };
      continue;
    }

    try {
      const snapshot = extractWebsiteSnapshot(fetchResult.html, {
        baseUrl: fetchResult.finalUrl,
        maxHtmlChars,
      });

      // Some SPAs return their homepage or an HTML 404 screen with status
      // 200 for every path. Never count that as an inspected legal document.
      // Headings/title take precedence over footer boilerplate.
      if (["privacy_policy", "terms_of_service", "refund_policy"].includes(candidate.pageType)) {
        const heading = [
          snapshot.meta.title, snapshot.hero.headline,
          ...snapshot.valueProps.headings.slice(0, 3).map(h => h.text),
        ].join(" ").toLowerCase();
        const bodyLead = snapshot.bodySections.slice(0, 2)
          .map(part => part.textSummary).join(" ").slice(0, 600).toLowerCase();
        const relevant: Record<string, RegExp> = {
          privacy_policy: /\b(?:privacy|data protection|personal data|information collection)\b/i,
          terms_of_service: /\b(?:terms|conditions|user agreement|service agreement)\b/i,
          refund_policy: /\b(?:refund|returns?|cancellation|money.back)\b/i,
        };
        const matchesPolicy = relevant[candidate.pageType].test(heading) ||
          (!heading.trim() && relevant[candidate.pageType].test(bodyLead));
        const looksLikeError = /\b(?:404|page not found|not found|does not exist|something went wrong)\b/i.test(heading);
        if (!matchesPolicy || looksLikeError) {
          attempts[i] = {
            url: candidate.url, finalUrl: fetchResult.finalUrl, pageType: candidate.pageType,
            anchorText: candidate.anchorText, sourceLocation: candidate.sourceLocation,
            relevanceScore: candidate.relevanceScore, success: false, status: fetchResult.status,
            error: "EXTRACTION_FAILED",
            message: "Policy destination did not present identifiable policy content; it was not verified.",
            timingMs: fetchResult.timingMs,
          };
          continue;
        }
      }

      seenFinalPaths.add(finalPath);
      pages.push({
        url: candidate.url,
        finalUrl: fetchResult.finalUrl,
        path: finalPath,
        pageType: candidate.pageType,
        anchorText: candidate.anchorText,
        sourceLocation: candidate.sourceLocation,
        relevanceScore: candidate.relevanceScore,
        status: fetchResult.status,
        timingMs: fetchResult.timingMs,
        contentLength: fetchResult.contentLength,
        redirectCount: fetchResult.redirectCount,
        snapshot,
      });

      attempts[i] = {
        url: candidate.url,
        finalUrl: fetchResult.finalUrl,
        pageType: candidate.pageType,
        anchorText: candidate.anchorText,
        sourceLocation: candidate.sourceLocation,
        relevanceScore: candidate.relevanceScore,
        success: true,
        status: fetchResult.status,
        timingMs: fetchResult.timingMs,
      };
    } catch (extractErr: unknown) {
      attempts[i] = {
        url: candidate.url,
        finalUrl: fetchResult.finalUrl,
        pageType: candidate.pageType,
        anchorText: candidate.anchorText,
        sourceLocation: candidate.sourceLocation,
        relevanceScore: candidate.relevanceScore,
        success: false,
        status: fetchResult.status,
        error: "EXTRACTION_FAILED",
        message:
          extractErr instanceof Error
            ? extractErr.message
            : "Failed to extract supporting page content",
        timingMs: fetchResult.timingMs,
      };
    }
  }

  const totalTimingMs = Math.round(performance.now() - startTime);

  return {
    discoveredCount: candidates.length,
    attemptedCount: boundedCandidates.length,
    fetchedCount: pages.length,
    totalTimingMs,
    candidates: boundedCandidates,
    pages,
    attempts: attempts.filter(Boolean),
  };
}

/**
 * High-level orchestrator for Multi-Page Expansion Phase 1:
 * Discovers up to 3 relevant supporting pages from the homepage HTML and safely fetches + extracts them.
 * Never throws; any failure degrades gracefully to an empty `pages` array so homepage analysis is never blocked.
 */
export async function discoverAndFetchSupportingPages(
  homepageHtml: string,
  homepageFinalUrl: string,
  options: FetchSupportingPagesOptions = {}
): Promise<SupportingPagesBundle> {
  try {
    const maxPages =
      options.maxPages ?? SERVER_LIMITS.SUPPORTING_PAGES_MAX_COUNT;
    // Legal policies have their own concurrent fetch lane. Do not spend
    // supporting-page slots or network requests fetching them twice.
    const candidates = discoverSupportingPages(homepageHtml, homepageFinalUrl, {
      maxPages: maxPages + 3,
    }).filter(candidate => !["privacy_policy", "terms_of_service", "refund_policy"].includes(candidate.pageType))
      .slice(0, maxPages);
    return await fetchSupportingPages(candidates, homepageFinalUrl, options);
  } catch (err: unknown) {
    console.warn(
      "Supporting-page discovery/fetching encountered an unexpected error and degraded gracefully:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      discoveredCount: 0,
      attemptedCount: 0,
      fetchedCount: 0,
      totalTimingMs: 0,
      candidates: [],
      pages: [],
      attempts: [],
    };
  }
}


/**
 * Fetch independently discovered first-party legal pages even when optional
 * multi-page product/context analysis is disabled. Only these three policy
 * page types are eligible; the ordinary supporting-page ranking cannot crowd
 * them out. Fetching remains SSRF/timeout/redirect protected.
 */
export async function discoverAndFetchLegalPages(
  homepageHtml: string,
  homepageFinalUrl: string,
  options: FetchSupportingPagesOptions = {}
): Promise<SupportingPagesBundle> {
  try {
    const maxPages = Math.min(3, options.maxPages ?? 3);
    const candidates = discoverSupportingPages(homepageHtml, homepageFinalUrl, {
      maxPages,
      onlyLegalPolicies: true,
    });
    const fetched = await fetchSupportingPages(candidates, homepageFinalUrl, { ...options, maxPages });
    return {
      ...fetched,
      externalLegalLinks: discoverExternalLegalLinks(homepageHtml, homepageFinalUrl),
    };
  } catch (err: unknown) {
    console.warn(
      "Legal-page discovery/fetching degraded gracefully:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { discoveredCount: 0, attemptedCount: 0, fetchedCount: 0,
      totalTimingMs: 0, candidates: [], pages: [], attempts: [] };
  }
}

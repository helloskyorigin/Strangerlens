import crypto from "node:crypto";
import type { FinalValidatedAnalysis } from "@/types/validatedAnalysis";
import type { SupportingContext } from "@/types/supportingContext";
import type { WebsiteSnapshot } from "@/lib/content-extractor";
import type { AnalysisData } from "@/components/ResultsScreen";
import { isDurableStorageConfigured, paymentStore, reportKey, UNPAID_RETENTION_SECONDS, cleanEnvString } from "@/server/storage/paymentStore";
import { getDodoConfig } from "@/server/payments/dodo";

export interface StoredServerReport {
  reportId: string;
  normalizedUrl: string;
  domain: string;
  createdAt: number;
  tokenHash: string;
  snapshot: WebsiteSnapshot;
  fullAnalysis: FinalValidatedAnalysis;
  supportingContext?: SupportingContext;
  payment?: { paymentId: string; environment: string; orderId: string; active: boolean; verifiedAt: number };
}

export interface LockedPreviewCounts {
  actionSteps: number;
  secondaryFixes: number;
  copyRewrites: number;
  totalRisks: number;
}

export interface EntitlementCheckResult {
  authorized: boolean;
  tier: "free" | "paid";
  checkoutEnabled: boolean;
  blocker: string | null;
  reason?: string;
}

// Free previews remain usable before database setup. This fallback can NEVER
// accept checkout or grant paid access. Purchases always use shared Redis.
const previewStore = new Map<string, StoredServerReport>();
export const PAYMENT_INFRASTRUCTURE_BLOCKER = "Checkout is temporarily unavailable. Please try again later.";

export function isPaymentInfrastructureConfigured(): boolean {
  try {
    getDodoConfig();
    return isDurableStorageConfigured();
  } catch { return false; }
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hasReportAccess(report: StoredServerReport, token: unknown): boolean {
  if (typeof token !== "string" || !/^sl_ent_[a-f0-9]{48}$/.test(token)) return false;
  const expected = Buffer.from(report.tokenHash, "hex");
  const actual = Buffer.from(hashToken(token), "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function saveServerReport(params: {
  normalizedUrl: string;
  domain: string;
  snapshot: WebsiteSnapshot;
  fullAnalysis: FinalValidatedAnalysis;
  supportingContext?: SupportingContext;
}): Promise<StoredServerReport & { reportToken: string }> {
  const reportToken = `sl_ent_${crypto.randomBytes(24).toString("hex")}`;
  const record: StoredServerReport = {
    ...params, reportId: crypto.randomUUID(), createdAt: Date.now(), tokenHash: hashToken(reportToken),
  };
  if (isDurableStorageConfigured()) {
    // Storage outages must fail visibly, never downgrade a durable report to memory.
    await paymentStore().set(reportKey(record.reportId), record, { ex: UNPAID_RETENTION_SECONDS });
  } else {
    for (const [id, report] of previewStore) {
      if (Date.now() - report.createdAt > 3600000) previewStore.delete(id);
    }
    if (previewStore.size >= 500) previewStore.delete(previewStore.keys().next().value!);
    previewStore.set(record.reportId, record);
  }
  return { ...record, reportToken };
}

export async function getServerReport(reportId: string): Promise<StoredServerReport | null> {
  if (!/^[a-f0-9-]{36}$/.test(reportId)) return null;
  if (isDurableStorageConfigured()) return paymentStore().get<StoredServerReport>(reportKey(reportId));
  const report = previewStore.get(reportId);
  if (!report || Date.now() - report.createdAt > 3600000) return null;
  return report;
}

export function extractEntitlementTokenFromHeaders(headers?: Headers | Record<string, string | undefined> | null): string | null {
  if (!headers) return null;
  const get = (key: string) => typeof (headers as Headers).get === "function"
    ? (headers as Headers).get(key) : (headers as Record<string, string | undefined>)[key];
  const auth = get("authorization") || get("Authorization");
  return auth?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || get("x-entitlement-token")?.trim() || null;
}

export async function verifyServerEntitlement(reportId: string | null | undefined, token: string | null | undefined): Promise<EntitlementCheckResult> {
  const checkoutEnabled = isPaymentInfrastructureConfigured();
  const locked: EntitlementCheckResult = {
    authorized: false, tier: "free", checkoutEnabled,
    blocker: checkoutEnabled ? null : PAYMENT_INFRASTRUCTURE_BLOCKER,
  };
  if (!reportId || !token) return { ...locked, reason: "MISSING_REPORT_ACCESS" };
  const report = await getServerReport(reportId);
  if (!report || !hasReportAccess(report, token)) return { ...locked, reason: "INVALID_REPORT_ACCESS" };
  const environment = cleanEnvString(process.env.DODO_ENVIRONMENT) || "test_mode";
  if (!isDurableStorageConfigured() || !report.payment?.active || report.payment.environment !== environment) {
    return { ...locked, reason: "PAYMENT_REQUIRED" };
  }
  return { authorized: true, tier: "paid", checkoutEnabled, blocker: null };
}

export function computeLockedPreviewCounts(
  analysis: FinalValidatedAnalysis
): LockedPreviewCounts {
  const secondaryFixes = Array.isArray(analysis.other_improvements)
    ? analysis.other_improvements.length
    : 0;
  const actionSteps = Math.min(3, 1 + secondaryFixes);
  const hasPrimaryCopy = Boolean(
    analysis.priority_fix?.clearer_direction &&
      analysis.priority_fix.clearer_direction.trim().length > 0
  );
  const secondaryCopyCount = Array.isArray(analysis.other_improvements)
    ? analysis.other_improvements.filter((i) => Boolean(i.copyable_suggestion?.trim())).length
    : 0;
  const copyRewrites = (hasPrimaryCopy ? 1 : 0) + secondaryCopyCount;
  const totalRisks = Array.isArray(analysis.risks) ? analysis.risks.length : 0;

  return {
    actionSteps,
    secondaryFixes,
    copyRewrites,
    totalRisks,
  };
}

/**
 * Strips all Full-Report (Sections 04–06) premium fields from FinalValidatedAnalysis
 * so free API responses contain ONLY Free Report data (Sections 01–03).
 */
export function redactAnalysisForFreeTier(
  analysis: FinalValidatedAnalysis
): FinalValidatedAnalysis {
  return {
    analysis_version: analysis.analysis_version,
    scoring_version: analysis.scoring_version,
    overall_score: analysis.overall_score,
    overall_status: analysis.overall_status,
    verdict: {
      text: analysis.verdict.text,
    },
    // Section 06 (5-second detailed breakdown) explanations redacted for free tier; keep only status & primary evidence needed for Section 02 findings
    first_seconds: {
      what_is_this: {
        status: analysis.first_seconds.what_is_this.status,
        explanation: "",
        evidence_available: analysis.first_seconds.what_is_this.evidence_available,
        evidence: analysis.first_seconds.what_is_this.evidence.slice(0, 1),
      },
      who_is_it_for: {
        status: analysis.first_seconds.who_is_it_for.status,
        explanation: "",
        evidence_available: analysis.first_seconds.who_is_it_for.evidence_available,
        evidence: analysis.first_seconds.who_is_it_for.evidence.slice(0, 1),
      },
      what_will_i_get: {
        status: analysis.first_seconds.what_will_i_get.status,
        explanation: "",
        evidence_available: analysis.first_seconds.what_will_i_get.evidence_available,
        evidence: analysis.first_seconds.what_will_i_get.evidence.slice(0, 1),
      },
      why_should_i_care: {
        status: analysis.first_seconds.why_should_i_care.status,
        explanation: "",
        evidence_available: analysis.first_seconds.why_should_i_care.evidence_available,
        evidence: analysis.first_seconds.why_should_i_care.evidence.slice(0, 1),
      },
      what_should_i_do_next: {
        status: analysis.first_seconds.what_should_i_do_next.status,
        explanation: "",
        evidence_available: analysis.first_seconds.what_should_i_do_next.evidence_available,
        evidence: analysis.first_seconds.what_should_i_do_next.evidence.slice(0, 1),
      },
    },
    // Section 06 Visitor Impression is premium-only
    visitor_thought: {
      text: "",
      confidence: "low",
    },
    website_message: analysis.website_message,
    signals: {
      first_impression: { ...analysis.signals.first_impression, explanation: "", evidence_available: false, evidence: [] },
      audience: { ...analysis.signals.audience, explanation: "", evidence_available: false, evidence: [] },
      value: { ...analysis.signals.value, explanation: "", evidence_available: false, evidence: [] },
      trust: { ...analysis.signals.trust, explanation: "", evidence_available: false, evidence: [] },
      action: { ...analysis.signals.action, explanation: "", evidence_available: false, evidence: [] },
    },
    // Section 02 Biggest Issue uses only the #1 primary risk; secondary risks (Section 06) are redacted
    risks: Array.isArray(analysis.risks) ? analysis.risks.slice(0, 1) : [],
    // Section 03 Your #1 Priority Fix is included in Free Preview
    priority_fix: analysis.priority_fix,
    // Section 04 & 05 Secondary Improvements & Copy-Ready Rewrites are premium-only
    other_improvements: [],
  };
}

/**
 * Strips all Full-Report (Sections 04–06) fields from frontend AnalysisData
 * so React state/props and browser DOM never hold premium report content for unpaid users.
 */
export function redactFrontendDataForFreeTier(
  data: AnalysisData,
  lockedPreviewCounts?: LockedPreviewCounts
): AnalysisData {
  const primaryClear = data.evidence?.clearFindings?.slice(0, 1) || [];
  const primaryMissing = data.evidence?.missingFindings?.slice(0, 2) || [];

  return {
    ...data,
    firstSeconds: [],
    visitorThought: "",
    evidence: {
      locationTag: data.evidence.locationTag,
      homepageExcerpt: data.evidence.homepageExcerpt,
      clearFindings: primaryClear,
      missingFindings: primaryMissing,
    },
    risks: Array.isArray(data.risks) ? data.risks.slice(0, 1) : [],
    otherImprovements: [],
    supportingContext: undefined,
    isFreeTierOnly: true,
    lockedPreviewCounts: lockedPreviewCounts ?? {
      actionSteps: Math.min(3, 1 + (data.otherImprovements?.length || 0)),
      secondaryFixes: data.otherImprovements?.length || 0,
      copyRewrites:
        (data.recommendation?.strongerDirection ? 1 : 0) +
        (data.otherImprovements?.filter((i) => Boolean(i.copyableSuggestion)).length || 0),
      totalRisks: data.risks?.length || 1,
    },
  };
}

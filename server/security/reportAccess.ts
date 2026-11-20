import crypto from "node:crypto";
import type { FinalValidatedAnalysis } from "@/types/validatedAnalysis";
import type { SupportingContext } from "@/types/supportingContext";
import type { WebsiteSnapshot } from "@/lib/content-extractor";
import type { AnalysisData } from "@/components/ResultsScreen";
import { isDurableStorageConfigured, paymentStore, reportKey, UNPAID_RETENTION_SECONDS, cleanEnvString } from "@/server/storage/paymentStore";
import { getDodoConfig } from "@/server/payments/dodo";
import { isPurchaseReadiness } from "@/lib/purchase-readiness";
import { projectFreeFrontendReport } from "@/lib/free-report-projection";

export interface StoredServerReport {
  reportId: string;
  normalizedUrl: string;
  domain: string;
  createdAt: number;
  tokenHash: string;
  snapshot: WebsiteSnapshot;
  fullAnalysis: FinalValidatedAnalysis;
  /** Provenance prevents heuristic-only reports from being marketed as paid AI analysis. */
  analysisMode?: "ai" | "heuristic";
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
  // Missing/corrupt persisted records must fail closed instead of producing a
  // server error or accidentally authorizing access.
  if (!report || typeof report.tokenHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(report.tokenHash)) return false;
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
  /** Provenance prevents heuristic-only reports from being marketed as paid AI analysis. */
  analysisMode?: "ai" | "heuristic";
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
 * $0 API payload: only scores, their statuses, and whether the optional
 * purchase check applies. No website quote, explanation, verdict diagnosis,
 * primary fix, risk or rewrite travels in the free analysis object.
 *
 * Full analysis remains on the server, gated by verified payment entitlement.
 */
export function redactAnalysisForFreeTier(
  analysis: FinalValidatedAnalysis
): FinalValidatedAnalysis {
  const purchaseReadinessLocked = analysis.purchase_readiness_locked === true ||
    isPurchaseReadiness(analysis.purchase_readiness);
  const publicSignal = (signal: FinalValidatedAnalysis["signals"]["first_impression"]) => ({
    score: signal.score,
    status: signal.status,
    confidence: signal.confidence,
    explanation: "",
    evidence_available: false,
    evidence: [],
  });
  const publicFirstSeconds = (part: FinalValidatedAnalysis["first_seconds"]["what_is_this"]) => ({
    status: part.status,
    explanation: "",
    evidence_available: false,
    evidence: [],
  });

  return {
    ...(purchaseReadinessLocked ? { purchase_readiness_locked: true } : {}),
    analysis_version: analysis.analysis_version,
    scoring_version: analysis.scoring_version,
    overall_score: analysis.overall_score,
    overall_status: analysis.overall_status,
    verdict: { text: "" },
    first_seconds: {
      what_is_this: publicFirstSeconds(analysis.first_seconds.what_is_this),
      who_is_it_for: publicFirstSeconds(analysis.first_seconds.who_is_it_for),
      what_will_i_get: publicFirstSeconds(analysis.first_seconds.what_will_i_get),
      why_should_i_care: publicFirstSeconds(analysis.first_seconds.why_should_i_care),
      what_should_i_do_next: publicFirstSeconds(analysis.first_seconds.what_should_i_do_next),
    },
    visitor_thought: { text: "", confidence: "low" },
    website_message: {
      summary: "",
      confidence: "low",
      evidence_available: false,
      evidence: [],
    },
    signals: {
      first_impression: publicSignal(analysis.signals.first_impression),
      audience: publicSignal(analysis.signals.audience),
      value: publicSignal(analysis.signals.value),
      trust: publicSignal(analysis.signals.trust),
      action: publicSignal(analysis.signals.action),
    },
    risks: [],
    priority_fix: {
      title: "",
      reason: "",
      impact: "medium",
      what_you_say_now: "",
      clearer_direction: "",
      evidence_available: false,
      evidence: [],
    },
    other_improvements: [],
  };
}

/**
 * Applied by server-side callers as a defensive projection. The browser scan
 * controller uses the exact same pure helper after mapping a public snapshot.
 */
export function redactFrontendDataForFreeTier(
  data: AnalysisData,
  lockedPreviewCounts?: LockedPreviewCounts
): AnalysisData {
  return projectFreeFrontendReport(data, lockedPreviewCounts);
}

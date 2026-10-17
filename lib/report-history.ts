import { readReportToken } from "@/lib/payment-checkout";
import { mapBackendToFrontend } from "@/lib/mapper";
import type { ReportHistoryEntry, ReportReference } from "@/types/report-history";

const ACCESS_PREFIX = "sl_report_access_v1:";
const ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const TOKEN_PATTERN = /^sl_ent_[a-f0-9]{48}$/;

// Reuse the versioned capabilities already persisted BEFORE checkout. This also
// discovers purchases made before My Reports existed. Never cache a paid flag,
// score, report body or entitlement in localStorage.
export function readReportReferences(): ReportReference[] {
  const storage = window.localStorage;
  const references: ReportReference[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(ACCESS_PREFIX)) continue;
    const reportId = key.slice(ACCESS_PREFIX.length);
    const token = storage.getItem(key);
    if (ID_PATTERN.test(reportId) && token && TOKEN_PATTERN.test(token)) references.push({ reportId, token });
  }
  return references;
}

export async function fetchReportHistory(references: ReportReference[], signal?: AbortSignal): Promise<ReportHistoryEntry[]> {
  const entries: ReportHistoryEntry[] = [];
  // Bounded batches avoid an unbounded database fan-out while keeping every
  // saved purchase discoverable. Individual batch failures remain retryable.
  for (let offset = 0; offset < references.length; offset += 20) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const batch = references.slice(offset, offset + 20);
    try {
      const response = await fetch("/api/my-reports", {
        method: "POST", cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ references: batch }),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.reports)) throw new Error("REPORT_HISTORY_UNAVAILABLE");
      entries.push(...data.reports);
    } catch {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      entries.push(...batch.map(({ reportId }) => ({ reportId, status: "error" as const })));
    }
  }
  return entries.filter((entry) => entry.status !== "unpaid").sort((a, b) =>
    ("createdAt" in b ? b.createdAt : 0) - ("createdAt" in a ? a.createdAt : 0));
}

export class ReportAccessError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function fetchPurchasedReport(reportId: string, signal?: AbortSignal) {
  const token = readReportToken(reportId);
  if (!ID_PATTERN.test(reportId) || !token || !TOKEN_PATTERN.test(token)) {
    throw new ReportAccessError(404, "This report’s access reference is not available in this browser. Contact support with your receipt; please do not pay again.");
  }
  const response = await fetch(`/api/report/${encodeURIComponent(reportId)}`, {
    cache: "no-store", headers: { Authorization: `Bearer ${token}` },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.unlocked !== true || result.reportId !== reportId || !result.analysis || !result.snapshot) {
    throw new ReportAccessError(response.status === 200 ? 503 : response.status,
      response.status === 403 ? "Report access could not be verified. The payment may have been refunded or access revoked. Contact support if this is unexpected; do not pay again."
        : response.status === 404 ? "The saved report could not be found. Contact support with your receipt; please do not pay again."
          : "Your report is temporarily unavailable. Please try again; you do not need to pay again.");
  }
  const mapped = mapBackendToFrontend(result.analysis, result.normalizedUrl, result.snapshot, result.supportingContext);
  return {
    normalizedUrl: result.normalizedUrl as string,
    data: { ...mapped, reportId, reportToken: token, isFreeTierOnly: false },
  };
}

export async function downloadPurchasedReport(reportId: string): Promise<void> {
  // Recheck the server even when a card was previously marked paid. A refund
  // after listing must not permit a new premium download.
  const { data } = await fetchPurchasedReport(reportId);
  const [{ generateReportPdf }, { adaptReport }] = await Promise.all([
    import("@/lib/pdf-generator"), import("@/lib/report-adapter"),
  ]);
  await generateReportPdf(adaptReport(data), true);
}

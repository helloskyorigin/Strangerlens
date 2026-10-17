import { readReportToken } from "@/lib/payment-checkout";
import type { CanonicalReport } from "@/lib/report-adapter";
import type { PdfReportModel } from "@/types/pdf-report";

/** Legacy free previews may lack a server reference. Keep their summary export,
 * using an explicit public-field whitelist. No flag can turn this into paid. */
export function buildLegacyFreePdfModel(report: CanonicalReport): PdfReportModel {
  const raw = report.rawReport;
  const dateValue = raw?.createdAt ?? raw?.checkedAt;
  const date = typeof dateValue === "string" || typeof dateValue === "number" ? new Date(dateValue) : null;
  return {
    tier: "free", url: typeof raw?.url === "string" ? raw.url : report.domain,
    analysisDate: date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
    score: report.overallScore, status: report.overallStatus, verdict: report.verdict,
    signals: report.signalsList.map(signal => ({ title: signal.title, score: signal.score, status: signal.status, explanation: "", working: [], unclear: [], improvements: [] })),
    freeFindings: [], understand: [], miss: [], actions: [], evidence: [],
  };
}

export async function loadPdfExportModel(report: CanonicalReport): Promise<PdfReportModel> {
  const reportId = report.rawReport?.reportId;
  const token = report.rawReport?.reportToken || (reportId && readReportToken(reportId));
  if (!reportId || !token) return buildLegacyFreePdfModel(report);
  const response = await fetch(`/api/report/${encodeURIComponent(reportId)}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.reportId !== reportId || !["free", "paid"].includes(payload?.report?.tier)) {
    throw new Error(payload?.error || "Your report could not be prepared for PDF export. Please try again.");
  }
  return payload.report;
}

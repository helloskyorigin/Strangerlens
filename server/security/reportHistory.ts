import { cleanEnvString, isDurableStorageConfigured } from "@/server/storage/paymentStore";
import { getServerReport, hasReportAccess } from "@/server/security/reportAccess";
import type { ReportHistoryEntry, ReportReference } from "@/types/report-history";

export async function getReportHistory(references: ReportReference[]): Promise<ReportHistoryEntry[]> {
  // History must never fall back to the volatile free-preview store.
  if (!isDurableStorageConfigured()) throw new Error("REPORT_STORAGE_UNAVAILABLE");
  const environment = cleanEnvString(process.env.DODO_ENVIRONMENT) || "test_mode";
  return Promise.all(references.map(async ({ reportId, token }): Promise<ReportHistoryEntry> => {
    const report = await getServerReport(reportId);
    // Missing reports and invalid capabilities are deliberately indistinguishable.
    if (!report || !hasReportAccess(report, token)) return { reportId, status: "unavailable" };
    if (!report.payment || report.payment.environment !== environment) return { reportId, status: "unpaid" };
    return {
      reportId: report.reportId,
      domain: report.domain,
      score: report.fullAnalysis.overall_score,
      createdAt: report.createdAt,
      status: report.payment.active ? "paid" : "revoked",
    };
  }));
}

export interface ReportReference {
  reportId: string;
  token: string;
}

export interface PurchasedReportSummary {
  reportId: string;
  domain: string;
  score: number;
  createdAt: number;
  status: "paid" | "revoked";
}

export type ReportHistoryEntry = PurchasedReportSummary | {
  reportId: string;
  status: "unpaid" | "unavailable" | "error";
};

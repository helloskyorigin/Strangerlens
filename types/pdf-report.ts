export interface PdfFinding { title: string; paragraphs: string[] }
export interface PdfSignal {
  independent?: boolean;
  title: string;
  score: number | null;
  status: string;
  explanation: string;
  working: string[];
  unclear: string[];
  improvements: string[];
}
export interface PdfReportModel {
  tier: "free" | "paid";
  url: string;
  analysisDate: string | null;
  score: number | null;
  status: string;
  verdict: string;
  visitorPerspective?: string;
  signals: PdfSignal[];
  freeFindings: PdfFinding[];
  understand: PdfFinding[];
  miss: PdfFinding[];
  actions: PdfFinding[];
  evidence: PdfFinding[];
  /** Additional paid-only workbench content, derived from stored verified analysis. */
  evidenceToFix?: PdfFinding[];
  priorities?: PdfFinding[];
  copySuggestions?: PdfFinding[];
}

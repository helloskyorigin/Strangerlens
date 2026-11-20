import { jsPDF } from "jspdf";
import type { CanonicalReport } from "@/lib/report-adapter";
import type { PdfFinding, PdfReportModel } from "@/types/pdf-report";
import { loadPdfExportModel } from "@/lib/pdf-download";

export interface PdfFonts { regular: string; bold: string }
let fontsPromise: Promise<PdfFonts | null> | undefined;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

async function loadFonts(): Promise<PdfFonts | null> {
  if (!fontsPromise) fontsPromise = Promise.all(["DejaVuSans.ttf", "DejaVuSans-Bold.ttf"].map(async name => {
    const response = await fetch(`/fonts/pdf/${name}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("The PDF fonts could not be loaded. Please check your connection and try again.");
    return toBase64(new Uint8Array(await response.arrayBuffer()));
  })).then(([regular, bold]) => ({ regular, bold })).catch(() => {
    // Embedded app previews, strict CSPs and offline browsers may block fonts.
    // Use built-in PDF fonts rather than refusing both free and paid downloads.
    fontsPromise = undefined;
    return null;
  });
  return fontsPromise;
}

function cleanText(value: string): string {
  return value.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, " ").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}

/** Every paragraph, label, URL and copy block uses line-by-line pagination.
 * No fixed-height container can clip the original report's text. */
export function buildReportPdf(model: PdfReportModel, fonts: PdfFonts | null = null): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", putOnlyUsedFonts: true, compress: true });
  if (fonts) {
    doc.addFileToVFS("DejaVuSans.ttf", fonts.regular); doc.addFont("DejaVuSans.ttf", "ReportSans", "normal");
    doc.addFileToVFS("DejaVuSans-Bold.ttf", fonts.bold); doc.addFont("DejaVuSans-Bold.ttf", "ReportSans", "bold");
  }
  const pdfFont = fonts ? "ReportSans" : "helvetica";
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 18, contentWidth = width - margin * 2, pageTop = 28, pageBottom = height - 24;
  const paid = model.tier === "paid";
  let y = 49;
  const ink: [number, number, number] = [24, 35, 53];
  const muted: [number, number, number] = [91, 107, 128];
  const blue: [number, number, number] = [36, 107, 253];
  const font = (size = 10, bold = false, color = ink) => {
    doc.setFont(pdfFont, bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color);
  };
  const ensure = (needed: number) => { if (y + needed > pageBottom) { doc.addPage(); y = pageTop; } };
  const paragraph = (value: string, options: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const valueText = cleanText(value);
    if (!valueText) return;
    const size = options.size ?? 9.5, lineHeight = size * 0.352778 * 1.5, indent = options.indent ?? 0;
    font(size, options.bold, options.color ?? ink);
    const lines = doc.splitTextToSize(valueText, contentWidth - indent) as string[];
    for (const line of lines) { ensure(lineHeight); doc.text(line, margin + indent, y, { baseline: "top" }); y += lineHeight; }
    y += options.gap ?? 3;
  };
  const section = (number: string, title: string) => {
    // Reserve the heading plus the first content block to avoid orphan titles.
    ensure(65); y += 4;
    font(8, true, blue); doc.text(number, margin, y, { baseline: "top" }); y += 6;
    paragraph(title, { size: 15, bold: true, gap: 4 });
    doc.setDrawColor(222, 229, 239); doc.setLineWidth(0.3); doc.line(margin, y, width - margin, y); y += 6;
  };
  const label = (title: string) => {
    font(10, true);
    const lines = doc.splitTextToSize(cleanText(title), contentWidth) as string[];
    ensure(lines.length * 5.3 + 11); paragraph(title, { size: 10, bold: true, gap: 2 });
  };
  const group = (title: string, values: string[]) => {
    label(title);
    if (!values.length) paragraph("No separate finding was recorded in this analysis.", { color: muted });
    else values.forEach(value => paragraph(value, { indent: 3 }));
  };
  const findings = (items: PdfFinding[], empty: string) => {
    const available = items.filter(item => item.paragraphs.some(value => value.trim()));
    if (!available.length) paragraph(empty, { color: muted });
    for (const item of available) { label(item.title); item.paragraphs.forEach(value => paragraph(value, { indent: 3 })); y += 2; }
  };

  doc.setProperties({ title: `StrangerLens ${paid ? "Full" : "Free"} Clarity Report`, author: "StrangerLens", subject: "Original website clarity analysis" });
  doc.setFillColor(14, 23, 39); doc.rect(0, 0, width, 38, "F");
  font(21, true, [255, 255, 255]); doc.text("StrangerLens", margin, 12, { baseline: "top" });
  font(9, false, [183, 199, 222]); doc.text(paid ? "COMPLETE PREMIUM CLARITY REPORT" : "FREE CLARITY SUMMARY", margin, 26, { baseline: "top" });

  section("01", "Report Overview");
  label("Analyzed website"); paragraph(model.url);
  label("Original analysis date");
  const date = model.analysisDate ? new Date(model.analysisDate) : null;
  paragraph(date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "Not recorded in the original analysis", { color: muted });
  ensure(22);
  font(11, true); doc.text("Overall Clarity Score", margin, y, { baseline: "top" });
  font(17, true, blue); doc.text(model.score === null ? "Unavailable" : `${model.score}/100`, width - margin, y - 1, { align: "right", baseline: "top" });
  y += 11; paragraph(`Overall status: ${model.status}`, { color: muted }); paragraph(model.verdict);

  label(model.signals.some(signal => signal.independent) ? "Signal Scores and Statuses" : "Five Signal Scores and Statuses");
  for (const signal of model.signals) {
    font(9);
    const statusLines = doc.splitTextToSize(cleanText(signal.status), 67) as string[];
    const rowHeight = Math.max(15, statusLines.length * 4.8 + 7);
    if (rowHeight > 55) { label(signal.title); paragraph(`${signal.score ?? "Unavailable"}${signal.score === null ? "" : "/100"} | ${signal.status}`); continue; }
    ensure(rowHeight + 3);
    doc.setFillColor(246, 248, 252); doc.roundedRect(margin, y, contentWidth, rowHeight, 2, 2, "F");
    font(9, true); doc.text(signal.title, margin + 4, y + 5, { baseline: "top" });
    font(9, false, muted); doc.text(statusLines, margin + 68, y + 5, { baseline: "top", lineHeightFactor: 1.5 });
    font(10, true); doc.text(signal.score === null ? "N/A" : `${signal.score}/100`, width - margin - 4, y + 5, { align: "right", baseline: "top" });
    y += rowHeight + 3;
    if (signal.independent) paragraph("Separate Purchase Readiness assessment; not included in the Overall Clarity Score.", { size: 8, color: muted });
  }

  if (!paid) {
    section("02", "Your Free Clarity Preview");
    paragraph("Your five scores show which areas may need attention. This free summary does not include exact website evidence, diagnosis, actionable fixes or copy rewrites.", { color: muted });
    paragraph("Full Analysis ($9 one-time) includes Stranger's View, Five-Signal Diagnosis, Evidence-to-Fix, Smart Priority and Better Copy Studio.", { size: 9.5 });
  } else {
    section("02", model.signals.some(signal => signal.independent) ? "Detailed Signals" : "Five Detailed Clarity Signals");
    for (const signal of model.signals) {
      ensure(35);
      paragraph(signal.title, { size: 13, bold: true, color: blue });
      paragraph(`Original score: ${signal.score === null ? "Unavailable" : `${signal.score}/100`} | Status: ${signal.status}`, { size: 9, color: muted });
      if (signal.independent) paragraph("This separate score does not change the Overall Clarity Score.", { size: 8, color: muted });
      group("Why This Score?", signal.explanation ? [signal.explanation] : []);
      group("What's Working?", signal.working); group("What's Unclear?", signal.unclear); group("How to Improve?", signal.improvements);
      y += 4;
    }
    section("03", "First 5 Seconds");
    label("What a Visitor May Understand"); findings(model.understand, "No separate visitor-understanding finding was recorded.");
    label("What a Visitor May Miss"); findings(model.miss, "No separate visitor-miss finding was recorded.");
    if (model.visitorPerspective) { label("Recorded visitor perspective"); paragraph(model.visitorPerspective); }
    section("04", "Actionable Improvements"); findings(model.actions, "No additional actionable improvements were recorded.");
    section("05", "Available Evidence"); findings(model.evidence, "No verified website evidence was included in this report.");
    section("06", "Evidence-to-Fix");
    findings(model.evidenceToFix || [], "No separate evidence-to-fix recommendation was recorded.");
    section("07", "Smart Priority");
    findings(model.priorities || [], "No prioritized recommendations were recorded.");
    section("08", "Better Copy Studio");
    findings(model.copySuggestions || [], "No additional copy suggestions were recorded.");
  }

  // Footer/header furniture is added ONCE after pagination, preserving accurate
  // page counts without changing the active flow page during text layout.
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    if (page > 1) {
      font(9, true); doc.text("StrangerLens", margin, 14);
      font(7.5, false, muted); doc.text(paid ? "FULL CLARITY REPORT" : "FREE CLARITY SUMMARY", width - margin, 14, { align: "right" });
      doc.setDrawColor(222, 229, 239); doc.line(margin, 19, width - margin, 19);
    }
    doc.setDrawColor(222, 229, 239); doc.line(margin, height - 17, width - margin, height - 17);
    font(7.5, false, muted); doc.text(paid ? "StrangerLens | Complete Premium Report" : "StrangerLens | Free Summary", margin, height - 11);
    doc.text(`Page ${page} of ${totalPages}`, width - margin, height - 11, { align: "right" });
  }
  return doc;
}

/**
 * Results and My Reports share the exact same server-authorized report tier.
 * Return a Blob as an explicit second-chance download for browsers/webviews
 * which suppress jsPDF's automatic save after asynchronous requests.
 */
export interface PdfDownloadResult {
  filename: string;
  blob: Blob;
  tier: "free" | "paid";
  automaticSaveRequested: boolean;
}

export async function generateReportPdf(report: CanonicalReport, isUnlocked: boolean): Promise<PdfDownloadResult> {
  void isUnlocked; // Never treat a client-side flag as payment authorization.
  const model = await loadPdfExportModel(report);
  const fonts = await loadFonts();
  const doc = buildReportPdf(model, fonts);
  const filename = model.tier === "paid" ? "StrangerLens-Full-Report.pdf" : "StrangerLens-Free-Report.pdf";
  const blob = doc.output("blob");
  if (!blob || blob.size < 400 || blob.type !== "application/pdf") {
    throw new Error("PDF generation returned an invalid document. Please try again.");
  }
  let automaticSaveRequested = false;
  try {
    doc.save(filename);
    automaticSaveRequested = true;
  } catch {
    // The ready Blob can still be offered as a manually tapped download link.
  }
  return { filename, blob, tier: model.tier, automaticSaveRequested };
}

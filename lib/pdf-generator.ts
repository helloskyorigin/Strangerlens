import { jsPDF } from "jspdf";
import type { CanonicalReport } from "@/lib/report-adapter";

export async function generateReportPdf(report: CanonicalReport, isUnlocked: boolean): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const analysisDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = margin + 10;
      addHeaderFooter();
    }
  };

  const addHeaderFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      // Header rule & tiny title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("StrangerLens · Website First-Impression Clarity Report", margin, 10);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, 12, pageWidth - margin, 12);

      // Footer
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        isUnlocked ? "StrangerLens Full Clarity Report — Confidential" : "StrangerLens Free Preview Report",
        margin,
        pageHeight - 10
      );
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }
  };

  // --- COVER / BANNER HEADER ---
  doc.setFillColor(15, 23, 42); // Deep navy #0F172A
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("StrangerLens", margin, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(isUnlocked ? "Complete Paid Clarity & Diagnostic Report" : "Free Website Clarity Preview", margin, 28);

  y = 48;

  // --- SECTION 01: REPORT OVERVIEW ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("01. Report Overview", margin, y);
  y += 6;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Target Website URL:", margin + 6, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(report.domain, margin + 42, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Analysis Date:", margin + 6, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(analysisDate, margin + 35, y + 16);

  y += 32;

  // Overall Score Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Overall Website Clarity Score", margin + 6, y + 10);
  doc.setFontSize(16);
  doc.text(report.overallScoreDisplay, pageWidth - margin - 10, y + 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Status: ${report.overallStatus} · ${report.verdict}`, margin + 6, y + 17);

  y += 30;

  // --- SECTION 02: FIVE DETAILED CLARITY SIGNALS ---
  checkPageBreak(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("02. Five Clarity Signals Overview", margin, y);
  y += 6;

  for (const signal of report.signalsList) {
    checkPageBreak(18);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(signal.title, margin + 6, y + 9);

    doc.setFont("helvetica", "bold");
    doc.text(signal.scoreDisplay, pageWidth - margin - 12, y + 9, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Status: ${signal.status}`, margin + 60, y + 9);

    y += 18;
  }

  y += 6;

  // --- IF UNLOCKED (PREMIUM PDF): DETAILED SIGNAL BREAKDOWN, FIRST 5 SECONDS, ACTIONS, EVIDENCE ---
  if (isUnlocked) {
    // Detailed Signals Deep Dive
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Detailed Signal Diagnostics & Recommendations", margin, y);
    y += 8;

    for (const signal of report.signalsList) {
      checkPageBreak(50);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 8, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${signal.title} — Score: ${signal.scoreDisplay} (${signal.status})`, margin + 4, y + 5.5);
      y += 12;

      // Why This Score?
      if (signal.explanation) {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text("Why This Score?", margin + 4, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const expLines = doc.splitTextToSize(signal.explanation, contentWidth - 10);
        doc.text(expLines, margin + 4, y);
        y += expLines.length * 4 + 4;
      }

      // What's Working?
      if (signal.positiveFindings.length > 0) {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(16, 185, 129); // green
        doc.text("What's Working?", margin + 4, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        for (const item of signal.positiveFindings) {
          const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 10);
          checkPageBreak(lines.length * 4 + 2);
          doc.text(lines, margin + 4, y);
          y += lines.length * 4 + 2;
        }
        y += 2;
      }

      // What's Unclear?
      if (signal.concerns.length > 0) {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(245, 158, 11); // amber
        doc.text("What's Unclear?", margin + 4, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        for (const item of signal.concerns) {
          const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 10);
          checkPageBreak(lines.length * 4 + 2);
          doc.text(lines, margin + 4, y);
          y += lines.length * 4 + 2;
        }
        y += 2;
      }

      // How to Improve?
      if (signal.recommendations.length > 0) {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(59, 130, 246); // blue
        doc.text("How to Improve?", margin + 4, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        for (const item of signal.recommendations) {
          const lines = doc.splitTextToSize(`→ ${item}`, contentWidth - 10);
          checkPageBreak(lines.length * 4 + 2);
          doc.text(lines, margin + 4, y);
          y += lines.length * 4 + 2;
        }
        y += 4;
      }
      y += 4;
    }

    // --- SECTION 03: FIRST 5 SECONDS ---
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("03. First 5 Seconds Visitor Perspective", margin, y);
    y += 8;

    if (report.firstSeconds.understandItems.length > 0) {
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text("What Visitors Understand Immediately:", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      for (const item of report.firstSeconds.understandItems) {
        const lines = doc.splitTextToSize(`• ${item.title}: ${item.explanation}`, contentWidth);
        checkPageBreak(lines.length * 4 + 2);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 3;
      }
      y += 4;
    }

    if (report.firstSeconds.missItems.length > 0) {
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(239, 68, 68);
      doc.text("What Visitors May Miss:", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      for (const item of report.firstSeconds.missItems) {
        const lines = doc.splitTextToSize(`• ${item.title}: ${item.explanation}`, contentWidth);
        checkPageBreak(lines.length * 4 + 2);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 3;
      }
      y += 6;
    }

    // --- SECTION 04: ACTIONABLE IMPROVEMENTS & EVIDENCE ---
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("04. Actionable Improvements & Copy-Ready Suggestions", margin, y);
    y += 8;

    const otherImps = report.rawReport?.otherImprovements || [];
    if (otherImps.length > 0) {
      for (const imp of otherImps) {
        checkPageBreak(25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(imp.title || "Improvement Recommendation", margin, y);
        y += 5;

        if (imp.description) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          const lines = doc.splitTextToSize(imp.description, contentWidth);
          doc.text(lines, margin, y);
          y += lines.length * 4 + 3;
        }

        if (imp.copyableSuggestion) {
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          doc.text("Suggested Copy Rewrite:", margin + 4, y + 5);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          const copyLines = doc.splitTextToSize(`"${imp.copyableSuggestion}"`, contentWidth - 8);
          doc.text(copyLines, margin + 4, y + 10);
          y += 18;
        }
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Follow signal-specific recommendations outlined in Section 02.", margin, y);
      y += 10;
    }

    // --- SECTION 05: EVIDENCE SUMMARY ---
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("05. Inspected Website Evidence Summary", margin, y);
    y += 8;

    const clearFindings = report.firstSeconds.clearFindings || [];
    if (clearFindings.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(16, 185, 129);
      doc.text("Verified Positive Evidence:", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      for (const cf of clearFindings) {
        const lines = doc.splitTextToSize(`• ${cf}`, contentWidth);
        checkPageBreak(lines.length * 4 + 2);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 3;
      }
      y += 4;
    }
  } else {
    // Free Report Footer Summary
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Free Preview Summary", margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const summaryText = "This PDF contains your free StrangerLens clarity preview scores and top-level signal assessment. To unlock detailed signal diagnostics, why-this-score explanations, actionable improvements, copy-ready rewrites, and the First 5 Seconds visitor breakdown, unlock your Full Clarity Report ($5 one-time) on StrangerLens.";
    const lines = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 10;
  }

  // Final page numbers and headers application
  addHeaderFooter();

  // Save PDF with correct required filename
  const filename = isUnlocked ? "StrangerLens-Full-Report.pdf" : "StrangerLens-Free-Report.pdf";
  doc.save(filename);
}

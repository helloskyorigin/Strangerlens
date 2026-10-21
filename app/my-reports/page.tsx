"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";
import { generateReportPdf } from "@/lib/pdf-generator";
import { adaptReport } from "@/lib/report-adapter";
import { readReportToken } from "@/lib/payment-checkout";
import { LandingThemeSwitcher } from "@/components/landing/LandingThemeSwitcher";
import BrandMark from "@/components/BrandMark";

export default function MyReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      const saved = JSON.parse(localStorage.getItem("strangerlens_reports") || "[]");
      const loadedReports = [];

      for (const { reportId } of saved) {
        const token = readReportToken(reportId);
        if (!token) continue;
        
        try {
          const res = await fetch(`/api/report/${encodeURIComponent(reportId)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            loadedReports.push({ ...data, reportId, token });
          }
        } catch {}
      }
      setReports(loadedReports);
      setLoading(false);
    };
    loadReports();
  }, []);

  return (
    <div className="sl-app-theme min-h-screen bg-[#090D15] text-[#F1F5F9] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Scanner
        </Link>
        <div className="mb-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><BrandMark className="h-9 w-9"/><h1 className="text-2xl sm:text-3xl font-extrabold text-white">My Reports</h1></div>
          <LandingThemeSwitcher compact />
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20 text-[#94A3B8]"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 bg-[#121824] rounded-2xl border border-[#263044]">
            <p className="text-[#94A3B8]">No reports found in this browser.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r: any) => {
              const adapted = adaptReport(r);
              return (
                <div key={r.reportId} className="bg-[#121824] border border-[#263044] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-lg">{r.domain}</h3>
                    <p className="text-sm text-[#94A3B8]">{adapted.overallScoreDisplay} · {adapted.overallStatus}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/report/${encodeURIComponent(r.reportId)}`, {
                            headers: { Authorization: `Bearer ${r.token}` }
                          });
                          if (!res.ok) throw new Error("Could not verify report access");
                          const reportData = await res.json();
                          await generateReportPdf(adaptReport(reportData), reportData.entitlement.unlocked);
                        } catch (err: any) {
                          alert(`PDF generation failed: ${err?.message || "Please try again."}`);
                        }
                      }}
                      className="px-4 py-2 bg-[#171F2D] hover:bg-[#263044] rounded-lg text-sm text-white font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </button>
                    <Link href={`/?reportId=${r.reportId}`} className="px-4 py-2 bg-[#246BFD] hover:bg-blue-600 rounded-lg text-sm text-white font-medium">
                      Open Report
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

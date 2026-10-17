import type { Metadata } from "next";
import PurchasedReport from "@/components/PurchasedReport";

export const metadata: Metadata = { title: "Your Purchased Report — StrangerLens", robots: { index: false, follow: false } };

export default async function PurchasedReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <PurchasedReport key={reportId} reportId={reportId} />;
}

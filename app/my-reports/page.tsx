import type { Metadata } from "next";
import MyReports from "@/components/MyReports";

export const metadata: Metadata = { title: "My Reports — StrangerLens", robots: { index: false, follow: false } };

export default function MyReportsPage() { return <MyReports />; }

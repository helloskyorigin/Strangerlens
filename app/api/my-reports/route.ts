import { NextRequest, NextResponse } from "next/server";
import { getReportHistory } from "@/server/security/reportHistory";
import type { ReportReference } from "@/types/report-history";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Origin" };
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const tokenPattern = /^sl_ent_[a-f0-9]{48}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (body.length > 8192) return NextResponse.json({ error: "Too many saved report references." }, { status: 413, headers });
    let parsed: unknown;
    try { parsed = JSON.parse(body); }
    catch { return NextResponse.json({ error: "Invalid report references." }, { status: 400, headers }); }
    const references = (parsed as { references?: unknown } | null)?.references;
    if (!Array.isArray(references) || references.length > 20 || references.some((ref) =>
      !ref || typeof ref.reportId !== "string" || !idPattern.test(ref.reportId) ||
      typeof ref.token !== "string" || !tokenPattern.test(ref.token)
    )) return NextResponse.json({ error: "Invalid report references." }, { status: 400, headers });
    const unique = [...new Map((references as ReportReference[]).map((ref) => [ref.reportId, ref])).values()];
    const reports = unique.length ? await getReportHistory(unique) : [];
    return NextResponse.json({ reports }, { headers });
  } catch {
    return NextResponse.json({ error: "Your reports could not be verified. Please try again; you do not need to pay again." }, { status: 503, headers });
  }
}

/** Versioned browser cache for the V7 results view. Cached data never proves
 * payment; the paid report must always be reloaded with server entitlement.
 */
export const ACTIVE_REPORT_SESSION_KEY = "strangerlens_active_report_v7";
export const LEGACY_ACTIVE_REPORT_SESSION_KEY = "strangerlens_active_report_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export interface ActiveReportSession {
  version: 7;
  rawUrl: string;
  analysisData: { reportId: string; score: number; [key: string]: any };
  savedAt: number;
}
export function readActiveReportSession(
  storage: Pick<Storage, "getItem">,
  expectedReportId?: string | null
): ActiveReportSession | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(ACTIVE_REPORT_SESSION_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    const data = parsed as Partial<ActiveReportSession>;
    if (data.version !== 7 || typeof data.rawUrl !== "string" ||
        !/^https?:\/\//i.test(data.rawUrl) || typeof data.analysisData?.reportId !== "string" ||
        typeof data.analysisData.score !== "number" || !Number.isFinite(data.analysisData.score) ||
        typeof data.savedAt !== "number" || data.savedAt > Date.now() + 60_000 ||
        Date.now() - data.savedAt > MAX_AGE_MS ||
        (expectedReportId && data.analysisData.reportId !== expectedReportId)) return null;
    return data as ActiveReportSession;
  } catch { return null; }
}
export function persistActiveReportSession(
  storage: Pick<Storage, "setItem" | "removeItem">,
  rawUrl: string,
  analysisData: unknown
): boolean {
  const data = analysisData as ActiveReportSession["analysisData"] | null;
  if (typeof rawUrl !== "string" || !/^https?:\/\//i.test(rawUrl) ||
      typeof data?.reportId !== "string" || typeof data.score !== "number" ||
      !Number.isFinite(data.score)) return false;
  try {
    storage.setItem(ACTIVE_REPORT_SESSION_KEY, JSON.stringify({
      version: 7, rawUrl, analysisData: data, savedAt: Date.now(),
    }));
    storage.removeItem(LEGACY_ACTIVE_REPORT_SESSION_KEY);
    return true;
  } catch { return false; }
}
export function clearActiveReportSession(storage: Pick<Storage, "removeItem">) {
  try { storage.removeItem(ACTIVE_REPORT_SESSION_KEY); } catch {}
  try { storage.removeItem(LEGACY_ACTIVE_REPORT_SESSION_KEY); } catch {}
}

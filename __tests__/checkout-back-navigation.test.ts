import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import {
  ACTIVE_REPORT_SESSION_KEY, LEGACY_ACTIVE_REPORT_SESSION_KEY,
  readActiveReportSession, persistActiveReportSession, clearActiveReportSession
} from "../lib/active-report-session";

const dom = new JSDOM("", { url: "https://strangerlens.ai.studio/" });
const session = dom.window.sessionStorage;
const old = { rawUrl: "https://old-example.com", analysisData: { reportId: "old-v1", score: 20 }, savedAt: Date.now() };
session.setItem(LEGACY_ACTIVE_REPORT_SESSION_KEY, JSON.stringify(old));
assert.equal(readActiveReportSession(session), null, "Old V1 browser snapshots must never render after checkout.");
const report = { reportId: "fresh-v7", score: 79, domain: "example.com", isFreeTierOnly: true };
assert.equal(persistActiveReportSession(session, "https://example.com", report), true);
assert.equal(session.getItem(LEGACY_ACTIVE_REPORT_SESSION_KEY), null, "Fresh V7 result clears stale V1 session.");
assert.equal(readActiveReportSession(session, "fresh-v7")?.analysisData.reportId, "fresh-v7");
assert.equal(readActiveReportSession(session, "another-report"), null, "Checkout return cannot display a different cached report.");
assert.equal(readActiveReportSession(session)?.version, 7, "Browser Back restores V7 report, not legacy schema.");
session.setItem(ACTIVE_REPORT_SESSION_KEY, "{broken");
assert.equal(readActiveReportSession(session), null, "Corrupt browser storage cannot crash results.");
assert.equal(persistActiveReportSession(session, "https://example.com", report), true);
const expired = JSON.parse(session.getItem(ACTIVE_REPORT_SESSION_KEY)!);
session.setItem(ACTIVE_REPORT_SESSION_KEY, JSON.stringify({...expired, savedAt: Date.now() - 9 * 86400000}));
assert.equal(readActiveReportSession(session), null, "Expired snapshots cannot revive stale reports.");
clearActiveReportSession(session);
assert.equal(session.length, 0, "A new scan clears stale restore state.");

const page = readFileSync("app/page.tsx", "utf8");
const results = readFileSync("components/ResultsScreen.tsx", "utf8");
const checkout = readFileSync("app/api/payments/checkout/route.ts", "utf8");
assert.ok(page.includes('window.addEventListener("pageshow", onPageShow)') &&
  page.includes("event.persisted") && page.includes("window.location.reload()"),
  "Dodo BFCache Back fetches the latest V7 build.");
assert.ok(page.includes('params.get("checkout") === "return" ? params.get("reportId") : null'),
  "Checkout return restores only its own report.");
assert.ok(results.includes('persistActiveReportSession(window.sessionStorage, rawUrl, data);'),
  "Latest report is stored synchronously before Dodo navigation.");
assert.ok(results.includes("sl-results-v7"), "Results remain on the V7 screen.");
assert.ok(checkout.includes('config.environment !== "live_mode" || recentOrder.returnOrigin === origin'),
  "Old live checkout sessions cannot reuse their obsolete return origins.");
dom.window.close();
console.log("PASS: checkout Back restores V7, rejects stale report snapshots and old return origins.");

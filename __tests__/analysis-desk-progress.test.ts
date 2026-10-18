import assert from "node:assert/strict";
import { createScanFlowController } from "../lib/scan-flow-controller";
import { extractWebsiteSnapshot } from "../lib/content-extractor";
import { assessScanCoverage } from "../lib/scan-coverage";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}
const response = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

async function testActualMilestones() {
  const verify = deferred<Response>();
  const analyze = deferred<Response>();
  const requests: string[] = [];
  const transitions: Array<{ verifying: boolean; pending: boolean; verified: boolean; ready: boolean }> = [];
  const controller = createScanFlowController({
    deferResultsNavigation: true,
    fetchImpl: ((url: string) => {
      requests.push(url);
      if (url.includes("/verify")) return verify.promise;
      return analyze.promise;
    }) as any,
    onStateChange(state) {
      transitions.push({
        verifying: state.isVerifying,
        pending: state.isPending,
        verified: Boolean(state.verifiedSite),
        ready: state.isPreparingResults,
      });
    },
  });

  const active = controller.startScan("example.com");
  assert.equal(controller.getState().currentView, "scan");
  assert.equal(controller.getState().isVerifying, true);
  assert.equal(controller.getState().verifiedSite, null, "Never report website connection before verification.");

  verify.resolve(response({
    success: true, reachable: true, finalUrl: "https://example.com/",
    normalizedUrl: "https://example.com/", domain: "example.com", status: 200,
  }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(controller.getState().isVerifying, false);
  assert.equal(controller.getState().isPending, true);
  assert.equal(controller.getState().verifiedSite?.domain, "example.com");
  assert.equal(controller.getState().analysisData, null, "Never show completed analysis while backend pending.");

  analyze.resolve(response({
    analysis: { overall_score: 70 },
    domain: "example.com", reportId: "test-report",
    scanCoverage: { level: "limited", note: "Limited text", observedCharacters: 100 },
  }));
  await active;
  const current = controller.getState();
  assert.equal(current.isPreparingResults, true);
  assert.equal(current.currentView, "scan", "Allow report-ready animation before navigation.");
  assert.equal(current.analysisData?.scanCoverage?.level, "limited");
  assert.equal(requests.length, 2, "Exactly one verification and one analysis request.");
  controller.completeScanToResults();
  assert.equal(controller.getState().currentView, "results");
  assert.ok(transitions.some(t => t.verifying && !t.verified));
  assert.ok(transitions.some(t => !t.verifying && t.pending && t.verified && !t.ready));
  assert.ok(transitions.some(t => t.ready));
}

async function testFailureAndReset() {
  const controller = createScanFlowController({
    fetchImpl: (async (url: string) => url.includes("/verify")
      ? response({ success: true, reachable: true, domain: "example.com", status: 200 })
      : response({ error: "INSUFFICIENT_PAGE_CONTENT", message: "Not enough content to analyze." }, 422)) as any,
  });
  await controller.startScan("example.com");
  assert.equal(controller.getState().backendError, "Not enough content to analyze.");
  assert.equal(controller.getState().analysisData, null);
  controller.cancelScan();
  assert.equal(controller.getState().verifiedSite, null, "Cancel never retains a misleading verified status.");
}

function testCoverage() {
  const empty = extractWebsiteSnapshot('<html><head><title>App</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
  assert.equal(assessScanCoverage(empty).level, "unreadable", "Do not score a client-rendered empty shell.");

  const sparse = extractWebsiteSnapshot('<html><body><main><h1>Write better.</h1><p>An AI tool for writers.</p></main></body></html>');
  assert.equal(assessScanCoverage(sparse).level, "limited", "Minimalist legitimate sites get a warning, not a hard failure.");

  const rich = extractWebsiteSnapshot(`<html><body><main><h1>Project management for independent studios</h1>
    <p>Manage your tasks and client projects in one workspace. Stay aligned with your team and see progress without juggling tabs.</p>
    <section><h2>Plan your work with confidence</h2><p>Assign tasks to your team, organize projects by deadline, track active work and keep stakeholders updated without leaving your dashboard.</p></section>
    <a href="/signup">Start free</a></main></body></html>`);
  assert.equal(assessScanCoverage(rich).level, "sufficient");
}

await testActualMilestones();
await testFailureAndReset();
testCoverage();
console.log("PASS: scanning progress follows verified network events, failed scans never complete, and empty HTML receives no unreliable score.");

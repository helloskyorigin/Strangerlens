import { validateClientUrl } from "./url-client-validator";
import { mapBackendToFrontend } from "./mapper";
import { consumeScanProgress } from "./scan-progress-stream";

export type ScanMilestone = "connecting" | "connected" | "content_inspected" | "signals_evaluated" | "report_ready";

export interface ScanFlowState {
  url: string;
  submittedUrl: string;
  currentView: "landing" | "scan" | "results";
  isVerifying: boolean;
  isPending: boolean;
  isPreparingResults: boolean;
  scanMilestone: ScanMilestone;
  /** Set only when /api/check/verify actually confirmed reachability. */
  verifiedSite: { domain: string; httpStatus: number | null } | null;
  errorMessage: string | null;
  backendError: string | null;
  analysisData: any;
}

export interface ScanFlowControllerOptions {
  fetchImpl?: typeof fetch;
  deferResultsNavigation?: boolean;
  onStateChange?: (state: ScanFlowState) => void;
  onValidationError?: (message: string) => void;
}

export function createScanFlowController(options: ScanFlowControllerOptions = {}) {
  const fetchFn = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  let state: ScanFlowState = {
    url: "",
    submittedUrl: "",
    currentView: "landing",
    isVerifying: false,
    isPending: false,
    isPreparingResults: false,
    scanMilestone: "connecting",
    verifiedSite: null,
    errorMessage: null,
    backendError: null,
    analysisData: null,
  };

  let activeRequestId = 0;
  let activeAbortController: AbortController | null = null;
  let isScanningInProgress = false;

  function emit(patch: Partial<ScanFlowState>) {
    state = { ...state, ...patch };
    options.onStateChange?.({ ...state });
  }

  function abortCurrentRequest() {
    activeRequestId += 1;
    isScanningInProgress = false;
    if (activeAbortController) {
      try {
        activeAbortController.abort();
      } catch {
        // Ignore abort errors
      }
      activeAbortController = null;
    }
  }

  function setUrl(nextUrl: string) {
    emit({
      url: nextUrl,
      errorMessage: null,
    });
  }

  function restoreSession(rawUrl: string, analysisData: any) {
    abortCurrentRequest();
    emit({
      scanMilestone: "report_ready",
      verifiedSite: null,
      url: rawUrl,
      submittedUrl: rawUrl,
      currentView: "results",
      isVerifying: false,
      isPending: false,
      isPreparingResults: false,
      errorMessage: null,
      backendError: null,
      analysisData,
    });
  }

  function resetToLanding(clearUrl: boolean = true) {
    abortCurrentRequest();
    emit({
      scanMilestone: "connecting",
      verifiedSite: null,
      url: clearUrl ? "" : (state.submittedUrl || state.url),
      submittedUrl: clearUrl ? "" : state.submittedUrl,
      currentView: "landing",
      isVerifying: false,
      isPending: false,
      isPreparingResults: false,
      errorMessage: null,
      backendError: null,
      analysisData: null,
    });
  }

  function navigateToLanding() {
    abortCurrentRequest();
    emit({
      currentView: "landing",
      isVerifying: false,
      isPending: false,
      isPreparingResults: false,
      backendError: null,
    });
  }

  function navigateToResults() {
    abortCurrentRequest();
    if (state.analysisData) {
      emit({
        currentView: "results",
        isVerifying: false,
        isPending: false,
        isPreparingResults: false,
        backendError: null,
      });
    }
  }

  function cancelScan() {
    abortCurrentRequest();
    emit({
      scanMilestone: "connecting",
      verifiedSite: null,
      url: state.submittedUrl || state.url,
      currentView: "landing",
      isVerifying: false,
      isPending: false,
      isPreparingResults: false,
      backendError: null,
    });
  }

  function completeScanToResults() {
    if (
      state.currentView === "scan" &&
      !state.isVerifying &&
      !state.isPending &&
      !state.backendError &&
      state.analysisData !== null
    ) {
      emit({
        currentView: "results",
        isPreparingResults: false,
      });
    }
  }

  async function startScan(overrideUrl?: string): Promise<void> {
    // Prevent duplicate scan requests from rapid clicks or rerenders
    if (isScanningInProgress || state.isVerifying || state.isPending) {
      return;
    }

    const rawTarget = (overrideUrl !== undefined ? overrideUrl : state.url).trim();
    const validation = validateClientUrl(rawTarget);

    if (!rawTarget || validation.status !== "valid" || !validation.normalizedUrl) {
      const msg = validation.message || "Please enter a valid website URL (e.g., stripe.com).";
      emit({
        url: overrideUrl !== undefined ? overrideUrl : state.url,
        errorMessage: msg,
        currentView: "landing",
        isVerifying: false,
        isPending: false,
      });
      options.onValidationError?.(msg);
      return;
    }

    abortCurrentRequest();
    isScanningInProgress = true;
    const currentReqId = activeRequestId;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    activeAbortController = controller;

    emit({
      url: rawTarget,
      submittedUrl: validation.normalizedUrl,
      currentView: "scan",
      scanMilestone: "connecting",
      verifiedSite: null,
      isVerifying: true,
      isPending: true,
      errorMessage: null,
      backendError: null,
      analysisData: null,
    });

    try {
      const verifyRes = await fetchFn("/api/check/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: validation.normalizedUrl }),
        ...(controller ? { signal: controller.signal } : {}),
      });

      if (currentReqId !== activeRequestId) return;

      const verifyJson = await verifyRes.json().catch(() => null);
      if (currentReqId !== activeRequestId) return;

      const isVerifySuccess =
        verifyRes.ok &&
        Boolean(verifyJson?.success || verifyJson?.reachable || verifyJson?.ok);

      if (!isVerifySuccess) {
        const errMsg =
          verifyJson?.message ||
          verifyJson?.error ||
          "We couldn't reach that website. Please check the URL and try again.";
        emit({
          isVerifying: false,
          isPending: false,
          backendError: errMsg,
          analysisData: null,
        });
        return;
      }

      const finalTargetUrl =
        verifyJson?.finalUrl || verifyJson?.normalizedUrl || validation.normalizedUrl;
      emit({
        submittedUrl: finalTargetUrl,
        scanMilestone: "connected",
        verifiedSite: {
          domain: typeof verifyJson?.domain === "string" ? verifyJson.domain : new URL(finalTargetUrl).hostname,
          httpStatus: Number.isInteger(verifyJson?.status) ? verifyJson.status : null,
        },
        isVerifying: false,
        isPending: true,
      });

      const checkRes = await fetchFn("/api/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-strangerlens-progress": "ndjson",
        },
        body: JSON.stringify({ url: finalTargetUrl }),
        ...(controller ? { signal: controller.signal } : {}),
      });

      if (currentReqId !== activeRequestId) return;
      const isStream = checkRes.headers.get("content-type")?.includes("application/x-ndjson");
      let checkJson: any = null;
      let checkStatus = checkRes.status;
      if (isStream) {
        const streamed = await consumeScanProgress(checkRes, stage => {
          if (currentReqId !== activeRequestId) return;
          emit({ scanMilestone: stage });
        });
        checkJson = streamed.payload;
        checkStatus = streamed.status;
      } else {
        // Compatible with older deployments, intercepted tests and API errors.
        checkJson = await checkRes.json().catch(() => null);
      }
      if (currentReqId !== activeRequestId) return;

      let resolvedAnalysisData: any = null;
      if (checkRes.ok && checkStatus >= 200 && checkStatus < 300 && checkJson) {
        if (checkJson.analysis && typeof checkJson.analysis.overall_score === "number") {
          const mapped = mapBackendToFrontend(
            checkJson.analysis,
            checkJson.domain || finalTargetUrl,
            checkJson.snapshot,
            checkJson.supportingContext
          );
          resolvedAnalysisData = {
            ...mapped,
            reportId: checkJson.reportId,
            reportToken: checkJson.reportToken,
            checkoutEnabled: checkJson.entitlement?.checkoutEnabled === true,
            ...(checkJson.scanCoverage ? { scanCoverage: checkJson.scanCoverage } : {}),
            isFreeTierOnly: !checkJson?.entitlement?.unlocked,
            ...(checkJson.lockedPreviewCounts
              ? { lockedPreviewCounts: checkJson.lockedPreviewCounts }
              : {}),
          };
        } else if (typeof checkJson.score === "number") {
          resolvedAnalysisData = checkJson;
        }
      }

      if (!checkRes.ok || checkStatus < 200 || checkStatus >= 300 || !resolvedAnalysisData) {
        const errMsg =
          checkJson?.message ||
          checkJson?.error ||
          "Couldn't complete the analysis right now. Please try again.";
        emit({
          isVerifying: false,
          isPending: false,
          backendError: errMsg,
          analysisData: null,
        });
        return;
      }

      emit({
        isVerifying: false,
        isPending: false,
        isPreparingResults: true,
        scanMilestone: "report_ready",
        backendError: null,
        analysisData: resolvedAnalysisData,
        currentView: options.deferResultsNavigation ? "scan" : "results",
      });
    } catch (err: any) {
      if (currentReqId !== activeRequestId) return;
      if (err?.name === "AbortError") return;

      emit({
        isVerifying: false,
        isPending: false,
        backendError:
          "Network connection interrupted while analyzing your website. Please try again.",
        analysisData: null,
      });
    } finally {
      if (currentReqId === activeRequestId) {
        isScanningInProgress = false;
      }
    }
  }

  async function retryScan(): Promise<void> {
    if (isScanningInProgress || state.isVerifying || state.isPending) {
      return;
    }
    const target = state.submittedUrl || state.url;
    if (!target) return;
    await startScan(target);
  }

  return {
    getState: () => ({ ...state }),
    setUrl,
    startScan,
    retryScan,
    cancelScan,
    resetToLanding,
    navigateToLanding,
    navigateToResults,
    completeScanToResults,
    restoreSession,
  };
}

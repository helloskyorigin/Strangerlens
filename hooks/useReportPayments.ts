"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { mapBackendToFrontend } from "@/lib/mapper";
import { clearPendingCheckout, paymentJson, readPendingCheckout, readReportToken, rememberReportAccess } from "@/lib/payment-checkout";

function clearPaymentReturnParameters() {
  const url = new URL(window.location.href);
  for (const key of ["checkout", "reportId", "orderId", "payment_id", "subscription_id", "status", "email", "license_key"]) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useReportPayments(analysisData: any, scanController: { restoreSession: (url: string, data: any) => void }) {
  const [configuration, setConfiguration] = useState<{ checkoutEnabled: boolean; environment: "test_mode" | "live_mode" }>({ checkoutEnabled: false, environment: "test_mode" });
  const [unlockedReportId, setUnlockedReportId] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<"idle" | "verifying" | "pending" | "error" | "success" | "failed">("idle");
  const [paymentReportId, setPaymentReportId] = useState<string | null>(null);
  const activeVerification = useRef<AbortController | null>(null);
  const currentData = useRef(analysisData);
  useEffect(() => { currentData.current = analysisData; }, [analysisData]);

  const loadPaidReport = useCallback(async (reportId: string, token: string, signal?: AbortSignal) => {
    const result = await paymentJson(`/api/report/${encodeURIComponent(reportId)}`, { headers: { Authorization: `Bearer ${token}` }, signal });
    if (result.unlocked !== true || result.reportId !== reportId || !result.analysis || !result.snapshot) throw new Error("Your full report is not available yet. Please try verification again.");
    const mapped = mapBackendToFrontend(result.analysis, result.normalizedUrl, result.snapshot, result.supportingContext);
    if (signal?.aborted) return;
    scanController.restoreSession(result.normalizedUrl, { ...mapped, reportId, reportToken: token, isFreeTierOnly: false });
    setUnlockedReportId(reportId);
  }, [scanController]);

  const verifyPayment = useCallback(async (requestedReportId?: string, requestedOrderId?: string) => {
    const reportId = requestedReportId || currentData.current?.reportId;
    const token = reportId && (readReportToken(reportId) || currentData.current?.reportToken);
    const orderId = requestedOrderId || (reportId && readPendingCheckout(reportId)?.orderId);
    setPaymentReportId(reportId || null);
    if (!reportId || !token || !orderId) {
      setPaymentState("error");
      setPaymentMessage("Payment access could not be restored in this browser. Contact hello.skyorigin@gmail.com with your receipt; please do not pay again.");
      return;
    }
    activeVerification.current?.abort();
    const controller = new AbortController();
    activeVerification.current = controller;
    setPaymentReportId(reportId);
    setPaymentState("verifying");
    setPaymentMessage("Checking your payment and preparing your full report…");
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const result = await paymentJson("/api/payments/verify", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reportId, orderId }), signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (result.verified === true) {
          await loadPaidReport(reportId, token, controller.signal);
          if (controller.signal.aborted) return;
          clearPendingCheckout(reportId);
          setPaymentState("success");
          setPaymentMessage("Payment verified. Your full analysis is unlocked.");
          clearPaymentReturnParameters();
          return;
        }
        if (["failed", "cancelled", "refunded"].includes(result.paymentStatus)) {
          clearPendingCheckout(reportId);
          clearPaymentReturnParameters();
          setPaymentState("failed");
          setPaymentMessage(result.paymentStatus === "refunded" ? "This payment was refunded. Report access is locked." : "Payment was not completed. You can try checkout again.");
          return;
        }
        if (attempt < 4) await new Promise<void>((resolve, reject) => {
          const onAbort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
          const timer = window.setTimeout(() => { controller.signal.removeEventListener("abort", onAbort); resolve(); }, 2500);
          controller.signal.addEventListener("abort", onAbort, { once: true });
        });
      }
      setPaymentState("pending");
      setPaymentMessage("Payment is still processing. Use ‘Check payment status’ in a moment; please do not pay again.");
    } catch (error) {
      if (controller.signal.aborted) return;
      setPaymentState("error");
      setPaymentMessage(`${error instanceof Error ? error.message : "Payment verification is unavailable."} If you were charged, check payment status again or contact support; do not pay again.`);
    }
  }, [loadPaidReport]);

  useEffect(() => {
    const controller = new AbortController();
    paymentJson("/api/payments/status", { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setConfiguration({ checkoutEnabled: data.checkoutEnabled === true, environment: data.environment === "live_mode" ? "live_mode" : "test_mode" });
    }).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "return") void verifyPayment(params.get("reportId") || undefined, params.get("orderId") || undefined);
    return () => { controller.abort(); activeVerification.current?.abort(); };
  }, [verifyPayment]);

  useEffect(() => {
    const reportId = analysisData?.reportId;
    const token = analysisData?.reportToken || (reportId && readReportToken(reportId));
    if (!reportId || !token) return;
    try { rememberReportAccess(reportId, token); } catch { /* Checkout will explain the storage requirement. */ }
    if (new URLSearchParams(window.location.search).get("checkout") === "return") return;
    const pending = readPendingCheckout(reportId);
    if (pending) { void verifyPayment(reportId, pending.orderId); return; }
    const controller = new AbortController();
    // Restored client booleans never unlock the UI; always ask the server again.
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        void loadPaidReport(reportId, token, controller.signal).catch(() => {});
      }
    });
    return () => controller.abort();
  }, [analysisData?.reportId, analysisData?.reportToken, loadPaidReport, verifyPayment]);

  return { ...configuration, unlockedReportId, paymentState, paymentMessage, paymentReportId, verifyPayment,
    cancelPaymentFlow: () => {
      activeVerification.current?.abort();
      setPaymentState("idle"); setPaymentMessage(null); setPaymentReportId(null);
      clearPaymentReturnParameters();
    },
    refreshPaidReport: async () => {
      const id = currentData.current?.reportId;
      const token = id && (currentData.current?.reportToken || readReportToken(id));
      if (id && token) await loadPaidReport(id, token);
    },
  };
}

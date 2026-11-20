import type { AnalysisData } from "@/components/ResultsScreen";
import { isPurchaseReadiness } from "@/lib/purchase-readiness";

type PreviewCounts = NonNullable<AnalysisData["lockedPreviewCounts"]>;

/**
 * The one client-safe, fail-closed projection for a $0 report.
 *
 * A website snapshot can be read by the public scan flow, but it must never
 * make diagnosis, evidence, rewrite or prioritized instructions available in
 * the FREE report UI/React state. The authoritative paid report is fetched
 * separately after the server has verified entitlement.
 *
 * This is also used after mapping the API result because the mapper can derive
 * meaningful recommendations and quotes from the public website snapshot.
 */
export function projectFreeFrontendReport(
  data: AnalysisData,
  lockedPreviewCounts?: PreviewCounts,
): AnalysisData {
  return {
    ...data,
    verdict: "Your five clarity scores are ready. See which area may need a closer look.",
    verdictSubtext: "Scores only · Detailed evidence and fixes in Full Analysis",
    quickSignals: [],
    firstSeconds: [],
    visitorThought: "",
    evidence: {
      locationTag: "",
      homepageExcerpt: "",
      clearFindings: [],
      missingFindings: [],
    },
    signals: (Array.isArray(data.signals) ? data.signals : []).map(signal => ({
      id: signal.id,
      title: signal.title,
      score: signal.score,
      badgeText: signal.badgeText,
      badgeType: signal.badgeType,
      icon: signal.icon,
      description: "",
    })),
    websiteMessage: undefined,
    risks: [],
    recommendation: {
      title: "",
      subhead: "",
      explanation: "",
      currentDirection: "",
      strongerDirection: "",
    },
    otherImprovements: [],
    premiumWorkbench: undefined,
    supportingContext: undefined,
    purchaseReadinessLocked: data.purchaseReadinessLocked === true ||
      isPurchaseReadiness(data.purchaseReadiness) ? true : undefined,
    purchaseReadiness: undefined,
    isFreeTierOnly: true,
    // Counts reveal no evidence or fix text, and may support older UI clients.
    lockedPreviewCounts: lockedPreviewCounts ?? data.lockedPreviewCounts,
  };
}

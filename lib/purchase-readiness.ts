import type { PurchaseReadiness } from "@/types/purchase-readiness";

export function isPurchaseReadiness(value: unknown): value is PurchaseReadiness {
  const item = value as PurchaseReadiness | undefined;
  return item?.applicable === true && item.method === "purchase-evidence-v1" &&
    typeof item.score === "number" && Number.isFinite(item.score) && Number.isInteger(item.score) && item.score >= 0 && item.score <= 100 &&
    ["clear", "understandable", "partly_clear", "unclear"].includes(item.status) && typeof item.summary === "string" && !!item.summary.trim();
}

/** Redis Lua/cjson can round-trip empty arrays as {} during payment updates.
 * Normalize at the report boundary without changing stored/payment records. */
export function readPurchaseReadiness(value: unknown): PurchaseReadiness | undefined {
  if (!isPurchaseReadiness(value)) return undefined;
  const assessment = { applicable: true as const, method: value.method, score: value.score, status: value.status, summary: value.summary };
  const details = value.details;
  if (!details || typeof details !== "object") return assessment;
  const strings = (items: unknown): string[] => Array.isArray(items) ? items.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
  const evidence = (items: unknown) => Array.isArray(items) ? items.filter(x => x?.status === "verified" && typeof x.source === "string" && typeof x.text === "string" && !!x.text.trim()) : [];
  return { ...assessment, details: {
    explanation: typeof details.explanation === "string" ? details.explanation : "",
    working: strings(details.working), hesitations: strings(details.hesitations), pricingAndValueIssues: strings(details.pricingAndValueIssues),
    recommendations: strings(details.recommendations), limitations: strings(details.limitations), evidence: evidence(details.evidence),
    copyImprovements: Array.isArray(details.copyImprovements) ? details.copyImprovements.filter(x => typeof x?.current === "string" && typeof x?.suggested === "string") : [],
    dimensions: Array.isArray(details.dimensions) ? details.dimensions.filter(x => x && typeof x.label === "string" && [0,10,20].includes(x.points)).map(x => ({...x,evidence:evidence(x.evidence)})) : [],
  } };
}

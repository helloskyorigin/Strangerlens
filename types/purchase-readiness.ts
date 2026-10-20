export interface PurchaseEvidence {
  source: string;
  text: string;
  status: "verified";
}

export interface PurchaseDimension {
  key: "reasons" | "pricing" | "value" | "confidence" | "action";
  label: string;
  points: number;
  observation: string;
  evidence: PurchaseEvidence[];
}

/** Optional, separate assessment. Never part of the five clarity weights. */
export interface PurchaseReadiness {
  applicable: true;
  method: "purchase-evidence-v1";
  score: number;
  status: "clear" | "understandable" | "partly_clear" | "unclear";
  summary: string;
  details?: {
    explanation: string;
    dimensions: PurchaseDimension[];
    working: string[];
    hesitations: string[];
    pricingAndValueIssues: string[];
    recommendations: string[];
    copyImprovements: Array<{ current: string; suggested: string }>;
    evidence: PurchaseEvidence[];
    limitations: string[];
  };
}

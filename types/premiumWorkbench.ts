export type ClaritySignalKey =
  | "firstImpression" | "audience" | "value" | "trust" | "action";

export type PriorityLane = "do-first" | "quick-win" | "worth-testing" | "keep-as-is";

export interface VerifiedPageEvidence {
  text: string;
  source: string;
  element?: string;
  reason?: string;
}

/** Recommendation text is AI interpretation. Evidence is independently
 * validated website text; they must never be confused. */
export interface EvidenceFix {
  id: string;
  title: string;
  signalKey: ClaritySignalKey | null;
  reason: string;
  suggestedAction: string;
  evidence: VerifiedPageEvidence[];
  sourceAvailable: boolean;
  isPrimary: boolean;
  draftCopy?: string;
}

export interface CopyOpportunity {
  id: string;
  label: string;
  signalKey: ClaritySignalKey | null;
  recommended: string;
  originalQuote?: VerifiedPageEvidence;
  origin: "priority" | "additional";
}

export interface PriorityItem {
  id: string;
  lane: PriorityLane;
  title: string;
  reason: string;
  signalKey: ClaritySignalKey | null;
  evidenceCount: number;
  /** Suggested priority is editorial guidance, not estimated conversion lift. */
  effortNote: string;
}

export interface PremiumWorkbench {
  evidenceFixes: EvidenceFix[];
  copyOpportunities: CopyOpportunity[];
  priorities: PriorityItem[];
}

import type { WebsiteSnapshot } from "@/lib/content-extractor";
import type { FinalValidatedAnalysis, ValidatedEvidenceRef } from "@/types/validatedAnalysis";
import type { ClaritySignalKey, EvidenceFix, PremiumWorkbench, PriorityItem, PriorityLane, VerifiedPageEvidence, CopyOpportunity } from "@/types/premiumWorkbench";

const SIGNALS: Array<{ key: ClaritySignalKey; raw: keyof FinalValidatedAnalysis["signals"]; keywords: string[] }> = [
  { key: "firstImpression", raw: "first_impression", keywords: ["headline", "first impression", "hero", "product category", "positioning", "clarity"] },
  { key: "audience", raw: "audience", keywords: ["audience", "target customer", "buyer persona", "who it's for", "ideal customer", "user role"] },
  { key: "value", raw: "value", keywords: ["value", "benefit", "outcome", "differentiator", "promise"] },
  { key: "trust", raw: "trust", keywords: ["trust", "proof", "testimonial", "credib", "reviews", "policy", "reassurance"] },
  { key: "action", raw: "action", keywords: ["call to action", "cta", "sign up", "signup", "button", "click", "next step"] },
];

const clean = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 900) : "";

const verified = (values?: ValidatedEvidenceRef[]): VerifiedPageEvidence[] => {
  if (!Array.isArray(values)) return [];
  const found: VerifiedPageEvidence[] = [];
  const seen = new Set<string>();
  for (const ev of values) {
    if (!ev || ev.status !== "verified") continue;
    const text = clean(ev.text);
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    found.push({ text, source: clean(ev.source) || "Inspected website", ...(clean(ev.element) ? { element: clean(ev.element) } : {}), ...(clean(ev.reason) ? { reason: clean(ev.reason) } : {}) });
    if (found.length >= 3) break;
  }
  return found;
};

const identifySignal = (input: string): ClaritySignalKey | null => {
  const lower = input.toLowerCase();
  for (const entry of SIGNALS) {
    if (entry.key === lower || entry.key.toLowerCase() === lower || entry.raw === lower) return entry.key;
  }
  const matches = SIGNALS.map(entry => ({
    key: entry.key,
    count: entry.keywords.reduce((n, word) => n + (lower.includes(word) ? 1 : 0), 0),
  })).filter(entry => entry.count > 0).sort((a, b) => b.count - a.count);
  // Never pretend to have classified ambiguous recommendations confidently.
  return matches.length === 1 || (matches[0] && matches[0].count > (matches[1]?.count ?? 0))
    ? matches[0].key : null;
};

function priorityLane(fix: EvidenceFix): PriorityLane {
  if (fix.isPrimary) return "do-first";
  // Only compact content edits with verified source text qualify as quick wins.
  const quickEdit = /\b(?:headline|subheadline|copy|text|label|cta|button|wording|description)\b/i.test(
    `${fix.title} ${fix.suggestedAction}`
  );
  return quickEdit && fix.sourceAvailable ? "quick-win" : "worth-testing";
}

function evidenceForPrimary(
  analysis: FinalValidatedAnalysis, snapshot?: WebsiteSnapshot
): VerifiedPageEvidence[] {
  const data = verified(analysis.priority_fix.evidence);
  if (data.length) return data;
  // This is source content only when exact AI current wording agrees with the
  // extracted headline. Never label an invented AI direction as a source quote.
  const headline = clean(snapshot?.hero?.headline);
  const described = clean(analysis.priority_fix.what_you_say_now || analysis.priority_fix.current_direction);
  if (headline && described && (headline === described || headline.includes(described))) {
    return [{ text: headline, source: "Homepage hero", element: "h1" }];
  }
  return [];
}

/**
 * Produce a report workbench from authoritative paid-only analysis.
 * No further model calls, fabricated visitor data, unverified quotation,
 * fake lift estimates, or invented alternative product claims.
 */
export function buildPremiumWorkbench(
  analysis: FinalValidatedAnalysis, snapshot?: WebsiteSnapshot
): PremiumWorkbench {
  const fixes: EvidenceFix[] = [];
  const primaryEvidence = evidenceForPrimary(analysis, snapshot);
  const primaryTitle = clean(analysis.priority_fix.title);
  const primaryAction = clean(analysis.priority_fix.clearer_direction || analysis.priority_fix.suggested_direction);
  const primaryReason = clean(analysis.priority_fix.reason);
  if (primaryTitle || primaryAction || primaryReason) {
    fixes.push({
      id: "primary", title: primaryTitle || "Review the top clarity opportunity",
      signalKey: identifySignal(`${primaryTitle} ${primaryReason}`),
      reason: primaryReason,
      suggestedAction: primaryAction || primaryReason,
      evidence: primaryEvidence, sourceAvailable: primaryEvidence.length > 0,
      isPrimary: true, ...(primaryAction ? { draftCopy: primaryAction } : {}),
    });
  }
  for (let index = 0; index < (analysis.other_improvements || []).length; index++) {
    const improvement = analysis.other_improvements[index];
    const title = clean(improvement.title);
    if (!title) continue;
    const evidence = verified(improvement.evidence);
    fixes.push({
      id: `additional-${index}`,
      title,
      signalKey: identifySignal(`${title} ${clean(improvement.explanation)}`),
      reason: clean(improvement.why_it_matters || improvement.explanation),
      suggestedAction: clean(improvement.what_to_improve || improvement.explanation),
      evidence, sourceAvailable: evidence.length > 0, isPrimary: false,
      ...(clean(improvement.copyable_suggestion)
        ? { draftCopy: clean(improvement.copyable_suggestion) } : {}),
    });
  }

  const copies: CopyOpportunity[] = [];
  const seenCopy = new Set<string>();
  for (const fix of fixes) {
    const suggestion = clean(fix.draftCopy);
    if (!suggestion || seenCopy.has(suggestion.toLowerCase())) continue;
    seenCopy.add(suggestion.toLowerCase());
    copies.push({
      id: fix.id,
      label: fix.title,
      signalKey: fix.signalKey,
      recommended: suggestion,
      ...(fix.evidence[0] ? { originalQuote: fix.evidence[0] } : {}),
      origin: fix.isPrimary ? "priority" : "additional",
    });
  }

  const priorities: PriorityItem[] = fixes.map(fix => {
    const lane = priorityLane(fix);
    return {
      id: fix.id, lane, title: fix.title, signalKey: fix.signalKey,
      reason: fix.reason || fix.suggestedAction,
      evidenceCount: fix.evidence.length,
      effortNote: lane === "do-first" ? "Primary recommendation from this report"
        : lane === "quick-win" ? "Potential copy edit — verify before publishing"
        : "Review context and validate before changing",
    };
  });
  for (const entry of SIGNALS) {
    const score = analysis.signals[entry.raw]?.score;
    if (!Number.isFinite(score) || score < 80) continue;
    const strength = verified(analysis.signals[entry.raw]?.evidence);
    if (strength.length === 0) continue;
    priorities.push({
      id: `preserve-${entry.key}`, lane: "keep-as-is",
      title: `Preserve the strong ${entry.key === "firstImpression" ? "First Impression" : entry.key.charAt(0).toUpperCase() + entry.key.slice(1)} message`,
      signalKey: entry.key,
      reason: `Scored ${score}/100 with verified supporting content. Preserve this clear message unless you have a reason to test an alternative.`,
      evidenceCount: strength.length,
      effortNote: "Preserve or carefully refine — no change required by score alone",
    });
  }

  return { evidenceFixes: fixes, copyOpportunities: copies, priorities };
}

import type { WebsiteAnalysis } from "@/services/ai/analysisSchema";
import type { SupportingPagesBundle } from "@/lib/supporting-page-fetcher";

/**
 * A homepage may link to policy pages that an AI misses (or a secondary fetch
 * cannot load). A visible link is sufficient to refute a "missing links" claim;
 * it is NOT sufficient to certify the content, accessibility or compliance.
 *
 * This guard changes prose only. It never boosts Trust scores or invents proof.
 */
export function correctContradictedLegalClaims(
  analysis: WebsiteAnalysis,
  bundle?: SupportingPagesBundle
): WebsiteAnalysis {
  const knownTypes = new Set([
    ...(bundle?.candidates ?? []).map(page => page.pageType),
    ...(bundle?.pages ?? []).map(page => page.pageType),
    ...(bundle?.externalLegalLinks ?? []).map(link => link.pageType),
  ]);
  const policyNames = [
    knownTypes.has("privacy_policy") ? "Privacy Policy" : "",
    knownTypes.has("terms_of_service") ? "Terms of Service" : "",
    knownTypes.has("refund_policy") ? "Refund Policy" : "",
  ].filter(Boolean);

  if (policyNames.length === 0) return analysis;
  const corrected: WebsiteAnalysis = JSON.parse(JSON.stringify(analysis));

  const names = policyNames.join(", ");
  const grounded = `Links to ${names} were found in the accessible homepage. Their visibility near a decision point and other credibility cues may still deserve review.`;
  const saferAction = "Keep the existing policy links discoverable and consider showing a concise, factual trust reassurance near the main signup or purchase action.";

  // Only challenge absence claims about policies actually linked in the homepage.
  // Do not silence a genuine missing-refund-policy concern when only privacy exists.
  const referencesKnown = (value: string): boolean => {
    const t = value.toLowerCase();
    const explicit =
      (knownTypes.has("privacy_policy") && /\bprivacy\b/i.test(t)) ||
      (knownTypes.has("terms_of_service") && /\bterms(?: of service| and conditions)?\b/i.test(t)) ||
      (knownTypes.has("refund_policy") && /\brefund|return policy\b/i.test(t));
    const general = /\b(?:legal (?:transparency )?(?:pages?|documents?|documentation|links?|polic(?:y|ies))|polic(?:y|ies) (?:links?|pages?|documentation))\b/i.test(t);
    return Boolean(explicit || general);
  };
  const absentClaim = (value: string): boolean => {
    if (!value || !referencesKnown(value)) return false;
    // Requests to add links which are already present are also misleading.
    if (/\b(?:add|create|include|provide)\b/i.test(value) && /\b(?:links?|footer|polic(?:y|ies)|terms|privacy|legal)\b/i.test(value)) return true;
    return /\b(?:lack(?:s|ing)?|missing|absen(?:t|ce)|not (?:available|accessible|linked|provided|found|displayed)|no (?:visible |accessible )?(?:privacy|terms|legal|policy)|does not (?:provide|have|include|link|display)|without (?:privacy|terms|legal)|add (?:a |the )?(?:privacy|terms|legal|policy)|add (?:legal|policy) links|need(?:s)? (?:a |to add )?(?:privacy|terms|legal))\b/i.test(value);
  };
  const replaceClaim = (value: string): string => {
    if (!absentClaim(value)) return value;
    const mentioned = [
      /\bprivacy\b/i.test(value) ? "privacy_policy" : "",
      /\bterms\b/i.test(value) ? "terms_of_service" : "",
      /\b(?:refund|return policy)\b/i.test(value) ? "refund_policy" : "",
    ].filter(Boolean);
    const unconfirmed = mentioned.filter(type => !knownTypes.has(type));
    if (unconfirmed.length) {
      const pretty: Record<string, string> = {
        privacy_policy: "Privacy Policy", terms_of_service: "Terms of Service",
        refund_policy: "Refund Policy",
      };
      return grounded + " " + unconfirmed.map(type => pretty[type]).join(", ") +
        " could not be confirmed from the inspected homepage links.";
    }
    return grounded;
  };

  if (corrected.verdict?.text) corrected.verdict.text = replaceClaim(corrected.verdict.text);
  if (corrected.website_message) {
    corrected.website_message.summary = replaceClaim(corrected.website_message.summary);
  }
  if (corrected.visitor_thought?.text) {
    corrected.visitor_thought.text = replaceClaim(corrected.visitor_thought.text);
  }
  if (corrected.first_seconds?.why_should_i_care?.explanation) {
    corrected.first_seconds.why_should_i_care.explanation =
      replaceClaim(corrected.first_seconds.why_should_i_care.explanation);
  }
  if (corrected.signals?.trust?.explanation) {
    corrected.signals.trust.explanation = replaceClaim(corrected.signals.trust.explanation);
  }

  corrected.risks = corrected.risks?.map(risk => {
    if (![risk.title, risk.description, risk.why_it_matters].some(absentClaim)) return risk;
    return {
      ...risk,
      title: "Trust and credibility cues could be more prominent",
      description: grounded,
      why_it_matters: "Visitors benefit from finding relevant assurances without hunting through the page.",
      evidence_refs: [],
    };
  });

  if (corrected.priority_fix && Object.values(corrected.priority_fix).some(value =>
    typeof value === "string" && absentClaim(value))) {
    corrected.priority_fix = {
      title: "Surface existing trust information at decision points",
      reason: grounded,
      impact: corrected.priority_fix.impact,
      clearer_direction: saferAction,
      suggested_direction: saferAction,
      evidence_refs: [],
    };
  }

  corrected.other_improvements = corrected.other_improvements?.filter(item =>
    !Object.values(item).some(value => typeof value === "string" && absentClaim(value))
  );

  return corrected;
}

/**
 * When the ONLY stated cause of a low Trust score is a policy supposedly
 * absent, and all named policy pages were actually fetched, neutralize that
 * demonstrably false cause. Mere links, unreachable pages, or additional
 * credibility concerns do not earn any score increase.
 */
export function reconcileFalseLegalOnlyTrustPenalty(
  analysis: WebsiteAnalysis,
  bundle?: SupportingPagesBundle
): WebsiteAnalysis {
  const original = analysis.signals?.trust;
  if (!original || typeof original.score !== "number" || original.score >= 70) return analysis;
  const statement = original.explanation?.trim() || "";
  if (!/\b(?:missing|lacks?|absent|no|does not (?:have|provide|include|link)|without)\b/i.test(statement)) return analysis;
  if (!/\b(?:privacy|terms|refund|return policy|legal policy|legal pages?)\b/i.test(statement)) return analysis;
  // Other complaints require their own evaluation; policy links cannot
  // prove testimonials, credentials, security or transparent pricing.
  if (/\b(?:testimonials?|reviews?|customer proof|case stud|credential|social proof|security|not readable|outdated|inconsistent|not accessible|hidden|hard to find|pricing)\b/i.test(statement)) return analysis;
  const fetched = new Set((bundle?.pages || []).map(page => page.pageType));
  const named: string[] = [];
  if (/\bprivacy\b/i.test(statement)) named.push("privacy_policy");
  if (/\bterms\b/i.test(statement)) named.push("terms_of_service");
  if (/\b(?:refund|return policy)\b/i.test(statement)) named.push("refund_policy");
  if (named.length === 0 || !named.every(type => fetched.has(type as any))) return analysis;
  const corrected: WebsiteAnalysis = JSON.parse(JSON.stringify(analysis));
  corrected.signals.trust.score = 70;
  corrected.signals.trust.status = "understandable";
  corrected.signals.trust.confidence = "medium";
  return corrected;
}

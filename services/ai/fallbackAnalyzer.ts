import { WebsiteSnapshot } from "@/lib/content-extractor";
import { WebsiteAnalysis } from "./analysisSchema";

/**
 * Generates a high-quality deterministic fallback analysis from the WebsiteSnapshot
 * when AI providers (Groq / Gemini) hit rate limits (429) or are unavailable.
 */
export function generateDeterministicFallbackAnalysis(snapshot: WebsiteSnapshot): WebsiteAnalysis {
  const hasHeadline = Boolean(snapshot.hero?.headline && snapshot.hero.headline.length > 5);
  const hasSubheadline = Boolean(snapshot.hero?.subheadline && snapshot.hero.subheadline.length > 10);
  const hasCta = Boolean(snapshot.hero?.primaryCta || snapshot.ctas?.length > 0);
  const hasTrust = Boolean(
    (snapshot.trustSignals?.testimonials && snapshot.trustSignals.testimonials.length > 0) ||
    (snapshot.trustSignals?.statsAndMetrics && snapshot.trustSignals.statsAndMetrics.length > 0) ||
    (snapshot.trustSignals?.customerLogosAlt && snapshot.trustSignals.customerLogosAlt.length > 0)
  );
  const hasValueProps = Boolean(snapshot.valueProps?.featureCards && snapshot.valueProps.featureCards.length > 0);

  // Calculate heuristic scores (50 to 85 range)
  const firstImpressionScore = hasHeadline && hasSubheadline ? 78 : 58;
  const audienceScore = hasValueProps ? 74 : 60;
  const valueScore = hasCta && hasSubheadline ? 80 : 62;
  const trustScore = hasTrust ? 82 : 52;
  const actionScore = hasCta ? 85 : 48;

  const avgScore = Math.round((firstImpressionScore + audienceScore + valueScore + trustScore + actionScore) / 5);
  const overallStatus = avgScore >= 70 ? "clear" : "needs_improvement";

  const headlineText = snapshot.hero?.headline || snapshot.meta?.title || "Website Homepage";
  const subheadlineText = snapshot.hero?.subheadline || snapshot.meta?.description || "Clear communication and visitor value proposition.";

  return {
    analysis_version: "1.0",
    verdict: {
      status: overallStatus,
      text: overallStatus === "clear"
        ? "The website communicates its core offering clearly with visible calls to action."
        : "The website has foundational content but can significantly improve clarity and trust cues.",
    },
    first_seconds: {
      what_is_this: {
        status: hasHeadline ? "clear" : "partly_clear",
        explanation: `Headline detected: "${headlineText.slice(0, 80)}"`,
        evidence_refs: hasHeadline ? [{ source: "hero", element: "h1", text: headlineText }] : [],
      },
      who_is_it_for: {
        status: hasSubheadline ? "understandable" : "unclear",
        explanation: `Subheadline provides context: "${subheadlineText.slice(0, 90)}"`,
        evidence_refs: hasSubheadline ? [{ source: "hero", element: "p", text: subheadlineText }] : [],
      },
      what_will_i_get: {
        status: hasValueProps ? "clear" : "partly_clear",
        explanation: hasValueProps ? "Feature cards and value propositions outline what users receive." : "Value propositions are present but could be more prominent.",
        evidence_refs: [],
      },
      why_should_i_care: {
        status: hasTrust ? "clear" : "unclear",
        explanation: hasTrust ? "Trust signals and proof elements are present." : "Adding customer testimonials or stats will strengthen credibility.",
        evidence_refs: [],
      },
      what_should_i_do_next: {
        status: hasCta ? "clear" : "unclear",
        explanation: hasCta ? `Primary call to action found: "${snapshot.hero?.primaryCta?.text || snapshot.ctas?.[0]?.text || "Action"}"` : "Clear primary call to action is needed above the fold.",
        evidence_refs: hasCta ? [{ source: "hero", element: "button", text: snapshot.hero?.primaryCta?.text || snapshot.ctas?.[0]?.text || "Action" }] : [],
      },
    },
    visitor_thought: {
      text: "I want to know quickly what this product does and whether it solves my immediate problem.",
      confidence: "medium",
    },
    website_message: {
      summary: subheadlineText,
      confidence: "medium",
      evidence_refs: [],
    },
    signals: {
      first_impression: {
        score: firstImpressionScore,
        status: firstImpressionScore >= 70 ? "clear" : "needs_work",
        explanation: "Evaluates headline prominence and immediate visitor orientation.",
        confidence: "medium",
        evidence_refs: [],
      },
      audience: {
        score: audienceScore,
        status: audienceScore >= 70 ? "understandable" : "needs_work",
        explanation: "Evaluates target audience identification and messaging relevance.",
        confidence: "medium",
        evidence_refs: [],
      },
      value: {
        score: valueScore,
        status: valueScore >= 70 ? "clear" : "could_be_stronger",
        explanation: "Evaluates core benefit communication and proposition clarity.",
        confidence: "medium",
        evidence_refs: [],
      },
      trust: {
        score: trustScore,
        status: trustScore >= 70 ? "clear" : "could_be_stronger",
        explanation: "Evaluates social proof, testimonials, and trust indicators.",
        confidence: "medium",
        evidence_refs: [],
      },
      action: {
        score: actionScore,
        status: actionScore >= 70 ? "clear" : "needs_work",
        explanation: "Evaluates call-to-action prominence and conversion guidance.",
        confidence: "medium",
        evidence_refs: [],
      },
    },
    risks: [
      {
        category: "clarity",
        severity: firstImpressionScore >= 70 ? "low" : "medium",
        title: "Initial visitor orientation",
        description: "Ensuring the primary value proposition is instantly absorbed within the first 5 seconds.",
        why_it_matters: "Visitors bounce quickly if they have to search for what the product does.",
        evidence_refs: [],
      },
    ],
    priority_fix: {
      title: "Clarify the target audience and core benefit in the hero section",
      reason: "First-time visitors decide whether to stay within 5 seconds based on relevance.",
      impact: "high",
      what_you_say_now: headlineText,
      clearer_direction: "State clearly who the product is for and what problem it solves.",
      current_direction: headlineText,
      suggested_direction: "State clearly who the product is for and what problem it solves.",
      evidence_refs: [],
    },
    other_improvements: [
      {
        title: "Strengthen proof points",
        explanation: "Include verifiable metrics and testimonials above the fold.",
        why_it_matters: "Builds instant visitor confidence.",
        evidence_refs: [],
      },
    ],
  };
}

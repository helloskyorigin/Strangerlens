import { WebsiteSnapshot } from "@/lib/content-extractor";
import { SupportingPagesBundle } from "@/lib/supporting-page-fetcher";
import { SERVER_LIMITS } from "@/server/config/limits";

export const ANALYSIS_VERSION = "1.0";

/**
 * Serializes WebsiteSnapshot and fetched legal/supporting pages into a clean, token-efficient JSON format for LLM context,
 * bounded by SERVER_LIMITS.AI_MAX_INPUT_TOKENS (~4 chars/token).
 */
export function formatSnapshotForAi(
  snapshot: WebsiteSnapshot,
  supportingPagesBundle?: SupportingPagesBundle
): string {
  const compactPayload = {
    homepage: {
      meta: {
        title: snapshot.meta.title.slice(0, 300),
        description: snapshot.meta.description.slice(0, 500),
      },
      navigation: {
        brandName: snapshot.navigation.brandName?.slice(0, 120),
        navLinks: snapshot.navigation.primaryNavLinks.slice(0, 10).map((l) => l.text.slice(0, 80)),
      },
      hero: {
        headline: snapshot.hero.headline.slice(0, 400),
        subheadline: snapshot.hero.subheadline.slice(0, 600),
        primaryCta: snapshot.hero.primaryCta ? snapshot.hero.primaryCta.text.slice(0, 100) : undefined,
        secondaryCta: snapshot.hero.secondaryCta ? snapshot.hero.secondaryCta.text.slice(0, 100) : undefined,
      },
      ctas: snapshot.ctas.slice(0, 15).map((c) => ({
        text: c.text.slice(0, 100),
        type: c.type,
        location: c.location,
      })),
      valueProps: {
        topHeadings: snapshot.valueProps.headings.slice(0, 10).map((h) => `H${h.level}: ${h.text.slice(0, 200)}`),
        featureCards: snapshot.valueProps.featureCards.slice(0, 8).map((fc) => ({
          title: fc.title.slice(0, 150),
          description: fc.description.slice(0, 300),
        })),
        pricingSignals: snapshot.valueProps.pricingSignals,
      },
      trustSignals: {
        socialProofHeadings: snapshot.trustSignals.socialProofHeadings.slice(0, 8).map((s) => s.slice(0, 200)),
        statsAndMetrics: snapshot.trustSignals.statsAndMetrics.slice(0, 8).map((s) => s.slice(0, 120)),
        testimonials: snapshot.trustSignals.testimonials.slice(0, 5).map((t) => ({
          quote: t.quote.slice(0, 400),
          author: t.author?.slice(0, 100),
        })),
        badgesAndCertifications: snapshot.trustSignals.badgesAndCertifications.slice(0, 10),
        customerLogosAlt: snapshot.trustSignals.customerLogosAlt.slice(0, 15).map((c) => c.slice(0, 80)),
      },
      sections: snapshot.bodySections.slice(0, 8).map((s) => ({
        type: s.typeHint,
        heading: s.heading?.slice(0, 200),
        textSummary: s.textSummary.slice(0, 350),
        bullets: s.bulletPoints.slice(0, 6).map((b) => b.slice(0, 150)),
      })),
      forms: snapshot.forms.slice(0, 5).map((f) => ({
        type: f.typeHint,
        fieldsCount: f.fields.length,
        submitLabel: f.submitLabel?.slice(0, 100),
      })),
    },
    // A linked policy is not proof that its content was inspected.
    legalPageLinks: supportingPagesBundle?.candidates
      ? supportingPagesBundle.candidates
        .filter(p => ["privacy_policy", "terms_of_service", "refund_policy"].includes(p.pageType))
        .map(p => ({ url: p.url, type: p.pageType,
          inspected: Boolean(supportingPagesBundle.pages.some(page => page.url === p.url)) }))
      : [],
    externalPolicyLinks: supportingPagesBundle?.externalLegalLinks
      ? supportingPagesBundle.externalLegalLinks.map(link => ({
          url: link.url, type: link.pageType, inspected: false, source: "external link only",
        }))
      : [],
    legalPages: supportingPagesBundle?.pages
      ? supportingPagesBundle.pages.filter(p => ["privacy_policy", "terms_of_service", "refund_policy"].includes(p.pageType))
        .map(p => ({
          url: p.finalUrl,
          pageType: p.pageType,
          title: p.snapshot.meta.title.slice(0, 160),
          headings: p.snapshot.valueProps.headings.slice(0, 5).map(h => h.text.slice(0, 120)),
          textSummary: p.snapshot.bodySections.slice(0, 3).map(part => part.textSummary.slice(0, 200)).join(" "),
        }))
      : [],
    // The exact internal URLs matter: a claim on /pricing is not homepage proof.
    // Preserve every successfully fetched relevant linked page in the main AI pass.
    supportingPages: supportingPagesBundle?.pages
      ? supportingPagesBundle.pages.filter(p => !["privacy_policy", "terms_of_service", "refund_policy"].includes(p.pageType))
        .map(p => ({
          url: p.finalUrl,
          pageType: p.pageType,
          title: p.snapshot.meta.title.slice(0, 150),
          headline: p.snapshot.hero.headline.slice(0, 200),
          subheadline: p.snapshot.hero.subheadline.slice(0, 230),
          primaryCta: p.snapshot.hero.primaryCta?.text.slice(0, 90),
          headings: p.snapshot.valueProps.headings.slice(0, 5).map(h => h.text.slice(0, 110)),
          featureCards: p.snapshot.valueProps.featureCards.slice(0, 3).map(c => ({
            title: c.title.slice(0, 75), description: c.description.slice(0, 120),
          })),
          pricing: p.snapshot.valueProps.pricingSignals.plans.slice(0, 3).map(plan => ({
            name: plan.name?.slice(0, 70), price: plan.price?.slice(0, 70),
          })),
          trustEvidence: {
            testimonials: p.snapshot.trustSignals.testimonials.slice(0, 2).map(t => t.quote.slice(0, 120)),
            badges: p.snapshot.trustSignals.badgesAndCertifications.slice(0, 4),
          },
          sections: p.snapshot.bodySections.slice(0, 2).map(part => part.textSummary.slice(0, 170)),
        }))
      : [],
    inspection: {
      discovered: supportingPagesBundle?.discoveredCount ?? 0,
      attempted: supportingPagesBundle?.attemptedCount ?? 0,
      inspected: supportingPagesBundle?.pages.length ?? 0,
      inaccessiblePages: supportingPagesBundle?.attempts.filter(a => !a.success).map(a => ({
        url: a.url, reason: a.error,
      })) ?? [],
    },
  };

  // Compact JSON preserves every page URL and remains parseable (unlike a raw
  // substring cut through the middle of a JSON object).
  const maxChars = SERVER_LIMITS.AI_MAX_INPUT_TOKENS * 4;
  const serialized = JSON.stringify(compactPayload);
  if (serialized.length <= maxChars) return serialized;
  const compacted = {
    ...compactPayload,
    homepage: {
      ...compactPayload.homepage,
      sections: compactPayload.homepage.sections.slice(0, 4),
      ctas: compactPayload.homepage.ctas.slice(0, 8),
      valueProps: {
        ...compactPayload.homepage.valueProps,
        featureCards: compactPayload.homepage.valueProps.featureCards.slice(0, 4),
      },
    },
  };
  return JSON.stringify(compacted);
}

export const SYSTEM_PROMPT = `You are Percept, the definitive website first-impression diagnostic engine.

Your core purpose is to evaluate website clarity across five signals.

PAGE ANALYSIS SCOPE & SIGNAL BOUNDARIES:
1. First Impression → Homepage only (Hero section, headline, subheadline, above the fold).
2. Audience → Homepage only (Target audience framing and specificity).
3. Value → Homepage only (Core benefit and visitor outcome clarity).
4. Trust → Homepage + actually inspected legal and supporting pages (Privacy, Terms, Refund, About, Security, Customers when present). A linked page is supporting evidence only; never assume its published claims are independently verified.
5. Action → Homepage primary call to action clarity and prominence. Inspect the linked destination when present to assess if its promise matches the CTA, but do not award a strong homepage score for information a visitor cannot see without clicking.
6. First 5 Seconds must remain based strictly on the homepage's initial message.
7. Inspect relevant linked Pricing, Features, Product, Customers, About, Security and Solutions pages included in supportingPages. Explicitly consider whether they reinforce or contradict the homepage. Reference their real source URLs, and never invent page content.
8. If inspection.inaccessiblePages is nonempty, explain limitations rather than implying that those pages were verified.

IMPROVE TRUST ACCURACY:
- Evaluate actual evidence across homepage and legal pages: accessible privacy information, clear terms and conditions, refund information when applicable, consistency with homepage claims, discoverability of legal pages, and relevant transparency signals.
- Do not automatically award higher Trust scores merely because legal pages exist.
- Do not automatically penalize websites for missing irrelevant policies.
- Do not claim legal compliance, security certification or legitimacy.
- Verify evidence against the actual inspected page and source URL. Never invent findings or quotations.
- legalPageLinks lists observed homepage links. inspected=false means the destination content was NOT verified, not that the linked page is absent.
- The presence of a policy link does not prove legal compliance, valid policy contents, or independent credentials.
- externalPolicyLinks are observed outgoing links ONLY; never treat their destinations as fetched, verified, compliant or same-domain.

ABSOLUTE SOURCE OF TRUTH:
WebsiteSnapshot, legalPages, and supportingPages are the absolute, exclusive source of truth. You must ONLY make claims supported by the actual data.
DO NOT INVENT: features, customers, statistics, testimonials, audience, pricing, guarantees, trust signals, product capabilities, company information, or results.
If something is not present on inspected website or linked pages, state honestly that it is not clearly communicated or not found. NEVER fill gaps with assumptions.

CRITICAL CONSTRAINTS & ACCURACY RULES:
1. Grounding & Verbatim Evidence: Every quote in 'evidence_refs' MUST be EXACT, VERBATIM text from the snapshot or legal pages. Each evidence object must have source ('hero', 'section', 'cta', 'metadata', 'footer', or legal page URL), element ('h1', 'p', 'button', 'heading'), exact text, and a concise 'reason' explaining why it matters. If evidence is lacking, return [].
2. Signal Independence: The 5 signal scores (First Impression, Audience, Value, Trust, Action) are strictly independent. Score 0-100 each.
3. Score & Risk Consistency: Scores, risks, and recommendations must tell a coherent, unified diagnostic story.
- If ANY signal score is below 70, you MUST include a corresponding risk in 'risks' detailing why first-time visitors hesitate or experience friction.
- Signal score < 50 MUST be flagged as 'high' severity risk.
- Signal score 50-69 MUST be flagged as 'medium' severity risk.
- NEVER return an empty 'risks' array if any signal score is below 70 or if the overall page needs improvement.
4. Priority Fix: Select the single highest-impact improvement targeting the weakest signal. Supply a realistic, concrete rewrite in 'clearer_direction'/'suggested_direction' that maintains the product's authentic promise.
5. Other Improvements: Examine audience specificity, outcome clarity, proof, legal-page discoverability, pricing cues, forms, and CTA wording. Provide up to 5 distinct, actionable, evidence-grounded recommendations that do NOT duplicate the Priority Fix. Fewer are fine. Do not invent issues just to reach a count.
6. Risks: Include up to 6 clearly distinct concerns from inspected evidence, qualified as possible friction rather than observed visitor behavior. Do not force a risk if the evidence supports a strength.

VERSION: ${ANALYSIS_VERSION}`;

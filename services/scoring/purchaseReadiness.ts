import type { WebsiteSnapshot } from "@/lib/content-extractor";
import type { SupportingPagesBundle } from "@/lib/supporting-page-fetcher";
import type { PurchaseDimension, PurchaseEvidence, PurchaseReadiness } from "@/types/purchase-readiness";

interface PageEvidence { snapshot: WebsiteSnapshot; source: string }
const clean = (value: unknown): string => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
const positivePrice = (text: string) => [...text.matchAll(/(?:[$€£₹]\s*|\b(?:USD|EUR|GBP|INR)\s*)(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:USD|EUR|GBP|INR)\b/gi)]
  .some(match => Number((match[1] || match[2]).replace(/,/g, "")) > 0);
const purchaseCta = /\b(?:buy(?:\s+now)?|add to (?:cart|bag)|checkout|purchase|order now|shop now|upgrade(?:\s+to)?|subscribe (?:now|for)|get (?:the )?(?:paid|premium|pro) (?:plan|access))\b/i;
const quoteCta = /\b(?:get|request|ask for) (?:a |an )?(?:custom |free )?(?:quote|estimate|proposal)\b/i;
const service = /\b(?:services?|consulting|consultancy|coaching|agency|design|development|photography|training|appointments?)\b/i;
const paidOffer = /\b(?:paid (?:plans?|subscriptions?|memberships?|services?|products?)|premium (?:plans?|subscriptions?|memberships?)|pro plan|one.time (?:payment|purchase)|billed (?:monthly|annually)|subscription (?:plans?|starts?|costs?))\b/i;
const negated = /\b(?:no|without|never|not|zero)\s+(?:any\s+)?(?:paid plans?|subscriptions?|payments?|purchase|cost|fees?)\b|\b(?:don't|do not) (?:sell|charge)\b/i;
const editorial = /\b(?:blog|news|review|comparison|guide|tutorial|how to|article)\b/i;

function snippets({ snapshot: s, source }: PageEvidence): PurchaseEvidence[] {
  // Only observed extraction strings, never inferred plan periods (the old
  // extractor defaults those to /month), navigation labels, or AI prose.
  const values = [s.hero?.headline, s.hero?.subheadline,
    ...(s.valueProps?.headings || []).map(x => x.text),
    ...(s.valueProps?.featureCards || []).flatMap(x => [x.title, x.description]),
    ...(s.valueProps?.pricingSignals?.plans || []).flatMap(x => [x.name, x.price]),
    ...(s.bodySections || []).filter(x => x.typeHint !== "footer").flatMap(x => [x.heading, x.textSummary, ...x.bulletPoints]),
    ...(s.ctas || []).filter(x => x.location !== "footer" && x.type !== "utility").map(x => x.text),
    ...(s.trustSignals?.testimonials || []).map(x => x.quote),
    ...(s.trustSignals?.badgesAndCertifications || [])];
  return [...new Set(values.map(clean).filter(Boolean))].map(text => ({ source, text, status: "verified" }));
}

function identifiesOffering(page: PageEvidence, evidence: PurchaseEvidence[]): boolean {
  const s = page.snapshot;
  const ctas = (s.ctas || []).filter(x => x.location !== "footer").map(x => clean(x.text));
  const buy = ctas.some(x => purchaseCta.test(x) && !/\b(?:donat|coffee|affiliate|review|guide)/i.test(x) && !negated.test(x));
  const quote = ctas.some(x => quoteCta.test(x));
  const commercial = evidence.filter(x => !negated.test(x.text));
  const prices = commercial.some(x => positivePrice(x.text));
  const explicit = commercial.some(x => paidOffer.test(x.text));
  const pricingSection = (s.bodySections || []).some(x => x.typeHint === "pricing" && (positivePrice(x.textSummary) || paidOffer.test(x.textSummary)));
  const planPrice = (s.valueProps?.pricingSignals?.plans || []).some(x => positivePrice(clean(x.price)));
  const isEditorial = editorial.test(`${s.meta?.title || ""} ${s.hero?.headline || ""}`);
  // Reviews/affiliate articles may quote prices and link "Buy now" without
  // selling the reviewed product themselves. Require an actual offer block.
  const ownedOffer = commercial.some(x => /\b(?:our|we offer)\s+(?:paid |premium )?(?:plans?|subscriptions?|memberships?|services?|packages?|products?)\b/i.test(x.text));
  if (isEditorial && !ownedOffer) return false;
  const explicitlyFreeService = evidence.some(x => /\b(?:services? (?:are |is )?(?:completely |entirely )?free|free (?:consulting|coaching|design) services?)\b/i.test(x.text));
  const pricedService = !explicitlyFreeService && service.test(`${s.hero?.headline || ""} ${s.hero?.subheadline || ""}`) &&
    commercial.some(x => positivePrice(x.text) && /\b(?:from|starting|per (?:hour|project|session)|packages?|services?)\b/i.test(x.text));
  // A pricing link, a free plan, "subscribe" to a newsletter, or service
  // language on its own is insufficient evidence of a paid offering.
  return (prices && (buy || pricingSection || planPrice || explicit || ownedOffer || pricedService)) ||
    (explicit && (buy || pricingSection || s.valueProps?.pricingSignals?.hasPricingPageLink === true)) ||
    (quote && !explicitlyFreeService && commercial.some(x => service.test(x.text)));
}

/** Transparent presence/clarity rubric, not a conversion-rate prediction.
 * Each of five independent dimensions contributes 0, 10 or 20 points. This
 * module never reads or changes the original five scores, nor calls an LLM. */
export function assessPurchaseReadiness(snapshot: WebsiteSnapshot, supporting?: SupportingPagesBundle): PurchaseReadiness | undefined {
  const pages: PageEvidence[] = [{ snapshot, source: "homepage" },
    ...(supporting?.pages || []).map(p => ({ snapshot: p.snapshot, source: p.finalUrl }))];
  const records = pages.map(page => ({ page, evidence: snippets(page) }));
  if (!records.some(({ page, evidence }) => identifiesOffering(page, evidence))) return undefined;
  const evidence = records.flatMap(x => x.evidence);
  const find = (pattern: RegExp) => evidence.filter(x => pattern.test(x.text) && !negated.test(x.text)).slice(0, 3);
  const reason = find(/\b(?:includes?|unlocks?|access to|you get|you receive|paid (?:plan|subscription).*(?:offers?|provides?)|premium.*(?:features?|support))\b/i);
  const outcome = find(/\b(?:save (?:time|hours?|money)|automate|reduce|improve|create|build|learn|manage|protect|deliver)\b/i);
  const amounts = evidence.filter(x => positivePrice(x.text) && !negated.test(x.text)).slice(0, 3);
  const terms = find(/(?:\/\s*(?:mo(?:nth)?|yr|year)|per (?:month|year|hour|session|project)|one.time|billed|total price|tax|shipping|custom quot|quote|estimate)/i);
  const specifics = find(/\b\d+\s*(?:projects?|reports?|seats?|users?|hours?|sessions?|GB|TB|downloads?|products?)\b|\b(?:unlimited|includes?|scope|deliverables?|materials?|sizes?|dimensions?)\b/i);
  const proof = pages.flatMap(({snapshot: s, source}) => [
    ...(s.trustSignals?.testimonials || []).map(x => x.quote), ...(s.trustSignals?.badgesAndCertifications || [])
  ].map(clean).filter(Boolean).map(text => ({source,text,status:"verified" as const}))).slice(0,3);
  const policies = find(/\b(?:refund|returns?|cancel(?:lation)?|money.back|secure checkout|payment methods?|support|contact us)\b/i);
  const ctas = pages.flatMap(({snapshot: s, source}) => (s.ctas || []).filter(x => x.location !== "footer" && (purchaseCta.test(x.text) || quoteCta.test(x.text)) && !negated.test(x.text))
    .map(x => ({source,text:x.text,status:"verified" as const}))).slice(0,3);
  const clearAction = ctas.some(x => /\b(?:buy|add to (?:cart|bag)|checkout|purchase|order now|request|quote|estimate|upgrade to|subscribe for)\b/i.test(x.text));
  const dimension = (key: PurchaseDimension["key"], label: string, first: PurchaseEvidence[], second: PurchaseEvidence[], yes: string, partial: string, no: string): PurchaseDimension => ({
    key, label, points: first.length ? (second.length ? 20 : 10) : 0,
    observation: first.length ? (second.length ? yes : partial) : no,
    evidence: [...first, ...second].filter((x,i,a) => a.findIndex(y => y.source === x.source && y.text === x.text) === i),
  });
  const dimensions = [
    dimension("reasons", "Reasons to pay", reason, outcome, "Paid inclusions and an intended outcome are described in the inspected text.", "Paid inclusions are described, but their intended outcome could be more explicit.", "An explicit explanation of what payment unlocks was not identified in the inspected text."),
    dimension("pricing", "Pricing and offer transparency", amounts.length ? amounts : terms.filter(x=>quoteCta.test(x.text)), amounts.length ? terms : [], "A non-zero price and payment terms are visible in the inspected text.", amounts.length ? "A non-zero price is visible; billing, total-cost or purchase terms could be clearer." : "A quote route is visible; a price or pricing basis was not identified in the inspected text.", "A price or explicit quote route was not identified in the inspected text."),
    dimension("value", "Value communication", specifics, outcome, "Concrete inclusions and an intended outcome help describe the offer's value.", "Concrete inclusions are visible; connecting them to an intended outcome could clarify value.", "Concrete inclusions or offer scope were not identified in the inspected text."),
    dimension("confidence", "Buyer confidence", policies, proof, "Purchase/support terms and website-provided proof are visible; proof claims were not independently verified.", "Purchase/support terms are visible; website-provided proof was not identified in the inspected text.", "Purchase/support terms were not identified in the inspected text; this may leave a buyer with unanswered questions."),
    dimension("action", "Purchase next step", ctas, clearAction ? ctas : [], "An explicit purchase or quote CTA identifies the next step.", "A commercial CTA is present, but its next step could be more specific.", "An explicit purchase or quote CTA was not identified in the inspected text."),
  ];
  const score = dimensions.reduce((sum,x)=>sum+x.points,0);
  const status = score >= 80 ? "clear" : score >= 65 ? "understandable" : score >= 45 ? "partly_clear" : "unclear";
  const recommendations: Record<PurchaseDimension["key"],string> = {
    reasons: "Place the paid inclusions beside the offer and explain the intended outcome without promising unverified results.",
    pricing: "State the amount, billing unit or quote basis beside the purchase CTA, including applicable purchase terms.",
    value: "List the actual deliverables or plan limits and explain how they support the intended use.",
    confidence: "Make applicable cancellation, refund and support information easy to find; only add proof you can substantiate.",
    action: "Use a purchase-specific CTA that explains what happens next and link it to the correct purchase or quote route.",
  };
  const uniqueEvidence = dimensions.flatMap(x=>x.evidence).filter((x,i,a)=>a.findIndex(y=>y.source===x.source&&y.text===x.text)===i);
  // Only rewrite an existing unambiguous purchase action; never invent a
  // price, benefit, refund promise, or paid deliverable for copy suggestions.
  const rewrite = ctas.find(x=>/^buy now[.!]?$/i.test(x.text));
  return { applicable: true, method: "purchase-evidence-v1", score, status,
    summary: `A paid offering was identified. ${dimensions.filter(x=>x.points===20).length} of 5 purchase-communication checks have clear supporting text. This separate score is not a prediction of sales.`,
    details: {
      explanation: `Purchase Readiness scores five communication dimensions at 0, 10 or 20 points each (${score}/100). ${dimensions.map(x=>`${x.label}: ${x.points}/20.`).join(" ")} It does not change the Overall Clarity Score.`,
      dimensions, working: dimensions.filter(x=>x.points===20).map(x=>x.observation),
      hesitations: dimensions.filter(x=>x.points<20).map(x=>x.observation),
      pricingAndValueIssues: dimensions.filter(x=>["pricing","value","reasons"].includes(x.key)&&x.points<20).map(x=>x.observation),
      recommendations: dimensions.filter(x=>x.points<20).map(x=>recommendations[x.key]),
      copyImprovements: rewrite ? [{current:rewrite.text,suggested:"Continue to purchase"}] : [],
      evidence: uniqueEvidence,
      limitations: ["Only accessible extracted content was inspected; missing text is not proof that information does not exist elsewhere.", "No checkout was completed. Prices, testimonials and policy claims were not independently verified.", "This rule-based communication score is not a purchase probability or a measured conversion rate."],
    },
  };
}

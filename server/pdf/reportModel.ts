import type { StoredServerReport } from "@/server/security/reportAccess";
import { redactAnalysisForFreeTier } from "@/server/security/reportAccess";
import type { PdfFinding, PdfReportModel } from "@/types/pdf-report";
import { readPurchaseReadiness } from "@/lib/purchase-readiness";

const signalDefinitions = [
  ["first_impression", "First Impression", "what_is_this"],
  ["audience", "Audience", "who_is_it_for"],
  ["value", "Value", "what_will_i_get"],
  ["trust", "Trust", "why_should_i_care"],
  ["action", "Action", "what_should_i_do_next"],
] as const;
const questions: Record<string, string> = {
  what_is_this: "Product purpose", who_is_it_for: "Intended audience", what_will_i_get: "Visitor outcome",
  why_should_i_care: "Reason to care", what_should_i_do_next: "Next action",
};
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const strings = (value: unknown): string[] => Array.isArray(value) ? value.map(text).filter(Boolean) : text(value) ? [text(value)] : [];
const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
const score = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
const status = (value: unknown) => text(value).replace(/_/g, " ") || "Unavailable";

function category(value: string): string | null {
  const matches = [
    ["first_impression", /\b(first impression|clarity|headline|product category)\b/i],
    ["audience", /\b(audience|target user|user role)\b/i],
    ["value", /\b(value|benefit|outcome)\b/i],
    ["trust", /\b(trust|proof|credibility|testimonial)\b/i],
    ["action", /\b(action|cta|call.to.action)\b/i],
  ] as const;
  const found = matches.filter(([, pattern]) => pattern.test(value.replace(/[_-]/g, " ")));
  return found.length === 1 ? found[0][0] : null;
}

/** PDF-only projection of the ORIGINAL server report. No UI adapter fallbacks,
 * score-based claims, generated advice, or additional AI requests are used. */
export function buildPdfReportModel(stored: StoredServerReport, paid: boolean): PdfReportModel {
  const analysis = paid ? stored.fullAnalysis : redactAnalysisForFreeTier(stored.fullAnalysis);
  const risks = Array.isArray(analysis.risks) ? analysis.risks : [];
  const other = Array.isArray(analysis.other_improvements) ? analysis.other_improvements : [];
  const primary = analysis.priority_fix;
  const originalDate = new Date(stored.createdAt);
  const model: PdfReportModel = {
    tier: paid ? "paid" : "free", url: stored.normalizedUrl,
    analysisDate: Number.isFinite(originalDate.getTime()) ? originalDate.toISOString() : null,
    score: score(analysis.overall_score), status: status(analysis.overall_status), verdict: text(analysis.verdict?.text),
    signals: signalDefinitions.map(([key, title, firstKey]) => {
      const signal = analysis.signals?.[key];
      const first = analysis.first_seconds?.[firstKey];
      const extra = signal as unknown as Record<string, unknown> | undefined;
      const firstExplanation = text(first?.explanation);
      const working = paid ? strings(extra?.what_is_working ?? extra?.positive_findings) : [];
      const unclear = paid ? strings(extra?.what_is_unclear ?? extra?.concerns) : [];
      if (paid && firstExplanation) {
        if (["clear", "understandable"].includes(first?.status)) working.push(firstExplanation);
        else unclear.push(firstExplanation);
      }
      if (paid) risks.filter(r => category(r.category) === key).forEach(r => unclear.push(text(r.description)));
      const improvements = paid ? strings(extra?.recommendations ?? extra?.how_to_improve) : [];
      if (paid && primary && category(primary.title) === key) improvements.push(text(primary.clearer_direction || primary.suggested_direction || primary.reason));
      if (paid) other.filter(i => category(i.title) === key).forEach(i => improvements.push(text(i.what_to_improve || i.explanation)));
      return { title, score: score(signal?.score), status: status(signal?.status), explanation: paid ? text(signal?.explanation) : "",
        working: unique(working), unclear: unique(unclear), improvements: unique(improvements) };
    }),
    freeFindings: [], understand: [], miss: [], actions: [], evidence: [],
  };

  const purchase = paid ? readPurchaseReadiness(analysis.purchase_readiness) : undefined;
  if (purchase) {
    model.signals.push({ title: "Purchase Readiness", score: purchase.score, status: status(purchase.status), independent: true,
      explanation: paid ? text(purchase.details?.explanation) : "", working: paid ? purchase.details?.working || [] : [],
      unclear: paid ? unique([...(purchase.details?.hesitations || []), ...(purchase.details?.pricingAndValueIssues || [])]) : [],
      improvements: paid ? purchase.details?.recommendations || [] : [] });
    model.freeFindings.push({ title: "Purchase Readiness — separate assessment", paragraphs: [purchase.summary, "Not included in the Overall Clarity Score."] });
    if (paid) {
      purchase.details?.copyImprovements.forEach(copy => model.actions.push({title:"Purchase CTA copy suggestion",paragraphs:[`Current wording: ${copy.current}`,`Suggested wording: ${copy.suggested}`]}));
      if (purchase.details?.limitations.length) model.actions.push({title:"Purchase assessment scope",paragraphs:purchase.details.limitations});
    }
  }

  // These are the same findings intentionally available in the free API.
  if (text(analysis.website_message?.summary)) model.freeFindings.push({ title: "Website message", paragraphs: [text(analysis.website_message.summary)] });
  risks.slice(0, 1).forEach(r => model.freeFindings.push({ title: text(r.title) || "Biggest issue", paragraphs: unique([text(r.description), text(r.why_it_matters)]) }));
  if (primary) model.freeFindings.push({ title: text(primary.title) || "Priority fix", paragraphs: unique([text(primary.reason), text(primary.clearer_direction || primary.suggested_direction)]) });
  if (!paid) return model;

  for (const [key, value] of Object.entries(analysis.first_seconds || {})) {
    if (!text(value?.explanation)) continue;
    const destination = ["clear", "understandable"].includes(value.status) ? model.understand : model.miss;
    destination.push({ title: questions[key] || key.replace(/_/g, " "), paragraphs: [text(value.explanation)] });
  }
  model.visitorPerspective = text(analysis.visitor_thought?.text);
  if (primary) model.actions.push({ title: text(primary.title) || "Priority fix", paragraphs: unique([
    text(primary.reason), primary.what_you_say_now ? `Current wording: ${text(primary.what_you_say_now)}` : "",
    primary.clearer_direction ? `Suggested wording: ${text(primary.clearer_direction)}` : "",
    text(primary.current_direction), text(primary.suggested_direction), primary.impact ? `Impact: ${primary.impact}` : "",
  ]) });
  other.forEach(i => model.actions.push({ title: text(i.title) || "Recorded improvement", paragraphs: unique([
    text(i.explanation), text(i.why_it_matters), text(i.what_to_improve), i.copyable_suggestion ? `Copy-ready improvement: ${text(i.copyable_suggestion)}` : "",
  ]) }));
  risks.forEach(r => model.actions.push({ title: text(r.title) || "Communication risk", paragraphs: unique([text(r.description), text(r.why_it_matters)]) }));

  const seen = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    if (obj.status === "verified" && text(obj.text)) {
      const key = `${text(obj.source)}:${text(obj.element)}:${text(obj.text)}`;
      if (!seen.has(key)) {
        seen.add(key);
        model.evidence.push({ title: [text(obj.source), text(obj.element)].filter(Boolean).join(" / ") || "Website evidence", paragraphs: unique([text(obj.text), text(obj.reason)]) });
      }
    }
    for (const child of Object.values(obj)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
    }
  };
  visit(analysis);
  const context = stored.supportingContext || analysis.supportingContext;
  for (const section of [context?.messageConsistency, context?.trustContext, context?.ctaDestination]) {
    if (!section) continue;
    if (text(section.assessment)) model.evidence.push({ title: "Supporting-page assessment", paragraphs: [text(section.assessment)] });
    section.evidence?.forEach(item => {
      const key = `${item.sourceUrl}:${item.excerpt}`;
      if (text(item.excerpt) && !seen.has(key)) {
        seen.add(key);
        model.evidence.push({ title: text(item.sourceUrl) || "Supporting-page evidence", paragraphs: unique([text(item.excerpt), text(item.interpretation)]) });
      }
    });
  }
  if (context?.limitations?.length) model.evidence.push({ title: "Recorded inspection limitations", paragraphs: context.limitations.filter(Boolean) });
  return model;
}

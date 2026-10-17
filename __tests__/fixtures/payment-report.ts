export const privateText = "Premium-only explanation about the customer website";
const evidence = [{ source: "homepage", text: "Build clearer websites", status: "verified", matchType: "exact" }];
const signal = { score: 72, status: "understandable", explanation: privateText, confidence: "high", evidence_available: true, evidence };
const first = { status: "understandable", explanation: privateText, evidence_available: true, evidence };
export const paymentAnalysis: any = {
  analysis_version: "1.0", scoring_version: "1.0", overall_score: 72, overall_status: "clear",
  verdict: { text: "Your main offer is understandable." },
  first_seconds: { what_is_this: first, who_is_it_for: first, what_will_i_get: first, why_should_i_care: first, what_should_i_do_next: first },
  visitor_thought: { text: privateText, confidence: "high" },
  website_message: { summary: "A clarity product", confidence: "high", evidence_available: true, evidence },
  signals: { first_impression: signal, audience: signal, value: signal, trust: signal, action: signal },
  risks: [{ category: "trust", severity: "medium", title: "Add evidence", description: "Show a concrete example", why_it_matters: "Support the offer", evidence_available: true, evidence }],
  priority_fix: { title: "Clarify the outcome", reason: "Make the result concrete", impact: "high", what_you_say_now: "Build clearer websites", clearer_direction: "Turn confusing pages into clear offers", evidence_available: true, evidence },
  other_improvements: [{ title: "Improve CTA", explanation: privateText, copyable_suggestion: "Check my website", evidence_available: true, evidence }],
};
export const paymentSnapshot: any = {
  title: "Example", domain: "example.com", url: "https://example.com", finalUrl: "https://example.com",
  visibleText: "Build clearer websites", cleanedText: "Build clearer websites", text: "Build clearer websites",
  headings: [{ level: 1, text: "Build clearer websites" }], buttons: [{ text: "Check my website" }], links: [],
  h1: ["Build clearer websites"], h2: [], h3: [], paragraphs: ["Build clearer websites"],
  meta: { title: "Example", description: "A clarity product" },
  stats: { cleanedTextLength: 300, headingCount: 1, linkCount: 0, buttonCount: 1 },
};

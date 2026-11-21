import { describe, test, expect } from "./test-harness";
import { WebsiteSnapshot, extractWebsiteSnapshot } from "../lib/content-extractor";
import { analyzeWebsite } from "../services/ai/analyzeWebsite";
import {
  isEvidenceGrounded,
  validateAndCleanEvidence,
  extractSearchableTextsFromSnapshot,
} from "../services/ai/evidenceValidator";
import { WebsiteAnalysis } from "../services/ai/analysisSchema";
import {
  ACTIVE_GROQ_MODELS,
  clearGroqModelCache,
  GroqAIProvider,
  resolveGroqModelsForKey,
  stripReasoningAndMarkdown,
} from "../services/ai/groqProvider";

// Helper mock snapshot generator
function createMockSnapshot(overrides: Partial<WebsiteSnapshot> = {}): WebsiteSnapshot {
  return {
    meta: {
      title: "Acme SaaS - Automated Workflow Intelligence",
      description: "Build, automate, and scale your digital workflows in minutes.",
    },
    navigation: {
      brandName: "Acme",
      primaryNavLinks: [
        { text: "Features", href: "/features" },
        { text: "Pricing", href: "/pricing" },
      ],
    },
    hero: {
      headline: "Automate Your Workflow Intelligence in Minutes",
      subheadline: "Acme helps operations teams eliminate manual data entry with AI-driven pipelines.",
      primaryCta: {
        text: "Start Free Trial",
        href: "/signup",
        type: "primary",
        element: "a",
        location: "hero",
      },
    },
    ctas: [
      {
        text: "Start Free Trial",
        href: "/signup",
        type: "primary",
        element: "a",
        location: "hero",
      },
      {
        text: "Book Demo",
        href: "/demo",
        type: "secondary",
        element: "a",
        location: "hero",
      },
    ],
    valueProps: {
      headings: [
        { level: 1, text: "Automate Your Workflow Intelligence in Minutes" },
        { level: 2, text: "Built for Operations and DevOps Teams" },
      ],
      featureCards: [
        { title: "Instant Sync", description: "Sync data across 500+ apps real-time." },
        { title: "Zero Lock-in", description: "Export your workflows anytime in open formats." },
      ],
      pricingSignals: {
        hasPricingPageLink: true,
        plans: [{ name: "Pro", price: "$49", period: "/month" }],
        mentionsFreeTrial: true,
        mentionsGuarantee: true,
      },
    },
    trustSignals: {
      socialProofHeadings: ["Trusted by 10,000+ operations teams worldwide"],
      statsAndMetrics: ["99.9% Uptime", "10M+ Workflows", "$50M Saved"],
      testimonials: [
        {
          quote: "Acme saved our operations team over 20 hours every single week.",
          author: "Jane Doe",
          company: "Tech Corp",
        },
      ],
      badgesAndCertifications: ["SOC2", "ISO 27001"],
      customerLogosAlt: ["Google", "Stripe", "Shopify"],
    },
    bodySections: [
      {
        id: "section-1",
        typeHint: "hero",
        heading: "Automate Your Workflow Intelligence in Minutes",
        textSummary: "Acme helps operations teams eliminate manual data entry.",
        bulletPoints: ["Automated pipelines", "No coding required"],
      },
    ],
    forms: [],
    stats: {
      rawHtmlLength: 5000,
      cleanedTextLength: 1200,
      totalHeadings: 4,
      totalLinks: 8,
      totalImages: 3,
    },
    ...overrides,
  };
}

describe("Phase 3 AI Analysis Engine Tests", () => {
  test("1. Real SaaS homepage analysis produces grounded structured output", async () => {
    const snapshot = createMockSnapshot();
    const result = await analyzeWebsite(snapshot);

    expect(result.analysis_version).toBe("1.0");
    expect(result.signals).toHaveProperty("first_impression");
    expect(result.signals).toHaveProperty("audience");
    expect(result.signals).toHaveProperty("value");
    expect(result.signals).toHaveProperty("trust");
    expect(result.signals).toHaveProperty("action");

    // All signals must be bounded 0..100
    const signals = ["first_impression", "audience", "value", "trust", "action"] as const;
    signals.forEach((sig) => {
      expect(result.signals[sig]).toBeDefined();
      expect(result.signals[sig].score).toBeGreaterThanOrEqual(0);
      expect(result.signals[sig].score).toBeLessThanOrEqual(100);
    });

    // Phase 3 output MUST NOT contain overall score (delegated to Phase 4)
    expect(result).not.toHaveProperty("overallScore");
    expect(result).not.toHaveProperty("totalScore");
  });

  test("2. Unclear homepage analysis", async () => {
    const snapshot = createMockSnapshot({
      hero: {
        headline: "Synergistic Paradigm Shift",
        subheadline: "Unlocking organic leverage for modern human potential.",
      },
    });
    const result = await analyzeWebsite(snapshot);

    expect(result.signals.first_impression.score).toBeDefined();
    expect(result.signals).toHaveProperty("first_impression");
    expect(result.first_seconds.what_is_this.status).toBeDefined();
  });

  test("3. Fabricated evidence protection (Rejects non-existent quotes)", () => {
    const snapshot = createMockSnapshot();

    // Test text grounding function directly
    const validQuote = "Automate Your Workflow Intelligence in Minutes";
    const fakeQuote = "Trusted by 1,000,000 Fortune 500 CEOs and Apple";

    expect(isEvidenceGrounded(validQuote, extractSearchableTextsFromSnapshot(snapshot))).toBe(true);
    expect(isEvidenceGrounded(fakeQuote, extractSearchableTextsFromSnapshot(snapshot))).toBe(false);

    // Mock analysis payload with fabricated evidence reference
    const mockAnalysisWithFakeEvidence: WebsiteAnalysis = {
      analysis_version: "1.0",
      verdict: { status: "clear", text: "Test verdict" },
      first_seconds: {
        what_is_this: {
          status: "clear",
          explanation: "Test",
          evidence_refs: [
            { source: "hero", text: validQuote },
            { source: "hero", text: fakeQuote }, // Fabricated!
          ],
        },
        who_is_it_for: { status: "understandable", explanation: "Test", evidence_refs: [] },
        what_will_i_get: { status: "understandable", explanation: "Test", evidence_refs: [] },
        why_should_i_care: { status: "understandable", explanation: "Test", evidence_refs: [] },
        what_should_i_do_next: { status: "clear", explanation: "Test", evidence_refs: [] },
      },
      visitor_thought: { text: "Thought", confidence: "high" },
      signals: {
        first_impression: { score: 80, status: "clear", explanation: "Test", confidence: "high", evidence_refs: [] },
        audience: { score: 80, status: "clear", explanation: "Test", confidence: "high", evidence_refs: [] },
        value: { score: 80, status: "clear", explanation: "Test", confidence: "high", evidence_refs: [] },
        trust: { score: 80, status: "clear", explanation: "Test", confidence: "high", evidence_refs: [] },
        action: { score: 80, status: "clear", explanation: "Test", confidence: "high", evidence_refs: [] },
      },
      priority_fix: {
        title: "Test",
        reason: "Test",
        current_direction: "A",
        suggested_direction: "B",
        evidence_refs: [{ source: "hero", text: fakeQuote }], // Fabricated!
      },
      other_improvements: [],
    };

    const cleaned = validateAndCleanEvidence(mockAnalysisWithFakeEvidence, snapshot);

    // Fabricated evidence MUST be filtered out
    expect(cleaned.first_seconds.what_is_this.evidence_refs.length).toBe(1);
    expect(cleaned.first_seconds.what_is_this.evidence_refs[0].text).toBe(validQuote);
    expect(cleaned.priority_fix.evidence_refs.length).toBe(0);
  });

  test("4. Active Groq model configuration excludes all decommissioned models", () => {
    const decommissioned = [
      "llama-3.2-3b-preview",
      "llama-3.2-1b-preview",
      "gemma2-9b-it",
      "llama3-8b-8192",
      "llama3-70b-8192",
    ];
    for (const badModel of decommissioned) {
      expect((ACTIVE_GROQ_MODELS as readonly string[]).includes(badModel)).toBe(false);
    }
    expect(ACTIVE_GROQ_MODELS.includes("openai/gpt-oss-120b")).toBe(true);
    expect(ACTIVE_GROQ_MODELS.includes("openai/gpt-oss-20b")).toBe(true);
  });

  test("5. resolveGroqModelsForKey filters inaccessible 404/non-chat models and respects key allowlist", async () => {
    clearGroqModelCache();
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          data: [
            { id: "whisper-large-v3", active: true },
            { id: "meta-llama/llama-prompt-guard-2-22m", active: true },
            { id: "openai/gpt-oss-safeguard-20b", active: true },
            { id: "openai/gpt-oss-20b", active: true },
            { id: "qwen/qwen3-32b", active: true },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as unknown as typeof fetch;

    const resolved = await resolveGroqModelsForKey("gsk_test_allowlist_1", ACTIVE_GROQ_MODELS, mockFetch);
    expect(resolved).toEqual(["openai/gpt-oss-20b", "qwen/qwen3-32b"]);
    clearGroqModelCache();
  });

  test("6. GroqAIProvider handles <think> tags and uses accessible discovered models", async () => {
    clearGroqModelCache();
    const cleaned = stripReasoningAndMarkdown(
      `<think>internal reasoning</think>\n\`\`\`json\n{"ok":true}\n\`\`\``
    );
    expect(JSON.parse(cleaned)).toEqual({ ok: true });

    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    const requestedModels: string[] = [];
    try {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requestedUrls.push(url);
        if (url.endsWith("/openai/v1/models")) {
          return new Response(
            JSON.stringify({
              data: [{ id: "openai/gpt-oss-20b", active: true }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        const body = JSON.parse(String(init?.body || "{}"));
        requestedModels.push(body.model);
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    analysis_version: "1.0",
                    verdict: { status: "clear", text: "Clear SaaS value proposition." },
                    first_seconds: {
                      what_is_this: { status: "clear", explanation: "Workflow tool.", evidence_refs: [] },
                      who_is_it_for: { status: "clear", explanation: "Ops teams.", evidence_refs: [] },
                      what_will_i_get: { status: "clear", explanation: "Automation.", evidence_refs: [] },
                      why_should_i_care: { status: "understandable", explanation: "Saves time.", evidence_refs: [] },
                      what_should_i_do_next: { status: "clear", explanation: "Start Free Trial.", evidence_refs: [] },
                    },
                    visitor_thought: { text: "Looks useful for workflow automation.", confidence: "high" },
                    signals: {
                      first_impression: { score: 80, status: "clear", explanation: "Clear hero.", confidence: "high", evidence_refs: [] },
                      audience: { score: 78, status: "clear", explanation: "Ops teams.", confidence: "high", evidence_refs: [] },
                      value: { score: 80, status: "clear", explanation: "Saves time.", confidence: "high", evidence_refs: [] },
                      trust: { score: 72, status: "understandable", explanation: "Proof visible.", confidence: "medium", evidence_refs: [] },
                      action: { score: 82, status: "clear", explanation: "Visible CTA.", confidence: "high", evidence_refs: [] },
                    },
                    risks: [],
                    priority_fix: { title: "None critical", reason: "Strong baseline.", evidence_refs: [] },
                    other_improvements: [],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as typeof fetch;

      const provider = new GroqAIProvider("gsk_test_provider_key");
      const result = await provider.analyzeWebsite(createMockSnapshot());
      expect(result.analysis_version).toBe("1.0");
      expect(requestedModels).toEqual(["openai/gpt-oss-20b"]);
      expect(requestedUrls.some((u) => u.endsWith("/openai/v1/models"))).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      clearGroqModelCache();
    }
  });
});

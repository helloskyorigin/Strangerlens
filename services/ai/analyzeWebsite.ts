import { WebsiteSnapshot } from "@/lib/content-extractor";
import { SupportingPagesBundle } from "@/lib/supporting-page-fetcher";
import { WebsiteAnalysis } from "./analysisSchema";
import { GroqAIProvider } from "./groqProvider";
import { GeminiAIProvider } from "./aiProvider";
import { validateAndCleanEvidence } from "./evidenceValidator";
import { generateDeterministicFallbackAnalysis } from "./fallbackAnalyzer";

export interface AnalyzeWebsiteOptions {
  apiKey?: string;
  onSource?: (source: "groq" | "gemini" | "deterministic") => void;
}

/**
 * Main entry point for Phase 3 AI Analysis.
 * Uses configured Groq first (the StrangerLens default), with Gemini only
 * when Groq cannot produce a validated analysis, then deterministic fallback
 * to guarantee preview generation even if providers are unavailable or rate-limited.
 */
export async function analyzeWebsite(
  snapshot: WebsiteSnapshot,
  supportingPagesBundle?: SupportingPagesBundle,
  options: AnalyzeWebsiteOptions = {}
): Promise<WebsiteAnalysis> {
  let rawAnalysis: WebsiteAnalysis | null = null;
  let providerError: Error | null = null;
  let source: "groq" | "gemini" | "deterministic" = "deterministic";

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const hasGroqKey = Boolean(options.apiKey?.trim() || process.env.GROQ_API_KEY?.trim());

  const tryGemini = async () => {
    if (!hasGeminiKey || rawAnalysis) return;
    try {
      const geminiProvider = new GeminiAIProvider();
      rawAnalysis = await geminiProvider.analyzeWebsite(snapshot, supportingPagesBundle);
      if (rawAnalysis) source = "gemini";
    } catch (err: unknown) {
      const geminiErr = err instanceof Error ? err : new Error(String(err));
      console.warn("[AI-WARN] Gemini provider failed or rate limited:", geminiErr.message);
      if (!providerError) providerError = geminiErr;
    }
  };

  const tryGroq = async () => {
    if (!hasGroqKey || rawAnalysis) return;
    try {
      const groqProvider = new GroqAIProvider(options.apiKey);
      rawAnalysis = await groqProvider.analyzeWebsite(snapshot, supportingPagesBundle);
      if (rawAnalysis) source = "groq";
    } catch (err: unknown) {
      const groqErr = err instanceof Error ? err : new Error(String(err));
      console.warn("[AI-WARN] Groq provider failed or rate limited:", groqErr.message);
      if (!providerError) providerError = groqErr;
    }
  };

  // Never spend minutes on Gemini before attempting the configured Groq model.
  await tryGroq();
  if (!rawAnalysis) await tryGemini();

  // If AI providers failed or hit rate limits, use deterministic fallback analysis to ensure preview appears successfully
  if (!rawAnalysis) {
    console.log("[AI-FALLBACK] Using deterministic snapshot analyzer to guarantee instant preview generation.");
    rawAnalysis = generateDeterministicFallbackAnalysis(snapshot);
    source = "deterministic";
  }

  options.onSource?.(source);

  // 4. Validate and Clean Evidence References
  const groundedAnalysis = validateAndCleanEvidence(rawAnalysis, snapshot, supportingPagesBundle);

  return groundedAnalysis;
}

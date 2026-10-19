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
 * Tries Groq AI Provider first (primary), then Gemini AI Provider,
 * with a robust deterministic fallback analyzer to guarantee preview generation
 * even if rate limits (429) or model errors occur.
 */
export async function analyzeWebsite(
  snapshot: WebsiteSnapshot,
  supportingPagesBundle?: SupportingPagesBundle,
  options: AnalyzeWebsiteOptions = {}
): Promise<WebsiteAnalysis> {
  let rawAnalysis: WebsiteAnalysis | null = null;
  let providerError: Error | null = null;
  let source: "groq" | "gemini" | "deterministic" = "deterministic";

  // 1. Try Groq AI Provider first (Primary)
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    try {
      const groqProvider = new GroqAIProvider(options.apiKey);
      rawAnalysis = await groqProvider.analyzeWebsite(snapshot, supportingPagesBundle);
      if (rawAnalysis) source = "groq";
    } catch (err: unknown) {
      providerError = err instanceof Error ? err : new Error(String(err));
      console.warn("[AI-WARN] Groq provider failed or rate limited:", providerError.message);
    }
  }

  // 2. Fall back to Gemini if Groq failed or was unconfigured
  if (!rawAnalysis && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    try {
      const geminiProvider = new GeminiAIProvider();
      rawAnalysis = await geminiProvider.analyzeWebsite(snapshot, supportingPagesBundle);
      if (rawAnalysis) source = "gemini";
    } catch (err: unknown) {
      const geminiErr = err instanceof Error ? err : new Error(String(err));
      console.warn("[AI-WARN] Gemini provider failed or rate limited:", geminiErr.message);
      if (!providerError) providerError = geminiErr;
    }
  }

  // 3. If AI providers failed or hit rate limits, use deterministic fallback analysis to ensure preview appears successfully
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

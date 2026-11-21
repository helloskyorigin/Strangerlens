import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { WebsiteSnapshot } from "@/lib/content-extractor";
import { SupportingPagesBundle } from "@/lib/supporting-page-fetcher";
import { WebsiteAnalysis, WEBSITE_ANALYSIS_GEMINI_SCHEMA } from "./analysisSchema";
import { formatSnapshotForAi, SYSTEM_PROMPT } from "./analysisPrompt";

export interface AIProvider {
  analyzeWebsite(snapshot: WebsiteSnapshot, supportingPagesBundle?: SupportingPagesBundle): Promise<WebsiteAnalysis>;
}

export class GeminiAIProvider implements AIProvider {
  private ai: GoogleGenAI | null = null;
  // Backup only: try the fast supported candidate once, not a long model chain.
  private candidateModels = ["gemini-3.1-flash-lite"];

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }

  async analyzeWebsite(
    snapshot: WebsiteSnapshot,
    supportingPagesBundle?: SupportingPagesBundle
  ): Promise<WebsiteAnalysis> {
    if (!this.ai) {
      throw new Error("AI service unconfigured: GEMINI_API_KEY environment variable is missing on server");
    }

    const formattedInput = formatSnapshotForAi(snapshot, supportingPagesBundle);
    const userPrompt = `Perform a Percept first-impression and legal trust analysis on this WebsiteSnapshot and legalPages:\n\n${formattedInput}`;

    let lastError: Error | null = null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    try {
    for (const model of this.candidateModels) {
      if (controller.signal.aborted) break;
      const modelStart = Date.now();
      try {
        const thinkingLevel =
          model === "gemini-3.1-flash-lite"
            ? ThinkingLevel.MINIMAL
            : ThinkingLevel.LOW;
        const response = await this.ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            abortSignal: controller.signal,
            httpOptions: { timeout: 9000 },
            responseMimeType: "application/json",
            responseSchema: WEBSITE_ANALYSIS_GEMINI_SCHEMA,
            thinkingConfig: {
              thinkingLevel,
            },
          },
        });

        console.log(`[AI-PERF] Gemini model ${model} analysis generated in ${Date.now() - modelStart}ms`);

        const rawText = response.text;
        if (!rawText) {
          throw new Error("Empty response returned from AI analysis engine");
        }

        const parsed = JSON.parse(rawText) as WebsiteAnalysis;

        // Verify required top-level fields
        if (
          parsed.analysis_version === "1.0" &&
          parsed.verdict &&
          parsed.first_seconds &&
          parsed.signals
        ) {
          return parsed;
        } else {
          throw new Error("AI response structure missing required schema properties");
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Gemini AI analysis with model ${model} failed:`, lastError.message);
      }
    }

    } finally {
      clearTimeout(timer);
    }
    throw new Error(`AI website analysis failed: ${lastError?.message || "Engine timeout or invalid response"}`);
  }
}

import type { CanonicalSignal } from "@/lib/report-adapter";

export type PublicScore = { title: string; score: number | null };

export function publicScoreFromDisplay(value: string): number | null {
  const match = /^(\d{1,3})\/100$/.exec(value.trim());
  if (!match) return null;
  const score = Number(match[1]);
  return score >= 0 && score <= 100 ? score : null;
}

/** Uses only publicly available scores; never generates a paid finding. */
export function describePublicOpportunity(signals: ReadonlyArray<PublicScore>): {
  heading: string; detail: string; signal: string | null; score: number | null;
} {
  const available = signals.filter(s => typeof s.score === "number" && Number.isFinite(s.score) && s.score >= 0 && s.score <= 100);
  if (!available.length) return {
    heading: "Understand the story behind your scores",
    detail: "Unlock five detailed explanations and a practical plan for your website.",
    signal: null, score: null,
  };
  const weakest = available.reduce((a,b) => b.score! < a.score! ? b : a);
  if (weakest.score! >= 85) return {
    heading: "See what's working — and what to preserve",
    detail: "Your public scores are strong. Full Analysis explains the strengths worth keeping and where a careful improvement may help.",
    signal: weakest.title, score: weakest.score,
  };
  return {
    heading: `Explore your ${weakest.title} score`,
    detail: `${weakest.title} scored ${weakest.score}/100. Unlock why it received that score and what you can improve, plus the other four detailed signals.`,
    signal: weakest.title, score: weakest.score,
  };
}

export function canonicalPublicScores(signals: ReadonlyArray<CanonicalSignal>): PublicScore[] {
  return signals.slice(0,5).map(signal => ({title: signal.title, score: signal.score}));
}

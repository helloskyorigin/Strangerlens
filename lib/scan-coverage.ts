import type { WebsiteSnapshot } from "@/lib/content-extractor";

/**
 * Observability and minimum-data gate for static HTML scanning.
 * Never treats metadata, navigation links, CSS or JS hydration payloads
 * as proof that a meaningful homepage was inspected.
 */
export interface ScanCoverage {
  level: "sufficient" | "limited" | "unreadable";
  observedCharacters: number;
  hasHeadline: boolean;
  hasAction: boolean;
  note: string;
}

export function assessScanCoverage(snapshot: WebsiteSnapshot): ScanCoverage {
  const observedCharacters = Math.max(0, snapshot.stats?.cleanedTextLength || 0);
  const headline = (snapshot.hero?.headline || "").trim();
  const hasHeadline = headline.length >= 8;
  const hasAction = Boolean(snapshot.hero?.primaryCta?.text?.trim());
  const substantiveSections = (snapshot.bodySections || []).some(s =>
    (s.textSummary?.trim().length || 0) >= 65 ||
    Boolean(s.heading && s.heading.trim().length >= 12)
  );
  const meta = (snapshot.meta?.description || "").trim();

  // Only fail closed for an effectively empty shell. Do NOT penalize short,
  // valid minimalist sites simply for having few paragraphs.
  const unreadable = observedCharacters < 45 && !hasHeadline &&
    !hasAction && !substantiveSections;
  if (unreadable) return {
    level: "unreadable",
    observedCharacters,
    hasHeadline,
    hasAction,
    note: "We could reach this website, but its accessible HTML contains too little page content for a reliable first-impression report. It may load its content through JavaScript or restrict automated access.",
  };

  const limited = observedCharacters < 200 || (!hasHeadline && !substantiveSections) ||
    (!hasHeadline && meta.length < 20);
  return {
    level: limited ? "limited" : "sufficient",
    observedCharacters,
    hasHeadline,
    hasAction,
    note: limited
      ? "Limited page text was available in the initial HTML. Interpret these first-impression findings cautiously; JavaScript-rendered content may not have been inspected."
      : "Analyzed the accessible static website content. This is not a recorded human usability test.",
  };
}

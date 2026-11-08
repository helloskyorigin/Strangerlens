"use client";

/**
 * Deliberately empty: the 2026 Quiet AI redesign removes animated auroras,
 * floating lines and decorative gradient layers from conversion pages.
 * Keeping the component signature preserves existing callers safely.
 */
interface Props {
  variant?: "hero" | "threads" | "cta";
  className?: string;
}
export default function ChromaticAtmosphere(_props: Props) {
  return null;
}

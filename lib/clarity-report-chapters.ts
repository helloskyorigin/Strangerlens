/** Static chapter descriptions: safe to show before purchase.
 * No private findings, AI observations or paid scores belong in these strings. */
export const CLARITY_REPORT_CHAPTERS = [
  {
    key: "firstImpression",
    title: "First Impression",
    question: "What does a new visitor understand immediately?",
    focus: "Headline, product purpose, first-five-seconds comprehension",
    benefit: "See whether your homepage introduces the product quickly and clearly.",
  },
  {
    key: "audience",
    title: "Audience",
    question: "Can the right visitor tell this is for them?",
    focus: "Target visitors, positioning, relevance and terminology",
    benefit: "Understand how well your page speaks to its intended audience.",
  },
  {
    key: "value",
    title: "Value",
    question: "Is the reason to choose your product obvious?",
    focus: "Benefits, differentiators and product promise",
    benefit: "Explore how clearly your website communicates the outcome it offers.",
  },
  {
    key: "trust",
    title: "Trust",
    question: "What reassures visitors, and what might leave doubts?",
    focus: "Credibility cues, transparency and buyer reassurance",
    benefit: "Review the trust evidence visible in the content StrangerLens inspected.",
  },
  {
    key: "action",
    title: "Action",
    question: "Do visitors know what to do next?",
    focus: "Main CTA, expectations and next-step clarity",
    benefit: "Inspect whether the desired next action feels clear and understandable.",
  },
] as const;

export type ClarityChapterKey = typeof CLARITY_REPORT_CHAPTERS[number]["key"];

export const BRAND_NAME = "StrangerLens";

export const LEGAL_CONFIG = {
  brandName: BRAND_NAME,
  productName: BRAND_NAME,
  tagline: "AI Website First-Impression Clarity Analyzer",
  supportEmail: "hello.skyworking@gmail.com",
  billingSupportNote:
    "For order receipts, payment inquiries, or report delivery questions, please email hello.skyworking@gmail.com with your analyzed URL and order details.",
  supportResponseWindow: "Within 24–48 business hours (Monday–Friday)",
  effectiveDate: "October 16, 2026",
  lastUpdated: "November 21, 2026",
  pricing: {
    freeTier: {
      name: "Free Preview",
      price: "$0",
      billingType: "Free (No credit card or account required)",
      summary:
        "Score-only clarity preview. Includes the overall clarity score, five signal scores and statuses (First Impression, Audience, Value, Trust, Action), and identification of the lowest-scoring area. Detailed evidence, diagnosis and fixes are available only in the paid report.",
    },
    singleReport: {
      name: "Full Clarity Report",
      price: "$9 USD",
      billingType: "One-time payment · No subscription",
      summary:
        "Five detailed signal analyses with observed evidence when available, prioritized improvement plan, editable copy suggestions, First 5 Seconds assessment, Premium PDF, and Purchase Readiness when a paid offer is detected.",
    },

  },
  refundPolicySummary:
    "Digital report purchases are generated on-demand and delivered digitally. StrangerLens does not offer an unconditional voluntary money-back guarantee, but statutory consumer protection rights under applicable law are fully respected. Available checkout is processed through Dodo Payments.",
  paymentProvider: {
    plannedProvider: "Dodo Payments",
    disclosure:
      "Payments for unlocked reports are processed by Dodo Payments, subject to checkout availability.",
  },
  links: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Contact Support", href: "/contact" },
  ] as const,
};

/**
 * Directly opens a Gmail compose draft instead of delegating to the browser's
 * arbitrary mailto: protocol handler (which may be misconfigured).
 * No report details or personal data are placed into the URL.
 */
export function getSupportGmailComposeUrl(subject?: string): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: LEGAL_CONFIG.supportEmail,
  });
  if (subject) params.set("su", subject);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

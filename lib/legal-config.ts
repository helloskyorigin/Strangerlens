export const BRAND_NAME = "StrangerLens";

export const LEGAL_CONFIG = {
  brandName: BRAND_NAME,
  productName: BRAND_NAME,
  tagline: "AI Website First-Impression Clarity Analyzer",
  supportEmail: "hello.skyorigin@gmail.com",
  billingSupportNote:
    "For order receipts, payment inquiries, or report delivery questions, please email hello.skyorigin@gmail.com with your analyzed URL and order details.",
  supportResponseWindow: "Within 24–48 business hours (Monday–Friday)",
  effectiveDate: "October 16, 2026",
  lastUpdated: "October 21, 2026",
  pricing: {
    freeTier: {
      name: "Free Preview",
      price: "$0",
      billingType: "Free (No credit card or account required)",
      summary:
        "Instant clarity diagnosis. Includes overall website clarity score, five clarity signal scores (First Impression, Audience, Value, Trust, Action), and five signal statuses.",
    },
    singleReport: {
      name: "Full Clarity Report",
      price: "$3 USD",
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
      "Checkout is processed through Dodo Payments when available. Test checkout is labeled clearly and does not charge real money.",
  },
  links: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Contact Support", href: "/contact" },
  ] as const,
};

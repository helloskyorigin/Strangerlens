# Purchase Readiness

The optional `purchase_readiness` field is created during server validation and
saved with the original report. Old reports without it remain five-signal reports;
opening or exporting a report never triggers a new scan or assessment.

Eligibility requires observed commercial evidence: a non-zero offer price with a
purchase CTA or pricing block, explicit paid plans with commercial context, or a
service offer with an explicit quote route. A pricing link, free plan, newsletter
subscription or generic service description alone is insufficient. Reviews,
affiliate articles and donation-only sites are excluded conservatively.

The `purchase-evidence-v1` rubric uses only accessible extracted text from the
homepage and any supporting pages the existing pipeline already fetched. It makes
no extra network/AI requests and does not change the existing five-signal AI prompt,
normalization, weights, overall score, or priority ordering.

Each dimension contributes 0, 10 or 20 points:

| Dimension | Supporting observations |
| --- | --- |
| Reasons to pay | Paid inclusions, then an intended outcome |
| Pricing transparency | A non-zero amount, then visible billing/purchase terms; quote-only offers receive partial credit |
| Value communication | Concrete inclusions/scope, then an intended outcome |
| Buyer confidence | Purchase/support terms, then website-provided proof |
| Purchase next step | Commercial CTA, then an explicit purchase/quote action |

This is a rule-based communication assessment, not a probability of purchase,
conversion measurement, verification of testimonials, or a guarantee of sales.
Missing content means it was not identified in the accessible extraction, not that
it is absent everywhere. Conservative detection can omit a monetized site if its
paid offering is only available behind scripts, login, or unfetched pages.

Free APIs return only the boolean `purchase_readiness_locked: true` applicability
marker. No sixth-signal score, status, summary, findings, evidence or fixes are sent
to unpaid browsers. The frontend maps this to `purchaseReadinessLocked` and displays
a premium locked card after Action with the existing $5 checkout CTA. Full scores
and findings stay in the stored paid report. Free PDFs and legacy PDF fallbacks
export only the original five signals, even if client state contains an older
assessment. Verified premium PDFs include the applicable sixth assessment. Existing ownership and payment entitlement checks protect
both full-report retrieval and PDF data. Refunded access remains denied.

The original five canonical keys and `signalsList` remain unchanged. Results append
the optional paid row after Action and expose a matching paid diagnostic tab. Paid
PDF and paid share exports label its score as independent. Free share exports keep
only the five public scores. No database migration is needed.

Run `npm run test:purchase-readiness`, the existing regression suite, and PDF/history
tests (with their disposable local Redis database) before releasing.

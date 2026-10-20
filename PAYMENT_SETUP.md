# StrangerLens payment setup

The application uses Dodo hosted checkout for the single $3 report. No account signup is required. Report ownership uses a random browser-held capability; payment completion is checked on the server against the checkout session, payment metadata, product, quantity, report, and environment. Browser return parameters never grant access.

## Hosting configuration

Add these server environment variables to the host running this repository (Cloud Run, Vercel, or another Node host), then redeploy:

- `DODO_PAYMENTS_API_KEY`: Dodo secret API key.
- `DODO_PRODUCT_ID`: the one-time $3 product from the same Dodo environment as the key. Configure the actual product price in Dodo.
- `DODO_ENVIRONMENT`: `test_mode` for testing; `live_mode` only with the live key and live product.
- `NEXT_PUBLIC_APP_URL`: your website origin, e.g. `https://strangerlens.ai.studio`. Optional; otherwise the incoming request origin is used.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: the REST URL and read/write token of a durable Upstash Redis database. Vercel Marketplace's `KV_REST_API_URL` / `KV_REST_API_TOKEN` aliases also work.

Do not expose API keys, Redis tokens or webhook secrets as `NEXT_PUBLIC_*` variables. The old `NEXT_PUBLIC_ENABLE_CHECKOUT` flag and Paddle credentials are no longer used. Availability and mode come from `/api/payments/status` at runtime.

Create a durable Redis database through the Upstash console or your hosting marketplace. Use a non-evicting database with enough capacity for retained reports. Configure provider persistence/backups to suit your retention needs. This repository cannot provision a database or set hosting secrets without access to the corresponding account. Missing storage disables checkout in both modes; free previews remain available temporarily. A configured storage outage returns an error rather than silently falling back to a different store.

## Webhook (recommended for reliable delivery and refund updates)

In Dodo Developer → Webhooks, add `https://YOUR_DOMAIN/api/payments/webhook` for `payment.succeeded`, `payment.failed`, `payment.cancelled`, and `refund.succeeded`. Set the signing secret as `DODO_PAYMENTS_WEBHOOK_KEY` on the host. Configure it separately for test/live environments. The handler verifies the raw payload signature and fetches current payment state before updating access. Duplicate deliveries are idempotent; failures return a non-2xx response so Dodo retries. Do not configure unrelated products to reuse this application's metadata.

Without the webhook, returning customers still unlock using authenticated server-to-server verification. Webhooks are needed to update refunded payments automatically while the customer is away.

## Report retention and recovery

Unpaid reports and pending orders expire after 30 days in shared storage. Successfully verified paid reports and their orders/payment bindings have no automatic Redis expiry. The temporary no-database preview fallback expires after one hour and can never be purchased.

The same browser keeps report access tokens and pending checkout references in local storage; the active report is kept in session storage. Payment return restores the original report without a new AI scan. Clearing site data or changing devices removes anonymous access. Support can investigate using the receipt payment ID and the stored `sl:v1:payment:ENVIRONMENT:PAYMENT_ID` binding; do not grant access merely because someone knows a public URL or payment ID. This version does not include automated email/account-based recovery.

## Validation before live use

1. Set test credentials and Redis variables; redeploy and confirm `/api/payments/status` shows checkout enabled in `test_mode`.
2. Run a new free scan. Old pre-update reports do not contain the required report token; scan again once after upgrading.
3. Open checkout from that report and complete a Dodo test payment. The report should unlock after server verification.
4. Refresh the report, retry the return URL, restart/redeploy the server, and confirm the same browser can reopen paid content without rescanning or paying again.
5. Cancel a test checkout; simulate a pending/failed payment; verify forged success URLs and another report's token cannot unlock content. Test signed webhook retries and a full refund.
6. Only then switch key, product, environment and webhook configuration together to live mode and redeploy. Test-mode purchases never grant live-mode access.

## Developer checks

Use Node.js 20 or newer and npm. `package-lock.json` is the authoritative lockfile; the obsolete Bun lockfile has been removed.

`npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.

The payment integration suite uses an isolated real Redis database plus mocked Dodo responses. Start a disposable Redis locally, set `PAYMENT_TEST_REDIS_URL=redis://127.0.0.1:6379/15`, and run `npm run test:payments`. The suite accepts only localhost database 15 and clears that dedicated test database. No real charges occur in these automated tests.

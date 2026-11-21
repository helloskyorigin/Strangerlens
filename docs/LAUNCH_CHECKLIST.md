# StrangerLens launch verification

Code quality is checked by GitHub Actions; a green build does **not** verify production credentials or a real purchase.

## Required checks on the deployed public URL

- [ ] Confirm the latest GitHub `main` SHA is actually deployed (AI Studio previews are not updated by a GitHub push automatically).
- [ ] Configure `NEXT_PUBLIC_APP_URL` to the correct public HTTPS origin, with the correct support contact.
- [ ] Configure the AI provider and Redis credentials. Test a real public website and a site with Privacy, Terms, and Refund pages; ensure legal pages are not falsely flagged as absent.
- [ ] Confirm `DODO_ENVIRONMENT=live_mode` and the live Dodo product is an **active USD $9 one-time product (900 cents)**; the checkout API validates it before charging.
- [ ] Configure the matching live Dodo API key and webhook signing key; test verified paid access end-to-end using an authorized small real purchase.
- [ ] Confirm paid report persists on reload and after payment return, can open all five report cards, and the full PDF downloads correctly on Android/mobile and desktop.
- [ ] Confirm the five round Clarity Signal info controls can be tapped, are readable on 320px screens, and close on outside tap or Escape.
- [ ] Check support/legal pages, contact links, loading/error states, narrow-screen layout, and rate-limit behavior on the actual hosted origin.

Never put API keys in client-side environment variables or the repository. Do not claim real-payment or live-deployment verification solely from mocked automated tests.

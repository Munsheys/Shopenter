# Shopenter — Cross-Functional Assessment (2026-07-13)

Comprehensive audit across business, architecture, backend, frontend, legal, and
operations. Findings are grounded in the current codebase and git history only —
there is no external analytics, billing ledger, or usage data available, so
business figures are explicitly caveated where real metrics don't exist.

Team context for all findings below: `git shortlog` shows a solo founder
("Munsheys") working with an AI pair-programmer ("Claude"), 59 commits between
2026-06-05 and 2026-06-21, nothing committed since — this explains the absence
of CI/tests and the documentation sprawl noted throughout.

---

## 1. Business

Shopenter is a multi-tenant SaaS for Thai SME merchants selling through LINE
Official Account: product/order management, a public storefront, LINE chat
and broadcast messaging, and PromptPay QR payments. Three pricing tiers exist
in code (`src/lib/tiers.ts`: Free / Pro $299 / Enterprise), with trial
(14–30 day) auto-downgrade-to-Free churn handling and a self-corrected
affiliate/referral program (commit `f32dd07` fixed a real incentive-abuse bug
where referrers could earn a free year of Pro without any paid conversion).
**No real usage, revenue, or user-count data exists anywhere in this repo** —
figures like "1000+ Active Shops, 50K+ Monthly Orders" appear only as unused
placeholder copy in stale planning docs, not in the current landing page or
any live data source.

**Top opportunities:**
- Wire up a real payment processor — `billing/checkout` currently just flips
  a DB flag to "paid" with no actual charge, meaning Pro/Enterprise **cannot
  currently generate revenue**.
- Re-enable SlipOK automatic payment-slip verification (see Backend) — it's
  a core trust/automation feature for the PromptPay flow and is currently
  hard-disabled.

**Health: Yellow** (product structure is coherent and reasonably mature;
caveated because the two revenue-critical paths — billing and slip
verification — are both non-functional today, and no real performance data
exists to assess business health directly).

---

## 2. Architecture

Next.js 16 App Router + Mongoose/MongoDB + Cloudflare R2 for media, with two
Vercel cron jobs and no queue/cache layer. 60+ API routes are cleanly
namespaced by domain (`/api/merchant/*`, `/api/storefront/[merchantId]/*`,
`/api/webhooks/*`) with consistent tenant-scoping conventions, and the R2
media migration is complete with sane backward compatibility. There is no
service/repository layer, however — business logic lives directly in route
handlers, and there is no rate limiting anywhere in the app.

**Top opportunities:**
- Extract a thin service layer out of route handlers, starting with
  `src/app/api/webhook/route.ts` (522 lines mixing LINE parsing, SlipOK
  verification, order matching, and messaging in one handler).
- Add basic rate limiting to public storefront and webhook endpoints before
  scaling traffic further.

**Health: Yellow**

---

## 3. Backend

Serverless hygiene is generally good: MongoDB connections are cached and
pooled correctly across invocations (`src/lib/db.ts`), and a recent fix
(commit `a80413b`) correctly bounds SSE stream duration to avoid Vercel
function timeouts. Query optimization is inconsistent, though — `.lean()` is
used in only 58 of 125+ find calls — and the trial-expiry cron loops over
commissions with per-item queries (N+1, fine at current volume, won't scale).
SlipOK slip verification is intentionally disabled via a hardcoded kill
switch (`SLIPOK_ENABLED = false` in `webhook/route.ts:425`), and
`/api/dev/seed` has no production guard — any authenticated merchant can hit
it and wipe/reseed their own live order/message/loyalty data.

**Top opportunities:**
- Gate `/api/dev/seed` (and similar debug routes) behind an explicit
  `NODE_ENV !== 'production'` check.
- Standardize `.lean()` on all read-only queries and batch the trial-expiry
  cron's per-item commission updates.

**Health: Yellow**

---

## 4. Frontend

`src/app` and `src/components` are organized sensibly by domain, and recent
work shows real craftsmanship: correct `Suspense` boundaries around every
`useSearchParams()` call, `prefers-reduced-motion` support, and an accessible
skeleton-loading pattern with proper ARIA on the main storefront view. The
biggest issue is that **two independent, divergent storefront
implementations exist** (`src/app/shop/page.tsx` and
`src/components/StorefrontView.tsx`) with separate cart logic, separate
design systems, and inconsistent accessibility/loading polish between them.
There is also no use of `next/image` anywhere (45 raw `<img>` tags) despite
`remotePatterns` already being configured, and only one route-level
`error.tsx` exists app-wide.

**Top opportunities:**
- Unify the two storefront implementations into one source of truth to stop
  UX/accessibility drift between them.
- Adopt `next/image` for product/avatar images, and add a mobile preview mode
  to the storefront customizer (its live preview is desktop-only despite the
  real storefront being mobile-first for LINE's in-app browser).

**Health: Yellow**

---

## 5. Legal & Compliance

**No legal or compliance layer exists at all.** There is no privacy policy,
terms of service, or cookie-consent mechanism anywhere in the app, and no
GDPR/PDPA-related text appears anywhere in the codebase or docs. There is
also no `LICENSE` file and no `license` field in `package.json` — the
project's legal status as proprietary vs. open source is undefined. This
matters concretely because the app stores customer PII in plaintext
(`CustomerSchema`) and ingests images of customers' bank payment slips via
SlipOK, with no documented retention, deletion, or consent handling — real
exposure under Thailand's PDPA given the product's explicit Thai-market
focus.

**Top opportunities:**
- Add a privacy policy, terms of service, and basic consent/retention
  handling for customer PII and payment-slip images before any real
  production traffic.
- Add an explicit license (or copyright/proprietary notice) to the
  repository and `package.json`.

**Health: Red**

---

## 6. Other (DevOps, Security, Testing, Documentation)

**Testing: Red.** Zero automated tests exist (no jest/vitest, no test files).
`TEST_SCRIPT.sh` is a manual curl script with no assertions and isn't run in
CI — there is no CI at all (no `.github/workflows`). Deployment is entirely
manual, following instructions in docs that still reference the original
author's local machine path.

**Security: Yellow.** Solid primitives (bcrypt at 12 rounds, JWT secret
length enforcement, httpOnly/secure cookies), but no rate limiting on
login/signup endpoints, and the unguarded `/api/dev/seed` endpoint noted
above.

**Documentation: Red (sprawl).** 19+ overlapping root-level status/planning
docs (`COMPLETE.txt`, `SETUP_COMPLETE.txt`, `FIX_APPLIED.md`,
`RUNTIME_FIX_COMPLETE.md`, etc.) read as one-off AI-session reports rather
than living docs, and several are confirmed stale or contradicted by the
current codebase (e.g. `FIX_APPLIED.md` claims 33 routes; the repo has 67).

**Top opportunities:**
- Add a minimal CI workflow (`build` + `lint` on PR) and a small Vitest/Jest
  suite for the highest-risk correctness surface (auth, multi-tenant
  scoping).
- Archive the ~10 stale status-report docs and consolidate around one
  maintained README/deployment guide.

---

## Prioritized Improvements (Highest Impact First)

1. **Legal/PDPA exposure** — no privacy policy, consent, or retention
   handling for customer PII and payment-slip images in a jurisdiction with
   an active data-protection law. Highest real-world risk of the entire
   audit.
2. **No functioning payment processor** — `billing/checkout` doesn't
   actually charge anyone; the business cannot currently earn revenue from
   its own pricing tiers.
3. **Unguarded `/api/dev/seed` in production** and **no rate limiting on
   auth endpoints** — concrete data-loss and brute-force risk with a simple
   fix (`NODE_ENV` guard, basic throttling).
4. **Zero automated tests and no CI** — the single largest quality risk as
   a solo/AI-assisted team keeps shipping features without a safety net.
5. **Duplicate storefront implementations** in the frontend — actively
   diverging in UX/accessibility quality; consolidate to stop the drift.
6. **Re-enable SlipOK verification** and **add a service layer +
   rate limiting** to the backend/architecture — both currently-disabled
   or missing pieces block the product's core automation promise and its
   ability to scale safely.
7. **Documentation sprawl and missing LICENSE** — lower urgency, but cheap
   to fix and currently create real risk of stale docs misleading a new
   contributor or auditor.

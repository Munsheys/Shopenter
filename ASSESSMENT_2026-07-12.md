# Shopenter — Cross-Functional Assessment (2026-07-12)

Scope: business posture, architecture, backend, frontend, legal/compliance, and
DevOps/security/testing/docs, based on a review of the current codebase
(`claude/busy-lamport-fyefd0` @ `main`).

## 1. Business

Shopenter is a multi-tenant SaaS letting Thai/SEA merchants run a social-commerce
storefront on top of LINE Official Account messaging (Telegram/Instagram planned),
with PromptPay QR payments and SlipOK slip verification. Monetization is a
Free/Pro (฿299/mo)/Enterprise tier model with 14–30 day trials, a genuinely
thoughtful affiliate program (redesigned in commit `f32dd07` around acquisition
rather than "free-year farming"), and a loyalty/points system as a Pro retention
lever. Git history is only ~59 commits over ~2 weeks — this is an early-stage,
fast-moving prototype approaching MVP, not a business with external users or
revenue evidence yet.

**Top opportunities:**
- No real payment processor is wired into `billing/checkout` — it flips a
  merchant's tier to "paid" on request with no payment verification. Monetization
  is currently unenforceable; this blocks real revenue collection.
- Documentation (20+ root-level "COMPLETE"/status docs) is running well ahead of
  validated usage — worth grounding the roadmap in real merchant feedback once
  any exist.

**Health: Yellow** — real product iteration and a sound growth-mechanism design, but no live payment collection and no usage/revenue evidence yet.

## 2. Architecture

Next.js 16 / React 19 / TypeScript App Router on Vercel, MongoDB via Mongoose,
JWT-in-cookie auth, LINE Bot SDK/LIFF, Cloudflare R2 for media, PromptPay QR for
payments. ~150 API route handlers across ~34 domains — a single-tier monolith,
no separate services. Multi-tenancy is row-level (`merchantId` on every
document) enforced entirely by convention in each handler, not by the database —
ARCHITECTURE_VISUAL.md itself flags this as a fragile invariant.

**Top risks:**
- Manual per-query tenant filtering with no DB-enforced isolation: one missed
  `merchantId` filter in any of ~150 routes is a cross-tenant data leak, and
  nothing in the codebase would catch it.
- Serverless (Vercel) + stateful cron jobs and SSE streams mixed into the same
  app raises connection-pool exhaustion and cron-reliability risk as usage
  scales.

**Health: Yellow** — coherent stack for current scale, but tenant isolation and stateful workloads depend on developer discipline rather than structural guarantees.

## 3. Backend

~150 hand-rolled route handlers, no shared validation/middleware layer, no
`zod` anywhere — every route repeats its own `dbConnect()`/try-catch/auth
boilerplate with inconsistent rigor. Auth via a consistent `getMerchantFromRequest`
helper; spot-checked mutation routes correctly verify ownership
(`findOne({_id, merchantId})`) before acting, and storefront/webhook routes
recompute prices server-side rather than trusting client input. No hardcoded
secrets; `JWT_SECRET` is validated at startup.

**Top concerns:**
- Zero automated backend tests. Tenant-isolation correctness (the architecture's
  single biggest risk) is verified only by manual review, with no regression
  safety net.
- No shared validation/error-handling layer means the ~150-route boilerplate
  will drift further out of sync as the API surface grows.

**Health: Yellow** — auth/tenant scoping look solid in the sample reviewed, but there's no test suite to keep it that way as the codebase grows.

## 4. Frontend

Next.js App Router + Tailwind v4, no state-management or form-validation
library — plain `useState`/`useEffect` inside large monolithic `"use client"`
page components (`admin/page.tsx` 1370 lines, `shop/page.tsx` 884 lines,
`dashboard/page.tsx` 831 lines). Reasonable responsive-design effort
(~242 breakpoint usages) and decent a11y attributes on admin views, but sparse
on the customer-facing storefront. Only one `error.tsx`, no `loading.tsx`
anywhere, no Suspense/server-component data fetching despite the App Router
supporting it.

**Top issues:**
- Zero frontend tests (Playwright is a listed dependency with no config or
  specs — dead weight).
- Giant client-only page components with no loading states hurt initial load
  performance and make the codebase harder to maintain as features accrue.

**Health: Yellow** — consistent visual design, but no tests and a monolithic-component pattern that will get more expensive to change over time.

## 5. Legal / Compliance

No LICENSE file (dependencies are MIT/Apache/BSD/ISC — nothing blocking
commercial use). No privacy policy, terms of service, or cookie-consent
surface anywhere in the app. Customer PII (name, phone, addresses, LINE/IG/
Telegram user IDs) is stored in **plaintext** with **no delete/erasure
endpoint** for Customer records — no right-to-be-forgotten path. A superadmin
endpoint (`api/admin/system`) exposes merchant emails/aggregate data behind
only a static header secret, with no rate limiting. Billing avoids PCI scope
entirely (PromptPay QR + SlipOK, no card data touched) — but as noted above,
checkout doesn't actually verify payment yet.

**Top risks:**
- No PDPA/GDPR consent flow or privacy policy for a Thailand/Japan-facing app
  that stores real customer PII — material regulatory exposure once real
  users are onboarded.
- No data-deletion capability for customer records.

**Health: Yellow** — PCI risk well avoided, but the PII-handling/consent gap is a real compliance issue that needs to close before onboarding real merchants and their customers.

## 6. DevOps / Security / Testing / Documentation

No CI of any kind (no `.github/workflows`, no Dockerfile) — deployment is a
manual Vercel click-through documented across five overlapping prose
checklists. `middleware.ts` does only path-based redirects: no CSP/HSTS
headers, no CSRF protection, no rate limiting anywhere. The Instagram webhook
signature check **skips verification entirely if `APP_SECRET` is unset** —
a fail-open bug worth fixing directly. No secrets are committed to the repo
(good). Zero automated tests anywhere in the codebase (Playwright is installed
but unused). 20+ root-level markdown/txt docs read as AI-assisted per-session
status reports rather than a maintained knowledge base — sprawl without the
tests/CI to back the implied confidence.

**Top risks:**
- No CI/test gate before deploy, on a monolith with no test coverage, is the
  single largest reliability risk across the whole assessment.
- Fail-open webhook signature verification and absent security headers/rate
  limiting are concrete, fixable security gaps.

**Health: Red** — high feature velocity with no automated safety net (no CI, no tests, no security headers/rate limiting); production risk is high relative to the doc volume's implied maturity.

## Prioritized Improvements (highest impact first)

1. **Stand up CI** (lint + typecheck + a minimal smoke test) gating every push/PR — today nothing stops a regression from reaching Vercel. *(DevOps, Red)*
2. **Add automated tests**, starting with the tenant-isolation-critical API routes (billing, orders, customers) — this is the one gap that, left alone, will eventually cause a cross-tenant data leak with no detection. *(Backend/Architecture, Yellow)*
3. **Wire a real payment processor into billing/checkout** so tier upgrades require actual payment verification — without this the business has no way to collect revenue. *(Business, Yellow)*
4. **Fix the fail-open Instagram webhook signature check** and add baseline security headers (CSP/HSTS) + rate limiting on auth/webhook endpoints. *(Security, Red)*
5. **Add a privacy policy/consent flow and a customer data-deletion endpoint** before onboarding real merchants — closes the most material legal exposure. *(Legal, Yellow)*
6. **Introduce a shared validation/middleware layer** (e.g. a `zod`-validated route wrapper with built-in `merchantId` scoping) to remove the single-point-of-failure pattern in ~150 hand-rolled routes and prevent future isolation bugs by construction. *(Backend/Architecture, Yellow)*
7. **Consolidate the docs**: retire the 20+ overlapping "COMPLETE"/status .md files into one living ARCHITECTURE.md + CHANGELOG, freeing attention for the process gaps above. *(Docs, Red)*

## Overall

| Area | Health |
|---|---|
| Business | Yellow |
| Architecture | Yellow |
| Backend | Yellow |
| Frontend | Yellow |
| Legal | Yellow |
| DevOps/Security/Testing/Docs | Red |

The product itself is more built and more thoughtfully designed (affiliate/loyalty
mechanics, tenant-scoped data model) than the stale planning docs suggest. The
consistent theme across every area, though, is **no safety net**: no CI, no
tests, no enforced tenant isolation, no payment verification, no consent flow.
None of these are individually hard to fix, but together they are the gap
between "prototype that works when nothing goes wrong" and "SaaS that can take
on real merchants and their customers' data."

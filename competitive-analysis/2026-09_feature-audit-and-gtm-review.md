# Shopenter: Feature Audit, Competitive Comparison & GTM Review

*Prepared 2026-09-01, via a Claude Code brainstorm session. Grounds the existing
`acquisition-strategy/` package (May 2026, unmerged branch
`origin/claude/shopenter-acquisition-strategy-5tyc2`) against the product's
actual current state and fresh competitor research.*

---

## 0. The one blocker that matters more than any acquisition channel

**Shopenter cannot currently collect real payment from a merchant.**
`billing/checkout` does not integrate a payment processor — it directly flips
the `Merchant.tier`/`paymentStatus` fields in the database. The Enterprise
plan's "buy" action is a JS `alert()` pointing to a sales email, not a
checkout flow. There is no Stripe/Omise/2C2P/PromptPay-merchant-collection
integration anywhere in the codebase.

This means: right now, zero acquisition spend converts to revenue, no matter
how good the channel. **Wiring a real payment processor for merchant
subscriptions (Omise and 2C2P are the standard Thai-market options for
recurring PromptPay/card billing) is a harder blocker than any bug fix or
acquisition tactic below, and should be sequenced before spending money or
serious time on acquisition.** This is a correction to the acquisition
package's 90-day plan, which assumes revenue starts flowing once trials
convert — that path is currently a dead end at the last step.

---

## 1. Full feature inventory (confirmed by reading the code, not assumed)

### Data & backend depth
- **Products**: full variant matrix (price/cost/stock/images per variant), stock tracking, quick-add flag.
- **Orders**: per-line-item status/tracking/courier (partial fulfillment), multi-currency cost tracking (`soldCurrency`/`costCurrency`/`rateUsed` — built for cross-border resellers importing from Korea and pricing in THB), coupon/loyalty redemption, campaign attribution.
- **Fulfilment**: separate entity from Order — supports multi-parcel shipments.
- **Customers**: unified record across LINE/Instagram/Telegram; `CustomerProfile` resolves identity across platforms by phone number.
- **Storefront order placement** (`storefront/[merchantId]/orders`): the most defensively engineered route in the codebase — server-side price recompute (customer's browser price is never trusted), atomic stock decrement with rollback, atomic coupon/point claiming, 48h campaign-attribution window. This directly prevents the overselling/double-booking errors that spreadsheet- or chat-based order tracking is prone to.
- **Affiliate/referral engine**: built in from signup (`referralCode`), reward funnel (pending → converted → earned/reversed), rolling-year cap.
- **Loyalty & shop credits**: points ledger, idempotency-guarded per order.
- **Auto-cancel / auto-mark-delivered**: configurable timers, cron-driven.
- **Cross-tenant admin console** (`admin/system`): per-merchant LINE quota, platform-wide revenue, Mongo storage stats, feedback triage, bulk tier migration.

### Merchant-facing surface (11 dashboard sections)
Customers (CRM + live chat), Orders, Products, Reports, Broadcasts/Messaging, Storefront customizer, Coupons, Feedback, Settings, Billing, Affiliate.

### Multi-platform reality check
Instagram and Telegram are **not stubs** — webhook handling, welcome/re-engagement messaging, intent-search product replies, and multi-platform broadcast are fully implemented for both, gated only on the merchant entering their own credentials. Only the platform-*exclusive* extras (IG Persistent Menu/Quick Replies/Story Replies; Telegram Bot Commands/Persistent Keyboard/Mini App) are "Coming Soon" placeholders with no backend.

### Confirmed disabled/paused (with actual mechanism)
| Feature | State |
|---|---|
| SlipOK automatic slip verification | Hard-disabled in UI for every merchant (`enabled={false}` forced); backend/OCR logic still present. Manual bank-transfer confirmation is the current path. |
| Instagram Persistent Menu / Quick Replies / Story Replies | Static "Coming Soon" cards, no backend. |
| Telegram Bot Commands / Persistent Keyboard / Mini App | Static "Coming Soon" cards, no backend. |
| Multi-platform instant/queued broadcast | **Not paused** — live for any platform the merchant has configured. |

### Pricing as actually implemented
| | Free | Pro (฿299/mo) | Enterprise (custom, non-functional checkout) |
|---|---|---|---|
| Products | 10 | 500 | Unlimited |
| Orders/mo | 100 | 10,000 | Unlimited |
| Auto-reply rules | 3 | 100 | Unlimited |
| CSV export, coupons, loyalty, affiliate | No | Yes | Yes |

One inconsistency worth a quick fix: `UpgradePrompt`'s footer says "contact support to upgrade" while a self-serve Billing checkout UI exists in parallel — pick one path, the mixed messaging will confuse a merchant mid-upgrade.

---

## 2. Feature-by-feature competitive comparison

| Capability | **Shopenter** | Zwiz.ai | Deeple | Page365 | ZORT | LINE MyShop (free) |
|---|---|---|---|---|---|---|
| Chat automation | Keyword/intent-search → product cards (deterministic, catalog-truth) | AI chatbot | AI chatbot | Unified inbox, manual reply only | None (order mgmt tool) | None |
| Native in-chat storefront | Yes (LIFF) | Yes (in-chat shop) | Yes | No (relies on FB/LINE/IG comments/DMs) | No (connects to LINE Shopping/FB/TikTok Shop) | Yes (its core feature) |
| Multi-platform | LINE + Instagram + Telegram (all functionally live) | LINE + FB + IG + TikTok | FB + LINE + IG | FB + LINE + IG | FB + LINE Shopping + TikTok Shop | LINE only |
| Order lifecycle (partial fulfillment, multi-parcel, auto-cancel/deliver) | Yes, notably deep | Logistics integrations (SHIPPOP, SCG Express, J&T) | Unconfirmed | Yes (core feature) | Yes (core feature) | No |
| Cross-border cost/margin tracking (multi-currency) | Yes — distinctive, unconfirmed elsewhere | Not found | Not found | Not found | Not found | No |
| Cross-platform CRM identity resolution | Yes (by phone) | Unconfirmed | Unconfirmed | Unconfirmed | Unconfirmed | No |
| Loyalty points / shop credits | Yes (Pro+) | "Loyalty tools" mentioned in bundles | Unconfirmed | Unconfirmed | Unconfirmed | No |
| Built-in affiliate/referral engine | Yes | Not found | Not found | Not found | Not found | No |
| Thai bank-slip fraud verification | Built, currently disabled | **Live today**, against TrueMoney | Unconfirmed | Unconfirmed | Unconfirmed | No |
| Real subscription billing (can charge merchants) | **No** | Yes (from ฿500/mo, live years) | Presumed yes | Presumed yes (raised $420K) | Yes (season packages) | N/A (free) |
| Entry price | ฿299/mo (once billing works) | ฿500/mo | Unknown | Unknown | ฿4,500–16,500/season (~฿750–1,375/mo) | Free |

**Reading this straight:** Shopenter's feature depth (order lifecycle, cross-border margin tracking, CRM identity resolution, affiliate engine) is genuinely competitive with or ahead of the named competitors on paper — and its planned price undercuts Zwiz.ai's entry point. But Zwiz.ai has one thing live in production that Shopenter has turned off (working slip verification) and one thing Shopenter doesn't have at all yet (a way to actually collect money). Feature-depth is not the current gap; **billing infrastructure is.**

---

## 3. On the existing acquisition-strategy package

A thorough 7-document acquisition strategy already exists on
`origin/claude/shopenter-acquisition-strategy-5tyc2` (not merged into `main`,
dated May 2026): market sizing (TAM 6.3M+ LINE OA merchants across Thailand/
Taiwan/Japan), a lead-source and 18-channel matrix, a 90-day roadmap, regional
prioritization, and a tech stack budget (~$700/mo: Make.com + HubSpot +
Instantly.ai). It's specific and well-reasoned — worth reading in full before
building a new plan from scratch, not redoing this work.

**Two things this session's research updates in that document:**

1. Its executive summary claims competitors are "single-feature tools (just
   CRM, just chatbot, just broadcast)." That's not accurate for Zwiz.ai or
   Deeple specifically — both bundle chat automation, storefront, payments,
   and logistics, similarly to Shopenter. The differentiated positioning
   validated this session isn't "we're the only full-stack tool" — it's the
   three pillars from earlier in this brainstorm: **deterministic
   accuracy over AI-hallucination risk** (citable via the Air Canada
   tribunal precedent), **depth beyond free LINE MyShop**, and **one
   broadcast reaching every connected platform**. Worth revising the
   messaging/landing-page copy implied by that document to lead with these,
   not a "full-stack" claim a reviewer could fact-check against Zwiz.ai and
   find wanting.
2. Its 90-day success snapshot (150–300 paying customers, $9–22.5K MRR)
   implicitly assumes a working self-serve checkout converts trials to
   revenue. Per Section 0, that path doesn't exist yet — the roadmap's
   Day-1 quick wins (email infra, Facebook Group engagement, beta
   testimonials) can still start immediately since they don't depend on
   billing, but nothing converts to actual MRR until checkout is real.

---

## 4. Recommended sequencing

1. **Wire real subscription billing** (Omise or 2C2P are the standard
   Thai PromptPay/card processors for recurring billing) — this is the
   one item that blocks revenue outright, independent of how good
   acquisition execution is.
2. In parallel (doesn't block on #1): start the acquisition package's
   Quick Wins 1–3 (email domain warm-up takes 21 days regardless; joining
   Thai merchant Facebook groups costs nothing and builds trust over time;
   recruiting 5 beta merchants for testimonials doesn't need billing since
   they're free accounts).
3. Fix the SlipOK messaging and Billing/UpgradePrompt inconsistency —
   small, cheap, removes friction right at the moment a convinced merchant
   tries to pay or verify a payment.
4. Update the acquisition package's positioning language per Section 3
   before it reaches any landing page or ad copy.
5. Then execute the acquisition plan's channel priorities (Facebook Groups
   → Cold Email → Paid Ads) as written — that sequencing and reasoning
   held up against this session's fresh research.

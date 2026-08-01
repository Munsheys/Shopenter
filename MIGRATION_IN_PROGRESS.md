# ⚠️ Active Migration In Progress: MongoDB → DynamoDB

**Status:** In progress
**Branch:** `claude/mongodb-limits-shopenter-u4oumr`
**Started:** 2026-08-01

---

## What's happening

Shopenter's MongoDB M0 (free tier) cluster was hitting its 3-connection limit
before launch. A hard constraint is "everything must be free until first
paying customer," so the database layer is being migrated from
MongoDB/Mongoose to AWS DynamoDB, which has no connection-limit ceiling and a
free tier that comfortably covers pre-revenue traffic.

## Files this touches (expect merge conflicts if you're editing these)

- `src/lib/db.ts` — Mongoose connection replaced entirely with a DynamoDB client
- `src/models/index.ts` — all 23 Mongoose schemas rewritten as DynamoDB table
  definitions / access patterns (Merchant, Settings, Product, Order, Customer,
  Message, Campaign, AutoReply, BroadcastJob, Notification, MediaFile, Coupon,
  LoyaltyTransaction, ProcessedSlip, Fulfilment, AffiliateCommission,
  AuditLog, FailedLoginAttempt, BillingReceipt, AdminUser, AbuseReport,
  ViolationHistory, ProcessedEvent, Feedback)
- **Every** `src/app/api/**/route.ts` that imports from `@/models` or calls
  `dbConnect()` — i.e. essentially all ~90 API routes

## Known collision already found

While preparing this note, `main` was found to already have new LIFF
auto-provisioning logic in `src/app/api/settings/route.ts`
(`createLiffApp` / `@/lib/liffProvision`) that isn't on the migration branch.
That file will need a careful manual merge, not a blind rebase — the LIFF
provisioning logic must be preserved on top of the new DynamoDB data layer.

## If you're working on this repo right now

- If your change touches any file above: please land and merge to `main`
  first if you can. The migration will rebase on top of `main` as it lands,
  not the other way around.
- If you're mid-way through something in one of those files: no need to stop
  — just merge to `main` when ready. Conflicts will be resolved against
  whatever's on `main` at that time.
- This file will be deleted once the migration branch merges to `main`.

# Dashboard Development Plan

> Last updated: 2026-05-29
> Branch: `claude/merchant-dashboard-edge-cases-W0AyH`

---

## Current State (as of today)

Stage A of the ROADMAP_SAAS is complete. All five core dashboard pages have gone through
two full rounds of peer review plus a screenshot-driven UX correction pass.

### What was fixed in Stage A

**ReportsView**
- Removed 8-week sparkline (noise, not actionable)
- Period selector now at top, stalled-orders banner below it
- Stalled threshold is now a live selector in the banner (1 / 2 / 3 / 5 / 7 days)
- KPI skeleton loaders with `animate-pulse`

**ShopOrdersView**
- Status advancement restricted to `shipped → delivered` only (orders page = overview)
- "View in Chat" navigates to customer AND highlights the specific order card (3-second ring)
- CSV export quotes all cells, handles commas in values
- Optimistic updates with rollback on server error

**CustomersView**
- Section order: Active Orders → Delivery Addresses → Parcel → In Transit → Order History
- "Mark Delivered" button visible on collapsed in-transit row (no expand required)
- Print button on collapsed in-transit row (shipped orders only, not in history)
- Chat drawer fixed to `top-14` so it no longer covers the navbar
- In-transit orders grouped by parcel: orders sharing the same tracking number appear as
  one row, not many. Group header shows item count, courier, tracking, combined totals,
  single "Delivered" button that marks all items at once, combined print receipt.
- `jumpToOrderId` prop wires "View in Chat" highlight cross-component

**ProductManagement**
- Card size `+` = bigger (fewer columns), `−` = smaller (more columns) — correct
- CSV import deduplication covers same-batch duplicates via local `Set`
- Price `min="0.01" step="any"`, variant prices/stock clamped to 0

**UpgradePrompt / UnsavedChangesModal**
- Escape key dismiss, `role="dialog" aria-modal`, correct `autoFocus` (safe action)
- `router.push` instead of `window.location.href` so `onClose` runs first
- All dead `dark:` Tailwind prefixes replaced with `theme === 'dark' ? ... : ...` ternaries

---

## Known Gaps Discovered During Stage A

Two gaps were found that are not bugs in the current code, but missing capabilities
in the underlying data model. They are deferred because they each require architectural
changes that should not be rushed.

---

## DEFERRED — Gap 1: Partial Fulfilment / Split Shipment

**Priority: High — build before Stage B**
**Why deferred: Requires new DB collection, API routes, migration, and changes to three views**

### The problem

The current `Order` document has a single `status` field covering all items in the order.
There is no item-level status. This means the following real-world scenario is impossible
to represent correctly:

```
Customer orders: 1×A  3×B  1×C
Merchant ships:  1×A  1×B        ← first parcel, today
Merchant ships:       2×B  1×C   ← second parcel, next week
```

The order is fulfilled in two separate physical shipments, each with its own tracking
number, its own ship date, and potentially its own delivery confirmation.

Today, the merchant's only options are to:
1. Mark the whole order as shipped when only part leaves — misleading status
2. Create two separate orders manually — no formal link between them, awkward financials
3. Wait until all stock is ready before shipping anything — bad for the customer

### The correct data model

Separate the concept of **what was purchased** (Order) from **what was physically sent** (Fulfilment).

**Order** — what the customer agreed to buy and pay for. Has a lifecycle that reflects
whether all fulfilments are complete.

```
status: 'pending' | 'paid' | 'partially_fulfilled' | 'fulfilled' | 'cancelled'
```

Fields removed from Order: `tracking`, `courier`, `address` — these move to Fulfilment.

**Fulfilment** — one physical parcel that left the warehouse. Belongs to exactly one Order.
An Order can have many Fulfilments.

```typescript
type Fulfilment = {
  _id: string
  orderId: string                  // parent Order
  userId: string                   // denormalised — needed for efficient per-customer queries
  items: FulfilmentItem[]          // subset of the order's items, with quantities
  tracking?: string
  courier?: string
  address?: string
  shipCostTHB?: number
  status: 'pending' | 'shipped' | 'delivered'
  createdAt: string
  shippedAt?: string
  deliveredAt?: string
}

type FulfilmentItem = {
  productId?: string
  name: string
  variantLabel?: string
  qty: number                      // qty in THIS fulfilment, not the total ordered
  price: number                    // price per unit
}
```

**Derived order status rule** (computed, never manually set):
- All fulfilments delivered → Order status = `fulfilled`
- At least one fulfilment shipped or delivered, but not all → `partially_fulfilled`
- No fulfilments exist yet → `paid` (awaiting packing)
- Explicitly cancelled → `cancelled`

### API changes required

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/orders/:id/fulfilments` | List all fulfilments for an order |
| `POST` | `/api/orders/:id/fulfilments` | Create a new fulfilment (item picker) |
| `PATCH` | `/api/fulfilments/:id` | Mark shipped / delivered, update tracking |
| `DELETE` | `/api/fulfilments/:id` | Remove an unshipped fulfilment |
| `GET` | `/api/orders` | Add `fulfilments` array (or summary) to response |

The Parcel section currently works by moving whole Order documents to `preparing` status,
then calling `patchOrder` for each one when shipping. That logic moves to Fulfilment:
the Parcel is a Fulfilment document in `pending` status with items being selected by the merchant.

### UI changes required

**Customer page — Active Orders section**

Order card must show fulfilment progress below the product name:

```
[Paid]  1×A  3×B  1×C                           ฿4,500
        ████████░░░░  2 of 5 items shipped
        [Add to Parcel ▾]  [Edit]  [Cancel]
```

The "Add to Parcel" button opens an item picker modal where the merchant selects which
items and quantities to include in the next shipment. Unallocated quantities remain
visible in Active Orders even after partial shipment.

**Customer page — Parcel section**

The Parcel section no longer operates on whole Order documents. It operates on a
Fulfilment document. The UI is similar but the "ship" action creates/updates a
Fulfilment and does NOT change the Order's status directly — the Order status is
computed from its Fulfilments.

When the merchant creates a parcel, they see a two-column item picker:
```
FROM (unshipped items)           IN THIS PARCEL
─────────────────────────────    ──────────────────────
  3×B   [Add 1] [Add All] →       1×A
  1×C   [Add 1] [Add All] →       1×B
```

**Customer page — In Transit section**

Already updated to group by tracking number. With the Fulfilment model, each row IS
a Fulfilment document, so grouping is natural. No visual change needed, but the data
source changes from `Order[]` to `Fulfilment[]`.

**Customer page — Order History section**

An Order only moves to history when `status === 'fulfilled' || status === 'cancelled'`.
While `partially_fulfilled`, the order stays in Active Orders with a partial progress bar.

Each history row expands to show all Fulfilments for that order — date shipped, items,
tracking — giving a complete audit trail.

**Orders page (ShopOrdersView)**

Status column needs to handle `partially_fulfilled`. The status filter chips need the
new status. The row expander should show fulfilment breakdown.

**Reports page**

`realizedProfit` must change. Currently: sum of `profit` on `delivered` orders.
Correct: sum of `profit` across `delivered` Fulfilments. Since a Fulfilment covers a
subset of items, its profit = (sum of item prices × qty) − proportional cost − shipCostTHB.

Cost allocation across partial fulfilments: apportion the order's `costTHB` proportionally
by sold value. If Fulfilment 1 covers 40% of soldTHB, it carries 40% of costTHB.

### Migration required

All existing Order documents where `status` is `shipped` or `delivered` must get a
synthetic Fulfilment record created containing all their items. This is a one-time
migration script. Data integrity checks:
- Every `shipped` Order → one Fulfilment with `status: 'shipped'`, tracking copied over
- Every `delivered` Order → one Fulfilment with `status: 'delivered'`
- Order's `tracking`/`courier`/`address` fields become read-only legacy; new writes go to Fulfilment

The migration can be run online (no downtime) because old code still works during the
transition — it reads from Order directly.

### Sequencing recommendation

Do NOT start this until:
1. Gap 2 (auto-deliver setting) is shipped — it's small and unblocks non-tracking merchants now
2. The current Stage A fixes are in production and stable for one week
3. A test merchant with real split-shipment orders is available to validate the UI

Estimated scope: 10–14 days of focused work.

---

## DEFERRED — Gap 2: Auto-Deliver for Non-Tracking Merchants

**Priority: Medium — do before Partial Fulfilment**
**Why deferred: Small, but blocked on deciding what the correct default N days is**

### The problem

Many small import resellers ship, consider the job done, and never mark orders as
delivered. As a result:
- In Transit fills up with old shipped orders permanently
- Reports "realized profit" is permanently understated (delivered orders only count)
- The "Delivered" button creates friction with no perceived value for these merchants

### The fix

A merchant setting: **"Assume orders delivered after N days"**.

When enabled, any `shipped` order older than N days is automatically moved to `delivered`
on the next dashboard load (or via a lightweight cron job). No manual click required.

**Settings schema addition:**
```typescript
autoDeliver: {
  enabled: Boolean, default: false
  afterDays: Number, default: 14, min: 3, max: 60
}
```

**Client-side implementation (simplest):** On `CustomersView` mount, after `allOrders` loads,
run a check: any `shipped` order older than `settings.autoDeliver.afterDays` days → call
`PATCH /api/orders/:id` with `{ status: 'delivered' }`. Batch these calls. Show a toast
"3 orders auto-archived as delivered".

**Cron implementation (more correct):** A daily cron at `/api/cron/auto-deliver` that
finds all `shipped` orders older than threshold for merchants with `autoDeliver.enabled = true`
and bulk-updates them. Already has a `/api/cron` directory in the project.

The cron approach is correct because it runs even when the merchant doesn't open the
dashboard. The client-side approach is fine for MVP — add cron later.

### UI changes required
- Settings page: new "Order Management" section with the auto-deliver toggle + day selector
- Toast notification on dashboard load when orders are auto-archived

---

## Upcoming Tasks — In Order

### Task 1 — Auto-deliver setting (Gap 2)
**Scope: Small (1 day)**

Files to change:
- `src/components/SettingsView.tsx` — new "Order Management" section
- `src/app/api/settings/route.ts` — persist `autoDeliver` field
- `src/app/dashboard/page.tsx` — on mount, run auto-deliver check after settings load
- `src/models/index.ts` — add `autoDeliver` to Settings schema

### Task 2 — Order item detail in Orders page
**Scope: Small (half day)**

Currently `ShopOrdersView` shows only the denormalized `product` string. The `items` array
exists on every order but is never shown. Add an expandable row that shows the full item
breakdown: name, variant, qty, price per unit.

This is a pure UI change, no data model work.

Files to change:
- `src/components/ShopOrdersView.tsx` — expandable row with `order.items` breakdown

### Task 3 — Partial Fulfilment (Gap 1)
**Scope: Large (10–14 days)**
Full specification above.

### Task 4 — Stage B: Auto-Reply / Product Intent
**Scope: Medium (5–7 days)**
Full specification in `ROADMAP_SAAS.md` Stage B.
Dependency: None on Partial Fulfilment. Can be parallelised with Task 3.

### Task 5 — Stage C: Instagram + Telegram
**Scope: Large (2–3 weeks)**
Full specification in `ROADMAP_SAAS.md` Stage C.
Dependency: Stage B webhooks and platform adapter pattern.

### Task 6 — SaaS Multi-Tenant Transformation
**Scope: Very large (Phases 1–6 in ROADMAP_SAAS.md)**
Dependency: Everything above should be stable first.
The Partial Fulfilment model (Task 3) introduces a `Fulfilment` collection that must be
included in Phase 1 (Add `merchantId` to all schemas) — do NOT skip it.

---

## Design Principles (do not compromise these)

**Data accuracy over convenience.** The dashboard is a financial and operational tool.
A wrong number is worse than no number. When a status is ambiguous (partially fulfilled),
show it explicitly rather than rounding to the nearest clean state.

**Status must reflect physical reality.** "Shipped" means items have left the warehouse.
"Delivered" means items have arrived with the customer. "Partially fulfilled" means some
items are with the customer and some are not. Never conflate these.

**Profit is only realized when delivered.** A shipped order is receivable, not revenue.
Reports must reflect this. The auto-deliver setting exists to reduce the operational
friction of marking delivered, not to change the accounting definition.

**The Order is a customer agreement; the Fulfilment is a physical act.** These are
different things and must not share a data structure. The current model conflates them
and this is the root cause of Gap 1.

# Dashboard Development Plan

> Last updated: 2026-05-29
> Branch: `claude/merchant-dashboard-edge-cases-W0AyH`

---

## Current State

### Completed — Stage A (dashboard page review + UX correction)

**ReportsView**
- Removed 8-week sparkline (noise, not actionable)
- Period selector at top, stalled-orders banner below it
- Stalled threshold live selector in the banner (1 / 2 / 3 / 5 / 7 days)
- KPI skeleton loaders with `animate-pulse`
- Banner logic fixed: visible whenever any paid/preparing orders exist; shows
  "0 in N days — all up to date" when none are older than threshold; no dismiss button

**ShopOrdersView**
- Orders page is read-only overview — no per-row status advancement
- Per-row actions: **Cancel** (pending/paid/preparing only) + **Bin** (wipes record) + **View in Chat**
- Shipped orders show no cancel — batch Delivered pill handles them
- Batch selection: header checkbox selects/deselects all filtered orders
- Floating pill toolbar: `N selected` · `Select All N` · `Delivered (N)` · `Cancel (N)` · `Delete (N)` · ✕
- Batch Delivered only appears when shipped orders are in the selection
- Batch Cancel covers pending / paid / preparing only
- CSV export quotes all cells; "View in Chat" highlights the order card cross-component
- Row click expands inline item detail panel (qty, name, variant, line total, cost, profit, shipping, notes)
- Stalled banner between stats ribbon and filter toolbar (same logic as Reports)

**CustomersView**
- Section order: Active Orders → Delivery Addresses → Parcel → In Transit → Order History
- Chat drawer `top-14` — no longer covers the navbar
- In-transit orders grouped by parcel (same tracking = one row); group shows combined
  totals, Delivered button marks all items at once, print generates combined receipt
- "Mark Delivered" and Print visible on collapsed in-transit row (no expand required)
- `jumpToOrderId` prop highlights the correct order card when navigating from Orders page
- **Item-level order edit modal** — per-line-item editor with qty stepper, unit price,
  line totals, profit preview, add/remove items; PATCHes full items array
- `onOrderMutated` prop — fires on every patchOrder success and deleteOrder,
  triggering Orders + Reports to refresh on next tab visit

**ProductManagement**
- `+` = bigger cards (fewer columns), `−` = smaller (more columns)
- CSV import deduplication covers same-batch duplicates

**UpgradePrompt / UnsavedChangesModal**
- Escape dismiss, `role="dialog" aria-modal`, `autoFocus` on safe action
- All dead `dark:` Tailwind prefixes replaced with `theme === 'dark'` ternaries

**SettingsView**
- Auto-Deliver After Shipping card in Payment section: toggle + day stepper (3–60 days)

**Dashboard (page.tsx)**
- Auto-deliver check on load: if enabled, batch-PATCHes shipped orders older than
  afterDays → delivered; shows dismissible emerald toast
- Separate `ordersRefreshKey` + `reportsRefreshKey` alongside global `refreshKey`;
  mutated by `onOrderMutated` from CustomersView without remounting Customers itself

---

## Page Responsibility Model (do not break this)

| Page | Responsibility | What it can do |
|------|---------------|----------------|
| Orders | Read-only overview across all customers | View, filter, search, batch cancel, batch delete, batch deliver (power-user shortcut) |
| Customers | Full order lifecycle management | Mark paid, parcel, ship, mark delivered, cancel, edit (item-level) |
| Reports | Financial analytics | Read-only |

Status advancement (pending → paid → preparing → shipped → delivered) belongs on the
Customer page. The Orders page batch "Delivered" is a power-user shortcut, not the
primary workflow.

---

## Deferred — Gap 1: Partial Fulfilment / Split Shipment

**Priority: High — build before Stage B**
**Estimated scope: 10–14 days**
**Why deferred: Requires new DB collection, API routes, migration, and changes across three views**

### The problem

The current `Order` document has a single `status` field covering all items. There is no
item-level status. This makes the following scenario impossible:

```
Customer orders: 1×A  3×B  1×C
Merchant ships:  1×A  1×B        ← first parcel today
Merchant ships:       2×B  1×C   ← second parcel next week
```

Workarounds all produce incorrect data: marking the whole order shipped (misleads
customer), waiting for full stock (bad for customer), or creating two manual orders
(no formal link, awkward financials).

### The correct data model

Separate **Order** (what was purchased) from **Fulfilment** (what was physically sent).

**Order** — lifecycle driven by its Fulfilments:
```
status: 'pending' | 'paid' | 'partially_fulfilled' | 'fulfilled' | 'cancelled'
```
Fields `tracking`, `courier`, `address` move to Fulfilment.

**Fulfilment** — one physical parcel:
```typescript
type Fulfilment = {
  _id: string
  orderId: string          // parent Order
  userId: string           // denormalised for query efficiency
  items: FulfilmentItem[]  // subset of order items with quantities
  tracking?: string
  courier?: string
  address?: string
  shipCostTHB?: number
  status: 'pending' | 'shipped' | 'delivered'
  createdAt: string
  shippedAt?: string
  deliveredAt?: string
}
type FulfilmentItem = { productId?: string; name: string; variantLabel?: string; qty: number; price: number }
```

**Computed Order status rule:**
- All fulfilments delivered → `fulfilled`
- ≥1 fulfilment shipped/delivered but not all → `partially_fulfilled`
- No fulfilments yet → stays at `paid`
- Explicit cancel → `cancelled`

### API changes

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/orders/:id/fulfilments` | List fulfilments for an order |
| `POST` | `/api/orders/:id/fulfilments` | Create new fulfilment (item picker) |
| `PATCH` | `/api/fulfilments/:id` | Update tracking / mark shipped or delivered |
| `DELETE` | `/api/fulfilments/:id` | Remove an unshipped fulfilment |
| `GET` | `/api/orders` | Include fulfilment summary in response |

### UI changes

**Customer page — Active Orders**
Show fulfilment progress bar on each order card:
```
[Paid]  1×A  3×B  1×C                   ฿4,500
        ████████░░░░  2 of 5 items shipped
        [Add to Parcel ▾]  [Edit]  [Cancel]
```

**Customer page — Parcel**
Parcel operates on a Fulfilment, not whole Orders. An item picker lets the merchant
choose which items and quantities to include in this shipment:
```
FROM (unshipped)          IN THIS PARCEL
────────────────────────  ──────────────────
  3×B  [+1] [All] →        1×A
  1×C  [+1] [All] →        1×B
```

**Customer page — In Transit**
Each row is a Fulfilment document. Data source changes from `Order[]` to `Fulfilment[]`.
Visual grouping already works (grouped by tracking number).

**Customer page — Order History**
Order moves to history only when `status === 'fulfilled' || status === 'cancelled'`.
While `partially_fulfilled` it stays in Active Orders. Expanded history row shows all
Fulfilments as a timeline.

**Orders page**
Add `partially_fulfilled` to status filter chips and status column. Row expander shows
fulfilment breakdown.

**Reports**
Realized profit changes from "sum of profit on delivered Orders" to "sum of profit
across delivered Fulfilments", with cost apportioned proportionally by sold value.

### Migration

One-time script — online, no downtime:
- Every `shipped` Order → synthetic Fulfilment(`status: 'shipped'`, all items, tracking copied)
- Every `delivered` Order → synthetic Fulfilment(`status: 'delivered'`)
- Old `tracking`/`courier`/`address` on Order become read-only legacy fields

### Do not start until
1. Current fixes are in production and stable for ≥1 week
2. A test merchant with real split-shipment orders is available to validate the UI

---

## Deferred — Gap 2: Auto-Deliver for Non-Tracking Merchants

**Status: SHIPPED ✅**

Implemented in this branch:
- `autoDeliver: { enabled, afterDays }` on SettingsSchema
- Toggle + day stepper in SettingsView → Payment section
- Client-side check on dashboard load; batch-PATCH shipped orders older than `afterDays`
- Dismissible emerald toast on completion

A daily server-side cron at `/api/cron/auto-deliver` can replace the client-side check
later so it runs even when the merchant doesn't open the dashboard.

---

## Upcoming Tasks — In Order

| # | Task | Size | Dependency | Status |
|---|------|------|------------|--------|
| 1 | Auto-deliver setting (Gap 2) | Small — 1 day | None | ✅ Done |
| 2 | Orders page row expander (item detail) | Small — ½ day | None | ✅ Done |
| 3 | Item-level order edit modal | Small — ½ day | None | ✅ Done |
| 4 | Cross-page sync (onOrderMutated) | Tiny | None | ✅ Done |
| 5 | Partial Fulfilment full build (Gap 1) | Large — 10–14 days | 1–4 stable in prod | Deferred |
| 6 | Auto-Reply / Product Intent (Stage B) | Medium — 5–7 days | Can parallel with 5 | Deferred |
| 7 | Instagram + Telegram (Stage C) | Large — 2–3 weeks | Stage B | Deferred |
| 8 | SaaS multi-tenant transformation | Very large | All above stable | Deferred |

Task 8 (multi-tenant) must happen AFTER Task 5 because Task 5 introduces the
`Fulfilment` collection — if `merchantId` is added to all schemas before that
collection exists, it has to be done twice.

---

## Phases

### Phase A — Foundation & UX correctness (complete)
Everything in "Current State" above. The dashboard accurately reflects the order
lifecycle, pages have clear responsibilities, and the data model is honest about
what's confirmed revenue vs. potential.

### Phase B — Partial Fulfilment (next large milestone)
Introduces the `Fulfilment` collection. This is the single biggest architectural
change: it separates what the customer agreed to buy from what was physically shipped.
Required before any split-shipment workflow is possible. Gate: Phase A stable in
production for ≥1 week.

### Phase C — Automation & Intelligence
Auto-Reply, product intent detection, broadcast scheduling. Can start in parallel
with Phase B once the Fulfilment API is drafted but before UI is complete.

### Phase D — Channel expansion
Instagram DM and Telegram bot. Requires the LINE foundation from Phase C to be
abstracted into a channel-agnostic message handler first.

### Phase E — Multi-tenant SaaS
Add `merchantId` to every collection, per-merchant billing, onboarding flow,
admin panel. Must come last because Phase B adds the `Fulfilment` collection —
doing multi-tenant before that means touching every schema twice.

---

## Design Principles (do not compromise these)

**Orders page = overview only.** Status advancement belongs on the Customer page.
The batch "Delivered" on the Orders page is a power-user shortcut, not the primary
workflow. Never add per-row status advancement back to the Orders page.

**Cancel ≠ Delete.** Cancel marks the order as cancelled and keeps it in records.
Delete wipes the record entirely. Both must be available everywhere but must be
clearly differentiated. Confirm dialogs must make the difference explicit.

**Data accuracy over convenience.** The dashboard is a financial tool.
A wrong number is worse than no number. When a status is ambiguous, show it
explicitly rather than rounding to the nearest clean state.

**Profit is only realized when delivered.** A shipped order is receivable, not revenue.
The auto-deliver setting reduces operational friction but does not change the definition.

**Order = customer agreement. Fulfilment = physical act.** These are different things
and must not share a data structure. The current model conflates them — this is the
root cause of Gap 1.

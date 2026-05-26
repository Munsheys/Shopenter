# LineOA SaaS - Multi-Tenant Transformation Roadmap

---

## CURRENT DEVELOPMENT PLAN (2026)

> Phases 1–6 below are complete. Active work is tracked here.

### Stage A — Dashboard page-by-page review (IN PROGRESS)
Fix UI/UX bugs and edge cases on every page before any new feature work.

- [x] Customers page
- [ ] Orders page
- [ ] Products page
- [ ] Reports page
- [ ] Broadcasts page
- [ ] Storefront page
- [ ] Coupons page

---

### Stage B — Auto-Reply / Product Intent (PLANNED)

Detect customer buy-intent messages on any platform, fuzzy-match against the product catalog, and reply with a product card that deep-links to the storefront. No AI API required.

#### Detection pipeline
1. **Intent gate** — bilingual keyword set (Thai + English). If no intent keyword found → silence, do not touch catalog.
2. **Token extraction** — strip intent words + stop words, keep product signal tokens.
3. **Fuzzy search** — `fuse.js` against `product.name`, `product.brand`, `product.categories`.
4. **Confidence gate** — controlled by merchant settings (see below).
5. **No match → silence** — never send a card if no product found above threshold.

#### Product card behaviour
- Single "View Product" URI button on every card → `/shop?merchantId=xxx&productId=yyy`
- Storefront reads `?productId` on load and scrolls to / highlights that product
- Customer selects their own variants/options on the storefront and checks out there
- No order creation, no stateful conversation, no variant guessing

#### Platform card formats
| Platform | Format | Button type |
|---|---|---|
| LINE | Flex Message carousel (max 12 bubbles) | `uri` → storefront |
| Telegram | `sendPhoto` + InlineKeyboardMarkup | `url` → storefront |
| Instagram | Generic template carousel | `web_url` → storefront |

#### Merchant-configurable settings (new dashboard page: **Auto-Reply**)
| Setting | Options |
|---|---|
| Enable auto-reply | Toggle on/off |
| Match mode | Exact only (score ≥ 0.90) · Top N matches (1–12, merchant sets N) |
| Fire timing | Immediate · After N minutes of merchant silence (merchant sets N, e.g. 5/10/15/30 min) |

#### New files
```
src/lib/autoReply/
  intent.ts      — bilingual keyword intent classifier
  extract.ts     — strip noise, extract product query tokens
  catalog.ts     — fuse.js search against Product collection
  builder.ts     — normalised ProductCard → platform-specific rich message
  index.ts       — runAutoReply(message, merchantId, platform) entry point

src/app/api/settings/auto-reply/route.ts   — GET/PATCH auto-reply settings
src/components/AutoReplyView.tsx           — new dashboard page
```

#### Settings schema addition (models/index.ts — Settings)
```ts
autoReply: {
  enabled:       Boolean, default false
  matchMode:     'exact' | 'top_n', default 'exact'
  topN:          Number, default 3, min 1, max 12
  fireMode:      'immediate' | 'delayed', default 'immediate'
  delayMinutes:  Number, default 10
}
```

#### Storefront change required
`/shop` page reads `?productId` query param on mount, scrolls to and highlights that product.

---

### Stage C — Instagram + Telegram integration (PLANNED, do together)

Platform types, schema enums, and stub adapters are already in place.
Remaining work per platform:

**Instagram**
- Webhook route for Meta `messaging` events
- Instagram OAuth / account linking flow (storefront auth)
- Settings tab: Instagram Business token + page ID
- Generic template builder in `src/lib/platforms/instagram.ts`

**Telegram**
- Webhook route for Telegram Bot updates (`/api/webhook/telegram`)
- `sendMessage` + `sendPhoto` + InlineKeyboard in `src/lib/platforms/telegram.ts`
- Settings tab: Bot token + webhook registration
- Deep-link storefront entry (`t.me/botname?start=shop`)

Both platforms share the existing `userId` + `platform` data model, `PlatformAdapter` interface, and cross-platform message guards already in place.

---

## Architecture Decision: Path-Based Routing

We're starting with **path-based routing** for simplicity:
```
lineoa.com/dashboard        → Merchant control panel
lineoa.com/merchant/shop1   → Store owner 1's storefront
lineoa.com/merchant/shop2   → Store owner 2's storefront
```

Can upgrade to subdomain-based (`shop1.lineoa.com`) later.

---

## Phase 1: Database & Models (NEXT)

### What needs to change:
1. Create `Merchant` model (shop owner accounts)
2. Add `merchantId` field to all existing models
3. Add database indexes for performance

### Files to modify:
- `/src/models/index.ts` → Add Merchant schema + merchantId to all others

### Expected commits:
```
1. "Add Merchant model and merchantId to all schemas"
```

---

## Phase 2: Merchant Authentication

### What needs to change:
1. Create signup/login endpoints
2. Add JWT token generation
3. Create middleware to extract merchantId from JWT

### Files to create:
- `/src/app/api/merchant/auth/signup/route.ts`
- `/src/app/api/merchant/auth/login/route.ts`
- `/src/lib/auth.ts` → Update with JWT handling
- `/src/middleware.ts` → Add JWT verification

### Expected commits:
```
2. "Add merchant signup/login endpoints"
3. "Add JWT middleware for merchant auth"
```

---

## Phase 3: API Route Refactoring

### What needs to change:
All API routes must filter by `merchantId` from JWT context.

### Routes to refactor:
- `/api/products` → Filter by merchantId
- `/api/orders` → Filter by merchantId
- `/api/customers` → Filter by merchantId
- `/api/messages` → Filter by merchantId
- `/api/settings` → Per-merchant (not singleton)
- `/api/shop-info` → Public, extract merchantId from path

### Expected commits:
```
4. "Refactor API routes to use merchantId filtering"
```

---

## Phase 4: Dashboard Refactoring

### What needs to change:
1. Move admin UI from `/app/page.tsx` to `/app/dashboard/page.tsx`
2. Add merchant context provider
3. Update all components to use merchantId

### Files to move:
- `/src/components/ProductManagement.tsx`
- `/src/components/SettingsView.tsx`
- `/src/components/ReportsView.tsx`
- → All moved into dashboard context

### Expected commits:
```
5. "Create merchant dashboard at /dashboard"
6. "Add merchant context provider"
7. "Refactor dashboard components for multi-tenancy"
```

---

## Phase 5: Storefront Separation

### What needs to change:
1. Create new storefront routes: `/app/merchant/[merchantId]/page.tsx`
2. Extract merchantId from URL path
3. Load merchant-specific branding, LIFF ID, products

### Files to create:
- `/src/app/merchant/[merchantId]/page.tsx` → Shop page
- `/src/app/merchant/[merchantId]/layout.tsx` → Shop layout
- `/src/app/api/storefront/[merchantId]/products/route.ts`
- `/src/app/api/storefront/[merchantId]/shop-info/route.ts`

### Expected commits:
```
8. "Create path-based storefront at /merchant/[merchantId]"
9. "Add storefront API routes with path-based merchant lookup"
```

---

## Phase 6: Testing & Polish

### What needs to verify:
1. Create 2+ test merchants
2. Verify data isolation (merchant 1 can't see merchant 2's products)
3. Test full customer order flow
4. Test merchant admin panel

### Expected commits:
```
10. "Add seed data for multi-merchant testing"
11. "Fix isolation bugs from testing"
```

---

## Current Status
- [x] Cloned from lineoa-personal
- [ ] Phase 1: Database models
- [ ] Phase 2: Merchant auth
- [ ] Phase 3: API refactoring
- [ ] Phase 4: Dashboard refactor
- [ ] Phase 5: Storefront separation
- [ ] Phase 6: Testing

---

## Key Principles
1. **Every DB query must filter by merchantId**
2. **No hardcoded references to single shop**
3. **Merchant identified via JWT (admin) or URL path (storefront)**
4. **All data scoped to merchant_id**

---

## Testing Each Phase

After each phase, verify:
```bash
# Phase 1: Check models compile
npm run build

# Phase 2: Test signup/login endpoints
curl -X POST http://localhost:3000/api/merchant/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@shop.com","password":"test123","shopName":"My Shop"}'

# Phase 3: API isolation
# Create orders as merchant 1, verify merchant 2 can't see them

# Phase 4: Dashboard loads correct data

# Phase 5: Storefront at different paths shows different shops
```

---

## Questions to Consider
1. Should merchants be able to manage multiple shops? (Later)
2. Custom storefront themes? (Phase 6)
3. Subscription tiers? (Post-MVP)
4. White-labeling support? (Post-MVP)

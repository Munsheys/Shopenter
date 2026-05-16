# LineOA SaaS - Multi-Tenant E-Commerce Platform

This is the **SaaS version** of LineOA. The original personal project is untouched in `lineoa-personal/`.

## What This Project Does

**LineOA SaaS** is a service that allows multiple merchants (shop owners) to:
1. Sign up and manage their own e-commerce shop
2. Use a shared admin dashboard to manage products, orders, and customers
3. Get a personalized storefront for their customers
4. Connect their own LINE Official Account (OA) for customer communication
5. Accept payments via their own PromptPay QR code

## Quick Start

### Architecture: Path-Based Routing
```
Admin Dashboard:  lineoa.com/dashboard
Storefront 1:     lineoa.com/merchant/shop1
Storefront 2:     lineoa.com/merchant/shop2
```

### What's Different from Personal Project?

| Feature | Personal | SaaS |
|---------|----------|------|
| **Shops** | 1 (hardcoded) | Many (unlimited) |
| **Admin Auth** | None | Email + Password |
| **Storefront URLs** | `/shop` | `/merchant/[id]` |
| **Config** | Singleton | Per-merchant |
| **Data Isolation** | No | Yes (merchantId) |

### Key Files to Understand

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** ← Start here! Visual explanation of path-based routing
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** ← Detailed architecture diagrams
- **[ROADMAP_SAAS.md](./ROADMAP_SAAS.md)** ← Implementation phases
- **[CLAUDE.md](./CLAUDE.md)** ← Development guidelines

### Document Map

```
📁 lineoa-saas/
├── 📄 README_SAAS.md              ← You are here
├── 📄 QUICK_REFERENCE.md          ← Visual 5-min overview
├── 📄 ARCHITECTURE.md             ← Deep dive diagrams
├── 📄 ROADMAP_SAAS.md             ← Implementation plan
├── 📄 CLAUDE.md                   ← Dev guidelines
│
├── 📁 src/
│   ├── models/index.ts            ← Will add Merchant model + merchantId to all schemas
│   ├── app/
│   │   ├── dashboard/             ← NEW: Merchant admin panel
│   │   ├── merchant/[id]/         ← NEW: Storefront path-based
│   │   └── api/
│   │       ├── merchant/          ← NEW: Admin APIs (JWT-protected)
│   │       └── storefront/        ← NEW: Public APIs (no auth)
│   └── lib/
│       └── auth.ts                ← JWT authentication
│
└── 📁 node_modules/ & config files
```

## Development Checklist

### Phase 1: Database Models (CURRENT)
- [ ] Add `Merchant` model to `src/models/index.ts`
- [ ] Add `merchantId` field to all existing models
- [ ] Create database indexes for performance

### Phase 2: Authentication
- [ ] Signup endpoint: `/api/merchant/auth/signup`
- [ ] Login endpoint: `/api/merchant/auth/login`
- [ ] JWT middleware to extract merchantId

### Phase 3: API Routes
- [ ] Refactor all API routes to filter by merchantId
- [ ] Separate `/api/merchant/*` (admin, JWT-required)
- [ ] Separate `/api/storefront/*` (public, path-based)

### Phase 4: Admin Dashboard
- [ ] Create `/dashboard` route for merchant panel
- [ ] Add merchant context provider
- [ ] Refactor components to use merchantId

### Phase 5: Storefront
- [ ] Create `/merchant/[merchantId]` path-based storefront
- [ ] Load merchant-specific branding and products
- [ ] Test with multiple merchants

### Phase 6: Testing & Polish
- [ ] Verify data isolation between merchants
- [ ] Test full customer order flow
- [ ] Performance testing with 10+ merchants

## Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

First time? Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for a visual tour.

## Key Principles

1. **Every DB query must include `merchantId` filter**
   ```typescript
   // ❌ Wrong - leaks data
   const products = await Product.find({});
   
   // ✅ Correct - isolated per merchant
   const products = await Product.find({ merchantId: req.user.merchantId });
   ```

2. **Merchant identified by:**
   - Admin routes: JWT token `req.user.merchantId`
   - Public routes: URL path `/merchant/[merchantId]`

3. **No hardcoded references**
   - Never assume a single shop
   - Always scope queries to merchantId

## Architecture: What Changed?

### BEFORE (Personal - Single Tenant)
```
Database:
  Settings (global, singleton)
  Products (no merchantId)
  Orders (no merchantId)
  
Routes:
  /shop                     → hardcoded to one shop
  /api/products             → returns all products
  
Auth:
  None (owner assumed)
```

### AFTER (SaaS - Multi-Tenant)
```
Database:
  Merchant (NEW)
  Settings → removed (per-merchant in Merchant model)
  Products (+ merchantId field)
  Orders (+ merchantId field)
  
Routes:
  /dashboard                → merchant admin
  /merchant/[id]            → customer storefront
  /api/merchant/*           → admin (JWT required)
  /api/storefront/*         → public (path-based)
  
Auth:
  Email + Password → JWT with merchantId
```

## Questions?

- **What's path-based routing?** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#path-based-what-were-using-)
- **How does data isolation work?** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#key-concept-merchantid-in-every-query)
- **What's the implementation plan?** → [ROADMAP_SAAS.md](./ROADMAP_SAAS.md)
- **Show me diagrams!** → [ARCHITECTURE.md](./ARCHITECTURE.md)

## Next Steps

1. Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) (5 min)
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) (15 min)
3. Follow [ROADMAP_SAAS.md](./ROADMAP_SAAS.md) to implement Phase 1
4. Test with 2+ merchants to verify isolation

Good luck! 🚀

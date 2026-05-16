# 🚀 START HERE: LineOA SaaS Transformation

## What You're Building

Transform your personal LineOA shop into a **SaaS platform** where multiple merchants can run their own e-commerce stores.

```
BEFORE (Personal)          →    AFTER (SaaS)
─────────────────────            ──────────────────
Your shop only                    Any merchant's shop
/shop (hardcoded)                 /merchant/shop1
                                  /merchant/shop2
                                  /merchant/shopN
```

---

## 5-Minute Quick Explanation

### The Problem
Right now your code has everything hardcoded for ONE shop (yours):
- Only ONE person can use it
- `/shop` route is fixed
- Settings table has no way to identify which shop owns what
- If you wanted to let customers run their own storefronts, you'd need to rebuild everything

### The Solution
Add one simple concept: **merchantId**

Every piece of data now belongs to a merchant:
```
BEFORE:
  Product
  ├─ name: "Item A"
  ├─ price: 100
  └─ (no owner info)

AFTER:
  Product
  ├─ merchantId: "shop1"      ← WHO owns this?
  ├─ name: "Item A"
  ├─ price: 100
  └─ (belongs to shop1)
```

Now multiple shops can coexist in the same database, each with their own products, orders, customers.

---

## Path-Based vs Subdomain (Pick One)

### Path-Based (RECOMMENDED - Start Here) ✅
```
lineoa.com/merchant/shop1        Customer sees shop1's storefront
lineoa.com/merchant/shop2        Customer sees shop2's storefront
lineoa.com/dashboard             Merchant manages their shop
```

**Pros**: Easy to implement, no DNS changes  
**Cons**: URLs are longer

### Subdomain-Based (UPGRADE LATER) 🚀
```
shop1.lineoa.com                 Same as above, but shorter URL
shop2.lineoa.com                 
```

**Pros**: Professional-looking, shorter URLs  
**Cons**: Requires DNS wildcard setup, SSL setup

**Decision**: Start with **path-based**, upgrade to **subdomain-based** when you scale.

---

## How It Actually Works (Simple Version)

### Scenario 1: Owner signs up
```
1. Owner goes to: lineoa.com/dashboard
2. Clicks "Sign Up"
3. Enters: email, password, shop name
4. System creates Merchant record:
   {
     _id: "shop1",
     email: "owner@shop1.com",
     shopName: "My Shop",
     lineChannelAccessToken: "...",
     liffId: "...",
     promptPayId: "..."
   }
5. Owner gets JWT token with merchantId: "shop1"
6. Owner logs in, sees their admin panel
7. Owner's storefront is now LIVE at: lineoa.com/merchant/shop1
```

### Scenario 2: Customer browses shop1
```
1. Customer goes to: lineoa.com/merchant/shop1
2. System looks up: merchantId = "shop1"
3. Fetches products WHERE merchantId = "shop1"
4. Shows shop1's branding, products, LIFF
5. Customer adds items → orders from shop1
```

### Scenario 3: Customer browses shop2
```
1. Customer goes to: lineoa.com/merchant/shop2
2. System looks up: merchantId = "shop2"
3. Fetches products WHERE merchantId = "shop2"
4. Shows shop2's branding, products, LIFF (different from shop1!)
5. Customer orders from shop2 (completely separate)
```

**Key insight**: The merchantId acts like a "namespace" that separates all data.

---

## The Two Key Concepts

### 1. Merchant Context (Admin)
When owner logs in with JWT token, system knows:
```typescript
const merchantId = req.user.merchantId;  // From JWT
// Now when they fetch products:
const products = await Product.find({ merchantId });
// → Returns ONLY their products
```

### 2. URL Path (Customer)
When customer visits `/merchant/shop1`, system knows:
```typescript
const merchantId = params.merchantId;  // From URL: "shop1"
// When they view products:
const products = await Product.find({ merchantId });
// → Returns ONLY shop1's products
```

Both approaches result in DATA ISOLATION.

---

## Document Guide

You're reading this document. Next:

1. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** ← More detailed explanation with code
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** ← Visual diagrams and flows
3. **[ROADMAP_SAAS.md](./ROADMAP_SAAS.md)** ← Step-by-step implementation plan

---

## The Implementation (6 Phases)

```
Phase 1: Database
├─ Add Merchant model
├─ Add merchantId to all models
└─ (1-2 hours)

Phase 2: Authentication  
├─ Email/password signup
├─ Login with JWT
└─ (2-3 hours)

Phase 3: API Routes
├─ Update all endpoints to filter by merchantId
├─ Separate admin vs public APIs
└─ (3-4 hours)

Phase 4: Admin Dashboard
├─ Create /dashboard route
├─ Add merchant context
└─ (2-3 hours)

Phase 5: Storefront
├─ Create /merchant/[id] routes
├─ Load merchant config
└─ (2-3 hours)

Phase 6: Testing
├─ Create 2+ test merchants
├─ Verify data isolation
└─ (1-2 hours)

Total: ~13-18 hours to full SaaS version
```

---

## Critical Rule: Every Query Gets merchantId

### ❌ This is WRONG (data leak)
```typescript
const products = await Product.find({});
// Returns ALL products from ALL merchants!
```

### ✅ This is RIGHT (isolated)
```typescript
const products = await Product.find({ merchantId: req.user.merchantId });
// Returns ONLY this merchant's products
```

Every single database query needs this filter. This is the most important part.

---

## Quick Visual: Before → After

```
BEFORE (Personal)
─────────────────────────────────────────
URL:  /shop
DB:   Settings (1 row)
      Product (list, no merchant)
      Order (list, no merchant)
Auth: None (assume owner)
Code: Hardcoded "my shop"

AFTER (SaaS)
─────────────────────────────────────────
URL:  /dashboard (admin)
      /merchant/[id] (storefront)
      
DB:   Merchant (1 per owner)
      Product (each with merchantId)
      Order (each with merchantId)
      
Auth: Email/Password → JWT with merchantId

Code: Dynamic, filterable, multi-tenant
```

---

## What Stays the Same

✅ Frontend components (ProductManagement, SettingsView, etc.)  
✅ MongoDB connection  
✅ LINE LIFF integration  
✅ PromptPay QR code generation  
✅ Customer order flow  

## What Changes

🔄 Models: Add merchantId fields  
🔄 Auth: Add email/password login  
🔄 Routes: Separate admin from public  
🔄 Queries: Filter by merchantId  

---

## Next Steps

**Right now:**
1. Read this document (you're reading it!)
2. Skim [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. Look at [ARCHITECTURE.md](./ARCHITECTURE.md) diagrams

**When ready to code:**
1. Follow [ROADMAP_SAAS.md](./ROADMAP_SAAS.md) Phase 1
2. Update `src/models/index.ts` to add Merchant model
3. Add merchantId to all existing models

**When ready to test:**
1. Create 2 test merchants
2. Verify they can't see each other's data
3. Test customer order flow for both

---

## Questions?

- **What's the difference between path-based and subdomain?**  
  → [QUICK_REFERENCE.md - Simple explanation section](./QUICK_REFERENCE.md#simple-explanation)

- **How does data isolation actually work?**  
  → [QUICK_REFERENCE.md - Key concept section](./QUICK_REFERENCE.md#key-concept-merchantid-in-every-query)

- **Show me diagrams of how this works**  
  → [ARCHITECTURE.md](./ARCHITECTURE.md)

- **What do I implement first?**  
  → [ROADMAP_SAAS.md](./ROADMAP_SAAS.md)

---

## Key Takeaway

**Your personal code + merchantId field = SaaS platform**

That's really it. By adding one concept (merchantId), you transform a single-tenant app into a multi-tenant platform. Every query filters by merchantId, and magically multiple merchants can coexist without seeing each other's data.

Let's build! 🚀

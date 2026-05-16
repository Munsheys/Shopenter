# LineOA SaaS - Architecture Diagram

## Current Single-Tenant (Personal)
```
User visits: lineoa.com/shop
                    ↓
            Admin page (hardcoded)
                    ↓
            Fetch Settings (singleton)
                    ↓
            Display: My Shop, My Products, My Orders
                    ↓
         (Only ONE shop can exist)
```

## Target Multi-Tenant (SaaS)
```
┌─────────────────────────────────────────────────────────────────┐
│                         LineOA SaaS Platform                     │
└─────────────────────────────────────────────────────────────────┘

                           ┌─────────────────────────┐
                           │   Shared Infrastructure │
                           │  ├─ MongoDB (shared DB) │
                           │  ├─ API servers        │
                           │  └─ Frontend           │
                           └─────────────────────────┘

       ┌─────────────────────────┴──────────────────────────┐
       │                                                    │
       ▼                                                    ▼

┌──────────────────────────┐              ┌──────────────────────────┐
│  Merchant 1 (shop1.com)  │              │  Merchant 2 (shop2.com)  │
│                          │              │                          │
│  Admin Dashboard:        │              │  Admin Dashboard:        │
│  /dashboard              │              │  /dashboard              │
│  (as merchant 1)         │              │  (as merchant 2)         │
│                          │              │                          │
│  ├─ Products             │              │  ├─ Products             │
│  ├─ Orders               │              │  ├─ Orders               │
│  ├─ Customers            │              │  ├─ Customers            │
│  └─ Settings             │              │  └─ Settings             │
│                          │              │                          │
│  Storefront:             │              │  Storefront:             │
│  /merchant/shop1         │              │  /merchant/shop2         │
│  (customers view)        │              │  (customers view)        │
│                          │              │                          │
│  Products: [A, B, C]     │              │  Products: [X, Y, Z]     │
│  LIFF ID: liff_shop1     │              │  LIFF ID: liff_shop2     │
│  Theme: Blue             │              │  Theme: Red              │
└──────────────────────────┘              └──────────────────────────┘
         JWT: merchantId=1                        JWT: merchantId=2
              ↓                                         ↓
         API Requests                            API Requests
         Filter by merchantId                    Filter by merchantId
         ↓                                        ↓
    DB: Get products where merchantId=1     DB: Get products where merchantId=2
```

## Database Schema - Before vs After

### BEFORE (Personal - Single Tenant)
```
Settings (SINGLETON - only 1 document)
├─ shopName: "My Shop"
├─ lineChannelAccessToken: "xxx"
├─ liffId: "U123abc"
├─ promptPayId: "123456"
└─ (NO merchantId)

Product (unfiltered)
├─ _id: "prod1"
├─ name: "Item A"
├─ price: 100
└─ (NO merchantId)

Order (unfiltered)
├─ _id: "order1"
├─ product: "prod1"
└─ (NO merchantId)
```

### AFTER (SaaS - Multi-Tenant)
```
Merchant (NEW - one per shop owner)
├─ _id: "merchant_1"
├─ email: "owner@shop1.com"
├─ shopName: "My Shop"
├─ theme: "light"
├─ lineChannelAccessToken: "xxx_merchant1"
├─ liffId: "U123abc_merchant1"
├─ promptPayId: "123456_merchant1"
└─ createdAt: Date

Merchant (NEW - different owner)
├─ _id: "merchant_2"
├─ email: "owner@shop2.com"
├─ shopName: "Another Shop"
├─ theme: "dark"
├─ lineChannelAccessToken: "xxx_merchant2"
├─ liffId: "U123abc_merchant2"
├─ promptPayId: "123456_merchant2"
└─ createdAt: Date

Product (UPDATED - now filtered by merchantId)
├─ _id: "prod1"
├─ merchantId: "merchant_1"  ← NEW
├─ name: "Item A"
└─ price: 100

Product (UPDATED - different merchant)
├─ _id: "prod2"
├─ merchantId: "merchant_2"  ← NEW
├─ name: "Item X"
└─ price: 200

Order (UPDATED - isolated per merchant)
├─ _id: "order1"
├─ merchantId: "merchant_1"  ← NEW
├─ product: "prod1"
└─ totalTHB: 100

Order (UPDATED - different merchant)
├─ _id: "order2"
├─ merchantId: "merchant_2"  ← NEW
├─ product: "prod2"
└─ totalTHB: 200
```

## API Flow - Admin Dashboard

```
Merchant logs in with email/password
           ↓
   /api/merchant/auth/login
           ↓
   Check email + password
           ↓
   Generate JWT: { merchantId: "merchant_1", ... }
           ↓
   Return token to frontend
           ↓
Merchant accesses /dashboard
           ↓
Frontend sends requests with Authorization header
           ↓
/api/merchant/products (with JWT)
           ↓
Middleware extracts merchantId from JWT
           ↓
Query DB: Product.find({ merchantId: "merchant_1" })
           ↓
Return ONLY merchant_1's products
```

## API Flow - Storefront (Customer)

```
Customer visits: lineoa.com/merchant/shop1
           ↓
URL contains merchantId (shop1)
           ↓
/merchant/shop1/page.tsx loads
           ↓
Fetch /api/storefront/shop1/shop-info
           ↓
Extract merchantId from URL path
           ↓
Query DB: Merchant.findOne({ _id: "shop1" })
           ↓
Get merchant config: name, LIFF ID, theme, branding
           ↓
Display storefront with merchant's branding
           ↓
Customer adds items to cart → checkout
           ↓
POST /api/storefront/shop1/orders
           ↓
Create order with merchantId: "shop1"
           ↓
Show merchant's PromptPay QR code
```

## URL Structure Comparison

### Personal (Single Tenant)
```
Admin:      /                    (no merchant selector)
Storefront: /shop                (hardcoded)
APIs:       /api/products        (no merchant param)
```

### SaaS (Multi-Tenant)
```
Admin:      /dashboard           (auth required, shows YOUR shop)
Storefront: /merchant/shop1      (no auth, shows shop1's products)
            /merchant/shop2      (no auth, shows shop2's products)

APIs:
  Admin:    /api/merchant/products      (JWT required)
            /api/merchant/orders
            /api/merchant/settings
            
  Public:   /api/storefront/shop1/products    (no auth)
            /api/storefront/shop1/shop-info
            /api/storefront/shop1/orders      (place order)
```

## Request Flow: Merchant Admin vs Customer

### Admin Request (Merchant manages their shop)
```
Frontend (Dashboard)
  ↓
GET /api/merchant/products
  ↓
Middleware: Extract JWT token
  ↓
JWT decoded: { merchantId: "merchant_1" }
  ↓
Route handler:
  const products = await Product.find({ 
    merchantId: "merchant_1"  // ← SCOPED TO MERCHANT
  })
  ↓
Return merchant_1's products only
```

### Customer Request (Public storefront)
```
Frontend (Storefront at /merchant/shop1)
  ↓
GET /api/storefront/shop1/products
  ↓
Route handler:
  const merchant = await Merchant.findOne({ _id: "shop1" })
  const products = await Product.find({
    merchantId: merchant._id  // ← SCOPED TO SHOP
  })
  ↓
Return shop1's products only (public visibility)
```

## Security: Data Isolation

### ✅ Correct (Safe)
```typescript
// Admin route - extract from JWT
const merchantId = req.user.merchantId;
const products = await Product.find({ merchantId });

// Storefront route - extract from URL, verify exists
const merchant = await Merchant.findOne({ _id: params.merchantId });
const products = await Product.find({ merchantId: merchant._id });
```

### ❌ Wrong (Security Hole)
```typescript
// NEVER trust URL params directly
const merchantId = req.query.merchantId;  // User could change this!
const products = await Product.find({ merchantId });

// NEVER skip merchantId filter
const products = await Product.find({});  // Would return ALL merchants' products!
```

## State Diagram: Merchant Lifecycle

```
┌─────────────────────────────────────────────────────┐
│              Merchant Signs Up                      │
│  /api/merchant/auth/signup                          │
│  { email, password, shopName }                      │
│                    ↓                                 │
│  ✓ Email unique?                                    │
│  ✓ Hash password                                    │
│  ✓ Create Merchant document                         │
│                    ↓                                 │
│         Merchant Created (ONBOARDING)               │
│  ├─ merchantId: generated                           │
│  ├─ status: "active"                                │
│  ├─ lineChannelAccessToken: empty (step 2)          │
│  └─ liffId: empty (step 2)                          │
│                    ↓                                 │
│   Merchant logs in                                  │
│   /api/merchant/auth/login                          │
│   { email, password }                               │
│         ↓                                            │
│   ✓ Email exists?                                   │
│   ✓ Password matches?                               │
│   ✓ Generate JWT: { merchantId, email }             │
│         ↓                                            │
│   Return JWT (saved in localStorage)                │
│         ↓                                            │
│   Merchant redirected to /dashboard                 │
│         ↓                                            │
│   Dashboard shows: "Setup Required"                 │
│   (waiting for LINE OA credentials)                 │
│         ↓                                            │
│   Merchant inputs:                                  │
│   - Channel Access Token                            │
│   - Channel Secret                                  │
│   - LIFF ID                                         │
│   - PromptPay ID                                    │
│         ↓                                            │
│   POST /api/merchant/settings                       │
│         ↓                                            │
│   ✓ Verify merchantId from JWT                      │
│   ✓ Update Merchant document                        │
│         ↓                                            │
│      Setup Complete! (READY)                        │
│  ├─ lineChannelAccessToken: set                     │
│  ├─ liffId: set                                     │
│  ├─ Can now create products                         │
│  └─ Storefront is live                              │
│                    ↓                                 │
│     Customers can visit:                            │
│     /merchant/[merchantId]                          │
└─────────────────────────────────────────────────────┘
```

## Migration Strategy: Personal → SaaS

### What stays the same:
- Frontend components (ProductManagement, SettingsView, etc.)
- Database connection (MongoDB)
- LINE LIFF integration
- PromptPay QR code generation

### What changes:
- Models: Add `merchantId` to all schemas
- Auth: Email/password login instead of no auth
- Routes: Separate `/api/merchant/*` from `/api/storefront/*`
- URLs: `/merchant/[merchantId]` instead of `/shop`

### Zero-downtime approach:
1. New codebase (lineoa-saas) in parallel
2. Test with multiple merchants locally
3. Deploy when ready
4. Old `/shop` still works (can redirect if needed)

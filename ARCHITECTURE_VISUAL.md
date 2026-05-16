# LineOA SaaS - Visual Architecture Guide

## 🌐 Website Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      lineoa.com                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Home Page: / ─────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Marketing Landing Page                                   │   │
│  │ • Features, Benefits, Pricing                            │   │
│  │ • [Get Started Free] [Sign In] buttons                   │   │
│  │ • Hero section, testimonials, CTAs                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                                    ↓                  │
│    [Get Started Free]                    [Sign In]               │
│           ↓                                    ↓                  │
│                                                                   │
│  Sign-Up Page: /signup ────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Create Account                                           │   │
│  │ • Shop Name input                                        │   │
│  │ • Email input                                            │   │
│  │ • Password input                                         │   │
│  │ • [Create Shop Account] button                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                                                       │
│    POST /api/merchant/auth/signup                               │
│    ├─ Hash password                                              │
│    ├─ Create Merchant record                                     │
│    ├─ Generate JWT                                               │
│    └─ Set cookie + redirect to /dashboard                       │
│                                                                   │
│  Login Page: /login ────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Sign In                                                  │   │
│  │ • Email input                                            │   │
│  │ • Password input                                         │   │
│  │ • [Login to Dashboard] button                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                                                       │
│    POST /api/merchant/auth/login                                │
│    ├─ Verify email exists                                        │
│    ├─ Compare password                                           │
│    ├─ Generate JWT                                               │
│    └─ Set cookie + redirect to /dashboard                       │
│                                                                   │
│  Dashboard: /dashboard ────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [Products] [Orders] [Customers] [Settings] [Reports]    │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Products Tab:                                            │   │
│  │ • List products (filtered by merchantId)                 │   │
│  │ • Add/Edit/Delete product                                │   │
│  │ • Upload images                                          │   │
│  │                                                          │   │
│  │ Orders Tab:                                              │   │
│  │ • View customer orders                                   │   │
│  │ • Update shipping status                                 │   │
│  │ • Send payment reminders                                 │   │
│  │                                                          │   │
│  │ Settings Tab:                                            │   │
│  │ • Configure LINE OA (Channel ID, LIFF ID)                │   │
│  │ • Set PromptPay ID                                       │   │
│  │ • Choose theme (light/dark)                              │   │
│  │ • Upload shop logo                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                                                       │
│    All dashboard APIs require JWT cookie                        │
│    GET /api/products ← Returns merchant's products only         │
│    GET /api/orders ← Returns merchant's orders only             │
│    POST /api/settings ← Saves merchant's settings               │
│                                                                   │
│  Storefront: /merchant/[merchantId] ───────────────────────────  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Public URL: lineoa.com/merchant/507f1f77...              │   │
│  │ (No authentication required)                             │   │
│  │                                                          │   │
│  │ Header: [Shop Logo] Shop Name [Theme]                    │   │
│  │                                                          │   │
│  │ Product Grid:                                            │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │   │
│  │ │ Product  │ │ Product  │ │ Product  │                  │   │
│  │ │ Image    │ │ Image    │ │ Image    │                  │   │
│  │ │ $Price   │ │ $Price   │ │ $Price   │                  │   │
│  │ └──────────┘ └──────────┘ └──────────┘                  │   │
│  │                                                          │   │
│  │ [Search] [Filter by Category] [Sort by Price]            │   │
│  │                                                          │   │
│  │ Shopping Cart + Checkout with PromptPay QR               │   │
│  └──────────────────────────────────────────────────────────┘   │
│           ↓                                                       │
│    GET /api/storefront/507f1f77.../shop-info                    │
│    ├─ Returns shopName, theme, logo, etc.                       │
│    ↓                                                              │
│    GET /api/storefront/507f1f77.../products                     │
│    ├─ Returns products filtered by merchantId                   │
│    ↓                                                              │
│    POST /api/storefront/507f1f77.../orders                      │
│    └─ Creates order with merchantId                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB Database                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Merchants Collection                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ {                                                       │   │
│  │   _id: ObjectId("507f1f77bcf86cd799439011"),          │   │
│  │   email: "owner@example.com",                          │   │
│  │   passwordHash: "$2a$12$...",                          │   │
│  │   shopName: "Korean Fashion Store",                    │   │
│  │   liffId: "1234567890",                                │   │
│  │   promptPayId: "0812345678",                           │   │
│  │   theme: "dark",                                       │   │
│  │   status: "active",                                    │   │
│  │   createdAt: ISODate(...)                              │   │
│  │ }                                                       │   │
│  │                                                         │   │
│  │ {                                                       │   │
│  │   _id: ObjectId("610g2g88cdg97de800550022"),          │   │
│  │   email: "owner2@example.com",                         │   │
│  │   ...                                                  │   │
│  │ }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓ (One-to-Many)        ↓ (One-to-Many)                  │
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────────────┐     │
│  │  Products Collection     │  │  Orders Collection       │     │
│  ├──────────────────────────┤  ├──────────────────────────┤     │
│  │ {                        │  │ {                        │     │
│  │   _id: ObjectId(...),    │  │   _id: ObjectId(...),    │     │
│  │   merchantId: 507f...,   │  │   merchantId: 507f...,   │     │
│  │   name: "Korean Jacket", │  │   items: [...],          │     │
│  │   price: 1500,           │  │   totalTHB: 3500,        │     │
│  │   categories: [...]      │  │   status: "shipped",     │     │
│  │ }                        │  │   createdAt: ...         │     │
│  │ {                        │  │ }                        │     │
│  │   merchantId: 610g...,   │  │ {                        │     │
│  │   name: "Phone",         │  │   merchantId: 610g...,   │     │
│  │   price: 15000,          │  │   ...                    │     │
│  │   ...                    │  │ }                        │     │
│  │ }                        │  └──────────────────────────┘     │
│  └──────────────────────────┘                                   │
│         ↓ Isolated by merchantId                                │
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────────────┐     │
│  │  Customers Collection    │  │  Messages Collection     │     │
│  ├──────────────────────────┤  ├──────────────────────────┤     │
│  │ {                        │  │ {                        │     │
│  │   merchantId: 507f...,   │  │   merchantId: 507f...,   │     │
│  │   displayName: "John",   │  │   lineUserId: "123...",  │     │
│  │   ...                    │  │   text: "Hi!",           │     │
│  │ }                        │  │   ...                    │     │
│  │ {                        │  │ }                        │     │
│  │   merchantId: 610g...,   │  │ {                        │     │
│  │   ...                    │  │   merchantId: 610g...,   │     │
│  │ }                        │  │   ...                    │     │
│  │                          │  │ }                        │     │
│  └──────────────────────────┘  └──────────────────────────┘     │
│                                                                   │
│  KEY PRINCIPLE:                                                  │
│  EVERY record has merchantId field                              │
│  EVERY query filters by merchantId                              │
│  COMPLETE data isolation guaranteed                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    LOGIN SEQUENCE                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. User submits form                                             │
│     ├─ email: "owner@example.com"                                 │
│     └─ password: "secret123"                                      │
│                ↓                                                   │
│  2. POST /api/merchant/auth/login                                │
│     ├─ Body: { email, password }                                  │
│     ↓                                                              │
│  3. Server: Find merchant by email                               │
│     ├─ Query: Merchant.findOne({ email })                        │
│     ├─ If not found → Return 401                                 │
│     ↓                                                              │
│  4. Server: Compare password with bcrypt hash                    │
│     ├─ bcrypt.compare(providedPassword, storedHash)              │
│     ├─ If no match → Return 401                                  │
│     ↓                                                              │
│  5. Server: Password matches! ✓                                   │
│     ├─ Generate JWT payload: {                                    │
│     │   merchantId: "507f...",                                    │
│     │   email: "owner@example.com",                               │
│     │   shopName: "Korean Fashion Store"                          │
│     │ }                                                            │
│     ├─ Sign with secret: jwt.sign(payload, JWT_SECRET)           │
│     ├─ Token expires in 7 days                                    │
│     ↓                                                              │
│  6. Server: Send response with cookie                            │
│     ├─ Set-Cookie: merchant_token=eyJ...; HttpOnly; Path=/       │
│     ├─ Return: { success: true, merchant: {...} }                │
│     ↓                                                              │
│  7. Browser: Cookie automatically stored                         │
│     ├─ Subsequent requests include cookie                        │
│     ↓                                                              │
│  8. Browser: Redirect to /dashboard                              │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Request Authentication

```
┌──────────────────────────────────────────────────────────────────┐
│              AUTHENTICATED REQUEST (Admin)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Browser has valid merchant_token cookie from login            │
│                                                                    │
│  2. GET /api/products                                            │
│     ├─ Request headers include:                                   │
│     │  └─ Cookie: merchant_token=eyJ...                          │
│     ↓                                                              │
│  3. Server: Extract JWT from cookie                              │
│     ├─ Read: Cookie: merchant_token=eyJ...                       │
│     ├─ Call: getMerchantFromRequest(req)                         │
│     ├─ Verify JWT signature with JWT_SECRET                      │
│     ├─ Check expiration date                                      │
│     ├─ If valid: Extract payload                                 │
│     │  └─ { merchantId: "507f...", email: "...", shopName: "..." }
│     ├─ If invalid → Return 401 Unauthorized                      │
│     ↓                                                              │
│  4. Server: Use merchantId to filter database query              │
│     ├─ Query: Product.find({ merchantId: "507f..." })            │
│     ├─ ONLY returns products belonging to this merchant          │
│     ↓                                                              │
│  5. Server: Return response with merchant's data only            │
│     ├─ [                                                          │
│     │   { name: "Korean Jacket", price: 1500, ... },            │
│     │   { name: "Korean Pants", price: 1200, ... }              │
│     │ ]                                                           │
│     ↓                                                              │
│  6. Browser: Display merchant's products on dashboard             │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📍 Data Isolation Guarantee

```
┌──────────────────────────────────────────────────────────────────┐
│         MERCHANT A vs MERCHANT B - COMPLETE ISOLATION             │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  MERCHANT A                        MERCHANT B                     │
│  ID: 507f1f77bcf86cd799439011     ID: 610g2g88cdg97de800550022  │
│                                                                    │
│  Email: shop1@test.com             Email: shop2@test.com          │
│  Shop: Korean Fashion Store        Shop: Electronics Store        │
│  Products:                         Products:                      │
│  • Korean Jacket                   • Wireless Headphones          │
│  • Korean Pants                    • Laptop                       │
│  • Shoes                           • Phone                        │
│                                                                    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                    │
│  MERCHANT A LOGS IN                                               │
│  ↓                                                                │
│  JWT obtained with merchantId: 507f...                           │
│  ↓                                                                │
│  GET /api/products                                               │
│  └─ Server extracts: merchantId = "507f..."                      │
│  └─ Query: Product.find({ merchantId: "507f..." })               │
│  └─ Database returns ONLY:                                        │
│     • Korean Jacket (507f...)                                    │
│     • Korean Pants (507f...)                                     │
│     • Shoes (507f...)                                            │
│                                                                    │
│  ✅ Merchant A sees ONLY their products                          │
│  ❌ Merchant A cannot see: Headphones, Laptop, Phone             │
│                                                                    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                    │
│  MERCHANT B LOGS IN                                               │
│  ↓                                                                │
│  JWT obtained with merchantId: 610g...                           │
│  ↓                                                                │
│  GET /api/products                                               │
│  └─ Server extracts: merchantId = "610g..."                      │
│  └─ Query: Product.find({ merchantId: "610g..." })               │
│  └─ Database returns ONLY:                                        │
│     • Wireless Headphones (610g...)                              │
│     • Laptop (610g...)                                           │
│     • Phone (610g...)                                            │
│                                                                    │
│  ✅ Merchant B sees ONLY their products                          │
│  ❌ Merchant B cannot see: Jacket, Pants, Shoes                  │
│                                                                    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                    │
│  WHY THIS WORKS:                                                  │
│  1. Every record in database tagged with merchantId              │
│  2. JWT contains merchantId from login                           │
│  3. Every query MUST filter by merchantId                        │
│  4. Server validates JWT before responding                       │
│  5. No way to bypass merchantId filter                           │
│  6. Complete data separation guaranteed                          │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Storefront (Public Access)

```
┌──────────────────────────────────────────────────────────────────┐
│           PUBLIC STOREFRONT - NO AUTHENTICATION                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Customer visits: lineoa.com/merchant/507f1f77bcf86cd799439011   │
│  (No login required - completely public)                          │
│                ↓                                                   │
│  1. URL parameter extracted: merchantId = "507f..."              │
│     ├─ No JWT needed                                              │
│     ├─ No authentication                                          │
│     ├─ Publicly accessible                                        │
│                ↓                                                   │
│  2. GET /api/storefront/507f.../shop-info                        │
│     ├─ Extract merchantId from URL: "507f..."                    │
│     ├─ Query: Merchant.findById("507f...")                       │
│     ├─ Return:                                                    │
│     │  {                                                          │
│     │    name: "Korean Fashion Store",                           │
│     │    liffId: "1234567890",                                   │
│     │    theme: "dark",                                          │
│     │    promptPayId: "0812345678",                              │
│     │    shippingCompanies: ["Kerry", "DHL"]                     │
│     │  }                                                          │
│                ↓                                                   │
│  3. Page renders with merchant's branding                        │
│     ├─ Shop name: "Korean Fashion Store"                        │
│     ├─ Theme: Dark mode                                          │
│     ├─ Logo: (if uploaded)                                       │
│                ↓                                                   │
│  4. GET /api/storefront/507f.../products                         │
│     ├─ Extract merchantId from URL: "507f..."                    │
│     ├─ Query: Product.find({                                     │
│     │   merchantId: "507f...",                                   │
│     │   isActive: true                                           │
│     │ })                                                          │
│     ├─ Return ONLY products for this merchant:                   │
│     │  [                                                          │
│     │    { name: "Korean Jacket", price: 1500, ... },           │
│     │    { name: "Korean Pants", price: 1200, ... },            │
│     │    { name: "Shoes", price: 800, ... }                     │
│     │  ]                                                          │
│                ↓                                                   │
│  5. Page displays product grid                                    │
│     ├─ Products grid with images/prices                          │
│     ├─ Search and filter                                         │
│     ├─ Add to cart                                                │
│     ├─ Checkout with PromptPay QR                                │
│                ↓                                                   │
│  6. Customer creates order:                                       │
│     POST /api/storefront/507f.../orders                          │
│     ├─ Extract merchantId from URL: "507f..."                    │
│     ├─ Create order with: { merchantId: "507f...", ... }        │
│     ├─ Order saved to database tagged with "507f..."            │
│                ↓                                                   │
│  7. Merchant A (owner of 507f...) later:                         │
│     ├─ Logs in to /dashboard                                     │
│     ├─ Views /orders                                              │
│     ├─ Sees the customer's order                                  │
│     ├─ Can ship and track it                                      │
│                                                                    │
│  KEY: Path-based lookup (merchantId in URL)                       │
│       No authentication or JWT needed                             │
│       Accessible to anyone                                        │
│       Data filtered by merchantId                                 │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Request Types Summary

```
                    ┌─────────────────────────────────────┐
                    │        REQUEST TYPES                 │
                    └─────────────────────────────────────┘
                                ↓
                ┌───────────────┬─────────────────┐
                ↓               ↓                 ↓
            PUBLIC         ADMIN            EXTERNAL
         (Storefront)    (Dashboard)      (Webhooks)
                ↓               ↓                 ↓
          No Auth         JWT Required      API Key
          Path-Based      Cookie-Based      Auth Header
          
    GET /api/          POST/GET /api/      POST /api/
    storefront/*        products            webhook
    
    - /shop-info       - /products         - Line events
    - /products        - /orders           - Validation
    - /orders (POST)   - /customers
                       - /settings
                       - /messages

    Merchant lookup:   Merchant lookup:    Merchant lookup:
    From URL path      From JWT payload    From request body
    
    Data filtering:    Data filtering:     Data filtering:
    By merchantId      By merchantId       By merchantId
    from path          from JWT            from body
```

---

## 🎯 One More Thing: How Everything Connects

```
                        SINGLE CODEBASE
                        UNLIMITED SHOPS
                            ↓
    ┌───────────────────────────────────────────────────────┐
    │                                                         │
    │   Landing Page (/ ) - Marketing site for all shops    │
    │   Signup (/signup) - Create new merchant account      │
    │   Login (/login) - Sign in existing merchant          │
    │           ↓                                             │
    │   ┌─────────────────────────────────────┐             │
    │   │   Dashboard (/dashboard)            │             │
    │   │   • Products                        │             │
    │   │   • Orders                          │             │
    │   │   • Settings                        │             │
    │   │   • Reports                         │             │
    │   │   (Shows ONLY this merchant's data) │             │
    │   └─────────────────────────────────────┘             │
    │           ↓ (Each merchant generates unique URL)      │
    │   ┌─────────────────────────────────────┐             │
    │   │ Storefront (/merchant/[id])         │             │
    │   │ • Public-facing store               │             │
    │   │ • Customers browse and buy          │             │
    │   │ • Shows ONLY this merchant's stuff  │             │
    │   └─────────────────────────────────────┘             │
    │                                                         │
    │   SAME CODE                                            │
    │   ✓ Merchant 1 uses it                                │
    │   ✓ Merchant 2 uses it                                │
    │   ✓ Merchant N uses it                                │
    │                                                         │
    │   DIFFERENT DATA                                       │
    │   ✓ Each merchant sees only their data                │
    │   ✓ Complete isolation via merchantId filter          │
    │   ✓ Database queries filtered automatically           │
    │                                                         │
    └───────────────────────────────────────────────────────┘
```

This is the power of **multi-tenancy with path-based routing** - build once, scale to millions! 🚀

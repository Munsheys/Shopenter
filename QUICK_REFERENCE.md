# Quick Reference: Subdomain vs Path-Based

## Simple Explanation

### Path-Based (WHAT WE'RE USING) ✅
```
URL: lineoa.com/merchant/shop1
URL: lineoa.com/merchant/shop2

In code:
  const merchantId = params.merchantId;  // Extract "shop1" from URL
  const merchant = await Merchant.findOne({ _id: merchantId });
```

**Pros:**
- Simple to implement
- No DNS setup needed
- Works immediately

**Cons:**
- Longer URLs
- Less professional-looking
- Harder to brand

---

### Subdomain-Based (FUTURE UPGRADE) 🚀
```
URL: shop1.lineoa.com
URL: shop2.lineoa.com

In code:
  const subdomain = req.headers.host.split('.')[0];  // Extract "shop1"
  const merchant = await Merchant.findOne({ subdomain });
```

**Pros:**
- Professional-looking
- Each shop feels like its own site
- Better for white-labeling (customer.shop)

**Cons:**
- Requires wildcard DNS: *.lineoa.com
- Need wildcard SSL certificate
- Slightly more complex setup

---

## Current Implementation: Path-Based

### Storefront URLs
```
lineoa.com/merchant/shop1       → Shop 1's storefront
lineoa.com/merchant/shop2       → Shop 2's storefront
lineoa.com/merchant/myshop      → Shop 3's storefront
```

### Admin URLs
```
lineoa.com/dashboard            → Merchant dashboard (requires login)
lineoa.com/dashboard/products   → Merchant's products
lineoa.com/dashboard/orders     → Merchant's orders
lineoa.com/dashboard/settings   → Merchant's settings
```

### API URLs
```
# Admin APIs (require JWT with merchantId)
/api/merchant/products
/api/merchant/orders
/api/merchant/settings
/api/merchant/auth/login
/api/merchant/auth/signup

# Storefront APIs (public, no auth)
/api/storefront/[merchantId]/products
/api/storefront/[merchantId]/shop-info
/api/storefront/[merchantId]/orders   (place order)
```

---

## How It Works: Three Different Users

### 1. Shop Owner 1 (Merchant Admin)
```
1. Signs up: /api/merchant/auth/signup
   Email: owner1@shop1.com
   Password: secret123
   ↓
2. Gets JWT token with merchantId: "shop1"
   ↓
3. Logs into dashboard at /dashboard
   (JWT in Authorization header)
   ↓
4. Sees ONLY their products, orders, customers
   GET /api/merchant/products
   → Query: Product.find({ merchantId: "shop1" })
   → Returns only shop1's products
   ↓
5. Their storefront is live at: /merchant/shop1
```

### 2. Shop Owner 2 (Different Merchant Admin)
```
1. Signs up: /api/merchant/auth/signup
   Email: owner2@shop2.com
   Password: different456
   ↓
2. Gets JWT token with merchantId: "shop2"
   ↓
3. Logs into dashboard at /dashboard
   (Different JWT!)
   ↓
4. Sees ONLY their products, orders, customers
   GET /api/merchant/products
   → Query: Product.find({ merchantId: "shop2" })
   → Returns only shop2's products (NOT shop1's!)
   ↓
5. Their storefront is live at: /merchant/shop2
```

### 3. Customer Shopping
```
1. Visits shop1's storefront: /merchant/shop1
   (No login needed)
   ↓
2. Frontend fetches products:
   GET /api/storefront/shop1/products
   → Returns only shop1's products
   ↓
3. Sees shop1's branding, LIFF ID, PromptPay QR
   ↓
4. Places order → sent to shop1's orders table
   POST /api/storefront/shop1/orders
   → Creates order with merchantId: "shop1"
   ↓
5. Visits shop2's storefront: /merchant/shop2
   (Different shop, different products, different LIFF!)
   ↓
6. Doesn't see shop1's data at all
```

---

## Key Concept: merchantId in Every Query

### Wrong (leaks data between shops)
```typescript
// ❌ NO FILTER - SECURITY HOLE
const orders = await Order.find({});  
// Returns ALL merchants' orders!
```

### Correct (isolated per merchant)
```typescript
// ✅ ALWAYS FILTER BY merchantId
const orders = await Order.find({ merchantId: "shop1" });
// Returns ONLY shop1's orders

// Or from JWT context:
const merchantId = req.user.merchantId;
const orders = await Order.find({ merchantId });
// Returns ONLY current merchant's orders
```

---

## Testing Isolation

### Verify merchant 1 can't see merchant 2's data:
```bash
# Create Merchant 1
curl -X POST http://localhost:3000/api/merchant/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"owner1@test.com","password":"pass123","shopName":"Shop 1"}'
# Response: { token: "jwt_merchant1", merchantId: "..." }

# Create Merchant 2
curl -X POST http://localhost:3000/api/merchant/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"owner2@test.com","password":"pass456","shopName":"Shop 2"}'
# Response: { token: "jwt_merchant2", merchantId: "..." }

# Login as Merchant 1, get JWT
export JWT_1="..."
curl -X GET http://localhost:3000/api/merchant/products \
  -H "Authorization: Bearer $JWT_1"
# Should return [] (no products yet)

# Login as Merchant 2, get JWT
export JWT_2="..."
curl -X GET http://localhost:3000/api/merchant/products \
  -H "Authorization: Bearer $JWT_2"
# Should return [] (no products yet)

# Merchant 1 creates a product
curl -X POST http://localhost:3000/api/merchant/products \
  -H "Authorization: Bearer $JWT_1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Product A","price":100}'
# Returns product with merchantId: merchant1._id

# Merchant 1 fetches products
curl -X GET http://localhost:3000/api/merchant/products \
  -H "Authorization: Bearer $JWT_1"
# Returns: [{ name: "Product A", merchantId: "merchant1._id" }]

# ✅ TEST: Merchant 2 should NOT see Merchant 1's product
curl -X GET http://localhost:3000/api/merchant/products \
  -H "Authorization: Bearer $JWT_2"
# Returns: [] (empty - CORRECT! Data is isolated)
```

---

## Future: Upgrading to Subdomain-Based

When you're ready to upgrade from path-based to subdomain-based:

### Step 1: Update Merchant model
```typescript
// Add subdomain to Merchant
const MerchantSchema = new mongoose.Schema({
  ...existing fields...,
  subdomain: { type: String, unique: true }  // "shop1", "shop2", etc.
});
```

### Step 2: Update middleware
```typescript
// OLD (Path-based)
const merchantId = params.merchantId;

// NEW (Subdomain-based)
const subdomain = req.headers.host.split('.')[0];
const merchant = await Merchant.findOne({ subdomain });
const merchantId = merchant._id;
```

### Step 3: DNS & SSL
- Add wildcard DNS: `*.lineoa.com → your-server`
- Add wildcard SSL certificate (from Let's Encrypt)

### Step 4: Users get new URLs
```
Old: lineoa.com/merchant/shop1
New: shop1.lineoa.com
```

That's it! Everything else stays the same because we're already filtering by `merchantId` in the database.

---

## Architecture Checklist

Before moving to next phase, verify:

- [ ] Every schema has `merchantId` field
- [ ] Every database query filters by `merchantId`
- [ ] JWT contains `merchantId` for admin routes
- [ ] Public routes extract merchantId from URL safely
- [ ] Tested with 2+ merchants to verify isolation
- [ ] No hardcoded merchant references in code

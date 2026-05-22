# Multi-Platform Product Field Schema

## Overview
This document defines the unified product schema that shopenter will use, with conditional field visibility based on which platforms the merchant is selling on.

**Design Principle**: One product form; fields appear/disappear based on enabled platforms.

---

## Field Mapping Matrix

### Legend
- 🔴 **Required** — Must be provided
- 🟡 **Recommended** — Should provide but not strictly required
- ⚪ **Optional** — Nice to have
- `[PLATFORM]` — Field shown only if that platform is enabled

---

## Core Product Fields (Always Visible)

These fields are required for ALL platforms:

| Field | Type | Validation | Required On |
|-------|------|-----------|------------|
| `productName` | String | 1-255 chars | LINE, TikTok, Shopee, Lazada |
| `description` | String | 1-5000 chars | LINE, TikTok, Shopee, Lazada |
| `price` | Number | > 0 | LINE, TikTok, Shopee, Lazada |
| `categoryId` | String | Must exist in category tree | LINE, TikTok, Shopee, Lazada |
| `images` | Array | Min 1, max varies by platform | LINE, TikTok, Shopee, Lazada |
| `sku` | String | Unique per product | Recommended for all |
| `stock` | Number | >= 0 | LINE, TikTok, Shopee, Lazada (single pool) |
| `isActive` | Boolean | Toggle visibility | All platforms |

---

## Platform-Exclusive Fields

### 🟣 SHOPEE-ONLY FIELDS

Display these fields **only when Shopee is enabled**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `logistics_info` | Array | 🔴 **REQUIRED for Shopee (Thailand)** | `[{ enabled: bool, shipping_type: "standard"\|"dropship", weight: number, item_sku: string }]` |
| `weight` | Number | 🔴 **REQUIRED if logistics enabled** | In grams; used for shipping calculations |
| `dimensions` | Object | 🟡 Recommended | `{ length, width, height }` in cm |
| `brand` | String | 🟡 Recommended | Shopee brand list; some categories require |
| `tier_variation` | Array | ⚪ Optional | For product variants: `[{ name: "Size"\|"Color", options: ["S","M","L"] }]` |
| `warranty_type` | String | ⚪ Optional | `"International"`, `"Domestic"`, `"None"` |
| `warranty_period` | Number | ⚪ Optional | Duration in months |
| `min_order_quantity` | Number | ⚪ Optional | Minimum units per order |
| `video_url` | String | ⚪ Optional | Shopee allows product demo video |

**UI Display**:
```
Product Name: [________]
Description: [________________]
Price: [____]
Category: [Select ▼]
Images: [+ Upload]
SKU: [________]
Stock: [____]

─────────────────────────────────
🟣 SHOPEE EXCLUSIVE FIELDS
─────────────────────────────────
Weight (grams): [____] 🟣
Dimensions: L[___] W[___] H[___] (cm) 🟣
Brand: [Select ▼] 🟣
Logistics Info: 🟣
  ☐ Enable Shipping
  Shipping Type: Standard / Dropship 🟣
  Min Order: [__] units 🟣
Video URL: [________________] 🟣
```

---

### 🔵 TIKTOK SHOP-ONLY FIELDS

Display these fields **only when TikTok Shop is enabled**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `warrantyType` | String | ⚪ Optional | TikTok category-specific: `"No Warranty"`, `"Limited"`, `"Extended"` |
| `certifications` | Array | 🟡 Conditional | Some categories require (e.g., electronics): `["CE", "FCC", "RoHS"]` |
| `size_chart` | Object | ⚪ Optional | For apparel: `{ sizes: ["XS", "S", "M"], measurements: {...} }` |
| `attributes` | Object | 🟡 Conditional | **Category-specific**; queried from TikTok's category API |
| `fulfillment_type` | String | ⚪ Optional | `"self_fulfillment"` or `"seller_fulfillment"` |

**UI Display**:
```
─────────────────────────────────
🔵 TIKTOK SHOP EXCLUSIVE FIELDS
─────────────────────────────────
Warranty Type: [Select ▼] 🔵
  └─ (Updated based on category)
Certifications: [+ Add] 🔵
  └─ Available: CE, FCC, RoHS, etc.
Size Chart: [Edit] 🔵
Fulfillment: Self / Seller 🔵
Category Attributes: 🔵
  Material: [________]
  Care Instructions: [________]
  (Dynamically generated based on TikTok category)
```

---

### 🟠 LAZADA-ONLY FIELDS

Display these fields **only when Lazada is enabled**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `short_description` | String | 🔴 **REQUIRED** | 1-100 chars; separate from main description |
| `brand` | String | 🔴 **REQUIRED for most categories** | Must exist in Lazada brand list |
| `model` | String | 🔴 **REQUIRED for some categories** | Especially electronics, appliances |
| `attributes` | Object | 🔴 **REQUIRED** | **Heavy category dependency**; examples: |
| ├─ `warranty_type` | String | 🟡 Conditional | `"Domestic"`, `"International"`, `"No Warranty"` |
| ├─ `care_instructions` | String | 🟡 Conditional | For textiles, furniture |
| ├─ `material` | String | 🟡 Conditional | For fashion, home items |
| ├─ `color` | String | 🟡 Conditional | For many product categories |
| ├─ `size` | String | 🟡 Conditional | For apparel, shoes |
| ├─ `special_price` | Number | ⚪ Optional | If using supply_price model |
| `cpv_sku` | String | 🟡 Conditional | Category Product Variation SKU; required for variants |
| `package_weight` | Number | ⚪ Optional | In kg; for shipping |
| `package_length` | Number | ⚪ Optional | In cm |
| `package_width` | Number | ⚪ Optional | In cm |
| `package_height` | Number | ⚪ Optional | In cm |

**UI Display**:
```
─────────────────────────────────
🟠 LAZADA EXCLUSIVE FIELDS
─────────────────────────────────
Short Description: [________] 🟠 (max 100 chars)
Brand: [Select ▼] 🟠 (REQUIRED)
Model: [________] 🟠 (if category requires)

Category Attributes: 🟠
  Warranty Type: [Select ▼] 🟠
  Color: [________] 🟠
  Material: [________] 🟠
  (5-15 fields depending on category)

Package Dimensions (kg/cm): 🟠
  Weight: [____] kg 🟠
  L[___] W[___] H[___] 🟠
```

---

### 🟢 LINE OA FALLBACK FIELDS

Display these fields **always visible** (used for storefront):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `displayImageUrl` | String | 🔴 **REQUIRED** | Main product image for storefront |
| `displayCategories` | Array | 🟡 Recommended | Tags for storefront filtering (independent of platform categories) |
| `displayBrand` | String | ⚪ Optional | Brand name for storefront display |
| `maxPrice` | Number | ⚪ Optional | For tiered pricing in storefront |

---

## Variant/Tier Variation Handling

### Shopee Tier Variations
```typescript
tierVariations: [
  {
    name: "Size",
    options: ["S", "M", "L", "XL"]
  },
  {
    name: "Color", 
    options: ["Red", "Blue", "Green"]
  }
]

// Creates combinations: Red-S, Red-M, Blue-S, etc.
// Each combination gets its own SKU and price
variantCombinations: [
  { 
    combination: { Size: "S", Color: "Red" },
    sku: "SHIRT-RED-S",
    price: 299,
    stock: 10
  },
  // ... more combinations
]
```

### TikTok Shop Attributes (Category-Based)
```typescript
attributes: {
  material: "Cotton",
  care_instructions: "Machine wash",
  color: "Red",
  size: "M"
  // These come from category requirements
}
```

### Lazada Category Attributes (Very Rigid)
```typescript
// Example: Electronics category
attributes: {
  warranty_type: "International",
  brand: "Sony",
  model: "WH-1000XM5",
  color: "Black",
  connectivity: "Bluetooth 5.0",
  frequency_response: "4-40000 Hz"
  // 10-20 fields per category
}
```

---

## Conditional Field Display Algorithm

```typescript
const getVisibleFields = (enabledPlatforms: string[]) => {
  const fields = {
    core: [
      'productName', 'description', 'price', 'categoryId', 
      'images', 'sku', 'stock', 'isActive'
    ],
    shopee: enabledPlatforms.includes('shopee') ? [
      'logistics_info', 'weight', 'dimensions', 'brand',
      'tier_variation', 'warranty_type', 'warranty_period',
      'min_order_quantity', 'video_url'
    ] : [],
    tiktok: enabledPlatforms.includes('tiktok') ? [
      'warrantyType', 'certifications', 'size_chart',
      'attributes', 'fulfillment_type'
    ] : [],
    lazada: enabledPlatforms.includes('lazada') ? [
      'short_description', 'brand', 'model', 'attributes',
      'cpv_sku', 'package_weight', 'package_length',
      'package_width', 'package_height'
    ] : [],
    line: ['displayImageUrl', 'displayCategories', 'displayBrand', 'maxPrice']
  };
  
  return { ...fields.core, ...fields.shopee, ...fields.tiktok, 
           ...fields.lazada, ...fields.line };
};
```

---

## MongoDB Schema (TypeScript)

```typescript
const ProductSchema = {
  // Core (always visible)
  productName: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  categoryId: { type: String, required: true },
  images: { type: [String], required: true, minlength: 1 },
  sku: { type: String, unique: true, sparse: true },
  stock: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },

  // Platform selection
  enabledPlatforms: {
    type: [String],
    enum: ['line', 'tiktok', 'shopee', 'lazada'],
    default: ['line']
  },

  // Shopee-specific
  shopee: {
    logistics_info: [{
      enabled: Boolean,
      shipping_type: String, // 'standard' | 'dropship'
      weight: Number,
      item_sku: String
    }],
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    brand: String,
    tier_variation: [{
      name: String,
      options: [String]
    }],
    warranty_type: String,
    warranty_period: Number,
    min_order_quantity: Number,
    video_url: String,
    platformProductId: String // Assigned by Shopee API
  },

  // TikTok Shop-specific
  tiktok: {
    warrantyType: String,
    certifications: [String],
    size_chart: {
      sizes: [String],
      measurements: {}
    },
    attributes: {}, // Dynamic based on category
    fulfillment_type: String,
    platformProductId: String // Assigned by TikTok API
  },

  // Lazada-specific
  lazada: {
    short_description: String,
    brand: String,
    model: String,
    attributes: {}, // Dynamic based on category (heavy)
    cpv_sku: String,
    package_weight: Number,
    package_length: Number,
    package_width: Number,
    package_height: Number,
    platformProductId: String // Assigned by Lazada API
  },

  // LINE/Storefront
  displayImageUrl: String,
  displayCategories: [String],
  displayBrand: String,
  maxPrice: Number,

  // Platform IDs (for cross-referencing)
  platformIds: {
    tiktok: String,
    shopee: String,
    lazada: String
  },

  // Metadata
  merchantId: { type: ObjectId, ref: 'Merchant', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  syncStatus: {
    tiktok: { status: String, error: String, lastSync: Date },
    shopee: { status: String, error: String, lastSync: Date },
    lazada: { status: String, error: String, lastSync: Date }
  }
};
```

---

## UI Form Component Logic

```typescript
// Pseudo-code for React component
function ProductForm({ enabledPlatforms, productData }) {
  const visibleFields = getVisibleFields(enabledPlatforms);

  return (
    <form>
      {/* CORE FIELDS (always shown) */}
      <section className="core-fields">
        <h2>Product Information</h2>
        <Input name="productName" label="Product Name" required />
        <TextArea name="description" label="Description" required />
        <Input name="price" type="number" label="Price (THB)" required />
        <Select name="categoryId" label="Category" required />
        <ImageUpload name="images" label="Product Images" required />
        <Input name="sku" label="SKU" />
        <Input name="stock" type="number" label="Stock Quantity" required />
      </section>

      {/* SHOPEE FIELDS */}
      {enabledPlatforms.includes('shopee') && (
        <section className="shopee-fields border-left-4 border-pink">
          <h2>🟣 Shopee Exclusive Fields</h2>
          <Checkbox name="shopee.logistics_info.enabled" label="Enable Shipping (Required for Shopee)" required />
          {productData.shopee?.logistics_info?.enabled && (
            <>
              <Input name="shopee.weight" label="Weight (grams)" required />
              <Select name="shopee.logistics_info.shipping_type" label="Shipping Type" required />
            </>
          )}
          <Input name="shopee.brand" label="Brand" />
          <TierVariationEditor name="shopee.tier_variation" />
        </section>
      )}

      {/* TIKTOK FIELDS */}
      {enabledPlatforms.includes('tiktok') && (
        <section className="tiktok-fields border-left-4 border-blue">
          <h2>🔵 TikTok Shop Exclusive Fields</h2>
          <Select name="tiktok.warrantyType" label="Warranty Type" />
          <Input name="tiktok.certifications" label="Certifications" />
          <DynamicAttributeFields name="tiktok.attributes" category={productData.categoryId} />
        </section>
      )}

      {/* LAZADA FIELDS */}
      {enabledPlatforms.includes('lazada') && (
        <section className="lazada-fields border-left-4 border-orange">
          <h2>🟠 Lazada Exclusive Fields</h2>
          <Input name="lazada.short_description" label="Short Description (100 chars)" required />
          <Select name="lazada.brand" label="Brand" required />
          <Input name="lazada.model" label="Model" />
          <DynamicAttributeFields name="lazada.attributes" category={productData.categoryId} heavy={true} />
        </section>
      )}

      {/* LINE FALLBACK */}
      <section className="line-fields">
        <h2>Storefront Display</h2>
        <ImagePicker name="displayImageUrl" label="Storefront Display Image" />
        <Input name="displayBrand" label="Brand (for storefront)" />
      </section>

      <button type="submit">Save Product</button>
      <div className="sync-status">
        {enabledPlatforms.map(platform => (
          <SyncStatusIndicator key={platform} platform={platform} status={productData.syncStatus?.[platform]} />
        ))}
      </div>
    </form>
  );
}
```

---

## Platform Category Sync Requirements

Before letting merchants create products on a platform, **must query category trees**:

### Shopee Category Query
```bash
POST https://partner.shopeemobile.com/api/v2/product/get_category/
# Returns category list with required fields per category
```

### TikTok Shop Category Query
```bash
POST https://open.tiktokapis.com/v2/localservice/saas/product_opt_category/query/
# Returns category + required attributes
```

### Lazada Category Query
```bash
GET https://api.lazada.sg/rest/categories
# Then GetCategoryAttributes per category
# Each category has 5-15 required/recommended fields
```

---

## Implementation Priority (For Future)

**Phase 1 (MVP)**: LINE only
- Core fields + LINE storefront fields
- No platform-specific fields

**Phase 2**: Add Shopee
- Implement Shopee fields (logistics critical)
- Add tier variations
- Test weight/shipping sync

**Phase 3**: Add TikTok Shop
- Simpler than Shopee
- Reuse logistics patterns
- Dynamic attributes

**Phase 4**: Add Lazada
- Most complex (heavy attributes)
- Category-specific complexity
- Brand/model requirements

---

## Example: Creating a Product for Multiple Platforms

```javascript
// User creates product enabled on: LINE + Shopee + TikTok Shop

{
  // CORE (required for all)
  productName: "Premium Cotton T-Shirt",
  description: "High-quality 100% cotton t-shirt...",
  price: 299,
  categoryId: "apparel-shirts",
  images: ["url1", "url2", "url3"],
  sku: "TSHIRT-PREM-001",
  stock: 100,
  enabledPlatforms: ["line", "shopee", "tiktok"],

  // SHOPEE FIELDS (shown because enabled)
  shopee: {
    weight: 250, // grams, REQUIRED
    logistics_info: {
      enabled: true,
      shipping_type: "standard",
      weight: 250
    },
    brand: "MyBrand",
    tier_variation: [
      { name: "Size", options: ["XS", "S", "M", "L", "XL"] },
      { name: "Color", options: ["Red", "Blue", "White"] }
    ]
  },

  // TIKTOK FIELDS (shown because enabled)
  tiktok: {
    warrantyType: "No Warranty",
    certifications: [],
    attributes: {
      material: "100% Cotton",
      care_instructions: "Machine wash cold"
    }
  },

  // LAZADA FIELDS (NOT shown, not enabled)
  lazada: null,

  // LINE/STOREFRONT (always shown)
  displayImageUrl: "url1",
  displayBrand: "MyBrand",
  displayCategories: ["t-shirts", "casual"]
}
```

When user pushes "Save Product":
1. Validate core fields (all platforms)
2. Validate Shopee fields (required: weight, logistics)
3. Validate TikTok fields (optional)
4. Create in MongoDB
5. Queue sync jobs to each platform API
6. Poll for sync status

---

## Summary

| Aspect | Strategy |
|--------|----------|
| **One form** | Conditional visibility based on `enabledPlatforms` |
| **Exclusive fields** | Platform-specific sections with icon tags (🟣 🔵 🟠) |
| **Conditional required** | Shopee's `logistics_info` only required if Shopee enabled |
| **Category attributes** | Dynamic fields based on category queried from each platform |
| **Single stock pool** | One `stock` field syncs to all platforms |
| **Platform IDs** | Stored separately per platform after sync |
| **Sync status** | Show per-platform sync status (✅ ⚠️ ❌) |

This approach keeps the experience clean while supporting complex multi-platform requirements.

# Quick Reference: Platform-Specific Fields

## At-a-Glance Field Requirements

```
CORE FIELDS (Always Required)
─────────────────────────────────
✓ Product Name
✓ Description  
✓ Price
✓ Category
✓ Images (min 1)
✓ Stock (single pool)
✓ SKU (recommended)
✓ Active/Inactive toggle

                    ↓

🟣 SHOPEE           🔵 TIKTOK          🟠 LAZADA
(If enabled)        (If enabled)       (If enabled)
─────────────────────────────────────────────────────
🔴 Weight           ⚪ Warranty Type    🔴 Short Description
🔴 Logistics Info   ⚪ Certifications   🔴 Brand
   ├─ Shipping Type ⚪ Size Chart       🔴 Model
   └─ Min Order     ⚪ Attributes       🔴 Heavy Attributes
⚪ Brand            ⚪ Fulfillment         (10-20 fields)
⚪ Tier Variation   🔴 Required for     ⚪ Warranty Type
⚪ Warranty Type       specific         ⚪ Package Dimensions
⚪ Warranty Period     categories
⚪ Video URL
```

---

## Field Display Example

### When user selects: [✓] LINE  [✓] SHOPEE  [ ] TIKTOK  [ ] LAZADA

**Product Form shows:**

```
┌─────────────────────────────────────────────────────┐
│ CORE FIELDS (Always)                                │
├─────────────────────────────────────────────────────┤
│ Product Name*          [_________________]          │
│ Description*           [_________________]          │
│ Price (THB)*           [_______]                    │
│ Category*              [Select ▼]                   │
│ Images*                [+ Upload] (3 images)        │
│ SKU                    [_________________]          │
│ Stock Quantity*        [_______] units              │
│ Active                 [✓] Yes                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🟣 SHOPEE EXCLUSIVE FIELDS (Shopee enabled)         │
├─────────────────────────────────────────────────────┤
│ Weight (grams)*        [_______] 🟣                 │
│ Shipping Type*         [Standard ▼] 🟣              │
│ Min Order Qty          [_______] units 🟣           │
│ Brand                  [_________________] 🟣       │
│ Tier Variations        [+ Add Size/Color] 🟣        │
│ Warranty Type          [Select ▼] 🟣                │
│ Warranty Period        [_______] months 🟣          │
│ Video URL              [_________________] 🟣       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LINE STOREFRONT DISPLAY (Always)                    │
├─────────────────────────────────────────────────────┤
│ Display Image          [Pick from above] 🟢          │
│ Brand                  [_________________] 🟢        │
│ Display Categories     [+ Add Tags] 🟢               │
│ Max Price (optional)   [_______] 🟢                 │
└─────────────────────────────────────────────────────┘

Sync Status:
✅ LINE: Synced
🔄 SHOPEE: Syncing...
(TIKTOK and LAZADA not enabled)
```

---

## Conditional Field Visibility Logic

```
User selects platforms → Fields appear/disappear

enabledPlatforms = ['line', 'shopee']
↓
Show: Core + Shopee + Line
Hide: TikTok, Lazada

enabledPlatforms = ['line', 'tiktok', 'shopee', 'lazada']
↓
Show: Core + Shopee + TikTok + Lazada + Line
Hide: Nothing

enabledPlatforms = ['line']
↓
Show: Core + Line only
Hide: All platform-specific fields
```

---

## Field Conflicts & Solutions

| Conflict | Solution |
|----------|----------|
| **Brand in Shopee vs Lazada** | Store separately: `shopee.brand` and `lazada.brand` (can be different) |
| **Warranty in Shopee vs Lazada vs TikTok** | Each platform has its own warranty fields; don't merge |
| **Price** | Single price in core; all platforms use it (no per-platform pricing yet) |
| **Stock** | Single pool; decrements across all platforms |
| **Description vs Short Description** | Use `description` for all; Lazada gets `short_description` truncated/simplified |
| **Images** | Store all images in core `images` array; each platform crops/resizes per API specs |
| **Category** | Core `categoryId` is shopenter's category; then map to each platform's category tree |

---

## Tier Variations / Variants

### Shopee (Flexible Tier Variations)
```
Product: T-Shirt
Tier 1: Size (S, M, L, XL)
Tier 2: Color (Red, Blue, White)

Creates 4 × 3 = 12 combinations:
- Red-S, Red-M, Red-L, Red-XL
- Blue-S, Blue-M, Blue-L, Blue-XL
- White-S, White-M, White-L, White-XL

Each combo gets:
✓ Own SKU
✓ Own price (optional)
✓ Own stock
✓ Own images (optional)
```

### TikTok Shop (Attributes, not variations)
```
Category: Apparel → Attributes
Material: Cotton
Care Instructions: Machine wash cold
Color: Red
Size: M

Each product = 1 combination
(No multi-level variations like Shopee)
```

### Lazada (Category-dependent)
```
Category: Electronics (Headphones)
Attributes:
✓ Warranty Type: International
✓ Brand: Sony
✓ Model: WH-1000XM5
✓ Color: Black
✓ Connectivity: Bluetooth 5.0
✓ Frequency Response: 4-40000 Hz
(15 more fields required by Lazada)

No built-in tier variation system;
variants use separate SKUs (CPV SKUs)
```

---

## Required vs Optional Summary

```
SHOPEE (🟣)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 MUST HAVE (always required)
  • Weight
  • Logistics Info (shipping enabled)

🟡 SHOULD HAVE (recommended)
  • Brand (some categories)
  • Warranty Type
  
⚪ NICE TO HAVE (optional)
  • Tier Variations
  • Video URL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TIKTOK SHOP (🔵)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 MUST HAVE
  • Category attributes
    (vary by category)

🟡 SHOULD HAVE
  • Certifications (some categories)
  • Warranty Type

⚪ NICE TO HAVE
  • Size Chart
  • Fulfillment Type

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAZADA (🟠)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 MUST HAVE
  • Short Description
  • Brand (most categories)
  • Model (some categories)
  • Heavy Category Attributes
    (10-20 fields required)

🟡 SHOULD HAVE
  • Warranty Type
  • Package Dimensions

⚪ NICE TO HAVE
  • Special Price
```

---

## API Query Requirements (Before Product Creation)

Before merchants can sell on a platform, **query categories once**:

| Platform | Query Needed | Returns | Notes |
|----------|-------------|---------|-------|
| Shopee | `GetCategoryAttributes` | Category + required fields per category | Do once per session |
| TikTok | `product_opt_category/query` | Categories + attributes | Lightweight query |
| Lazada | `GetCategoryAttributes` | Very detailed category attributes (10-20 fields) | Heavy; cache results |

Store results locally and use for dropdowns/validation.

---

## Form Rendering Pseudocode

```javascript
function ProductForm({ merchantId, enabledPlatforms }) {
  
  // 1. Get field visibility
  const visibleFields = {
    core: true,
    shopee: enabledPlatforms.includes('shopee'),
    tiktok: enabledPlatforms.includes('tiktok'),
    lazada: enabledPlatforms.includes('lazada'),
    line: true
  };

  // 2. For each enabled platform, load category attributes
  const categoryAttributes = {};
  if (visibleFields.shopee) {
    categoryAttributes.shopee = getCategoryAttributes('shopee', productData.categoryId);
  }
  if (visibleFields.tiktok) {
    categoryAttributes.tiktok = getCategoryAttributes('tiktok', productData.categoryId);
  }
  if (visibleFields.lazada) {
    categoryAttributes.lazada = getCategoryAttributes('lazada', productData.categoryId);
    // Note: Lazada has heavy attributes; may have 15+ fields
  }

  // 3. Render form sections
  return (
    <>
      {/* CORE */}
      <CoreFieldsSection />
      
      {/* PLATFORM-SPECIFIC */}
      {visibleFields.shopee && <ShopeeFieldsSection attributes={categoryAttributes.shopee} />}
      {visibleFields.tiktok && <TikTokFieldsSection attributes={categoryAttributes.tiktok} />}
      {visibleFields.lazada && <LazadaFieldsSection attributes={categoryAttributes.lazada} />}
      
      {/* LINE STOREFRONT */}
      <LineStorefrontSection />
      
      {/* SYNC STATUS */}
      <SyncStatusSection enabledPlatforms={enabledPlatforms} />
    </>
  );
}
```

---

## Edge Cases & Handling

| Edge Case | How to Handle |
|-----------|---------------|
| User enables Shopee but hasn't entered weight | Show validation error: "Weight required for Shopee" |
| User changes category → attributes change | Re-query category attributes; warn if data needs update |
| Product synced to TikTok, then user disables TikTok | Keep `tiktok.platformProductId` but don't show TikTok fields; on re-enable, API can verify |
| User fills Lazada fields but never enables Lazada | Fields hidden but data preserved in DB; activating platform later shows filled fields |
| Shopee tier variation created but TikTok doesn't support | Convert Shopee tier variations to TikTok attributes (no multi-level combos) |
| Different prices per platform needed | Future: add `shopee.price`, `tiktok.price` overrides; for now use single price |

---

## Implementation Checklist

- [ ] Create ProductSchema with platform-nested objects
- [ ] Build conditional field visibility component
- [ ] Implement category attribute dynamic loading
- [ ] Build Shopee tier variation editor UI
- [ ] Build TikTok dynamic attribute fields UI
- [ ] Build Lazada heavy attribute form (10+ fields)
- [ ] Add sync status indicators (✅ 🔄 ❌)
- [ ] Create product validation by platform
- [ ] Build API queue for multi-platform sync
- [ ] Add retry logic for failed syncs
- [ ] Test with all platform combinations

---

## For LINE OA (Current MVP)

Right now, only use:
```
Core Fields:
✓ productName
✓ description
✓ price
✓ categoryId
✓ images
✓ sku
✓ stock

Line-Specific:
✓ displayImageUrl
✓ displayBrand
✓ displayCategories
```

When you add multi-platform, this becomes the "fallback" if merchant doesn't sell on other platforms.

# LineOA SaaS - Multi-Tenant E-Commerce Platform

## Project Overview
Transform the personal LineOA project into a multi-tenant SaaS platform where each merchant (shop owner) gets:
- A shared admin dashboard to manage their shop
- A customizable storefront reflecting their branding
- Connection to their own LINE Official Account (OA)

## Key Architecture Decision
**Routing Strategy**: Path-based (starting point, not subdomain)
- Merchant 1 storefront: `lineoa.com/merchant/shop1`
- Merchant 2 storefront: `lineoa.com/merchant/shop2`
- Admin dashboard: `lineoa.com/dashboard`

## What Changed from Personal Project

### Models
- **NEW**: `Merchant` model (shop owner account with email auth)
- **UPDATED**: All existing models now have `merchantId` field for data isolation

### Routes Structure
```
/dashboard                   → Merchant control panel (admin-only)
/merchant/[merchantId]       → Public storefront (customer-facing)
/api/merchant/*              → Admin APIs (JWT-protected)
/api/storefront/*            → Public APIs (no auth)
```

### Authentication
- Merchants: Email + password → JWT token with merchantId
- Customers: LINE LIFF (each merchant's own LIFF ID)

## Important Constraints
1. **Data Isolation**: Every database query MUST filter by `merchantId`
2. **No Singletons**: Settings is no longer global—each merchant has their own
3. **Path-Based Lookup**: Storefront extracts merchantId from URL path

## Development Guidelines
1. Before adding any query: "Is this scoped to merchantId?"
2. Never trust URLs—always verify merchant ownership in middleware
3. Test with 2+ merchants to catch isolation bugs early
4. All new API routes should follow `/api/{admin|storefront}/` pattern

## Testing Multi-Tenancy
```bash
# Create merchant 1
curl -X POST http://localhost:3000/api/merchant/auth/signup \
  -d '{"email":"shop1@test.com","password":"pass123","shopName":"Shop 1"}'

# Create merchant 2
curl -X POST http://localhost:3000/api/merchant/auth/signup \
  -d '{"email":"shop2@test.com","password":"pass123","shopName":"Shop 2"}'

# Verify isolation: merchant 1 products should not appear for merchant 2
```

## Roadmap
See `ROADMAP_SAAS.md` for detailed phase breakdown.

## References
- `LINEOA_ARCHITECTURE_ANALYSIS.md` → Full architecture docs
- `ROADMAP_SAAS.md` → Phase-by-phase implementation plan

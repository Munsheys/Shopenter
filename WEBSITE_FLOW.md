# LineOA SaaS - Website Flow & Deployment Guide

## 🌍 Website Architecture

Your LineOA SaaS platform has been restructured to serve as a **marketing website + SaaS dashboard** in one unified application.

```
lineoa.com/                     ← Landing Page (Marketing)
├── /signup                      ← Customer Sign-up
├── /login                       ← Merchant Sign-in
├── /dashboard                   ← Merchant Control Panel
└── /merchant/[merchantId]       ← Customer Storefront
```

---

## 📄 Landing Page Flow

### What Visitors See

**URL**: `https://yoursite.com/`

The landing page is a **professional marketing website** that:
- ✅ Introduces your LineOA SaaS service
- ✅ Highlights key features (inventory management, LINE integration, analytics)
- ✅ Shows benefits and real statistics
- ✅ Explains the 3-step setup process
- ✅ Includes prominent CTAs ("Get Started Free", "Sign In")

**Navigation Bar**:
- Logo: "OA LineOA SaaS"
- Left side: [Sign In] [Get Started Free] buttons
- Click "Sign In" → redirects to `/login`
- Click "Get Started Free" → redirects to `/signup`

**Hero Section**:
- Headline: "Sell on LINE with Zero Code"
- Subheading: Turn your LINE Official Account into a powerful e-commerce store
- Stats: 1000+ Active Shops, 50K+ Monthly Orders, 99.9% Uptime

**Feature Cards** (6 total):
1. Multi-Channel Selling - Manage LINE OA, website, orders in one place
2. Real-time Analytics - Track sales, inventory, customer insights
3. Customer Management - Keep track of all customers and history
4. LINE Chat Integration - Send updates and promotions via LINE
5. Instant Setup - Go live in minutes
6. Custom Storefront - Build your unique brand with themes

**Benefits Section**:
- No coding required
- Unlimited products and orders
- Secure PromptPay payment processing
- Mobile-friendly storefronts
- 24/7 reliability
- Import/export data

**3-Step Setup Process**:
1. Create Account (2 minutes)
2. Connect LINE OA
3. Start Selling

**Trust Indicators**:
- Security badge
- Mobile optimization highlight
- Speed/performance assurance

---

## 🔐 Sign-Up Flow

### Step-by-Step: Customer Creates Account

**URL**: `https://yoursite.com/signup`

**What Appears**:
- Navigation bar with logo (clickable, goes back to home)
- Form card with title "Create Your Shop"
- Three input fields

**Form Inputs**:
1. **Shop Name** (required)
   - Icon: Store
   - Placeholder: "My Awesome Shop"
   - Example: "Korean Fashion Store", "Electronics Hub"

2. **Email Address** (required, must be unique)
   - Icon: Mail
   - Placeholder: "owner@example.com"
   - Validation: Must be valid email format and not already registered

3. **Password** (required, minimum 8 chars recommended)
   - Icon: Lock
   - Placeholder: "••••••••"
   - Validation: Stored as bcrypt hash (never stored plaintext)

**Submit Button**: "Create Shop Account" (green button with loading spinner)

**Error Handling**:
- If email already exists: "Email already registered"
- If password too weak: "Password too short"
- Network error: "An error occurred. Please try again."

**Backend Process**:
```
User fills form → Click "Create Shop Account"
    ↓
POST /api/merchant/auth/signup
    ├─ Validate email format
    ├─ Check email uniqueness in database
    ├─ Hash password with bcrypt (12 rounds)
    ├─ Create Merchant record with:
    │  ├─ email: "owner@example.com"
    │  ├─ passwordHash: "$2a$12$..."
    │  ├─ shopName: "Korean Fashion Store"
    │  ├─ status: "trial"
    │  └─ createdAt: timestamp
    ├─ Generate JWT token: { merchantId, email, shopName }
    ├─ Set HttpOnly cookie: merchant_token=eyJ...
    └─ Return: { success: true, merchant: {...} }
    ↓
Browser: Automatically redirected to /dashboard
    ↓
Merchant sees: Welcome screen + Setup wizard
```

**New Merchant Account Details**:
- Gets unique Merchant ID (MongoDB ObjectId): `507f1f77bcf86cd799439011`
- Gets storefront URL: `yoursite.com/merchant/507f1f77bcf86cd799439011`
- JWT token valid for: 7 days
- Initial status: "trial" (can be upgraded to "active" with payment)

**Link at Bottom**: "Already have an account? Login here" → redirects to `/login`

---

## 🔑 Login Flow

### Step-by-Step: Merchant Signs In

**URL**: `https://yoursite.com/login`

**Form Inputs**:
1. **Email Address** - Must match registered email
2. **Password** - Must match hashed password in database

**Submit Button**: "Login to Dashboard"

**Backend Process**:
```
User enters credentials → Click "Login to Dashboard"
    ↓
POST /api/merchant/auth/login
    ├─ Find merchant by email in database
    ├─ If not found: Return "Invalid email or password"
    ├─ If found: Compare provided password with passwordHash
    ├─ If no match: Return "Invalid email or password"
    ├─ If match: ✓ Continue
    ├─ Generate new JWT token: { merchantId, email, shopName }
    ├─ Set HttpOnly cookie: merchant_token=eyJ...
    └─ Return: { success: true, merchant: {...} }
    ↓
Browser: Automatically redirected to /dashboard
    ↓
Dashboard loads merchant's data (filtered by merchantId)
```

**Error Handling**:
- Invalid email: "Invalid email or password" (generic for security)
- Wrong password: "Invalid email or password"
- Account suspended: "Your account has been suspended"

**Link at Bottom**: "Don't have a shop yet? Create your account" → redirects to `/signup`

---

## 📊 Dashboard Flow

### What Merchant Sees After Login

**URL**: `https://yoursite.com/dashboard`

**Authentication**:
- JWT token from cookie automatically included in all requests
- If token invalid/expired → redirected to `/login`
- If no token → redirected to `/login`

**Main Navigation Tabs**:
1. **Products** - Manage inventory (add, edit, delete, bulk upload)
2. **Orders** - View and manage customer orders
3. **Customers** - Customer list and interaction history
4. **Settings** - Configure LINE OA, payment, branding
5. **Reports** - Sales analytics and insights
6. **Messages** - Chat with customers (LINE integration)

**Data Isolation**:
Every request includes JWT with `merchantId`. Example:

```typescript
// When merchant clicks "View Products"
GET /api/products
Headers: { 
  cookie: "merchant_token=eyJ..." 
}

// Server extracts merchantId from JWT
// Query: Product.find({ merchantId: "507f..." })
// Returns ONLY this merchant's products
```

### Products Tab

**Features**:
- List all products
- Search/filter/sort
- Add new product
- Edit existing product
- Delete product
- Bulk import from CSV

**Product Fields**:
- Product name
- Brand
- Price (THB)
- Categories (dropdown/multi-select)
- Description
- Images (upload or URL)
- Variants (sizes, colors, etc.)
- Inventory count
- SKU

**Backend Requests**:
- `GET /api/products` - Get all products (filtered by merchantId)
- `POST /api/products` - Create new product (with merchantId from JWT)
- `PUT /api/products/[id]` - Update product (verify ownership)
- `DELETE /api/products/[id]` - Delete product (verify ownership)

### Orders Tab

**Features**:
- View all orders
- Filter by status (pending, paid, shipped, delivered)
- Mark as paid
- Update shipping status
- Send PromptPay QR code reminder
- Print shipping labels

**Order Info**:
- Order ID
- Customer name
- Products ordered
- Total price (THB)
- Order status
- Payment status
- Tracking number
- Created date

**Backend Requests**:
- `GET /api/orders` - Get all orders (filtered by merchantId)
- `POST /api/orders/[id]/mark-paid` - Mark order as paid
- `POST /api/orders/[id]/send-qr` - Send payment reminder

### Customers Tab

**Features**:
- View customer list
- Search by name/LINE ID
- View customer history (purchases, messages)
- Add manual notes

**Customer Info**:
- Display name
- LINE User ID
- Phone (if provided)
- Address
- Total purchases
- Last order date

### Settings Tab

**Configuration Options**:

**LINE OA Connection**:
- Channel ID
- Channel Secret
- Access Token
- LIFF ID (for customer authentication)

**Payment Settings**:
- PromptPay ID
- Mobile number for QR generation

**Shop Branding**:
- Shop name
- Shop description
- Logo upload
- Theme (light/dark)
- Primary color

**Shipping**:
- Shipping companies (Kerry, DHL, etc.)
- Default shipping cost
- Free shipping threshold

**Backend Requests**:
- `POST /api/settings` - Save settings (with merchantId from JWT)
- `GET /api/settings` - Get current settings

### Reports Tab

**Analytics**:
- Total orders (all time / this month)
- Total revenue (all time / this month)
- Average order value
- Most popular products
- Sales by category
- Charts and graphs

**Data**:
- All queries filtered by merchantId
- Only this merchant's sales shown

---

## 🏪 Storefront Flow

### What Customers See

**URL**: `https://yoursite.com/merchant/507f1f77bcf86cd799439011`

Each merchant gets a **unique, public storefront URL** based on their Merchant ID.

**Public Access**:
- No authentication required
- Works on mobile and desktop
- Shareable link

**What Appears**:
1. **Header** with merchant's branding
   - Shop name (e.g., "Korean Fashion Store")
   - Logo (if uploaded)
   - Theme (light/dark mode)

2. **Product Listing**
   - Grid of products
   - Product images, name, price
   - Search/filter by category
   - Sort by price, newest, popularity

3. **Product Detail** (when customer clicks product)
   - Full images
   - Description
   - Variants (sizes, colors)
   - Price
   - "Add to Cart" button

4. **Shopping Cart**
   - List of items
   - Quantity selector
   - Subtotal
   - "Proceed to Checkout" button

5. **Checkout**
   - Customer info (name, phone)
   - Shipping address
   - Shipping method
   - Order summary
   - PromptPay QR code (for payment)

**Backend Requests**:
```
GET /api/storefront/507f.../shop-info
  → Returns: shopName, liffId, theme, promptPayId, etc.

GET /api/storefront/507f.../products
  → Returns: Products where merchantId = "507f..."

POST /api/storefront/507f.../orders
  → Creates order with merchantId = "507f..."
```

**Important**: Storefront requests use **path-based merchant lookup**, not JWT:
- Merchant ID extracted from URL
- No authentication needed
- Public anyone can view

---

## 🔄 Data Isolation & Security

### Merchant Can't See Other Merchants' Data

**Scenario**: Two merchants use your platform

**Merchant A**: Korean Fashion Store
- ID: `507f1f77bcf86cd799439011`
- Products: Korean Jacket, Korean Pants
- Orders: 5 total

**Merchant B**: Electronics Store
- ID: `610g2g88cdg97de800550022`
- Products: Phone, Laptop
- Orders: 3 total

**Test**: Merchant A logs in

```
GET /api/products (with Merchant A's JWT)

Server processes:
  ├─ Extract merchantId from JWT: "507f..."
  ├─ Query: Product.find({ merchantId: "507f..." })
  └─ Returns: [Korean Jacket, Korean Pants] ONLY
  
Merchant A cannot see: Phone, Laptop (those belong to Merchant B)
```

**Why This Works**:
1. Every model has `merchantId` field
2. Every query filters by `merchantId`
3. JWT contains `merchantId`
4. No query bypasses the filter

### Password Security

- Passwords hashed with **bcrypt** (12 rounds)
- Never stored plaintext
- Never sent in response
- Never logged

### JWT Token Security

- Signed with `JWT_SECRET` (environment variable)
- Stored in **HttpOnly** cookie (can't be accessed by JavaScript)
- Expires after **7 days**
- Verified on every request

---

## 📱 Storefront Customization

Each merchant's storefront reflects their configuration:

**From Settings Tab**:
- `shopName` → Displayed in header
- `theme` → Light/dark mode
- Logo → Displayed in header
- Colors → Theme colors applied
- LIFF ID → Used for customer authentication
- PromptPay ID → Used to generate payment QR

**All Per-Merchant**:
No code changes needed. Each merchant gets completely different storefront based on their data.

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Create MongoDB Atlas account and cluster
- [ ] Set `.env.local` with:
  - `MONGODB_URI=mongodb+srv://...`
  - `JWT_SECRET=strong-random-secret`
  - `NODE_ENV=production`
- [ ] Build project: `npm run build`
- [ ] Test locally: `npm run dev`
- [ ] Test signup/login
- [ ] Test product creation
- [ ] Test storefront access
- [ ] Test data isolation (create 2 merchants)

### Deploy to Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
# Add env vars in Vercel dashboard
# Redeploy
```

### Or Deploy to Other Hosting

Works with:
- Vercel
- Heroku
- DigitalOcean
- AWS
- Your own server

**Requirements**:
- Node.js 18+
- MongoDB connection
- Environment variables

---

## 📊 Traffic Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Visits Website                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
          [Landing]   [Sign Up]   [Sign In]
                │          │          │
                │    POST /api/merchant/auth/signup
                │    └─ Create Merchant record
                │       └─ Set JWT cookie
                │       └─ Redirect to /dashboard
                │
                ▼
          [Dashboard]
          GET /api/products (with JWT)
          └─ Returns merchant's products only
          └─ Merchant configures shop
          └─ Sets LINE credentials
          └─ Uploads products
                │
                ▼
          [Storefront Ready]
          URL: /merchant/[merchantId]
          └─ No auth required
          └─ Customers browse
          └─ Create orders
          └─ POST /api/storefront/[merchantId]/orders
             └─ Order saved with merchantId
```

---

## 🎯 Customer Journey Example

### Day 1: Shop Owner Signs Up
```
1. Owner visits yoursite.com
2. Clicks "Get Started Free"
3. Fills signup form: shopName="Korean Fashion", email="owner@email.com", password="..."
4. POST /api/merchant/auth/signup succeeds
5. Gets Merchant ID: 507f1f77bcf86cd799439011
6. JWT token created and stored
7. Redirected to /dashboard
```

### Day 2: Shop Owner Configures
```
1. Owner visits /dashboard
2. Goes to Settings tab
3. Enters LINE Channel ID, LIFF ID
4. Enters PromptPay ID
5. Chooses theme (dark mode)
6. POST /api/settings saves (filtered by merchantId)
```

### Day 3: Shop Owner Adds Products
```
1. Owner goes to Products tab
2. Clicks "Add Product"
3. Fills: name="Korean Jacket", price=1500, categories=["Outerwear"]
4. Uploads images
5. POST /api/products creates product with merchantId
6. Repeats for 50 products
```

### Day 4: Storefront Goes Live
```
1. Owner shares URL with customers: yoursite.com/merchant/507f...
2. Customers visit storefront
3. GET /api/storefront/507f.../shop-info returns shop config
4. GET /api/storefront/507f.../products returns products
5. Customers can browse with dark theme + Korean branding
6. Customers add to cart and checkout
7. POST /api/storefront/507f.../orders creates order
8. Order saved with merchantId=507f...
```

### Day 5-30: Ongoing
```
1. Owner logs in regularly
2. Checks /dashboard → Orders tab
3. Sees only their orders (filtered by merchantId)
4. Marks paid, updates shipping
5. Checks Reports for analytics
6. Chats with customers
```

---

## ✅ Success Metrics

Monitor these after launch:
- [ ] Merchants can signup in < 2 minutes
- [ ] Dashboard loads in < 1 second
- [ ] Products create/update in < 500ms
- [ ] Storefront shows correct data for each merchant
- [ ] Order isolation confirmed
- [ ] No cross-merchant data leaks
- [ ] 99.9% uptime

---

## 🔗 Related Documentation

- `DEPLOYMENT_GUIDE.md` - Testing and deployment procedures
- `IMPLEMENTATION_REPORT.md` - Complete technical implementation details
- `CLAUDE.md` - Architecture and development guidelines
- `TEST_SCRIPT.sh` - Automated testing script

---

## 📞 Support

If issues arise:
1. Check browser console for errors
2. Check server logs: `vercel logs` (if on Vercel)
3. Verify MongoDB connection
4. Verify JWT_SECRET is set
5. Check that all `.env` variables are configured

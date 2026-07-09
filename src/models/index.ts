import mongoose from 'mongoose';

const MerchantSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: false }, // Null for LINE OAuth users
  shopName: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true, lowercase: true },
  tier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  paymentStatus: { type: String, enum: ['paid', 'trialing', 'unpaid'], default: 'paid' },
  trialEndsAt: { type: Date, default: null },
  trialReason: { type: String, enum: ['signup', 'referral', 'affiliate_reward'], default: 'signup' },
  referralCode: { type: String, unique: true, sparse: true, lowercase: true, match: /^[a-z0-9]{12}$/ },
  referredByMerchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', default: null },
  // LINE OAuth fields
  lineUserId: { type: String, unique: true, sparse: true, index: true }, // LINE User ID
  lineAccessToken: { type: String, default: '' }, // Encrypted if sensitive
  authMethod: { type: String, enum: ['email', 'line_oauth'], default: 'email' },
  lastLoginAt: { type: Date, default: null },
  lastLoginMethod: { type: String, enum: ['email', 'line_oauth'], default: null },
  acceptedTermsAt: { type: Date, default: null },
  acceptedTermsVersion: { type: String, default: null },
  deletionRequestedAt: { type: Date, default: null },
  deletionScheduledFor: { type: Date, default: null, index: true },
  // 'inactivity' means the system scheduled this (no login in 3 months), not the merchant.
  // Distinguishes the two so login can auto-cancel an inactivity deletion without touching
  // one the merchant deliberately requested themselves.
  deletionReason: { type: String, enum: ['merchant_requested', 'inactivity'], default: null },
  inactivityWarningStage: { type: Number, default: 0 }, // 0 = none sent yet, increments per reminder
  // Omise subscription billing (Merchant -> Shopenter)
  omiseCustomerId: { type: String, default: null },
  subscriptionStatus: { type: String, enum: ['none', 'active', 'past_due', 'canceled'], default: 'none' },
  nextBillingDate: { type: Date, default: null },
  pastDueSince: { type: Date, default: null },
  paymentMethodBrand: { type: String, default: null },
  paymentMethodLast4: { type: String, default: null },
  // Card-required Pro trial (separate from the automatic no-card referral trial).
  // One per merchant — tracked so the trial can't be repeatedly restarted.
  proTrialUsedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
MerchantSchema.index({ referralCode: 1 });
MerchantSchema.index({ referredByMerchantId: 1 });
MerchantSchema.index({ lineUserId: 1 });
MerchantSchema.index({ lastLoginAt: 1 });

const NotificationSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  type: { type: String, enum: ['new_order', 'slip_verified', 'slip_failed', 'out_of_stock'], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});
NotificationSchema.index({ merchantId: 1, read: 1, createdAt: -1 });

const SettingsSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true, unique: true },
  shopName: { type: String, default: "My Shop" },
  theme: { type: String, enum: ['light', 'lite', 'dark'], default: "light" },
  dashboardAccent: { type: String, default: '#00b900' },
  dashboardAccentGradient: { type: String, default: '' },
  dashboardCustomSolids: { type: [String], default: [] },
  dashboardCustomGradients: { type: [String], default: [] },
  krwRate: { type: Number, default: 0.026 },
  importCurrency: { type: String, default: 'KRW' },
  localCurrency: { type: String, default: 'THB' },
  useAutoRate: { type: Boolean, default: false },
  trackingTemplate: { type: String, default: "📦 ส่งสินค้าแล้วครับ!\n\nขนส่ง: {courier}\nเลขพัสดุ: {tracking}\nรายการ: {product}\n\nขอบคุณครับ 🙏" },
  senderAddress: String,
  shippingCompanies: { type: [String], default: ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express'] },
  lineChannelAccessToken: { type: String, default: "" },
  lineChannelSecret: { type: String, default: "" },
  liffId: { type: String, default: "" },
  adminLineId: { type: String, default: "" },
  adminSecret: { type: String, default: "" },
  promptPayId: { type: String, default: "" },
  paymentTemplate: { type: String, default: "✅ ยืนยันการชำระเงินแล้วครับ!\n\nรายการ: {product}\nจำนวน: ฿{amount}\n\nขอบคุณที่ใช้บริการครับ 🙏" },
  slipokBranchId: { type: String, default: "" },
  slipokApiKey: { type: String, default: "" },
  lineOAPlan: { type: String, enum: ['free', 'light', 'pro'], default: 'free' },
  dashboardLanguage: { type: String, enum: ['th', 'ja', 'en', 'ko', 'zh-TW'], default: 'th' },
  orderNotifications: {
    paid:      { enabled: { type: Boolean, default: false }, template: { type: String, default: "✅ รับออเดอร์แล้วครับ!\n\nรายการ: {product}\nยอด: ฿{amount}\n\nกำลังดำเนินการครับ 🙏" } },
    preparing: { enabled: { type: Boolean, default: false }, template: { type: String, default: "📦 กำลังเตรียมสินค้าแล้วครับ!\n\nรายการ: {product}\n\nจะแจ้งเลขพัสดุให้เร็วๆ นี้ครับ 🙏" } },
    shipped:   { enabled: { type: Boolean, default: false }, template: { type: String, default: "🚚 ส่งสินค้าแล้วครับ!\n\nรายการ: {product}\nขนส่ง: {courier}\nเลขพัสดุ: {tracking}\n\nขอบคุณครับ 🙏" } },
    delivered: { enabled: { type: Boolean, default: false }, template: { type: String, default: "✅ สินค้าถึงแล้วนะครับ!\n\nรายการ: {product}\n\nขอบคุณที่ใช้บริการครับ 🙏" } },
  },
  // Shop identity extras
  shopDescription: { type: String, default: '' },
  shopTimezone: { type: String, default: 'Asia/Bangkok' },
  shopLogoUrl: { type: String, default: '' },
  compactMode: { type: Boolean, default: false },
  // Business hours (stored; auto-reply wiring is deferred)
  businessHours: {
    enabled: { type: Boolean, default: false },
    closedAutoReply: { type: String, default: '' },
    mon: { enabled: { type: Boolean, default: true },  open: { type: String, default: '09:00' }, close: { type: String, default: '18:00' } },
    tue: { enabled: { type: Boolean, default: true },  open: { type: String, default: '09:00' }, close: { type: String, default: '18:00' } },
    wed: { enabled: { type: Boolean, default: true },  open: { type: String, default: '09:00' }, close: { type: String, default: '18:00' } },
    thu: { enabled: { type: Boolean, default: true },  open: { type: String, default: '09:00' }, close: { type: String, default: '18:00' } },
    fri: { enabled: { type: Boolean, default: true },  open: { type: String, default: '09:00' }, close: { type: String, default: '18:00' } },
    sat: { enabled: { type: Boolean, default: false }, open: { type: String, default: '10:00' }, close: { type: String, default: '16:00' } },
    sun: { enabled: { type: Boolean, default: false }, open: { type: String, default: '10:00' }, close: { type: String, default: '16:00' } },
  },
  // Global default messages — used when a platform has not enabled per-platform override
  defaultWelcomeMessage:        { type: String,  default: '' },
  defaultWelcomeStorefrontLink: { type: Boolean, default: true },
  defaultReEngageMessage:        { type: String,  default: '' },
  defaultReEngageStorefrontLink: { type: Boolean, default: true },
  // Greeting message sent on follow event
  greetingEnabled: { type: Boolean, default: false },
  greetingMessages: { type: Array, default: [] },
  // greetingCustom: if true, uses greetingMessages; if false/absent, uses defaultWelcomeMessage
  greetingCustom: { type: Boolean },
  // Re-engagement message sent when a LINE customer messages after 24h absence
  reEngageEnabled:        { type: Boolean, default: false },
  reEngageMessages:       { type: Array,   default: [] },
  reEngageStorefrontLink: { type: Boolean, default: true },
  // reEngageCustom: if true, uses reEngageMessages; if false/absent, uses defaultReEngageMessage
  reEngageCustom: { type: Boolean },
  // Rich Menu reference
  richMenuSavedId: { type: String, default: '' },
  // Payment configuration
  paymentMethods: {
    promptpay:   { type: Boolean, default: true },
    bankTransfer: { type: Boolean, default: false },
    cod:         { type: Boolean, default: false },
    truemoney:   { type: Boolean, default: false },
    truemoneyId: { type: String, default: '' },
  },
  bankAccounts: { type: Array, default: [] }, // [{bankName, accountNumber, accountName, branch}]
  autoCancelHours: { type: Number, default: 0 }, // 0 = disabled
  useSlipok: { type: Boolean, default: false },
  // Shipping extras
  shippingPayer: { type: String, enum: ['merchant', 'customer'], default: 'merchant' },
  defaultShippingCost: { type: Number, default: 0 },
  freeShippingThreshold: {
    enabled: { type: Boolean, default: false },
    amount:  { type: Number, default: 0 },
  },
  codSurcharge: { type: Number, default: 0 },
  deliveryEstimates: { type: Array, default: [] }, // [{courier, minDays, maxDays}]
  // Admin alerts — each type has independent line (LINE push) and dashboard (bell) channels
  adminAlerts: {
    newOrder:     { line: { type: Boolean, default: false }, dashboard: { type: Boolean, default: false } },
    slipReceived: { line: { type: Boolean, default: false }, dashboard: { type: Boolean, default: false } },
    slipFailed:   { line: { type: Boolean, default: false }, dashboard: { type: Boolean, default: false } },
    outOfStock:   { line: { type: Boolean, default: false }, dashboard: { type: Boolean, default: false } },
    lowStockThreshold: { type: Number, default: 5 },
  },
  broadcastReminder: {
    enabled:         { type: Boolean, default: false },
    leadTimeMinutes: { type: Number, default: 60 },
  },
  // Order display prefix (e.g. "SP-" → SP-001, SP-002)
  orderPrefix: { type: String, default: '' },
  autoDeliver: {
    enabled:   { type: Boolean, default: false },
    afterDays: { type: Number, default: 14, min: 3, max: 60 },
  },
  loyalty: {
    enabled: { type: Boolean, default: false },
    pointsPerBaht: { type: Number, default: 1 },
    redeemRate: { type: Number, default: 100 },
    minRedeemPoints: { type: Number, default: 100 },
  },
  lineIntentSearch: { type: Boolean, default: true },
  telegram: {
    botToken:              { type: String,  default: '' },
    webhookActive:         { type: Boolean, default: false },
    webhookSecret:         { type: String,  default: '' }, // verifies inbound webhook calls came from Telegram
    intentSearch:          { type: Boolean, default: true },
    welcomeEnabled:        { type: Boolean, default: true },
    welcomeMessage:        { type: String,  default: '' },
    welcomeStorefrontLink: { type: Boolean, default: true },
    welcomeCustom:         { type: Boolean }, // if absent/false → uses defaultWelcomeMessage
    reEngageEnabled:       { type: Boolean, default: false },
    reEngageMessage:       { type: String,  default: '' },
    reEngageStorefrontLink:{ type: Boolean, default: true },
    reEngageCustom:        { type: Boolean }, // if absent/false → uses defaultReEngageMessage
  },
  instagram: {
    pageAccessToken:       { type: String,  default: '' },
    igAccountId:           { type: String,  default: '' },
    webhookActive:         { type: Boolean, default: false },
    intentSearch:          { type: Boolean, default: true },
    welcomeEnabled:        { type: Boolean, default: true },
    welcomeMessage:        { type: String,  default: '' },
    welcomeStorefrontLink: { type: Boolean, default: true },
    welcomeCustom:         { type: Boolean }, // if absent/false → uses defaultWelcomeMessage
    reEngageEnabled:       { type: Boolean, default: false },
    reEngageMessage:       { type: String,  default: '' },
    reEngageStorefrontLink:{ type: Boolean, default: true },
    reEngageCustom:        { type: Boolean }, // if absent/false → uses defaultReEngageMessage
  },
  storefront: {
    preset: { type: String, default: 'linen' },
    shopTagline: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    accentColor: { type: String, default: "" },
    accentGradient: { type: String, default: "" },
    customSolids: { type: [String], default: [] },
    customGradients: { type: [String], default: [] },
    cardLayout: { type: String, enum: ['grid', 'list'], default: 'grid' },
    showBrandFilter: { type: Boolean, default: true },
    showCategoryFilter: { type: Boolean, default: true },
    showSearch: { type: Boolean, default: true },
    showPriceFilter: { type: Boolean, default: true },
    announcementText: { type: String, default: "" },
    announcementEnabled: { type: Boolean, default: false },
    announcementColor: { type: String, default: 'blue' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'We will be back soon.' },
    postCheckoutUrl: { type: String, default: '' },
    language: { type: String, enum: ['th', 'ja', 'en', 'ko', 'zh-TW'], default: 'th' },
    heroHeading: { type: String, default: "" },
    heroDescription: { type: String, default: "" },
    filterStyle: { type: String, enum: ['dropdowns', 'pills'], default: 'dropdowns' },
    paginationEnabled: { type: Boolean, default: false },
    productsPerPage: { type: Number, default: 20 },
    showFeaturedRow: { type: Boolean, default: true },
    // Layout slots — independent customizable parts, mix & match for a distinct look
    headerStyle: { type: String, enum: ['logo-left', 'logo-center', 'minimal'], default: 'logo-left' },
    heroStyle: { type: String, enum: ['classic', 'banner-overlay', 'split', 'none'], default: 'classic' },
    cardStyle: { type: String, enum: ['minimal', 'bordered', 'shadow', 'badge'], default: 'bordered' },
    cornerStyle: { type: String, enum: ['sharp', 'soft', 'round'], default: 'soft' },
    density: { type: String, enum: ['compact', 'comfortable', 'spacious'], default: 'comfortable' },
    typography: { type: String, enum: ['modern', 'editorial', 'bold'], default: 'modern' },
  }
});

const ProductSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  name: { type: String, required: true },
  brand: String,
  modelLine: String,
  description: String,
  price: { type: Number, required: true },
  trackStock: { type: Boolean, default: false },
  maxPrice: Number,
  imageUrl: String,
  categories: { type: [String], default: [] },
  images: { type: [String], default: [] },
  options: [{
    name: String,
    values: { type: [String], default: [] }
  }],
  variants: [{
    combination: { type: mongoose.Schema.Types.Mixed },
    imageUrl: String,
    variantName: String,
    colors: { type: [String], default: [] },
    price: Number,
    cost: Number,
    stock: { type: Number, default: 0 }
  }],
  isActive: { type: Boolean, default: true },
  isQuickAdd: { type: Boolean, default: false },
});

const CustomerSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  userId: { type: String, required: true, index: true },
  platform: { type: String, enum: ['line', 'instagram', 'telegram'], index: true },
  displayName: String,
  pictureUrl: String,
  addresses: [String],
  lastSeen: { type: Date, default: Date.now },
  profileCachedAt: { type: Date, default: null },
  unreadCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  followedAt: { type: Date, default: null },
  loyaltyPoints: { type: Number, default: 0 },
  shopCredits:   { type: Number, default: 0 },
});
CustomerSchema.index({ merchantId: 1, userId: 1 }, { unique: true });
CustomerSchema.index({ merchantId: 1, lastSeen: -1 });
CustomerSchema.index({ merchantId: 1, loyaltyPoints: -1 });

// CustomerProfile links platform-specific Customer records for the same real person (by phone)
const CustomerProfileSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  phone: { type: String, default: '' },
  displayName: { type: String, default: '' },
  linkedAccounts: [{
    platform: { type: String, enum: ['line', 'instagram', 'telegram'], required: true },
    userId: { type: String, required: true },
    displayName: { type: String, default: '' },
    pictureUrl: { type: String, default: '' },
  }],
  createdAt: { type: Date, default: Date.now },
});
CustomerProfileSchema.index({ merchantId: 1, phone: 1 });
CustomerProfileSchema.index({ merchantId: 1, 'linkedAccounts.userId': 1 });

const OrderSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  userId: { type: String, index: true },
  platform: { type: String, enum: ['line', 'instagram', 'telegram'], default: 'line' },
  displayName: String,
  address: String,
  product: String,
  quantity: { type: Number, default: 1 },
  items: [{
    productId: String,
    name: String,
    variantLabel: String,
    price: Number,
    qty: Number,
    imageUrl: String,
    itemStatus: { type: String, enum: ['pending', 'preparing', 'shipped', 'delivered'], default: 'pending' },
    itemTracking: { type: String, default: '' },
    itemCourier: { type: String, default: '' },
  }],
  soldTHB: { type: Number, default: 0 },
  costKRW: { type: Number, default: 0 },
  costTHB: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  rateUsed: Number,
  costCurrency: { type: String, default: 'KRW' },
  soldCurrency: { type: String, default: 'THB' },
  shipCostTHB: { type: Number, default: 0 },
  tracking: String,
  courier: String,
  partialFulfilled: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'paid', 'preparing', 'partially_fulfilled', 'shipped', 'delivered', 'fulfilled', 'cancelled'], default: 'pending' },
  statusBeforeParcel: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paymentQrSent: { type: Boolean, default: false },
  trackingSent: { type: Boolean, default: false },
  notifPaid: { type: Boolean, default: false },
  notifPreparing: { type: Boolean, default: false },
  notifShipped: { type: Boolean, default: false },
  notifDelivered: { type: Boolean, default: false },
  attributedCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  couponCode: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  redeemedPoints: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

OrderSchema.index({ merchantId: 1, status: 1 });
OrderSchema.index({ merchantId: 1, createdAt: -1 });

const MessageSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  userId: { type: String, required: true, index: true },
  platform: { type: String, enum: ['line', 'instagram', 'telegram'], default: 'line' },
  type: { type: String, enum: ['text', 'image', 'sticker', 'system'], default: 'text' },
  messageId: String,
  text: { type: String, required: true },
  metadata: mongoose.Schema.Types.Mixed,
  sender: { type: String, enum: ['user', 'admin', 'system'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});
MessageSchema.index({ merchantId: 1, userId: 1, createdAt: -1 });

const ProcessedEventSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  webhookEventId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

// Shared message block sub-schema (used in Campaign and AutoReply)
const MessageBlockSchema = new mongoose.Schema({
  type: { type: String, required: true }, // text | image | video | audio | sticker
  text: String,
  originalContentUrl: String,
  previewImageUrl: String,
  duration: Number,
  packageId: String,
  stickerId: String,
}, { _id: false });

// Campaigns: instant (multicast) and queued (reply-token delivery)
const CampaignSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  name: { type: String, default: '' },
  deliveryMode: { type: String, enum: ['instant', 'queued'], required: true },
  messages: { type: [MessageBlockSchema], default: [] },
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'active' },
  // Instant-specific
  audience: { type: String, enum: ['all', 'active_30d', 'active_60d', 'ordered', 'never_ordered', 'high_value'], default: 'all' },
  recipientCount: { type: Number, default: 0 },
  sentAt: Date,
  retryKey: String,
  // Queued-specific
  validUntil: Date,
  deliveredTo: { type: [String], default: [] },
  totalTargeted: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
CampaignSchema.index({ merchantId: 1, status: 1 });

// Auto-reply keyword rules (webhook-based, replaces LINE's native auto-reply)
const AutoReplySchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  keyword: { type: String, required: true },
  matchType: { type: String, enum: ['exact', 'contains', 'starts_with', 'default'], required: true },
  messages: { type: [MessageBlockSchema], default: [] },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  lastTriggeredAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
AutoReplySchema.index({ merchantId: 1, isActive: 1, priority: 1 });

// Uploaded media files — served via /api/media/[id], TTL 30 days
const MediaFileSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  contentType: { type: String, required: true },
  filename: { type: String, default: '' },
  // Capability token — the public URL carries `?t=<token>` and must match to fetch.
  // The endpoint stays unauthenticated (LINE/Telegram fetch it directly), but a bare
  // ObjectId is no longer enough to read another merchant's media. Legacy docs with an
  // empty token remain readable so previously-sent message URLs keep working.
  token: { type: String, default: '' },
  // R2 object key. Legacy docs may still have a `data` Buffer (pre-R2-migration) —
  // the serving route falls back to that field if `r2Key` is unset.
  r2Key: { type: String, default: '' },
  data: { type: Buffer },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

// Merchant opinions/bug reports schema
const FeedbackSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  category: { type: String, required: true, enum: ['feature', 'bug', 'opinion', 'other'] },
  content: { type: String, required: true },
  status: { type: String, enum: ['new', 'reviewing', 'planned', 'completed'], default: 'new' },
  replies: [{
    sender: { type: String, enum: ['admin', 'merchant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const CouponSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxUses: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
CouponSchema.index({ merchantId: 1, code: 1 }, { unique: true });

const LoyaltyTransactionSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  userId: { type: String, required: true, index: true },
  platform: { type: String, enum: ['line', 'instagram', 'telegram'], default: 'line' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  type: { type: String, enum: ['earn', 'redeem'], required: true },
  points: { type: Number, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});
// At most one "earn" transaction per order — the guard that makes loyalty earning
// idempotent across the multiple paths that mark an order paid (manual PATCH, mark-paid,
// batch mark-paid, slip verification). Insert is attempted first; a duplicate key means
// points were already awarded for this order, so the second path skips crediting.
LoyaltyTransactionSchema.index(
  { orderId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'earn', orderId: { $exists: true } } },
);

// Records each verified payment slip so the same slip image can't mark orders paid twice.
const ProcessedSlipSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  transRef:   { type: String, required: true },
  amount:     { type: Number },
  userId:     { type: String },
  createdAt:  { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
});
ProcessedSlipSchema.index({ merchantId: 1, transRef: 1 }, { unique: true });

const FulfilmentSchema = new mongoose.Schema({
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  userId:     { type: String, required: true, index: true },
  items: [{
    productId:    { type: String },
    name:         { type: String, required: true },
    variantLabel: { type: String },
    qty:          { type: Number, required: true },
    price:        { type: Number, required: true },
  }],
  tracking:   { type: String },
  courier:    { type: String },
  address:    { type: String },
  shipCostTHB:{ type: Number, default: 0 },
  status:     { type: String, enum: ['pending', 'shipped', 'delivered'], default: 'pending' },
  createdAt:  { type: Date, default: Date.now },
  shippedAt:  { type: Date },
  deliveredAt:{ type: Date },
});
FulfilmentSchema.index({ orderId: 1, status: 1 });
FulfilmentSchema.index({ merchantId: 1, createdAt: -1 });

const AffiliateCommissionSchema = new mongoose.Schema({
  referrerMerchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  referredMerchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  referralCode: { type: String, required: true },
  // pending: referred merchant still in trial, hasn't paid yet
  // converted: referred merchant paid; sitting in the anti-abuse grace window
  // earned: stayed paid through the grace window (reward applied unless year cap was hit)
  // reversed: canceled/downgraded during the grace window, no reward
  // expired: never converted within the pending window
  status: { type: String, enum: ['pending', 'converted', 'earned', 'reversed', 'expired'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  convertedAt: { type: Date, default: null },
  earnedAt: { type: Date, default: null },
  rewardAppliedAt: { type: Date, default: null },
});
AffiliateCommissionSchema.index({ referrerMerchantId: 1, status: 1 });
AffiliateCommissionSchema.index({ referredMerchantId: 1, status: 1 });

const FailedLoginAttemptSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', index: true, sparse: true },
  ip: { type: String, required: true },
  userAgent: String,
  reason: { type: String, enum: ['invalid_email', 'invalid_password'], required: true },
  timestamp: { type: Date, default: Date.now, expires: 24 * 60 * 60 }, // Auto-delete after 24h
});
FailedLoginAttemptSchema.index({ email: 1, timestamp: -1 });
FailedLoginAttemptSchema.index({ merchantId: 1, timestamp: -1 });

const AuditLogSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  action: {
    type: String,
    enum: ['login', 'logout', 'api_call', 'data_export', 'settings_change', 'product_create', 'product_update', 'product_delete', 'order_create', 'order_update', 'account_deletion_requested', 'account_deletion_cancelled', 'account_deleted', 'subscription_started', 'subscription_renewed', 'subscription_canceled', 'subscription_charge_failed', 'subscription_downgraded', 'trial_started', 'inactivity_deletion_scheduled', 'inactivity_deletion_cancelled'],
    required: true,
    index: true
  },
  resource: {
    type: String,
    enum: ['merchant', 'product', 'order', 'customer', 'settings', 'none'],
    default: 'none'
  },
  resourceId: String,
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  ip: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  errorMessage: String,
  timestamp: { type: Date, default: Date.now, index: true },
  retentionExpiresAt: { type: Date, default: null, expires: 7 * 365 * 24 * 60 * 60 }, // 7 years
});
AuditLogSchema.index({ merchantId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

const AbuseReportSchema = new mongoose.Schema({
  reporterEmail: { type: String, required: false, lowercase: true, default: '' }, // Optional — anonymous reports allowed
  reportedMerchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  violationType: {
    type: String,
    enum: [
      'prohibited_items', 'fraud', 'harassment', 'ip_violation', 'platform_manipulation',
      'data_abuse', 'account_abuse', 'payment_abuse', 'technical_abuse', 'illegal_content',
      'hate_speech', 'chargeback_fraud', 'other'
    ],
    required: true
  },
  description: { type: String, required: true },
  evidence: { type: [String], default: [] }, // URLs or descriptions of evidence
  status: {
    type: String,
    enum: ['open', 'investigating', 'warning_issued', 'suspended', 'terminated', 'dismissed'],
    default: 'open',
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'suspension', 'termination'],
    default: 'none'
  },
  actionDetails: String,
  investigatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', sparse: true },
  notes: String,
  createdAt: { type: Date, default: Date.now, index: true },
  resolvedAt: { type: Date, default: null },
});
AbuseReportSchema.index({ reportedMerchantId: 1, status: 1 });
AbuseReportSchema.index({ severity: 1, status: 1 });
AbuseReportSchema.index({ createdAt: -1 });

const ViolationHistorySchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true, unique: true },
  violationCount: { type: Number, default: 0 },
  currentLevel: { type: String, enum: ['none', 'warning', 'suspended', 'terminated'], default: 'none' },
  warnings: { type: Number, default: 0 },
  suspensions: { type: Number, default: 0 },
  suspensionExpiresAt: { type: Date, default: null },
  lastViolationAt: { type: Date, default: null },
  violations: [
    {
      reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'AbuseReport' },
      type: String,
      date: { type: Date, default: Date.now },
      action: String
    }
  ],
  updatedAt: { type: Date, default: Date.now }
});
ViolationHistorySchema.index({ currentLevel: 1, suspensionExpiresAt: 1 });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', MerchantSchema);
export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export const CustomerProfile = mongoose.models.CustomerProfile || mongoose.model('CustomerProfile', CustomerProfileSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const ProcessedEvent = mongoose.models.ProcessedEvent || mongoose.model('ProcessedEvent', ProcessedEventSchema);
export const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
export const AutoReply = mongoose.models.AutoReply || mongoose.model('AutoReply', AutoReplySchema);
export const MediaFile = mongoose.models.MediaFile || mongoose.model('MediaFile', MediaFileSchema);
export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
export const LoyaltyTransaction = mongoose.models.LoyaltyTransaction || mongoose.model('LoyaltyTransaction', LoyaltyTransactionSchema);
export const ProcessedSlip = mongoose.models.ProcessedSlip || mongoose.model('ProcessedSlip', ProcessedSlipSchema);
export const Fulfilment = mongoose.models.Fulfilment || mongoose.model('Fulfilment', FulfilmentSchema);
export const AffiliateCommission = mongoose.models.AffiliateCommission || mongoose.model('AffiliateCommission', AffiliateCommissionSchema);
export const FailedLoginAttempt = mongoose.models.FailedLoginAttempt || mongoose.model('FailedLoginAttempt', FailedLoginAttemptSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
export const AbuseReport = mongoose.models.AbuseReport || mongoose.model('AbuseReport', AbuseReportSchema);
export const ViolationHistory = mongoose.models.ViolationHistory || mongoose.model('ViolationHistory', ViolationHistorySchema);

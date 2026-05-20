import mongoose from 'mongoose';

const MerchantSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  shopName: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true, lowercase: true },
  tier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  paymentStatus: { type: String, enum: ['paid', 'trialing', 'unpaid'], default: 'trialing' },
  createdAt: { type: Date, default: Date.now }
});

const SettingsSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  shopName: { type: String, default: "My Shop" },
  theme: { type: String, enum: ['light', 'dark'], default: "light" },
  dashboardAccent: { type: String, default: '#00b900' },
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
  // Greeting message sent on follow event
  greetingEnabled: { type: Boolean, default: false },
  greetingMessages: { type: Array, default: [] },
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
  defaultShippingCost: { type: Number, default: 0 },
  freeShippingThreshold: {
    enabled: { type: Boolean, default: false },
    amount:  { type: Number, default: 0 },
  },
  codSurcharge: { type: Number, default: 0 },
  deliveryEstimates: { type: Array, default: [] }, // [{courier, minDays, maxDays}]
  // Admin alerts
  adminAlerts: {
    newOrder:        { type: Boolean, default: false },
    slipReceived:    { type: Boolean, default: false },
    outOfStock:      { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 5 },
  },
  broadcastReminder: {
    enabled:         { type: Boolean, default: false },
    leadTimeMinutes: { type: Number, default: 60 },
  },
  // Order display prefix (e.g. "SP-" → SP-001, SP-002)
  orderPrefix: { type: String, default: '' },
  loyalty: {
    enabled: { type: Boolean, default: false },
    pointsPerBaht: { type: Number, default: 1 },
    redeemRate: { type: Number, default: 100 },
    minRedeemPoints: { type: Number, default: 100 },
  },
  storefront: {
    preset: { type: String, default: 'midnight' },
    shopTagline: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    accentColor: { type: String, default: "" },
    cardLayout: { type: String, enum: ['grid', 'list'], default: 'grid' },
    showBrandFilter: { type: Boolean, default: true },
    showCategoryFilter: { type: Boolean, default: true },
    showSearch: { type: Boolean, default: true },
    announcementText: { type: String, default: "" },
    announcementEnabled: { type: Boolean, default: false },
    announcementColor: { type: String, default: 'blue' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'We will be back soon.' },
    postCheckoutUrl: { type: String, default: '' },
    language: { type: String, enum: ['th', 'ja', 'en', 'ko', 'zh-TW'], default: 'th' },
  }
});

const ProductSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  name: { type: String, required: true },
  brand: String,
  modelLine: String,
  description: String,
  price: { type: Number, required: true },
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
  isActive: { type: Boolean, default: true }
});

const CustomerSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  userId: { type: String, required: true, index: true },
  displayName: String,
  pictureUrl: String,
  addresses: [String],
  lastSeen: { type: Date, default: Date.now },
  profileCachedAt: { type: Date, default: null },
  unreadCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  followedAt: { type: Date, default: null },
  loyaltyPoints: { type: Number, default: 0 },
});
CustomerSchema.index({ merchantId: 1, userId: 1 }, { unique: true });

const OrderSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  lineUserId: String,
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
    imageUrl: String
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
  status: { type: String, enum: ['pending', 'paid', 'preparing', 'shipped', 'delivered'], default: 'pending' },
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

const MessageSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  lineUserId: { type: String, required: true, index: true },
  type: { type: String, enum: ['text', 'image', 'sticker', 'system'], default: 'text' },
  messageId: String,
  text: { type: String, required: true },
  metadata: mongoose.Schema.Types.Mixed,
  sender: { type: String, enum: ['user', 'admin', 'system'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const ProcessedEventSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  webhookEventId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

// Shared message block sub-schema (used in Campaign and AutoReply)
const LineMessageBlockSchema = new mongoose.Schema({
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
  messages: { type: [LineMessageBlockSchema], default: [] },
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
  messages: { type: [LineMessageBlockSchema], default: [] },
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
  data: { type: Buffer, required: true },
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
  lineUserId: { type: String, required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  type: { type: String, enum: ['earn', 'redeem'], required: true },
  points: { type: Number, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', MerchantSchema);
export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const ProcessedEvent = mongoose.models.ProcessedEvent || mongoose.model('ProcessedEvent', ProcessedEventSchema);
export const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
export const AutoReply = mongoose.models.AutoReply || mongoose.model('AutoReply', AutoReplySchema);
export const MediaFile = mongoose.models.MediaFile || mongoose.model('MediaFile', MediaFileSchema);
export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
export const LoyaltyTransaction = mongoose.models.LoyaltyTransaction || mongoose.model('LoyaltyTransaction', LoyaltyTransactionSchema);

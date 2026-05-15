import mongoose from 'mongoose';

const MerchantSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  shopName: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true, lowercase: true },
  createdAt: { type: Date, default: Date.now }
});

// Per-merchant shop config (replaces singleton Settings)
const SettingsSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  shopName: { type: String, default: "My Shop" },
  theme: { type: String, enum: ['light', 'dark'], default: "light" },
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
  // Storefront customization
  storefront: {
    preset: { type: String, default: 'midnight' },
    shopTagline: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    accentColor: { type: String, default: "" }, // hex override, empty = use preset
    cardLayout: { type: String, enum: ['grid', 'list'], default: 'grid' },
    showBrandFilter: { type: Boolean, default: true },
    showCategoryFilter: { type: Boolean, default: true },
    showSearch: { type: Boolean, default: true },
    announcementText: { type: String, default: "" },
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
  variants: [{
    thickness: String,
    colors: { type: [String], default: [] },
    price: Number,
    cost: Number,
    stock: { type: Number, default: 0 }
  }],
  isActive: { type: Boolean, default: true }
});

// Profile cache: only re-fetch from LINE if profileCachedAt is older than 24h
const CustomerSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  userId: { type: String, required: true, index: true },
  displayName: String,
  pictureUrl: String,
  addresses: [String],
  lastSeen: { type: Date, default: Date.now },
  profileCachedAt: { type: Date, default: null },
  unreadCount: { type: Number, default: 0 }
});
// Compound unique: same LINE userId can follow multiple merchants
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
  status: { type: String, enum: ['pending', 'paid', 'preparing', 'shipped'], default: 'pending' },
  statusBeforeParcel: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paymentQrSent: { type: Boolean, default: false },
  trackingSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  lineUserId: { type: String, required: true, index: true },
  type: { type: String, enum: ['text', 'image', 'system'], default: 'text' },
  messageId: String,
  text: { type: String, required: true },
  metadata: mongoose.Schema.Types.Mixed,
  sender: { type: String, enum: ['user', 'admin', 'system'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Idempotency: prevents duplicate processing of the same LINE webhook event
// TTL index auto-deletes after 24 hours — storage stays flat
const ProcessedEventSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  webhookEventId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

export const Merchant = mongoose.models.Merchant || mongoose.model('Merchant', MerchantSchema);
export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const ProcessedEvent = mongoose.models.ProcessedEvent || mongoose.model('ProcessedEvent', ProcessedEventSchema);

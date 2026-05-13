import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
// NEW: Merchant (SaaS account per shop owner)
// ─────────────────────────────────────────────────────────────
const MerchantSchema = new mongoose.Schema({
  email:                  { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:           { type: String, required: true },
  shopName:               { type: String, required: true },
  subdomain:              { type: String, unique: true, sparse: true }, // future subdomain routing
  // LINE OA credentials (each merchant has their own)
  lineChannelAccessToken: { type: String, default: '' },
  lineChannelSecret:      { type: String, default: '' },
  liffId:                 { type: String, default: '' },
  adminLineId:            { type: String, default: '' },
  // Payment
  promptPayId:            { type: String, default: '' },
  slipokBranchId:         { type: String, default: '' },
  slipokApiKey:           { type: String, default: '' },
  // Storefront config
  theme:                  { type: String, enum: ['light', 'dark'], default: 'light' },
  krwRate:                { type: Number, default: 0.026 },
  trackingTemplate:       { type: String, default: "📦 ส่งสินค้าแล้วครับ!\n\nขนส่ง: {courier}\nเลขพัสดุ: {tracking}\nรายการ: {product}\n\nขอบคุณครับ 🙏" },
  paymentTemplate:        { type: String, default: "✅ ยืนยันการชำระเงินแล้วครับ!\n\nรายการ: {product}\nจำนวน: ฿{amount}\n\nขอบคุณที่ใช้บริการครับ 🙏" },
  senderAddress:          { type: String, default: '' },
  shippingCompanies:      { type: [String], default: ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express'] },
  // Account status
  status:                 { type: String, enum: ['active', 'trial', 'suspended'], default: 'trial' },
  createdAt:              { type: Date, default: Date.now },
});

// ─────────────────────────────────────────────────────────────
// Settings — kept for backward compat, now also per-merchant
// ─────────────────────────────────────────────────────────────
const SettingsSchema = new mongoose.Schema({
  merchantId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', index: true },
  shopName:               { type: String, default: 'Auto-Market' },
  theme:                  { type: String, enum: ['light', 'dark'], default: 'light' },
  krwRate:                { type: Number, default: 0.026 },
  trackingTemplate:       { type: String, default: "📦 ส่งสินค้าแล้วครับ!\n\nขนส่ง: {courier}\nเลขพัสดุ: {tracking}\nรายการ: {product}\n\nขอบคุณครับ 🙏" },
  senderAddress:          String,
  shippingCompanies:      { type: [String], default: ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express'] },
  lineChannelAccessToken: { type: String, default: '' },
  lineChannelSecret:      { type: String, default: '' },
  liffId:                 { type: String, default: '' },
  adminLineId:            { type: String, default: '' },
  adminSecret:            { type: String, default: '' },
  promptPayId:            { type: String, default: '' },
  paymentTemplate:        { type: String, default: "✅ ยืนยันการชำระเงินแล้วครับ!\n\nรายการ: {product}\nจำนวน: ฿{amount}\n\nขอบคุณที่ใช้บริการครับ 🙏" },
  slipokBranchId:         { type: String, default: '' },
  slipokApiKey:           { type: String, default: '' },
});

// ─────────────────────────────────────────────────────────────
// Product — now scoped per merchant
// ─────────────────────────────────────────────────────────────
const ProductSchema = new mongoose.Schema({
  merchantId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  name:        { type: String, required: true },
  brand:       String,
  modelLine:   String,
  description: String,
  price:       { type: Number, required: true },
  maxPrice:    Number,
  imageUrl:    String,
  categories:  { type: [String], default: [] },
  variants: [{
    thickness: String,
    colors:    { type: [String], default: [] },
    price:     Number,
    cost:      Number,
    stock:     { type: Number, default: 0 },
  }],
  isActive:    { type: Boolean, default: true },
});

// ─────────────────────────────────────────────────────────────
// Customer — per merchant customer list
// ─────────────────────────────────────────────────────────────
const CustomerSchema = new mongoose.Schema({
  merchantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  userId:          { type: String, required: true, index: true },
  displayName:     String,
  pictureUrl:      String,
  addresses:       [String],
  lastSeen:        { type: Date, default: Date.now },
  profileCachedAt: { type: Date, default: null },
  unreadCount:     { type: Number, default: 0 },
});

// ─────────────────────────────────────────────────────────────
// Order — per merchant, data isolation critical
// ─────────────────────────────────────────────────────────────
const OrderSchema = new mongoose.Schema({
  merchantId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  lineUserId:        String,
  displayName:       String,
  address:           String,
  product:           String,
  quantity:          { type: Number, default: 1 },
  items: [{
    productId:    String,
    name:         String,
    variantLabel: String,
    price:        Number,
    qty:          Number,
    imageUrl:     String,
  }],
  soldTHB:           { type: Number, default: 0 },
  costKRW:           { type: Number, default: 0 },
  costTHB:           { type: Number, default: 0 },
  profit:            { type: Number, default: 0 },
  rateUsed:          Number,
  shipCostTHB:       { type: Number, default: 0 },
  tracking:          String,
  courier:           String,
  status:            { type: String, enum: ['pending', 'paid', 'preparing', 'shipped'], default: 'pending' },
  statusBeforeParcel:{ type: String, enum: ['pending', 'paid'], default: 'pending' },
  paymentQrSent:     { type: Boolean, default: false },
  trackingSent:      { type: Boolean, default: false },
  createdAt:         { type: Date, default: Date.now },
});

// ─────────────────────────────────────────────────────────────
// Message — per merchant chat history
// ─────────────────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  lineUserId: { type: String, required: true, index: true },
  type:       { type: String, enum: ['text', 'image', 'system'], default: 'text' },
  messageId:  String,
  text:       { type: String, required: true },
  metadata:   mongoose.Schema.Types.Mixed,
  sender:     { type: String, enum: ['user', 'admin', 'system'], default: 'user' },
  createdAt:  { type: Date, default: Date.now },
});

// ─────────────────────────────────────────────────────────────
// ProcessedEvent — webhook idempotency (TTL 24h)
// ─────────────────────────────────────────────────────────────
const ProcessedEventSchema = new mongoose.Schema({
  merchantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', index: true },
  webhookEventId: { type: String, required: true, unique: true },
  createdAt:      { type: Date, default: Date.now, expires: 86400 },
});

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────
export const Merchant       = mongoose.models.Merchant       || mongoose.model('Merchant',       MerchantSchema);
export const Settings       = mongoose.models.Settings       || mongoose.model('Settings',       SettingsSchema);
export const Product        = mongoose.models.Product        || mongoose.model('Product',        ProductSchema);
export const Customer       = mongoose.models.Customer       || mongoose.model('Customer',       CustomerSchema);
export const Order          = mongoose.models.Order          || mongoose.model('Order',          OrderSchema);
export const Message        = mongoose.models.Message        || mongoose.model('Message',        MessageSchema);
export const ProcessedEvent = mongoose.models.ProcessedEvent || mongoose.model('ProcessedEvent', ProcessedEventSchema);

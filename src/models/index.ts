import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  shopName: { type: String, default: "Auto-Market" },
  primaryColor: { type: String, default: "#00b900" },
  krwRate: { type: Number, default: 0.026 },
  trackingTemplate: { type: String, default: "📦 ส่งสินค้าแล้วครับ!\n\nขนส่ง: {courier}\nเลขพัสดุ: {tracking}\nรายการ: {product}\n\nขอบคุณครับ 🙏" },
  senderAddress: String,
  shippingCompanies: { type: [String], default: ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express'] },
  // LINE Platform Configurations
  lineChannelAccessToken: { type: String, default: "" },
  lineChannelSecret: { type: String, default: "" },
  liffId: { type: String, default: "" },
  adminLineId: { type: String, default: "" },
  adminSecret: { type: String, default: "" }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: String,
  modelLine: String, // Family or Model Line (e.g. Croc Handle)
  description: String,
  price: { type: Number, required: true }, // Used as minPrice for sorting
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
  userId: { type: String, required: true, unique: true, index: true },
  displayName: String,
  pictureUrl: String,
  addresses: [String],
  lastSeen: { type: Date, default: Date.now },
  profileCachedAt: { type: Date, default: null },
  unreadCount: { type: Number, default: 0 }
});

const OrderSchema = new mongoose.Schema({
  lineUserId: String,
  displayName: String,
  address: String,
  product: String,
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
  shipCostTHB: { type: Number, default: 0 },
  tracking: String,
  courier: String,
  status: { type: String, default: 'pending' },
  trackingSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  lineUserId: { type: String, required: true, index: true },
  text: { type: String, required: true },
  sender: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Idempotency: prevents duplicate processing of the same LINE webhook event
// TTL index auto-deletes after 24 hours — storage stays flat
const ProcessedEventSchema = new mongoose.Schema({
  webhookEventId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL: 24h
});

export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const ProcessedEvent = mongoose.models.ProcessedEvent || mongoose.model('ProcessedEvent', ProcessedEventSchema);

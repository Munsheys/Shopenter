import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  shopName: { type: String, default: "Auto-Market" },
  primaryColor: { type: String, default: "#00b900" },
  krwRate: { type: Number, default: 0.026 },
  trackingTemplate: { type: String, default: "📦 ส่งสินค้าแล้วครับ!\n\nขนส่ง: {courier}\nเลขพัสดุ: {tracking}\nรายการ: {product}\n\nขอบคุณครับ 🙏" },
  senderAddress: String,
  shippingCompanies: { type: [String], default: ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express'] }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  imageUrl: String,
  category: String,
  variants: [{
    label: String,
    price: Number,
    stock: Number
  }],
  isActive: { type: Boolean, default: true }
});

const CustomerSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  displayName: String,
  pictureUrl: String,
  addresses: [String],
  lastSeen: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  lineUserId: String,
  displayName: String,
  address: String,
  product: String, // For personal orders
  items: [{ // For shop orders
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
  lineUserId: { type: String, required: true },
  text: { type: String, required: true },
  sender: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

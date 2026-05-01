import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/line_personal';

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

const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a mock customer
    const mockCustomer = await Customer.findOneAndUpdate(
      { userId: 'mock-user-123' },
      {
        displayName: 'Test Customer (Mock)',
        pictureUrl: 'https://ui-avatars.com/api/?name=Test+Customer&background=00b900&color=fff',
        addresses: [
          '123 Mock Street, Bangkok, 10110',
          'Office 456, Sukhumvit, Bangkok',
          'คุณอลิส 20/411 ประชาชื่น บางตลาด ปากเกร็ด นนทบุรี 11120 0826307887'
        ],
        lastSeen: new Date()
      },
      { upsert: true, new: true }
    );
    console.log('Created Mock Customer:', mockCustomer.displayName);

    // Create a mock order for this customer
    await Order.findOneAndUpdate(
      { tracking: 'th1233159519es' },
      {
        lineUserId: mockCustomer.userId,
        displayName: mockCustomer.displayName,
        address: mockCustomer.addresses[2],
        product: 'bs 4040',
        soldTHB: 1000,
        costKRW: 20000,
        profit: 562, // 1000 - (20000 * 0.0219)
        tracking: 'th1233159519es',
        courier: 'Flash Express',
        status: 'shipped'
      },
      { upsert: true }
    );
    console.log('Created Mock Order');

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

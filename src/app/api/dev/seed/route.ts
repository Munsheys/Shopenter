import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Order, Message } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/dev/seed — creates mock customers, orders, and messages for the authenticated merchant
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const mid = merchant.merchantId;

  const mockUsers = [
    {
      userId: `mock-${mid}-alice`,
      displayName: 'Alice (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      platform: 'line',
      addresses: [
        '88/2 Sukhumvit Soi 11, Bangkok 10110',
        '45/9 Thonglor 13, Watthana, Bangkok 10110',
      ],
    },
    {
      userId: `mock-${mid}-bob`,
      displayName: 'Bob (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      platform: 'line',
      addresses: ['45 Nimman Rd, Chiang Mai 50200'],
    },
    {
      userId: `mock-${mid}-charlie`,
      displayName: 'Charlie (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
      platform: 'line',
      addresses: [],
    },
  ];

  // Upsert customers — Alice gets 3 unread to surface the badge
  for (const u of mockUsers) {
    await Customer.findOneAndUpdate(
      { merchantId: mid, userId: u.userId },
      { ...u, merchantId: mid, lastSeen: new Date(), unreadCount: u.userId.includes('alice') ? 3 : 0 },
      { upsert: true, new: true }
    );
  }

  // Wipe old mock orders/messages
  await Order.deleteMany({ merchantId: mid, userId: { $in: mockUsers.map(u => u.userId) } });
  await Message.deleteMany({ merchantId: mid, userId: { $in: mockUsers.map(u => u.userId) } });

  const now = Date.now();
  const alice = mockUsers[0].userId;
  const bob   = mockUsers[1].userId;
  const charlie = mockUsers[2].userId;

  // ── ALICE — all four order states + rich chat ─────────────────────────────
  // Demonstrates: New Order, Paid, In Parcel, Shipped (order history)
  await Order.insertMany([
    {
      // 1. pending — "New Order" card
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice (Mock)',
      product: '[Chanel] Classic Flap Medium — Caviar Black',
      quantity: 1,
      items: [{ name: '[Chanel] Classic Flap Medium — Caviar Black', qty: 1, price: 4500 }],
      soldTHB: 4500, costKRW: 95000, costTHB: 2470, profit: 2030,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'pending', paymentQrSent: false,
      createdAt: new Date(now - 1000 * 60 * 12), // 12 min ago
    },
    {
      // 2. paid — "✓ Paid" card, QR already sent
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice (Mock)',
      product: '[Bottega Veneta] Jodie Bag — Tan',
      quantity: 1,
      items: [{ name: '[Bottega Veneta] Jodie Bag — Tan', qty: 1, price: 3200 }],
      soldTHB: 3200, costKRW: 68000, costTHB: 1768, profit: 1432,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'paid', paymentQrSent: true,
      createdAt: new Date(now - 1000 * 60 * 45), // 45 min ago
    },
    {
      // 3. preparing — "✓ In Parcel" — shows in active cards AND in parcel card
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice (Mock)',
      product: '[Goyard] Saint Louis PM — Yellow',
      quantity: 1,
      items: [{ name: '[Goyard] Saint Louis PM — Yellow', qty: 1, price: 5800 }],
      soldTHB: 5800, costKRW: 132000, costTHB: 3432, profit: 2368,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'preparing', paymentQrSent: true,
      tracking: '', courier: '',
      createdAt: new Date(now - 1000 * 60 * 90), // 1.5 hrs ago
    },
    {
      // 4. shipped — appears in Fulfilled Order History
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice (Mock)',
      product: '[Hermès] Evelyne III 29 — Etoupe',
      quantity: 1,
      items: [{ name: '[Hermès] Evelyne III 29 — Etoupe', qty: 1, price: 6200 }],
      soldTHB: 6200, costKRW: 148000, costTHB: 3848, profit: 2352,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'shipped', paymentQrSent: true,
      tracking: 'FL9912345678TH', courier: 'Flash Express',
      createdAt: new Date(now - 1000 * 60 * 60 * 72), // 3 days ago
    },
    {
      // 5. shipped (older) — second history row
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice (Mock)',
      product: '[Celine] Nano Luggage — Black',
      quantity: 1,
      items: [{ name: '[Celine] Nano Luggage — Black', qty: 1, price: 2900 }],
      soldTHB: 2900, costKRW: 61000, costTHB: 1586, profit: 1314,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[1],
      status: 'shipped', paymentQrSent: true,
      tracking: 'KR7723456789TH', courier: 'Kerry Express',
      createdAt: new Date(now - 1000 * 60 * 60 * 168), // 7 days ago
    },
  ]);

  // ── BOB — preparing (in parcel, USD cost) ────────────────────────────────
  await Order.insertMany([
    {
      merchantId: mid, userId: bob, platform: 'line', displayName: 'Bob (Mock)',
      product: "Vintage Levi's 501 W32 — Indigo",
      quantity: 1,
      items: [{ name: "Vintage Levi's 501 W32 — Indigo", qty: 1, price: 1800 }],
      soldTHB: 1800, costKRW: 42, costTHB: 1512, profit: 288,
      rateUsed: 36, costCurrency: 'USD', soldCurrency: 'THB',
      address: mockUsers[1].addresses[0],
      status: 'preparing', paymentQrSent: true,
      tracking: '', courier: '',
      createdAt: new Date(now - 1000 * 60 * 60 * 5), // 5 hrs ago
    },
    {
      merchantId: mid, userId: bob, platform: 'line', displayName: 'Bob (Mock)',
      product: "Carhartt WIP Detroit Jacket — Black",
      quantity: 1,
      items: [{ name: "Carhartt WIP Detroit Jacket — Black", qty: 1, price: 2400 }],
      soldTHB: 2400, costKRW: 55, costTHB: 1980, profit: 420,
      rateUsed: 36, costCurrency: 'USD', soldCurrency: 'THB',
      address: mockUsers[1].addresses[0],
      status: 'paid', paymentQrSent: true,
      createdAt: new Date(now - 1000 * 60 * 60 * 3), // 3 hrs ago
    },
  ]);

  // ── CHARLIE — pending (no address) ───────────────────────────────────────
  await Order.insertMany([
    {
      merchantId: mid, userId: charlie, platform: 'line', displayName: 'Charlie (Mock)',
      product: 'Thai Silk Scarf — Royal Blue',
      quantity: 2,
      items: [{ name: 'Thai Silk Scarf — Royal Blue', qty: 2, price: 650 }],
      soldTHB: 1300, costKRW: 640, costTHB: 640, profit: 660,
      rateUsed: 1, costCurrency: 'THB', soldCurrency: 'THB',
      address: '',
      status: 'pending', paymentQrSent: false,
      createdAt: new Date(now - 1000 * 60 * 8), // 8 min ago
    },
  ]);

  // ── ALICE messages — full conversation showing purchase flow ─────────────
  await Message.insertMany([
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'สวัสดีค่ะ! เห็นโพสต์กระเป๋า Chanel ในเพจค่ะ ยังมีอยู่ไหมคะ?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 60) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'สวัสดีครับ! ยังมีอยู่ครับ ราคา ฿4,500 ครับ มีแค่ 1 ใบเลยนะครับ 🙏', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 58) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'โอ้โห สวยมากเลยค่ะ ขอจองได้เลยไหมคะ?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 56) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'ได้เลยครับ จะส่ง QR ให้ชำระเงินมัดจำก่อนได้เลยครับ', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 54) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'system', text: 'Order created — [Chanel] Classic Flap Medium ฿4,500', sender: 'system', createdAt: new Date(now - 1000 * 60 * 52) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'โอนแล้วค่ะ ตรวจสอบด้วยนะคะ 🙂', sender: 'user', createdAt: new Date(now - 1000 * 60 * 20) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'ได้รับแล้วครับ ขอบคุณมากครับ จะแพคส่งให้เร็วๆ นี้เลยครับ', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 18) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'ขอบคุณนะคะ รอค่ะ 💚', sender: 'user', createdAt: new Date(now - 1000 * 60 * 15) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'อยากได้ Bottega ด้วยค่ะ มีไหมคะ?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 10) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'มีอยู่ครับ Jodie Bag สีน้ำตาลทอง ฿3,200 ครับ', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 8) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'สั่งเลยค่ะ 🛍️', sender: 'user', createdAt: new Date(now - 1000 * 60 * 5) },
  ]);

  // ── BOB messages ─────────────────────────────────────────────────────────
  await Message.insertMany([
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: "Hi! Is the Levi's still available?", sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 6) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: 'Yes it is! ฿1,800 + free shipping 🙌', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 60 * 5.9) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: "Great, I'll take it. Do you have the Carhartt jacket too?", sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 5.5) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: 'Yes! Detroit jacket in black, ฿2,400. Both items shipped together? 📦', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 60 * 5.3) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: 'Perfect, paid for both. Please ship to Chiang Mai 🙏', sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 5) },
  ]);

  return NextResponse.json({
    success: true,
    seeded: {
      customers: mockUsers.map(u => u.displayName),
      orders: {
        alice: '5 orders — pending, paid, preparing (parcel), shipped ×2 (history)',
        bob: '2 orders — paid + preparing (parcel, USD cost)',
        charlie: '1 order — pending, no address',
      },
    },
  });
}

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
      addresses: ['88/2 Sukhumvit Soi 11, Bangkok 10110'],
    },
    {
      userId: `mock-${mid}-bob`,
      displayName: 'Bob (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      addresses: ['45 Nimman Rd, Chiang Mai 50200'],
    },
    {
      userId: `mock-${mid}-charlie`,
      displayName: 'Charlie (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
      addresses: [],
    },
  ];

  // Upsert customers
  for (const u of mockUsers) {
    await Customer.findOneAndUpdate(
      { merchantId: mid, userId: u.userId },
      { ...u, merchantId: mid, lastSeen: new Date(), unreadCount: u.userId.includes('alice') ? 2 : 0 },
      { upsert: true }
    );
  }

  // Wipe old mock orders/messages for this merchant
  await Order.deleteMany({ merchantId: mid, lineUserId: { $in: mockUsers.map(u => u.userId) } });
  await Message.deleteMany({ merchantId: mid, lineUserId: { $in: mockUsers.map(u => u.userId) } });

  const now = Date.now();

  // ── Alice: pending KRW order + one paid order ──────────────────────────────
  await Order.insertMany([
    {
      merchantId: mid,
      lineUserId: mockUsers[0].userId,
      displayName: mockUsers[0].displayName,
      product: 'Glow Serum XL',
      quantity: 1,
      items: [{ name: 'Glow Serum XL', qty: 1, price: 1250 }],
      soldTHB: 1250,
      costKRW: 32000,
      costTHB: 832,
      profit: 418,
      rateUsed: 0.026,
      costCurrency: 'KRW',
      soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'pending',
      paymentQrSent: false,
      createdAt: new Date(now - 1000 * 60 * 30), // 30 min ago
    },
    {
      merchantId: mid,
      lineUserId: mockUsers[0].userId,
      displayName: mockUsers[0].displayName,
      product: 'Sunscreen SPF50+',
      quantity: 2,
      items: [{ name: 'Sunscreen SPF50+', qty: 2, price: 390 }],
      soldTHB: 780,
      costKRW: 18000,
      costTHB: 468,
      profit: 312,
      rateUsed: 0.026,
      costCurrency: 'KRW',
      soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'paid',
      paymentQrSent: true,
      createdAt: new Date(now - 1000 * 60 * 90), // 90 min ago
    },
  ]);

  // ── Bob: preparing (in parcel) — USD cost ─────────────────────────────────
  await Order.insertMany([
    {
      merchantId: mid,
      lineUserId: mockUsers[1].userId,
      displayName: mockUsers[1].displayName,
      product: 'Vintage Levi\'s 501 W32',
      quantity: 1,
      items: [{ name: 'Vintage Levi\'s 501 W32', qty: 1, price: 1800 }],
      soldTHB: 1800,
      costKRW: 42,       // costKRW field repurposed as cost amount (USD here)
      costTHB: 1512,     // 42 USD × 36 THB
      profit: 288,
      rateUsed: 36,
      costCurrency: 'USD',
      soldCurrency: 'THB',
      address: mockUsers[1].addresses[0],
      status: 'preparing',
      paymentQrSent: true,
      tracking: '',
      courier: '',
      createdAt: new Date(now - 1000 * 60 * 60 * 5), // 5 hrs ago
    },
  ]);

  // ── Charlie: local THB cost (bought locally, sold locally) ───────────────
  await Order.insertMany([
    {
      merchantId: mid,
      lineUserId: mockUsers[2].userId,
      displayName: mockUsers[2].displayName,
      product: 'Thai Silk Scarf',
      quantity: 1,
      items: [{ name: 'Thai Silk Scarf', qty: 1, price: 650 }],
      soldTHB: 650,
      costKRW: 320,      // cost in THB stored here
      costTHB: 320,
      profit: 330,
      rateUsed: 1,
      costCurrency: 'THB',
      soldCurrency: 'THB',
      address: '',
      status: 'pending',
      paymentQrSent: false,
      createdAt: new Date(now - 1000 * 60 * 15), // 15 min ago
    },
    {
      merchantId: mid,
      lineUserId: mockUsers[2].userId,
      displayName: mockUsers[2].displayName,
      product: 'Hand-woven Basket',
      quantity: 1,
      items: [{ name: 'Hand-woven Basket', qty: 1, price: 450 }],
      soldTHB: 450,
      costKRW: 200,
      costTHB: 200,
      profit: 250,
      rateUsed: 1,
      costCurrency: 'THB',
      soldCurrency: 'THB',
      address: '',
      status: 'shipped',
      paymentQrSent: true,
      tracking: 'TH99887766',
      courier: 'ThaiPost',
      createdAt: new Date(now - 1000 * 60 * 60 * 48), // 2 days ago
    },
  ]);

  // ── Messages for Alice ────────────────────────────────────────────────────
  await Message.insertMany([
    { merchantId: mid, lineUserId: mockUsers[0].userId, type: 'text', text: 'สวัสดีค่ะ! สนใจ Glow Serum ที่โพสต์ไว้ค่ะ', sender: 'user', createdAt: new Date(now - 1000 * 60 * 35) },
    { merchantId: mid, lineUserId: mockUsers[0].userId, type: 'text', text: 'สวัสดีครับ! มีอยู่ครับ ราคา ฿1,250 ต่อขวดนะครับ 🙏', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 33) },
    { merchantId: mid, lineUserId: mockUsers[0].userId, type: 'text', text: 'ขอ 1 ขวดค่ะ จัดส่งได้เร็วไหมคะ?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 31) },
    { merchantId: mid, lineUserId: mockUsers[0].userId, type: 'text', text: 'ส่งได้ภายใน 1-2 วันทำการครับ จะส่ง QR ให้ชำระเงินตอนนี้เลยนะครับ', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 28) },
    { merchantId: mid, lineUserId: mockUsers[0].userId, type: 'text', text: 'ได้เลยค่ะ รอนะคะ', sender: 'user', createdAt: new Date(now - 1000 * 60 * 25) },
    { merchantId: mid, lineUserId: mockUsers[0].userId, type: 'text', text: 'ชำระแล้วค่ะ', sender: 'user', createdAt: new Date(now - 1000 * 60 * 5) },
  ]);

  // ── Messages for Bob ──────────────────────────────────────────────────────
  await Message.insertMany([
    { merchantId: mid, lineUserId: mockUsers[1].userId, type: 'text', text: 'Hi! Is the Levi\'s still available?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 6) },
    { merchantId: mid, lineUserId: mockUsers[1].userId, type: 'text', text: 'Yes it is! ฿1,800 shipped 🙌', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 60 * 5.9) },
    { merchantId: mid, lineUserId: mockUsers[1].userId, type: 'text', text: 'Paid! Please ship to Chiang Mai', sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 5) },
  ]);

  return NextResponse.json({
    success: true,
    seeded: {
      customers: mockUsers.map(u => u.displayName),
      note: 'Alice has 2 unread messages + pending/paid orders. Bob has a preparing parcel (USD cost). Charlie has local THB cost orders.',
    },
  });
}

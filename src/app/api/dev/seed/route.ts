import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Order, Message, Product, LoyaltyTransaction } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/dev/seed
// Creates a full set of mock data covering every visible UI state.
// Safe to run multiple times — customers and products are upserted, orders/messages/loyalty wiped and recreated.
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const mid = merchant.merchantId;
  const now = Date.now();

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  // Upsert so orders can reference real productIds. Idempotent.
  const productDefs = [
    {
      name: '[Chanel] Classic Flap Medium — Caviar Black',
      brand: 'Chanel', price: 4500,
      imageUrl: 'https://picsum.photos/seed/chanel-bag/400/400',
      categories: ['Bags', 'Luxury'], isActive: true,
    },
    {
      name: '[Bottega Veneta] Jodie Bag — Tan',
      brand: 'Bottega Veneta', price: 3200,
      imageUrl: 'https://picsum.photos/seed/bottega-bag/400/400',
      categories: ['Bags', 'Luxury'], isActive: true,
    },
    {
      name: '[Goyard] Saint Louis PM — Yellow',
      brand: 'Goyard', price: 5800,
      imageUrl: 'https://picsum.photos/seed/goyard-bag/400/400',
      categories: ['Bags', 'Luxury'], isActive: true,
    },
    {
      name: '[Hermès] Evelyne III 29 — Etoupe',
      brand: 'Hermès', price: 6200,
      imageUrl: 'https://picsum.photos/seed/hermes-bag/400/400',
      categories: ['Bags', 'Luxury'], isActive: true,
    },
    {
      name: '[Celine] Nano Luggage — Black',
      brand: 'Celine', price: 2900,
      imageUrl: 'https://picsum.photos/seed/celine-bag/400/400',
      categories: ['Bags', 'Luxury'], isActive: true,
    },
    {
      name: "[Levi's] 501 Original W32 — Indigo",
      brand: "Levi's", price: 1800,
      imageUrl: 'https://picsum.photos/seed/levis-jeans/400/400',
      categories: ['Clothing'], isActive: true,
    },
    {
      name: '[Carhartt WIP] Detroit Jacket — Black',
      brand: 'Carhartt WIP', price: 2400,
      imageUrl: 'https://picsum.photos/seed/carhartt-jacket/400/400',
      categories: ['Clothing'], isActive: true,
    },
    {
      name: 'Thai Silk Scarf — Royal Blue',
      brand: 'Local Craft', price: 650,
      imageUrl: 'https://picsum.photos/seed/silk-scarf/400/400',
      categories: ['Accessories'], isActive: true,
    },
  ];

  const products: Record<string, any> = {};
  for (const def of productDefs) {
    const doc = await Product.findOneAndUpdate(
      { merchantId: mid, name: def.name },
      { ...def, merchantId: mid },
      { upsert: true, new: true }
    ).lean();
    // index by first meaningful keyword for easy lookup below
    const key = def.name.replace(/\[.*?\]\s*/, '').split(' ')[0].toLowerCase();
    products[key] = doc;
    // also index by brand keyword
    products[def.brand.toLowerCase().split(' ')[0]] = doc;
  }

  const p = (keyword: string) => products[keyword.toLowerCase()] ?? null;

  // ── CUSTOMERS ──────────────────────────────────────────────────────────────
  const mockUsers = [
    {
      userId: `mock-${mid}-alice`,
      displayName: 'Alice Suparat (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AliceMock',
      platform: 'line',
      addresses: [
        '88/2 Sukhumvit Soi 11, Klongtoey Nuea, Watthana, Bangkok 10110',
        '45/9 Thonglor 13, Watthana, Bangkok 10110',
      ],
      loyaltyPoints: 340,
      followedAt: new Date(now - 1000 * 60 * 60 * 24 * 90),
      unreadCount: 3,
    },
    {
      userId: `mock-${mid}-bob`,
      displayName: 'Bob Thanachai (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BobMock',
      platform: 'line',
      addresses: ['45 Nimman Rd, Si Phum, Mueang, Chiang Mai 50200'],
      loyaltyPoints: 80,
      followedAt: new Date(now - 1000 * 60 * 60 * 24 * 45),
      unreadCount: 0,
    },
    {
      userId: `mock-${mid}-charlie`,
      displayName: 'Charlie (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CharlieMock',
      platform: 'line',
      addresses: [],
      loyaltyPoints: 0,
      followedAt: new Date(now - 1000 * 60 * 60 * 24 * 3),
      unreadCount: 1,
    },
    {
      userId: `mock-${mid}-diana`,
      displayName: 'Diana Chen (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DianaMock',
      platform: 'instagram',
      addresses: ['99 Silom Rd, Bang Rak, Bangkok 10500'],
      loyaltyPoints: 50,
      followedAt: new Date(now - 1000 * 60 * 60 * 24 * 14),
      unreadCount: 0,
    },
    {
      userId: `mock-${mid}-eve`,
      displayName: 'Eve (Blocked) (Mock)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EveMock',
      platform: 'line',
      addresses: [],
      loyaltyPoints: 0,
      followedAt: new Date(now - 1000 * 60 * 60 * 24 * 60),
      unreadCount: 0,
      status: 'blocked',
    },
  ];

  for (const u of mockUsers) {
    await Customer.findOneAndUpdate(
      { merchantId: mid, userId: u.userId },
      { ...u, merchantId: mid, lastSeen: new Date(), status: (u as any).status ?? 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // Wipe old mock orders/messages/loyalty
  const allMockIds = mockUsers.map(u => u.userId);
  await Order.deleteMany({ merchantId: mid, userId: { $in: allMockIds } });
  await Message.deleteMany({ merchantId: mid, userId: { $in: allMockIds } });
  await LoyaltyTransaction.deleteMany({ merchantId: mid, userId: { $in: allMockIds } });

  const alice   = mockUsers[0].userId;
  const bob     = mockUsers[1].userId;
  const charlie = mockUsers[2].userId;
  const diana   = mockUsers[3].userId;

  // ── ALICE — every order status + edge cases ─────────────────────────────
  await Order.insertMany([
    {
      // 1. PENDING — brand new, QR not sent yet
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice Suparat (Mock)',
      product: '[Chanel] Classic Flap Medium — Caviar Black',
      quantity: 1,
      items: [{ productId: p('chanel')?._id?.toString(), name: '[Chanel] Classic Flap Medium — Caviar Black', qty: 1, price: 4500, imageUrl: p('chanel')?.imageUrl }],
      soldTHB: 4500, costKRW: 95000, costTHB: 2470, profit: 2030,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'pending', paymentQrSent: false, trackingSent: false,
      shipCostTHB: 0,
      createdAt: new Date(now - 1000 * 60 * 12),
    },
    {
      // 2. PAID — QR sent and payment confirmed by slip
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice Suparat (Mock)',
      product: '[Bottega Veneta] Jodie Bag — Tan',
      quantity: 1,
      items: [{ productId: p('bottega')?._id?.toString(), name: '[Bottega Veneta] Jodie Bag — Tan', qty: 1, price: 3200, imageUrl: p('bottega')?.imageUrl }],
      soldTHB: 3200, costKRW: 68000, costTHB: 1768, profit: 1432,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'paid', paymentQrSent: true, notifPaid: true, trackingSent: false,
      shipCostTHB: 0,
      createdAt: new Date(now - 1000 * 60 * 45),
    },
    {
      // 3. PREPARING — packed, waiting for courier pickup
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice Suparat (Mock)',
      product: '[Goyard] Saint Louis PM — Yellow',
      quantity: 1,
      items: [{ productId: p('goyard')?._id?.toString(), name: '[Goyard] Saint Louis PM — Yellow', qty: 1, price: 5800, imageUrl: p('goyard')?.imageUrl }],
      soldTHB: 5800, costKRW: 132000, costTHB: 3432, profit: 2368,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'preparing', statusBeforeParcel: 'paid',
      paymentQrSent: true, notifPaid: true, notifPreparing: true, trackingSent: false,
      tracking: '', courier: '',
      shipCostTHB: 50,
      createdAt: new Date(now - 1000 * 60 * 90),
    },
    {
      // 4. SHIPPED — tracking number added, notification sent
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice Suparat (Mock)',
      product: '[Hermès] Evelyne III 29 — Etoupe',
      quantity: 1,
      items: [{ productId: p('hermès')?._id?.toString() ?? p('hermes')?._id?.toString(), name: '[Hermès] Evelyne III 29 — Etoupe', qty: 1, price: 6200, imageUrl: p('hermès')?.imageUrl }],
      soldTHB: 6200, costKRW: 148000, costTHB: 3848, profit: 2352,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'shipped', statusBeforeParcel: 'paid',
      paymentQrSent: true, notifPaid: true, notifPreparing: true, notifShipped: true, trackingSent: true,
      tracking: 'FL9912345678TH', courier: 'Flash Express',
      shipCostTHB: 50,
      createdAt: new Date(now - 1000 * 60 * 60 * 72),
    },
    {
      // 5. DELIVERED — fully fulfilled, older history
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice Suparat (Mock)',
      product: '[Celine] Nano Luggage — Black',
      quantity: 1,
      items: [{ productId: p('celine')?._id?.toString(), name: '[Celine] Nano Luggage — Black', qty: 1, price: 2900, imageUrl: p('celine')?.imageUrl }],
      soldTHB: 2900, costKRW: 61000, costTHB: 1586, profit: 1314,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[0].addresses[1],
      status: 'delivered', statusBeforeParcel: 'paid',
      paymentQrSent: true, notifPaid: true, notifPreparing: true, notifShipped: true, notifDelivered: true, trackingSent: true,
      tracking: 'KR7723456789TH', courier: 'Kerry Express',
      shipCostTHB: 50,
      createdAt: new Date(now - 1000 * 60 * 60 * 168),
    },
    {
      // 6. CANCELLED — had a coupon applied, customer changed mind
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice Suparat (Mock)',
      product: 'Thai Silk Scarf — Royal Blue ×2',
      quantity: 2,
      items: [{ productId: p('thai')?._id?.toString() ?? p('local')?._id?.toString(), name: 'Thai Silk Scarf — Royal Blue', qty: 2, price: 585, imageUrl: p('thai')?.imageUrl }],
      soldTHB: 1170, costKRW: 0, costTHB: 0, profit: 1170,
      rateUsed: 1, costCurrency: 'THB', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'cancelled', paymentQrSent: false,
      shipCostTHB: 0,
      couponCode: 'WELCOME10', discountAmount: 130,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 14),
    },
    {
      // 7. MULTI-ITEM + LOYALTY REDEEM — preparing, 2 products, points used
      merchantId: mid, userId: alice, platform: 'line', displayName: 'Alice Suparat (Mock)',
      product: "[Levi's] 501 + [Carhartt WIP] Detroit Jacket",
      quantity: 2,
      items: [
        { productId: p("levi's")?._id?.toString(), name: "[Levi's] 501 Original W32 — Indigo", qty: 1, price: 1800, imageUrl: p("levi's")?.imageUrl },
        { productId: p('carhartt')?._id?.toString(), name: '[Carhartt WIP] Detroit Jacket — Black', qty: 1, price: 2400, imageUrl: p('carhartt')?.imageUrl },
      ],
      soldTHB: 3800, costKRW: 97, costTHB: 3492, profit: 308,
      rateUsed: 36, costCurrency: 'USD', soldCurrency: 'THB',
      address: mockUsers[0].addresses[0],
      status: 'preparing', statusBeforeParcel: 'paid',
      paymentQrSent: true, notifPaid: true, notifPreparing: true, trackingSent: false,
      tracking: '', courier: '',
      shipCostTHB: 80,
      redeemedPoints: 200, discountAmount: 200,
      createdAt: new Date(now - 1000 * 60 * 60 * 5),
    },
  ]);

  // ── BOB — preparing + shipped ───────────────────────────────────────────
  await Order.insertMany([
    {
      merchantId: mid, userId: bob, platform: 'line', displayName: 'Bob Thanachai (Mock)',
      product: "[Levi's] 501 Original W32 — Indigo",
      quantity: 1,
      items: [{ productId: p("levi's")?._id?.toString(), name: "[Levi's] 501 Original W32 — Indigo", qty: 1, price: 1800, imageUrl: p("levi's")?.imageUrl }],
      soldTHB: 1800, costKRW: 42, costTHB: 1512, profit: 288,
      rateUsed: 36, costCurrency: 'USD', soldCurrency: 'THB',
      address: mockUsers[1].addresses[0],
      status: 'preparing', statusBeforeParcel: 'paid',
      paymentQrSent: true, notifPaid: true, notifPreparing: true, trackingSent: false,
      tracking: '', courier: '',
      shipCostTHB: 50,
      createdAt: new Date(now - 1000 * 60 * 60 * 5),
    },
    {
      merchantId: mid, userId: bob, platform: 'line', displayName: 'Bob Thanachai (Mock)',
      product: '[Carhartt WIP] Detroit Jacket — Black',
      quantity: 1,
      items: [{ productId: p('carhartt')?._id?.toString(), name: '[Carhartt WIP] Detroit Jacket — Black', qty: 1, price: 2400, imageUrl: p('carhartt')?.imageUrl }],
      soldTHB: 2400, costKRW: 55, costTHB: 1980, profit: 420,
      rateUsed: 36, costCurrency: 'USD', soldCurrency: 'THB',
      address: mockUsers[1].addresses[0],
      status: 'shipped', statusBeforeParcel: 'paid',
      paymentQrSent: true, notifPaid: true, notifPreparing: true, notifShipped: true, trackingSent: true,
      tracking: 'FL8812345677TH', courier: 'Flash Express',
      shipCostTHB: 50,
      createdAt: new Date(now - 1000 * 60 * 60 * 3),
    },
  ]);

  // ── CHARLIE — pending, no address (new customer edge case) ──────────────
  await Order.insertMany([
    {
      merchantId: mid, userId: charlie, platform: 'line', displayName: 'Charlie (Mock)',
      product: 'Thai Silk Scarf — Royal Blue',
      quantity: 2,
      items: [{ productId: p('thai')?._id?.toString() ?? p('local')?._id?.toString(), name: 'Thai Silk Scarf — Royal Blue', qty: 2, price: 650 }],
      soldTHB: 1300, costKRW: 0, costTHB: 0, profit: 1300,
      rateUsed: 1, costCurrency: 'THB', soldCurrency: 'THB',
      address: '', // deliberately empty — tests missing-address UI state
      status: 'pending', paymentQrSent: false,
      shipCostTHB: 0,
      createdAt: new Date(now - 1000 * 60 * 8),
    },
  ]);

  // ── DIANA (Instagram) — delivered ───────────────────────────────────────
  await Order.insertMany([
    {
      merchantId: mid, userId: diana, platform: 'instagram', displayName: 'Diana Chen (Mock)',
      product: '[Celine] Nano Luggage — Black',
      quantity: 1,
      items: [{ productId: p('celine')?._id?.toString(), name: '[Celine] Nano Luggage — Black', qty: 1, price: 2900, imageUrl: p('celine')?.imageUrl }],
      soldTHB: 2900, costKRW: 61000, costTHB: 1586, profit: 1314,
      rateUsed: 0.026, costCurrency: 'KRW', soldCurrency: 'THB',
      address: mockUsers[3].addresses[0],
      status: 'delivered', statusBeforeParcel: 'paid',
      paymentQrSent: true, notifPaid: true, notifPreparing: true, notifShipped: true, notifDelivered: true, trackingSent: true,
      tracking: 'TH7711234567TH', courier: 'ThaiPost',
      shipCostTHB: 40,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7),
    },
  ]);

  // ── LOYALTY TRANSACTIONS — Alice ────────────────────────────────────────
  await LoyaltyTransaction.insertMany([
    {
      merchantId: mid, userId: alice, platform: 'line',
      type: 'earn', points: 290,
      note: 'Earned from order ฿2,900 ([Celine] Nano Luggage)',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7),
    },
    {
      merchantId: mid, userId: alice, platform: 'line',
      type: 'earn', points: 620,
      note: 'Earned from order ฿6,200 ([Hermès] Evelyne)',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3),
    },
    {
      merchantId: mid, userId: alice, platform: 'line',
      type: 'redeem', points: 200,
      note: 'Redeemed for ฿200 discount on multi-item order',
      createdAt: new Date(now - 1000 * 60 * 60 * 5),
    },
    {
      merchantId: mid, userId: alice, platform: 'line',
      type: 'earn', points: 320,
      note: 'Earned from order ฿3,200 ([Bottega Veneta] Jodie)',
      createdAt: new Date(now - 1000 * 60 * 45),
    },
  ]);

  // ── ALICE MESSAGES — full purchase lifecycle ────────────────────────────
  await Message.insertMany([
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'สวัสดีค่ะ! เห็นโพสต์กระเป๋า Chanel ในเพจค่ะ ยังมีอยู่ไหมคะ?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 60) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'สวัสดีครับ! ยังมีอยู่ครับ ราคา ฿4,500 ครับ มีแค่ 1 ใบเลยนะครับ 🙏', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 58) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'โอ้โห สวยมากเลยค่ะ ขอจองได้เลยไหมคะ?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 56) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'ได้เลยครับ จะส่ง QR ให้ชำระเงินมัดจำก่อนได้เลยครับ', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 54) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'system', text: 'Order created — [Chanel] Classic Flap Medium ฿4,500', sender: 'system', createdAt: new Date(now - 1000 * 60 * 52) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'system', text: '🏦 QR Code Sent', sender: 'system', metadata: { amount: 4500, product: '[Chanel] Classic Flap Medium' }, createdAt: new Date(now - 1000 * 60 * 50) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'sticker', text: '🎭 Sticker', sender: 'user', createdAt: new Date(now - 1000 * 60 * 35) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'image', text: '📸 Image Uploaded', sender: 'user', createdAt: new Date(now - 1000 * 60 * 30) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'system', text: '✅ Payment Confirmed', sender: 'system', metadata: { amount: 4500, product: '[Chanel] Classic Flap Medium' }, createdAt: new Date(now - 1000 * 60 * 28) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'โอเคครับ ยืนยันแล้วครับ กำลังเตรียมสินค้าให้เลยครับ 📦', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 26) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'ขอบคุณนะคะ รอค่ะ 💚', sender: 'user', createdAt: new Date(now - 1000 * 60 * 24) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'อยากได้ Bottega ด้วยค่ะ มีไหมคะ?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 10) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'มีอยู่ครับ Jodie Bag สีน้ำตาลทอง ฿3,200 ครับ', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 8) },
    { merchantId: mid, userId: alice, platform: 'line', type: 'text', text: 'สั่งเลยค่ะ 🛍️', sender: 'user', createdAt: new Date(now - 1000 * 60 * 5) },
  ]);

  // ── BOB MESSAGES ────────────────────────────────────────────────────────
  await Message.insertMany([
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: "Hi! Is the Levi's still available?", sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 6) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: 'Yes it is! ฿1,800 + shipping 🙌', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 60 * 5.9) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: "Great, I'll take it. Do you have the Carhartt jacket too?", sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 5.5) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: 'Yes! Detroit jacket in black, ฿2,400. Ship both together to Chiang Mai? 📦', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 60 * 5.3) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'text', text: 'Perfect, paid for both. Please ship asap 🙏', sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 5) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'system', text: '🏦 QR Code Sent', sender: 'system', metadata: { amount: 4200 }, createdAt: new Date(now - 1000 * 60 * 60 * 4.5) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'image', text: '📸 Image Uploaded', sender: 'user', createdAt: new Date(now - 1000 * 60 * 60 * 4) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'system', text: '✅ Payment Confirmed', sender: 'system', metadata: { amount: 4200 }, createdAt: new Date(now - 1000 * 60 * 60 * 3.9) },
    { merchantId: mid, userId: bob, platform: 'line', type: 'system', text: '🚚 Shipped — Flash Express FL8812345677TH', sender: 'system', createdAt: new Date(now - 1000 * 60 * 60 * 2) },
  ]);

  // ── CHARLIE MESSAGES — new customer, no address yet ─────────────────────
  await Message.insertMany([
    { merchantId: mid, userId: charlie, platform: 'line', type: 'text', text: 'สวัสดีครับ ผ้าพันคอสีน้ำเงินยังมีอยู่ไหมครับ?', sender: 'user', createdAt: new Date(now - 1000 * 60 * 20) },
    { merchantId: mid, userId: charlie, platform: 'line', type: 'text', text: 'มีอยู่ครับ สีน้ำเงินราคา ฿650/ผืน สั่งได้เลยครับ 🙏', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 18) },
    { merchantId: mid, userId: charlie, platform: 'line', type: 'text', text: 'เอา 2 ผืนครับ', sender: 'user', createdAt: new Date(now - 1000 * 60 * 15) },
    { merchantId: mid, userId: charlie, platform: 'line', type: 'system', text: 'Order created — Thai Silk Scarf ×2 ฿1,300', sender: 'system', createdAt: new Date(now - 1000 * 60 * 8) },
    { merchantId: mid, userId: charlie, platform: 'line', type: 'text', text: 'ขอบคุณครับ! ช่วยส่งที่อยู่จัดส่งมาด้วยนะครับ 😊', sender: 'admin', createdAt: new Date(now - 1000 * 60 * 6) },
  ]);

  return NextResponse.json({
    success: true,
    seeded: {
      products: productDefs.length,
      customers: mockUsers.map(u => `${u.displayName} (${u.platform}${(u as any).status === 'blocked' ? ', BLOCKED' : ''})`),
      orders: {
        alice: '7 — pending · paid · preparing (×2, one multi-item with loyalty redeem) · shipped · delivered · cancelled',
        bob: '2 — preparing + shipped',
        charlie: '1 — pending, no address',
        diana: '1 — delivered (Instagram)',
        eve: '0 — blocked customer, no orders',
      },
      loyalty: 'Alice: +290 · +620 · -200 redeem · +320 = 1030 earned, 200 redeemed, 340 net points',
    },
  });
}

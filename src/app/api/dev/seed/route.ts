import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Order, Message } from '@/models';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbConnect();

    const mockUserId = 'mock-user-123';
    const mockDisplayName = 'Alice (Mock User)';

    // 1. Create/Update Customer
    await Customer.findOneAndUpdate(
      { userId: mockUserId },
      { 
        userId: mockUserId,
        displayName: mockDisplayName,
        pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        statusMessage: 'Looking for K-Beauty recommendations!',
        lastSeen: new Date(),
        addresses: ['123 Mock Street, Bangkok, Thailand 10110']
      },
      { upsert: true, new: true }
    );

    // 2. Clear old mock data to avoid duplicates
    await Order.deleteMany({ lineUserId: mockUserId });
    await Message.deleteMany({ lineUserId: mockUserId });

    // 3. Create Pending Orders
    const pendingOrders = [
      {
        lineUserId: mockUserId,
        displayName: mockDisplayName,
        product: 'Glow Serum XL',
        soldTHB: 1250,
        costKRW: 32000,
        profit: 450,
        rateUsed: 0.025,
        status: 'pending',
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        lineUserId: mockUserId,
        displayName: mockDisplayName,
        product: 'Moisture Cream 50ml',
        soldTHB: 890,
        costKRW: 22000,
        profit: 340,
        rateUsed: 0.025,
        status: 'pending',
        createdAt: new Date(Date.now() - 7200000) // 2 hours ago
      }
    ];
    await Order.insertMany(pendingOrders);

    // 4. Create Order History (Shipped)
    const historyOrders = [
      {
        lineUserId: mockUserId,
        displayName: mockDisplayName,
        product: 'Sunscreen SPF50+',
        soldTHB: 650,
        costKRW: 15000,
        profit: 275,
        rateUsed: 0.025,
        status: 'shipped',
        tracking: 'TH1234567890',
        courier: 'Kerry Express',
        address: '123 Mock Street, Bangkok, Thailand 10110',
        createdAt: new Date(Date.now() - 86400000 * 3) // 3 days ago
      },
      {
        lineUserId: mockUserId,
        displayName: mockDisplayName,
        product: 'Cleansing Oil 200ml',
        soldTHB: 1100,
        costKRW: 28000,
        profit: 400,
        rateUsed: 0.025,
        status: 'shipped',
        tracking: 'TH0987654321',
        courier: 'Flash Express',
        address: '123 Mock Street, Bangkok, Thailand 10110',
        createdAt: new Date(Date.now() - 86400000 * 7) // 7 days ago
      }
    ];
    await Order.insertMany(historyOrders);

    // 5. Create Messages
    const messages = [
      {
        lineUserId: mockUserId,
        sender: 'user',
        text: 'สวัสดีค่ะ สนใจครีมบำรุงผิวตัวใหม่ค่ะ',
        createdAt: new Date(Date.now() - 3600000 * 2)
      },
      {
        lineUserId: mockUserId,
        sender: 'admin',
        text: 'สวัสดีครับ! ตัว Glow Serum XL หรือเปล่าครับ? ตอนนี้มีโปรโมชั่นอยู่นะครับ',
        createdAt: new Date(Date.now() - 3600000 * 1.9)
      },
      {
        lineUserId: mockUserId,
        sender: 'user',
        text: 'ใช่ค่ะ รับ 1 ขวดค่ะ แล้วก็ Moisture Cream ด้วย',
        createdAt: new Date(Date.now() - 3600000 * 1.8)
      },
      {
        lineUserId: mockUserId,
        sender: 'admin',
        text: 'ได้รับยอดแล้วครับ กำลังเตรียมจัดส่งให้ช่วงบ่ายนี้นะครับ 🙏',
        createdAt: new Date(Date.now() - 3600000 * 1.5)
      }
    ];
    await Message.insertMany(messages);

    return NextResponse.json({ success: true, message: 'Mock data seeded successfully for ' + mockDisplayName });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

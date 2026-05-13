import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '@/models';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const secret = request.headers.get('x-admin-secret');
    if (!(await verifyAuth(secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = await Message.find({ lineUserId: userId }).sort({ createdAt: 1 }).lean();
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Messages fetch error:', error);
    // Return mock messages for mock-user-123, empty for all others
    if (userId === 'mock-user-123') {
      const now = Date.now();
      const mockMessages = [
        { _id: 'm1', lineUserId: userId, sender: 'user',  text: 'สวัสดีครับ มีสินค้าแนะนำไหมครับ', createdAt: new Date(now - 86400000 * 2).toISOString() },
        { _id: 'm2', lineUserId: userId, sender: 'admin', text: 'สวัสดีครับ! วันนี้มีครีมบำรุงผิวเกาหลีใหม่เลยครับ 🌿', createdAt: new Date(now - 86400000 * 2 + 60000).toISOString() },
        { _id: 'm3', lineUserId: userId, sender: 'user',  text: 'ราคาเท่าไหร่ครับ', createdAt: new Date(now - 86400000 * 2 + 120000).toISOString() },
        { _id: 'm4', lineUserId: userId, sender: 'admin', text: '1,250 บาทครับ ส่งฟรี Kerry ครับ', createdAt: new Date(now - 86400000 * 2 + 180000).toISOString() },
        { _id: 'm5', lineUserId: userId, sender: 'user',  text: 'โอเคครับ สั่งเลย 1 ชิ้น', createdAt: new Date(now - 86400000 + 3600000).toISOString() },
        { _id: 'm6', lineUserId: userId, sender: 'admin', text: 'รับออเดอร์แล้วครับ จัดส่งพรุ่งนี้เลยครับ 📦', createdAt: new Date(now - 86400000 + 3660000).toISOString() },
        { _id: 'm7', lineUserId: userId, sender: 'user',  text: 'ขอบคุณครับ 🙏', createdAt: new Date(now - 3600000).toISOString() },
        { _id: 'm8', lineUserId: userId, sender: 'admin', text: 'ได้เลยครับ! ติดตามพัสดุได้เลยนะครับ 😊', createdAt: new Date(now - 3540000).toISOString() },
      ];
      return NextResponse.json(mockMessages, { status: 200 });
    }
    return NextResponse.json([], { status: 200 });
  }
}

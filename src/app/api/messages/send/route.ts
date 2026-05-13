import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message, Settings, Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const merchant = getMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, text } = await request.json();
    if (!userId || !text) {
      return NextResponse.json({ error: 'Missing userId or text' }, { status: 400 });
    }

    await dbConnect();
    
    // Fetch merchant details to get LINE token
    const merchantData = await Merchant.findById(merchant.merchantId);
    if (!merchantData) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // 1. Save to MongoDB
    const newMessage = await Message.create({
      merchantId: merchant.merchantId,
      lineUserId: userId,
      text: text,
      sender: 'admin',
      createdAt: new Date()
    });

    // 2. Push to LINE
    const token = merchantData.lineChannelAccessToken;
    if (token && token.trim() !== '') {
      try {
        const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            to: userId,
            messages: [{ type: 'text', text: text }]
          })
        });
        
        if (!lineResponse.ok) {
          const errorData = await lineResponse.json();
          console.error('LINE API Error:', errorData);
        }
      } catch (lineError) {
        console.error('Network error reaching LINE API:', lineError);
      }
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

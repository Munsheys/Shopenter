import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '@/models';

export async function POST(request: NextRequest) {
  try {
    const { userId, text } = await request.json();

    if (!userId || !text) {
      return NextResponse.json({ error: 'Missing userId or text' }, { status: 400 });
    }

    await dbConnect();

    // 1. Save to MongoDB
    const newMessage = await Message.create({
      lineUserId: userId,
      text: text,
      sender: 'admin',
      createdAt: new Date()
    });

    // 2. Push to LINE (if token is valid)
    const token = process.env.LINE_ACCESS_TOKEN;
    if (token && token !== 'your_token_here') {
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
          // We don't throw here because we still want to return the saved DB message
        }
      } catch (lineError) {
        console.error('Network error reaching LINE API:', lineError);
      }
    } else {
      console.log('Skipping LINE API Push: LINE_ACCESS_TOKEN is not configured.');
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    const { userId, text } = await request.clone().json().catch(() => ({ userId: '', text: '' }));
    if (userId && userId.startsWith('mock-')) {
      return NextResponse.json({
        _id: 'mock-' + Date.now(),
        lineUserId: userId,
        text: text,
        sender: 'admin',
        createdAt: new Date().toISOString()
      }, { status: 201 });
    }
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

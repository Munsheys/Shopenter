import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Customer, Message, Settings } from '@/models';
import { Client } from '@line/bot-sdk';

export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint is active. Please use POST for LINE events." });
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-line-signature') || '';

    await dbConnect();
    const settings = await Settings.findOne();
    const channelSecret = settings?.lineChannelSecret || process.env.LINE_CHANNEL_SECRET;
    const channelAccessToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelSecret || !channelAccessToken) {
      console.error("Webhook Error: Missing LINE Channel Secret or Access Token");
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    // 1. Verify Signature
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const events = JSON.parse(body).events;
    const client = new Client({ channelAccessToken });

    for (const event of events) {
      const userId = event.source.userId;
      if (!userId) continue;

      // 2. Upsert Customer Profile
      try {
        const profile = await client.getProfile(userId);
        await Customer.findOneAndUpdate(
          { userId },
          {
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            lastSeen: new Date()
          },
          { upsert: true }
        );
      } catch (profileErr) {
        console.error("Failed to fetch profile for user:", userId, profileErr);
        // Fallback: at least mark them as seen
        await Customer.findOneAndUpdate({ userId }, { lastSeen: new Date() }, { upsert: true });
      }

      // 3. Handle Message
      if (event.type === 'message' && event.message.type === 'text') {
        await Message.create({
          lineUserId: userId,
          text: event.message.text,
          sender: 'user'
        });
      }
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

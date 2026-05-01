import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Customer, Message, Settings, ProcessedEvent } from '@/models';
import { messagingApi } from '@line/bot-sdk';
import { enqueueCustomerUpdate } from '@/lib/customerQueue';

const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint is active. Please use POST for LINE events." });
}

export async function POST(req: Request) {
  // Fast-fail if no signature header — saves unnecessary body reads
  const signature = req.headers.get('x-line-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  // Consume body once — stream can only be read once in App Router
  const body = await req.text();

  if (!body) {
    return NextResponse.json({ message: 'Empty body' }, { status: 200 });
  }

  try {
    await dbConnect();
    const settings = await Settings.findOne();
    const channelSecret = settings?.lineChannelSecret || process.env.LINE_CHANNEL_SECRET;
    const channelAccessToken = settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelSecret || !channelAccessToken) {
      console.error("Webhook Error: Missing LINE Channel Secret or Access Token in DB and ENV.");
      return NextResponse.json({ message: 'OK' }, { status: 200 }); // Return 200 to prevent LINE from disabling webhook
    }

    // Verify signature — using raw string body with UTF-8 HMAC-SHA256 → Base64
    const expected = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');

    if (signature !== expected) {
      console.warn("Webhook Warning: Invalid signature.");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const events = parsedBody.events || [];

    // LINE verification ping — empty events, just acknowledge
    if (events.length === 0) {
      return NextResponse.json({ message: 'OK' });
    }

    const client = new messagingApi.MessagingApiClient({ channelAccessToken });

    for (const event of events) {
      const userId = event.source?.userId;

      // Skip dummy/verification user IDs
      if (!userId || userId === 'Udeadbeefdeadbeefdeadbeefdeadbeef') {
        continue;
      }

      // --- Idempotency Check (Optimization 3) ---
      // LINE delivers at-least-once. Skip events we've already processed.
      if (event.webhookEventId) {
        try {
          await ProcessedEvent.create({ webhookEventId: event.webhookEventId });
        } catch (e: any) {
          if (e.code === 11000) {
            // Duplicate key = already processed, skip silently
            continue;
          }
          // Other errors — log but continue processing
          console.error("ProcessedEvent check error:", e);
        }
      }

      // --- Profile Sync with 24h Cache (Optimization from Audit Q3) ---
      try {
        const existing = await Customer.findOne({ userId }).lean() as any;
        const isStale = !existing?.profileCachedAt ||
          (Date.now() - new Date(existing.profileCachedAt).getTime()) > PROFILE_CACHE_TTL_MS;

        if (isStale) {
          // Profile is stale — fetch from LINE and do a direct upsert
          const profile = await client.getProfile(userId);
          await Customer.findOneAndUpdate(
            { userId },
            {
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              lastSeen: new Date(),
              profileCachedAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } else {
          // Profile is fresh — batch the lastSeen update via the write queue
          enqueueCustomerUpdate({ userId, data: { lastSeen: new Date() } });
        }
      } catch (profileErr) {
        console.error("Profile sync failed for user:", userId, profileErr);
        // Fallback: queue a minimal upsert so the user at least appears
        enqueueCustomerUpdate({ userId, data: { lastSeen: new Date() } });
      }

      // --- Save Incoming Message ---
      if (event.type === 'message' && event.message?.type === 'text') {
        await Message.create({
          lineUserId: userId,
          text: event.message.text,
          sender: 'user'
        });
      }
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error("Webhook Critical Error:", error);
    // Always return 200 to LINE to prevent webhook suspension
    return NextResponse.json({ message: 'Error processed internally' }, { status: 200 });
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Customer, Message, Settings, ProcessedEvent, Order } from '@/models';
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

  // Consume raw body for signature precision
  const arrayBuffer = await req.arrayBuffer();
  const rawBody = Buffer.from(arrayBuffer);
  const body = rawBody.toString('utf8');

  if (rawBody.length === 0) {
    return NextResponse.json({ message: 'Empty body' }, { status: 200 });
  }

  try {
    await dbConnect();
    // Get the most recently updated settings
    const settings = await Settings.findOne({ liffId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
    
    const channelSecret = (settings?.lineChannelSecret || process.env.LINE_CHANNEL_SECRET || '').trim();
    const channelAccessToken = (settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();

    if (!channelSecret || !channelAccessToken) {
      console.error("Webhook Error: Missing credentials in DB/ENV.");
      return NextResponse.json({ message: 'Missing credentials' }, { status: 401 });
    }

    // Verify signature — using raw binary buffer for maximum precision
    const expected = crypto
      .createHmac('sha256', channelSecret)
      .update(rawBody)
      .digest('base64');

    if (signature !== expected) {
      console.warn(`[Webhook] Signature Mismatch!`);
      console.warn(`- Header: ${signature}`);
      console.warn(`- Expected: ${expected}`);
      console.warn(`- Secret Length: ${channelSecret.length} chars`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log(`[Webhook] Signature Verified Successfully!`);

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

      // --- Save Incoming Message & Handle Images ---
      if (event.type === 'message') {
        if (event.message?.type === 'text') {
          await Message.create({
            lineUserId: userId,
            text: event.message.text,
            sender: 'user'
          });
          
          await Customer.updateOne(
            { userId },
            { $inc: { unreadCount: 1 } }
          );
        } else if (event.message?.type === 'image') {
          await Message.create({
            lineUserId: userId,
            type: 'image',
            messageId: event.message.id,
            text: "📸 Image Uploaded",
            sender: 'user'
          });
          
          await Customer.updateOne(
            { userId },
            { $inc: { unreadCount: 1 } }
          );

          // Slip Verification Logic
          if (settings.slipokApiKey) {
            try {
              // 1. Download image from LINE
              const imgRes = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
                headers: { Authorization: `Bearer ${channelAccessToken}` }
              });
              
              if (imgRes.ok) {
                const arrayBuffer = await imgRes.arrayBuffer();
                const formData = new FormData();
                formData.append('files', new Blob([arrayBuffer], { type: 'image/jpeg' }), 'slip.jpg');
                formData.append('log', 'true');

                // 2. Send to SlipOK for verification
                const slipRes = await fetch('https://api.slipok.com/api/line/webhook', {
                  method: 'POST',
                  headers: { 'x-authorization': settings.slipokApiKey },
                  body: formData
                });

                if (slipRes.ok) {
                  const slipData = await slipRes.json();
                  if (slipData.success && slipData.data?.amount) {
                    const amountPaid = slipData.data.amount;
                    
                    // 3. Match with pending orders
                    const pendingOrders = await Order.find({ lineUserId: userId, status: 'pending' }).sort({ createdAt: 1 });
                    let remainingAmount = amountPaid;
                    const ordersToMarkPaid = [];

                    for (const order of pendingOrders) {
                      if (remainingAmount >= order.soldTHB && order.soldTHB > 0) {
                        remainingAmount -= order.soldTHB;
                        ordersToMarkPaid.push(order);
                      }
                    }

                    // 4. Mark Paid and Send Thank You
                    if (ordersToMarkPaid.length > 0) {
                      const orderIds = ordersToMarkPaid.map(o => o._id);
                      await Order.updateMany({ _id: { $in: orderIds } }, { $set: { status: 'paid' } });
                      
                      const combinedProducts = ordersToMarkPaid.map(o => o.product).join(', ');
                      const customer = await Customer.findOne({ userId }).lean() as any;
                      let messageText = settings.paymentTemplate || "✅ Payment received!\n\nItem: {product}\nAmount: ฿{amount}\n\nThank you! 🙏";
                      messageText = messageText
                        .replace(/{product}/g, combinedProducts)
                        .replace(/{amount}/g, amountPaid.toLocaleString())
                        .replace(/{name}/g, customer?.displayName || 'Customer');

                      await client.pushMessage({
                        to: userId,
                        messages: [{ type: 'text', text: messageText }]
                      });
                      
                      await Message.create({ 
                        lineUserId: userId, 
                        type: 'system',
                        text: '✅ ระบบยืนยันการชำระเงินอัตโนมัติ', 
                        metadata: { amount: amountPaid, products: combinedProducts },
                        sender: 'system' 
                      });
                    }
                  }
                }
              }
            } catch (err) {
              console.error("SlipOK Verification Error:", err);
            }
          }
        }
      }
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error("Webhook Critical Error:", error);
    // Always return 200 to LINE to prevent webhook suspension
    return NextResponse.json({ message: 'Error processed internally' }, { status: 200 });
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Customer, Message, Settings, ProcessedEvent, Order, Campaign, AutoReply } from '@/models';
import { messagingApi } from '@line/bot-sdk';
import { enqueueCustomerUpdate } from '@/lib/customerQueue';

export const runtime = 'nodejs';

const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active. Use POST for LINE events.' });
}

// Convert our stored message block to a valid LINE message object
function toLineMessage(block: any): any {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text ?? '' };
    case 'image':
      return { type: 'image', originalContentUrl: block.originalContentUrl, previewImageUrl: block.previewImageUrl || block.originalContentUrl };
    case 'video':
      return { type: 'video', originalContentUrl: block.originalContentUrl, previewImageUrl: block.previewImageUrl };
    case 'audio':
      return { type: 'audio', originalContentUrl: block.originalContentUrl, duration: block.duration ?? 60000 };
    case 'sticker':
      return { type: 'sticker', packageId: block.packageId, stickerId: block.stickerId };
    default:
      return { type: 'text', text: String(block.text ?? '') };
  }
}

// Find first matching auto-reply rule for incoming text
function findMatchingRule(text: string, rules: any[]): any | null {
  const normalized = text.trim().toLowerCase();
  // Non-default rules first (sorted by priority ascending)
  for (const rule of rules) {
    if (rule.matchType === 'default' || !rule.isActive) continue;
    const kw = (rule.keyword ?? '').trim().toLowerCase();
    if (rule.matchType === 'exact' && normalized === kw) return rule;
    if (rule.matchType === 'contains' && normalized.includes(kw)) return rule;
    if (rule.matchType === 'starts_with' && normalized.startsWith(kw)) return rule;
  }
  return rules.find(r => r.matchType === 'default' && r.isActive) ?? null;
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-line-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 401 });

  const arrayBuffer = await req.arrayBuffer();
  const rawBody = Buffer.from(arrayBuffer);
  if (rawBody.length === 0) return NextResponse.json({ message: 'Empty body' }, { status: 200 });

  try {
    await dbConnect();

    // Match signature to a merchant's LINE secret
    const allSettings = await Settings.find({ lineChannelSecret: { $exists: true, $ne: '' } });
    let matchedSettings: (typeof allSettings)[0] | null = null;

    for (const s of allSettings) {
      const secret = s.lineChannelSecret?.trim();
      if (!secret) continue;
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      if (signature === expected) { matchedSettings = s; break; }
    }

    if (!matchedSettings) {
      const envSecret = process.env.LINE_CHANNEL_SECRET?.trim();
      if (envSecret) {
        const expected = crypto.createHmac('sha256', envSecret).update(rawBody).digest('base64');
        if (signature !== expected) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      } else {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const merchantId = matchedSettings?.merchantId?.toString();
    const channelAccessToken = (matchedSettings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();

    let parsedBody: any;
    try { parsedBody = JSON.parse(rawBody.toString('utf8')); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const events = parsedBody.events || [];
    if (events.length === 0) return NextResponse.json({ message: 'OK' });

    const client = new messagingApi.MessagingApiClient({ channelAccessToken });

    // Pre-load auto-reply rules once per webhook payload (shared across events)
    const autoReplyRules = await AutoReply.find({ merchantId, isActive: true }).sort({ priority: 1 }).lean();

    for (const event of events) {
      const userId = event.source?.userId;
      if (!userId || userId === 'Udeadbeefdeadbeefdeadbeefdeadbeef') continue;

      // Skip events in standby mode (multi-channel setups)
      if (event.mode === 'standby') continue;

      // Idempotency
      if (event.webhookEventId) {
        try {
          await ProcessedEvent.create({ merchantId, webhookEventId: event.webhookEventId });
        } catch (e: any) {
          if (e.code === 11000) continue;
          console.error('[ProcessedEvent]', e);
        }
      }

      // ── Follow event ─────────────────────────────────────────────────────────
      if (event.type === 'follow') {
        try {
          const profile = await client.getProfile(userId);
          await Customer.findOneAndUpdate(
            { merchantId, userId },
            {
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              lastSeen: new Date(),
              profileCachedAt: new Date(),
              status: 'active',
              followedAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (err) {
          console.error('[follow profile]', userId, err);
        }

        // Send greeting if enabled, using reply token (free)
        if (matchedSettings?.greetingEnabled && matchedSettings?.greetingMessages?.length > 0 && event.replyToken) {
          try {
            const greetingMsgs = matchedSettings.greetingMessages.slice(0, 5).map(toLineMessage);
            await client.replyMessage({ replyToken: event.replyToken, messages: greetingMsgs });
          } catch (err) {
            console.error('[greeting reply]', err);
            // Fallback to push if reply token expired
            try {
              const greetingMsgs = matchedSettings.greetingMessages.slice(0, 5).map(toLineMessage);
              await client.pushMessage({ to: userId, messages: greetingMsgs });
            } catch { /* ignore */ }
          }
        }
        continue;
      }

      // ── Unfollow / block event ────────────────────────────────────────────────
      if (event.type === 'unfollow') {
        await Customer.updateOne({ merchantId, userId }, { $set: { status: 'blocked' } });
        continue;
      }

      // ── Profile sync for all remaining event types ────────────────────────────
      try {
        const existing = await Customer.findOne({ merchantId, userId }).lean() as any;
        const isStale = !existing?.profileCachedAt ||
          (Date.now() - new Date(existing.profileCachedAt).getTime()) > PROFILE_CACHE_TTL_MS;

        if (isStale) {
          const profile = await client.getProfile(userId);
          await Customer.findOneAndUpdate(
            { merchantId, userId },
            { displayName: profile.displayName, pictureUrl: profile.pictureUrl, lastSeen: new Date(), profileCachedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } else {
          enqueueCustomerUpdate({ userId, data: { lastSeen: new Date() } });
        }
      } catch (profileErr) {
        console.error('[Profile sync]', userId, profileErr);
        enqueueCustomerUpdate({ userId, data: { lastSeen: new Date() } });
      }

      // ── Postback event (rich menu button taps) ────────────────────────────────
      if (event.type === 'postback') {
        const postbackData = event.postback?.data ?? '';
        if (postbackData && event.replyToken) {
          const rule = findMatchingRule(postbackData, autoReplyRules);
          if (rule) {
            try {
              await AutoReply.updateOne({ _id: rule._id }, { $set: { lastTriggeredAt: new Date() } });
              await client.replyMessage({ replyToken: event.replyToken, messages: rule.messages.slice(0, 5).map(toLineMessage) });
            } catch (err) { console.error('[postback reply]', err); }
          }
        }
        continue;
      }

      // ── Message events ────────────────────────────────────────────────────────
      if (event.type === 'message') {
        // ── Text message ─────────────────────────────────────────────────────
        if (event.message?.type === 'text') {
          await Message.create({ merchantId, lineUserId: userId, text: event.message.text, sender: 'user' });
          await Customer.updateOne({ merchantId, userId }, { $inc: { unreadCount: 1 } });

          // Collect reply messages: auto-reply + campaign piggyback
          const replyMessages: any[] = [];

          const rule = findMatchingRule(event.message.text, autoReplyRules);
          if (rule) {
            await AutoReply.updateOne({ _id: rule._id }, { $set: { lastTriggeredAt: new Date() } });
            replyMessages.push(...rule.messages.slice(0, 5).map(toLineMessage));
          }

          // Piggyback queued campaign if user hasn't received it yet and there's reply space
          if (replyMessages.length < 5 && event.replyToken) {
            const campaign = await Campaign.findOne({
              merchantId,
              deliveryMode: 'queued',
              status: 'active',
              validUntil: { $gt: new Date() },
              deliveredTo: { $ne: userId },
            }).lean() as any;

            if (campaign) {
              const slots = 5 - replyMessages.length;
              const campaignMsgs = (campaign.messages as any[]).slice(0, slots).map(toLineMessage);
              replyMessages.push(...campaignMsgs);

              // Mark delivered
              const updated = await Campaign.findByIdAndUpdate(
                campaign._id,
                { $addToSet: { deliveredTo: userId } },
                { new: true }
              );
              if (updated && updated.deliveredTo.length >= updated.totalTargeted) {
                await Campaign.findByIdAndUpdate(campaign._id, { $set: { status: 'completed' } });
              }
            }
          }

          if (replyMessages.length > 0 && event.replyToken) {
            try {
              await client.replyMessage({ replyToken: event.replyToken, messages: replyMessages });
            } catch (err) { console.error('[text reply]', err); }
          }

        // ── Image message ─────────────────────────────────────────────────────
        } else if (event.message?.type === 'image') {
          await Message.create({ merchantId, lineUserId: userId, type: 'image', messageId: event.message.id, text: '📸 Image Uploaded', sender: 'user' });
          await Customer.updateOne({ merchantId, userId }, { $inc: { unreadCount: 1 } });

          // Piggyback campaign on image messages too (via reply)
          if (event.replyToken) {
            const campaign = await Campaign.findOne({
              merchantId,
              deliveryMode: 'queued',
              status: 'active',
              validUntil: { $gt: new Date() },
              deliveredTo: { $ne: userId },
            }).lean() as any;

            if (campaign) {
              try {
                const campaignMsgs = (campaign.messages as any[]).slice(0, 5).map(toLineMessage);
                await client.replyMessage({ replyToken: event.replyToken, messages: campaignMsgs });
                const updated = await Campaign.findByIdAndUpdate(
                  campaign._id,
                  { $addToSet: { deliveredTo: userId } },
                  { new: true }
                );
                if (updated && updated.deliveredTo.length >= updated.totalTargeted) {
                  await Campaign.findByIdAndUpdate(campaign._id, { $set: { status: 'completed' } });
                }
              } catch (err) { console.error('[image campaign reply]', err); }
            }
          }

          // SlipOK payment verification (uses push — independent of reply token)
          if (matchedSettings?.slipokApiKey) {
            try {
              const imgRes = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
                headers: { Authorization: `Bearer ${channelAccessToken}` }
              });

              if (imgRes.ok) {
                const formData = new FormData();
                formData.append('files', new Blob([await imgRes.arrayBuffer()], { type: 'image/jpeg' }), 'slip.jpg');
                formData.append('log', 'true');

                const slipRes = await fetch('https://api.slipok.com/api/line/webhook', {
                  method: 'POST',
                  headers: { 'x-authorization': matchedSettings.slipokApiKey },
                  body: formData
                });

                if (slipRes.ok) {
                  const slipData = await slipRes.json();
                  if (slipData.success && slipData.data?.amount) {
                    const amountPaid = slipData.data.amount;
                    const pendingOrders = await Order.find({ merchantId, lineUserId: userId, status: 'pending' }).sort({ createdAt: 1 });
                    let remaining = amountPaid;
                    const toMark: any[] = [];

                    for (const order of pendingOrders) {
                      if (remaining >= order.soldTHB && order.soldTHB > 0) {
                        remaining -= order.soldTHB;
                        toMark.push(order);
                      }
                    }

                    if (toMark.length > 0) {
                      await Order.updateMany({ _id: { $in: toMark.map((o: any) => o._id) } }, { $set: { status: 'paid' } });
                      const combinedProducts = toMark.map((o: any) => `${(o.quantity || 1) > 1 ? `${o.quantity}x ` : ''}${o.product?.replace(/^\d+x\s/, '')}`).join(', ');
                      const customer = await Customer.findOne({ merchantId, userId }).lean() as any;
                      let msg = matchedSettings.paymentTemplate || "✅ Payment received!\n\nItem: {product}\nAmount: ฿{amount}\n\nThank you! 🙏";
                      msg = msg.replace(/{product}/g, combinedProducts).replace(/{amount}/g, amountPaid.toLocaleString()).replace(/{name}/g, customer?.displayName || 'Customer');
                      await client.pushMessage({ to: userId, messages: [{ type: 'text', text: msg }] });
                      await Message.create({ merchantId, lineUserId: userId, type: 'system', text: '✅ ระบบยืนยันการชำระเงินอัตโนมัติ', metadata: { amount: amountPaid, products: combinedProducts }, sender: 'system' });
                    }
                  }
                }
              }
            } catch (err) {
              console.error('[SlipOK]', err);
            }
          }
        }
      }
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('[Webhook critical]', error);
    return NextResponse.json({ message: 'Error processed internally' }, { status: 200 });
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Customer, Message, Settings, ProcessedEvent, Order, Campaign, AutoReply, Merchant } from '@/models';
import { messagingApi } from '@line/bot-sdk';
import { enqueueCustomerUpdate } from '@/lib/customerQueue';
import { notifyMerchant } from '@/lib/notifyMerchant';
import { searchProducts } from '@/lib/intentSearch';

export const runtime = 'nodejs';

const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  return NextResponse.json({ message: 'Webhook endpoint is active. Use POST for LINE events.' });
}

function buildLineProductCarousel(products: any[], baseUrl: string, storePath: string): any {
  const bubbles = products.map((product: any) => {
    const productUrl = `${baseUrl}${storePath}?product=${product._id}`;
    const bubble: any = {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'sm',
        contents: [
          { type: 'text', text: product.name, weight: 'bold', size: 'sm', wrap: true, maxLines: 2 },
          ...(product.brand ? [{ type: 'text', text: product.brand, size: 'xs', color: '#888888' }] : []),
          { type: 'text', text: `฿${(product.price as number).toLocaleString()}`, weight: 'bold', color: '#00b900', size: 'md', margin: 'sm' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          { type: 'button', action: { type: 'uri', label: 'View Product', uri: productUrl }, style: 'primary', color: '#00b900', height: 'sm' },
        ],
      },
    };
    if (product.imageUrl) {
      bubble.hero = { type: 'image', url: product.imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover', action: { type: 'uri', uri: productUrl } };
    }
    return bubble;
  });

  return {
    type: 'flex',
    altText: `Found ${products.length} matching product${products.length > 1 ? 's' : ''} for you`,
    contents: { type: 'carousel', contents: bubbles },
  };
}

// Summarise a message block as plain text for chat log storage
function blockToLogText(block: any): string {
  switch (block.type) {
    case 'text':    return block.text ?? '';
    case 'image':   return '📷 Image';
    case 'video':   return '🎥 Video';
    case 'audio':   return '🔊 Audio';
    case 'sticker': return '🎭 Sticker';
    default:        return block.text ?? '[Message]';
  }
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

// Returns true if the shop is currently open based on businessHours config
function isShopOpen(businessHours: any, timezone: string): boolean {
  if (!businessHours?.enabled) return true;
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const now = new Date();
  const dayIndex = parseInt(now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short' }) === 'Sun' ? '0' :
    now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' }) === 'Monday' ? '1' :
    now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' }) === 'Tuesday' ? '2' :
    now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' }) === 'Wednesday' ? '3' :
    now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' }) === 'Thursday' ? '4' :
    now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' }) === 'Friday' ? '5' : '6');
  const dayKey = dayKeys[dayIndex] ?? 'mon';
  const dayConfig = businessHours[dayKey];
  if (!dayConfig?.enabled) return false;
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
  const [th, tm] = timeStr.split(':').map(Number);
  const [oh, om] = (dayConfig.open || '09:00').split(':').map(Number);
  const [ch, cm] = (dayConfig.close || '18:00').split(':').map(Number);
  const current = th * 60 + tm;
  return current >= oh * 60 + om && current < ch * 60 + cm;
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
      const sigBuf = Buffer.from(signature, 'base64');
      const expBuf = Buffer.from(expected, 'base64');
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) { matchedSettings = s; break; }
    }

    if (!matchedSettings) {
      const envSecret = process.env.LINE_CHANNEL_SECRET?.trim();
      if (envSecret) {
        const expected = crypto.createHmac('sha256', envSecret).update(rawBody).digest('base64');
        const sigBuf = Buffer.from(signature, 'base64');
        const expBuf = Buffer.from(expected, 'base64');
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
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
              platform: 'line',
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
          let greetingSent = false;
          try {
            const greetingMsgs = matchedSettings.greetingMessages.slice(0, 5).map(toLineMessage);
            await client.replyMessage({ replyToken: event.replyToken, messages: greetingMsgs });
            greetingSent = true;
          } catch (err) {
            console.error('[greeting reply]', err);
            // Fallback to push if reply token expired
            try {
              const greetingMsgs = matchedSettings.greetingMessages.slice(0, 5).map(toLineMessage);
              await client.pushMessage({ to: userId, messages: greetingMsgs });
              greetingSent = true;
            } catch { /* ignore */ }
          }
          if (greetingSent) {
            const logTexts = matchedSettings.greetingMessages.slice(0, 5).map(blockToLogText).filter(Boolean);
            if (logTexts.length > 0) {
              await Message.insertMany(logTexts.map((text: string) => ({ merchantId, userId, platform: 'line', type: 'system', text, sender: 'system' })));
            }
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
      let prevLastSeen: Date | null = null;
      try {
        const existing = await Customer.findOne({ merchantId, userId }).lean() as any;
        prevLastSeen = existing?.lastSeen ? new Date(existing.lastSeen) : null;
        const isStale = !existing?.profileCachedAt ||
          (Date.now() - new Date(existing.profileCachedAt).getTime()) > PROFILE_CACHE_TTL_MS;

        if (isStale) {
          const profile = await client.getProfile(userId);
          await Customer.findOneAndUpdate(
            { merchantId, userId },
            { platform: 'line', displayName: profile.displayName, pictureUrl: profile.pictureUrl, lastSeen: new Date(), profileCachedAt: new Date() },
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
              const logTexts = rule.messages.slice(0, 5).map(blockToLogText).filter(Boolean);
              if (logTexts.length > 0) {
                await Message.insertMany(logTexts.map((text: string) => ({ merchantId, userId, platform: 'line', type: 'system', text, sender: 'system' })));
              }
            } catch (err) { console.error('[postback reply]', err); }
          }
        }
        continue;
      }

      // ── Message events ────────────────────────────────────────────────────────
      if (event.type === 'message') {
        // ── Text message ─────────────────────────────────────────────────────
        if (event.message?.type === 'text') {
          await Message.create({ merchantId, userId, platform: 'line', text: event.message.text, sender: 'user' });
          await Customer.updateOne({ merchantId, userId }, { $inc: { unreadCount: 1 } });

          // Suppress auto-reply for order confirmations sent via LIFF checkout
          if (event.message.text.startsWith('📦') && event.message.text.includes('สั่งซื้อแล้ว')) {
            continue;
          }

          // Re-engagement message after 24h absence
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (
            prevLastSeen && prevLastSeen < twentyFourHoursAgo &&
            matchedSettings?.reEngageEnabled && matchedSettings?.reEngageMessages?.length > 0 &&
            event.replyToken
          ) {
            try {
              const reEngageMsgs = matchedSettings.reEngageMessages.slice(0, 5).map(toLineMessage);
              await client.replyMessage({ replyToken: event.replyToken, messages: reEngageMsgs });
              const logTexts = matchedSettings.reEngageMessages.slice(0, 5).map(blockToLogText).filter(Boolean);
              if (logTexts.length > 0) {
                await Message.insertMany(logTexts.map((text: string) => ({ merchantId, userId, platform: 'line', type: 'system', text, sender: 'system' })));
              }
            } catch (err) { console.error('[reEngage reply]', err); }
            continue;
          }

          // Business hours check — only affects LINE chat auto-replies, not storefront
          const shopTimezone = matchedSettings?.shopTimezone || 'Asia/Bangkok';
          if (!isShopOpen(matchedSettings?.businessHours, shopTimezone)) {
            const closedMsg = matchedSettings?.businessHours?.closedAutoReply;
            if (closedMsg && event.replyToken) {
              try {
                await client.replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: closedMsg }] });
                await Message.create({ merchantId, userId, platform: 'line', type: 'system', text: closedMsg, sender: 'system' });
              } catch (err) { console.error('[closed reply]', err); }
            }
            continue;
          }

          // Collect reply messages: auto-reply + campaign piggyback
          const replyMessages: any[] = [];

          const rule = findMatchingRule(event.message.text, autoReplyRules);
          if (rule) {
            await AutoReply.updateOne({ _id: rule._id }, { $set: { lastTriggeredAt: new Date() } });
            replyMessages.push(...rule.messages.slice(0, 5).map(toLineMessage));
          } else if (matchedSettings?.lineIntentSearch !== false) {
            const proto   = req.headers.get('x-forwarded-proto') || 'https';
            const host    = req.headers.get('host') || '';
            const baseUrl = `${proto}://${host}`;
            const mid     = matchedSettings!.merchantId.toString();
            const merchant = await Merchant.findById(mid).select('slug').lean() as any;
            const storePath = merchant?.slug ? `/shop/${merchant.slug}` : `/merchant/${mid}`;
            const matches = await searchProducts(mid, event.message.text);
            if (matches.length > 0) {
              replyMessages.push(buildLineProductCarousel(matches, baseUrl, storePath));
            }
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
              if (rule) {
                const logTexts = rule.messages.slice(0, 5).map(blockToLogText).filter(Boolean);
                if (logTexts.length > 0) {
                  await Message.insertMany(logTexts.map((text: string) => ({ merchantId, userId, platform: 'line', type: 'system', text, sender: 'system' })));
                }
              }
            } catch (err) { console.error('[text reply]', err); }
          }

        // ── Image message ─────────────────────────────────────────────────────
        } else if (event.message?.type === 'image') {
          await Message.create({ merchantId, userId, platform: 'line', type: 'image', messageId: event.message.id, text: '📸 Image Uploaded', sender: 'user' });
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
          if (matchedSettings?.useSlipok && matchedSettings?.slipokApiKey && matchedSettings?.slipokBranchId) {
            try {
              const imgRes = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
                headers: { Authorization: `Bearer ${channelAccessToken}` }
              });

              if (imgRes.ok) {
                const formData = new FormData();
                formData.append('files', new Blob([await imgRes.arrayBuffer()], { type: 'image/jpeg' }), 'slip.jpg');
                formData.append('log', 'true');

                const slipRes = await fetch(`https://api.slipok.com/api/line/apikey/${matchedSettings.slipokBranchId}`, {
                  method: 'POST',
                  headers: { 'x-authorization': matchedSettings.slipokApiKey },
                  body: formData
                });

                if (slipRes.ok) {
                  const slipData = await slipRes.json();
                  if (slipData.success && slipData.data?.amount) {
                    const amountPaid = slipData.data.amount;
                    const pendingOrders = await Order.find({ merchantId, userId, status: 'pending' }).sort({ createdAt: 1 });
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
                      // Type B: customer confirmation message
                      let msg = matchedSettings.paymentTemplate || "✅ Payment received!\n\nItem: {product}\nAmount: ฿{amount}\n\nThank you! 🙏";
                      msg = msg.replace(/{product}/g, combinedProducts).replace(/{amount}/g, amountPaid.toLocaleString()).replace(/{name}/g, customer?.displayName || 'Customer');
                      await client.pushMessage({ to: userId, messages: [{ type: 'text', text: msg }] });
                      await Message.create({ merchantId, userId, platform: 'line', type: 'system', text: msg, metadata: { amount: amountPaid, products: combinedProducts }, sender: 'system' });
                      // Type A: merchant alert
                      await notifyMerchant({ merchantId, type: 'slip_verified', message: `💰 Slip verified!\n\nCustomer: ${customer?.displayName || userId}\nAmount: ฿${amountPaid.toLocaleString()}\nItems: ${combinedProducts}`, metadata: { amount: amountPaid, userId }, settings: matchedSettings });
                    }
                  } else {
                    // Slip scan failed (invalid or unreadable slip) — Type A: merchant only, customer stays silent
                    const customer = await Customer.findOne({ merchantId, userId }).lean() as any;
                    await notifyMerchant({ merchantId, type: 'slip_failed', message: `⚠️ Slip scan failed\n\nCustomer: ${customer?.displayName || userId}\nThe image could not be verified. Please check manually.`, metadata: { userId }, settings: matchedSettings });
                  }
                } else {
                  // SlipOK API error — Type A: merchant only
                  const customer = await Customer.findOne({ merchantId, userId }).lean() as any;
                  await notifyMerchant({ merchantId, type: 'slip_failed', message: `⚠️ Slip verification error\n\nCustomer: ${customer?.displayName || userId}\nSlipOK API returned an error. Please verify payment manually.`, metadata: { userId }, settings: matchedSettings });
                }
              }
            } catch (err) {
              console.error('[SlipOK]', err);
              // Network/unexpected error — Type A: merchant only
              await notifyMerchant({ merchantId, type: 'slip_failed', message: `⚠️ Slip verification failed (network error)\n\nPlease verify payment manually.`, metadata: { userId }, settings: matchedSettings });
            }
          }

        // ── Sticker message ───────────────────────────────────────────────────
        } else if (event.message?.type === 'sticker') {
          await Message.create({ merchantId, userId, platform: 'line', type: 'sticker', text: '🎭 Sticker', sender: 'user' });
          await Customer.updateOne({ merchantId, userId }, { $inc: { unreadCount: 1 } });
        }
      }
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('[Webhook critical]', error);
    return NextResponse.json({ message: 'Error processed internally' }, { status: 200 });
  }
}

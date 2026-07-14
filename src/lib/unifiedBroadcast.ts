import { sendLineMessage, sendFlexMessage } from '@/lib/platforms/line';
import { sendTelegramMessage, sendTelegramPhotoWithKeyboard } from '@/lib/platforms/telegram';
import { sendInstagramMessage, sendInstagramProductCards, type InstagramProductCard } from '@/lib/platforms/instagram';

export type BroadcastPlatform = 'line' | 'telegram' | 'instagram';

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 100;

async function sendInBatches(userIds: string[], sendOne: (userId: string) => Promise<boolean>): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const outcomes = await Promise.all(batch.map(userId => sendOne(userId).catch(() => false)));
    for (const ok of outcomes) { if (ok) sent++; else failed++; }
    if (i + BATCH_SIZE < userIds.length) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }
  return { sent, failed };
}

export interface UnifiedMessage {
  type: 'text' | 'flex' | 'image';
  text: string; // Fallback text for all platforms
  lineFlexPayload?: any; // LINE Flex message JSON
  telegramPhoto?: { url: string; caption: string }; // Telegram photo + caption
  instagramCards?: InstagramProductCard[]; // Instagram generic template
}

export async function sendUnifiedBroadcast(
  platforms: BroadcastPlatform[],
  userIds: string[],
  token: string,
  message: UnifiedMessage,
): Promise<{ platform: BroadcastPlatform; sent: number; failed: number }[]> {
  const results: { platform: BroadcastPlatform; sent: number; failed: number }[] = [];

  for (const platform of platforms) {
    let sent = 0;
    let failed = 0;

    if (platform === 'line') {
      // LINE supports flex messages natively
      for (const userId of userIds) {
        try {
          const success = message.lineFlexPayload
            ? await sendFlexMessage(token, userId, message.text, message.lineFlexPayload)
            : await sendLineMessage(token, userId, message.text);
          if (success) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }
    } else if (platform === 'telegram') {
      // Telegram: send photo with caption if available, otherwise text
      ({ sent, failed } = await sendInBatches(userIds, (userId) =>
        message.telegramPhoto
          ? sendTelegramPhotoWithKeyboard(token, userId, message.telegramPhoto.url, message.telegramPhoto.caption, [])
          : sendTelegramMessage(token, userId, message.text)
      ));
    } else if (platform === 'instagram') {
      // Instagram: send product cards carousel or text fallback
      ({ sent, failed } = await sendInBatches(userIds, (userId) =>
        message.instagramCards && message.instagramCards.length > 0
          ? sendInstagramProductCards(token, userId, message.instagramCards)
          : sendInstagramMessage(token, userId, message.text)
      ));
    }

    results.push({ platform, sent, failed });
  }

  return results;
}

/**
 * Get platform capabilities for display (shows which platforms support which features)
 */
export function getPlatformCapabilities(platform: BroadcastPlatform) {
  const capabilities = {
    line: {
      text: true,
      image: true,
      video: true,
      sticker: true,
      flex: true,
      buttons: true,
      carousel: true,
      location: false,
    },
    telegram: {
      text: true,
      image: true,
      video: true,
      sticker: false,
      flex: false,
      buttons: true,
      carousel: false,
      location: true,
    },
    instagram: {
      text: true,
      image: true,
      video: false,
      sticker: false,
      flex: false,
      buttons: true,
      carousel: true,
      location: false,
    },
  };

  return capabilities[platform] || {};
}

/**
 * Platform-specific feature badges for UI
 */
export function getPlatformExclusiveFeatures(platform: BroadcastPlatform): string[] {
  const exclusive = {
    line: ['Video', 'Stickers', 'Flex Messages', 'Rich Menu'],
    telegram: ['Location Sharing'],
    instagram: [], // No exclusive features vs others
  };

  return exclusive[platform] || [];
}

/**
 * Platform-specific limitations for UI
 */
export function getPlatformLimitations(platform: BroadcastPlatform): string[] {
  const limitations = {
    line: [],
    telegram: ['No videos via broadcast', 'No stickers'],
    instagram: ['Text-only or product carousel'],
  };

  return limitations[platform] || [];
}

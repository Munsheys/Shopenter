import { sendLineFlexMessage, sendFlexMessage } from '@/lib/platforms/line';
import { sendTelegramMessage, sendTelegramPhotoWithKeyboard } from '@/lib/platforms/telegram';
import { sendInstagramMessage, sendInstagramProductCards } from '@/lib/platforms/instagram';

export type BroadcastPlatform = 'line' | 'telegram' | 'instagram';

export interface UnifiedMessage {
  type: 'text' | 'flex' | 'image';
  text: string; // Fallback text for all platforms
  lineFlexPayload?: any; // LINE Flex message JSON
  telegramPhoto?: { url: string; caption: string }; // Telegram photo + caption
  instagramCards?: Array<{ name: string; price: number; imageUrl?: string; url: string }>; // Instagram generic template
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
            ? await sendFlexMessage(token, userId, message.lineFlexPayload)
            : await sendLineFlexMessage(token, userId, message.text); // Fallback to text
          if (success) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }
    } else if (platform === 'telegram') {
      // Telegram: send photo with caption if available, otherwise text
      for (const userId of userIds) {
        try {
          const success = message.telegramPhoto
            ? await sendTelegramPhotoWithKeyboard(token, userId, message.telegramPhoto.url, message.telegramPhoto.caption, [])
            : await sendTelegramMessage(token, userId, message.text);
          if (success) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }
    } else if (platform === 'instagram') {
      // Instagram: send product cards carousel or text fallback
      for (const userId of userIds) {
        try {
          const success = message.instagramCards && message.instagramCards.length > 0
            ? await sendInstagramProductCards(token, userId, message.instagramCards)
            : await sendInstagramMessage(token, userId, message.text);
          if (success) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }
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

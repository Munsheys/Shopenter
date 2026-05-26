import type { PlatformAdapter } from './types';

// Telegram Bot API integration — not yet connected.
// Wire up by setting TELEGRAM_BOT_TOKEN in env and implementing sendMessage/sendRichMessage below.

export async function sendTelegramMessage(_token: string, _chatId: string, _text: string): Promise<boolean> {
  // TODO: POST https://api.telegram.org/bot{token}/sendMessage
  console.warn('[telegram] sendMessage not yet implemented');
  return false;
}

export const telegramAdapter: PlatformAdapter = {
  async sendMessage(token, userId, text) {
    return sendTelegramMessage(token, userId, text);
  },
  async sendRichMessage(_token, _userId, _altText, _content) {
    // TODO: Telegram inline keyboard / photo messages
    console.warn('[telegram] sendRichMessage not yet implemented');
    return false;
  },
};

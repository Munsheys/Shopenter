import type { PlatformAdapter } from './types';

const BASE = (token: string) => `https://api.telegram.org/bot${token}`;

export async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return res.ok;
  } catch { return false; }
}

export async function sendTelegramPhoto(token: string, chatId: string, photoUrl: string, caption: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE(token)}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' }),
    });
    return res.ok;
  } catch { return false; }
}

type TelegramButton =
  | { text: string; callback_data: string }
  | { text: string; url: string };

export async function sendTelegramPhotoWithKeyboard(
  token: string,
  chatId: string,
  photoUrl: string,
  caption: string,
  buttons: Array<Array<TelegramButton>>,
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE(token)}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    return res.ok;
  } catch { return false; }
}

export async function sendTelegramInlineKeyboard(token: string, chatId: string, text: string, buttons: Array<Array<TelegramButton>>): Promise<boolean> {
  try {
    const res = await fetch(`${BASE(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons },
      }),
    });
    return res.ok;
  } catch { return false; }
}

export async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string): Promise<void> {
  try {
    await fetch(`${BASE(token)}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch {}
}

export async function setTelegramWebhook(token: string, webhookUrl: string): Promise<{ ok: boolean; description?: string }> {
  try {
    const res = await fetch(`${BASE(token)}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] }),
    });
    return res.json();
  } catch { return { ok: false }; }
}

export const telegramAdapter: PlatformAdapter = {
  async sendMessage(token, userId, text) { return sendTelegramMessage(token, userId, text); },
  async sendRichMessage(token, userId, altText, _content) { return sendTelegramMessage(token, userId, altText); },
};

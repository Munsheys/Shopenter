import type { PlatformAdapter } from './types';

const GRAPH = 'https://graph.facebook.com/v19.0';

export async function sendInstagramMessage(
  pageAccessToken: string,
  recipientId: string,
  text: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${GRAPH}/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_type: 'RESPONSE',
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    return res.ok;
  } catch { return false; }
}

export type InstagramProductCard = {
  name: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  productUrl: string;
};

export async function sendInstagramProductCards(
  pageAccessToken: string,
  recipientId: string,
  cards: InstagramProductCard[],
): Promise<boolean> {
  const elements = cards.map(c => ({
    title: c.name,
    ...(c.imageUrl ? { image_url: c.imageUrl } : {}),
    subtitle: `${c.brand ? c.brand + ' · ' : ''}฿${c.price.toLocaleString()}`,
    buttons: [{ type: 'web_url', url: c.productUrl, title: 'View Product' }],
  }));

  try {
    const res = await fetch(`${GRAPH}/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_type: 'RESPONSE',
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: { template_type: 'generic', elements },
          },
        },
      }),
    });
    return res.ok;
  } catch { return false; }
}

export const instagramAdapter: PlatformAdapter = {
  async sendMessage(token, userId, text) { return sendInstagramMessage(token, userId, text); },
  async sendRichMessage(token, userId, altText, _content) { return sendInstagramMessage(token, userId, altText); },
};

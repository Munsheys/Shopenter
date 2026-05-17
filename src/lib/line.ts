export function interpolateTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

export async function sendLineMessage(token: string, userId: string, text: string): Promise<boolean> {
  if (!token || !userId || !text) return false;
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

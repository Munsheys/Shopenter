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

export async function sendFlexMessage(
  token: string,
  userId: string,
  altText: string,
  flexContent: object
): Promise<boolean> {
  if (!token || !userId) return false;
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'flex', altText, contents: flexContent }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const STATUS_COLORS: Record<string, string> = {
  paid:      '#6366f1',
  preparing: '#f59e0b',
  shipped:   '#3b82f6',
  delivered: '#00b900',
};

const STATUS_LABELS: Record<string, string> = {
  paid:      '✅ ชำระเงินแล้ว',
  preparing: '📦 กำลังเตรียมสินค้า',
  shipped:   '🚚 จัดส่งแล้ว',
  delivered: '🎉 ส่งถึงแล้ว',
};

export function buildOrderStatusFlex(
  status: string,
  data: {
    shopName: string;
    product: string;
    amount: number;
    tracking?: string;
    courier?: string;
    accentColor?: string;
  }
): object {
  const color = data.accentColor || STATUS_COLORS[status] || '#00b900';
  const label = STATUS_LABELS[status] || status;

  const bodyContents: object[] = [
    {
      type: 'text',
      text: data.product || 'สินค้า',
      wrap: true,
      size: 'sm',
      color: '#333333',
      margin: 'none',
    },
    {
      type: 'text',
      text: `฿${data.amount.toLocaleString()}`,
      size: 'xl',
      weight: 'bold',
      color,
      margin: 'sm',
    },
  ];

  if (data.tracking && data.courier) {
    bodyContents.push(
      {
        type: 'separator',
        margin: 'md',
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'md',
        contents: [
          { type: 'text', text: 'ขนส่ง', size: 'xs', color: '#888888', flex: 2 },
          { type: 'text', text: data.courier, size: 'xs', color: '#333333', align: 'end', flex: 3, weight: 'bold' },
        ],
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'xs',
        contents: [
          { type: 'text', text: 'เลขพัสดุ', size: 'xs', color: '#888888', flex: 2 },
          { type: 'text', text: data.tracking, size: 'xs', color: '#333333', align: 'end', flex: 3, weight: 'bold' },
        ],
      }
    );
  }

  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: color,
      paddingAll: 'md',
      contents: [
        { type: 'text', text: data.shopName, size: 'xs', color: '#ffffff99', weight: 'bold' },
        { type: 'text', text: label, size: 'lg', color: '#ffffff', weight: 'bold', margin: 'xs' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'lg',
      contents: bodyContents,
    },
  };
}

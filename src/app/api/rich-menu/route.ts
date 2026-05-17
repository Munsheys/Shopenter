import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';

export const runtime = 'nodejs';

// Preset layout generators — coordinates for standard LINE rich menu sizes (2500×1686)
function buildAreas(layout: '2col' | '3col' | '6grid', actions: { label: string; action: { type: string; uri?: string; text?: string } }[]) {
  const areas: any[] = [];
  const h = 1686;
  const w = 2500;

  if (layout === '2col') {
    [[0, 0, w / 2, h], [w / 2, 0, w / 2, h]].forEach(([x, y, bw, bh], i) => {
      if (actions[i]) areas.push({ bounds: { x, y, width: bw, height: bh }, action: actions[i].action });
    });
  } else if (layout === '3col') {
    const bw = Math.floor(w / 3);
    [0, 1, 2].forEach(i => {
      if (actions[i]) areas.push({ bounds: { x: i * bw, y: 0, width: bw, height: h }, action: actions[i].action });
    });
  } else if (layout === '6grid') {
    const bw = Math.floor(w / 3);
    const bh = Math.floor(h / 2);
    [0, 1, 2, 3, 4, 5].forEach(i => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      if (actions[i]) areas.push({ bounds: { x: col * bw, y: row * bh, width: bw, height: bh }, action: actions[i].action });
    });
  }
  return areas;
}

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });
  const token = settings?.lineChannelAccessToken?.trim();
  if (!token) return NextResponse.json({ error: 'LINE token not configured' }, { status: 400 });

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [listRes, defaultRes] = await Promise.all([
      fetch('https://api.line.me/v2/bot/richmenu/list', { headers }),
      fetch('https://api.line.me/v2/bot/richmenu/default', { headers }),
    ]);

    const list = listRes.ok ? await listRes.json() : { richmenus: [] };
    const defaultMenu = defaultRes.ok ? await defaultRes.json() : null;

    return NextResponse.json({ richmenus: list.richmenus ?? [], defaultRichMenuId: defaultMenu?.richMenuId ?? null });
  } catch (err) {
    console.error('[rich-menu GET]', err);
    return NextResponse.json({ error: 'Failed to fetch rich menus' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { layout, chatBarText = 'Menu', imageUrl, buttons = [], setAsDefault = true } = await req.json();

  if (!['2col', '3col', '6grid'].includes(layout)) {
    return NextResponse.json({ error: 'Layout must be 2col, 3col, or 6grid' }, { status: 400 });
  }
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });
  const token = settings?.lineChannelAccessToken?.trim();
  if (!token) return NextResponse.json({ error: 'LINE token not configured' }, { status: 400 });

  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    // 1. Create the rich menu layout
    const areas = buildAreas(layout as any, buttons);
    const menuPayload = {
      size: { width: 2500, height: layout === '6grid' ? 1686 : 843 },
      selected: true,
      name: `shopenter-${layout}-${Date.now()}`,
      chatBarText,
      areas,
    };

    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers,
      body: JSON.stringify(menuPayload),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('[rich-menu create]', err);
      return NextResponse.json({ error: 'Failed to create rich menu layout' }, { status: 500 });
    }

    const { richMenuId } = await createRes.json();

    // 2. Fetch the image and upload to LINE's CDN
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return NextResponse.json({ error: 'Could not fetch image from provided URL' }, { status: 400 });

    const imgBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
      body: imgBuffer,
    });

    if (!uploadRes.ok) {
      console.error('[rich-menu upload]', await uploadRes.text());
      // Don't fail hard — menu exists but without image
    }

    // 3. Set as default if requested
    if (setAsDefault) {
      await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    return NextResponse.json({ richMenuId, success: true });
  } catch (err) {
    console.error('[rich-menu POST]', err);
    return NextResponse.json({ error: 'Server error creating rich menu' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const richMenuId = searchParams.get('id');
  if (!richMenuId) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });
  const token = settings?.lineChannelAccessToken?.trim();
  if (!token) return NextResponse.json({ error: 'LINE token not configured' }, { status: 400 });

  try {
    // Unlink from all users first, then delete
    await fetch(`https://api.line.me/v2/bot/user/all/richmenu`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const deleteRes = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!deleteRes.ok) {
      return NextResponse.json({ error: 'Failed to delete rich menu' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[rich-menu DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

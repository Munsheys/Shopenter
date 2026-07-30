import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';

export const runtime = 'nodejs';

function buildAction(action: any) {
  const { type } = action;
  switch (type) {
    case 'message':       return { type: 'message', text: action.text ?? '' };
    case 'postback':      return { type: 'postback', data: action.data ?? '', displayText: action.displayText ?? undefined };
    case 'datetimepicker':return { type: 'datetimepicker', data: action.data ?? '', mode: action.mode ?? 'date' };
    case 'richmenuswitch':return { type: 'richmenuswitch', richMenuAliasId: action.richMenuAliasId ?? '', data: action.data ?? '' };
    case 'clipboard':     return { type: 'clipboard', clipboardText: action.clipboardText ?? '' };
    case 'location':      return { type: 'location' };
    case 'camera':        return { type: 'camera' };
    case 'cameraRoll':    return { type: 'cameraRoll' };
    default:              return { type: 'uri', uri: action.uri ?? '#' };
  }
}

function buildAreas(template: string, W: number, H: number, buttons: any[]) {
  const areas: any[] = [];
  const hw2 = Math.floor(W / 2);
  const tw  = Math.floor(W / 3);
  const hh  = Math.floor(H / 2);

  const push = (x: number, y: number, w: number, h: number, i: number) => {
    if (buttons[i]) areas.push({ bounds: { x, y, width: w, height: h }, action: buildAction(buttons[i].action) });
  };

  switch (template) {
    case '2col':
      push(0, 0, hw2, H, 0);
      push(hw2, 0, W - hw2, H, 1);
      break;
    case '3col':
      push(0, 0, tw, H, 0);
      push(tw, 0, tw, H, 1);
      push(tw * 2, 0, W - tw * 2, H, 2);
      break;
    case '6grid':
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const x = c * tw, y = r === 0 ? 0 : hh;
        const w = c === 2 ? W - tw * 2 : tw;
        const h = r === 0 ? hh : H - hh;
        push(x, y, w, h, r * 3 + c);
      }
      break;
    case '1big+2':
      push(0, 0, hw2, H, 0);
      push(hw2, 0, W - hw2, hh, 1);
      push(hw2, hh, W - hw2, H - hh, 2);
      break;
    case '2row':
      push(0, 0, W, hh, 0);
      push(0, hh, W, H - hh, 1);
      break;
    default:
      // fallback: equal columns
      const bw = Math.floor(W / Math.max(buttons.length, 1));
      buttons.forEach((_, i) => push(i * bw, 0, i === buttons.length - 1 ? W - i * bw : bw, H, i));
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

    return NextResponse.json({
      richmenus: list.richmenus ?? [],
      defaultRichMenuId: defaultMenu?.richMenuId ?? null,
      previousDefaultRichMenuId: settings?.previousDefaultRichMenuId || null,
    });
  } catch (err) {
    console.error('[rich-menu GET]', err);
    return NextResponse.json({ error: 'Failed to fetch rich menus' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    size = 'large',
    template = '3col',
    chatBarText = 'Menu',
    imageUrl,
    buttons = [],
    selected = false,
    setAsDefault = true,
  } = await req.json();

  if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });
  const token = settings?.lineChannelAccessToken?.trim();
  if (!token) return NextResponse.json({ error: 'LINE token not configured' }, { status: 400 });

  const authHeaders: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const W = 2500;
  const H = size === 'large' ? 1686 : 843;

  try {
    const areas = buildAreas(template, W, H, buttons);

    const menuPayload = {
      size: { width: W, height: H },
      selected,
      name: `shopenter-${template}-${Date.now()}`,
      chatBarText: chatBarText || 'Menu',
      areas,
    };

    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(menuPayload),
    });

    if (!createRes.ok) {
      console.error('[rich-menu create]', await createRes.text());
      return NextResponse.json({ error: 'Failed to create rich menu layout' }, { status: 500 });
    }

    const { richMenuId } = await createRes.json();

    // Fetch image and upload to LINE CDN
    const imgRes = await fetch(imageUrl);
    if (imgRes.ok) {
      const imgBuffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
        body: imgBuffer,
      });
      if (!uploadRes.ok) console.error('[rich-menu image upload]', await uploadRes.text());
    } else {
      console.error('[rich-menu image fetch] could not fetch:', imageUrl);
    }

    if (setAsDefault) {
      // Capture whatever is currently the default before we replace it, so the merchant can
      // restore it later — but only the first time, and only if it isn't already a menu
      // Shopenter itself created (i.e. don't clobber a real original with a Shopenter one on
      // a second switch).
      if (!settings?.previousDefaultRichMenuId) {
        try {
          const [defaultRes, listRes] = await Promise.all([
            fetch('https://api.line.me/v2/bot/richmenu/default', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('https://api.line.me/v2/bot/richmenu/list', { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          const currentDefault = defaultRes.ok ? await defaultRes.json() : null;
          const list = listRes.ok ? await listRes.json() : { richmenus: [] };
          const currentDefaultMenu = currentDefault?.richMenuId
            ? (list.richmenus ?? []).find((m: any) => m.richMenuId === currentDefault.richMenuId)
            : null;
          if (currentDefaultMenu && !currentDefaultMenu.name?.startsWith('shopenter-')) {
            await Settings.updateOne(
              { merchantId: merchant.merchantId },
              { $set: { previousDefaultRichMenuId: currentDefaultMenu.richMenuId } }
            );
          }
        } catch (err) {
          console.error('[rich-menu] failed to capture previous default', err);
        }
      }

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
    // Refuse to delete a menu Shopenter didn't create (e.g. one built directly in LINE's
    // own console) — those aren't ours to remove. Enforced server-side, not just hidden in
    // the UI, since this endpoint is reachable directly.
    const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', { headers: { Authorization: `Bearer ${token}` } });
    const list = listRes.ok ? await listRes.json() : { richmenus: [] };
    const target = (list.richmenus ?? []).find((m: any) => m.richMenuId === richMenuId);
    if (target && !target.name?.startsWith('shopenter-')) {
      return NextResponse.json({ error: 'This rich menu wasn\'t created by Shopenter — delete it from the LINE Official Account Manager instead.' }, { status: 403 });
    }

    // Only clears the all-users default link if we're actually deleting the current default —
    // deleting a non-default menu shouldn't blow away every customer's active menu.
    const defaultRes = await fetch('https://api.line.me/v2/bot/richmenu/default', { headers: { Authorization: `Bearer ${token}` } });
    const currentDefault = defaultRes.ok ? await defaultRes.json() : null;
    if (currentDefault?.richMenuId === richMenuId) {
      await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const deleteRes = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!deleteRes.ok) return NextResponse.json({ error: 'Failed to delete rich menu' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[rich-menu DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

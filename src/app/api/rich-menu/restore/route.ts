import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';

export const runtime = 'nodejs';

/**
 * Restores whatever rich menu was the channel default before Shopenter first applied its
 * own (captured in Settings.previousDefaultRichMenuId — see rich-menu POST). Never deletes
 * anything; just re-points LINE's all-users default back to it.
 */
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });
  const token = settings?.lineChannelAccessToken?.trim();
  if (!token) return NextResponse.json({ error: 'LINE token not configured' }, { status: 400 });

  const previousId = settings?.previousDefaultRichMenuId;
  if (!previousId) {
    return NextResponse.json({ error: 'No original rich menu was recorded — there is nothing to restore.' }, { status: 404 });
  }

  try {
    const res = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${previousId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[rich-menu restore]', text);
      return NextResponse.json({ error: 'LINE rejected the restore — the original menu may have been deleted on their side.' }, { status: 502 });
    }

    await Settings.updateOne({ merchantId: merchant.merchantId }, { $set: { previousDefaultRichMenuId: '' } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[rich-menu restore]', err);
    return NextResponse.json({ error: 'Server error restoring rich menu' }, { status: 500 });
  }
}

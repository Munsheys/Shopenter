import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings, Customer } from '@/models';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });
  const token = settings?.lineChannelAccessToken?.trim();
  if (!token) return NextResponse.json({ error: 'LINE token not configured' }, { status: 400 });

  const authHeader = { Authorization: `Bearer ${token}` };

  // Paginate through all follower IDs
  const allUserIds: string[] = [];
  let nextCursor: string | undefined;

  try {
    do {
      const url = `https://api.line.me/v2/bot/followers/ids${nextCursor ? `?start=${nextCursor}` : ''}`;
      const res = await fetch(url, { headers: authHeader });
      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 403) {
          return NextResponse.json({ error: 'Follower sync requires a Verified LINE OA account (Blue Shield or above).' }, { status: 403 });
        }
        return NextResponse.json({ error: `LINE API error: ${errText}` }, { status: 500 });
      }
      const data = await res.json();
      allUserIds.push(...(data.userIds ?? []));
      nextCursor = data.next;
    } while (nextCursor);
  } catch (err) {
    console.error('[sync/followers paginate]', err);
    return NextResponse.json({ error: 'Failed to fetch follower list' }, { status: 500 });
  }

  if (allUserIds.length === 0) {
    return NextResponse.json({ total: 0, synced: 0 });
  }

  // Batch profile fetches — 50 at a time with 500ms delay to respect rate limits
  let synced = 0;
  const BATCH = 50;

  for (let i = 0; i < allUserIds.length; i += BATCH) {
    const batch = allUserIds.slice(i, i + BATCH);

    await Promise.allSettled(batch.map(async (userId) => {
      try {
        const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, { headers: authHeader });
        const profile = profileRes.ok ? await profileRes.json() : {};

        await Customer.findOneAndUpdate(
          { merchantId: merchant.merchantId, userId },
          {
            ...(profile.displayName ? { displayName: profile.displayName } : {}),
            ...(profile.pictureUrl ? { pictureUrl: profile.pictureUrl } : {}),
            profileCachedAt: new Date(),
            status: 'active',
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        synced++;
      } catch { /* skip individual failures */ }
    }));

    if (i + BATCH < allUserIds.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return NextResponse.json({ total: allUserIds.length, synced });
}

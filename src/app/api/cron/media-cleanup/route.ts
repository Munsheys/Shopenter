import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, MediaFile, Product, Settings, AutoReply, Campaign } from '@/models';
import { deleteFromR2 } from '@/lib/r2';

export const runtime = 'nodejs';

const INACTIVITY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Only deletes media that's both (a) not referenced by anything currently in use, and
 * (b) belongs to a merchant who's been inactive 30+ days — an actively-used account never
 * has its media touched here, even if a given upload isn't attached to a product yet (they
 * might be mid-edit). This is separate from the full account purge (90-day inactivity +
 * 30-day grace, src/app/api/cron/inactivity-check), which is a much longer timeline and
 * deletes everything, not just unused media.
 */
function extractMediaId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /\/api\/media\/([a-f0-9]{24})/.exec(url);
  return match ? match[1] : null;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();
    const inactivityCutoff = new Date(now.getTime() - INACTIVITY_DAYS * DAY_MS);

    const inactiveMerchants = await Merchant.find({
      $or: [
        { lastLoginAt: { $lte: inactivityCutoff } },
        { lastLoginAt: null, createdAt: { $lte: inactivityCutoff } },
      ],
    }).select('_id').lean();

    let deleted = 0;
    let checked = 0;

    for (const { _id: merchantId } of inactiveMerchants) {
      const inUse = new Set<string>();

      const [products, settings, autoReplies, campaigns] = await Promise.all([
        Product.find({ merchantId }).select('imageUrl images variants').lean(),
        Settings.findOne({ merchantId }).select('storefront.logoUrl storefront.bannerUrl shopLogoUrl').lean(),
        AutoReply.find({ merchantId }).select('messages').lean(),
        Campaign.find({ merchantId }).select('messages').lean(),
      ]);

      for (const p of products as any[]) {
        [p.imageUrl, ...(p.images ?? []), ...(p.variants ?? []).map((v: any) => v.imageUrl)]
          .forEach(u => { const id = extractMediaId(u); if (id) inUse.add(id); });
      }
      if (settings) {
        [settings.storefront?.logoUrl, settings.storefront?.bannerUrl, (settings as any).shopLogoUrl]
          .forEach(u => { const id = extractMediaId(u); if (id) inUse.add(id); });
      }
      for (const doc of [...autoReplies, ...campaigns] as any[]) {
        for (const block of doc.messages ?? []) {
          [block.originalContentUrl, block.previewImageUrl].forEach(u => { const id = extractMediaId(u); if (id) inUse.add(id); });
        }
      }

      const merchantMedia = await MediaFile.find({ merchantId }).select('r2Key').lean();
      for (const media of merchantMedia as any[]) {
        checked++;
        if (inUse.has(media._id.toString())) continue;

        if (media.r2Key) {
          try { await deleteFromR2(media.r2Key); } catch (e) { console.error(`[media-cleanup] R2 delete failed for ${media.r2Key}`, e); }
        }
        await MediaFile.deleteOne({ _id: media._id });
        deleted++;
      }
    }

    return NextResponse.json({
      message: 'Media cleanup cron completed',
      inactiveMerchantsChecked: inactiveMerchants.length,
      mediaChecked: checked,
      mediaDeleted: deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[media-cleanup cron]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

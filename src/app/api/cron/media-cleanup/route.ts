import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, MediaFile, Product, Settings, AutoReply, Campaign } from '@/models';
import { deleteFromR2 } from '@/lib/r2';
import { INACTIVITY_THRESHOLD_DAYS } from '@/lib/inactivity';

export const runtime = 'nodejs';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Only deletes media that's both (a) not referenced by anything currently in use, and
 * (b) belongs to a Free-tier merchant who's been inactive 3+ months — the exact same
 * population and threshold as the full account-inactivity policy (src/app/api/cron/
 * inactivity-check, src/lib/inactivity.ts). Paying tiers are never touched here, same
 * exemption inactivity-check gives them. This deliberately does NOT send its own warning
 * message: these merchants already get inactivity-check's staged LINE warnings ("your
 * account and data will be cleaned up in X days"), which already covers media as part of
 * "data" — a second, separate warning here would be redundant. An actively-used account
 * never has its media touched, even if a given upload isn't attached to a product yet
 * (they might be mid-edit) — only unreferenced files are ever at risk.
 */
// A media file can be referenced two ways depending on how it's served:
//   • proxied  →  /api/media/<mongoId>?t=<token>   (default, no R2_PUBLIC_BASE_URL)
//   • direct   →  <R2_PUBLIC_BASE_URL>/<r2Key>      (when direct serving is configured)
// So we can't just pull an id out of the URL — a direct URL has no /api/media/<id> in it.
// Instead we gather every referenced URL as a raw string and, per media doc, treat it as
// in-use if any referenced URL contains that doc's mongoId OR its r2Key. This is
// deletion-critical: missing a match would delete a still-referenced image.
function collectUrls(...urls: (string | null | undefined)[]): string[] {
  return urls.filter((u): u is string => typeof u === 'string' && u.length > 0);
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();
    const inactivityCutoff = new Date(now.getTime() - INACTIVITY_THRESHOLD_DAYS * DAY_MS);

    const inactiveMerchants = await Merchant.find({
      tier: 'free',
      $or: [
        { lastLoginAt: { $lte: inactivityCutoff } },
        { lastLoginAt: null, createdAt: { $lte: inactivityCutoff } },
      ],
    }).select('_id').lean();

    let deleted = 0;
    let checked = 0;

    for (const { _id: merchantId } of inactiveMerchants) {
      const referencedUrls: string[] = [];

      const [products, settings, autoReplies, campaigns] = await Promise.all([
        Product.find({ merchantId }).select('imageUrl images variants').lean(),
        Settings.findOne({ merchantId }).select('storefront.logoUrl storefront.bannerUrl shopLogoUrl').lean(),
        AutoReply.find({ merchantId }).select('messages').lean(),
        Campaign.find({ merchantId }).select('messages').lean(),
      ]);

      for (const p of products as any[]) {
        referencedUrls.push(...collectUrls(p.imageUrl, ...(p.images ?? []), ...(p.variants ?? []).map((v: any) => v.imageUrl)));
      }
      if (settings) {
        referencedUrls.push(...collectUrls(settings.storefront?.logoUrl, settings.storefront?.bannerUrl, (settings as any).shopLogoUrl));
      }
      for (const doc of [...autoReplies, ...campaigns] as any[]) {
        for (const block of doc.messages ?? []) {
          referencedUrls.push(...collectUrls(block.originalContentUrl, block.previewImageUrl));
        }
      }

      const referencedBlob = referencedUrls.join('\n');
      const merchantMedia = await MediaFile.find({ merchantId }).select('r2Key').lean();
      for (const media of merchantMedia as any[]) {
        checked++;
        const id = media._id.toString();
        // In use if any referenced URL mentions this doc's id (proxied URL) or r2Key (direct URL).
        const inUse = referencedBlob.includes(id) || (media.r2Key && referencedBlob.includes(media.r2Key));
        if (inUse) continue;

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

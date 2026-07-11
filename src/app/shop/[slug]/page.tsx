import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dbConnect from '@/lib/db';
import { Merchant, Settings } from '@/models';
import StorefrontView from '@/components/StorefrontView';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shopenter.app';

// Shared by generateMetadata and the page itself so the slug->merchant->settings lookup only
// runs once per request. React's cache() dedupes calls with the same arguments within a
// single render pass — DB calls aren't auto-memoized here the way fetch() is (per Next's own
// generateMetadata docs), so without this the same query would run twice.
const getShopBySlug = cache(async (slug: string) => {
  await dbConnect();
  const merchant = await Merchant.findOne({ slug: slug.toLowerCase() }).select('_id').lean() as any;
  if (!merchant) return null;
  const settings = await Settings.findOne({ merchantId: merchant._id })
    .select('shopName shopDescription shopLogoUrl')
    .lean() as any;
  return { merchantId: merchant._id.toString(), settings };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) return {};

  const shopName = shop.settings?.shopName && shop.settings.shopName !== 'My Shop' ? shop.settings.shopName : 'Shop on Shopenter';
  const description = shop.settings?.shopDescription || 'Browse products and order directly through LINE.';
  const image = shop.settings?.shopLogoUrl || `${siteUrl}/opengraph-image`;
  const url = `${siteUrl}/shop/${slug}`;

  return {
    title: shopName,
    description,
    openGraph: {
      title: shopName,
      description,
      url,
      siteName: shopName,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: shopName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: shopName,
      description,
      images: [image],
    },
  };
}

export default async function ShopBySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  return <StorefrontView merchantId={shop.merchantId} />;
}

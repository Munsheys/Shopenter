import type { MetadataRoute } from 'next';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shopenter.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${siteUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  try {
    await dbConnect();
    const merchants = await Merchant.find({}, 'merchantId createdAt').lean() as any[];
    const merchantRoutes: MetadataRoute.Sitemap = merchants.map((m: any) => ({
      url: `${siteUrl}/merchant/${m._id}`,
      lastModified: m.createdAt ? new Date(m.createdAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...merchantRoutes];
  } catch {
    return staticRoutes;
  }
}

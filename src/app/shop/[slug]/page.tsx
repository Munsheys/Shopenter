import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import StorefrontView from '@/components/StorefrontView';

export default async function ShopBySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await dbConnect();
  const merchant = await Merchant.findOne({ slug: slug.toLowerCase() }).select('_id').lean() as any;
  if (!merchant) notFound();
  return <StorefrontView merchantId={merchant._id.toString()} />;
}

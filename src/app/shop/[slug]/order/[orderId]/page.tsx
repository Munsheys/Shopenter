import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import { Merchant, Settings } from '@/models';
import OrderStatusView from '@/components/OrderStatusView';

export default async function OrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; orderId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug, orderId } = await params;
  const { t } = await searchParams;

  await dbConnect();
  const merchant = await Merchant.findOne({ slug: slug.toLowerCase() }).select('_id').lean() as any;
  if (!merchant) notFound();

  const settings = await Settings.findOne({ merchantId: merchant._id })
    .select('shopName shopLogoUrl storefront')
    .lean() as any;

  return (
    <OrderStatusView
      merchantId={merchant._id.toString()}
      orderId={orderId}
      token={t || ''}
      shopName={settings?.shopName || 'Shop'}
      shopLogoUrl={settings?.shopLogoUrl || ''}
      storefront={settings?.storefront || {}}
    />
  );
}

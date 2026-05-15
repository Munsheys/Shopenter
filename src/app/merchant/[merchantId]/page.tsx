import { use } from 'react';
import StorefrontView from '@/components/StorefrontView';

export default function MerchantStorefrontPage({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = use(params);
  return <StorefrontView merchantId={merchantId} />;
}

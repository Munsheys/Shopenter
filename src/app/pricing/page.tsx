import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { PUBLIC_CONTACT_TEXT } from '@/lib/contact';

export const metadata = {
  title: 'Pricing - Shopenter',
  description: 'Simple, transparent pricing for Shopenter LINE OA merchants.',
};

const TIERS = [
  {
    name: 'Free',
    price: '0',
    desc: 'Perfect for getting started',
    features: ['10 products', '100 orders/month', '3 auto-replies', 'Basic analytics', 'LINE messaging'],
  },
  {
    name: 'Pro',
    price: '299',
    desc: 'For growing stores',
    features: ['500 products', '10,000 orders/month', '100 auto-replies', 'Discount codes', 'Loyalty program', 'Affiliate program'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For large operations',
    features: ['Unlimited products', 'Unlimited orders', 'Unlimited auto-replies', 'All Pro features', 'Dedicated support', 'Custom integrations'],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Shopenter</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link href="/signup" className="bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Start free. Upgrade when you scale, billed monthly by card via our payment processor, Omise. Cancel anytime — no refund for the partial month, but you keep access through the period you already paid for.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div key={tier.name} className={`rounded-2xl p-8 border transition-all ${tier.highlighted ? 'border-green-500 bg-green-500/5 ring-2 ring-green-500/20' : 'border-white/10 bg-white/3'}`}>
                <h3 className="text-xl font-semibold text-white mb-2">{tier.name}</h3>
                <p className="text-gray-400 text-sm mb-6">{tier.desc}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">{tier.price === 'Custom' ? 'Custom' : `฿${tier.price}`}</span>
                  {tier.price !== 'Custom' && <span className="text-gray-400 text-sm">/month</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {tier.name === 'Enterprise' ? (
                  <span className="block text-center py-3 rounded-xl font-semibold border border-white/10 text-gray-400 text-xs">
                    Reach us via {PUBLIC_CONTACT_TEXT}
                  </span>
                ) : (
                  <Link href="/signup" className={`block text-center py-3 rounded-xl font-semibold transition-colors ${tier.highlighted ? 'bg-green-500 hover:bg-green-400 text-white' : 'border border-white/20 text-white hover:bg-white/5'}`}>
                    Get started
                  </Link>
                )}
              </div>
            ))}
          </div>

          <p className="text-gray-500 text-xs text-center mt-10">
            All prices in Thai Baht. See our <Link href="/legal/terms" className="text-green-400 hover:underline">Terms of Service</Link> and{' '}
            <Link href="/legal/merchant-agreement" className="text-green-400 hover:underline">Merchant Agreement</Link> for full billing details.
          </p>
        </div>
      </section>
    </div>
  );
}

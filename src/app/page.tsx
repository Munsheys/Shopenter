'use client';

import Link from 'next/link';
import { MessageCircle, Package, BarChart3, Users, ArrowRight, Zap } from 'lucide-react';
import { PUBLIC_CONTACT_TEXT } from '@/lib/contact';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Shopenter</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
            Pricing
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
            Sign in
          </Link>
          <Link href="/signup" className="bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-green-500/20">
          <Zap size={12} />
          Multi-tenant LINE OA Commerce
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight mb-6 max-w-3xl">
          Sell on LINE OA.<br />
          <span className="text-green-400">Manage everything</span> in one place.
        </h1>

        <p className="text-gray-400 text-lg max-w-xl mb-10 leading-relaxed">
          Shopenter gives LINE OA merchants a complete dashboard — orders, products, customers, payments, and automated messaging. One platform, your own store.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href="/signup" className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
            Create your store <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
            Sign in to dashboard
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-white/5 px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { icon: <Package size={20} />, label: 'Product management', desc: 'Variants, pricing, stock' },
            { icon: <MessageCircle size={20} />, label: 'LINE messaging', desc: 'Chat with customers' },
            { icon: <BarChart3 size={20} />, label: 'Analytics', desc: 'Revenue & profit reports' },
            { icon: <Users size={20} />, label: 'Customer CRM', desc: 'Order history & profiles' },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-3 p-4 rounded-2xl bg-white/3 border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <p className="font-semibold text-sm text-white">{f.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-white/5 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">Start free. Upgrade when you scale. No hidden fees.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: 'Free',
                price: '0',
                desc: 'Perfect for getting started',
                features: ['10 products', '100 orders/month', '2 campaigns', 'Basic analytics', 'LINE messaging']
              },
              {
                name: 'Pro',
                price: '299',
                desc: 'For growing stores',
                features: ['500 products', '10,000 orders/month', '50 campaigns', 'Discount codes', 'Loyalty program'],
                highlighted: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                desc: 'For large operations',
                features: ['Unlimited products', 'Unlimited orders', 'Unlimited campaigns', 'All Pro features', 'Dedicated support', 'Custom integrations']
              }
            ].map(tier => (
              <div key={tier.name} className={`rounded-2xl p-8 border transition-all ${tier.highlighted ? 'border-green-500 bg-green-500/5 ring-2 ring-green-500/20' : 'border-white/10 bg-white/3'}`}>
                <h3 className="text-xl font-semibold text-white mb-2">{tier.name}</h3>
                <p className="text-gray-400 text-sm mb-6">{tier.desc}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">{tier.price === 'Custom' ? 'Custom' : `฿${tier.price}`}</span>
                  {tier.price !== 'Custom' && <span className="text-gray-400 text-sm">/month</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map(f => (
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
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-6 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} Shopenter. Built for LINE OA merchants.
      </footer>
    </div>
  );
}

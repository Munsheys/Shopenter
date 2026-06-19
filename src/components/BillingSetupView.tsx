'use client';

import React, { useState } from 'react';
import { CreditCard, Check, AlertCircle, Loader, Zap, Package, Users, TrendingUp, ArrowRight, ChevronDown } from 'lucide-react';

interface BillingSetupProps {
  theme: 'light' | 'dark';
  tier: string;
  onTierChange?: (tier: string) => void;
}

export default function BillingSetupView({ theme, tier = 'free', onTierChange }: BillingSetupProps) {
  const isDark = theme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState(tier);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'promptpay'>('card');
  const [showComparison, setShowComparison] = useState(false);

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      billingPeriod: '/month',
      description: 'Perfect for testing & getting started',
      badge: 'STARTER',
      badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      features: [
        { icon: <Package size={16} />, label: '10 products', highlight: false },
        { icon: <TrendingUp size={16} />, label: '100 orders/month', highlight: false },
        { icon: <Zap size={16} />, label: '2 campaigns', highlight: false },
        { icon: <Users size={16} />, label: 'Basic analytics', highlight: false },
        { icon: <Package size={16} />, label: 'LINE messaging', highlight: false },
      ],
      limits: { products: 10, ordersPerMonth: 100, campaigns: 2 },
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 299,
      billingPeriod: '/month',
      description: 'For growing businesses',
      badge: 'RECOMMENDED',
      badgeColor: 'bg-accent/20 text-accent border-accent/40',
      features: [
        { icon: <Package size={16} />, label: '500 products', highlight: true },
        { icon: <TrendingUp size={16} />, label: '10,000 orders/month', highlight: true },
        { icon: <Zap size={16} />, label: '50 campaigns', highlight: true },
        { icon: <Users size={16} />, label: 'Discount codes', highlight: true },
        { icon: <Package size={16} />, label: 'Loyalty program', highlight: true },
        { icon: <Package size={16} />, label: 'CSV export', highlight: true },
        { icon: <Users size={16} />, label: 'Priority support', highlight: true },
      ],
      limits: { products: 500, ordersPerMonth: 10000, campaigns: 50 },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      billingPeriod: '',
      description: 'For large-scale operations',
      badge: 'UNLIMITED',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      features: [
        { icon: <Package size={16} />, label: 'Unlimited products', highlight: true },
        { icon: <TrendingUp size={16} />, label: 'Unlimited orders', highlight: true },
        { icon: <Zap size={16} />, label: 'Unlimited campaigns', highlight: true },
        { icon: <Users size={16} />, label: 'All Pro features', highlight: true },
        { icon: <Package size={16} />, label: 'Dedicated support', highlight: true },
        { icon: <Package size={16} />, label: 'Custom integrations', highlight: true },
      ],
      limits: null,
    },
  ];

  const handleUpgrade = async () => {
    if (selectedTier === 'free') {
      onTierChange?.(selectedTier);
      return;
    }

    if (selectedTier === 'enterprise') {
      alert('Please contact sales@shopenter.com for Enterprise pricing');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, paymentMethod }),
      });

      if (!res.ok) throw new Error('Failed to initiate payment');
      const { paymentUrl } = await res.json();
      if (paymentUrl) window.location.href = paymentUrl;
      else onTierChange?.(selectedTier);
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade tier');
    } finally {
      setIsLoading(false);
    }
  };

  const currentTierObj = tiers.find(t => t.id === tier);
  const selectedTierObj = tiers.find(t => t.id === selectedTier);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0d14]' : 'bg-gradient-to-br from-white to-slate-50'}`}>
      {/* Hero Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-accent via-[#009900] to-[#005500] pt-16 pb-24 px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full blur-3xl -ml-16 -mb-16" aria-hidden="true" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">Subscription & Billing</h1>
              <p className="text-white/80 text-lg max-w-2xl">Choose the perfect plan for your business. Scale up as you grow.</p>
            </div>
            <div className="hidden sm:block text-white/20">
              <CreditCard size={64} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Error Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 animate-slide-up ${
            isDark
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Current Plan Summary */}
        <div className={`mb-12 rounded-3xl border overflow-hidden ${
          isDark
            ? 'bg-[#161925] border-[#1f2335]'
            : 'bg-white border-slate-200 shadow-lg'
        }`}>
          <div className="p-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className={`text-sm font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>
                Current Plan
              </p>
              <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentTierObj?.name}
              </h2>
              <p className={`text-sm ${isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`}>
                {currentTierObj?.description}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
                tier === 'free'
                  ? 'bg-slate-500/20 text-slate-300'
                  : tier === 'pro'
                  ? 'bg-accent/20 text-accent'
                  : 'bg-amber-500/20 text-amber-300'
              }`}>
                {tier === 'free' ? '✓ Active' : tier === 'pro' ? '✓ Active' : '✓ Custom'}
              </div>
            </div>
          </div>
        </div>

        {/* Tier Selection Cards */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Choose Your Plan
            </h2>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isDark
                  ? 'bg-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#292d45]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Compare Plans
              <ChevronDown size={16} className={`transition-transform ${showComparison ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {tiers.map((t) => {
              const isSelected = selectedTier === t.id;
              const isCurrent = tier === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTier(t.id)}
                  className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 cursor-pointer ${
                    isSelected || isCurrent
                      ? `${isDark ? 'bg-[#1a1d2e] border-accent shadow-2xl shadow-accent/30' : 'bg-white border-accent shadow-2xl shadow-accent/20'} ring-2 ring-accent/40`
                      : `${isDark ? 'bg-[#161925] border-[#1f2335] hover:border-[#2a2f45] hover:shadow-lg' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg'}`
                  }`}
                >
                  {/* Badge */}
                  <div className={`absolute top-0 right-0 px-4 py-2 text-[10px] font-black uppercase border-l border-b rounded-bl-2xl ${t.badgeColor} ${isDark ? 'bg-[#0a0d14]/80' : 'bg-white/80'}`}>
                    {t.badge}
                  </div>

                  {/* Content */}
                  <div className="p-8">
                    {/* Selected Checkmark */}
                    {(isSelected || isCurrent) && (
                      <div className="absolute top-4 left-4 w-8 h-8 bg-accent rounded-full flex items-center justify-center animate-fade-in-scale">
                        <Check size={18} className="text-white" strokeWidth={3} />
                      </div>
                    )}

                    {/* Title & Price */}
                    <h3 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {t.name}
                    </h3>
                    <p className={`text-sm mb-6 ${isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`}>
                      {t.description}
                    </p>

                    {/* Price */}
                    <div className="mb-8">
                      {t.price !== null ? (
                        <div>
                          <span className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ฿{t.price.toLocaleString()}
                          </span>
                          <span className={`text-sm ml-2 ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>
                            {t.billingPeriod}
                          </span>
                        </div>
                      ) : (
                        <div className={`text-lg font-bold ${isDark ? 'text-accent' : 'text-accent'}`}>
                          Custom pricing
                        </div>
                      )}
                    </div>

                    {/* Current Plan Badge */}
                    {isCurrent && (
                      <div className={`mb-6 px-3 py-2 rounded-lg text-[11px] font-bold text-center ${
                        isDark
                          ? 'bg-accent/20 text-accent border border-accent/30'
                          : 'bg-accent/10 text-accent border border-accent/20'
                      }`}>
                        YOUR CURRENT PLAN
                      </div>
                    )}

                    {/* Features */}
                    <div className="space-y-3 pt-6 border-t border-white/10">
                      {t.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            f.highlight && isSelected
                              ? 'bg-accent/30 text-accent'
                              : f.highlight
                              ? isDark ? 'bg-accent/10 text-[#8b92ad]' : 'bg-accent/5 text-slate-500'
                              : isDark ? 'bg-[#1f2335] text-[#8b92ad]' : 'bg-slate-200 text-slate-500'
                          }`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`}>
                              {f.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          {showComparison && (
            <div className={`rounded-2xl border overflow-hidden animate-slide-up ${
              isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-[#1f2335] bg-[#0a0d14]' : 'border-slate-200 bg-slate-50'}`}>
                      <th className={`px-6 py-4 text-left font-bold ${isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`}>Feature</th>
                      {tiers.map(t => (
                        <th key={t.id} className={`px-6 py-4 text-center font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {t.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Products', free: '10', pro: '500', ent: 'Unlimited' },
                      { label: 'Orders/Month', free: '100', pro: '10,000', ent: 'Unlimited' },
                      { label: 'Campaigns', free: '2', pro: '50', ent: 'Unlimited' },
                      { label: 'Discount Codes', free: '✗', pro: '✓', ent: '✓' },
                      { label: 'Loyalty Program', free: '✗', pro: '✓', ent: '✓' },
                      { label: 'CSV Export', free: '✗', pro: '✓', ent: '✓' },
                    ].map((row, i) => (
                      <tr key={i} className={`border-b last:border-b-0 ${isDark ? 'border-[#1f2335]' : 'border-slate-200'}`}>
                        <td className={`px-6 py-4 font-semibold ${isDark ? 'text-[#8b92ad]' : 'text-slate-700'}`}>
                          {row.label}
                        </td>
                        <td className={`px-6 py-4 text-center ${isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`}>
                          {row.free}
                        </td>
                        <td className={`px-6 py-4 text-center font-bold ${isDark ? 'text-accent' : 'text-accent'}`}>
                          {row.pro}
                        </td>
                        <td className={`px-6 py-4 text-center font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                          {row.ent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method Section */}
        {selectedTier !== 'free' && selectedTier !== 'enterprise' && (
          <div className={`mb-12 rounded-3xl border p-8 ${
            isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Payment Method
            </h3>
            <div className="space-y-3">
              {[
                { id: 'card', label: 'Credit/Debit Card', desc: 'Visa, Mastercard, American Express', icon: '💳' },
                { id: 'promptpay', label: 'PromptPay', desc: 'Instant bank transfer (Thailand)', icon: '🏦' },
              ].map((method: any) => (
                <label key={method.id} className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
                  paymentMethod === method.id
                    ? isDark
                      ? 'bg-accent/20 border border-accent/40'
                      : 'bg-accent/10 border border-accent/30'
                    : isDark
                    ? 'bg-[#0a0d14] border border-[#1f2335] hover:border-[#2a2f45]'
                    : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{method.label}</p>
                    <p className={`text-sm ${isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`}>{method.desc}</p>
                  </div>
                  <span className="text-2xl">{method.icon}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <div className="flex gap-4 mb-12">
          <button
            onClick={handleUpgrade}
            disabled={isLoading || selectedTier === tier}
            className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
              selectedTier === tier
                ? isDark
                  ? 'bg-[#1f2335] text-[#8b92ad] cursor-default'
                  : 'bg-slate-200 text-slate-600 cursor-default'
                : selectedTier === 'enterprise'
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                : 'bg-accent hover:bg-[#009900] text-white shadow-lg shadow-accent/30'
            }`}
          >
            {isLoading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Processing...
              </>
            ) : selectedTier === tier ? (
              <>
                <Check size={18} />
                Current Plan
              </>
            ) : selectedTier === 'free' ? (
              <>
                <ArrowRight size={18} />
                Downgrade to Free
              </>
            ) : selectedTier === 'enterprise' ? (
              <>
                <CreditCard size={18} />
                Contact Sales
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Upgrade to Pro
              </>
            )}
          </button>
        </div>

        {/* Billing History */}
        <div className={`rounded-3xl border p-8 ${
          isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200'
        }`}>
          <h3 className={`text-xl font-black mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Billing History
          </h3>
          <div className={`text-center py-12 ${isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`}>
            <p className="text-sm">No invoices yet. Your billing history will appear here after your first payment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { CreditCard, Check, AlertCircle, Loader, Zap, Package, Users, TrendingUp, ArrowRight, ChevronDown } from 'lucide-react';

interface BillingSetupProps {
  theme: 'light' | 'lite' | 'dark';
  tier: string;
  subscriptionStatus?: string;
  nextBillingDate?: string | null;
  paymentMethodBrand?: string | null;
  paymentMethodLast4?: string | null;
  onSubscriptionChange?: (update: { tier: string; subscriptionStatus?: string; nextBillingDate?: string | null; paymentMethodBrand?: string | null; paymentMethodLast4?: string | null }) => void;
}

export default function BillingSetupView({
  theme,
  tier = 'free',
  subscriptionStatus,
  nextBillingDate,
  paymentMethodBrand,
  paymentMethodLast4,
  onSubscriptionChange,
}: BillingSetupProps) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState(tier);
  const [showComparison, setShowComparison] = useState(false);
  const [card, setCard] = useState({ name: '', number: '', expMonth: '', expYear: '', cvc: '' });

  const surface = isDark ? 'bg-[#161925] border-[#1f2335]' : isLite ? 'bg-[#e7ecf3] border-[#cdd3dd]' : 'bg-white border-slate-200';
  const text = isDark ? 'text-white' : isLite ? 'text-[#2f3744]' : 'text-slate-900';
  const muted = isDark ? 'text-[#8b92ad]' : isLite ? 'text-[#6d7a8c]' : 'text-slate-500';
  const mutedStrong = isDark ? 'text-[#8b92ad]' : isLite ? 'text-[#5b6677]' : 'text-slate-600';
  const chipBg = isDark ? 'bg-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#292d45]' : isLite ? 'bg-[#cdd3dd] text-[#5b6677] hover:bg-[#bcc4d1]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
  const cardHover = isDark ? 'bg-[#161925] border-[#1f2335] hover:border-[#2a2f45] hover:shadow-lg' : isLite ? 'bg-[#e7ecf3] border-[#cdd3dd] hover:border-[#bcc4d1] hover:shadow-lg' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg';
  const cardSelected = isDark ? 'bg-[#1a1d2e] border-accent shadow-2xl shadow-accent/30' : 'bg-white border-accent shadow-2xl shadow-accent/20';
  const featureUnfilled = isDark ? 'bg-[#1f2335] text-[#8b92ad]' : isLite ? 'bg-[#cdd3dd] text-[#5b6677]' : 'bg-slate-200 text-slate-500';
  const featureFilledMuted = isDark ? 'bg-accent/10 text-[#8b92ad]' : isLite ? 'bg-accent/10 text-[#5b6677]' : 'bg-accent/5 text-slate-500';
  const currentPlanBadge = isDark ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-accent/10 text-accent border border-accent/20';
  const tableHeadBg = isDark ? 'border-[#1f2335] bg-[#0a0d14]' : isLite ? 'border-[#cdd3dd] bg-[#d9dfe8]' : 'border-slate-200 bg-slate-50';
  const radioSelected = isDark ? 'bg-accent/20 border border-accent/40' : 'bg-accent/10 border border-accent/30';
  const radioUnselected = isDark ? 'bg-[#0a0d14] border border-[#1f2335] hover:border-[#2a2f45]' : isLite ? 'bg-[#d9dfe8] border border-[#cdd3dd] hover:border-[#bcc4d1]' : 'bg-slate-50 border border-slate-200 hover:border-slate-300';
  const currentPlanCtaBg = isDark ? 'bg-[#1f2335] text-[#8b92ad] cursor-default' : isLite ? 'bg-[#cdd3dd] text-[#5b6677] cursor-default' : 'bg-slate-200 text-slate-600 cursor-default';
  const errorBox = isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : isLite ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-red-50 border-red-200 text-red-700';

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

  const handleDowngradeToFree = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription');
      // No refund/proration — access continues on the current tier until the
      // already-paid period ends, then the billing cycle cron drops it to Free.
      onSubscriptionChange?.({ tier, subscriptionStatus: data.subscriptionStatus, nextBillingDate: data.accessUntil });
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const tokenizeCard = async (): Promise<string> => {
    const publicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
    if (!publicKey) throw new Error('Payments are not configured yet. Please contact support.');

    const res = await fetch('https://vault.omise.co/tokens', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${publicKey}:`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'card[name]': card.name,
        'card[number]': card.number.replace(/\s+/g, ''),
        'card[expiration_month]': card.expMonth,
        'card[expiration_year]': card.expYear,
        'card[security_code]': card.cvc,
      }),
    });
    const token = await res.json();
    if (!res.ok || token.object === 'error') {
      throw new Error(token.message || 'Card details were rejected. Please check and try again.');
    }
    return token.id;
  };

  const handleUpgrade = async () => {
    if (selectedTier === 'free') {
      await handleDowngradeToFree();
      return;
    }

    if (selectedTier === 'enterprise') {
      alert('Please contact sales@shopenter.app for Enterprise pricing');
      return;
    }

    if (!card.name || !card.number || !card.expMonth || !card.expYear || !card.cvc) {
      setError('Enter your full card details to upgrade.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const omiseCardToken = await tokenizeCard();

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, omiseCardToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to charge your card');

      onSubscriptionChange?.({
        tier: data.tier,
        subscriptionStatus: data.subscriptionStatus,
        nextBillingDate: data.nextBillingDate,
      });
      setCard({ name: '', number: '', expMonth: '', expYear: '', cvc: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade tier');
    } finally {
      setIsLoading(false);
    }
  };

  const currentTierObj = tiers.find(t => t.id === tier);

  return (
    <div className="flex-1 overflow-auto pb-20 md:pb-6">
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className={`text-2xl font-black ${text} mb-2`}>Subscription & Billing</h2>
              <p className={`text-sm ${muted}`}>Choose the perfect plan for your business. Scale up as you grow.</p>
            </div>
            <div className={`hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl ${isDark ? 'bg-[#1f2335]' : isLite ? 'bg-[#cdd3dd]' : 'bg-slate-200'}`}>
              <CreditCard size={24} className={muted} />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 animate-slide-up ${errorBox}`}>
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Current Plan Summary */}
        <div className={`mb-6 rounded-2xl border p-4 ${surface}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${muted}`}>
                Current Plan
              </p>
              <h3 className={`text-2xl font-black mb-1 ${text}`}>
                {currentTierObj?.name}
              </h3>
              <p className={`text-sm ${mutedStrong}`}>
                {currentTierObj?.description}
              </p>
            </div>
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

        {/* Tier Selection Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-black ${text}`}>
              Choose Your Plan
            </h3>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${chipBg}`}
            >
              Compare
              <ChevronDown size={14} className={`transition-transform ${showComparison ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {tiers.map((t) => {
              const isSelected = selectedTier === t.id;
              const isCurrent = tier === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTier(t.id)}
                  className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer ${
                    isSelected || isCurrent
                      ? `${cardSelected} ring-2 ring-accent/40`
                      : cardHover
                  }`}
                >
                  {/* Badge */}
                  <div className={`absolute top-0 right-0 px-3 py-1.5 text-[9px] font-black uppercase border-l border-b rounded-bl-xl ${t.badgeColor} ${isDark ? 'bg-[#0a0d14]/80' : isLite ? 'bg-[#e7ecf3]/90' : 'bg-white/80'}`}>
                    {t.badge}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Selected Checkmark */}
                    {(isSelected || isCurrent) && (
                      <div className="absolute top-4 left-4 w-6 h-6 bg-accent rounded-full flex items-center justify-center animate-fade-in-scale">
                        <Check size={16} className="text-white" strokeWidth={3} />
                      </div>
                    )}

                    {/* Title & Price */}
                    <h4 className={`text-lg font-black mb-0.5 ${text}`}>
                      {t.name}
                    </h4>
                    <p className={`text-xs mb-3 ${mutedStrong}`}>
                      {t.description}
                    </p>

                    {/* Price */}
                    <div className="mb-4">
                      {t.price !== null ? (
                        <div>
                          <span className={`text-3xl font-black ${text}`}>
                            ฿{t.price.toLocaleString()}
                          </span>
                          <span className={`text-xs ml-2 ${muted}`}>
                            {t.billingPeriod}
                          </span>
                        </div>
                      ) : (
                        <div className="text-base font-bold text-accent">
                          Custom pricing
                        </div>
                      )}
                    </div>

                    {/* Current Plan Badge */}
                    {isCurrent && (
                      <div className={`mb-3 px-2 py-1 rounded-lg text-[9px] font-bold text-center ${currentPlanBadge}`}>
                        YOUR CURRENT PLAN
                      </div>
                    )}

                    {/* Features */}
                    <div className="space-y-1.5">
                      {t.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            f.highlight && isSelected
                              ? 'bg-accent/30 text-accent'
                              : f.highlight
                              ? featureFilledMuted
                              : featureUnfilled
                          }`}>
                            <div className="w-1 h-1 rounded-full bg-current" />
                          </div>
                          <span className={`text-xs ${mutedStrong}`}>
                            {f.label}
                          </span>
                        </div>
                      ))}
                      {/* Add Affiliate Program feature for Pro/Enterprise */}
                      {(t.id === 'pro' || t.id === 'enterprise') && (
                        <div className="flex items-start gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? 'bg-accent/30 text-accent' : featureFilledMuted
                          }`}>
                            <div className="w-1 h-1 rounded-full bg-current" />
                          </div>
                          <span className={`text-xs ${mutedStrong}`}>
                            Affiliate Program
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          {showComparison && (
            <div className={`rounded-2xl border overflow-hidden animate-slide-up ${surface}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${tableHeadBg}`}>
                      <th className={`px-4 py-3 text-left text-xs font-bold ${mutedStrong}`}>Feature</th>
                      {tiers.map(t => (
                        <th key={t.id} className={`px-4 py-3 text-center text-xs font-bold ${text}`}>
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
                    ].map((row, i) => (
                      <tr key={i} className={`border-b last:border-b-0`}>
                        <td className={`px-4 py-3 text-xs font-semibold ${mutedStrong}`}>
                          {row.label}
                        </td>
                        <td className={`px-4 py-3 text-center text-xs ${mutedStrong}`}>
                          {row.free}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-bold text-accent">
                          {row.pro}
                        </td>
                        <td className={`px-4 py-3 text-center text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
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

        {/* Card Details Section */}
        {selectedTier !== 'free' && selectedTier !== 'enterprise' && selectedTier !== tier && (
          <div className={`mb-6 rounded-2xl border p-4 ${surface}`}>
            <h4 className={`text-base font-black mb-3 flex items-center gap-2 ${text}`}>
              <CreditCard size={18} /> Card Details
            </h4>
            <p className={`text-xs mb-4 ${mutedStrong}`}>Billed monthly via our payment processor, Omise. We never see or store your full card number.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Name on card"
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                className={`sm:col-span-2 px-3 py-2 rounded-xl text-sm border ${radioUnselected} ${text}`}
              />
              <input
                type="text"
                placeholder="Card number"
                inputMode="numeric"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                className={`sm:col-span-2 px-3 py-2 rounded-xl text-sm border ${radioUnselected} ${text}`}
              />
              <input
                type="text"
                placeholder="MM"
                inputMode="numeric"
                maxLength={2}
                value={card.expMonth}
                onChange={(e) => setCard({ ...card, expMonth: e.target.value })}
                className={`px-3 py-2 rounded-xl text-sm border ${radioUnselected} ${text}`}
              />
              <input
                type="text"
                placeholder="YYYY"
                inputMode="numeric"
                maxLength={4}
                value={card.expYear}
                onChange={(e) => setCard({ ...card, expYear: e.target.value })}
                className={`px-3 py-2 rounded-xl text-sm border ${radioUnselected} ${text}`}
              />
              <input
                type="text"
                placeholder="CVC"
                inputMode="numeric"
                maxLength={4}
                value={card.cvc}
                onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                className={`sm:col-span-2 px-3 py-2 rounded-xl text-sm border ${radioUnselected} ${text}`}
              />
            </div>
          </div>
        )}

        {/* CTA Button */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleUpgrade}
            disabled={isLoading || selectedTier === tier}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              selectedTier === tier
                ? currentPlanCtaBg
                : selectedTier === 'enterprise'
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                : 'bg-accent hover:bg-[#009900] text-white shadow-lg shadow-accent/30'
            }`}
          >
            {isLoading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Processing...
              </>
            ) : selectedTier === tier ? (
              <>
                <Check size={16} />
                Current Plan
              </>
            ) : selectedTier === 'free' ? (
              <>
                <ArrowRight size={16} />
                Downgrade to Free
              </>
            ) : selectedTier === 'enterprise' ? (
              <>
                <CreditCard size={16} />
                Contact Sales
              </>
            ) : (
              <>
                <CreditCard size={16} />
                Upgrade to Pro
              </>
            )}
          </button>
        </div>

        {/* Subscription Status */}
        <div className={`rounded-2xl border p-4 ${surface}`}>
          <h4 className={`text-base font-black mb-3 ${text}`}>
            Subscription Status
          </h4>
          {subscriptionStatus && subscriptionStatus !== 'none' ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={mutedStrong}>Status</span>
                <span className={`font-semibold capitalize ${text}`}>{subscriptionStatus.replace('_', ' ')}</span>
              </div>
              {paymentMethodBrand && paymentMethodLast4 && (
                <div className="flex justify-between">
                  <span className={mutedStrong}>Card on file</span>
                  <span className={`font-semibold ${text}`}>{paymentMethodBrand} •••• {paymentMethodLast4}</span>
                </div>
              )}
              {nextBillingDate && (
                <div className="flex justify-between">
                  <span className={mutedStrong}>Next charge</span>
                  <span className={`font-semibold ${text}`}>{new Date(nextBillingDate).toLocaleDateString()}</span>
                </div>
              )}
              {subscriptionStatus === 'past_due' && (
                <p className="text-xs text-red-500 mt-2">Your last charge failed. We'll retry automatically — update your card above to avoid reverting to the Free tier.</p>
              )}
            </div>
          ) : (
            <div className={`text-center py-6 ${mutedStrong}`}>
              <p className="text-xs">You&apos;re on the Free tier — no active subscription.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

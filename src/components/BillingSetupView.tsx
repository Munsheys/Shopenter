'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Check, AlertCircle, Loader } from 'lucide-react';

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

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      billingPeriod: '/month',
      description: 'Perfect for getting started',
      limits: {
        products: 10,
        ordersPerMonth: 100,
        campaigns: 2,
      },
      features: ['10 products', '100 orders/month', '2 campaigns', 'Basic analytics', 'LINE messaging'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 299,
      billingPeriod: '/month',
      description: 'For growing stores',
      limits: {
        products: 500,
        ordersPerMonth: 10000,
        campaigns: 50,
      },
      features: ['500 products', '10,000 orders/month', '50 campaigns', 'Discount codes', 'Loyalty program', 'CSV export', 'Priority support'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: null,
      billingPeriod: '',
      description: 'For large operations',
      limits: null,
      features: ['Unlimited products', 'Unlimited orders', 'Unlimited campaigns', 'All Pro features', 'Dedicated support', 'Custom integrations'],
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
        body: JSON.stringify({
          tier: selectedTier,
          paymentMethod,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to initiate payment');
      }

      const { paymentUrl, orderId } = await res.json();
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        onTierChange?.(selectedTier);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade tier');
    } finally {
      setIsLoading(false);
    }
  };

  const k = {
    surface: isDark ? 'bg-[#161925] text-white' : 'bg-white text-[#1a1d2e]',
    border: isDark ? 'border-[#1f2335]' : 'border-[#e2e5ef]',
    muted: isDark ? 'text-[#8b92ad]' : 'text-[#8b92ad]',
    accent: 'text-green-500',
    button: isDark ? 'bg-[#1f2335] hover:bg-[#292d42]' : 'bg-[#f8f9fc] hover:bg-[#e8eaf5]',
  };

  return (
    <div className={`p-6 space-y-8 ${isDark ? 'bg-[#0a0d14]' : 'bg-[#f8f9fc]'}`}>
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className={`text-sm ${k.muted}`}>Manage your plan and payment method</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Current Plan */}
      <div className={`border ${k.border} rounded-2xl p-6 ${k.surface}`}>
        <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold capitalize">{tier}</p>
            <p className={`text-sm ${k.muted} mt-1`}>
              {tier === 'free' ? 'No subscription needed' : 'Active subscription'}
            </p>
          </div>
          {tier !== 'free' && (
            <div className="text-right">
              <p className="text-sm text-green-500 font-semibold">Active</p>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Upgrade Your Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => {
            const isSelected = selectedTier === t.id;
            const isCurrent = tier === t.id;

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className={`border rounded-2xl p-6 cursor-pointer transition-all ${
                  isSelected || isCurrent
                    ? `border-green-500 ${isDark ? 'bg-green-500/5' : 'bg-green-50'} ring-2 ring-green-500/20`
                    : `border-${k.border} ${k.surface}`
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{t.name}</h3>
                    <p className={`text-xs ${k.muted} mt-1`}>{t.description}</p>
                  </div>
                  {isCurrent && (
                    <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-1 rounded-full">CURRENT</span>
                  )}
                </div>

                <div className="mb-6">
                  {t.price !== null ? (
                    <>
                      <span className="text-3xl font-bold">฿{t.price.toLocaleString()}</span>
                      <span className={`text-xs ${k.muted}`}>{t.billingPeriod}</span>
                    </>
                  ) : (
                    <p className={`text-sm ${k.muted}`}>Contact for custom pricing</p>
                  )}
                </div>

                {t.limits && (
                  <div className="mb-6 pb-6 border-b border-white/10 space-y-2">
                    <p className="text-[10px] font-semibold uppercase text-gray-500">Limits</p>
                    <div className="text-xs space-y-1">
                      <p>📦 {t.limits.products.toLocaleString()} products</p>
                      <p>📊 {t.limits.ordersPerMonth.toLocaleString()} orders/month</p>
                      <p>📢 {t.limits.campaigns} campaigns</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {t.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-xs">
                      <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method Selection */}
      {selectedTier !== 'free' && selectedTier !== 'enterprise' && (
        <div className={`border ${k.border} rounded-2xl p-6 ${k.surface}`}>
          <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
          <div className="space-y-3">
            {[
              { id: 'card', label: 'Credit/Debit Card', desc: 'Visa, Mastercard, etc.' },
              { id: 'promptpay', label: 'PromptPay (Thailand)', desc: 'Instant bank transfer' },
            ].map((method) => (
              <label key={method.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                paymentMethod === method.id
                  ? `border-green-500 ${isDark ? 'bg-green-500/5' : 'bg-green-50'}`
                  : `border-${k.border}`
              }`}>
                <input
                  type="radio"
                  name="payment"
                  value={method.id}
                  checked={paymentMethod === method.id}
                  onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'promptpay')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{method.label}</p>
                  <p className={`text-xs ${k.muted}`}>{method.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleUpgrade}
          disabled={isLoading || selectedTier === tier}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all flex-1 sm:flex-initial ${
            selectedTier === tier
              ? `${k.button} cursor-default opacity-50`
              : 'bg-green-500 hover:bg-green-400 text-white disabled:opacity-50 disabled:cursor-not-allowed'
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
              <CreditCard size={16} />
              Downgrade to Free
            </>
          ) : (
            <>
              <CreditCard size={16} />
              Upgrade Now
            </>
          )}
        </button>
      </div>

      {/* Billing History */}
      <div className={`border ${k.border} rounded-2xl p-6 ${k.surface}`}>
        <h2 className="text-lg font-semibold mb-4">Billing History</h2>
        <p className={`text-sm ${k.muted}`}>No invoices yet. Your billing history will appear here after your first payment.</p>
      </div>
    </div>
  );
}

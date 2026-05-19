'use client';

import React from 'react';
import { X, Zap, Package, Megaphone, MessageSquare, Tag, Star } from 'lucide-react';

const FEATURE_INFO: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  products:     { label: 'Product Catalog', icon: <Package size={20} />, description: 'Add unlimited products to your catalog' },
  campaigns:    { label: 'Broadcast Campaigns', icon: <Megaphone size={20} />, description: 'Send unlimited broadcast campaigns' },
  autoReplies:  { label: 'Auto-Reply Rules', icon: <MessageSquare size={20} />, description: 'Create unlimited keyword auto-reply rules' },
  ordersPerMonth: { label: 'Monthly Orders', icon: <Package size={20} />, description: 'Process unlimited orders per month' },
  discountCodes:{ label: 'Discount Codes', icon: <Tag size={20} />, description: 'Create coupon codes for your customers' },
  loyalty:      { label: 'Loyalty Points', icon: <Star size={20} />, description: 'Reward customers with a loyalty points program' },
  csvExport:    { label: 'CSV Export', icon: <Package size={20} />, description: 'Export orders and customers as CSV files' },
};

interface UpgradePromptProps {
  feature: string;
  limit?: number;
  current?: number;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export default function UpgradePrompt({ feature, limit, current, onClose, theme = 'light' }: UpgradePromptProps) {
  const isDark = theme === 'dark';
  const info = FEATURE_INFO[feature] ?? { label: feature, icon: <Zap size={20} />, description: 'Upgrade to unlock this feature' };

  const PRO_FEATURES = ['Unlimited products (up to 500)', 'Unlimited broadcast campaigns', 'Unlimited auto-reply rules', 'Discount codes & coupons', 'Loyalty points program', 'CSV export for orders & customers'];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-accent to-[#007700] p-8 pb-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-4">
            {info.icon}
          </div>
          <h2 className="text-xl font-black text-white mb-1">{info.label}</h2>
          <p className="text-sm text-white/80">{info.description}</p>
          {limit !== undefined && current !== undefined && (
            <div className="mt-3 bg-white/10 rounded-xl px-3 py-2">
              <p className="text-xs text-white/90 font-medium">
                You&apos;ve used <span className="font-black">{current}</span> of <span className="font-black">{limit}</span> on the Free plan
              </p>
              <div className="mt-1.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(100, (current / limit) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>Pro plan includes:</p>
          <ul className="space-y-2 mb-6">
            {PRO_FEATURES.map((feat) => (
              <li key={feat} className="flex items-center gap-2.5 text-sm">
                <div className="w-4 h-4 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                </div>
                <span className={isDark ? 'text-[#8b92ad]' : 'text-[#4a5170]'}>{feat}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 py-3 text-sm font-bold rounded-2xl ${isDark ? 'bg-[#1a1d2e] text-[#8b92ad] hover:bg-[#2d324d]' : 'bg-[#f4f6f9] text-[#8b92ad] hover:bg-[#e2e5ef]'}`}
            >
              Not now
            </button>
            <button
              onClick={() => { onClose(); }}
              className="flex-1 py-3 text-sm font-bold text-white bg-accent rounded-2xl shadow-lg shadow-accent/20 hover:opacity-90 flex items-center justify-center gap-2"
            >
              <Zap size={16} /> Upgrade to Pro
            </button>
          </div>
          <p className={`text-center text-[10px] mt-3 ${isDark ? 'text-[#8b92ad]' : 'text-[#8b92ad]'}`}>
            Contact support to upgrade your plan
          </p>
        </div>
      </div>
    </div>
  );
}

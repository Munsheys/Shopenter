'use client';

import React, { useMemo } from 'react';
import { AlertCircle, Clock, Zap } from 'lucide-react';

interface TrialExpirationBannerProps {
  trialEndsAt: Date | null;
  paymentStatus: 'paid' | 'trialing' | 'unpaid';
  tier: string;
  theme: 'light' | 'lite' | 'dark';
  onUpgradeClick?: () => void;
}

export default function TrialExpirationBanner({
  trialEndsAt,
  paymentStatus,
  tier,
  theme,
  onUpgradeClick,
}: TrialExpirationBannerProps) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';

  const trialInfo = useMemo(() => {
    if (paymentStatus !== 'trialing' || !trialEndsAt) return null;

    const now = new Date();
    const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (daysRemaining < 0) {
      return { daysRemaining: 0, expired: true, urgent: true };
    }

    return { daysRemaining, expired: false, urgent: daysRemaining <= 3 };
  }, [paymentStatus, trialEndsAt]);

  if (!trialInfo) return null;

  const { daysRemaining, expired, urgent } = trialInfo;

  const colorCls = expired || urgent
    ? isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
    : isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700';
  const iconCls = expired || urgent
    ? isDark ? 'text-red-400' : 'text-red-600'
    : isDark ? 'text-blue-400' : 'text-blue-600';
  const buttonCls = expired || urgent
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-blue-600 hover:bg-blue-700';

  const message = expired
    ? `Your ${tier} trial has ended.`
    : daysRemaining === 0
    ? 'Your trial ends today.'
    : `Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`;

  return (
    <div className={`rounded-xl border px-3 py-2 flex items-center gap-2.5 ${colorCls} ${isLite ? '' : ''}`}>
      {expired ? <AlertCircle size={15} className={`flex-shrink-0 ${iconCls}`} /> : <Clock size={15} className={`flex-shrink-0 ${iconCls}`} />}
      <p className="text-xs font-medium flex-1 min-w-0 truncate">{message}</p>
      {onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className={`flex-shrink-0 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${buttonCls}`}
        >
          <Zap size={11} />
          Upgrade
        </button>
      )}
    </div>
  );
}

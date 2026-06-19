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

  if (expired) {
    return (
      <div
        className={`rounded-2xl border p-4 flex items-start gap-3 ${
          isDark
            ? 'bg-red-500/10 border-red-500/20'
            : isLite
            ? 'bg-red-50 border-red-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <AlertCircle
          size={20}
          className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-red-400' : 'text-red-600'}`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-sm ${
              isDark ? 'text-red-300' : 'text-red-700'
            }`}
          >
            Trial Expired
          </p>
          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-red-200/80' : 'text-red-600'
            }`}
          >
            Your {tier} trial has ended. Upgrade now to keep using Pro features.
          </p>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 flex items-start gap-3 ${
        urgent
          ? isDark
            ? 'bg-amber-500/10 border-amber-500/20'
            : isLite
            ? 'bg-amber-50 border-amber-200'
            : 'bg-amber-50 border-amber-200'
          : isDark
          ? 'bg-blue-500/10 border-blue-500/20'
          : isLite
          ? 'bg-blue-50 border-blue-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      <Clock
        size={20}
        className={`flex-shrink-0 mt-0.5 ${
          urgent ? (isDark ? 'text-amber-400' : 'text-amber-600') : isDark ? 'text-blue-400' : 'text-blue-600'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold text-sm ${
            urgent ? (isDark ? 'text-amber-300' : 'text-amber-700') : isDark ? 'text-blue-300' : 'text-blue-700'
          }`}
        >
          {daysRemaining === 0
            ? 'Your trial ends today'
            : `Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
        </p>
        <p
          className={`text-sm mt-1 ${
            urgent
              ? isDark
                ? 'text-amber-200/80'
                : 'text-amber-600'
              : isDark
              ? 'text-blue-200/80'
              : 'text-blue-600'
          }`}
        >
          Upgrade to a Pro plan to keep all your features after the trial ends.
        </p>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className={`mt-3 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              urgent
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Zap size={16} />
            Upgrade to Pro
          </button>
        )}
      </div>
    </div>
  );
}

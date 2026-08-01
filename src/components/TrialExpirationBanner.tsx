'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { AlertCircle, Clock, Zap, X } from 'lucide-react';

interface TrialExpirationBannerProps {
  trialEndsAt: Date | null;
  paymentStatus: 'paid' | 'trialing' | 'unpaid';
  tier: string;
  theme: 'light' | 'lite' | 'dark';
  onUpgradeClick?: () => void;
}

const DISMISS_KEY = 'trial-banner-dismissed-at';
// Reappears after this long even if dismissed — a revenue-critical notice shouldn't be
// silence-able forever, just not nagging on every click within the same sitting.
const DISMISS_HOURS = 4;

export default function TrialExpirationBanner({
  trialEndsAt,
  paymentStatus,
  tier,
  theme,
  onUpgradeClick,
}: TrialExpirationBannerProps) {
  const isDark = theme === 'dark';

  const [dismissed, setDismissed] = useState(true); // default hidden until the sessionStorage check below runs, to avoid a flash

  useEffect(() => {
    const dismissedAt = sessionStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) { setDismissed(false); return; }
    const hoursSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60);
    setDismissed(hoursSince < DISMISS_HOURS);
  }, []);

  const trialInfo = useMemo(() => {
    if (paymentStatus !== 'trialing' || !trialEndsAt) return null;

    const now = new Date();
    const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (daysRemaining < 0) {
      return { daysRemaining: 0, expired: true, urgent: true };
    }

    return { daysRemaining, expired: false, urgent: daysRemaining <= 3 };
  }, [paymentStatus, trialEndsAt]);

  if (!trialInfo || dismissed) return null;

  const { daysRemaining, expired, urgent } = trialInfo;

  const colorCls = expired || urgent
    ? isDark ? 'bg-[#1a1116] border-red-500/30 text-red-300' : 'bg-white border-red-200 text-red-700'
    : isDark ? 'bg-[#0f1522] border-blue-500/30 text-blue-300' : 'bg-white border-blue-200 text-blue-700';
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
    <div
      className={`fixed top-16 right-4 z-40 rounded-xl border shadow-lg px-3 py-2 flex items-center gap-2.5 ${colorCls}`}
    >
      {expired ? <AlertCircle size={15} className={`flex-shrink-0 ${iconCls}`} /> : <Clock size={15} className={`flex-shrink-0 ${iconCls}`} />}
      <p className="text-xs font-medium whitespace-nowrap">{message}</p>
      {onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className={`flex-shrink-0 px-2.5 py-1 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${buttonCls}`}
        >
          <Zap size={11} />
          Upgrade
        </button>
      )}
      <button
        onClick={() => { sessionStorage.setItem(DISMISS_KEY, String(Date.now())); setDismissed(true); }}
        aria-label="Dismiss"
        className={`flex-shrink-0 p-0.5 rounded transition-colors ${isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
      >
        <X size={13} />
      </button>
    </div>
  );
}

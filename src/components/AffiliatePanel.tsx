'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Share2, Check, AlertCircle, Loader, Users, TrendingUp, Gift, Clock } from 'lucide-react';
import { MAX_REWARDS_PER_ROLLING_YEAR } from '@/lib/affiliate';

interface AffiliateStats {
  referralCode: string;
  referralUrl: string;
  stats: {
    totalReferrals: number;
    pendingConversions: number;
    inGracePeriod: number;
    earnedRewards: number;
    expiredReferrals: number;
    rewardsEarnedThisYear: number;
    rewardCapRemaining: number;
    rewardCapTotal: number;
  };
  commissions: Array<{
    id: string;
    referredMerchantId: string;
    status: 'pending' | 'converted' | 'earned' | 'reversed' | 'expired';
    createdAt: string;
    expiresAt: string;
    convertedAt: string | null;
    earnedAt: string | null;
    rewardAppliedAt: string | null;
    daysUntilExpiry: number | null;
  }>;
}

export default function AffiliatePanel({ theme }: { theme: 'light' | 'lite' | 'dark' }) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';

  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/affiliate/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else if (res.status === 404) {
          // No code generated yet, that's ok
          setStats(null);
        } else {
          setError('Failed to load affiliate stats');
        }
      } catch (err) {
        setError('Error loading affiliate stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const surface = isDark ? 'bg-[#161925] border-[#1f2335]' : isLite ? 'bg-[#e7ecf3] border-[#cdd3dd]' : 'bg-white border-slate-200';
  const text = isDark ? 'text-white' : isLite ? 'text-[#2f3744]' : 'text-slate-900';
  const muted = isDark ? 'text-[#8b92ad]' : isLite ? 'text-[#6d7a8c]' : 'text-slate-500';
  const mutedStrong = isDark ? 'text-[#8b92ad]' : isLite ? 'text-[#5b6677]' : 'text-slate-600';
  const innerBg = isDark ? 'bg-[#0a0d14]' : isLite ? 'bg-[#d9dfe8]' : 'bg-slate-50';
  const statBg = isDark ? 'bg-[#1f2335]' : isLite ? 'bg-[#cdd3dd]' : 'bg-slate-100';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl border p-6 ${surface}`}>
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`font-semibold ${text}`}>Error Loading Affiliate Stats</p>
            <p className={`text-sm mt-1 ${muted}`}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`rounded-2xl border p-8 ${surface}`}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mb-4">
            <Users size={24} className="text-accent" />
          </div>
          <h3 className={`text-lg font-bold ${text} mb-2`}>Affiliate Program</h3>
          <p className={`text-sm ${muted} mb-6 max-w-sm mx-auto`}>
            Share your link to give friends a 30-day free Pro trial. Earn 7 days of free Pro for every friend who upgrades to a paid plan.
          </p>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/affiliate/generate-code', { method: 'POST' });
                if (res.ok) {
                  const data = await res.json();
                  setStats({
                    ...data,
                    stats: {
                      totalReferrals: 0,
                      pendingConversions: 0,
                      inGracePeriod: 0,
                      earnedRewards: 0,
                      expiredReferrals: 0,
                      rewardsEarnedThisYear: 0,
                      rewardCapRemaining: MAX_REWARDS_PER_ROLLING_YEAR,
                      rewardCapTotal: MAX_REWARDS_PER_ROLLING_YEAR,
                    },
                    commissions: [],
                  });
                }
              } catch (err) {
                setError('Failed to generate referral code');
              }
            }}
            className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-[#009900] transition-colors font-semibold text-sm"
          >
            Generate Referral Link
          </button>
        </div>
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(stats.referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Shopenter',
        text: 'Get 30 days free Pro to manage your LINE OA store',
        url: stats.referralUrl,
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-6">
      {/* Referral Link Card */}
      <div className={`rounded-2xl border p-6 ${surface}`}>
        <h3 className={`text-lg font-bold ${text} mb-4`}>Your Referral Link</h3>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={stats.referralUrl}
            className={`flex-1 px-4 py-2 rounded-lg border ${isDark ? 'bg-[#0a0d14] border-[#1f2335]' : isLite ? 'bg-[#d9dfe8] border-[#cdd3dd]' : 'bg-slate-50 border-slate-200'} ${text} text-sm font-mono`}
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[#009900] transition-colors flex items-center gap-2 font-semibold text-sm flex-shrink-0"
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-[#009900] transition-colors flex items-center gap-2 font-semibold text-sm flex-shrink-0"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Referrals', value: stats.stats.totalReferrals, icon: <Users size={16} /> },
          { label: 'Pending', value: stats.stats.pendingConversions, icon: <Clock size={16} /> },
          { label: 'Conversions', value: stats.stats.earnedRewards, icon: <TrendingUp size={16} /> },
          { label: `Rewards (${stats.stats.rewardCapTotal}/yr)`, value: `${stats.stats.rewardsEarnedThisYear}/${stats.stats.rewardCapTotal}`, icon: <Gift size={16} /> },
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl border p-4 ${surface}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-accent">{stat.icon}</div>
              <p className={`text-xs font-semibold ${muted}`}>{stat.label}</p>
            </div>
            <p className={`text-2xl font-bold ${text}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Referrals List */}
      {stats.commissions.length > 0 ? (
        <div className={`rounded-2xl border p-6 ${surface}`}>
          <h3 className={`text-lg font-bold ${text} mb-4`}>Referral Activity</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.commissions.map((c, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  c.status === 'earned'
                    ? isDark
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-green-50 border-green-200'
                    : c.status === 'expired' || c.status === 'reversed'
                    ? isDark
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-red-50 border-red-200'
                    : innerBg
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${text} break-all`}>
                      {c.referredMerchantId}
                    </p>
                    <p className={`text-xs ${muted} mt-1`}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
                        c.status === 'earned'
                          ? 'bg-green-500/20 text-green-400'
                          : c.status === 'expired' || c.status === 'reversed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {c.status === 'pending'
                        ? `Expires in ${c.daysUntilExpiry} days`
                        : c.status === 'converted'
                        ? 'Upgraded — confirming'
                        : c.status === 'earned'
                        ? 'Reward earned ✓'
                        : c.status === 'reversed'
                        ? 'Canceled, no reward'
                        : 'Expired'}
                    </span>
                    {c.rewardAppliedAt && (
                      <span className={`text-xs ${muted}`}>
                        Reward: {new Date(c.rewardAppliedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border p-8 ${surface} text-center`}>
          <Users size={32} className={`mx-auto mb-3 ${muted}`} />
          <p className={`text-sm ${muted}`}>
            Share your link to start earning rewards when customers upgrade!
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className={`rounded-2xl border p-4 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : isLite ? 'bg-blue-50 border-blue-200' : 'bg-blue-50 border-blue-200'}`}>
        <p className={`text-xs leading-relaxed ${text}`}>
          <strong>How it works:</strong> Share your link. Anyone who signs up through it gets a 30-day free Pro trial — double the usual 14. If they upgrade to a paid plan and stay paid for a week, you earn 7 days of free Pro. Limited to {stats.stats.rewardCapTotal} rewards per rolling year.
        </p>
      </div>
    </div>
  );
}

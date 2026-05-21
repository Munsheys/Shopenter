'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, ShoppingCart, Settings as SettingsIcon, BarChart3, MessageCircle, LogOut, Store, ExternalLink, Megaphone, HeartHandshake, RefreshCw, Tag, Zap, Bell, X, ShoppingBag, CheckCheck, AlertTriangle, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProductManagement from '@/components/ProductManagement';
import SettingsView from '@/components/SettingsView';
import ReportsView from '@/components/ReportsView';
import ShopOrdersView from '@/components/ShopOrdersView';
import StorefrontCustomizer from '@/components/StorefrontCustomizer';
import CustomersView from '@/components/CustomersView';
import BroadcastsView from '@/components/BroadcastsView';
import LoadingView from '@/components/LoadingView';
import FloatingGuide from '@/components/FloatingGuide';
import FeedbackView from '@/components/FeedbackView';
import CouponsView from '@/components/CouponsView';
import UpgradePrompt from '@/components/UpgradePrompt';
import { type Tier, getTierLabel, checkBooleanFeature } from '@/lib/tiers';
import { getAccentText } from '@/lib/accent';

type Tab = 'customers' | 'orders' | 'products' | 'reports' | 'broadcasts' | 'storefront' | 'coupons' | 'feedback' | 'settings';

interface Merchant {
  merchantId: string;
  email: string;
  shopName?: string;
  slug?: string | null;
  tier?: Tier;
  paymentStatus?: string;
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'customers',  label: 'Customers',  icon: <MessageCircle size={15} /> },
  { id: 'orders',     label: 'Orders',     icon: <ShoppingCart size={15} /> },
  { id: 'products',   label: 'Products',   icon: <Package size={15} /> },
  { id: 'reports',    label: 'Reports',    icon: <BarChart3 size={15} /> },
  { id: 'broadcasts', label: 'Broadcasts', icon: <Megaphone size={15} /> },
  { id: 'storefront', label: 'Storefront', icon: <Store size={15} /> },
  { id: 'coupons',    label: 'Coupons',    icon: <Tag size={15} /> },
];

export default function DashboardPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [settingsScroll, setSettingsScroll] = useState<{ section: string; id: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{ feature: string; limit?: number; current?: number } | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [topNavStyle, setTopNavStyle] = useState<React.CSSProperties>({});
  const topNavContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Show cached data immediately (stale-while-revalidate)
    let hasCached = false;
    try {
      const cm = localStorage.getItem('dash_merchant');
      const cs = localStorage.getItem('dash_settings');
      if (cm) { setMerchant(JSON.parse(cm)); hasCached = true; }
      if (cs) { setSettings(JSON.parse(cs)); hasCached = true; }
      if (hasCached) setLoading(false);
    } catch {}

    async function init() {
      try {
        const [meRes, settingsRes] = await Promise.all([
          fetch('/api/merchant/me'),
          fetch('/api/settings')
        ]);
        if (!meRes.ok) { if (!hasCached) router.replace('/login'); return; }
        const [me, s] = await Promise.all([meRes.json(), settingsRes.json()]);
        setMerchant(me);
        setSettings(s);
        localStorage.setItem('dash_merchant', JSON.stringify(me));
        localStorage.setItem('dash_settings', JSON.stringify(s));
      } catch {
        if (!hasCached) router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const refreshSettings = useCallback(async () => {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const s = await res.json();
      setSettings(s);
      localStorage.setItem('dash_settings', JSON.stringify(s));
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [meRes, settingsRes] = await Promise.all([
        fetch('/api/merchant/me'),
        fetch('/api/settings')
      ]);
      if (meRes.ok && settingsRes.ok) {
        const [me, s] = await Promise.all([meRes.json(), settingsRes.json()]);
        setMerchant(me);
        setSettings(s);
        localStorage.setItem('dash_merchant', JSON.stringify(me));
        localStorage.setItem('dash_settings', JSON.stringify(s));
      }
    } catch {}
    setRefreshKey(k => k + 1);
    setIsRefreshing(false);
  }, []);

  const handleThemeChange = useCallback((newTheme: 'light' | 'lite' | 'dark') => {
    setSettings((prev: any) => prev ? { ...prev, theme: newTheme } : prev);
  }, []);

  const handleAccentChange = useCallback((newColor: string, gradient?: string | null) => {
    setSettings((prev: any) => prev ? {
      ...prev,
      dashboardAccent: newColor,
      ...(gradient !== undefined ? { dashboardAccentGradient: gradient ?? null } : {}),
    } : prev);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadNotifCount(data.unreadCount ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Update unread count from SSE stream payload
  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.unreadNotifCount !== undefined) setUnreadNotifCount(data.unreadNotifCount);
      } catch {}
    };
    return () => es.close();
  }, []);

  // Close notif dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleOpenNotif() {
    setNotifOpen(o => !o);
    if (!notifOpen) {
      await fetchNotifications();
      if (unreadNotifCount > 0) {
        await fetch('/api/notifications', { method: 'PATCH' });
        setUnreadNotifCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    }
  }

  async function handleSaveStorefront(config: any) {
    const { shopName, shopDescription, shopLogoUrl, shopTimezone, ...storefrontConfig } = config;
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, shopDescription, shopLogoUrl, shopTimezone, storefront: storefrontConfig }),
    });
    await refreshSettings();
  }

  async function handleSaveSlug(slug: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch('/api/merchant/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMerchant(prev => prev ? { ...prev, slug: data.slug } : prev);
      return { ok: true };
    }
    return { ok: false, error: data.error };
  }

  async function handleLogout() {
    await fetch('/api/merchant/auth/logout', { method: 'POST' });
    localStorage.removeItem('dash_merchant');
    localStorage.removeItem('dash_settings');
    router.push('/login');
  }

  const handleLimitHit = useCallback((feature: string, limit?: number, current?: number) => {
    setUpgradePrompt({ feature, limit, current });
  }, []);

  useEffect(() => {
    const updateTopNav = () => {
      if (!topNavContainerRef.current) return;
      const container = topNavContainerRef.current;
      const activeIdx = tabs.findIndex(t => t.id === activeTab);
      if (activeIdx === -1) { setTopNavStyle({}); return; }

      const buttons = container.querySelectorAll('button');
      const activeBtn = buttons[activeIdx] as HTMLElement;
      if (activeBtn) {
        setTopNavStyle({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
        });
      }
    };

    updateTopNav();
    const timer = setTimeout(updateTopNav, 50);
    window.addEventListener('resize', updateTopNav);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updateTopNav); };
  }, [activeTab, loading]);

  if (loading) return <LoadingView />;

  const theme = settings?.theme || 'light';
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';
  const accentColor = settings?.dashboardAccent || '#00b900';
  const accentGradient: string | null = settings?.dashboardAccentGradient || null;
  const shopInitial = (settings?.shopName || merchant?.email || 'S')[0].toUpperCase();
  const tier = merchant?.tier ?? 'free';
  const tierLabel = getTierLabel(tier);
  const couponsUnlocked = checkBooleanFeature(tier, 'discountCodes');

  const TIER_BADGE_COLORS: Record<string, string> = {
    free:       'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-[#8b92ad]',
    pro:        'bg-accent/10 text-accent',
    enterprise: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-[#0f1117] text-white' : isLite ? 'bg-[#d6dae8] text-[#1a1d2e]' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`} style={{ '--accent': accentColor, '--accent-gradient': accentGradient || accentColor, '--accent-text': getAccentText(accentColor) } as React.CSSProperties}>
      <style>{`
        @keyframes navglow {
          0%, 100% { box-shadow: 0 0 4px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); opacity: 0.85; }
          50%       { box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 75%, transparent), 0 0 5px color-mix(in srgb, var(--accent) 40%, transparent); opacity: 1; }
        }
        @keyframes iconglow {
          0%, 100% { box-shadow: 0 0 4px color-mix(in srgb, var(--accent) 40%, transparent), 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); }
          50%       { box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 70%, transparent), 0 0 5px color-mix(in srgb, var(--accent) 40%, transparent); }
        }
      `}</style>

      {/* ── Top navbar ── */}
      <header className={`flex items-center h-14 border-b flex-shrink-0 ${isDark ? 'bg-[#0f1117] border-[#1f2335]' : isLite ? 'bg-[#cdd2e0] border-[#b8c2d8]' : 'bg-white border-gray-200'} transition-colors duration-300`}>

        {/* Brand */}
        <div className={`flex items-center gap-3 px-5 h-full flex-shrink-0 border-r ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#b8c2d8]' : 'border-gray-200'}`}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'var(--accent-gradient)' }}>
            <MessageCircle size={16} />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold leading-tight truncate max-w-[120px] ${isDark ? 'text-white' : isLite ? 'text-[#1a1d2e]' : 'text-gray-900'}`}>
                {settings?.shopName || 'My Shop'}
              </p>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${TIER_BADGE_COLORS[tier]}`}>
                {tierLabel}
              </span>
            </div>
            <p className={`text-[10px] font-mono ${isDark ? 'text-[#8b92ad]' : 'text-gray-400'}`}>
              {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
                ? `v${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}`
                : 'local'}
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <nav ref={topNavContainerRef} className="flex items-stretch h-full flex-1 overflow-x-auto relative" style={{ scrollbarWidth: 'none' }}>
          <div
            className={`absolute bottom-0 h-[2px] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10 ${
              topNavStyle.width ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              left: topNavStyle.left,
              width: topNavStyle.width,
              background: 'var(--accent-gradient)',
              animation: 'navglow 3s ease-in-out infinite',
            }}
          />
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-3 h-full text-[13px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? `${isDark ? 'text-white' : 'text-gray-900'}`
                  : `${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
              }`}
            >
              {activeTab === tab.id && (
                <span className={`absolute inset-0 rounded-none pointer-events-none ${isDark ? 'bg-accent/5' : 'bg-accent/5'}`} />
              )}
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: view store + user section */}
        <div className="flex items-center gap-3 px-4 flex-shrink-0">
          {merchant && (
            <a
              href={merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-0 transition-all active:scale-95 hover:opacity-90"
              style={{ background: 'var(--accent-gradient)', color: 'var(--accent-text, white)' }}
            >
              <ExternalLink size={12} />
              View Store
            </a>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh data"
            className={`relative p-1.5 rounded-lg transition-all disabled:opacity-40 ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            style={isRefreshing ? { color: accentColor } : undefined}
          >
            {isRefreshing && <div className="absolute inset-0 rounded-lg blur-md pointer-events-none -z-10" style={{ background: `var(--accent-gradient)`, opacity: 0.25 }} />}
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={handleOpenNotif}
              title="Notifications"
              className={`relative p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <Bell size={15} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center" style={{ background: 'var(--accent-gradient)' }}>
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className={`absolute right-0 top-10 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-[#161925] border-[#1f2335]' : isLite ? 'bg-[#e0e5f0] border-[#b8c2d8]' : 'bg-white border-[#e2e5ef]'}`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#b8c2d8]' : 'border-[#e2e5ef]'}`}>
                  <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>Notifications</span>
                  <button onClick={() => setNotifOpen(false)} className="text-[#8b92ad] hover:text-red-400"><X size={14} /></button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[#8b92ad] text-xs">No notifications yet</div>
                  ) : notifications.map((n: any) => {
                    const icons: Record<string, React.ReactNode> = {
                      new_order: <ShoppingBag size={13} className="text-accent" />,
                      slip_verified: <CheckCheck size={13} className="text-emerald-500" />,
                      slip_failed: <AlertTriangle size={13} className="text-amber-500" />,
                      out_of_stock: <TrendingDown size={13} className="text-red-500" />,
                    };
                    return (
                      <div key={n._id} className={`flex gap-3 px-4 py-3 border-b last:border-b-0 ${isDark ? 'border-[#1f2335]' : 'border-[#f4f6f9]'} ${!n.read ? isDark ? 'bg-accent/5' : 'bg-accent/[3%]' : ''}`}>
                        <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-[#1a1d2e]' : 'bg-[#f4f6f9]'}`}>{icons[n.type] ?? <Bell size={13} />}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] leading-snug ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{n.message}</p>
                          <p className="text-[10px] text-[#8b92ad] mt-0.5">{new Date(n.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1 pl-3 border-l ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#b8c2d8]' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('feedback')}
              title="Feedback"
              className={`p-1.5 rounded-lg transition-all ${
                activeTab === 'feedback'
                  ? ''
                  : isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
              style={activeTab === 'feedback' ? { background: 'var(--accent-gradient)', color: 'var(--accent-text, white)', animation: 'iconglow 3s ease-in-out infinite' } : undefined}
            >
              <HeartHandshake size={15} />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className={`p-1.5 rounded-lg transition-all ${
                activeTab === 'settings'
                  ? ''
                  : isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
              style={activeTab === 'settings' ? { background: 'var(--accent-gradient)', color: 'var(--accent-text, white)', animation: 'iconglow 3s ease-in-out infinite' } : undefined}
            >
              <SettingsIcon size={15} />
            </button>
          </div>

          <div className={`flex items-center gap-2 pl-3 border-l ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#b8c2d8]' : 'border-gray-200'}`}>
            <button
              onClick={handleLogout}
              title="Sign out"
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div key={`customers-${refreshKey}`} className={activeTab === 'customers' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
          <CustomersView theme={theme} onLimitHit={handleLimitHit} />
        </div>

        <div key={`orders-${refreshKey}`} className={activeTab === 'orders' ? 'flex-1 overflow-auto pt-2' : 'hidden'}>
          <ShopOrdersView theme={theme} t={{}} onLimitHit={handleLimitHit} />
        </div>

        <div key={`products-${refreshKey}`} className={activeTab === 'products' ? 'flex-1 overflow-auto' : 'hidden'}>
          <ProductManagement theme={theme} t={{}} onLimitHit={handleLimitHit} />
        </div>

        <div key={`reports-${refreshKey}`} className={activeTab === 'reports' ? 'flex-1 overflow-auto pt-2' : 'hidden'}>
          <ReportsView theme={theme} t={{}} accentColor={accentColor} />
        </div>

        <div key={`broadcasts-${refreshKey}`} className={activeTab === 'broadcasts' ? 'flex-1 overflow-hidden flex flex-col' : 'hidden'}>
          <BroadcastsView theme={theme} t={{}} accentColor={accentColor} onLimitHit={handleLimitHit} />
        </div>

        <div key={`feedback-${refreshKey}`} className={activeTab === 'feedback' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>

          <FeedbackView theme={theme} />
        </div>

        <div key={`settings-${refreshKey}`} className={activeTab === 'settings' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
          <SettingsView theme={theme} onSave={refreshSettings} onThemeChange={handleThemeChange} onAccentChange={handleAccentChange} scrollTrigger={settingsScroll} />
        </div>

        <div className={activeTab === 'coupons' ? 'flex-1 overflow-auto pt-6' : 'hidden'}>
          <CouponsView theme={theme} />
        </div>

        <div key={`storefront-${refreshKey}`} className={activeTab === 'storefront' ? 'flex-1 overflow-auto p-6' : 'hidden'}>

          <div className="mb-6">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Storefront customization</h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              Choose a theme, set your brand colors, and configure what customers see at{' '}
              {merchant && (
                <a
                  href={merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
                  target="_blank" rel="noopener noreferrer" className="text-accent hover:underline"
                >
                  {merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
                </a>
              )}
            </p>
          </div>
          <StorefrontCustomizer
            shopName={settings?.shopName || 'My Shop'}
            slug={merchant?.slug}
            initial={{
              shopName: settings?.shopName || '',
              shopDescription: settings?.shopDescription || '',
              shopLogoUrl: settings?.shopLogoUrl || '',
              shopTimezone: settings?.shopTimezone || 'Asia/Bangkok',
              ...settings?.storefront,
            }}
            theme={theme}
            accentColor={accentColor}
            onSave={handleSaveStorefront}
            onSaveSlug={handleSaveSlug}
          />
        </div>
      </main>

      <FloatingGuide
        theme={theme}
        nudgeUp={false}
        nudgeLeft={activeTab === 'settings' ? 208 : 0}
        onNavigate={(tab, section) => {
          setActiveTab(tab as Tab);
          if (section) setSettingsScroll({ section, id: Date.now() });
        }}
      />

      {upgradePrompt && (
        <UpgradePrompt
          feature={upgradePrompt.feature}
          limit={upgradePrompt.limit}
          current={upgradePrompt.current}
          theme={theme}
          onClose={() => setUpgradePrompt(null)}
        />
      )}
    </div>
  );
}

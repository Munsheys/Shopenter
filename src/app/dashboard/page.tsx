'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, ShoppingCart, Settings as SettingsIcon, BarChart3, MessageCircle, LogOut, Store, ExternalLink, Megaphone, HeartHandshake, RefreshCw, Tag, Zap } from 'lucide-react';
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

  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    setSettings((prev: any) => prev ? { ...prev, theme: newTheme } : prev);
  }, []);

  const handleAccentChange = useCallback((newColor: string) => {
    setSettings((prev: any) => prev ? { ...prev, dashboardAccent: newColor } : prev);
  }, []);

  async function handleSaveStorefront(config: any) {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefront: config }),
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
      if (activeIdx === -1) return;

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
  const accentColor = settings?.dashboardAccent || '#00b900';
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
    <div className={`h-screen flex flex-col ${isDark ? 'bg-[#0f1117] text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`} style={{ '--accent': accentColor } as React.CSSProperties}>
      <style>{`
        @keyframes navglow {
          0%, 100% { box-shadow: 0 0 4px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); opacity: 0.85; }
          50%       { box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 75%, transparent), 0 0 5px color-mix(in srgb, var(--accent) 40%, transparent); opacity: 1; }
        }
      `}</style>

      {/* ── Top navbar ── */}
      <header className={`flex items-center h-14 border-b flex-shrink-0 ${isDark ? 'bg-[#0f1117] border-[#1f2335]' : 'bg-white border-gray-200'} transition-colors duration-300`}>

        {/* Brand */}
        <div className={`flex items-center gap-3 px-5 h-full flex-shrink-0 border-r ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 shadow-sm">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold leading-tight truncate max-w-[120px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {settings?.shopName || 'My Shop'}
              </p>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${TIER_BADGE_COLORS[tier]}`}>
                {tierLabel}
              </span>
            </div>
            <p className={`text-[10px] font-medium ${isDark ? 'text-[#8b92ad]' : 'text-gray-400'}`}>Dashboard</p>
          </div>
        </div>

        {/* Tab navigation */}
        <nav ref={topNavContainerRef} className="flex items-stretch h-full flex-1 overflow-x-auto relative" style={{ scrollbarWidth: 'none' }}>
          <div
            className={`absolute bottom-0 h-[2px] bg-accent transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10 ${
              topNavStyle.width ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              left: topNavStyle.left,
              width: topNavStyle.width,
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
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 shadow-sm shadow-accent/10 ${
                isDark
                  ? 'border-accent/30 bg-accent/10 text-accent hover:bg-accent hover:text-white hover:border-accent'
                  : 'border-accent/25 bg-accent/5 text-accent hover:bg-accent hover:text-white hover:border-accent'
              }`}
            >
              <ExternalLink size={12} />
              View Store
            </a>
          )}

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh data"
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <div className={`flex items-center gap-1 pl-3 border-l ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('feedback')}
              title="Feedback"
              className={`p-1.5 rounded-lg transition-colors ${
                activeTab === 'feedback'
                  ? 'text-accent bg-accent/10'
                  : isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <HeartHandshake size={15} />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className={`p-1.5 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'text-accent bg-accent/10'
                  : isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <SettingsIcon size={15} />
            </button>
          </div>

          <div className={`flex items-center gap-2 pl-3 border-l ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
            <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-xs font-bold">{shopInitial}</span>
            </div>
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
            initial={settings?.storefront}
            theme={theme}
            accentColor={accentColor}
            onSave={handleSaveStorefront}
            onSaveSlug={handleSaveSlug}
          />
        </div>
      </main>

      <FloatingGuide
        theme={theme}
        nudgeUp={activeTab === 'settings'}
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

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, ShoppingCart, Settings as SettingsIcon, BarChart3, MessageCircle, LogOut, Store, ExternalLink, Megaphone, HeartHandshake, RefreshCw, Tag, Zap, Bell, X, ShoppingBag, CheckCheck, AlertTriangle, TrendingDown, Radio, MoreHorizontal, ChevronRight, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LoadingView from '@/components/LoadingView';
import FloatingGuide from '@/components/FloatingGuide';
import UpgradePrompt from '@/components/UpgradePrompt';
import UnsavedChangesModal from '@/components/UnsavedChangesModal';
import TrialExpirationBanner from '@/components/TrialExpirationBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import OnboardingChecklist from '@/components/OnboardingChecklist';

const ProductManagement    = dynamic(() => import('@/components/ProductManagement'),    { ssr: false });
const SettingsView         = dynamic(() => import('@/components/SettingsView'),         { ssr: false });
const ReportsView          = dynamic(() => import('@/components/ReportsView'),          { ssr: false });
const ShopOrdersView       = dynamic(() => import('@/components/ShopOrdersView'),       { ssr: false });
const StorefrontCustomizer = dynamic(() => import('@/components/StorefrontCustomizer'), { ssr: false });
const CustomersView        = dynamic(() => import('@/components/CustomersView'),        { ssr: false });
const BroadcastsView       = dynamic(() => import('@/components/BroadcastsView'),       { ssr: false });
const FeedbackView         = dynamic(() => import('@/components/FeedbackView'),         { ssr: false });
const CouponsView          = dynamic(() => import('@/components/CouponsView'),          { ssr: false });
const BillingSetupView     = dynamic(() => import('@/components/BillingSetupView'),     { ssr: false });
const AffiliatePanel       = dynamic(() => import('@/components/AffiliatePanel'),       { ssr: false });
import { type Tier, getTierLabel, checkBooleanFeature } from '@/lib/tiers';
import { getAccentText } from '@/lib/accent';

type Tab = 'customers' | 'orders' | 'products' | 'reports' | 'broadcasts' | 'storefront' | 'coupons' | 'feedback' | 'settings' | 'billing' | 'affiliate';

interface Merchant {
  merchantId: string;
  email: string;
  shopName?: string;
  slug?: string | null;
  tier?: Tier;
  paymentStatus?: string;
  trialEndsAt?: string | null;
}

const TIER_BADGE_COLORS: Record<string, string> = {
  free:       'bg-slate-100 text-slate-500',
  pro:        'bg-accent/10 text-accent',
  enterprise: 'bg-amber-50 text-amber-600',
};

const tabs: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'customers',  label: 'Customers',  Icon: MessageCircle },
  { id: 'orders',     label: 'Orders',     Icon: ShoppingCart },
  { id: 'products',   label: 'Products',   Icon: Package },
  { id: 'reports',    label: 'Reports',    Icon: BarChart3 },
  { id: 'broadcasts', label: 'Messaging',  Icon: Radio },
  { id: 'storefront', label: 'Storefront', Icon: Store },
  { id: 'coupons',    label: 'Coupons',    Icon: Tag },
  { id: 'billing',    label: 'Billing',    Icon: CreditCard },
  { id: 'affiliate',  label: 'Affiliate',  Icon: HeartHandshake },
];

// Bottom nav: 4 primary + "More" button; secondary tabs live in the More drawer
const PRIMARY_TAB_IDS: Tab[] = ['customers', 'orders', 'products', 'broadcasts'];
const SECONDARY_TAB_IDS: Tab[] = ['reports', 'storefront', 'coupons', 'billing', 'affiliate'];

export default function DashboardPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [settingsScroll, setSettingsScroll] = useState<{ section: string; id: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{ feature: string; limit?: number; current?: number } | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [productsDirty, setProductsDirty] = useState(false);
  const productsSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const productsDiscardRef = useRef<(() => void) | undefined>(undefined);
  const [unsavedContext, setUnsavedContext] = useState<'settings' | 'products'>('settings');
  const [jumpToUserId, setJumpToUserId] = useState<string | null>(null);
  const [jumpToOrderId, setJumpToOrderId] = useState<string | null>(null);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [autoDeliverToast, setAutoDeliverToast] = useState<string | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const autoDeliverRan = useRef(false);
  const autoDeliverToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (!meRes.ok) { router.replace('/login'); return; }
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

  // Auto-deliver: mark old shipped orders as delivered if the setting is enabled
  useEffect(() => {
    if (!settings?.autoDeliver?.enabled || autoDeliverRan.current) return;
    autoDeliverRan.current = true;
    const afterDays: number = settings.autoDeliver.afterDays ?? 14;

    (async () => {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const orders: any[] = await res.json();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - afterDays);
        const toDeliver = orders.filter(o => o.status === 'shipped' && new Date(o.createdAt) < cutoff);
        if (toDeliver.length === 0) return;
        await Promise.all(toDeliver.map(o =>
          fetch(`/api/orders/${o._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'delivered' }),
          })
        ));
        setAutoDeliverToast(`${toDeliver.length} order${toDeliver.length !== 1 ? 's' : ''} auto-archived as delivered`);
        if (autoDeliverToastTimer.current) clearTimeout(autoDeliverToastTimer.current);
        autoDeliverToastTimer.current = setTimeout(() => setAutoDeliverToast(null), 6000);
      } catch {}
    })();
    return () => {
      if (autoDeliverToastTimer.current) clearTimeout(autoDeliverToastTimer.current);
    };
  }, [settings]);

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

  const handleSaveSettings = useCallback(async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsDirty(false);
        setSettingsRefreshKey(k => k + 1);
        if (pendingTab) {
          setActiveTab(pendingTab);
          setPendingTab(null);
        }
        setShowUnsavedModal(false);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  }, [settings, pendingTab]);

  const handleDiscardSettings = useCallback(() => {
    setSettingsDirty(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowUnsavedModal(false);
    setSettingsRefreshKey(k => k + 1);
  }, [pendingTab]);

  const handleCancelNavigation = useCallback(() => {
    setShowUnsavedModal(false);
    setPendingTab(null);
  }, []);

  const handleSaveProductsPending = useCallback(async () => {
    if (!productsSaveRef.current) return;
    setIsSavingSettings(true);
    try {
      await productsSaveRef.current();
      setProductsDirty(false);
      if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); }
      setShowUnsavedModal(false);
    } finally {
      setIsSavingSettings(false);
    }
  }, [pendingTab]);

  const handleDiscardProducts = useCallback(() => {
    productsDiscardRef.current?.();
    setProductsDirty(false);
    if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); }
    setShowUnsavedModal(false);
  }, [pendingTab]);

  const handleProductsDirtyChange = useCallback((dirty: boolean, save: () => Promise<void>, discard: () => void) => {
    setProductsDirty(dirty);
    productsSaveRef.current = save;
    productsDiscardRef.current = discard;
  }, []);

  const handleTabSwitch = useCallback((tab: Tab) => {
    setMobileMoreOpen(false);
    if (activeTab === 'settings' && settingsDirty && tab !== 'settings') {
      setPendingTab(tab); setUnsavedContext('settings'); setShowUnsavedModal(true);
    } else if (activeTab === 'products' && productsDirty && tab !== 'products') {
      setPendingTab(tab); setUnsavedContext('products'); setShowUnsavedModal(true);
    } else {
      setActiveTab(tab);
    }
  }, [activeTab, settingsDirty, productsDirty]);

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

  if (loading) return <LoadingView theme={(settings?.theme as 'light' | 'dark') || 'light'} />;

  const theme = settings?.theme || 'light';
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';
  const accentColor = settings?.dashboardAccent || '#00b900';
  const accentGradient: string | null = settings?.dashboardAccentGradient || null;
  const shopInitial = (settings?.shopName || merchant?.email || 'S')[0].toUpperCase();
  const tier = merchant?.tier ?? 'free';
  const tierLabel = getTierLabel(tier);
  const couponsUnlocked = checkBooleanFeature(tier, 'discountCodes');

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-[#0f1117] text-white' : isLite ? 'bg-[#d9dfe8] text-[#2f3744]' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`} style={{ '--accent': accentColor, '--accent-gradient': accentGradient || accentColor, '--accent-text': getAccentText(accentColor) } as React.CSSProperties}>
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
      <header className={`flex items-center h-14 border-b flex-shrink-0 ${isDark ? 'bg-[#0f1117] border-[#1f2335]' : isLite ? 'bg-[#e7ecf3] border-[#cdd3dd]' : 'bg-white border-gray-200'} transition-colors duration-300`}>

        {/* Brand */}
        <div className={`flex items-center gap-3 px-5 h-full flex-shrink-0 border-r ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#cdd3dd]' : 'border-gray-200'}`}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'var(--accent-gradient)' }}>
            <MessageCircle size={16} />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold leading-tight truncate max-w-[120px] ${isDark ? 'text-white' : isLite ? 'text-[#2f3744]' : 'text-gray-900'}`}>
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

        {/* Tab navigation — desktop only */}
        <nav ref={topNavContainerRef} role="tablist" aria-label="Dashboard sections" className="hidden md:flex items-stretch h-full flex-1 overflow-x-auto relative" style={{ scrollbarWidth: 'none' }}>
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
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={`relative flex items-center gap-2 px-3 h-full text-[13px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? `${isDark ? 'text-white' : 'text-gray-900'}`
                  : `${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
              }`}
            >
              {activeTab === tab.id && (
                <span className={`absolute inset-0 rounded-none pointer-events-none ${isDark ? 'bg-accent/5' : 'bg-accent/5'}`} />
              )}
              <tab.Icon size={15} />
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
            aria-label="Refresh data"
            className={`group relative p-2.5 rounded-lg transition-all disabled:opacity-40 ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            style={isRefreshing ? { color: accentColor } : undefined}
          >
            {isRefreshing && <div className="absolute inset-0 rounded-lg blur-md pointer-events-none -z-10" style={{ background: `var(--accent-gradient)`, opacity: 0.25 }} />}
            {isRefreshing ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <span className="transition-transform duration-300 group-hover:rotate-180 inline-flex">
                <RefreshCw size={15} />
              </span>
            )}
          </button>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={handleOpenNotif}
              title="Notifications"
              aria-label={unreadNotifCount > 0 ? `Notifications, ${unreadNotifCount} unread` : 'Notifications'}
              className={`relative p-2.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <Bell size={15} />
              {unreadNotifCount > 0 && (
                <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[11px] font-black flex items-center justify-center animate-badge-pulse" style={{ background: 'var(--accent-gradient)' }}>
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div role="dialog" aria-label="Notifications" className={`absolute right-0 top-10 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl z-50 overflow-hidden animate-notif ${isDark ? 'bg-[#161925] border-[#1f2335]' : isLite ? 'bg-[#e7ecf3] border-[#cdd3dd]' : 'bg-white border-[#e2e5ef]'}`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#cdd3dd]' : 'border-[#e2e5ef]'}`}>
                  <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : isLite ? 'text-[#2f3744]' : 'text-[#3f4557]'}`}>Notifications</span>
                  <button onClick={() => setNotifOpen(false)} aria-label="Close notifications" className="text-[#8b92ad] hover:text-red-400 p-1"><X size={14} /></button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[#8b92ad] text-xs">No notifications yet</div>
                  ) : notifications.map((n: any, i: number) => {
                    const icons: Record<string, React.ReactNode> = {
                      new_order: <ShoppingBag size={13} className="text-accent" />,
                      slip_verified: <CheckCheck size={13} className="text-emerald-500" />,
                      slip_failed: <AlertTriangle size={13} className="text-amber-500" />,
                      out_of_stock: <TrendingDown size={13} className="text-red-500" />,
                    };
                    return (
                      <div key={n._id} className={`flex gap-3 px-4 py-3 border-b last:border-b-0 animate-slide-up ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#dce1ea]' : 'border-[#f4f6f9]'} ${!n.read ? isDark ? 'bg-accent/5' : isLite ? 'bg-accent/5' : 'bg-accent/[3%]' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                        <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-[#1a1d2e]' : isLite ? 'bg-[#d9dfe8]' : 'bg-[#f4f6f9]'}`}>{icons[n.type] ?? <Bell size={13} />}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] leading-snug ${isDark ? 'text-white' : isLite ? 'text-[#2f3744]' : 'text-[#1a1d2e]'}`}>{n.message}</p>
                          <p className="text-[10px] text-[#8b92ad] mt-0.5">{new Date(n.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1 pl-3 border-l ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#cdd3dd]' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveTab('feedback')}
              title="Feedback"
              aria-label="Feedback"
              aria-pressed={activeTab === 'feedback'}
              className={`p-2.5 rounded-lg transition-all ${
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
              aria-label="Settings"
              aria-pressed={activeTab === 'settings'}
              className={`p-2.5 rounded-lg transition-all ${
                activeTab === 'settings'
                  ? ''
                  : isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
              style={activeTab === 'settings' ? { background: 'var(--accent-gradient)', color: 'var(--accent-text, white)', animation: 'iconglow 3s ease-in-out infinite' } : undefined}
            >
              <SettingsIcon size={15} />
            </button>
          </div>

          <div className={`flex items-center gap-2 pl-3 border-l ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#cdd3dd]' : 'border-gray-200'}`}>
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className={`p-2.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {merchant?.paymentStatus === 'trialing' && (
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-[#1f2335]">
            <TrialExpirationBanner
              trialEndsAt={merchant.trialEndsAt ? new Date(merchant.trialEndsAt) : null}
              paymentStatus={merchant.paymentStatus as 'paid' | 'trialing' | 'unpaid'}
              tier={merchant.tier || 'pro'}
              theme={theme as 'light' | 'lite' | 'dark'}
              onUpgradeClick={() => setActiveTab('billing')}
            />
          </div>
        )}
        <div className={activeTab === 'customers' ? 'flex-1 min-h-0 flex flex-col view-enter' : 'hidden'}>
          <ErrorBoundary>
            <div className="overflow-auto">
              <div className="p-4 md:p-6 max-w-7xl mx-auto">
                <OnboardingChecklist
                  settings={settings}
                  products={[]}
                  orders={[]}
                  onNavigate={(tab, section) => {
                    setActiveTab(tab as Tab);
                    if (section) setSettingsScroll({ section, id: Date.now() });
                  }}
                  theme={theme}
                />
              </div>
            </div>
            <CustomersView theme={theme} onLimitHit={handleLimitHit} jumpToUserId={jumpToUserId} onJumpConsumed={() => setJumpToUserId(null)} jumpToOrderId={jumpToOrderId} onJumpOrderConsumed={() => setJumpToOrderId(null)} onOrderMutated={() => { setOrdersRefreshKey(k => k + 1); setReportsRefreshKey(k => k + 1); }} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'orders' ? 'flex-1 overflow-auto pt-2 pb-16 md:pb-0 view-enter' : 'hidden'}>
          <ErrorBoundary>
            <ShopOrdersView theme={theme} t={{}} localCurrency={settings?.localCurrency} onLimitHit={handleLimitHit} onViewCustomer={(userId, orderId) => { setJumpToUserId(userId); setJumpToOrderId(orderId ?? null); setActiveTab('customers'); }} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'products' ? 'flex-1 overflow-auto pb-16 md:pb-0 view-enter' : 'hidden'}>
          <ErrorBoundary>
            <ProductManagement theme={theme} t={{}} onLimitHit={handleLimitHit} onDirtyChange={handleProductsDirtyChange} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'reports' ? 'flex-1 overflow-auto pt-2 pb-16 md:pb-0 view-enter' : 'hidden'}>
          <ErrorBoundary>
            <ReportsView theme={theme} t={{}} accentColor={accentColor} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'broadcasts' ? 'flex-1 overflow-hidden flex flex-col view-enter' : 'hidden'}>
          <ErrorBoundary>
            <BroadcastsView theme={theme} t={{}} accentColor={accentColor} onLimitHit={handleLimitHit} onGoToSettings={(section) => { setActiveTab('settings'); setSettingsScroll({ section, id: Date.now() }); }} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'feedback' ? 'flex-1 min-h-0 flex flex-col view-enter' : 'hidden'}>
          <ErrorBoundary>
            <FeedbackView theme={theme} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'settings' ? 'flex-1 min-h-0 flex flex-col view-enter' : 'hidden'}>
          <ErrorBoundary>
            <SettingsView theme={theme} onSave={refreshSettings} onThemeChange={handleThemeChange} onAccentChange={handleAccentChange} scrollTrigger={settingsScroll} onDirtyChange={setSettingsDirty} refreshTrigger={settingsRefreshKey} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'coupons' ? 'flex-1 overflow-auto pt-6 pb-16 md:pb-0 view-enter' : 'hidden'}>
          <ErrorBoundary>
            <CouponsView theme={theme} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'billing' ? 'flex-1 overflow-auto pb-16 md:pb-0 view-enter' : 'hidden'}>
          <ErrorBoundary>
            <BillingSetupView theme={theme} tier={merchant?.tier || 'free'} onTierChange={(newTier) => {
              setMerchant((prev) => prev ? { ...prev, tier: newTier as any } : null);
            }} />
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'affiliate' ? 'flex-1 overflow-auto p-6 pb-16 md:pb-6 view-enter' : 'hidden'}>
          <ErrorBoundary>
            <div className="max-w-5xl">
              <h2 className={`text-2xl font-black mb-6 ${isDark ? 'text-white' : isLite ? 'text-[#2f3744]' : 'text-slate-900'}`}>
                Affiliate Program
              </h2>
              <AffiliatePanel theme={theme} />
            </div>
          </ErrorBoundary>
        </div>

        <div className={activeTab === 'storefront' ? 'flex-1 overflow-auto p-6 pb-20 md:pb-6 view-enter' : 'hidden'}>

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
          <ErrorBoundary>
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
              dashboardAccentColor={accentColor}
              onSave={handleSaveStorefront}
              onSaveSlug={handleSaveSlug}
            />
          </ErrorBoundary>
        </div>
      </main>

      {/* ── Mobile bottom navigation ── */}
      <nav aria-label="Mobile navigation" className={`md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t ${isDark ? 'bg-[#0f1117] border-[#1f2335]' : isLite ? 'bg-[#e7ecf3] border-[#cdd3dd]' : 'bg-white border-gray-200'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.filter(t => PRIMARY_TAB_IDS.includes(t.id)).map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-label={tab.label}
            onClick={() => handleTabSwitch(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-all duration-300${activeTab === tab.id ? ' scale-110' : ''}`}
            style={activeTab === tab.id ? { color: accentColor } : undefined}
          >
            <tab.Icon size={20} />
            <span className={`text-[10px] font-semibold leading-none ${activeTab === tab.id ? '' : isDark ? 'text-[#8b92ad]' : 'text-gray-400'}`}>{tab.label}</span>
          </button>
        ))}
        <button
          aria-label="More options"
          onClick={() => setMobileMoreOpen(o => !o)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors`}
          style={mobileMoreOpen || SECONDARY_TAB_IDS.includes(activeTab as Tab) ? { color: accentColor } : undefined}
        >
          <MoreHorizontal size={20} className={!mobileMoreOpen && !SECONDARY_TAB_IDS.includes(activeTab as Tab) ? isDark ? 'text-[#8b92ad]' : 'text-gray-400' : ''} />
          <span className={`text-[10px] font-semibold leading-none ${!mobileMoreOpen && !SECONDARY_TAB_IDS.includes(activeTab as Tab) ? isDark ? 'text-[#8b92ad]' : 'text-gray-400' : ''}`}>More</span>
        </button>
      </nav>

      {/* ── Mobile "More" drawer ── */}
      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMoreOpen(false)} />
          <div className={`relative rounded-t-3xl border-t p-4 pb-6 animate-drawer ${isDark ? 'bg-[#161925] border-[#1f2335]' : isLite ? 'bg-[#e7ecf3] border-[#cdd3dd]' : 'bg-white border-gray-100'}`} style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <div className={`mx-auto w-10 h-1 rounded-full mb-4 ${isDark ? 'bg-[#2d3555]' : 'bg-gray-200'}`} />
            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-[#8b92ad]' : 'text-gray-400'}`}>More</p>
            <div className="space-y-1">
              {tabs.filter(t => SECONDARY_TAB_IDS.includes(t.id)).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-semibold ${
                    activeTab === tab.id
                      ? isDark ? 'bg-accent/10 text-white' : isLite ? 'bg-accent/10' : 'bg-accent/10'
                      : isDark ? 'text-[#8b92ad] hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={activeTab === tab.id ? { color: accentColor } : undefined}
                >
                  <tab.Icon size={18} />
                  {tab.label}
                  <ChevronRight size={14} className="ml-auto opacity-40" />
                </button>
              ))}
              <div className={`my-2 border-t ${isDark ? 'border-[#1f2335]' : 'border-gray-100'}`} />
              {merchant && (
                <a
                  href={merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMoreOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-semibold ${isDark ? 'text-[#8b92ad] hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <ExternalLink size={18} />
                  View Store
                  <ChevronRight size={14} className="ml-auto opacity-40" />
                </a>
              )}
              <button
                onClick={() => handleTabSwitch('feedback')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-semibold ${activeTab === 'feedback' ? isDark ? 'bg-accent/10 text-white' : 'bg-accent/10' : isDark ? 'text-[#8b92ad] hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                style={activeTab === 'feedback' ? { color: accentColor } : undefined}
              >
                <HeartHandshake size={18} />
                Feedback
                <ChevronRight size={14} className="ml-auto opacity-40" />
              </button>
              <button
                onClick={() => handleTabSwitch('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-semibold ${activeTab === 'settings' ? isDark ? 'bg-accent/10 text-white' : 'bg-accent/10' : isDark ? 'text-[#8b92ad] hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                style={activeTab === 'settings' ? { color: accentColor } : undefined}
              >
                <SettingsIcon size={18} />
                Settings
                <ChevronRight size={14} className="ml-auto opacity-40" />
              </button>
            </div>
          </div>
        </div>
      )}

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
          open={!!upgradePrompt}
          feature={upgradePrompt.feature}
          limit={upgradePrompt.limit}
          current={upgradePrompt.current}
          theme={theme}
          onClose={() => setUpgradePrompt(null)}
        />
      )}

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        theme={theme}
        onSave={unsavedContext === 'products' ? handleSaveProductsPending : handleSaveSettings}
        onDiscard={unsavedContext === 'products' ? handleDiscardProducts : handleDiscardSettings}
        onCancel={handleCancelNavigation}
        isSaving={isSavingSettings}
      />

      {autoDeliverToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm animate-toast">
          <CheckCheck size={15} className="text-emerald-500 flex-shrink-0" />
          <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{autoDeliverToast}</span>
          <button onClick={() => setAutoDeliverToast(null)} className="text-[#8b92ad] hover:text-red-400 ml-1"><X size={13} /></button>
        </div>
      )}
    </div>
  );
}

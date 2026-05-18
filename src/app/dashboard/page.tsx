'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, ShoppingCart, Settings as SettingsIcon, BarChart3, MessageCircle, LogOut, Store, ExternalLink, Megaphone } from 'lucide-react';
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

type Tab = 'customers' | 'orders' | 'products' | 'reports' | 'broadcasts' | 'storefront' | 'settings';

interface Merchant {
  merchantId: string;
  email: string;
  shopName?: string;
  slug?: string | null;
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'customers',  label: 'Customers',  icon: <MessageCircle size={15} /> },
  { id: 'orders',     label: 'Orders',     icon: <ShoppingCart size={15} /> },
  { id: 'products',   label: 'Products',   icon: <Package size={15} /> },
  { id: 'reports',    label: 'Reports',    icon: <BarChart3 size={15} /> },
  { id: 'broadcasts', label: 'Broadcasts', icon: <Megaphone size={15} /> },
  { id: 'storefront', label: 'Storefront', icon: <Store size={15} /> },
  { id: 'settings',   label: 'Settings',   icon: <SettingsIcon size={15} /> },
];

export default function DashboardPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [settingsScroll, setSettingsScroll] = useState<{ section: string; id: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [topNavStyle, setTopNavStyle] = useState<React.CSSProperties>({});
  const topNavContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
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
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const refreshSettings = useCallback(async () => {
    const res = await fetch('/api/settings');
    if (res.ok) setSettings(await res.json());
  }, []);

  async function handleSaveStorefront(config: any) {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storefront: config }),
    });
    await refreshSettings();
  }

  async function handleLogout() {
    await fetch('/api/merchant/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  // ── Top Nav sliding underline calculator ──
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
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTopNav);
    };
  }, [activeTab, loading]);

  if (loading) return <LoadingView />;

  const theme = settings?.theme || 'light';
  const isDark = theme === 'dark';
  const shopInitial = (settings?.shopName || merchant?.email || 'S')[0].toUpperCase();

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-[#0f1117] text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-300`}>

      {/* ── Top navbar ── */}
      <header className={`flex items-center h-14 border-b flex-shrink-0 ${isDark ? 'bg-[#0f1117] border-[#1f2335]' : 'bg-white border-gray-200'} transition-colors duration-300`}>

        {/* Brand */}
        <div className={`flex items-center gap-3 px-5 h-full flex-shrink-0 border-r ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
          <div className="w-8 h-8 rounded-xl bg-[#00b900] flex items-center justify-center flex-shrink-0 shadow-sm">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className={`text-sm font-semibold leading-tight truncate max-w-[140px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {settings?.shopName || 'My Shop'}
            </p>
            <p className={`text-[10px] font-medium ${isDark ? 'text-[#8b92ad]' : 'text-gray-400'}`}>Dashboard</p>
          </div>
        </div>

        {/* Tab navigation — underline style */}
        <nav ref={topNavContainerRef} className="flex items-stretch h-full flex-1 overflow-x-auto relative" style={{ scrollbarWidth: 'none' }}>
          {/* Smooth Sliding Underline Indicator */}
          <div 
            className={`absolute bottom-0 h-[2px] bg-[#00b900] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10 ${
              topNavStyle.width ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              left: topNavStyle.left,
              width: topNavStyle.width,
            }}
          />
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 h-full text-[13px] font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? `${isDark ? 'text-white' : 'text-gray-900'}`
                  : `${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
              }`}
            >
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
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-[#2d3555]'
                  : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <ExternalLink size={12} />
              View Store
            </a>
          )}

          <div className={`flex items-center gap-2 pl-3 border-l ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
            <div className="w-8 h-8 rounded-full bg-[#00b900]/10 border border-[#00b900]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[#00b900] text-xs font-bold">{shopInitial}</span>
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
        <div className={activeTab === 'customers' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
          <CustomersView theme={theme} />
        </div>
        
        <div className={activeTab === 'orders' ? 'flex-1 overflow-auto pt-2' : 'hidden'}>
          <ShopOrdersView theme={theme} t={{}} />
        </div>
        
        <div className={activeTab === 'products' ? 'flex-1 overflow-auto' : 'hidden'}>
          <ProductManagement theme={theme} t={{}} />
        </div>
        
        <div className={activeTab === 'reports' ? 'flex-1 overflow-auto pt-2' : 'hidden'}>
          <ReportsView theme={theme} t={{}} />
        </div>
        
        <div className={activeTab === 'broadcasts' ? 'flex-1 overflow-hidden flex flex-col' : 'hidden'}>
          <BroadcastsView theme={theme} t={{}} />
        </div>
        
        <div className={activeTab === 'settings' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
          <SettingsView theme={theme} onSave={refreshSettings} scrollTrigger={settingsScroll} />
        </div>
        
        <div className={activeTab === 'storefront' ? 'flex-1 overflow-auto p-6' : 'hidden'}>
          <div className="mb-6">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Storefront customization</h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Choose a theme, set your brand colors, and configure what customers see at{' '}
              {merchant && (
                <a
                  href={merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
                  target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline"
                >
                  {merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
                </a>
              )}
            </p>
          </div>
          <StorefrontCustomizer
            shopName={settings?.shopName || 'My Shop'}
            initial={settings?.storefront}
            onSave={handleSaveStorefront}
          />
        </div>
      </main>
      <FloatingGuide
        theme={theme}
        nudgeUp={activeTab === 'settings'}
        onNavigate={(tab, section) => {
          setActiveTab(tab);
          if (section) setSettingsScroll({ section, id: Date.now() });
        }}
      />
    </div>
  );
}

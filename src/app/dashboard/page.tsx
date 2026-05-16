'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, ShoppingCart, Settings as SettingsIcon, BarChart3, MessageCircle, LogOut, Store, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProductManagement from '@/components/ProductManagement';
import SettingsView from '@/components/SettingsView';
import ReportsView from '@/components/ReportsView';
import ShopOrdersView from '@/components/ShopOrdersView';
import StorefrontCustomizer from '@/components/StorefrontCustomizer';
import CustomersView from '@/components/CustomersView';
import LoadingView from '@/components/LoadingView';

type Tab = 'customers' | 'orders' | 'products' | 'reports' | 'storefront' | 'settings';

interface Merchant {
  merchantId: string;
  email: string;
  shopName?: string;
  slug?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [loading, setLoading] = useState(true);

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

  if (loading) return <LoadingView />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'customers', label: 'Customers', icon: <MessageCircle size={14} /> },
    { id: 'orders',    label: 'Orders',    icon: <ShoppingCart size={14} /> },
    { id: 'products',  label: 'Products',  icon: <Package size={14} /> },
    { id: 'reports',   label: 'Reports',   icon: <BarChart3 size={14} /> },
    { id: 'storefront',label: 'Storefront',icon: <Store size={14} /> },
    { id: 'settings',  label: 'Settings',  icon: <SettingsIcon size={14} /> },
  ];

  const theme = settings?.theme || 'light';
  const isDark = theme === 'dark';
  const nb = isDark ? 'glass-dark border-white/5' : 'bg-white border-gray-100 shadow-sm';

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'premium-gradient text-white' : 'bg-[#fcfdfe] text-slate-900'} transition-colors duration-700`}>

      {/* ── Top navbar ── */}
      <header className={`flex items-center gap-6 px-6 h-16 border-b flex-shrink-0 ${nb} backdrop-blur-xl z-50 sticky top-0`}>

        {/* Brand */}
        <div className="flex items-center gap-3 mr-4 flex-shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#00b900] to-[#008a00] flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20">
            <MessageCircle size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className={`font-black text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {settings?.shopName || 'Shopenter'}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest opacity-40`}>Management</span>
          </div>
        </div>

        {/* Tab pills */}
        <nav className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar py-1" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#00b900] text-white shadow-lg shadow-green-500/20 active:scale-95'
                  : isDark
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className={activeTab === tab.id ? 'text-white' : 'opacity-70'}>{tab.icon}</div>
              <span className="hidden sm:inline uppercase tracking-widest text-[10px]">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: storefront link + sign out */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          {merchant && (
            <a
              href={merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all bg-slate-900 text-white hover:bg-black active:scale-95 shadow-lg shadow-black/10 ${isDark ? 'bg-white/5 hover:bg-white/10' : ''}`}
            >
              <ExternalLink size={13} />
              <span className="hidden md:inline uppercase tracking-widest text-[10px]">View Store</span>
            </a>
          )}
          <div className={`w-px h-6 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`p-2.5 rounded-xl transition-all hover:bg-red-50 hover:text-red-500 active:scale-90 ${isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-slate-400'}`}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'customers'  && <CustomersView theme={theme} />}
        {activeTab === 'orders'     && <div className="flex-1 overflow-auto pt-2"><ShopOrdersView theme={theme} t={{}} /></div>}
        {activeTab === 'products'   && <div className="flex-1 overflow-auto"><ProductManagement theme={theme} t={{}} /></div>}
        {activeTab === 'reports'    && <div className="flex-1 overflow-auto pt-2"><ReportsView theme={theme} t={{}} /></div>}
        {activeTab === 'settings'   && <div className="flex-1 overflow-auto"><SettingsView theme={theme} onSave={refreshSettings} /></div>}
        {activeTab === 'storefront' && (
          <div className="flex-1 overflow-auto p-6">
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
        )}
      </main>
    </div>
  );
}

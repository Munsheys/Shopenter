'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

type Tab = 'customers' | 'orders' | 'products' | 'reports' | 'broadcasts' | 'storefront' | 'settings';

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
    { id: 'customers',  label: 'Customers',  icon: <MessageCircle size={15} /> },
    { id: 'orders',     label: 'Orders',     icon: <ShoppingCart size={15} /> },
    { id: 'products',   label: 'Products',   icon: <Package size={15} /> },
    { id: 'reports',    label: 'Reports',    icon: <BarChart3 size={15} /> },
    { id: 'broadcasts', label: 'Broadcasts', icon: <Megaphone size={15} /> },
    { id: 'storefront', label: 'Storefront', icon: <Store size={15} /> },
    { id: 'settings',   label: 'Settings',   icon: <SettingsIcon size={15} /> },
  ];

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
        <nav className="flex items-stretch h-full flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 h-full text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? `border-[#00b900] ${isDark ? 'text-white' : 'text-gray-900'}`
                  : `border-transparent ${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
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
        {activeTab === 'customers'  && <CustomersView theme={theme} />}
        {activeTab === 'orders'     && <div className="flex-1 overflow-auto pt-2"><ShopOrdersView theme={theme} t={{}} /></div>}
        {activeTab === 'products'   && <div className="flex-1 overflow-auto"><ProductManagement theme={theme} t={{}} /></div>}
        {activeTab === 'reports'    && <div className="flex-1 overflow-auto pt-2"><ReportsView theme={theme} t={{}} /></div>}
        {activeTab === 'broadcasts' && <div className="flex-1 overflow-hidden flex flex-col"><BroadcastsView theme={theme} t={{}} /></div>}
        {activeTab === 'settings'   && <div className="flex-1 overflow-auto"><SettingsView theme={theme} onSave={refreshSettings} onNavigate={setActiveTab} /></div>}
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

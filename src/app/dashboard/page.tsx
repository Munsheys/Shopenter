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
  const nb = isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-gray-200';

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-[#0f1117] text-white' : 'bg-gray-50 text-gray-900'}`}>

      {/* ── Top navbar ── */}
      <header className={`flex items-center gap-2 px-3 h-11 border-b flex-shrink-0 ${nb}`}>

        {/* Brand */}
        <div className="flex items-center gap-2 mr-3 flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={11} className="text-white" />
          </div>
          <span className={`font-bold text-sm hidden sm:block truncate max-w-[130px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {settings?.shopName || 'My Shop'}
          </span>
        </div>

        {/* Tab pills */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white shadow-sm'
                  : isDark
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: storefront link + sign out */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {merchant && (
            <a
              href={merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-green-500 ${isDark ? 'hover:bg-white/5' : 'hover:bg-green-50'}`}
            >
              <ExternalLink size={12} />
              <span className="hidden md:inline">Store</span>
            </a>
          )}
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <LogOut size={15} />
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

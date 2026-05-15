'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, ShoppingCart, Settings as SettingsIcon, BarChart3, MessageCircle, LogOut, Menu, Store, ExternalLink } from 'lucide-react';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      body: JSON.stringify({ storefront: config })
    });
    await refreshSettings();
  }

  async function handleLogout() {
    await fetch('/api/merchant/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) return <LoadingView />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'customers', label: 'Customers', icon: <MessageCircle size={18} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
    { id: 'products', label: 'Products', icon: <Package size={18} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
    { id: 'storefront', label: 'Storefront', icon: <Store size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  const theme = settings?.theme || 'light';
  const isDark = theme === 'dark';
  const sidebar = isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-gray-200';
  const navBtn = (active: boolean) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
    active ? 'bg-green-500 text-white' : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'
  }`;

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#0f1117] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 flex flex-col border-r transition-transform duration-200 ${sidebar} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex`}>
        <div className={`p-4 border-b ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
              <MessageCircle size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm truncate">{settings?.shopName || 'My Shop'}</span>
          </div>
          <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{merchant?.email}</p>
          {merchant && (
            <a
              href={merchant.slug ? `/shop/${merchant.slug}` : `/merchant/${merchant.merchantId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1.5 text-xs text-green-500 hover:text-green-400 font-medium"
            >
              <ExternalLink size={11} /> {merchant.slug ? `/shop/${merchant.slug}` : 'View storefront'}
            </a>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} className={navBtn(activeTab === tab.id)}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={`p-3 border-t ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
          <button onClick={handleLogout} className={navBtn(false)}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`md:hidden flex items-center gap-3 px-4 py-3 border-b ${sidebar}`}>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm">{tabs.find(t => t.id === activeTab)?.label}</span>
        </header>

        <main className="flex-1 overflow-auto flex flex-col">
          {activeTab === 'customers' && <CustomersView theme={theme} />}
          {activeTab === 'orders' && <ShopOrdersView theme={theme} t={{}} />}
          {activeTab === 'products' && <ProductManagement theme={theme} t={{}} />}
          {activeTab === 'reports' && <ReportsView theme={theme} t={{}} />}
          {activeTab === 'settings' && <SettingsView theme={theme} onSave={refreshSettings} />}
          {activeTab === 'storefront' && (
            <div className="p-6">
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
    </div>
  );
}

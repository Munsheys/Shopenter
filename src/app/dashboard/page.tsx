'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, ShoppingCart, Settings as SettingsIcon, BarChart3, MessageCircle, LogOut, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProductManagement from '@/components/ProductManagement';
import SettingsView from '@/components/SettingsView';
import ReportsView from '@/components/ReportsView';
import ShopOrdersView from '@/components/ShopOrdersView';
import LoadingView from '@/components/LoadingView';

type Tab = 'orders' | 'products' | 'reports' | 'settings';

interface Merchant {
  merchantId: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('orders');
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

  async function handleLogout() {
    await fetch('/api/merchant/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) return <LoadingView />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
    { id: 'products', label: 'Products', icon: <Package size={18} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> }
  ];

  const theme = settings?.theme || 'light';
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#0f1117] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-56 flex flex-col border-r transition-transform duration-200
        ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-gray-200'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex
      `}>
        <div className={`p-4 border-b ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
              <MessageCircle size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm">{settings?.shopName || 'My Shop'}</span>
          </div>
          <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{merchant?.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white'
                  : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={`p-3 border-t ${isDark ? 'border-[#1f2335]' : 'border-gray-200'}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className={`md:hidden flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-gray-200'}`}>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm">{tabs.find(t => t.id === activeTab)?.label}</span>
        </header>

        <main className="flex-1 overflow-auto">
          {activeTab === 'orders' && (
            <ShopOrdersView theme={theme} t={{}} />
          )}
          {activeTab === 'products' && (
            <ProductManagement theme={theme} t={{}} />
          )}
          {activeTab === 'reports' && (
            <ReportsView theme={theme} t={{}} />
          )}
          {activeTab === 'settings' && (
            <SettingsView theme={theme} onSave={refreshSettings} />
          )}
        </main>
      </div>
    </div>
  );
}

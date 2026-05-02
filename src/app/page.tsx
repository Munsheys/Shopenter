"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings as SettingsIcon, 
} from 'lucide-react';
import SetupView from '@/components/SetupView';

export default function AdminGateway() {
  const [liffState, setLiffState] = useState<'loading' | 'admin' | 'unauthorized'>('loading');
  const [shopInfo, setShopInfo] = useState<any>(null);

  const initLiffRouter = useCallback(async () => {
    try {
      const checkRes = await fetch('/api/shop-info', { cache: 'no-store' });
      if (!checkRes.ok) {
        console.error("Failed to fetch settings:", await checkRes.text());
        return; 
      }
      const checkData = await checkRes.json();
      setShopInfo(checkData);
      const isConfigured = !!checkData.liffId;

      if (!isConfigured) {
        setLiffState('admin'); 
        setShopInfo(null); 
        return;
      }

      const secret = localStorage.getItem('admin_secret');
      if (!secret) {
        setLiffState('unauthorized');
        return;
      }

      const headers = { 'x-admin-secret': secret || '' };
      const verifyRes = await fetch('/api/customers', { headers, cache: 'no-store' });
      if (verifyRes.status === 401) {
        localStorage.removeItem('admin_secret');
        setLiffState('unauthorized');
        return;
      }

      // Success -> Redirect to the actual dashboard
      window.location.href = '/admin';
    } catch (err) {
      console.error("Auth gate failed:", err);
      setLiffState('unauthorized');
    }
  }, []);

  useEffect(() => {
    initLiffRouter();
  }, [initLiffRouter]);

  if (liffState === 'loading') {
    return (
      <div className="h-screen w-full bg-[#1a1d2e] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00b900]/20 border-t-[#00b900] rounded-full animate-spin mb-6"></div>
        <p className="text-[#8b92ad] text-xs font-bold tracking-widest uppercase animate-pulse">Initializing Secure Session...</p>
      </div>
    );
  }

  if (liffState === 'unauthorized') {
    return (
      <div className="h-screen w-full bg-[#1a1d2e] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00b900]/5 rounded-full -mr-16 -mt-16"></div>
          <div className="w-20 h-20 bg-[#f8f9fc] rounded-3xl mx-auto mb-8 flex items-center justify-center text-[#00b900]">
            <SettingsIcon size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#1a1d2e] mb-2">Administrative Login</h2>
          <p className="text-sm text-[#8b92ad] mb-10">Please enter your master secret key to access the dashboard.</p>
          
          <input 
            type="password"
            autoFocus
            placeholder="••••••••"
            className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-5 px-6 text-center text-2xl tracking-[0.5em] outline-none focus:border-[#00b900] transition-all mb-4 font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                localStorage.setItem('admin_secret', (e.target as HTMLInputElement).value);
                window.location.reload();
              }
            }}
          />
          <p className="text-[10px] text-[#8b92ad]">Press Enter to Unlock</p>
          <div className="mt-8 pt-8 border-t border-gray-100">
            <button 
              onClick={async () => {
                if (confirm("🚨 This will DELETE all database settings and start fresh. Continue?")) {
                  const res = await fetch('/api/settings', { 
                    method: 'DELETE', 
                    headers: { 'x-admin-secret': 'FORCE_RESET_UNAUTHENTICATED' } 
                  });
                  if (res.ok) window.location.reload();
                }
              }}
              className="text-[10px] text-red-400 hover:text-red-600 font-bold tracking-widest uppercase"
            >
              Emergency Factory Reset
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (liffState === 'admin') {
    const isSetupRequired = !shopInfo?.liffId || !shopInfo?.adminLineId;
    if (isSetupRequired) {
      return <SetupView onComplete={() => window.location.reload()} />;
    }
  }

  return (
    <div className="h-screen w-full bg-[#1a1d2e] flex flex-col items-center justify-center text-white">
      <div className="w-16 h-16 border-4 border-[#00b900]/20 border-t-[#00b900] rounded-full animate-spin mb-6"></div>
      <p className="text-[#8b92ad] text-xs font-bold tracking-widest uppercase animate-pulse">Redirecting to Dashboard...</p>
    </div>
  );
}

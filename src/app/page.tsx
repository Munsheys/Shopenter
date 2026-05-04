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
        return;
      }

      // If configured, root always redirects to the shop for the best customer UX
      window.location.href = '/shop';
    } catch (err) {
      console.error("Auth gate failed:", err);
      // Fallback to shop if anything fails but we think it's configured
      window.location.href = '/shop';
    }
  }, []);

  useEffect(() => {
    initLiffRouter();
  }, [initLiffRouter]);

  if (liffState === 'loading') {
    return (
      <div className="h-screen w-full bg-[#0a0d14] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00b900]/20 border-t-[#00b900] rounded-full animate-spin mb-6"></div>
        <p className="text-[#8b92ad] text-xs font-bold tracking-widest uppercase animate-pulse">Entering Storefront...</p>
      </div>
    );
  }

  if (liffState === 'admin') {
    return <SetupView onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="h-screen w-full bg-[#0a0d14] flex flex-col items-center justify-center text-white">
      <div className="w-16 h-16 border-4 border-[#00b900]/20 border-t-[#00b900] rounded-full animate-spin mb-6"></div>
      <p className="text-[#8b92ad] text-xs font-bold tracking-widest uppercase animate-pulse">Redirecting to Shop...</p>
    </div>
  );
}

"use client";

import React from 'react';
import { Package } from 'lucide-react';

export default function LoadingView({ 
  message = "Loading Data...", 
  theme = 'light' 
}: { 
  message?: string, 
  theme?: 'light' | 'dark' 
}) {
  return (
    <div className={cn(
      "max-w-4xl mx-auto h-[60vh] flex flex-col items-center justify-center animate-in fade-in duration-500 transition-colors",
      theme === 'dark' ? "text-white" : "text-[#1a1d2e]"
    )}>
      <div className="relative">
        <div className={cn(
          "w-20 h-20 border-4 rounded-full animate-spin",
          theme === 'dark' ? "border-white/10 border-t-[#00b900]" : "border-[#00b900]/10 border-t-[#00b900]"
        )}></div>
        <div className="absolute inset-0 flex items-center justify-center text-[#00b900] animate-pulse">
          <Package size={24} />
        </div>
      </div>
      <p className="mt-6 text-xs font-bold text-[#8b92ad] uppercase tracking-[0.2em] animate-pulse">{message}</p>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

"use client";

import React from 'react';

export default function LoadingView({ 
  message = "Loading Data...", 
  theme = 'light' 
}: { 
  message?: string, 
  theme?: 'light' | 'dark' 
}) {
  const isDark = theme === 'dark';
  
  return (
    <div className={`w-full max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes shimmerSweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-card {
          background: ${isDark ? 'linear-gradient(90deg, #1b2030 25%, #232a3f 37%, #1b2030 63%)' : 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%)'};
          background-size: 200% 100%;
          animation: shimmerSweep 1.6s infinite linear;
        }
      `}</style>

      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="w-1/3 h-8 rounded-lg shimmer-card" />
        <div className="w-1/2 h-4 rounded-md shimmer-card opacity-60" />
      </div>

      {/* Nav skeleton */}
      <div className="flex gap-2 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div className="w-24 h-8 rounded-lg shimmer-card" />
        <div className="w-24 h-8 rounded-lg shimmer-card opacity-80" />
        <div className="w-24 h-8 rounded-lg shimmer-card opacity-60" />
        <div className="w-24 h-8 rounded-lg shimmer-card opacity-40" />
      </div>

      {/* Content cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-1/4 h-5 rounded-md shimmer-card" />
            <div className="space-y-2">
              <div className="w-full h-10 rounded-xl shimmer-card" />
              <div className="w-full h-10 rounded-xl shimmer-card" />
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-1/3 h-5 rounded-md shimmer-card" />
            <div className="space-y-3">
              <div className="w-full h-12 rounded-xl shimmer-card" />
              <div className="w-2/3 h-4 rounded-md shimmer-card" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-1/2 h-5 rounded-md shimmer-card" />
            <div className="w-full h-32 rounded-xl shimmer-card" />
          </div>
        </div>
      </div>

      {/* Floating loading feedback */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="w-2 h-2 rounded-full bg-[#00b900] animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-[#00b900] animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-[#00b900] animate-bounce" />
        <span className="text-xs font-bold text-[#8b92ad] uppercase tracking-[0.2em] ml-1">{message}</span>
      </div>
    </div>
  );
}

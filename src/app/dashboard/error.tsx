"use client";

import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export default function AdminErrorBoundary({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }, 
  reset: () => void 
}) {
  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-[#161925] border border-[#1f2335] rounded-[40px] p-10 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16"></div>
        
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl mx-auto mb-8 flex items-center justify-center text-red-500">
          <SettingsIcon size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">System Exception</h2>
        <p className="text-sm text-[#8b92ad] mb-8">
          The administrative dashboard encountered an unexpected error.
        </p>

        <div className="bg-[#0a0d14] border border-[#1f2335] rounded-2xl p-4 mb-8 text-left overflow-auto max-h-48 text-xs font-mono text-red-400">
          {error.message || "Unknown client-side exception occurred."}
        </div>
        
        <button 
          onClick={() => reset()}
          className="w-full bg-white text-black font-bold tracking-widest uppercase py-4 rounded-2xl hover:bg-white/90 transition-colors"
        >
          Attempt Recovery
        </button>

        <div className="mt-6">
          <button 
            onClick={() => window.location.href = '/'}
            className="text-[10px] text-[#8b92ad] hover:text-white font-bold tracking-widest uppercase transition-colors"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    </div>
  );
}

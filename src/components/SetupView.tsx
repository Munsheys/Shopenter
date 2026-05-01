"use client";

import React, { useState } from 'react';
import { ShieldCheck, Rocket, Settings, Key, User } from 'lucide-react';

export default function SetupView({ onComplete }: { onComplete: () => void }) {
  const [formData, setFormData] = useState({
    shopName: '',
    liffId: '',
    adminLineId: '',
    lineChannelAccessToken: '',
    lineChannelSecret: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleSave = async () => {
    if (!formData.liffId || !formData.adminLineId) {
      alert("LIFF ID and Admin LINE ID are required to secure the system.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || ''
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert("System Activated Successfully! The security bouncer is now active.");
        onComplete();
      } else {
        const errorData = await res.json();
        alert(`Activation Failed: ${errorData.error || res.statusText} (Status: ${res.status})`);
      }
    } catch (err) {
      alert("Error connecting to database.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl shadow-[#00b90011] border border-[#e2e5ef] overflow-hidden">
        <div className="bg-[#00b900] p-12 text-white text-center relative overflow-hidden">
           {/* Background Decorations */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-20 -mb-20 blur-2xl"></div>
           
           <div className="relative z-10">
             <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl mx-auto mb-6 flex items-center justify-center">
               <ShieldCheck size={40} />
             </div>
             <h1 className="text-3xl font-bold mb-2">System Activation</h1>
             <p className="text-white/80 text-sm max-w-[300px] mx-auto">
               Welcome! Your CRM is ready, but the security bouncer needs to be configured.
             </p>
             
             {/* Quick Guide Trigger */}
             <div className="mt-8">
                <button 
                  onClick={() => setShowGuide(!showGuide)}
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/20"
                >
                  {showGuide ? "Hide Setup Guide" : "Help: Where do I find these IDs?"}
                </button>
             </div>
           </div>
        </div>

        {showGuide && (
          <div className="bg-[#f8f9fc] p-8 border-b border-[#e2e5ef] animate-in slide-in-from-top duration-300">
             <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-[#00b900]">
               <Settings size={16} /> 3-Minute Setup Guide
             </h3>
             <div className="space-y-6">
                <div className="flex gap-4">
                   <div className="w-6 h-6 bg-[#00b900] text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">1</div>
                   <div>
                      <div className="text-[11px] font-bold text-[#1a1d2e] mb-1">LIFF ID</div>
                      <p className="text-[10px] text-[#8b92ad] leading-relaxed">
                        Go to the <strong>LINE Developers Console</strong>, select your Provider, and create a <strong>LIFF App</strong>. Set the Endpoint URL to your Vercel URL. Copy the LIFF ID.
                      </p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="w-6 h-6 bg-[#00b900] text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">2</div>
                   <div>
                      <div className="text-[11px] font-bold text-[#1a1d2e] mb-1">Admin LINE ID</div>
                      <p className="text-[10px] text-[#8b92ad] leading-relaxed">
                        Inside your LIFF settings, scroll down to the bottom. Your <strong>User ID</strong> (starts with <code>U...</code>) is your Admin ID. This locks the dashboard to YOUR account.
                      </p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="w-6 h-6 bg-[#00b900] text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">3</div>
                   <div>
                      <div className="text-[11px] font-bold text-[#1a1d2e] mb-1">Messaging API (Optional)</div>
                      <p className="text-[10px] text-[#8b92ad] leading-relaxed">
                        Create a <strong>Messaging API</strong> channel to enable the chatbot features. Copy the Channel Access Token and Secret from there.
                      </p>
                   </div>
                </div>
             </div>
          </div>
        )}

        <div className="p-12 space-y-8">
           <div className="bg-[#fff1f0] border border-[#ffa39e] p-4 rounded-2xl flex items-start gap-3">
              <div className="text-red-500 mt-0.5">⚠️</div>
              <div className="text-xs text-[#cf1322] leading-relaxed">
                <strong>No Admin Detected:</strong> Currently, anyone with the URL can access this dashboard. Fill in the fields below to lock the system to your personal LINE account.
              </div>
           </div>

           <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-widest mb-2 block">Store Name</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]"><Rocket size={18}/></div>
                  <input 
                    type="text" 
                    value={formData.shopName}
                    onChange={e => setFormData({...formData, shopName: e.target.value})}
                    placeholder="Enter Store Name (e.g. Munsheys)"
                    className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#00b900] transition-all placeholder:text-[#b0b7c3] text-[#1a1d2e] font-medium" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-widest mb-2 block">LIFF ID (Required)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]"><Key size={18}/></div>
                    <input 
                      type="text" 
                      value={formData.liffId}
                      onChange={e => setFormData({...formData, liffId: e.target.value})}
                      placeholder="Paste your LIFF ID here"
                      className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#00b900] transition-all text-sm placeholder:text-[#b0b7c3] text-[#1a1d2e] font-medium" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-widest mb-2 block">Admin LINE ID (Required)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]"><User size={18}/></div>
                    <input 
                      type="text" 
                      value={formData.adminLineId}
                      onChange={e => setFormData({...formData, adminLineId: e.target.value})}
                      placeholder="U123456789..."
                      className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#00b900] transition-all text-sm placeholder:text-[#b0b7c3] text-[#1a1d2e] font-medium" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-[#00b900] text-white py-5 rounded-3xl font-bold shadow-xl shadow-[#00b90033] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Rocket size={20} />
                      Activate System Security
                    </>
                  )}
                </button>
              </div>
           </div>

           <p className="text-center text-[10px] text-[#8b92ad] leading-relaxed px-10">
             By activating, you agree that only the LINE account matching the Admin ID above will be able to access this dashboard. All other users will be redirected to the storefront.
           </p>
        </div>
      </div>
    </div>
  );
}

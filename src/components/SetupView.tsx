"use client";

import React, { useState } from 'react';
import { ShieldCheck, Rocket, Settings, Key, User } from 'lucide-react';

export default function SetupView({ onComplete }: { onComplete: () => void }) {
  const [formData, setFormData] = useState({
    name: 'My Store',
    liffId: '',
    adminLineId: '',
    lineChannelAccessToken: '',
    lineChannelSecret: ''
  });
  const [isSaving, setIsSaving] = useState(false);

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
        alert("Failed to save settings. Please check your ADMIN_SECRET.");
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
           </div>
        </div>

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
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. My Premium Store"
                    className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#00b900] transition-all" 
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
                      placeholder="200...-abc..."
                      className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#00b900] transition-all text-sm" 
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
                      placeholder="U1234567..."
                      className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#00b900] transition-all text-sm" 
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

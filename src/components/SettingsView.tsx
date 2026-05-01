"use client";

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, X, Save } from 'lucide-react';

export default function SettingsView() {
  const [settings, setSettings] = useState<any>(null);
  const [newCompany, setNewCompany] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => setSettings(data));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (field: string, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  const removeCompany = (company: string) => {
    updateSetting('shippingCompanies', settings.shippingCompanies.filter((c: string) => c !== company));
  };

  const addCompany = () => {
    if (!newCompany) return;
    updateSetting('shippingCompanies', [...(settings.shippingCompanies || []), newCompany]);
    setNewCompany('');
  };

  if (!settings) return (
    <div className="flex items-center justify-center h-64 text-[#8b92ad]">
      Loading settings...
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
        <SettingsIcon size={28} className="text-[#8b92ad]" /> Settings
      </h2>

      <div className="bg-white rounded-3xl border border-[#e2e5ef] p-8 shadow-sm">
        <div className="mb-8">
          <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Shop Name</label>
          <input 
            type="text" 
            value={settings.shopName || ''} 
            onChange={(e) => updateSetting('shopName', e.target.value)}
            placeholder="e.g. Auto-Market"
            className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900] transition-all" 
          />
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">KRW/THB Rate</label>
            <input 
              type="number" 
              step="0.0001"
              value={settings.krwRate || 0} 
              onChange={(e) => updateSetting('krwRate', parseFloat(e.target.value))}
              className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900] transition-all" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Primary Color</label>
            <div className="flex gap-2">
              <input 
                type="color" 
                value={settings.primaryColor || '#00b900'} 
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                className="w-12 h-11 border border-[#e2e5ef] rounded-xl p-1 outline-none focus:border-[#00b900]" 
              />
              <input 
                type="text" 
                value={settings.primaryColor || '#00b900'} 
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                className="flex-1 border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900]" 
              />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">SHIPPING COMPANIES</label>
          <div className="flex flex-wrap gap-2 mb-3">
             {settings.shippingCompanies?.map((c: string, i: number) => (
               <div key={i} className="flex items-center gap-2 bg-[#f4f6f9] border border-[#e2e5ef] px-3 py-1.5 rounded-full text-xs font-semibold">
                 {c} <button onClick={() => removeCompany(c)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
               </div>
             ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Add shipping company..." 
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="flex-1 border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900]" 
            />
            <button onClick={addCompany} className="bg-[#00b900] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all">
              <Plus size={18} /> Add
            </button>
          </div>
        </div>

        <div className="mb-8">
          <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">SENDER ADDRESS</label>
          <textarea 
            rows={3} 
            value={settings.senderAddress || ''} 
            onChange={(e) => updateSetting('senderAddress', e.target.value)}
            className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900] resize-none transition-all" 
          />
        </div>

        <div className="mb-10">
          <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">TRACKING TEMPLATE</label>
          <div className="relative">
             <textarea 
               rows={6} 
               value={settings.trackingTemplate || ''} 
               onChange={(e) => updateSetting('trackingTemplate', e.target.value)}
               className="w-full border border-[#e2e5ef] rounded-xl px-4 py-4 text-sm font-medium outline-none focus:border-[#00b900] resize-none leading-relaxed transition-all" 
             />
             <div className="mt-2 text-[10px] text-[#8b92ad]">Placeholders: &#123;tracking&#125;, &#123;courier&#125;, &#123;product&#125;</div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#00b900] disabled:opacity-50 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#00b90033] hover:opacity-90 active:scale-[0.99] transition-all"
        >
           {isSaving ? "Saving..." : <><Save size={18} /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}

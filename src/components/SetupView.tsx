"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Rocket, Settings, Key, User, Zap, Eye, EyeOff } from 'lucide-react';

export default function SetupView({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    shopName: '',
    liffId: '',
    adminLineId: '',
    lineChannelAccessToken: '',
    lineChannelSecret: '',
    adminSecret: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showLiff, setShowLiff] = useState(false);
  const [showAdminId, setShowAdminId] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.liffId || !formData.adminLineId || !formData.adminSecret) {
      setFormError('LIFF ID, Admin LINE ID, and Admin Secret are all required to secure the system.');
      return;
    }

    if (formData.adminSecret.length < 8) {
      setFormError('Admin Secret must be at least 8 characters for security.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': formData.adminSecret
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        router.push('/admin');
      } else {
        const errorData = await res.json();
        setFormError(`Activation failed: ${errorData.error || res.statusText} (Status: ${res.status})`);
      }
    } catch {
      setFormError('Could not connect to the database. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl shadow-accent/[7%] border border-[#e2e5ef] overflow-hidden">
        <div className="p-12 text-white text-center relative overflow-hidden" style={{ background: 'var(--accent-gradient)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" aria-hidden="true"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-20 -mb-20 blur-2xl" aria-hidden="true"></div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl mx-auto mb-6 flex items-center justify-center">
              <ShieldCheck size={40} aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold mb-2">System Activation</h1>
            <p className="text-white/80 text-sm max-w-[300px] mx-auto">
              Welcome! Your CRM is ready, but the security bouncer needs to be configured.
            </p>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                aria-expanded={showGuide}
                aria-controls="setup-guide-content"
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold transition-all border border-white/20"
              >
                {showGuide ? "Hide Setup Guide" : "Help: Where do I find these IDs?"}
              </button>
            </div>
          </div>
        </div>

        {showGuide && (
          <div id="setup-guide-content" className="bg-[#f8f9fc] p-8 border-b border-[#e2e5ef] animate-in slide-in-from-top duration-300">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-accent">
              <Settings size={16} aria-hidden="true" /> 3-Minute Setup Guide
            </h3>
            <ol className="space-y-6">
              <li className="flex gap-4">
                <div className="w-6 h-6 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black" style={{ background: 'var(--accent-gradient)' }} aria-hidden="true">1</div>
                <div>
                  <div className="text-[11px] font-bold text-[#1a1d2e] mb-1">LIFF ID (LINE Login Channel)</div>
                  <p className="text-[11px] text-[#8b92ad] leading-relaxed">
                    Go to the <strong>LINE Developers Console</strong>, select your Provider, and create a <strong>LINE Login</strong> channel. Create a LIFF App inside it. Copy the LIFF ID.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-6 h-6 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black" style={{ background: 'var(--accent-gradient)' }} aria-hidden="true">2</div>
                <div>
                  <div className="text-[11px] font-bold text-[#1a1d2e] mb-1">Admin LINE ID</div>
                  <p className="text-[11px] text-[#8b92ad] leading-relaxed">
                    Inside your LIFF settings, scroll down to the bottom. Your <strong>User ID</strong> (starts with <code>U...</code>) is your Admin ID.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-6 h-6 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black" style={{ background: 'var(--accent-gradient)' }} aria-hidden="true">3</div>
                <div>
                  <div className="text-[11px] font-bold text-[#1a1d2e] mb-1">Secrets (Messaging API Channel)</div>
                  <p className="text-[11px] text-[#8b92ad] leading-relaxed">
                    <span className="text-red-500 font-bold">Important:</span> Create a <strong>Messaging API</strong> channel. Copy the Channel Access Token and Secret from THERE, not the Login channel.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}

        <form onSubmit={handleSave} className="p-12 space-y-8">
          <div className="bg-[#fff1f0] border border-[#ffa39e] p-4 rounded-2xl flex items-start gap-3">
            <div className="text-red-500 mt-0.5" aria-hidden="true">⚠️</div>
            <div className="text-xs text-[#cf1322] leading-relaxed">
              <strong>No Admin Detected:</strong> Currently, anyone with the URL can access this dashboard. Fill in the fields below to lock the system to your personal LINE account.
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{formError}</p>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="setup-shopname" className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest mb-2 block">Store Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" aria-hidden="true"><Rocket size={18}/></div>
                <input
                  id="setup-shopname"
                  type="text"
                  value={formData.shopName}
                  onChange={e => setFormData({...formData, shopName: e.target.value})}
                  placeholder="Enter Store Name"
                  className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-accent transition-all placeholder:text-[#b0b7c3] text-[#1a1d2e] font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="setup-liffid" className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest mb-2 block">LIFF ID (Login Channel)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" aria-hidden="true"><Key size={18}/></div>
                  <input
                    id="setup-liffid"
                    type={showLiff ? "text" : "password"}
                    value={formData.liffId}
                    onChange={e => setFormData({...formData, liffId: e.target.value})}
                    placeholder="Paste your LIFF ID"
                    className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-accent transition-all text-sm placeholder:text-[#b0b7c3] text-[#1a1d2e] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLiff(!showLiff)}
                    aria-label={showLiff ? 'Hide LIFF ID' : 'Show LIFF ID'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b92ad] hover:text-[#1a1d2e] p-1"
                  >
                    {showLiff ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="setup-adminlineid" className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest mb-2 block">Admin LINE ID (U...)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" aria-hidden="true"><User size={18}/></div>
                  <input
                    id="setup-adminlineid"
                    type="text"
                    value={formData.adminLineId}
                    onChange={e => setFormData({...formData, adminLineId: e.target.value})}
                    placeholder="U123456789..."
                    className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-accent transition-all text-sm placeholder:text-[#b0b7c3] text-[#1a1d2e] font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="setup-adminsecret" className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest block ml-1">Admin Secret (Master Password)</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-accent" aria-hidden="true">
                  <ShieldCheck size={20} />
                </div>
                <input
                  id="setup-adminsecret"
                  type={showAdminId ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Create your Admin Secret (min 8 chars)..."
                  className="w-full bg-[#f8fafc] border border-[#e2e5ef] rounded-2xl py-4 pl-14 pr-12 outline-none focus:border-accent transition-all font-mono text-sm text-[#1a1d2e]"
                  value={formData.adminSecret}
                  onChange={(e) => setFormData({ ...formData, adminSecret: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminId(!showAdminId)}
                  aria-label={showAdminId ? 'Hide Admin Secret' : 'Show Admin Secret'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b92ad] hover:text-[#1a1d2e] p-1"
                >
                  {showAdminId ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-[#e2e5ef]" />
                <span className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest whitespace-nowrap">Messaging API Provider</span>
                <div className="flex-1 h-px bg-[#e2e5ef]" />
              </div>
              <p className="text-[11px] text-[#8b92ad] leading-relaxed">
                <span className="text-red-500 font-bold">Important:</span> Use keys from the <strong>Messaging API</strong> channel only.
              </p>

              <div>
                <label htmlFor="setup-channelsecret" className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest mb-2 block">Channel Secret (Basic Settings Tab)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" aria-hidden="true"><Key size={18}/></div>
                  <input
                    id="setup-channelsecret"
                    type={showSecret ? "text" : "password"}
                    value={formData.lineChannelSecret}
                    onChange={e => setFormData({...formData, lineChannelSecret: e.target.value})}
                    placeholder="32 character secret"
                    className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-accent transition-all text-sm font-mono placeholder:text-[#b0b7c3] text-[#1a1d2e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    aria-label={showSecret ? 'Hide Channel Secret' : 'Show Channel Secret'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b92ad] hover:text-[#1a1d2e] p-1"
                  >
                    {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="setup-accesstoken" className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest mb-2 block">Access Token (Messaging API Tab)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" aria-hidden="true"><Key size={18}/></div>
                  <input
                    id="setup-accesstoken"
                    type={showToken ? "text" : "password"}
                    value={formData.lineChannelAccessToken}
                    onChange={e => setFormData({...formData, lineChannelAccessToken: e.target.value})}
                    placeholder="Very long long-lived token"
                    className="w-full bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-accent transition-all text-sm font-mono placeholder:text-[#b0b7c3] text-[#1a1d2e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    aria-label={showToken ? 'Hide Access Token' : 'Show Access Token'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b92ad] hover:text-[#1a1d2e] p-1"
                  >
                    {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full text-white py-5 rounded-3xl font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                style={{ background: 'var(--accent-gradient)' }}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" role="status" aria-label="Activating..."></div>
                ) : (
                  <>
                    <Zap size={20} aria-hidden="true" />
                    Activate System Security
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#8b92ad] leading-relaxed px-10">
            By activating, you agree that only the LINE account matching the Admin ID above will be able to access this dashboard.
          </p>
        </form>
      </div>
    </div>
  );
}

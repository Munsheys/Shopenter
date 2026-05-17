"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings as SettingsIcon, Plus, X, Save, Eye, EyeOff, Copy, Check,
  ExternalLink, RefreshCw, MessageSquare, Package, Zap, Loader2, AlertTriangle, Bell,
} from 'lucide-react';
import LoadingView from './LoadingView';

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] font-medium text-[#00b900] hover:text-[#00a000] flex-shrink-0 transition-colors"
    >
      {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
    </button>
  );
}

type SectionId = 'general' | 'line' | 'payment' | 'shipping' | 'notifications';

interface LineStatus {
  configured: boolean;
  valid?: boolean;
  error?: string;
  bot?: { displayName: string; basicId: string; chatMode: string };
  tier?: 'unverified' | 'verified' | 'premium';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsView({
  theme,
  onSave,
}: {
  theme?: 'light' | 'dark';
  onSave?: () => void;
}) {
  const isDark = theme === 'dark';

  // Scroll container + active-section tracking
  const containerRef               = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('general');

  // Data
  const [settings, setSettings]   = useState<any>(null);
  const [newCompany, setNewCompany] = useState('');

  const [isSaving,   setIsSaving]   = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [saveError,  setSaveError]  = useState('');

  // Visibility toggles
  const [showToken,       setShowToken]       = useState(false);
  const [showSecret,      setShowSecret]      = useState(false);
  const [showLiff,        setShowLiff]        = useState(false);
  const [showSlipKey,     setShowSlipKey]     = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);

  // Exchange rate
  const [webhookUrl,    setWebhookUrl]    = useState('');
  const [fetchingRate,  setFetchingRate]  = useState(false);
  const [liveRateError, setLiveRateError] = useState('');

  // LINE status
  const [lineStatus,   setLineStatus]   = useState<LineStatus | null>(null);
  const [checkingLine, setCheckingLine] = useState(false);

  const checkLine = useCallback(async () => {
    setCheckingLine(true);
    setLineStatus(null);
    try {
      const res = await fetch('/api/line-status');
      if (res.ok) setLineStatus(await res.json());
    } catch {}
    finally { setCheckingLine(false); }
  }, []);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
    setWebhookUrl(`${window.location.origin}/api/webhook`);
    checkLine();
  }, [checkLine]);

  // Scroll → active section
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ids: SectionId[] = ['general', 'line', 'payment', 'shipping', 'notifications'];
    function onScroll() {
      const top = container!.scrollTop + 110;
      let active: SectionId = 'general';
      for (const id of ids) {
        const el = container!.querySelector<HTMLElement>(`#${id}`);
        if (el && el.offsetTop <= top) active = id;
      }
      setActiveSection(active);
    }
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(id: SectionId) {
    const container = containerRef.current;
    const el = container?.querySelector<HTMLElement>(`#${id}`);
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 68, behavior: 'smooth' });
      setActiveSection(id);
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        onSave?.();
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setSaveError('Failed to save. Please try again.');
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchLiveRate = async () => {
    setFetchingRate(true); setLiveRateError('');
    try {
      const res  = await fetch(`/api/rate?from=${settings.importCurrency || 'KRW'}&to=${settings.localCurrency || 'THB'}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      set('krwRate', data.rate);
    } catch (e: any) { setLiveRateError(e.message || 'Could not fetch live rate'); }
    finally { setFetchingRate(false); }
  };

  const set = (field: string, value: any) =>
    setSettings((s: any) => ({ ...s, [field]: value }));

  const removeCompany = (c: string) =>
    set('shippingCompanies', settings.shippingCompanies.filter((x: string) => x !== c));

  const addCompany = () => {
    if (!newCompany.trim()) return;
    set('shippingCompanies', [...(settings.shippingCompanies || []), newCompany.trim()]);
    setNewCompany('');
  };

  if (!settings) return <LoadingView theme={theme} message="Loading Settings…" />;

  // ── Style tokens ─────────────────────────────────────────────────────────────
  const K = {
    bg:      isDark ? 'bg-[#0f1117]'                          : 'bg-slate-50',
    surface: isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200',
    text:    isDark ? 'text-white'                            : 'text-slate-900',
    muted:   isDark ? 'text-[#8b92ad]'                       : 'text-slate-500',
    border:  isDark ? 'border-[#1f2335]'                     : 'border-slate-200',
    inp:     isDark
      ? 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad] focus:border-[#00b900] focus:outline-none'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#00b900] focus:outline-none',
  };

  const inputCls  = `w-full rounded-xl px-4 py-3 text-sm border transition-colors ${K.inp}`;
  const inputMono = `${inputCls} font-mono text-xs pr-12`;
  const lbl       = `block text-[10px] font-bold uppercase tracking-widest mb-2 ${K.muted}`;
  const hint      = `text-[10px] mt-1 ml-1 ${K.muted}`;

  const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
    { id: 'general',       label: 'General',       icon: <SettingsIcon  size={13} /> },
    { id: 'line',          label: 'LINE',          icon: <MessageSquare size={13} /> },
    { id: 'payment',       label: 'Payment',       icon: <Zap           size={13} /> },
    { id: 'shipping',      label: 'Shipping',      icon: <Package       size={13} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell          size={13} /> },
  ];

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${K.bg}`}>
    <div ref={containerRef} className="flex-1 overflow-y-auto">

      {/* ── Sticky scroll-nav ─────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-10 px-6 pt-4 pb-3 ${K.bg}`}>
        <div className={`flex items-center gap-1 p-1 rounded-xl ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-slate-100'}`}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                activeSection === s.id
                  ? 'bg-[#00b900] text-white shadow-sm'
                  : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s.icon}{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── All sections on one page ──────────────────────────────────────── */}
      <div className="px-6 pb-10 max-w-3xl mx-auto space-y-16">

        {/* ══ GENERAL ══════════════════════════════════════════════════════ */}
        <div id="general" className="space-y-6 pt-2">
          <div className="flex items-center gap-2 pb-1">
            <SettingsIcon size={15} className="text-[#00b900]" />
            <h2 className={`text-base font-bold ${K.text}`}>General</h2>
          </div>

          {/* Shop identity */}
          <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
            <p className={`text-sm font-semibold ${K.text}`}>Shop Identity</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>Shop Name</label>
                <input type="text" value={settings.shopName || ''} onChange={e => set('shopName', e.target.value)} placeholder="My Awesome Shop" className={inputCls} autoComplete="off" />
                <p className={hint}>Shown on storefront and all outgoing messages</p>
              </div>
              <div>
                <label className={lbl}>Theme</label>
                <div className={`flex p-1 rounded-xl ${isDark ? 'bg-[#0f1117]' : 'bg-slate-100'}`}>
                  {(['light', 'dark'] as const).map(t => (
                    <button key={t} onClick={() => set('theme', t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${settings.theme === t ? 'bg-[#00b900] text-white shadow-sm' : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Currency */}
          <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
            <div>
              <p className={`text-sm font-semibold ${K.text}`}>Currency & Exchange Rate</p>
              <p className={`text-xs mt-1 ${K.muted}`}>Set defaults for cost and selling price. Override cost currency per order.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>Cost Currency</label>
                <select value={settings.importCurrency || 'KRW'} onChange={e => set('importCurrency', e.target.value)} className={inputCls}>
                  {['THB','KRW','USD','EUR','JPY','CNY','GBP','HKD','SGD','TWD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className={hint}>Currency you pay when sourcing</p>
              </div>
              <div>
                <label className={lbl}>Selling Currency</label>
                <select value={settings.localCurrency || 'THB'} onChange={e => set('localCurrency', e.target.value)} className={inputCls}>
                  {['THB','USD','EUR','GBP','JPY','SGD','MYR','PHP','IDR','VND'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className={hint}>Currency customers pay in</p>
              </div>
            </div>

            <div>
              <label className={lbl}>Rate Source</label>
              <div className={`flex p-1 rounded-xl w-fit ${isDark ? 'bg-[#0f1117]' : 'bg-slate-100'}`}>
                {([false, true] as const).map(isLive => (
                  <button key={String(isLive)} type="button" onClick={() => set('useAutoRate', isLive)}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${(settings.useAutoRate ?? false) === isLive ? 'bg-[#00b900] text-white shadow-sm' : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                    {isLive ? 'Live (auto)' : 'Manual'}
                  </button>
                ))}
              </div>
              <p className={hint}>{settings.useAutoRate ? 'Fetched automatically each calculation' : 'Uses your fixed rate below'}</p>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 md:max-w-xs">
                <label className={lbl}>1 {settings.importCurrency || 'KRW'} = ? {settings.localCurrency || 'THB'}</label>
                <input type="number" step="0.0001" min="0" value={settings.krwRate ?? 0.026} onChange={e => set('krwRate', parseFloat(e.target.value) || 0)} className={inputCls} disabled={settings.useAutoRate} />
              </div>
              <button type="button" onClick={handleFetchLiveRate} disabled={fetchingRate}
                className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 disabled:opacity-50 ${isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white hover:border-[#00b900]' : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-[#00b900]'}`}>
                <RefreshCw size={14} className={fetchingRate ? 'animate-spin' : ''} />
                {fetchingRate ? 'Fetching…' : 'Fetch live rate'}
              </button>
            </div>
            {liveRateError && <p className="text-xs text-red-400">{liveRateError}</p>}
          </div>

        </div>

        {/* ══ LINE ═════════════════════════════════════════════════════════ */}
        <div id="line" className="space-y-6">
          <div className="flex items-center gap-2 pb-1">
            <MessageSquare size={15} className="text-[#00b900]" />
            <h2 className={`text-base font-bold ${K.text}`}>LINE Integration</h2>
          </div>

          {/* Connection status */}
          <div className={`rounded-2xl p-5 space-y-3 ${K.surface}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${K.text}`}>Connection Status</p>
              <button onClick={checkLine} disabled={checkingLine}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}>
                <RefreshCw size={11} className={checkingLine ? 'animate-spin' : ''} /> Test Connection
              </button>
            </div>
            {checkingLine && (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#00b900]" />
                <span className={`text-sm ${K.muted}`}>Checking…</span>
              </div>
            )}
            {!checkingLine && lineStatus && (
              lineStatus.configured && lineStatus.valid ? (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">{lineStatus.bot?.displayName}</p>
                    <p className={`text-xs ${K.muted}`}>
                      {lineStatus.bot?.basicId} · {lineStatus.tier ?? 'unverified'}
                      {lineStatus.bot?.chatMode === 'chat' && ' · Chat mode (auto-reply paused)'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-400">
                      {!lineStatus.configured ? 'Token not configured' : 'Invalid credentials'}
                    </p>
                    {lineStatus.error && <p className={`text-xs mt-0.5 ${K.muted}`}>{lineStatus.error}</p>}
                  </div>
                </div>
              )
            )}
            {!checkingLine && !lineStatus && (
              <p className={`text-xs ${K.muted}`}>Press "Test Connection" to verify your LINE channel.</p>
            )}
          </div>

          {/* Webhook URL */}
          <div className={`rounded-2xl p-5 space-y-3 ${K.surface}`}>
            <div>
              <p className={`text-sm font-semibold ${K.text}`}>Webhook URL</p>
              <p className={`text-xs mt-0.5 ${K.muted}`}>Paste into LINE Developer Console → Messaging API → Webhook settings.</p>
            </div>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
              <code className={`flex-1 text-xs font-mono truncate ${isDark ? 'text-[#00b900]' : 'text-green-700'}`}>{webhookUrl}</code>
              <CopyButton value={webhookUrl} />
              <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1 text-[10px] ${K.muted} hover:text-[#00b900] transition-colors flex-shrink-0`}>
                Console <ExternalLink size={10} />
              </a>
            </div>
          </div>

          {/* Credentials */}
          <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
            <div>
              <p className={`text-sm font-semibold ${K.text}`}>Messaging API Credentials</p>
              <p className={`text-xs mt-1 ${K.muted}`}>Use credentials from your <strong>Messaging API</strong> channel only — not a LINE Login channel.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>Channel Secret <span className={`normal-case font-normal ${K.muted}`}>(Basic Settings tab)</span></label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} value={settings.lineChannelSecret || ''} onChange={e => set('lineChannelSecret', e.target.value)} placeholder="32-character hex string" className={inputMono} autoComplete="new-password" name="line-secret" />
                  <button type="button" onClick={() => setShowSecret(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className={hint}>Verifies webhook requests from LINE</p>
              </div>
              <div>
                <label className={lbl}>Channel Access Token <span className={`normal-case font-normal ${K.muted}`}>(Messaging API tab)</span></label>
                <div className="relative">
                  <input type={showToken ? 'text' : 'password'} value={settings.lineChannelAccessToken || ''} onChange={e => set('lineChannelAccessToken', e.target.value)} placeholder="Long-lived access token" className={inputMono} autoComplete="new-password" name="line-token" />
                  <button type="button" onClick={() => setShowToken(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>
                    {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className={hint}>Authorises messages, QR codes, broadcasts, Rich Menu</p>
              </div>
            </div>
            <div className={`px-4 py-3 rounded-xl text-xs ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              <strong>Note:</strong> Fields appear empty for security — saved values are never returned. Leave blank to keep current value; type to update.
            </div>
          </div>

          {/* LIFF & Admin */}
          <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
            <p className={`text-sm font-semibold ${K.text}`}>LIFF & Admin</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>LIFF ID</label>
                <div className="relative">
                  <input type={showLiff ? 'text' : 'password'} value={settings.liffId || ''} onChange={e => set('liffId', e.target.value)} placeholder="1234567890-AbCdEfGh" className={inputMono} autoComplete="new-password" name="liff-id" />
                  <button type="button" onClick={() => setShowLiff(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>
                    {showLiff ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className={hint}>Lets customers log in with LINE on your storefront</p>
              </div>
              <div>
                <label className={lbl}>Admin LINE User ID</label>
                <input type="text" value={settings.adminLineId || ''} onChange={e => set('adminLineId', e.target.value)} placeholder="U1234567890abcdef…" className={`${inputCls} font-mono text-xs`} autoComplete="off" name="admin-line-id" />
                <p className={hint}>Receives order alerts and notifications</p>
              </div>
            </div>
            <div className="md:w-1/2">
              <label className={lbl}>Admin Secret</label>
              <div className="relative">
                <input type={showAdminSecret ? 'text' : 'password'} value={settings.adminSecret || ''} onChange={e => set('adminSecret', e.target.value)} placeholder="e.g. my-secret-phrase" className={inputMono} autoComplete="new-password" name="admin-secret" />
                <button type="button" onClick={() => setShowAdminSecret(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>
                  {showAdminSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className={hint}>Required to use admin-only bot commands via LINE chat</p>
            </div>
          </div>

        </div>

        {/* ══ PAYMENT ══════════════════════════════════════════════════════ */}
        <div id="payment" className="space-y-6">
          <div className="flex items-center gap-2 pb-1">
            <Zap size={15} className="text-[#00b900]" />
            <h2 className={`text-base font-bold ${K.text}`}>Payment</h2>
          </div>

          <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
            <p className={`text-sm font-semibold ${K.text}`}>PromptPay</p>
            <div className="md:w-1/2">
              <label className={lbl}>PromptPay ID (phone or national ID)</label>
              <input type="text" value={settings.promptPayId || ''} onChange={e => set('promptPayId', e.target.value)} placeholder="e.g. 0812345678" className={inputCls} autoComplete="off" />
              <p className={hint}>Used to generate payment QR codes sent to customers</p>
            </div>
          </div>

          <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
            <div>
              <p className={`text-sm font-semibold ${K.text}`}>Payment Confirmation Message</p>
              <p className={`text-xs mt-1 ${K.muted}`}>Sent automatically after a slip is verified.</p>
            </div>
            <textarea rows={5} value={settings.paymentTemplate || ''} onChange={e => set('paymentTemplate', e.target.value)} className={`${inputCls} resize-none leading-relaxed`} autoComplete="off" />
            <p className={`text-[10px] ${K.muted}`}>Placeholders: <code>{'{product}'}</code> <code>{'{amount}'}</code> <code>{'{name}'}</code></p>
          </div>

          <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>SlipOK — Slip Verification</p>
                <p className={`text-xs mt-0.5 ${K.muted}`}>Automatically verifies bank transfer slips. Leave blank to skip.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>Branch ID</label>
                <input type="text" value={settings.slipokBranchId || ''} onChange={e => set('slipokBranchId', e.target.value)} placeholder="e.g. 12345" className={inputCls} autoComplete="off" name="slipok-branch" />
              </div>
              <div>
                <label className={lbl}>API Key</label>
                <div className="relative">
                  <input type={showSlipKey ? 'text' : 'password'} value={settings.slipokApiKey || ''} onChange={e => set('slipokApiKey', e.target.value)} placeholder="sk_live_…" className={inputMono} autoComplete="new-password" name="slipok-key" />
                  <button type="button" onClick={() => setShowSlipKey(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>
                    {showSlipKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ══ SHIPPING ═════════════════════════════════════════════════════ */}
        <div id="shipping" className="space-y-6">
          <div className="flex items-center gap-2 pb-1">
            <Package size={15} className="text-[#00b900]" />
            <h2 className={`text-base font-bold ${K.text}`}>Shipping</h2>
          </div>

          <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
            <p className={`text-sm font-semibold ${K.text}`}>Shipping Companies</p>
            <div className="flex flex-wrap gap-2">
              {settings.shippingCompanies?.map((c: string, i: number) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                  {c}
                  <button onClick={() => removeCompany(c)} className="text-red-400 hover:text-red-300 transition-colors"><X size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Add shipping company…" value={newCompany} onChange={e => setNewCompany(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCompany(); }} className={`${inputCls} flex-1`} autoComplete="off" />
              <button onClick={addCompany} className="bg-[#00b900] text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#00a000] transition-all flex-shrink-0">
                <Plus size={15} /> Add
              </button>
            </div>
          </div>

          <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
            <p className={`text-sm font-semibold ${K.text}`}>Sender Address</p>
            <textarea rows={3} value={settings.senderAddress || ''} onChange={e => set('senderAddress', e.target.value)} placeholder="Your shop's return / sender address" className={`${inputCls} resize-none`} autoComplete="off" />
          </div>

          <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
            <div>
              <p className={`text-sm font-semibold ${K.text}`}>Shipping Notification Message</p>
              <p className={`text-xs mt-1 ${K.muted}`}>Sent when you mark an order as shipped.</p>
            </div>
            <textarea rows={6} value={settings.trackingTemplate || ''} onChange={e => set('trackingTemplate', e.target.value)} className={`${inputCls} resize-none leading-relaxed`} autoComplete="off" />
            <p className={`text-[10px] ${K.muted}`}>Placeholders: <code>{'{tracking}'}</code> <code>{'{courier}'}</code> <code>{'{product}'}</code> <code>{'{name}'}</code></p>
          </div>

        </div>

        {/* ══ NOTIFICATIONS ════════════════════════════════════════════════ */}
        <div id="notifications" className="space-y-6">
          <div className="flex items-center gap-2 pb-1">
            <Bell size={15} className="text-[#00b900]" />
            <h2 className={`text-base font-bold ${K.text}`}>Notifications</h2>
          </div>

          <div className={`rounded-2xl p-6 space-y-2 ${K.surface}`}>
            <div className="mb-4">
              <p className={`text-sm font-semibold ${K.text}`}>Order Status Notifications</p>
              <p className={`text-xs mt-1 ${K.muted}`}>Automatically send a LINE message when an order moves to each stage. Uses placeholders: <code>{'{product}'}</code> <code>{'{amount}'}</code> <code>{'{tracking}'}</code> <code>{'{courier}'}</code> <code>{'{name}'}</code></p>
            </div>

            {([
              { key: 'paid',      label: 'Order Confirmed',   sub: 'When payment is received' },
              { key: 'preparing', label: 'Being Prepared',    sub: 'When order moves to preparing' },
              { key: 'shipped',   label: 'Shipped',           sub: 'When tracking number is entered' },
              { key: 'delivered', label: 'Delivered',         sub: 'When marked as delivered' },
            ] as const).map(({ key, label, sub }) => {
              const stage = settings.orderNotifications?.[key] ?? {};
              return (
                <div key={key} className={`rounded-xl border p-4 space-y-3 ${K.border}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${K.text}`}>{label}</p>
                      <p className={`text-xs ${K.muted}`}>{sub}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => set('orderNotifications', {
                        ...settings.orderNotifications,
                        [key]: { ...stage, enabled: !stage.enabled },
                      })}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${stage.enabled ? 'bg-[#00b900]' : isDark ? 'bg-[#1a1d2e]' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${stage.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {stage.enabled && (
                    <textarea
                      rows={4}
                      value={stage.template ?? ''}
                      onChange={e => set('orderNotifications', {
                        ...settings.orderNotifications,
                        [key]: { ...stage, template: e.target.value },
                      })}
                      className={`${inputCls} resize-none leading-relaxed text-xs`}
                      autoComplete="off"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>

    {/* ── Persistent save bar ──────────────────────────────────────────── */}
    <div className={`flex-shrink-0 flex items-center justify-between gap-4 px-6 py-3 border-t ${isDark ? 'bg-[#0f1117] border-[#1f2335]' : 'bg-white border-slate-200'}`}>
      <span className={`text-xs ${saveError ? 'text-red-400' : saved ? 'text-emerald-400' : K.muted}`}>
        {saveError || (saved ? 'All changes saved.' : 'Changes save across all sections.')}
      </span>
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 active:scale-[0.99] transition-all flex-shrink-0 ${
          saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#00b900] hover:bg-[#00a000]'
        }`}
      >
        {isSaving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
        {isSaving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
    </div>
  );
}

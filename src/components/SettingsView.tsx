"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon, Plus, X, Save, Eye, EyeOff, Copy, Check,
  ExternalLink, RefreshCw, BookOpen, MessageSquare, Hand, LayoutGrid,
  Store, Package, ArrowRight, Loader2, AlertTriangle, Megaphone, Zap,
  Globe,
} from 'lucide-react';
import LoadingView from './LoadingView';

// ── Style helpers ─────────────────────────────────────────────────────────────

function CopyButton({ value, isDark }: { value: string; isDark: boolean }) {
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

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionId = 'guide' | 'general' | 'line' | 'payment' | 'shipping';
type DashTab = 'customers' | 'orders' | 'products' | 'reports' | 'broadcasts' | 'storefront' | 'settings';

type GuideAction =
  | { kind: 'href';    label: string; href: string }
  | { kind: 'section'; label: string; tab: SectionId }
  | { kind: 'nav';     label: string; tab: DashTab };

interface GuideStep {
  n: number;
  done: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: GuideAction | null;
}

interface LineStatus {
  configured: boolean;
  valid?: boolean;
  error?: string;
  bot?: { displayName: string; basicId: string; chatMode: string };
  tier?: 'unverified' | 'verified' | 'premium';
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsView({
  theme, onSave, onNavigate,
}: {
  theme?: 'light' | 'dark';
  onSave?: () => void;
  onNavigate?: (tab: DashTab) => void;
}) {
  const isDark = theme === 'dark';

  const [settings, setSettings] = useState<any>(null);
  const [section, setSection] = useState<SectionId>('guide');
  const [newCompany, setNewCompany] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // visibility toggles
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showLiff, setShowLiff] = useState(false);
  const [showSlipKey, setShowSlipKey] = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [fetchingRate, setFetchingRate] = useState(false);
  const [liveRateError, setLiveRateError] = useState('');

  // LINE status
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [checkingLine, setCheckingLine] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
    setWebhookUrl(`${window.location.origin}/api/webhook`);
  }, []);

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
    if (section === 'guide' || section === 'line') checkLine();
  }, [section, checkLine]);

  const handleSave = async () => {
    setIsSaving(true); setSaveError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) { onSave?.(); }
      else { setSaveError('Failed to save. Please try again.'); }
    } catch { setSaveError('Network error. Please try again.'); }
    finally { setIsSaving(false); }
  };

  const handleFetchLiveRate = async () => {
    setFetchingRate(true); setLiveRateError('');
    try {
      const res = await fetch(`/api/rate?from=${settings.importCurrency || 'KRW'}&to=${settings.localCurrency || 'THB'}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      set('krwRate', data.rate);
    } catch (e: any) { setLiveRateError(e.message || 'Could not fetch live rate'); }
    finally { setFetchingRate(false); }
  };

  const set = (field: string, value: any) => setSettings((s: any) => ({ ...s, [field]: value }));
  const removeCompany = (c: string) => set('shippingCompanies', settings.shippingCompanies.filter((x: string) => x !== c));
  const addCompany = () => {
    if (!newCompany.trim()) return;
    set('shippingCompanies', [...(settings.shippingCompanies || []), newCompany.trim()]);
    setNewCompany('');
  };

  if (!settings) return <LoadingView theme={theme} message="Loading Settings…" />;

  // ── Tokens ──────────────────────────────────────────────────────────────────
  const K = {
    bg:      isDark ? 'bg-[#0f1117]'                           : 'bg-slate-50',
    surface: isDark ? 'bg-[#161925] border border-[#1f2335]'  : 'bg-white border border-slate-200',
    deep:    isDark ? 'bg-[#1a1d2e] border border-[#1f2335]'  : 'bg-slate-50 border border-slate-200',
    text:    isDark ? 'text-white'                             : 'text-slate-900',
    muted:   isDark ? 'text-[#8b92ad]'                        : 'text-slate-500',
    border:  isDark ? 'border-[#1f2335]'                      : 'border-slate-200',
    inp:     isDark
      ? 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad] focus:border-[#00b900] focus:outline-none'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#00b900] focus:outline-none',
  };

  const inputCls  = `w-full rounded-xl px-4 py-3 text-sm border transition-colors ${K.inp}`;
  const inputMono = `${inputCls} font-mono text-xs pr-12`;
  const lbl       = `block text-[10px] font-bold uppercase tracking-widest mb-2 ${K.muted}`;
  const hint      = `text-[10px] mt-1 ml-1 ${K.muted}`;

  const SaveBtn = () => (
    <button onClick={handleSave} disabled={isSaving}
      className="w-full bg-[#00b900] disabled:opacity-50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#00a000] active:scale-[0.99] transition-all">
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {isSaving ? 'Saving…' : 'Save Changes'}
    </button>
  );

  // ── Guide step completion ────────────────────────────────────────────────────
  const lineOk = lineStatus?.configured && lineStatus?.valid;
  const steps: GuideStep[] = [
    {
      n: 1, done: true, icon: <Check size={15} />,
      title: 'Account created',
      desc:  'Your shop account is set up and ready to use.',
      action: null,
    },
    {
      n: 2, done: !!(settings.shopName && settings.shopName !== 'My Shop'),
      icon: <Store size={15} />,
      title: 'Set your shop name & theme',
      desc:  'Give your store a recognizable name. It appears on your storefront and in messages.',
      action: { kind: 'section', label: 'Go to General', tab: 'general' },
    },
    {
      n: 3, done: !!lineOk, icon: <MessageSquare size={15} />,
      title: 'Connect your LINE Official Account',
      desc:  'Add your Channel Access Token and Channel Secret so the dashboard can send messages.',
      action: { kind: 'section', label: 'Go to LINE', tab: 'line' },
    },
    {
      n: 4, done: false, icon: <Globe size={15} />,
      title: 'Set the webhook URL in LINE Console',
      desc:  'Paste your webhook URL into Messaging API → Webhook settings so customer messages arrive.',
      action: { kind: 'href', label: 'Open LINE Console', href: 'https://developers.line.biz/' },
    },
    {
      n: 5, done: !!settings.promptPayId, icon: <Zap size={15} />,
      title: 'Add your PromptPay ID',
      desc:  'Lets customers scan a QR code to pay. Required for the "Send QR" order action.',
      action: { kind: 'section', label: 'Go to Payment', tab: 'payment' },
    },
    {
      n: 6, done: false, icon: <Package size={15} />,
      title: 'Add your first product',
      desc:  'Go to the Products tab and add at least one item to your catalog.',
      action: { kind: 'nav', label: 'Go to Products', tab: 'products' },
    },
    {
      n: 7, done: false, icon: <Store size={15} />,
      title: 'Customize your storefront',
      desc:  'Pick a theme, upload a banner & logo so customers see a branded shop page.',
      action: { kind: 'nav', label: 'Go to Storefront', tab: 'storefront' },
    },
    {
      n: 8, done: !!settings.greetingEnabled, icon: <Hand size={15} />,
      title: 'Set a greeting message',
      desc:  'Automatically welcome new followers when they add your LINE OA — sent free via reply token.',
      action: { kind: 'nav', label: 'Go to Broadcasts', tab: 'broadcasts' },
    },
    {
      n: 9, done: false, icon: <MessageSquare size={15} />,
      title: 'Create keyword auto-reply rules',
      desc:  'Instant, free replies triggered by customer keywords — no quota used.',
      action: { kind: 'nav', label: 'Go to Broadcasts', tab: 'broadcasts' },
    },
    {
      n: 10, done: false, icon: <LayoutGrid size={15} />,
      title: 'Design a Rich Menu',
      desc:  'A persistent tap menu at the bottom of the LINE chat — great for product links and CTAs.',
      action: { kind: 'nav', label: 'Go to Broadcasts', tab: 'broadcasts' },
    },
    {
      n: 11, done: false, icon: <Megaphone size={15} />,
      title: 'Run your first broadcast',
      desc:  'Send a message to all customers at once — or queue one for free delivery via reply tokens.',
      action: { kind: 'nav', label: 'Go to Broadcasts', tab: 'broadcasts' },
    },
  ];

  const doneCount = steps.filter(s => s.done).length;

  // ── Section tabs ─────────────────────────────────────────────────────────────
  const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
    { id: 'guide',    label: 'Setup Guide', icon: <BookOpen size={14} /> },
    { id: 'general',  label: 'General',     icon: <SettingsIcon size={14} /> },
    { id: 'line',     label: 'LINE',        icon: <MessageSquare size={14} /> },
    { id: 'payment',  label: 'Payment',     icon: <Zap size={14} /> },
    { id: 'shipping', label: 'Shipping',    icon: <Package size={14} /> },
  ];

  return (
    <div className={`flex-1 overflow-y-auto ${K.bg} p-6 space-y-6`}>

      {/* ── Tabs ── */}
      <div className={`flex items-center gap-1 p-1 rounded-xl flex-wrap ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-slate-100'}`}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center min-w-[90px] ${
              section === s.id
                ? 'bg-[#00b900] text-white shadow-sm'
                : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>

      {/* ══ GUIDE ══════════════════════════════════════════════════════════════ */}
      {section === 'guide' && (
        <div className="max-w-3xl space-y-4">
          {/* Header + progress */}
          <div className={`rounded-2xl p-5 ${K.surface}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Getting Started</p>
                <p className={`text-xs mt-0.5 ${K.muted}`}>Complete these steps to get your shop fully operational.</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100'} ${K.muted}`}>
                {doneCount}/{steps.length} done
              </span>
            </div>
            <div className={`h-2 rounded-full ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100'}`}>
              <div
                className="h-2 rounded-full bg-[#00b900] transition-all"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map(step => (
              <div key={step.n} className={`rounded-2xl px-5 py-4 flex items-center gap-4 transition-all ${K.surface} ${step.done ? 'opacity-60' : ''}`}>
                {/* Number / check */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  step.done
                    ? 'bg-[#00b900]/10 text-[#00b900]'
                    : isDark ? 'bg-[#1a1d2e] text-[#8b92ad]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {step.done ? <Check size={14} /> : step.n}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${K.text} ${step.done ? 'line-through opacity-60' : ''}`}>{step.title}</p>
                  <p className={`text-xs mt-0.5 ${K.muted}`}>{step.desc}</p>
                </div>

                {/* Action */}
                {!step.done && step.action && (() => {
                  const a = step.action!;
                  const cls = `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[#00b900]/30 text-[#00b900] hover:bg-[#00b900]/10 transition-colors flex-shrink-0 whitespace-nowrap`;
                  if (a.kind === 'href') return (
                    <a href={a.href} target="_blank" rel="noopener noreferrer" className={cls}>
                      {a.label} <ExternalLink size={10} />
                    </a>
                  );
                  if (a.kind === 'nav') return (
                    <button onClick={() => onNavigate?.(a.tab)} className={cls}>
                      {a.label} <ArrowRight size={10} />
                    </button>
                  );
                  return (
                    <button onClick={() => setSection(a.tab)} className={cls}>
                      {a.label} <ArrowRight size={10} />
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* Helpful links */}
          <div className={`rounded-2xl p-5 space-y-3 ${K.surface}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${K.muted}`}>Helpful links</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'LINE Developer Console', href: 'https://developers.line.biz/' },
                { label: 'LINE OA Manager',         href: 'https://manager.line.biz' },
                { label: 'LINE Sticker List',        href: 'https://developers.line.biz/en/docs/messaging-api/sticker-list/' },
                { label: 'Messaging API Reference',  href: 'https://developers.line.biz/en/docs/messaging-api/' },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-[#2d3555]' : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'}`}>
                  {link.label}
                  <ExternalLink size={10} />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ GENERAL ════════════════════════════════════════════════════════════ */}
      {section === 'general' && (
        <div className="max-w-3xl space-y-6">
          {/* Shop identity */}
          <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
            <p className={`text-sm font-semibold ${K.text}`}>Shop Identity</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>Shop Name</label>
                <input type="text" value={settings.shopName || ''} onChange={e => set('shopName', e.target.value)} placeholder="My Awesome Shop" className={inputCls} autoComplete="off" />
                <p className={hint}>Shown on your storefront header and all outgoing messages</p>
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
              <p className={`text-xs mt-1 ${K.muted}`}>Set default currencies for cost and selling price. Override cost currency per order.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>Cost Currency</label>
                <select value={settings.importCurrency || 'KRW'} onChange={e => set('importCurrency', e.target.value)} className={inputCls}>
                  {['THB', 'KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'HKD', 'SGD', 'TWD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className={hint}>Currency you pay when sourcing products</p>
              </div>
              <div>
                <label className={lbl}>Selling Currency</label>
                <select value={settings.localCurrency || 'THB'} onChange={e => set('localCurrency', e.target.value)} className={inputCls}>
                  {['THB', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'PHP', 'IDR', 'VND'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className={hint}>Currency your customers pay in</p>
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
              <p className={hint}>{settings.useAutoRate ? 'Fetched automatically on each profit calculation' : 'Uses your fixed rate below'}</p>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 md:max-w-xs">
                <label className={lbl}>1 {settings.importCurrency || 'KRW'} = ? {settings.localCurrency || 'THB'}</label>
                <input type="number" step="0.0001" min="0" value={settings.krwRate ?? 0.026} onChange={e => set('krwRate', parseFloat(e.target.value) || 0)} className={inputCls} autoComplete="off" disabled={settings.useAutoRate} />
              </div>
              <button type="button" onClick={handleFetchLiveRate} disabled={fetchingRate}
                className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 disabled:opacity-50 ${isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white hover:border-[#00b900]' : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-[#00b900]'}`}>
                <RefreshCw size={14} className={fetchingRate ? 'animate-spin' : ''} />
                {fetchingRate ? 'Fetching…' : 'Fetch live rate'}
              </button>
            </div>
            {liveRateError && <p className="text-xs text-red-400">{liveRateError}</p>}
          </div>

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
          <SaveBtn />
        </div>
      )}

      {/* ══ LINE ═══════════════════════════════════════════════════════════════ */}
      {section === 'line' && (
        <div className="max-w-3xl space-y-6">

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
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-400">{lineStatus.bot?.displayName}</p>
                    <p className={`text-xs ${K.muted}`}>{lineStatus.bot?.basicId} · {lineStatus.tier ?? 'unverified'}{lineStatus.bot?.chatMode === 'chat' ? ' · Chat mode (auto-reply paused)' : ''}</p>
                  </div>
                </div>
              ) : (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                  <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
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
              <p className={`text-xs ${K.muted}`}>Press "Test Connection" to verify your LINE channel credentials.</p>
            )}
          </div>

          {/* Webhook */}
          <div className={`rounded-2xl p-5 space-y-3 ${K.surface}`}>
            <div>
              <p className={`text-sm font-semibold ${K.text}`}>Webhook URL</p>
              <p className={`text-xs mt-0.5 ${K.muted}`}>Paste into LINE Developer Console → Messaging API → Webhook settings.</p>
            </div>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
              <code className={`flex-1 text-xs font-mono truncate ${isDark ? 'text-[#00b900]' : 'text-green-700'}`}>{webhookUrl}</code>
              <CopyButton value={webhookUrl} isDark={isDark} />
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
              <p className={`text-xs mt-1 ${K.muted}`}>Use credentials from your <strong>Messaging API</strong> channel — not a LINE Login channel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>Channel Secret <span className={K.muted}>(Basic Settings tab)</span></label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} value={settings.lineChannelSecret || ''} onChange={e => set('lineChannelSecret', e.target.value)} placeholder="32-character hex string" className={inputMono} autoComplete="new-password" name="line-channel-secret" />
                  <button type="button" onClick={() => setShowSecret(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className={hint}>Verifies that webhook requests genuinely come from LINE</p>
              </div>
              <div>
                <label className={lbl}>Channel Access Token <span className={K.muted}>(Messaging API tab)</span></label>
                <div className="relative">
                  <input type={showToken ? 'text' : 'password'} value={settings.lineChannelAccessToken || ''} onChange={e => set('lineChannelAccessToken', e.target.value)} placeholder="Long-lived access token" className={inputMono} autoComplete="new-password" name="line-access-token" />
                  <button type="button" onClick={() => setShowToken(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>
                    {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className={hint}>Authorises outgoing messages, QR codes, broadcasts, and Rich Menu</p>
              </div>
            </div>

            <div className={`px-4 py-3 rounded-xl text-xs ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              <strong>Note:</strong> Credential fields appear empty for security — saved values are never returned to the browser. Leave a field blank to keep the current saved value; only type to update it.
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
                <p className={hint}>Allows customers to log in with LINE on your storefront to place orders</p>
              </div>
              <div>
                <label className={lbl}>Admin LINE User ID</label>
                <input type="text" value={settings.adminLineId || ''} onChange={e => set('adminLineId', e.target.value)} placeholder="U1234567890abcdef…" className={`${inputCls} font-mono text-xs`} autoComplete="off" name="admin-line-id" />
                <p className={hint}>Your personal LINE user ID — receives order alerts and notifications</p>
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

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
          <SaveBtn />
        </div>
      )}

      {/* ══ PAYMENT ════════════════════════════════════════════════════════════ */}
      {section === 'payment' && (
        <div className="max-w-3xl space-y-6">
          <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
            <p className={`text-sm font-semibold ${K.text}`}>PromptPay</p>
            <div className="md:w-1/2">
              <label className={lbl}>PromptPay ID (phone number or national ID)</label>
              <input type="text" value={settings.promptPayId || ''} onChange={e => set('promptPayId', e.target.value)} placeholder="e.g. 0812345678" className={inputCls} autoComplete="off" />
              <p className={hint}>Used to generate the payment QR code sent to customers</p>
            </div>
          </div>

          <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
            <div>
              <p className={`text-sm font-semibold ${K.text}`}>Payment Confirmation Message</p>
              <p className={`text-xs mt-1 ${K.muted}`}>Sent to customers automatically after a slip is verified.</p>
            </div>
            <textarea rows={5} value={settings.paymentTemplate || ''} onChange={e => set('paymentTemplate', e.target.value)} className={`${inputCls} resize-none leading-relaxed`} autoComplete="off" />
            <p className={`text-[10px] ${K.muted}`}>Placeholders: <code>{'{product}'}</code> <code>{'{amount}'}</code> <code>{'{name}'}</code></p>
          </div>

          {/* SlipOK */}
          <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>SlipOK — Automatic Slip Verification</p>
                <p className={`text-xs mt-0.5 ${K.muted}`}>Automatically verifies bank transfer slips customers upload. Leave blank to skip.</p>
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

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
          <SaveBtn />
        </div>
      )}

      {/* ══ SHIPPING ═══════════════════════════════════════════════════════════ */}
      {section === 'shipping' && (
        <div className="max-w-3xl space-y-6">
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
              <p className={`text-xs mt-1 ${K.muted}`}>Sent to customers when you mark an order as shipped.</p>
            </div>
            <textarea rows={6} value={settings.trackingTemplate || ''} onChange={e => set('trackingTemplate', e.target.value)} className={`${inputCls} resize-none leading-relaxed`} autoComplete="off" />
            <p className={`text-[10px] ${K.muted}`}>Placeholders: <code>{'{tracking}'}</code> <code>{'{courier}'}</code> <code>{'{product}'}</code> <code>{'{name}'}</code></p>
          </div>

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}
          <SaveBtn />
        </div>
      )}
    </div>
  );
}

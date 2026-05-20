"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings as SettingsIcon, Plus, X, Save, Eye, EyeOff, Copy, Check,
  ExternalLink, RefreshCw, MessageSquare, Package, Zap, Loader2, AlertTriangle, Bell,
  Globe, Clock, CreditCard, Building2, Truck, Star, Store, ShieldAlert,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent flex-shrink-0 transition-colors"
    >
      {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
    </button>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-accent' : 'bg-slate-300 dark:bg-[#2a2f45]'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

type SectionId = 'general' | 'line' | 'payment' | 'shipping' | 'notifications' | 'storefront';

interface LineStatus {
  configured: boolean;
  valid?: boolean;
  error?: string;
  bot?: { displayName: string; basicId: string; chatMode: string; pictureUrl?: string | null };
  tier?: 'unverified' | 'verified' | 'premium';
  quota?: { type: string; value: number | null };
  consumption?: { totalUsage: number };
}

function getOATypeLabel(tier: string | undefined): string {
  if (tier === 'verified') return 'Verified OA';
  if (tier === 'premium')  return 'Premium OA';
  return 'Unverified OA';
}

function getLinePlanLabel(tier: string | undefined, quota: LineStatus['quota']): string {
  if (tier === 'premium' || quota?.type === 'none') return 'Unlimited';
  const v = quota?.value;
  if (!v || v <= 500)   return 'Free';
  if (v <= 15000) return 'Light';
  return 'Standard';
}

function getLinePlanColor(plan: string): string {
  if (plan === 'Unlimited') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (plan === 'Light')     return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  if (plan === 'Standard')  return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

const SHOPENTER_PLAN: Record<string, { label: string; color: string; desc: string }> = {
  free:       { label: 'Free',       color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',   desc: 'Basic features included' },
  pro:        { label: 'Pro',        color: 'bg-violet-500/15 text-violet-400 border-violet-500/30', desc: 'Full feature access' },
  enterprise: { label: 'Enterprise', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   desc: 'Custom solutions & support' },
};

const SHOPENTER_STATUS: Record<string, { label: string; color: string }> = {
  paid:      { label: 'Active',    color: 'text-emerald-400' },
  trialing:  { label: 'Trial',     color: 'text-amber-400'   },
  unpaid:    { label: 'Past due',  color: 'text-red-400'      },
};

const ACCENT_PRESETS = [
  '#00b900', '#3b82f6', '#f97316', '#ef4444', '#a855f7', '#ec4899', '#06b6d4',
];

const THAI_BANKS = [
  'กสิกรไทย (KBank)', 'ไทยพาณิชย์ (SCB)', 'กรุงไทย (KTB)', 'กรุงเทพ (BBL)',
  'ทหารไทยธนชาต (TTB)', 'กรุงศรีอยุธยา (BAY)', 'ออมสิน (GSB)', 'ธ.ก.ส. (BAAC)',
  'LH Bank', 'CIMB Thai', 'UOB Thailand', 'Citibank Thailand',
];

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsView({
  theme,
  onSave,
  onThemeChange,
  onAccentChange,
  scrollTrigger,
}: {
  theme?: 'light' | 'dark';
  onSave?: () => void;
  onThemeChange?: (newTheme: 'light' | 'dark') => void;
  onAccentChange?: (newColor: string) => void;
  scrollTrigger?: { section: string; id: number } | null;
}) {
  const isDark = theme === 'dark';

  const containerRef               = useRef<HTMLDivElement>(null);
  const tabsContainerRef           = useRef<HTMLDivElement>(null);
  const isScrollingRef             = useRef(false);
  const scrollTimeoutRef           = useRef<NodeJS.Timeout | null>(null);

  const [activeSection, setActiveSection] = useState<SectionId>('general');
  const [highlighted, setHighlighted]     = useState<string | null>(null);
  const [pillStyle, setPillStyle]         = useState<React.CSSProperties>({});

  const [settings, setSettings]       = useState<any>(null);
  const [newCompany, setNewCompany]   = useState('');
  const [newBankRow, setNewBankRow]   = useState({ bankName: '', accountNumber: '', accountName: '', branch: '' });
  const [newEstRow, setNewEstRow]     = useState({ courier: '', minDays: 1, maxDays: 3 });
  const [showGuide, setShowGuide]     = useState(true);
  const [isSaving,  setIsSaving]      = useState(false);
  const [saved,     setSaved]         = useState(false);
  const [saveError, setSaveError]     = useState('');

  const [showToken,       setShowToken]       = useState(false);
  const [showSecret,      setShowSecret]      = useState(false);
  const [showLiff,        setShowLiff]        = useState(false);
  const [showSlipKey,     setShowSlipKey]     = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);

  const [webhookUrl,    setWebhookUrl]    = useState('');
  const [fetchingRate,  setFetchingRate]  = useState(false);
  const [liveRateError, setLiveRateError] = useState('');

  const [lineStatus,   setLineStatus]   = useState<LineStatus | null>(null);
  const [checkingLine, setCheckingLine] = useState(false);
  const [merchantPlan, setMerchantPlan] = useState<{ tier: string; paymentStatus: string } | null>(null);

  useEffect(() => {
    setShowGuide(localStorage.getItem('sg-dismissed') !== 'true');
    const sync = () => setShowGuide(localStorage.getItem('sg-dismissed') !== 'true');
    window.addEventListener('sg-dismissed-changed', sync);
    return () => window.removeEventListener('sg-dismissed-changed', sync);
  }, []);

  const checkLine = useCallback(async () => {
    setCheckingLine(true); setLineStatus(null);
    try {
      const res = await fetch('/api/line-status');
      if (res.ok) setLineStatus(await res.json());
    } catch {}
    finally { setCheckingLine(false); }
  }, []);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
    fetch('/api/merchant/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setMerchantPlan({ tier: d.tier, paymentStatus: d.paymentStatus }); }).catch(() => {});
    setWebhookUrl(`${window.location.origin}/api/webhook`);
    checkLine();
  }, [checkLine]);

  // Sliding pill
  useEffect(() => {
    const updatePill = () => {
      if (!tabsContainerRef.current) return;
      const container = tabsContainerRef.current;
      const ids: SectionId[] = ['general', 'line', 'payment', 'shipping', 'notifications', 'storefront'];
      const activeIdx = ids.indexOf(activeSection);
      if (activeIdx === -1) return;
      const buttons = container.querySelectorAll('button');
      const activeBtn = buttons[activeIdx] as HTMLElement;
      if (activeBtn) setPillStyle({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth, height: activeBtn.offsetHeight, top: activeBtn.offsetTop });
    };
    updatePill();
    const timer = setTimeout(updatePill, 50);
    window.addEventListener('resize', updatePill);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updatePill); };
  }, [activeSection, settings !== null]);

  const scrollTo = useCallback((id: string) => {
    const container = containerRef.current;
    const el = container?.querySelector<HTMLElement>(`#${id}`);
    if (el && container) {
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 72;
      container.scrollTo({ top, behavior: 'smooth' });
      const sectionIds: SectionId[] = ['general', 'line', 'payment', 'shipping', 'notifications', 'storefront'];
      const section = sectionIds.find(s => id === s || id.startsWith(s + '-')) ?? 'general';
      setActiveSection(section);
      scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = false; }, 600);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ids: SectionId[] = ['general', 'line', 'payment', 'shipping', 'notifications', 'storefront'];
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (isScrollingRef.current) return;
      const visible = entries.filter(e => e.isIntersecting).map(e => e.target.id as SectionId);
      if (visible.length > 0) { const next = ids.find(id => visible.includes(id)); if (next) setActiveSection(next); }
    };
    const observer = new IntersectionObserver(observerCallback, { root: container, rootMargin: '-80px 0px -60% 0px', threshold: 0 });
    ids.forEach(id => { const el = container.querySelector(`#${id}`); if (el) observer.observe(el); });

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      const threshold = 15;
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
        setActiveSection('storefront');
      } else if (container.scrollTop === 0) {
        setActiveSection('general');
      } else {
        const containerTop = container.getBoundingClientRect().top;
        const triggerLine = containerTop + 120;
        let active: SectionId = 'general';
        for (const id of ids) {
          const el = container.querySelector<HTMLElement>(`#${id}`);
          if (el && el.getBoundingClientRect().top <= triggerLine) active = id;
        }
        setActiveSection(active);
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [settings !== null]);

  useEffect(() => {
    if (!scrollTrigger) return;
    const timer = setTimeout(() => {
      scrollTo(scrollTrigger.section);
      setHighlighted(scrollTrigger.section);
      setTimeout(() => setHighlighted(null), 1800);
    }, 80);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTrigger?.id]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true); setSaved(false); setSaveError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) { onSave?.(); setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setSaveError('Failed to save. Please try again.');
    } catch { setSaveError('Network error. Please try again.'); }
    finally { setIsSaving(false); }
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

  const set = (field: string, value: any) => setSettings((s: any) => ({ ...s, [field]: value }));
  const setSf = (field: string, value: any) => setSettings((s: any) => ({ ...s, storefront: { ...(s?.storefront || {}), [field]: value } }));
  const setBh = (field: string, value: any) => setSettings((s: any) => ({ ...s, businessHours: { ...(s?.businessHours || {}), [field]: value } }));
  const setAa = (field: string, value: any) => setSettings((s: any) => ({ ...s, adminAlerts: { ...(s?.adminAlerts || {}), [field]: value } }));
  const setPm = (field: string, value: any) => setSettings((s: any) => ({ ...s, paymentMethods: { ...(s?.paymentMethods || {}), [field]: value } }));
  const setFst = (field: string, value: any) => setSettings((s: any) => ({ ...s, freeShippingThreshold: { ...(s?.freeShippingThreshold || {}), [field]: value } }));

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    set('theme', newTheme);
    onThemeChange?.(newTheme);
    try {
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, theme: newTheme }) });
      onSave?.();
    } catch {}
  };

  const handleAccentChange = async (newColor: string) => {
    set('dashboardAccent', newColor);
    onAccentChange?.(newColor);
    try {
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, dashboardAccent: newColor }) });
      onSave?.();
    } catch {}
  };

  const removeCompany = (c: string) => set('shippingCompanies', settings.shippingCompanies.filter((x: string) => x !== c));
  const addCompany = () => {
    if (!newCompany.trim()) return;
    set('shippingCompanies', [...(settings.shippingCompanies || []), newCompany.trim()]);
    setNewCompany('');
  };

  const addBankAccount = () => {
    if (!newBankRow.accountNumber.trim() || !newBankRow.accountName.trim()) return;
    set('bankAccounts', [...(settings.bankAccounts || []), { ...newBankRow }]);
    setNewBankRow({ bankName: '', accountNumber: '', accountName: '', branch: '' });
  };
  const removeBankAccount = (i: number) => set('bankAccounts', (settings.bankAccounts || []).filter((_: any, idx: number) => idx !== i));

  const addDeliveryEstimate = () => {
    if (!newEstRow.courier.trim()) return;
    set('deliveryEstimates', [...(settings.deliveryEstimates || []), { ...newEstRow }]);
    setNewEstRow({ courier: '', minDays: 1, maxDays: 3 });
  };
  const removeDeliveryEstimate = (i: number) => set('deliveryEstimates', (settings.deliveryEstimates || []).filter((_: any, idx: number) => idx !== i));

  // ── Style tokens ─────────────────────────────────────────────────────────────
  const K = {
    bg:      isDark ? 'bg-[#0f1117]'                          : 'bg-slate-50',
    surface: isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200',
    text:    isDark ? 'text-white'                            : 'text-slate-900',
    muted:   isDark ? 'text-[#8b92ad]'                       : 'text-slate-500',
    border:  isDark ? 'border-[#1f2335]'                     : 'border-slate-200',
    inp:     isDark
      ? 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad] focus:border-accent focus:outline-none'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none',
  };

  const inputCls  = `w-full rounded-xl px-4 py-3 text-sm border transition-colors ${K.inp}`;
  const inputMono = `${inputCls} font-mono text-xs pr-12`;
  const lbl       = `block text-[10px] font-bold uppercase tracking-widest mb-2 ${K.muted}`;
  const hint      = `text-[10px] mt-1 ml-1 ${K.muted}`;

  const hlCls = (id: string) => `rounded-xl px-3 py-2 -mx-3 transition-colors duration-1000 ${highlighted === id ? isDark ? 'bg-accent/20 ring-1 ring-accent/30' : 'bg-accent/5 ring-1 ring-accent/30' : ''}`;
  const ringCls = (id: string) => `rounded-2xl p-6 space-y-5 ${K.surface} transition-colors duration-700 ${highlighted === id ? 'ring-2 ring-accent/50' : ''}`;

  const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
    { id: 'general',       label: 'General',       icon: <SettingsIcon  size={13} /> },
    { id: 'line',          label: 'LINE',          icon: <MessageSquare size={13} /> },
    { id: 'payment',       label: 'Payment',       icon: <Zap           size={13} /> },
    { id: 'shipping',      label: 'Shipping',      icon: <Package       size={13} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell          size={13} /> },
    { id: 'storefront',    label: 'Storefront',    icon: <Store         size={13} /> },
  ];

  const isSettingsLoading = !settings;

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${K.bg}`}>
    <div ref={containerRef} className="flex-1 overflow-y-auto">

      {/* ── Sticky scroll-nav ─────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-10 px-6 pt-4 pb-3 ${K.bg}`}>
        <div ref={tabsContainerRef} className={`flex items-center gap-0.5 p-1 rounded-xl relative ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-slate-100'}`}>
          <div
            className={`absolute bg-accent rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-sm pointer-events-none z-0 ${pillStyle.width ? 'opacity-100' : 'opacity-0'}`}
            style={pillStyle}
          />
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center relative z-10 ${
                activeSection === s.id
                  ? pillStyle.width ? 'text-white' : 'bg-accent text-white shadow-sm'
                  : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s.icon}<span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-10 max-w-3xl mx-auto space-y-16">
        {isSettingsLoading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
            <div className="w-10 h-10 border-4 border-t-transparent border-accent rounded-full animate-spin" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Syncing Merchant Profile…</span>
          </div>
        ) : (
          <>

          {/* ══ GENERAL ══════════════════════════════════════════════════════ */}
          <div id="general" className="space-y-6 pt-2">
            <div className={`flex items-center gap-2 ${hlCls('general')}`}>
              <SettingsIcon size={15} className="text-accent" />
              <h2 className={`text-base font-bold ${K.text}`}>General</h2>
            </div>

            {/* Shop Identity */}
            <div id="general-shopname" className={ringCls('general-shopname')}>
              <p className={`text-sm font-semibold ${K.text}`}>Shop Identity</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={lbl}>Shop Name</label>
                  <input type="text" value={settings.shopName || ''} onChange={e => set('shopName', e.target.value)} placeholder="My Awesome Shop" className={inputCls} autoComplete="off" />
                  <p className={hint}>Shown on storefront and all outgoing messages</p>
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Shop Description</label>
                  <textarea rows={2} value={settings.shopDescription || ''} onChange={e => set('shopDescription', e.target.value)} placeholder="Short tagline or bio shown on your storefront" className={`${inputCls} resize-none`} maxLength={160} autoComplete="off" />
                  <p className={hint}>{(settings.shopDescription || '').length}/160 characters</p>
                </div>
                <div>
                  <label className={lbl}>Logo URL</label>
                  <div className="flex items-center gap-3">
                    {settings.shopLogoUrl && (
                      <img src={settings.shopLogoUrl} alt="logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-slate-200 dark:border-[#1f2335]" onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                    <input type="url" value={settings.shopLogoUrl || ''} onChange={e => set('shopLogoUrl', e.target.value)} placeholder="https://…/logo.png" className={inputCls} autoComplete="off" />
                  </div>
                  <p className={hint}>Square image recommended (512×512 px)</p>
                </div>
                <div>
                  <label className={lbl}>Timezone</label>
                  <select value={settings.shopTimezone || 'Asia/Bangkok'} onChange={e => set('shopTimezone', e.target.value)} className={inputCls}>
                    <option value="Asia/Bangkok">🇹🇭 Asia/Bangkok (UTC+7)</option>
                    <option value="Asia/Tokyo">🇯🇵 Asia/Tokyo (UTC+9)</option>
                    <option value="Asia/Seoul">🇰🇷 Asia/Seoul (UTC+9)</option>
                    <option value="Asia/Singapore">🇸🇬 Asia/Singapore (UTC+8)</option>
                    <option value="Asia/Taipei">🇹🇼 Asia/Taipei (UTC+8)</option>
                    <option value="Asia/Jakarta">🇮🇩 Asia/Jakarta (UTC+7)</option>
                    <option value="Europe/London">🇬🇧 Europe/London</option>
                    <option value="America/New_York">🇺🇸 America/New_York</option>
                  </select>
                  <p className={hint}>Used for business hours and scheduled messages</p>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Appearance</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Dashboard theme and color preferences.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={lbl}>Theme</label>
                  <div className={`flex p-1 rounded-xl ${isDark ? 'bg-[#0f1117]' : 'bg-slate-100'}`}>
                    {(['light', 'dark'] as const).map(t => (
                      <button key={t} onClick={() => handleThemeChange(t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${settings.theme === t ? 'bg-accent text-white shadow-sm' : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className={`text-xs font-semibold ${K.text}`}>Compact Mode</p>
                    <p className={hint}>Tighter spacing in order and customer lists</p>
                  </div>
                  <Toggle enabled={!!settings.compactMode} onChange={v => set('compactMode', v)} />
                </div>
              </div>
              <div>
                <label className={lbl}>Accent Color</label>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {ACCENT_PRESETS.map(color => {
                    const isActive = (settings.dashboardAccent || '#00b900') === color;
                    return (
                      <button key={color} onClick={() => handleAccentChange(color)} title={color}
                        style={{ backgroundColor: color, ...(isActive ? { outline: `2.5px solid ${color}`, outlineOffset: '2px' } : {}) }}
                        className={`w-7 h-7 rounded-full transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                      />
                    );
                  })}
                  <label title="Custom color" className={`w-7 h-7 rounded-full border-2 cursor-pointer overflow-hidden relative hover:scale-105 transition-all flex items-center justify-center ${isDark ? 'border-[#1f2335] bg-[#1a1d2e]' : 'border-slate-200 bg-slate-50'}`}>
                    <input type="color" value={settings.dashboardAccent || '#00b900'} onChange={e => handleAccentChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <span className={`text-[13px] font-bold leading-none ${isDark ? 'text-[#8b92ad]' : 'text-slate-400'}`}>+</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Language & Locale */}
            <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Language & Locale</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Controls the language used in this admin dashboard.</p>
              </div>
              <div className="md:w-1/2">
                <label className={lbl}>Dashboard Language</label>
                <select value={settings.dashboardLanguage || 'th'} onChange={e => set('dashboardLanguage', e.target.value)} className={inputCls}>
                  <option value="th">🇹🇭 Thai (ภาษาไทย)</option>
                  <option value="ja">🇯🇵 Japanese (日本語)</option>
                  <option value="en">🇬🇧 English</option>
                  <option value="ko">🇰🇷 Korean (한국어)</option>
                  <option value="zh-TW">🇹🇼 Traditional Chinese (繁體中文)</option>
                </select>
              </div>
              <p className={`text-[11px] px-3 py-2 rounded-lg ${isDark ? 'bg-[#1a1d2e] text-[#8b92ad]' : 'bg-slate-100 text-slate-500'}`}>
                Storefront language is set separately under <span className="font-semibold">Storefront → Customization</span>.
              </p>
            </div>

            {/* Interface Settings */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Interface Settings</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className={`text-xs font-semibold ${K.text}`}>Getting Started Guide</p>
                  <p className={hint}>Show the checklist floating helper widget</p>
                </div>
                <button type="button"
                  onClick={() => {
                    const dismissed = localStorage.getItem('sg-dismissed') === 'true';
                    if (dismissed) localStorage.removeItem('sg-dismissed');
                    else localStorage.setItem('sg-dismissed', 'true');
                    window.dispatchEvent(new Event('sg-dismissed-changed'));
                  }}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors relative flex items-center ${showGuide ? 'bg-accent' : isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${showGuide ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Business Hours */}
            <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${K.text}`}>Business Hours</p>
                  <p className={`text-xs mt-0.5 ${K.muted}`}>When enabled, auto-replies outside hours. Auto-reply wiring coming soon.</p>
                </div>
                <Toggle enabled={!!settings.businessHours?.enabled} onChange={v => setBh('enabled', v)} />
              </div>
              {settings.businessHours?.enabled && (
                <div className="space-y-3 pt-2 border-t border-dashed border-slate-200 dark:border-[#1f2335]">
                  {DAYS.map(({ key, label }) => {
                    const day = settings.businessHours?.[key] || { enabled: key !== 'sat' && key !== 'sun', open: '09:00', close: '18:00' };
                    return (
                      <div key={key} className="flex items-center gap-4">
                        <div className="w-28 flex items-center gap-2 flex-shrink-0">
                          <Toggle enabled={!!day.enabled} onChange={v => setBh(key, { ...day, enabled: v })} />
                          <span className={`text-xs font-semibold ${K.text}`}>{label.slice(0, 3)}</span>
                        </div>
                        {day.enabled ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input type="time" value={day.open || '09:00'} onChange={e => setBh(key, { ...day, open: e.target.value })} className={`${inputCls} flex-1`} />
                            <span className={K.muted}>–</span>
                            <input type="time" value={day.close || '18:00'} onChange={e => setBh(key, { ...day, close: e.target.value })} className={`${inputCls} flex-1`} />
                          </div>
                        ) : (
                          <span className={`text-xs ${K.muted}`}>Closed</span>
                        )}
                      </div>
                    );
                  })}
                  <div className="pt-2">
                    <label className={lbl}>Auto-reply when closed</label>
                    <textarea rows={2} value={settings.businessHours?.closedAutoReply || ''} onChange={e => setBh('closedAutoReply', e.target.value)} placeholder="ขณะนี้ร้านปิดแล้วครับ จะรีบตอบกลับในช่วงเวลาทำการครับ 🙏" className={`${inputCls} resize-none`} autoComplete="off" />
                  </div>
                </div>
              )}
            </div>

            {/* Currency */}
            <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Currency & Exchange Rate</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Set defaults for cost and selling price.</p>
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
                    {['THB','JPY','TWD','KRW','USD','EUR','GBP','SGD','MYR','IDR','PHP','VND','AUD','HKD'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p className={hint}>Price shown on storefront and LINE messages</p>
                </div>
              </div>
              <div>
                <label className={lbl}>Rate Source</label>
                <div className={`flex p-1 rounded-xl w-fit ${isDark ? 'bg-[#0f1117]' : 'bg-slate-100'}`}>
                  {([false, true] as const).map(isLive => (
                    <button key={String(isLive)} type="button" onClick={() => set('useAutoRate', isLive)}
                      className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${(settings.useAutoRate ?? false) === isLive ? 'bg-accent text-white shadow-sm' : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                      {isLive ? 'Live (auto)' : 'Manual'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 md:max-w-xs">
                  <label className={lbl}>1 {settings.importCurrency || 'KRW'} = ? {settings.localCurrency || 'THB'}</label>
                  <input type="number" step="0.0001" min="0" value={settings.krwRate ?? 0.026} onChange={e => set('krwRate', parseFloat(e.target.value) || 0)} className={inputCls} disabled={settings.useAutoRate} />
                </div>
                <button type="button" onClick={handleFetchLiveRate} disabled={fetchingRate}
                  className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 disabled:opacity-50 ${isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white hover:border-accent' : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-accent'}`}>
                  <RefreshCw size={14} className={fetchingRate ? 'animate-spin' : ''} />
                  {fetchingRate ? 'Fetching…' : 'Fetch live rate'}
                </button>
              </div>
              {liveRateError && <p className="text-xs text-red-400">{liveRateError}</p>}
            </div>

            {/* Shopenter Plan */}
            {merchantPlan && (() => {
              const plan   = SHOPENTER_PLAN[merchantPlan.tier] ?? SHOPENTER_PLAN.free;
              const status = SHOPENTER_STATUS[merchantPlan.paymentStatus] ?? SHOPENTER_STATUS.trialing;
              return (
                <div className={`rounded-2xl p-5 space-y-3 ${K.surface}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${K.text}`}>Shopenter Plan</p>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${plan.color}`}>{plan.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${K.muted}`}>{plan.desc}</p>
                    <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                  </div>
                  {merchantPlan.tier === 'free' && (
                    <div className={`mt-2 pt-3 border-t ${K.border}`}>
                      <p className={`text-xs ${K.muted} mb-2`}>Upgrade for higher order limits, broadcasts, and more.</p>
                      <button className="px-4 py-2 rounded-xl text-xs font-bold bg-accent text-white hover:opacity-90 transition-all">Upgrade to Pro →</button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ══ LINE ═════════════════════════════════════════════════════════ */}
          <div id="line" className="space-y-6">
            <div className={`flex items-center gap-2 ${hlCls('line')}`}>
              <MessageSquare size={15} className="text-accent" />
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
              {checkingLine && <div className="flex items-center gap-2"><Loader2 size={14} className="animate-spin text-accent" /><span className={`text-sm ${K.muted}`}>Checking…</span></div>}
              {!checkingLine && lineStatus && (
                lineStatus.configured && lineStatus.valid ? (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><Check size={14} className="text-emerald-400" /></div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-400">{lineStatus.bot?.displayName}</p>
                      <p className={`text-xs ${K.muted}`}>{lineStatus.bot?.basicId} · {getOATypeLabel(lineStatus.tier)}{lineStatus.bot?.chatMode === 'chat' && ' · Chat mode (auto-reply paused)'}</p>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                    <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">{!lineStatus.configured ? 'Token not configured' : 'Invalid credentials'}</p>
                      {lineStatus.error && <p className={`text-xs mt-0.5 ${K.muted}`}>{lineStatus.error}</p>}
                    </div>
                  </div>
                )
              )}
              {!checkingLine && !lineStatus && <p className={`text-xs ${K.muted}`}>Press "Test Connection" to verify your LINE channel.</p>}
            </div>

            {/* LINE OA Plan & Quota */}
            {lineStatus?.configured && lineStatus.valid && ((() => {
              const isUnlimited = lineStatus.quota?.type === 'none' || lineStatus.tier === 'premium';
              const used = lineStatus.consumption?.totalUsage ?? 0;
              const limit = lineStatus.quota?.value ?? 0;
              const pct = isUnlimited ? 100 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
              const remaining = Math.max(0, limit - used);
              const plan = getLinePlanLabel(lineStatus.tier, lineStatus.quota);
              const planColor = getLinePlanColor(plan);
              const barColor = isUnlimited ? 'bg-amber-400' : pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-accent';
              return (
                <div className={`rounded-2xl p-5 space-y-4 ${K.surface}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${K.text}`}>LINE OA Plan & Quota</p>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${planColor}`}>{plan}</span>
                  </div>
                  {isUnlimited ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><span className={`text-xs ${K.muted}`}>Monthly messages</span><span className="text-xs font-bold text-amber-400">Unlimited</span></div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100'}`}><div className="h-full rounded-full bg-amber-400 w-full" /></div>
                      <p className={`text-[10px] ${K.muted}`}>{used.toLocaleString()} sent this month · No cap</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><span className={`text-xs ${K.muted}`}>Monthly messages</span><span className={`text-xs font-bold ${pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-amber-400' : K.text}`}>{used.toLocaleString()} / {limit.toLocaleString()}</span></div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100'}`}><div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} /></div>
                      <div className="flex items-center justify-between">
                        <p className={`text-[10px] ${K.muted}`}>{remaining.toLocaleString()} remaining · {pct.toFixed(1)}% used</p>
                        {pct >= 80 && <p className={`text-[10px] font-semibold ${pct >= 90 ? 'text-red-400' : 'text-amber-400'}`}>{pct >= 90 ? 'Quota almost full' : 'Running low'}</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })())}

            {/* Webhook URL */}
            <div className={`rounded-2xl p-5 space-y-3 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Webhook URL</p>
                <p className={`text-xs mt-0.5 ${K.muted}`}>Paste into LINE Developer Console → Messaging API → Webhook settings.</p>
              </div>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                <code className="flex-1 text-xs font-mono truncate text-accent">{webhookUrl}</code>
                <CopyButton value={webhookUrl} />
                <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 text-[10px] ${K.muted} hover:text-accent transition-colors flex-shrink-0`}>Console <ExternalLink size={10} /></a>
              </div>
            </div>

            {/* Messaging API Credentials */}
            <div id="line-credentials" className={ringCls('line-credentials')}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Messaging API Credentials</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Use credentials from your <strong>Messaging API</strong> channel only — not a LINE Login channel.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={lbl}>Channel Secret <span className={`normal-case font-normal ${K.muted}`}>(Basic Settings tab)</span></label>
                  <div className="relative">
                    <input type={showSecret ? 'text' : 'password'} value={settings.lineChannelSecret || ''} onChange={e => set('lineChannelSecret', e.target.value)} placeholder="32-character hex string" className={inputMono} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowSecret(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>{showSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                  <p className={hint}>Verifies webhook requests from LINE</p>
                </div>
                <div>
                  <label className={lbl}>Channel Access Token <span className={`normal-case font-normal ${K.muted}`}>(Messaging API tab)</span></label>
                  <div className="relative">
                    <input type={showToken ? 'text' : 'password'} value={settings.lineChannelAccessToken || ''} onChange={e => set('lineChannelAccessToken', e.target.value)} placeholder="Long-lived access token" className={inputMono} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowToken(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>{showToken ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                  <p className={hint}>Authorises messages, broadcasts, Rich Menu</p>
                </div>
              </div>
              <div className={`px-4 py-3 rounded-xl text-xs ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                <strong>Note:</strong> Fields appear empty for security — saved values are never returned. Leave blank to keep current value; type to update.
              </div>
            </div>

            {/* Welcome Message */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${K.text}`}>Welcome Message</p>
                  <p className={`text-xs mt-0.5 ${K.muted}`}>Sent automatically when a new user follows your OA.</p>
                </div>
                <Toggle
                  enabled={!!settings.greetingEnabled}
                  onChange={v => set('greetingEnabled', v)}
                />
              </div>
              {settings.greetingEnabled && (
                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-[#1f2335]">
                  <label className={lbl}>Message text <span className={`normal-case font-normal ${K.muted}`}>(placeholder: {'{name}'})</span></label>
                  <textarea
                    rows={4}
                    value={settings.greetingMessages?.[0]?.text || ''}
                    onChange={e => set('greetingMessages', [{ type: 'text', text: e.target.value }])}
                    placeholder={`สวัสดีครับ {name}! ยินดีต้อนรับสู่ร้านของเราครับ 🎉`}
                    className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                    autoComplete="off"
                  />
                  <p className={hint}>For multiple message blocks, use the Auto-Reply editor under Broadcasts.</p>
                </div>
              )}
            </div>

            {/* LIFF & Admin */}
            <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
              <p className={`text-sm font-semibold ${K.text}`}>LIFF & Admin</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={lbl}>LIFF ID</label>
                  <div className="relative">
                    <input type={showLiff ? 'text' : 'password'} value={settings.liffId || ''} onChange={e => set('liffId', e.target.value)} placeholder="1234567890-AbCdEfGh" className={inputMono} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowLiff(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>{showLiff ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                  <p className={hint}>Lets customers log in with LINE on your storefront</p>
                </div>
                <div>
                  <label className={lbl}>Admin LINE User ID</label>
                  <input type="text" value={settings.adminLineId || ''} onChange={e => set('adminLineId', e.target.value)} placeholder="U1234567890abcdef…" className={`${inputCls} font-mono text-xs`} autoComplete="off" />
                  <p className={hint}>Receives order alerts and admin notifications</p>
                </div>
              </div>
              <div className="md:w-1/2">
                <label className={lbl}>Admin Secret</label>
                <div className="relative">
                  <input type={showAdminSecret ? 'text' : 'password'} value={settings.adminSecret || ''} onChange={e => set('adminSecret', e.target.value)} placeholder="e.g. my-secret-phrase" className={inputMono} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowAdminSecret(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>{showAdminSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
                <p className={hint}>Required to use admin-only bot commands via LINE chat</p>
              </div>
            </div>
          </div>

          {/* ══ PAYMENT ══════════════════════════════════════════════════════ */}
          <div id="payment" className="space-y-6">
            <div className={`flex items-center gap-2 ${hlCls('payment')}`}>
              <Zap size={15} className="text-accent" />
              <h2 className={`text-base font-bold ${K.text}`}>Payment</h2>
            </div>

            {/* Payment Methods */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Payment Methods</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Enable the payment options you accept.</p>
              </div>
              <div className="space-y-3">
                {([
                  { key: 'promptpay',   label: 'PromptPay QR',    sub: 'Generate QR codes for PromptPay' },
                  { key: 'bankTransfer', label: 'Bank Transfer',   sub: 'Customers transfer directly to your account' },
                  { key: 'cod',         label: 'Cash on Delivery', sub: 'Pay on delivery (COD)' },
                  { key: 'truemoney',   label: 'Truemoney Wallet', sub: 'True Money wallet ID or link' },
                ] as const).map(({ key, label, sub }) => (
                  <div key={key} className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                    <div>
                      <p className={`text-sm font-semibold ${K.text}`}>{label}</p>
                      <p className={`text-xs ${K.muted}`}>{sub}</p>
                    </div>
                    <Toggle enabled={!!settings.paymentMethods?.[key]} onChange={v => setPm(key, v)} />
                  </div>
                ))}
              </div>
              {settings.paymentMethods?.truemoney && (
                <div>
                  <label className={lbl}>Truemoney ID / Link</label>
                  <input type="text" value={settings.paymentMethods?.truemoneyId || ''} onChange={e => setPm('truemoneyId', e.target.value)} placeholder="Phone number or True Money link" className={inputCls} autoComplete="off" />
                </div>
              )}
            </div>

            {/* PromptPay & Bank Accounts */}
            <div id="payment-promptpay" className={ringCls('payment-promptpay')}>
              <p className={`text-sm font-semibold ${K.text}`}>PromptPay & Bank Accounts</p>
              <div className="md:w-1/2">
                <label className={lbl}>PromptPay ID (phone or national ID)</label>
                <input type="text" value={settings.promptPayId || ''} onChange={e => set('promptPayId', e.target.value)} placeholder="e.g. 0812345678" className={inputCls} autoComplete="off" />
                <p className={hint}>Used to generate payment QR codes sent to customers</p>
              </div>

              {/* Bank accounts list */}
              {(settings.bankAccounts || []).length > 0 && (
                <div className="space-y-2">
                  {(settings.bankAccounts || []).map((acc: any, i: number) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                      <Building2 size={14} className="text-accent flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${K.text}`}>{acc.bankName || 'Bank'}</p>
                        <p className={`text-xs ${K.muted}`}>{acc.accountNumber} · {acc.accountName}</p>
                      </div>
                      <button onClick={() => removeBankAccount(i)} className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add bank account row */}
              <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                <p className={`text-xs font-bold ${K.muted} uppercase tracking-widest`}>Add Bank Account</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Bank</label>
                    <select value={newBankRow.bankName} onChange={e => setNewBankRow(r => ({ ...r, bankName: e.target.value }))} className={inputCls}>
                      <option value="">Select bank…</option>
                      {THAI_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Account Number</label>
                    <input type="text" value={newBankRow.accountNumber} onChange={e => setNewBankRow(r => ({ ...r, accountNumber: e.target.value }))} placeholder="000-0-00000-0" className={inputCls} autoComplete="off" />
                  </div>
                  <div>
                    <label className={lbl}>Account Name</label>
                    <input type="text" value={newBankRow.accountName} onChange={e => setNewBankRow(r => ({ ...r, accountName: e.target.value }))} placeholder="Full name" className={inputCls} autoComplete="off" />
                  </div>
                  <div>
                    <label className={lbl}>Branch (optional)</label>
                    <input type="text" value={newBankRow.branch} onChange={e => setNewBankRow(r => ({ ...r, branch: e.target.value }))} placeholder="Branch name" className={inputCls} autoComplete="off" />
                  </div>
                </div>
                <button onClick={addBankAccount} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:opacity-90 transition-all">
                  <Plus size={13} /> Add Account
                </button>
              </div>
            </div>

            {/* Slip Verification */}
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
                  <input type="text" value={settings.slipokBranchId || ''} onChange={e => set('slipokBranchId', e.target.value)} placeholder="e.g. 12345" className={inputCls} autoComplete="off" />
                </div>
                <div>
                  <label className={lbl}>API Key</label>
                  <div className="relative">
                    <input type={showSlipKey ? 'text' : 'password'} value={settings.slipokApiKey || ''} onChange={e => set('slipokApiKey', e.target.value)} placeholder="sk_live_…" className={inputMono} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowSlipKey(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${K.muted} hover:text-white transition-colors`}>{showSlipKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Confirmation Message */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Payment Confirmation Message</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Sent automatically after a slip is verified.</p>
              </div>
              <textarea rows={5} value={settings.paymentTemplate || ''} onChange={e => set('paymentTemplate', e.target.value)} className={`${inputCls} resize-none leading-relaxed`} autoComplete="off" />
              <p className={`text-[10px] ${K.muted}`}>Placeholders: <code>{'{product}'}</code> <code>{'{amount}'}</code> <code>{'{name}'}</code></p>
            </div>

            {/* Order Auto-Cancel */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${K.text}`}>Order Auto-Cancel</p>
                  <p className={`text-xs mt-0.5 ${K.muted}`}>Automatically cancel unpaid pending orders after N hours. (Stored; automation wiring coming soon.)</p>
                </div>
                <Toggle enabled={(settings.autoCancelHours || 0) > 0} onChange={v => set('autoCancelHours', v ? 24 : 0)} />
              </div>
              {(settings.autoCancelHours || 0) > 0 && (
                <div className="md:w-1/3">
                  <label className={lbl}>Cancel after (hours)</label>
                  <input type="number" min="1" max="168" value={settings.autoCancelHours || 24} onChange={e => set('autoCancelHours', parseInt(e.target.value) || 24)} className={inputCls} />
                </div>
              )}
            </div>

            {/* Loyalty Program */}
            <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${K.text}`}>Loyalty Points Program</p>
                  <p className={`text-xs mt-0.5 ${K.muted}`}>Customers earn points per baht spent and redeem at checkout</p>
                </div>
                <Toggle enabled={!!settings.loyalty?.enabled} onChange={v => set('loyalty', { ...(settings.loyalty || {}), enabled: v })} />
              </div>
              {settings.loyalty?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-dashed border-slate-200 dark:border-[#1f2335]">
                  <div>
                    <label className={lbl}>Points per ฿1 spent</label>
                    <input type="number" min="0.1" step="0.1" value={settings.loyalty?.pointsPerBaht ?? 1} onChange={e => set('loyalty', { ...(settings.loyalty || {}), pointsPerBaht: parseFloat(e.target.value) || 1 })} className={inputCls} />
                  </div>
                  <div>
                    <label className={lbl}>Points to redeem ฿1</label>
                    <input type="number" min="1" value={settings.loyalty?.redeemRate ?? 100} onChange={e => set('loyalty', { ...(settings.loyalty || {}), redeemRate: parseInt(e.target.value) || 100 })} className={inputCls} />
                    <p className={`text-[10px] mt-1 ${K.muted}`}>{settings.loyalty?.redeemRate ?? 100} pts = ฿1</p>
                  </div>
                  <div>
                    <label className={lbl}>Min points to redeem</label>
                    <input type="number" min="1" value={settings.loyalty?.minRedeemPoints ?? 100} onChange={e => set('loyalty', { ...(settings.loyalty || {}), minRedeemPoints: parseInt(e.target.value) || 100 })} className={inputCls} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══ SHIPPING ═════════════════════════════════════════════════════ */}
          <div id="shipping" className="space-y-6">
            <div className={`flex items-center gap-2 ${hlCls('shipping')}`}>
              <Package size={15} className="text-accent" />
              <h2 className={`text-base font-bold ${K.text}`}>Shipping</h2>
            </div>

            {/* Shipping Companies */}
            <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
              <p className={`text-sm font-semibold ${K.text}`}>Shipping Companies</p>
              <div className="flex flex-wrap gap-2">
                {settings.shippingCompanies?.map((c: string, i: number) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                    {c}<button onClick={() => removeCompany(c)} className="text-red-400 hover:text-red-300 transition-colors"><X size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Add shipping company…" value={newCompany} onChange={e => setNewCompany(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCompany(); }} className={`${inputCls} flex-1`} autoComplete="off" />
                <button onClick={addCompany} className="bg-accent text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all flex-shrink-0"><Plus size={15} /> Add</button>
              </div>
            </div>

            {/* Shipping Rates */}
            <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Shipping Rates</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Default shipping costs applied at checkout.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={lbl}>Default Shipping Cost (฿)</label>
                  <input type="number" min="0" value={settings.defaultShippingCost || 0} onChange={e => set('defaultShippingCost', parseFloat(e.target.value) || 0)} className={inputCls} />
                  <p className={hint}>Applied when no specific rate matches</p>
                </div>
                <div>
                  <label className={lbl}>COD Surcharge (฿)</label>
                  <input type="number" min="0" value={settings.codSurcharge || 0} onChange={e => set('codSurcharge', parseFloat(e.target.value) || 0)} className={inputCls} />
                  <p className={hint}>Extra fee added for cash-on-delivery orders</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-semibold ${K.text}`}>Free Shipping Threshold</p>
                  <p className={hint}>Waive shipping for orders above a minimum</p>
                </div>
                <Toggle enabled={!!settings.freeShippingThreshold?.enabled} onChange={v => setFst('enabled', v)} />
              </div>
              {settings.freeShippingThreshold?.enabled && (
                <div className="md:w-1/3">
                  <label className={lbl}>Free shipping above (฿)</label>
                  <input type="number" min="0" value={settings.freeShippingThreshold?.amount || 0} onChange={e => setFst('amount', parseFloat(e.target.value) || 0)} className={inputCls} />
                </div>
              )}
            </div>

            {/* Delivery Estimates */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Delivery Estimates</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Per-courier estimated days, shown in order confirmation messages via <code>{'{eta}'}</code>.</p>
              </div>
              {(settings.deliveryEstimates || []).length > 0 && (
                <div className="space-y-2">
                  {(settings.deliveryEstimates || []).map((est: any, i: number) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                      <Truck size={13} className="text-accent flex-shrink-0" />
                      <span className={`flex-1 text-xs font-semibold ${K.text}`}>{est.courier}</span>
                      <span className={`text-xs ${K.muted}`}>{est.minDays}–{est.maxDays} days</span>
                      <button onClick={() => removeDeliveryEstimate(i)} className="text-red-400 hover:text-red-300 transition-colors"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                <div className="grid grid-cols-5 gap-3 items-end">
                  <div className="col-span-2">
                    <label className={lbl}>Courier</label>
                    <select value={newEstRow.courier} onChange={e => setNewEstRow(r => ({ ...r, courier: e.target.value }))} className={inputCls}>
                      <option value="">Select…</option>
                      {(settings.shippingCompanies || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Min days</label>
                    <input type="number" min="1" value={newEstRow.minDays} onChange={e => setNewEstRow(r => ({ ...r, minDays: parseInt(e.target.value) || 1 }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={lbl}>Max days</label>
                    <input type="number" min="1" value={newEstRow.maxDays} onChange={e => setNewEstRow(r => ({ ...r, maxDays: parseInt(e.target.value) || 3 }))} className={inputCls} />
                  </div>
                  <button onClick={addDeliveryEstimate} className="flex items-center justify-center gap-1 px-3 py-3 rounded-xl bg-accent text-white text-xs font-bold hover:opacity-90 transition-all"><Plus size={13} /></button>
                </div>
              </div>
            </div>

            {/* Sender Address */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <p className={`text-sm font-semibold ${K.text}`}>Sender Address</p>
              <textarea rows={3} value={settings.senderAddress || ''} onChange={e => set('senderAddress', e.target.value)} placeholder="Your shop's return / sender address" className={`${inputCls} resize-none`} autoComplete="off" />
            </div>

            {/* Shipping Notification Message */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Shipping Notification Message</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Sent when you mark an order as shipped.</p>
              </div>
              <textarea rows={6} value={settings.trackingTemplate || ''} onChange={e => set('trackingTemplate', e.target.value)} className={`${inputCls} resize-none leading-relaxed`} autoComplete="off" />
              <p className={`text-[10px] ${K.muted}`}>Placeholders: <code>{'{tracking}'}</code> <code>{'{courier}'}</code> <code>{'{product}'}</code> <code>{'{name}'}</code> <code>{'{eta}'}</code></p>
            </div>
          </div>

          {/* ══ NOTIFICATIONS ════════════════════════════════════════════════ */}
          <div id="notifications" className="space-y-6">
            <div className={`flex items-center gap-2 ${hlCls('notifications')}`}>
              <Bell size={15} className="text-accent" />
              <h2 className={`text-base font-bold ${K.text}`}>Notifications</h2>
            </div>

            {/* Order Status Notifications */}
            <div className={`rounded-2xl overflow-hidden ${K.surface}`}>
              <div className={`px-6 py-4 border-b ${K.border}`}>
                <p className={`text-sm font-semibold ${K.text}`}>Order Status Notifications</p>
                <p className={`text-xs mt-0.5 ${K.muted}`}>
                  Auto-send a LINE message when status changes. Placeholders: <code className="font-mono">{'{product}'}</code> <code className="font-mono">{'{amount}'}</code> <code className="font-mono">{'{tracking}'}</code> <code className="font-mono">{'{courier}'}</code> <code className="font-mono">{'{name}'}</code>
                </p>
              </div>
              {([
                { key: 'paid',      label: 'Order Confirmed', sub: 'When payment is received' },
                { key: 'preparing', label: 'Being Prepared',  sub: 'When moved to preparing' },
                { key: 'shipped',   label: 'Shipped',         sub: 'When tracking is entered' },
                { key: 'delivered', label: 'Delivered',       sub: 'When marked as delivered' },
              ] as const).map(({ key, label, sub }, i, arr) => {
                const stage = settings.orderNotifications?.[key] ?? {};
                return (
                  <div key={key} className={i < arr.length - 1 ? `border-b ${K.border}` : ''}>
                    <div className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${K.text}`}>{label}</p>
                        <p className={`text-xs ${K.muted}`}>{sub}</p>
                      </div>
                      <Toggle enabled={!!stage.enabled} onChange={v => set('orderNotifications', { ...settings.orderNotifications, [key]: { ...stage, enabled: v } })} />
                    </div>
                    {stage.enabled && (
                      <div className={`px-6 pb-5 pt-0 ${isDark ? 'bg-[#1a1d2e]/50' : 'bg-slate-50/70'}`}>
                        <textarea rows={4} value={stage.template ?? ''} onChange={e => set('orderNotifications', { ...settings.orderNotifications, [key]: { ...stage, template: e.target.value } })} className={`w-full rounded-xl px-4 py-3 text-xs border font-mono leading-relaxed resize-none transition-colors ${K.inp}`} autoComplete="off" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Admin Alerts */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Admin Alerts</p>
                <p className={`text-xs mt-1 ${K.muted}`}>Push LINE messages to your Admin LINE User ID for key events.</p>
              </div>
              <div className="space-y-3">
                {([
                  { key: 'newOrder',     label: 'New Order Placed',    sub: 'Alert when a customer places a new order' },
                  { key: 'slipReceived', label: 'Payment Slip Received', sub: 'Alert when a slip is verified by SlipOK (coming soon)' },
                  { key: 'outOfStock',   label: 'Product Out of Stock', sub: 'Alert when a product stock reaches 0 (coming soon)' },
                ] as const).map(({ key, label, sub }) => (
                  <div key={key} className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                    <div>
                      <p className={`text-xs font-semibold ${K.text}`}>{label}</p>
                      <p className={`text-[10px] ${K.muted}`}>{sub}</p>
                    </div>
                    <Toggle enabled={!!settings.adminAlerts?.[key]} onChange={v => setAa(key, v)} />
                  </div>
                ))}
              </div>
              {settings.adminAlerts?.outOfStock && (
                <div className="md:w-1/3">
                  <label className={lbl}>Low stock threshold (qty)</label>
                  <input type="number" min="1" value={settings.adminAlerts?.lowStockThreshold ?? 5} onChange={e => setAa('lowStockThreshold', parseInt(e.target.value) || 5)} className={inputCls} />
                  <p className={hint}>Also alert when stock falls to or below this</p>
                </div>
              )}
              {(settings.adminAlerts?.newOrder || settings.adminAlerts?.slipReceived || settings.adminAlerts?.outOfStock) && !settings.adminLineId && (
                <div className={`px-4 py-3 rounded-xl text-xs flex items-center gap-2 ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  Set your <strong>Admin LINE User ID</strong> in the LINE tab to receive these alerts.
                </div>
              )}
            </div>

            {/* Broadcast Reminders */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${K.text}`}>Broadcast Reminders</p>
                  <p className={`text-xs mt-0.5 ${K.muted}`}>Notify admin before a scheduled broadcast fires. (Stored; wiring coming soon.)</p>
                </div>
                <Toggle enabled={!!settings.broadcastReminder?.enabled} onChange={v => set('broadcastReminder', { ...(settings.broadcastReminder || {}), enabled: v })} />
              </div>
              {settings.broadcastReminder?.enabled && (
                <div className="md:w-1/2">
                  <label className={lbl}>Lead time before broadcast</label>
                  <select value={settings.broadcastReminder?.leadTimeMinutes ?? 60} onChange={e => set('broadcastReminder', { ...(settings.broadcastReminder || {}), leadTimeMinutes: parseInt(e.target.value) })} className={inputCls}>
                    <option value={15}>15 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>24 hours before</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ══ STOREFRONT ═══════════════════════════════════════════════════ */}
          <div id="storefront" className="space-y-6">
            <div className={`flex items-center gap-2 ${hlCls('storefront')}`}>
              <Store size={15} className="text-accent" />
              <h2 className={`text-base font-bold ${K.text}`}>Storefront</h2>
            </div>

            {/* Maintenance Mode — shown first and most prominent */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert size={16} className={settings.storefront?.maintenanceMode ? 'text-red-400' : K.muted.split(' ')[0]} />
                  <div>
                    <p className={`text-sm font-semibold ${K.text}`}>Maintenance Mode</p>
                    <p className={`text-xs mt-0.5 ${K.muted}`}>Replaces your storefront with a "We'll be back" page instantly.</p>
                  </div>
                </div>
                <Toggle enabled={!!settings.storefront?.maintenanceMode} onChange={v => setSf('maintenanceMode', v)} />
              </div>
              {settings.storefront?.maintenanceMode && (
                <div className={`px-4 py-3 rounded-xl text-xs flex items-start gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/25 text-red-300' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  <span><strong>Your storefront is currently offline.</strong> Customers will see the maintenance page until you disable this.</span>
                </div>
              )}
              {settings.storefront?.maintenanceMode && (
                <div>
                  <label className={lbl}>Maintenance Message</label>
                  <textarea rows={2} value={settings.storefront?.maintenanceMessage || ''} onChange={e => setSf('maintenanceMessage', e.target.value)} placeholder="We will be back soon." className={`${inputCls} resize-none`} autoComplete="off" />
                </div>
              )}
            </div>

            {/* Announcement Banner */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${K.text}`}>Announcement Banner</p>
                  <p className={`text-xs mt-0.5 ${K.muted}`}>A sticky banner shown at the top of your storefront.</p>
                </div>
                <Toggle enabled={!!settings.storefront?.announcementEnabled} onChange={v => setSf('announcementEnabled', v)} />
              </div>
              <div>
                <label className={lbl}>Banner Text</label>
                <input type="text" value={settings.storefront?.announcementText || ''} onChange={e => setSf('announcementText', e.target.value)} placeholder="Free shipping this week! 🎉" className={inputCls} autoComplete="off" maxLength={120} />
              </div>
              <div>
                <label className={lbl}>Banner Color</label>
                <div className="flex items-center gap-3 mt-1">
                  {([
                    { value: 'accent', label: 'Brand',  color: 'var(--accent)' },
                    { value: 'blue',   label: 'Info',    color: '#3b82f6' },
                    { value: 'amber',  label: 'Warning', color: '#f59e0b' },
                    { value: 'red',    label: 'Urgent',  color: '#ef4444' },
                  ]).map(({ value, label, color }) => {
                    const isActive = (settings.storefront?.announcementColor || 'accent') === value;
                    return (
                      <button key={value} onClick={() => setSf('announcementColor', value)} title={label}
                        className={`flex flex-col items-center gap-1 transition-all`}>
                        <div className={`w-7 h-7 rounded-full transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: color, outline: isActive ? `2px solid ${color}` : 'none', outlineOffset: '2px' }} />
                        <span className={`text-[9px] font-bold ${isActive ? K.text : K.muted}`}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {settings.storefront?.announcementEnabled && settings.storefront?.announcementText && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#1f2335]">
                  <p className={`text-[10px] px-3 py-1 font-bold uppercase tracking-widest ${K.muted} ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>Preview</p>
                  <div className="px-4 py-1.5 text-xs text-center font-medium text-white" style={{
                    backgroundColor: { accent: 'var(--accent)', blue: '#3b82f6', amber: '#f59e0b', red: '#ef4444' }[settings.storefront?.announcementColor as string] || 'var(--accent)'
                  }}>{settings.storefront.announcementText}</div>
                </div>
              )}
            </div>

            {/* Post-Checkout */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Post-Checkout Redirect</p>
                <p className={`text-xs mt-1 ${K.muted}`}>By default, customers see a "Order placed" confirmation screen. Optionally redirect to a custom URL.</p>
              </div>
              <div>
                <label className={lbl}>Redirect URL (optional)</label>
                <input type="url" value={settings.storefront?.postCheckoutUrl || ''} onChange={e => setSf('postCheckoutUrl', e.target.value)} placeholder="https://example.com/thank-you" className={inputCls} autoComplete="off" />
                <p className={hint}>Leave empty to use default confirmation screen</p>
              </div>
            </div>

            {/* Order Numbering */}
            <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
              <div>
                <p className={`text-sm font-semibold ${K.text}`}>Order Numbering</p>
                <p className={`text-xs mt-1 ${K.muted}`}>A display prefix prepended to order short-IDs in admin alerts and exports.</p>
              </div>
              <div className="md:w-1/2">
                <label className={lbl}>Order Prefix</label>
                <input type="text" value={settings.orderPrefix || ''} onChange={e => set('orderPrefix', e.target.value.replace(/[^a-zA-Z0-9\-_#]/g, ''))} placeholder="e.g. SP- or #" className={inputCls} maxLength={8} autoComplete="off" />
              </div>
              {settings.orderPrefix && (
                <p className={`text-xs ${K.muted}`}>Preview: <span className={`font-mono font-bold ${K.text}`}>{settings.orderPrefix}A1B2C3</span>, <span className={`font-mono font-bold ${K.text}`}>{settings.orderPrefix}D4E5F6</span></p>
              )}
            </div>
          </div>

          </>
        )}
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
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 active:scale-[0.99] transition-all flex-shrink-0 ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-accent hover:opacity-90'}`}
      >
        {isSaving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
        {isSaving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
    </div>
  );
}

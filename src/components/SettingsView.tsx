"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings as SettingsIcon, Plus, X, Save, Eye, EyeOff, Copy, Check,
  ExternalLink, RefreshCw, MessageSquare, Package, Zap, Loader2, AlertTriangle, Bell,
  Building2, ChevronRight,
} from 'lucide-react';
import NumberStepper from '@/components/NumberStepper';
import { getAccentText } from '@/lib/accent';

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

function Toggle({ enabled, onChange, isDark }: { enabled: boolean; onChange: (v: boolean) => void; isDark?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-accent' : isDark ? 'bg-[#2a2f45]' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
    </button>
  );
}


type SectionId = 'general' | 'line' | 'payment' | 'shipping' | 'notifications';

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
  onDirtyChange,
  refreshTrigger,
}: {
  theme?: 'light' | 'lite' | 'dark';
  onSave?: () => void;
  onThemeChange?: (newTheme: 'light' | 'lite' | 'dark') => void;
  onAccentChange?: (newColor: string, gradient?: string | null) => void;
  scrollTrigger?: { section: string; id: number } | null;
  onDirtyChange?: (isDirty: boolean) => void;
  refreshTrigger?: number;
}) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';

  const containerRef       = useRef<HTMLDivElement>(null);
  const isScrollingRef     = useRef(false);
  const scrollTimeoutRef   = useRef<NodeJS.Timeout | null>(null);

  const [activeSection, setActiveSection] = useState<SectionId>('general');
  const [highlighted, setHighlighted]     = useState<string | null>(null);

  const [settings, setSettings]       = useState<any>(null);
  const [newCompany, setNewCompany]   = useState('');
  const [newBankRow, setNewBankRow]   = useState({ bankName: '', accountNumber: '', accountName: '', branch: '' });
  const [showGuide, setShowGuide]     = useState(true);
  const [isSaving,  setIsSaving]      = useState(false);
  const [saved,     setSaved]         = useState(false);
  const [saveError, setSaveError]     = useState('');
  const [originalSettings, setOriginalSettings] = useState<any>(null);

  const [customG, setCustomG] = useState<{ c1: string; c2: string; angle: number | 'radial' }>({ c1: '#8b5cf6', c2: '#ec4899', angle: 135 });
  const [accentTab, setAccentTab] = useState<'solid' | 'gradient'>('solid');
  const [showCustomGradBuilder, setShowCustomGradBuilder] = useState(false);
  const [customSolids, setCustomSolids] = useState<string[]>([]);
  const [customGrads, setCustomGrads] = useState<string[]>([]);
  const customInitRef = useRef(false);

  const [showToken,       setShowToken]       = useState(false);
  const [showSecret,      setShowSecret]      = useState(false);
  const [showLiff,        setShowLiff]        = useState(false);
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
  }, [checkLine, refreshTrigger]);

  useEffect(() => {
    if (!settings || customInitRef.current) return;
    customInitRef.current = true;
    setOriginalSettings(settings);
    if (settings.dashboardAccentGradient) setAccentTab('gradient');
    if (Array.isArray(settings.dashboardCustomSolids)) setCustomSolids(settings.dashboardCustomSolids.slice(0, 3));
    if (Array.isArray(settings.dashboardCustomGradients)) setCustomGrads(settings.dashboardCustomGradients.slice(0, 3));
  }, [settings]);

  // Track unsaved changes (excluding theme and accent which auto-save)
  useEffect(() => {
    if (!settings || !originalSettings) {
      onDirtyChange?.(false);
      return;
    }

    const isModified = Object.keys(settings).some(key => {
      if (['theme', 'dashboardAccent', 'dashboardAccentGradient'].includes(key)) return false;
      return JSON.stringify(settings[key]) !== JSON.stringify(originalSettings[key]);
    });

    onDirtyChange?.(isModified);
  }, [settings, originalSettings, onDirtyChange]);

  const scrollTo = useCallback((id: string) => {
    const container = containerRef.current;
    const el = container?.querySelector<HTMLElement>(`#${id}`);
    if (el && container) {
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24;
      container.scrollTo({ top, behavior: 'smooth' });
      const sectionIds: SectionId[] = ['general', 'line', 'payment', 'shipping', 'notifications'];
      const section = sectionIds.find(s => id === s || id.startsWith(s + '-')) ?? 'general';
      setActiveSection(section);
      scrollTimeoutRef.current = setTimeout(() => { isScrollingRef.current = false; }, 600);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ids: SectionId[] = ['general', 'line', 'payment', 'shipping', 'notifications'];
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (isScrollingRef.current) return;
      const visible = entries.filter(e => e.isIntersecting).map(e => e.target.id as SectionId);
      if (visible.length > 0) { const next = ids.find(id => visible.includes(id)); if (next) setActiveSection(next); }
    };
    const observer = new IntersectionObserver(observerCallback, { root: container, rootMargin: '-40px 0px -60% 0px', threshold: 0 });
    ids.forEach(id => { const el = container.querySelector(`#${id}`); if (el) observer.observe(el); });

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      const threshold = 15;
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
        setActiveSection('notifications');
      } else if (container.scrollTop === 0) {
        setActiveSection('general');
      } else {
        const containerTop = container.getBoundingClientRect().top;
        const triggerLine = containerTop + 80;
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
  const setBh = (field: string, value: any) => setSettings((s: any) => ({ ...s, businessHours: { ...(s?.businessHours || {}), [field]: value } }));
  const setAa = (field: string, value: any) => setSettings((s: any) => ({ ...s, adminAlerts: { ...(s?.adminAlerts || {}), [field]: value } }));
  const setPm = (field: string, value: any) => setSettings((s: any) => ({ ...s, paymentMethods: { ...(s?.paymentMethods || {}), [field]: value } }));
  const setFst = (field: string, value: any) => setSettings((s: any) => ({ ...s, freeShippingThreshold: { ...(s?.freeShippingThreshold || {}), [field]: value } }));

  const handleThemeChange = async (newTheme: 'light' | 'lite' | 'dark') => {
    set('theme', newTheme);
    onThemeChange?.(newTheme);
    try {
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, theme: newTheme }) });
      onSave?.();
    } catch {}
  };

  const handleAccentChange = async (newColor: string, gradient?: string | null) => {
    const update: any = { dashboardAccent: newColor };
    if (gradient !== undefined) update.dashboardAccentGradient = gradient || null;
    setSettings((s: any) => ({ ...s, ...update }));
    onAccentChange?.(newColor, gradient);
    try {
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...settings, ...update }) });
      onSave?.();
    } catch {}
  };

  function saveCustomSolids(arr: string[]) {
    setCustomSolids(arr);
    fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dashboardCustomSolids: arr }) }).catch(() => {});
  }

  function saveCustomGrads(arr: string[]) {
    setCustomGrads(arr);
    fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dashboardCustomGradients: arr }) }).catch(() => {});
  }

  function extractGradientPrimary(css: string): string {
    const m = css.match(/#[0-9a-fA-F]{6}/);
    return m ? m[0] : '#8b5cf6';
  }

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

  // ── Style tokens ─────────────────────────────────────────────────────────────
  const K = {
    bg:      isDark ? 'bg-[#0f1117]'                          : isLite ? 'bg-[#d9dfe8]'                         : 'bg-slate-50',
    surface: isDark ? 'bg-[#161925] border border-[#1f2335]' : isLite ? 'bg-[#e7ecf3] border border-[#cdd3dd]' : 'bg-white border border-slate-200',
    text:    isDark ? 'text-white'                            : isLite ? 'text-[#2f3744]'                        : 'text-slate-900',
    muted:   isDark ? 'text-[#8b92ad]'                       : isLite ? 'text-[#6d7a8c]'                        : 'text-slate-500',
    border:  isDark ? 'border-[#1f2335]'                     : isLite ? 'border-[#cdd3dd]'                      : 'border-slate-200',
    inp:     isDark
      ? 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad] focus:border-accent focus:outline-none'
      : isLite
      ? 'bg-[#f0f3f8] border-[#cdd3dd] text-[#2f3744] placeholder-[#7a8598] focus:border-accent focus:outline-none'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none',
  };

  // Locally-resolved accent bg so gradient shows immediately without waiting for parent re-fetch
  const localAccentBg = settings?.dashboardAccentGradient || 'var(--accent)';
  const accentTextColor = getAccentText(settings?.dashboardAccent || '#00b900');

  const GRADIENT_PRESETS = [
    { name: 'Sunset',  gradient: 'linear-gradient(135deg,#f97316,#ef4444)', primary: '#f97316' },
    { name: 'Ocean',   gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)', primary: '#06b6d4' },
    { name: 'Aurora',  gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', primary: '#8b5cf6' },
    { name: 'Forest',  gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)', primary: '#10b981' },
    { name: 'Gold',    gradient: 'linear-gradient(135deg,#f59e0b,#f97316)', primary: '#f59e0b' },
    { name: 'Indigo',  gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', primary: '#6366f1' },
  ];

  const inputCls  = `w-full rounded-xl px-4 py-3 text-sm border transition-colors ${K.inp}`;
  const inputMono = `${inputCls} font-mono text-xs pr-12`;
  const lbl       = `block text-[10px] font-bold uppercase tracking-widest mb-2 ${K.muted}`;
  const hint      = `text-[10px] mt-1 ml-1 ${K.muted}`;

  const hlCls = (id: string) => `rounded-xl px-3 py-2 -mx-3 transition-colors duration-1000 ${highlighted === id ? isDark ? 'bg-accent/20 ring-1 ring-accent/30' : 'bg-accent/5 ring-1 ring-accent/30' : ''}`;
  const ringCls = (id: string) => `rounded-2xl p-6 space-y-5 ${K.surface} transition-colors duration-700 ${highlighted === id ? 'ring-2 ring-accent/50' : ''}`;

  const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'general',       label: 'General',       icon: <SettingsIcon  size={14} />, desc: 'Theme, language & hours'    },
    { id: 'line',          label: 'LINE',          icon: <MessageSquare size={14} />, desc: 'Webhook & credentials'      },
    { id: 'payment',       label: 'Payment',       icon: <Zap           size={14} />, desc: 'Methods, SlipOK & loyalty'  },
    { id: 'shipping',      label: 'Shipping',      icon: <Package       size={14} />, desc: 'Rates & companies'          },
    { id: 'notifications', label: 'Notifications', icon: <Bell          size={14} />, desc: 'Alerts & templates'         },
  ];

  const isSettingsLoading = !settings;

  return (
    <div className={`flex flex-1 min-h-0 ${K.bg}`}>

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <div className={`w-52 flex-shrink-0 flex flex-col py-5 px-3 border-r ${isDark ? 'border-[#1f2335]' : isLite ? 'border-[#cdd3dd]' : 'border-slate-200'}`}>
        <p className={`text-[10px] font-bold uppercase tracking-widest px-3 mb-3 ${K.muted}`}>Settings</p>

        <nav className="flex-1 space-y-0.5">
          {SECTIONS.map(s => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                  active
                    ? isDark ? 'bg-white/[0.08] border-white/10' : 'bg-slate-100 border-slate-200'
                    : 'border-transparent ' + (isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    active ? 'text-white' : isDark ? 'text-[#8b92ad]' : 'text-slate-500'
                  }`}
                  style={active ? { background: localAccentBg, color: accentTextColor } : undefined}
                >
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-tight truncate transition-colors ${
                    active ? isDark ? 'text-white' : 'text-slate-900' : isDark ? 'text-[#8b92ad]' : 'text-slate-600'
                  }`}>
                    {s.label}
                  </p>
                  <p className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-[#4a5068]' : 'text-slate-400'}`}>
                    {s.desc}
                  </p>
                </div>
                {active && <ChevronRight size={12} className="ml-auto flex-shrink-0 text-accent" />}
              </button>
            );
          })}
        </nav>

        {/* Save */}
        <div className={`pt-4 mt-4 border-t ${isDark ? 'border-[#1f2335]' : 'border-slate-200'}`}>
          {saveError && <p className="text-[10px] text-red-400 mb-2 text-center">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={isSaving || isSettingsLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
            style={{ background: saved ? '#10b981' : localAccentBg, color: saved ? '#ffffff' : accentTextColor }}
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
            {isSaving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0">
        <div ref={containerRef} className="flex-1 overflow-y-auto">
          <div className="px-6 pb-16 max-w-3xl mx-auto space-y-16 pt-6">
            {isSettingsLoading ? (
              <div className="py-32 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
                <div className="w-10 h-10 border-4 border-t-transparent border-accent rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Syncing Merchant Profile…</span>
              </div>
            ) : (
              <>

              {/* ══ GENERAL ════════════════════════════════════════════════ */}
              <div id="general" className="space-y-6 pt-2">
                <div className={`flex items-center gap-2 ${hlCls('general')}`}>
                  <SettingsIcon size={15} className="text-accent" />
                  <h2 className={`text-base font-bold ${K.text}`}>General</h2>
                </div>

                {/* Appearance */}
                <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
                  <div>
                    <p className={`text-sm font-semibold ${K.text}`}>Appearance</p>
                    <p className={`text-xs mt-1 ${K.muted}`}>Dashboard theme and color preferences.</p>
                  </div>
                  <div>
                    <label className={lbl}>Theme</label>
                    <div className="flex items-center gap-2 mt-1">
                      {([
                        { id: 'light' as const, label: 'Light' },
                        { id: 'lite'  as const, label: 'Lite'  },
                        { id: 'dark'  as const, label: 'Dark'  },
                      ]).map(t => {
                        const active = (settings.theme || 'light') === t.id;
                        return (
                          <button key={t.id} onClick={() => handleThemeChange(t.id)}
                            className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              active
                                ? 'text-white border-transparent shadow-sm'
                                : isDark
                                ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-[#3a3f55]'
                                : isLite
                                ? 'border-[#b8c2d8] text-[#5a6285] hover:text-[#1a1d2e] hover:border-[#8892b0]'
                                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }`}
                            style={active ? { background: localAccentBg, color: accentTextColor } : undefined}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Accent Color</label>
                    <div className="mt-2 space-y-3">
                      {/* Tab switcher */}
                      <div className={`flex p-0.5 rounded-lg ${isDark ? 'bg-[#0f1117]' : isLite ? 'bg-[#dfe2eb]' : 'bg-slate-100'}`}>
                        {(['solid', 'gradient'] as const).map(tab => (
                          <button key={tab} onClick={() => setAccentTab(tab)}
                            className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all capitalize ${
                              accentTab === tab ? '' : isDark ? 'text-[#8b92ad] hover:text-white' : isLite ? 'text-[#6b7280] hover:text-[#1f2235]' : 'text-slate-400 hover:text-slate-700'
                            }`}
                            style={accentTab === tab ? { background: 'var(--accent-gradient)', color: 'var(--accent-text, white)' } : undefined}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* ── Solid tab ── */}
                      {accentTab === 'solid' && (
                        <div className="space-y-2.5">
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${K.muted}`}>Presets</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {ACCENT_PRESETS.map(color => {
                              const isActive = (settings.dashboardAccent || '#00b900') === color && !settings.dashboardAccentGradient;
                              return (
                                <button key={color} onClick={() => handleAccentChange(color, null)} title={color}
                                  style={{ backgroundColor: color, ...(isActive ? { outline: `2.5px solid ${color}`, outlineOffset: '2px' } : {}) }}
                                  className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                                />
                              );
                            })}
                          </div>
                          <div className={`h-px ${isDark ? 'bg-[#1f2335]' : isLite ? 'bg-[#b8c2d8]' : 'bg-slate-100'}`} />
                          <div className="flex items-center justify-between">
                            <p className={`text-[9px] font-bold uppercase tracking-wider ${K.muted}`}>Custom</p>
                            {customSolids.length < 3 && (
                              <button
                                onClick={() => {
                                  const next = [...customSolids, '#8b5cf6'];
                                  saveCustomSolids(next);
                                  handleAccentChange('#8b5cf6', null);
                                }}
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${isDark ? 'bg-[#1f2335] text-[#8b92ad] hover:text-white' : isLite ? 'bg-[#b8c2d8] text-[#5a6285] hover:text-[#1a1d2e]' : 'bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                                title="Add custom color"
                              >+</button>
                            )}
                          </div>
                          {customSolids.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {customSolids.map((color, i) => {
                                const isActive = (settings.dashboardAccent || '#00b900') === color && !settings.dashboardAccentGradient;
                                const inputId = `sv-cs-${i}`;
                                return (
                                  <div key={i} className="relative group flex-shrink-0">
                                    <label
                                      htmlFor={inputId}
                                      title={color}
                                      className={`w-8 h-8 rounded-full cursor-pointer block transition-all hover:scale-105 ${isActive ? 'scale-110' : ''}`}
                                      style={{
                                        backgroundColor: color,
                                        ...(isActive ? { outline: `2.5px solid ${color}`, outlineOffset: '2px' } : {}),
                                      }}
                                    />
                                    <input
                                      id={inputId}
                                      type="color"
                                      value={color}
                                      onChange={e => {
                                        const next = customSolids.map((c, j) => j === i ? e.target.value : c);
                                        saveCustomSolids(next);
                                        handleAccentChange(e.target.value, null);
                                      }}
                                      className="sr-only"
                                    />
                                    <button
                                      onClick={() => saveCustomSolids(customSolids.filter((_, j) => j !== i))}
                                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400 leading-none"
                                      title="Remove"
                                    >×</button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Gradient tab ── */}
                      {accentTab === 'gradient' && (
                        <div className="space-y-2.5">
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${K.muted}`}>Presets</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {GRADIENT_PRESETS.map(g => {
                              const isActive = settings.dashboardAccentGradient === g.gradient;
                              return (
                                <button key={g.name} onClick={() => handleAccentChange(g.primary, g.gradient)} title={g.name}
                                  style={{ background: g.gradient, ...(isActive ? { outline: `2.5px solid ${g.primary}`, outlineOffset: '2px' } : {}) }}
                                  className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                                />
                              );
                            })}
                          </div>
                          <div className={`h-px ${isDark ? 'bg-[#1f2335]' : isLite ? 'bg-[#b8c2d8]' : 'bg-slate-100'}`} />
                          <div className="flex items-center justify-between">
                            <p className={`text-[9px] font-bold uppercase tracking-wider ${K.muted}`}>Custom</p>
                            {customGrads.length < 3 && (
                              <button
                                onClick={() => setShowCustomGradBuilder(v => !v)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${isDark ? 'bg-[#1f2335] text-[#8b92ad] hover:text-white' : isLite ? 'bg-[#b8c2d8] text-[#5a6285] hover:text-[#1a1d2e]' : 'bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                                title="Build custom gradient"
                              >+</button>
                            )}
                          </div>
                          {customGrads.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {customGrads.map((css, i) => {
                                const primary = extractGradientPrimary(css);
                                const isActive = settings.dashboardAccentGradient === css;
                                return (
                                  <div key={i} className="relative group flex-shrink-0">
                                    <button
                                      onClick={() => handleAccentChange(primary, css)}
                                      title="Custom gradient"
                                      style={{ background: css, ...(isActive ? { outline: `2.5px solid ${primary}`, outlineOffset: '2px' } : {}) }}
                                      className={`w-8 h-8 rounded-full transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                                    />
                                    <button
                                      onClick={() => saveCustomGrads(customGrads.filter((_, j) => j !== i))}
                                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400 leading-none"
                                      title="Remove"
                                    >×</button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* Builder panel */}
                          {showCustomGradBuilder && (
                            <div className={`rounded-xl border p-3 space-y-2 ${isDark ? 'bg-[#0d0f16] border-[#1f2335]' : isLite ? 'bg-[#ccd2e4] border-[#b8c2d8]' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-center justify-center gap-2">
                                <label title="Start" className="w-8 h-8 rounded-full cursor-pointer relative hover:scale-105 transition-all flex-shrink-0 overflow-hidden"
                                  style={{ backgroundColor: customG.c1 }}>
                                  <input type="color" value={customG.c1} onChange={e => setCustomG(g => ({ ...g, c1: e.target.value }))}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                </label>
                                <div className="flex gap-0.5">
                                  {([
                                    { deg: 90,       icon: '→' },
                                    { deg: 135,      icon: '↘' },
                                    { deg: 180,      icon: '↓' },
                                    { deg: 45,       icon: '↗' },
                                    { deg: 'radial', icon: '○' },
                                  ] as const).map(a => (
                                    <button key={String(a.deg)}
                                      onClick={() => setCustomG(g => ({ ...g, angle: a.deg }))}
                                      title={a.deg === 'radial' ? 'Radial' : `${a.deg}°`}
                                      className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all border ${
                                        customG.angle === a.deg
                                          ? 'border-transparent'
                                          : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : isLite ? 'border-[#b8c2d8] text-[#5a6285] hover:text-[#1a1d2e]' : 'border-slate-200 text-slate-400 hover:text-slate-700'
                                      }`}
                                      style={customG.angle === a.deg ? { background: 'var(--accent-gradient)', color: 'var(--accent-text, white)' } : undefined}
                                    >
                                      {a.icon}
                                    </button>
                                  ))}
                                </div>
                                <label title="End" className="w-8 h-8 rounded-full cursor-pointer relative hover:scale-105 transition-all flex-shrink-0 overflow-hidden"
                                  style={{ backgroundColor: customG.c2 }}>
                                  <input type="color" value={customG.c2} onChange={e => setCustomG(g => ({ ...g, c2: e.target.value }))}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-6 rounded-lg"
                                  style={{ background: customG.angle === 'radial'
                                    ? `radial-gradient(circle, ${customG.c1}, ${customG.c2})`
                                    : `linear-gradient(${customG.angle}deg, ${customG.c1}, ${customG.c2})`
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const gradient = customG.angle === 'radial'
                                      ? `radial-gradient(circle,${customG.c1},${customG.c2})`
                                      : `linear-gradient(${customG.angle}deg,${customG.c1},${customG.c2})`;
                                    saveCustomGrads([...customGrads, gradient]);
                                    handleAccentChange(customG.c1, gradient);
                                    setShowCustomGradBuilder(false);
                                  }}
                                  className="px-3 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
                                  style={{ background: 'var(--accent-gradient)', color: 'var(--accent-text, white)' }}
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                      <p className={`text-xs mt-0.5 ${K.muted}`}>When closed, sends the message below instead of normal auto-replies. Does not affect the storefront.</p>
                    </div>
                    <Toggle enabled={!!settings.businessHours?.enabled} onChange={v => setBh('enabled', v)} isDark={isDark} />
                  </div>
                  {settings.businessHours?.enabled && (
                    <div className="space-y-3 pt-2 border-t border-dashed border-slate-200 dark:border-[#1f2335]">
                      {DAYS.map(({ key, label }) => {
                        const day = settings.businessHours?.[key] || { enabled: key !== 'sat' && key !== 'sun', open: '09:00', close: '18:00' };
                        return (
                          <div key={key} className="flex items-center gap-4">
                            <div className="w-28 flex items-center gap-2 flex-shrink-0">
                              <Toggle enabled={!!day.enabled} onChange={v => setBh(key, { ...day, enabled: v })} isDark={isDark} />
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

                {/* Order Numbering */}
                <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
                  <div>
                    <p className={`text-sm font-semibold ${K.text}`}>Order Numbering</p>
                    <p className={`text-xs mt-1 ${K.muted}`}>Prefix added to the short order ID shown in alerts and messages.</p>
                  </div>
                  <div className="md:w-1/2">
                    <label className={lbl}>Order Prefix</label>
                    <input type="text" value={settings.orderPrefix || ''} onChange={e => set('orderPrefix', e.target.value)} placeholder="e.g. ORD- or SHOP-" maxLength={10} className={inputCls} autoComplete="off" />
                    <p className={hint}>Example: <code>{settings.orderPrefix || 'ORD-'}A1B2C3</code></p>
                  </div>
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

              {/* ══ LINE ══════════════════════════════════════════════════ */}
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

              {/* ══ PAYMENT ═════════════════════════════════════════════ */}
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
                        <Toggle enabled={!!settings.paymentMethods?.[key]} onChange={v => setPm(key, v)} isDark={isDark} />
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
                <div className={`rounded-2xl p-6 space-y-5 ${K.surface}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                      <div>
                        <p className={`text-sm font-semibold ${K.text}`}>SlipOK — Automatic Slip Verification</p>
                        <p className={`text-xs mt-0.5 ${K.muted}`}>When a customer sends a transfer slip in chat, it is verified and the order is marked paid automatically.</p>
                      </div>
                    </div>
                    <Toggle enabled={!!settings.useSlipok} onChange={v => set('useSlipok', v)} isDark={isDark} />
                  </div>

                  <div className={`rounded-xl p-4 space-y-2 text-xs ${isDark ? 'bg-blue-500/5 border border-blue-500/15' : 'bg-blue-50 border border-blue-100'}`}>
                    <p className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>How it works</p>
                    <p className={K.muted}>SlipOK reads the transfer amount from the slip image and automatically matches it to your pending orders — then sends your Payment Confirmation Message without any manual effort.</p>
                    <p className={`${K.muted} mt-1`}>
                      You need your own{' '}
                      <a href="https://www.slipok.com" target="_blank" rel="noopener noreferrer" className={`underline font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>SlipOK account</a>
                      {' '}linked to your bank account. Sign up, create a branch for your store, and paste the credentials below.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className={`text-xs font-medium ${K.muted}`}>Branch ID</label>
                      <input type="text" value={settings.slipokBranchId || ''} onChange={e => set('slipokBranchId', e.target.value)} placeholder="e.g. SLIP-XXXXX" className={inputCls} autoComplete="off" />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-xs font-medium ${K.muted}`}>API Key</label>
                      <input type="password" value={settings.slipokApiKey || ''} onChange={e => set('slipokApiKey', e.target.value)} placeholder="Your SlipOK API key..." className={inputCls} autoComplete="new-password" />
                    </div>
                  </div>

                  {settings.useSlipok && settings.slipokApiKey && settings.slipokBranchId ? (
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                      <Check size={13} className="flex-shrink-0" />
                      SlipOK is active. Slip images sent in LINE chat will be verified automatically.
                    </div>
                  ) : settings.useSlipok ? (
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                      <AlertTriangle size={13} className="flex-shrink-0" />
                      Enter your Branch ID and API Key above, then save to activate slip verification.
                    </div>
                  ) : null}
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
                      <p className={`text-xs mt-0.5 ${K.muted}`}>Pending orders not paid within this window are automatically cancelled. Runs hourly.</p>
                    </div>
                    <Toggle enabled={(settings.autoCancelHours || 0) > 0} onChange={v => set('autoCancelHours', v ? 24 : 0)} isDark={isDark} />
                  </div>
                  {(settings.autoCancelHours || 0) > 0 && (
                    <div className="md:w-1/3">
                      <label className={lbl}>Cancel after (hours)</label>
                      <NumberStepper value={settings.autoCancelHours || 24} onChange={v => set('autoCancelHours', v)} min={1} max={168} step={1} isDark={isDark} />
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
                    <Toggle enabled={!!settings.loyalty?.enabled} onChange={v => set('loyalty', { ...(settings.loyalty || {}), enabled: v })} isDark={isDark} />
                  </div>
                  {settings.loyalty?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-dashed border-slate-200 dark:border-[#1f2335]">
                      <div>
                        <label className={lbl}>Points per ฿1 spent</label>
                        <NumberStepper value={settings.loyalty?.pointsPerBaht ?? 1} onChange={v => set('loyalty', { ...(settings.loyalty || {}), pointsPerBaht: v })} min={0.1} step={0.1} isDark={isDark} />
                      </div>
                      <div>
                        <label className={lbl}>Points to redeem ฿1</label>
                        <NumberStepper value={settings.loyalty?.redeemRate ?? 100} onChange={v => set('loyalty', { ...(settings.loyalty || {}), redeemRate: v })} min={1} step={100} isDark={isDark} />
                        <p className={`text-[10px] mt-1 ${K.muted}`}>{settings.loyalty?.redeemRate ?? 100} pts = ฿1</p>
                      </div>
                      <div>
                        <label className={lbl}>Min points to redeem</label>
                        <NumberStepper value={settings.loyalty?.minRedeemPoints ?? 100} onChange={v => set('loyalty', { ...(settings.loyalty || {}), minRedeemPoints: v })} min={1} step={100} isDark={isDark} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ══ SHIPPING ════════════════════════════════════════════ */}
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
                      <NumberStepper value={settings.defaultShippingCost || 0} onChange={v => set('defaultShippingCost', v)} min={0} step={100} isDark={isDark} />
                      <p className={hint}>Applied when no specific rate matches</p>
                    </div>
                    <div>
                      <label className={lbl}>COD Surcharge (฿)</label>
                      <NumberStepper value={settings.codSurcharge || 0} onChange={v => set('codSurcharge', v)} min={0} step={100} isDark={isDark} />
                      <p className={hint}>Extra fee added for cash-on-delivery orders</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-semibold ${K.text}`}>Free Shipping Threshold</p>
                      <p className={hint}>Waive shipping for orders above a minimum</p>
                    </div>
                    <Toggle enabled={!!settings.freeShippingThreshold?.enabled} onChange={v => setFst('enabled', v)} isDark={isDark} />
                  </div>
                  {settings.freeShippingThreshold?.enabled && (
                    <div className="md:w-1/3">
                      <label className={lbl}>Free shipping above (฿)</label>
                      <NumberStepper value={settings.freeShippingThreshold?.amount || 0} onChange={v => setFst('amount', v)} min={0} step={100} isDark={isDark} />
                    </div>
                  )}
                </div>

                {/* Sender Address */}
                <div className={`rounded-2xl p-6 space-y-4 ${K.surface}`}>
                  <p className={`text-sm font-semibold ${K.text}`}>Sender Address</p>
                  <textarea rows={3} value={settings.senderAddress || ''} onChange={e => set('senderAddress', e.target.value)} placeholder="Your shop's return / sender address" className={`${inputCls} resize-none`} autoComplete="off" />
                </div>
              </div>

              {/* ══ NOTIFICATIONS ══════════════════════════════════════ */}
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
                          <Toggle enabled={!!stage.enabled} onChange={v => set('orderNotifications', { ...settings.orderNotifications, [key]: { ...stage, enabled: v } })} isDark={isDark} />
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
                    <p className={`text-xs mt-1 ${K.muted}`}>Choose where each alert is delivered — dashboard bell, LINE message to your admin account, or both.</p>
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <div className="flex-1" />
                    <span className={`text-[10px] font-black uppercase tracking-widest w-16 text-center ${K.muted}`}>Dashboard</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest w-16 text-center ${K.muted}`}>LINE</span>
                  </div>
                  <div className="space-y-2">
                    {([
                      { key: 'newOrder',     label: 'New Order',           sub: 'Customer places an order via storefront' },
                      { key: 'slipReceived', label: 'Slip Verified',        sub: 'SlipOK confirms a payment slip' },
                      { key: 'slipFailed',   label: 'Slip Scan Failed',     sub: 'SlipOK cannot read the slip image' },
                      { key: 'outOfStock',   label: 'Out of Stock',         sub: 'A tracked product variant hits 0' },
                    ] as const).map(({ key, label, sub }) => (
                      <div key={key} className={`flex items-center gap-2 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                        <div className="flex-1">
                          <p className={`text-xs font-semibold ${K.text}`}>{label}</p>
                          <p className={`text-[10px] ${K.muted}`}>{sub}</p>
                        </div>
                        <div className="w-16 flex justify-center">
                          <Toggle enabled={!!settings.adminAlerts?.[key]?.dashboard} onChange={v => setAa(key, { ...(settings.adminAlerts?.[key] || {}), dashboard: v })} isDark={isDark} />
                        </div>
                        <div className="w-16 flex justify-center">
                          <Toggle enabled={!!settings.adminAlerts?.[key]?.line} onChange={v => setAa(key, { ...(settings.adminAlerts?.[key] || {}), line: v })} isDark={isDark} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {settings.adminAlerts?.outOfStock?.dashboard || settings.adminAlerts?.outOfStock?.line ? (
                    <div className="md:w-1/3">
                      <label className={lbl}>Low stock threshold (qty)</label>
                      <NumberStepper value={settings.adminAlerts?.lowStockThreshold ?? 5} onChange={v => setAa('lowStockThreshold', v)} min={1} step={1} isDark={isDark} />
                      <p className={hint}>Also alert when stock falls to or below this</p>
                    </div>
                  ) : null}
                  {(settings.adminAlerts?.newOrder?.line || settings.adminAlerts?.slipReceived?.line || settings.adminAlerts?.slipFailed?.line || settings.adminAlerts?.outOfStock?.line) && !settings.adminLineId && (
                    <div className={`px-4 py-3 rounded-xl text-xs flex items-center gap-2 ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                      <AlertTriangle size={13} className="flex-shrink-0" />
                      Set your <strong>Admin LINE User ID</strong> in the LINE tab to receive LINE alerts.
                    </div>
                  )}
                </div>

              </div>

              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

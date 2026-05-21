'use client';

import React, { useState, useRef } from 'react';
import {
  Check, LayoutGrid, List, Eye, Save, Link, Upload, Loader2, X,
  User, Palette, LayoutDashboard, Settings2, Megaphone, Globe,
  Wrench, Image as ImageIcon, ChevronRight, Store,
} from 'lucide-react';
import { PRESETS, resolvePreset } from '@/lib/storefrontPresets';
import { getAccentText } from '@/lib/accent';

interface StorefrontConfig {
  shopName: string;
  shopDescription: string;
  shopLogoUrl: string;
  shopTimezone: string;
  preset: string;
  shopTagline: string;
  bannerUrl: string;
  accentColor: string;
  cardLayout: 'grid' | 'list';
  showBrandFilter: boolean;
  showCategoryFilter: boolean;
  showSearch: boolean;
  announcementText: string;
  announcementEnabled: boolean;
  announcementColor: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  postCheckoutUrl: string;
  language: string;
  accentGradient?: string;
  customSolids?: string[];
  customGradients?: string[];
}

const DEFAULT_CONFIG: StorefrontConfig = {
  shopName: '', shopDescription: '', shopLogoUrl: '', shopTimezone: 'Asia/Bangkok',
  preset: 'midnight', shopTagline: '', bannerUrl: '', accentColor: '',
  cardLayout: 'grid', showBrandFilter: true, showCategoryFilter: true, showSearch: true,
  announcementText: '', announcementEnabled: false, announcementColor: 'accent',
  maintenanceMode: false, maintenanceMessage: 'We will be back soon.',
  postCheckoutUrl: '', language: 'th', accentGradient: '',
  customSolids: [], customGradients: [],
};

interface Props {
  shopName: string;
  slug?: string | null;
  initial?: Partial<StorefrontConfig>;
  theme?: 'light' | 'dark';
  accentColor?: string;
  onSave: (config: StorefrontConfig) => Promise<void>;
  onSaveSlug: (slug: string) => Promise<{ ok: boolean; error?: string }>;
}

type Tab = 'identity' | 'design' | 'content' | 'advanced';

const GRADIENT_PRESETS = [
  { name: 'Sunset',  gradient: 'linear-gradient(135deg,#f97316,#ef4444)', primary: '#f97316' },
  { name: 'Ocean',   gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)', primary: '#06b6d4' },
  { name: 'Aurora',  gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', primary: '#8b5cf6' },
  { name: 'Forest',  gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)', primary: '#10b981' },
  { name: 'Gold',    gradient: 'linear-gradient(135deg,#f59e0b,#f97316)', primary: '#f59e0b' },
  { name: 'Indigo',  gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', primary: '#6366f1' },
];

const SC_ACCENT_PRESETS = ['#ec4899', '#38bdf8', '#d97706', '#3b82f6', '#a855f7', '#ef4444'];

function LogoUpload({ value, onChange, isDark, accent }: { value: string; onChange: (url: string) => void; isDark: boolean; accent: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    if (file.size > 2 * 1024 * 1024) { setErr('Max 2 MB allowed.'); return; }
    setUploading(true); setErr('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) onChange(data.url);
      else setErr(data.error ?? 'Upload failed');
    } catch { setErr('Upload failed.'); }
    setUploading(false);
  }

  if (value) return (
    <div className="flex items-center gap-4">
      <img src={value} alt="logo" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-slate-200 dark:border-[#2d3555] shadow-md" onError={e => (e.currentTarget.style.display = 'none')} />
      <div className="space-y-2">
        <p className={`text-xs font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>Logo uploaded</p>
        <div className="flex gap-2">
          <button onClick={() => inputRef.current?.click()} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${isDark ? 'border-[#2a2f45] text-[#8b92ad] hover:text-white hover:border-[#3a3f55]' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
            <Upload size={11} /> Replace
          </button>
          <button onClick={() => onChange('')} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${isDark ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-500 hover:bg-red-50'}`}>
            <X size={11} /> Remove
          </button>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
    </div>
  );

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center gap-2 px-6 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragging ? 'border-accent bg-accent/5 scale-[1.01]' : isDark ? 'border-[#2a2f45] hover:border-accent/40 hover:bg-white/5' : 'border-slate-200 hover:border-accent/40 hover:bg-slate-50/50'}`}
      >
        {uploading
          ? <Loader2 size={22} className="animate-spin" style={{ color: accent }} />
          : <Upload size={22} className={isDark ? 'text-[#8b92ad]' : 'text-slate-400'} />}
        <div className="text-center">
          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>Drop logo or <span style={{ color: accent }}>browse</span></p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-[#8b92ad]' : 'text-slate-400'}`}>PNG, JPG, WebP · max 2 MB · square recommended</p>
        </div>
      </div>
      {err && <p className="text-xs text-red-400 mt-1.5">{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
    </div>
  );
}

function Toggle({ enabled, onChange, accent }: { enabled: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <button type="button" onClick={() => onChange(!enabled)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: enabled ? accent : '#374151' }}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function Card({ title, description, icon, children, isDark }: { title: string; description?: string; icon?: React.ReactNode; children: React.ReactNode; isDark: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 space-y-5 ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200 shadow-sm'}`}>
      {(title || description) && (
        <div className="flex items-start gap-3">
          {icon && (
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
              {icon}
            </div>
          )}
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</p>
            {description && <p className={`text-xs mt-0.5 ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>{description}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export default function StorefrontCustomizer({ shopName, slug: initialSlug, initial, theme = 'light', accentColor = '#00b900', onSave, onSaveSlug }: Props) {
  const isDark = theme === 'dark';
  const [config, setConfig] = useState<StorefrontConfig>({ ...DEFAULT_CONFIG, ...initial });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [accentTab, setAccentTab] = useState<'solid' | 'gradient'>(
    initial?.accentGradient ? 'gradient' : 'solid'
  );
  const [showCustomGradBuilder, setShowCustomGradBuilder] = useState(false);
  const [customG, setCustomG] = useState<{ c1: string; c2: string; angle: number | 'radial' }>({ c1: '#8b5cf6', c2: '#ec4899', angle: 135 });
  const [customSolids, setCustomSolids] = useState<string[]>(() =>
    Array.isArray(initial?.customSolids) ? initial!.customSolids!.slice(0, 3) : []
  );
  const [customGrads, setCustomGrads] = useState<string[]>(() =>
    Array.isArray(initial?.customGradients) ? initial!.customGradients!.slice(0, 3) : []
  );

  const [slugInput, setSlugInput] = useState(initialSlug ?? '');
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugSaved, setSlugSaved] = useState(false);
  const [slugError, setSlugError] = useState('');

  const p = resolvePreset(config.preset, config.accentColor);
  const accent = config.accentColor || accentColor;
  const localAccentBg = config.accentGradient || accent;
  const accentTextColor = getAccentText(accent || '#00b900');

  function set<K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function setAccent(hex: string, gradient?: string) {
    setConfig(prev => ({ ...prev, accentColor: hex, accentGradient: gradient ?? '' }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try { await onSave(config); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    finally { setSaving(false); }
  }

  async function handleSaveSlug() {
    if (!slugInput.trim() || slugSaving) return;
    setSlugSaving(true); setSlugError(''); setSlugSaved(false);
    const result = await onSaveSlug(slugInput.trim().toLowerCase());
    if (result.ok) { setSlugSaved(true); setTimeout(() => setSlugSaved(false), 2500); }
    else setSlugError(result.error ?? 'Failed to save handle');
    setSlugSaving(false);
  }

  const lbl = `text-xs font-medium block mb-1.5 ${isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`;
  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-sm bg-transparent focus:outline-none focus:ring-2 transition-all ${isDark ? 'border-[#2a2f45] text-white placeholder-[#4a5068] focus:border-accent focus:ring-accent/20' : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-accent focus:ring-accent/20'}`;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'identity', label: 'Identity',  icon: <User size={14} />,            desc: 'Name, logo & timezone'     },
    { id: 'design',   label: 'Design',    icon: <Palette size={14} />,          desc: 'Theme & colors'            },
    { id: 'content',  label: 'Content',   icon: <LayoutDashboard size={14} />,  desc: 'Layout & banners'          },
    { id: 'advanced', label: 'Advanced',  icon: <Settings2 size={14} />,        desc: 'URL, redirects & more'     },
  ];

  return (
    <div className="flex gap-8 items-start min-h-0">

      {/* ── Tab sidebar ─────────────────────────────────────────────────────── */}
      <div className="w-44 flex-shrink-0 space-y-1 sticky top-4">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                active
                  ? isDark ? 'bg-white/8 border border-white/10' : 'bg-slate-100 border border-slate-200'
                  : isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${active ? '' : isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}
                style={active ? { background: localAccentBg, color: accentTextColor } : undefined}>
                {tab.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold leading-tight truncate ${active ? isDark ? 'text-white' : 'text-slate-900' : isDark ? 'text-[#8b92ad]' : 'text-slate-600'}`}>{tab.label}</p>
              </div>
              {active && <ChevronRight size={12} className="ml-auto flex-shrink-0" style={{ color: accent }} />}
            </button>
          );
        })}

        {/* Save button */}
        <div className="pt-4">
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 hover:opacity-90 active:scale-95"
            style={{ background: saved ? '#10b981' : localAccentBg, color: saved ? '#ffffff' : accentTextColor }}>
            {saved ? <><Check size={13} />Saved!</> : saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : <><Save size={13} />Save</>}
          </button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* ── IDENTITY TAB ── */}
        {activeTab === 'identity' && (
          <>
            <Card title="Shop Name & Description" description="Shown on your storefront and all outgoing LINE messages." icon={<Store size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="space-y-4">
                <div>
                  <label className={lbl}>Shop Name</label>
                  <input type="text" value={config.shopName} onChange={e => set('shopName', e.target.value)} placeholder="My Awesome Shop" className={inputCls} autoComplete="off" />
                </div>
                <div>
                  <label className={lbl}>Shop Description</label>
                  <textarea rows={3} value={config.shopDescription} onChange={e => set('shopDescription', e.target.value)} placeholder="Short tagline or bio shown on your storefront" className={`${inputCls} resize-none`} maxLength={160} autoComplete="off" />
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-[#4a5068]' : 'text-slate-400'}`}>{config.shopDescription.length}/160 characters</p>
                </div>
              </div>
            </Card>

            <Card title="Shop Logo" description="Square images work best. Shown in your store header." icon={<ImageIcon size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <LogoUpload value={config.shopLogoUrl} onChange={url => set('shopLogoUrl', url)} isDark={isDark} accent={accent} />
            </Card>

            <Card title="Timezone" description="Used for business hours and scheduled messages." icon={<Globe size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <select value={config.shopTimezone} onChange={e => set('shopTimezone', e.target.value)} className={inputCls}>
                <option value="Asia/Bangkok">🇹🇭 Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Tokyo">🇯🇵 Asia/Tokyo (UTC+9)</option>
                <option value="Asia/Seoul">🇰🇷 Asia/Seoul (UTC+9)</option>
                <option value="Asia/Singapore">🇸🇬 Asia/Singapore (UTC+8)</option>
                <option value="Asia/Taipei">🇹🇼 Asia/Taipei (UTC+8)</option>
                <option value="Asia/Jakarta">🇮🇩 Asia/Jakarta (UTC+7)</option>
                <option value="Europe/London">🇬🇧 Europe/London (UTC+0)</option>
                <option value="America/New_York">🇺🇸 America/New_York (UTC-5)</option>
              </select>
            </Card>
          </>
        )}

        {/* ── DESIGN TAB ── */}
        {activeTab === 'design' && (
          <>
            <Card title="Theme Preset" description="Pick a base look for your storefront. You can override the accent color below." icon={<Palette size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.values(PRESETS).map(preset => {
                  const active = config.preset === preset.id;
                  return (
                    <button key={preset.id} onClick={() => set('preset', preset.id)}
                      className={`relative rounded-xl border-2 overflow-hidden text-left transition-all hover:scale-[1.02] ${active ? 'shadow-lg' : 'border-transparent hover:border-white/10'}`}
                      style={active ? { borderColor: accent, boxShadow: `0 8px 20px -4px ${accent}40` } : undefined}>
                      <div className="h-14 flex gap-1 p-2" style={{ background: preset.pageBg }}>
                        <div className="flex-1 rounded-md" style={{ background: preset.cardBg, border: `1px solid ${preset.cardBorder}` }} />
                        <div className="flex-1 rounded-md" style={{ background: preset.cardBg, border: `1px solid ${preset.cardBorder}` }} />
                        <div className="w-5 rounded-md self-end h-7" style={{ background: preset.accent }} />
                      </div>
                      <div className="px-2.5 py-2" style={{ background: preset.cardBg, borderTop: `1px solid ${preset.cardBorder}` }}>
                        <p className="text-[11px] font-bold" style={{ color: preset.textPrimary }}>{preset.name}</p>
                        <p className="text-[10px]" style={{ color: preset.textMuted }}>{preset.description}</p>
                      </div>
                      {active && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: accent }}>
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card title="Accent Color" description="Override the theme's default color for buttons and highlights." icon={<Palette size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="space-y-3">
                {/* Tab switcher */}
                <div className={`flex p-0.5 rounded-lg ${isDark ? 'bg-[#0f1117]' : 'bg-slate-100'}`}>
                  {(['solid', 'gradient'] as const).map(tab => (
                    <button key={tab} onClick={() => setAccentTab(tab)}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all capitalize ${
                        accentTab === tab ? '' : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-400 hover:text-slate-700'
                      }`}
                      style={accentTab === tab ? { background: localAccentBg, color: accentTextColor } : undefined}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* ── Solid tab ── */}
                {accentTab === 'solid' && (
                  <div className="space-y-2.5">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>Presets</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {SC_ACCENT_PRESETS.map(color => {
                        const isActive = !config.accentGradient && config.accentColor === color;
                        return (
                          <button key={color} onClick={() => setAccent(color)} title={color}
                            style={{ backgroundColor: color, ...(isActive ? { outline: `2.5px solid ${color}`, outlineOffset: '3px' } : {}) }}
                            className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${isActive ? 'scale-110' : 'hover:scale-105'}`} />
                        );
                      })}
                    </div>
                    <div className={`h-px ${isDark ? 'bg-[#1f2335]' : 'bg-slate-100'}`} />
                    <div className="flex items-center justify-between">
                      <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>Custom</p>
                      {customSolids.length < 3 && (
                        <button
                          onClick={() => {
                            const next = [...customSolids, '#8b5cf6'];
                            setCustomSolids(next);
                            setConfig(prev => ({ ...prev, customSolids: next }));
                            setAccent('#8b5cf6');
                          }}
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${isDark ? 'bg-[#1f2335] text-[#8b92ad] hover:text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                          title="Add custom color"
                        >+</button>
                      )}
                    </div>
                    {customSolids.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {customSolids.map((color, i) => {
                          const isActive = !config.accentGradient && config.accentColor === color;
                          const inputId = `sc-cs-${i}`;
                          return (
                            <div key={i} className="relative group flex-shrink-0">
                              <label
                                htmlFor={inputId}
                                title={color}
                                className={`w-8 h-8 rounded-full cursor-pointer block transition-all hover:scale-105 ${isActive ? 'scale-110' : ''}`}
                                style={{
                                  backgroundColor: color,
                                  ...(isActive ? { outline: `2.5px solid ${color}`, outlineOffset: '3px' } : {}),
                                }}
                              />
                              <input
                                id={inputId}
                                type="color"
                                value={color}
                                onChange={e => {
                                  const next = customSolids.map((c, j) => j === i ? e.target.value : c);
                                  setCustomSolids(next);
                                  setConfig(prev => ({ ...prev, customSolids: next }));
                                  setAccent(e.target.value);
                                }}
                                className="sr-only"
                              />
                              <button
                                onClick={() => {
                                  const next = customSolids.filter((_, j) => j !== i);
                                  setCustomSolids(next);
                                  setConfig(prev => ({ ...prev, customSolids: next }));
                                }}
                                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400 leading-none"
                                title="Remove"
                              >×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {(config.accentColor || config.accentGradient) && (
                      <button onClick={() => setAccent('')} className={`text-xs font-semibold transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                        Reset to theme default
                      </button>
                    )}
                  </div>
                )}

                {/* ── Gradient tab ── */}
                {accentTab === 'gradient' && (
                  <div className="space-y-2.5">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>Presets</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {GRADIENT_PRESETS.map(preset => {
                        const isActive = config.accentGradient === preset.gradient;
                        return (
                          <button key={preset.name} onClick={() => setAccent(preset.primary, preset.gradient)} title={preset.name}
                            style={{ background: preset.gradient, ...(isActive ? { outline: `2.5px solid ${preset.primary}`, outlineOffset: '3px' } : {}) }}
                            className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${isActive ? 'scale-110' : 'hover:scale-105'}`} />
                        );
                      })}
                    </div>
                    <div className={`h-px ${isDark ? 'bg-[#1f2335]' : 'bg-slate-100'}`} />
                    <div className="flex items-center justify-between">
                      <p className={`text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>Custom</p>
                      {customGrads.length < 3 && (
                        <button
                          onClick={() => setShowCustomGradBuilder(v => !v)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${isDark ? 'bg-[#1f2335] text-[#8b92ad] hover:text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                          title="Build custom gradient"
                        >+</button>
                      )}
                    </div>
                    {customGrads.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {customGrads.map((css, i) => {
                          const primary = css.match(/#[0-9a-fA-F]{6}/)?.[0] ?? '#8b5cf6';
                          const isActive = config.accentGradient === css;
                          return (
                            <div key={i} className="relative group flex-shrink-0">
                              <button
                                onClick={() => setAccent(primary, css)}
                                title="Custom gradient"
                                style={{ background: css, ...(isActive ? { outline: `2.5px solid ${primary}`, outlineOffset: '3px' } : {}) }}
                                className={`w-8 h-8 rounded-full transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                              />
                              <button
                                onClick={() => {
                                  const next = customGrads.filter((_, j) => j !== i);
                                  setCustomGrads(next);
                                  setConfig(prev => ({ ...prev, customGradients: next }));
                                }}
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
                      <div className={`rounded-xl border p-3 space-y-2 ${isDark ? 'bg-[#0d0f16] border-[#1f2335]' : 'bg-slate-50 border-slate-200'}`}>
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
                                    : isDark ? 'border-[#2a2f45] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-400 hover:text-slate-700'
                                }`}
                                style={customG.angle === a.deg ? { background: localAccentBg, color: accentTextColor } : undefined}
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
                              const next = [...customGrads, gradient];
                              setCustomGrads(next);
                              setConfig(prev => ({ ...prev, customGradients: next }));
                              setAccent(customG.c1, gradient);
                              setShowCustomGradBuilder(false);
                            }}
                            className="px-3 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
                            style={{ background: localAccentBg, color: accentTextColor }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                    {(config.accentColor || config.accentGradient) && (
                      <button onClick={() => { setAccent(''); setShowCustomGradBuilder(false); }} className={`text-xs font-semibold transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                        Reset to theme default
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card title="Branding" description="Tagline and banner shown on your storefront header." icon={<ImageIcon size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="space-y-4">
                <div>
                  <label className={lbl}>Tagline</label>
                  <input type="text" value={config.shopTagline} onChange={e => set('shopTagline', e.target.value)} placeholder="e.g. Fresh Korean fashion, delivered fast" className={inputCls} />
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-[#4a5068]' : 'text-slate-400'}`}>Appears under your shop name in the store header</p>
                </div>
                <div>
                  <label className={lbl}>Banner Image URL</label>
                  <input type="url" value={config.bannerUrl} onChange={e => set('bannerUrl', e.target.value)} placeholder="https://..." className={inputCls} />
                  {config.bannerUrl && (
                    <img src={config.bannerUrl} alt="Banner preview" className="mt-3 w-full h-24 object-cover rounded-xl" onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
              </div>
            </Card>
          </>
        )}

        {/* ── CONTENT TAB ── */}
        {activeTab === 'content' && (
          <>
            <Card title="Announcement Bar" description="A banner displayed at the very top of your store." icon={<Megaphone size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Enable announcement</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>Show a message bar above everything</p>
                  </div>
                  <Toggle enabled={config.announcementEnabled} onChange={v => set('announcementEnabled', v)} accent={accent} />
                </div>
                {config.announcementEnabled && (
                  <>
                    <input type="text" value={config.announcementText} onChange={e => set('announcementText', e.target.value)} placeholder="e.g. Free shipping on orders over ฿500 🎉" className={inputCls} />
                    <div>
                      <label className={lbl}>Banner color</label>
                      <div className="flex items-center gap-2.5">
                        {(['accent', 'blue', 'amber', 'red'] as const).map(color => {
                          const bg = color === 'accent' ? accent : color === 'blue' ? '#3b82f6' : color === 'amber' ? '#f59e0b' : '#ef4444';
                          const isActive = config.announcementColor === color;
                          return (
                            <button key={color} onClick={() => set('announcementColor', color)}
                              style={{ backgroundColor: bg, ...(isActive ? { outline: `2px solid ${bg}`, outlineOffset: '2px' } : {}) }}
                              className={`w-7 h-7 rounded-full transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                              title={color} />
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card title="Product Layout" description="How products are displayed in your catalog." icon={<LayoutDashboard size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="flex gap-3">
                {([
                  { id: 'grid' as const, icon: <LayoutGrid size={16} />, label: 'Grid', desc: 'Side by side' },
                  { id: 'list' as const, icon: <List size={16} />, label: 'List', desc: 'One per row' },
                ]).map(opt => (
                  <button key={opt.id} onClick={() => set('cardLayout', opt.id)}
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      config.cardLayout === opt.id ? 'text-white shadow-md' : isDark ? 'border-[#2a2f45] text-[#8b92ad] hover:border-[#3a3f55]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                    style={config.cardLayout === opt.id ? { backgroundColor: accent, borderColor: accent } : undefined}>
                    {opt.icon}
                    <div>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className={`text-[11px] ${config.cardLayout === opt.id ? 'text-white/70' : isDark ? 'text-[#4a5068]' : 'text-slate-400'}`}>{opt.desc}</p>
                    </div>
                    {config.cardLayout === opt.id && <Check size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Visible Elements" description="Control which UI elements appear on your storefront." icon={<Eye size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="space-y-3">
                {([
                  { key: 'showSearch' as const,         label: 'Search bar',           desc: 'Search box at the top' },
                  { key: 'showCategoryFilter' as const, label: 'Category filters',     desc: 'Filter pills by category' },
                  { key: 'showBrandFilter' as const,    label: 'Brand filters',        desc: 'Filter pills by brand' },
                ]).map(({ key, label, desc }) => (
                  <div key={key} className={`flex items-center justify-between py-3 px-4 rounded-xl border ${isDark ? 'border-[#1f2335] bg-white/3' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{label}</p>
                      <p className={`text-xs ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>{desc}</p>
                    </div>
                    <Toggle enabled={!!config[key]} onChange={v => set(key, v as any)} accent={accent} />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Storefront Language" description="Language shown to customers. Translations are applied when available." icon={<Globe size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <select value={config.language} onChange={e => set('language', e.target.value)} className={inputCls} style={{ maxWidth: '280px' }}>
                <option value="th">🇹🇭 Thai (ภาษาไทย)</option>
                <option value="ja">🇯🇵 Japanese (日本語)</option>
                <option value="en">🇬🇧 English</option>
                <option value="ko">🇰🇷 Korean (한국어)</option>
                <option value="zh-TW">🇹🇼 Traditional Chinese (繁體中文)</option>
              </select>
            </Card>
          </>
        )}

        {/* ── ADVANCED TAB ── */}
        {activeTab === 'advanced' && (
          <>
            <Card title="Store URL Handle" description="Your custom short URL. Customers reach your store at /shop/yourhandle instead of the long ID." icon={<Link size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="space-y-3">
                <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/30 transition-all ${isDark ? 'border-[#2a2f45]' : 'border-slate-200'}`}>
                  <span className={`px-3 py-2.5 text-sm border-r select-none flex-shrink-0 font-medium ${isDark ? 'text-[#4a5068] border-[#2a2f45] bg-white/5' : 'text-slate-400 border-slate-200 bg-slate-50'}`}>/shop/</span>
                  <input
                    type="text" value={slugInput}
                    onChange={e => { setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugError(''); setSlugSaved(false); }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveSlug()}
                    placeholder="your-handle" maxLength={30}
                    className={`flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none ${isDark ? 'text-white placeholder-[#4a5068]' : 'text-slate-900 placeholder-slate-400'}`}
                  />
                </div>
                <button onClick={handleSaveSlug} disabled={slugSaving || !slugInput.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: slugSaved ? '#10b981' : accent }}>
                  {slugSaved ? <><Check size={14} />Handle saved</> : slugSaving ? 'Saving…' : <><Link size={14} />Apply handle</>}
                </button>
                {slugError && <p className="text-xs text-red-400">{slugError}</p>}
                {slugSaved && <p className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Store reachable at <span className="font-bold">/shop/{slugInput}</span></p>}
                <p className={`text-[10px] ${isDark ? 'text-[#4a5068]' : 'text-slate-400'}`}>Lowercase letters, numbers, and hyphens only · 3–30 characters</p>
              </div>
            </Card>

            <Card title="Post-Checkout Redirect" description="Where to send customers after a successful order. Leave blank to stay on the storefront." icon={<ChevronRight size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <input type="url" value={config.postCheckoutUrl} onChange={e => set('postCheckoutUrl', e.target.value)} placeholder="https://…" className={inputCls} />
              <p className={`text-[10px] mt-1.5 ${isDark ? 'text-[#4a5068]' : 'text-slate-400'}`}>e.g. a LINE group link, a thank-you page, or your LINE OA chat</p>
            </Card>

            <Card title="Maintenance Mode" description="Temporarily take your store offline. Visitors see your message instead of products." icon={<Wrench size={15} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />} isDark={isDark}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Store offline</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>Visitors see a maintenance page instead of products</p>
                  </div>
                  <Toggle enabled={config.maintenanceMode} onChange={v => set('maintenanceMode', v)} accent={accent} />
                </div>
                {config.maintenanceMode && (
                  <div className={`rounded-xl p-4 border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                    <p className={`text-xs font-semibold mb-3 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>⚠ Your store is currently offline</p>
                    <label className={lbl}>Maintenance message</label>
                    <input type="text" value={config.maintenanceMessage} onChange={e => set('maintenanceMessage', e.target.value)} placeholder="We will be back soon." className={inputCls} />
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ── Preview ─────────────────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 sticky top-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={13} className={isDark ? 'text-[#8b92ad]' : 'text-slate-500'} />
            <p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Live Preview</p>
          </div>
          <p className={`text-[10px] ${isDark ? 'text-[#4a5068]' : 'text-slate-400'}`}>Updates instantly</p>
        </div>

        <div className={`rounded-2xl overflow-hidden border ${isDark ? 'border-[#1f2335] shadow-2xl shadow-black/40' : 'border-slate-200 shadow-xl shadow-slate-200/60'}`} style={{ background: p.pageBg }}>
          {config.announcementEnabled && config.announcementText && (() => {
            const bannerBg = config.announcementColor === 'blue' ? '#3b82f6' : config.announcementColor === 'amber' ? '#f59e0b' : config.announcementColor === 'red' ? '#ef4444' : localAccentBg;
            return <div className="px-4 py-1.5 text-[10px] text-center font-semibold text-white" style={{ background: bannerBg }}>{config.announcementText}</div>;
          })()}

          <div className="px-4 py-3 flex items-center justify-between" style={{ background: p.headerBg, borderBottom: `1px solid ${p.headerBorder}` }}>
            <div className="flex items-center gap-2">
              {config.shopLogoUrl
                ? <img src={config.shopLogoUrl} className="w-7 h-7 rounded-lg object-cover" alt="logo" onError={e => (e.currentTarget.style.display = 'none')} />
                : <div className="w-7 h-7 rounded-lg" style={{ background: localAccentBg }} />
              }
              <div>
                <p className="text-xs font-bold" style={{ color: p.textPrimary }}>{config.shopName || shopName || 'My Shop'}</p>
                {config.shopTagline && <p className="text-[9px]" style={{ color: p.textMuted }}>{config.shopTagline}</p>}
              </div>
            </div>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: localAccentBg }}>
              <div className="w-3 h-3 rounded-sm bg-white/80" />
            </div>
          </div>

          {config.bannerUrl && <img src={config.bannerUrl} alt="banner" className="w-full h-16 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />}

          <div className="px-3 pt-3 space-y-2">
            {config.showSearch && (
              <div className="rounded-lg px-3 py-1.5 flex items-center gap-2" style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: p.textMuted }} />
                <div className="h-1.5 rounded flex-1" style={{ background: p.textMuted, opacity: 0.3 }} />
              </div>
            )}
            {(config.showCategoryFilter || config.showBrandFilter) && (
              <div className="flex gap-1.5">
                {['All', 'A', 'B', 'C'].map((t, i) => (
                  <div key={t} className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ background: i === 0 ? p.pillActiveBg : p.pillBg, color: i === 0 ? p.pillActiveText : p.textMuted }}>{t}</div>
                ))}
              </div>
            )}
          </div>

          <div className={`p-3 ${config.cardLayout === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}`}>
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ background: p.cardBg, border: `1px solid ${p.cardBorder}` }}>
                {config.cardLayout === 'grid' ? (
                  <>
                    <div className="aspect-square" style={{ background: p.inputBg }} />
                    <div className="p-2 space-y-1.5">
                      <div className="h-1.5 rounded" style={{ background: p.textMuted, opacity: 0.4, width: '70%' }} />
                      <div className="h-1.5 rounded" style={{ background: localAccentBg, width: '40%' }} />
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2 p-2">
                    <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: p.inputBg }} />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-1.5 rounded" style={{ background: p.textMuted, opacity: 0.4, width: '70%' }} />
                      <div className="h-1.5 rounded" style={{ background: p.textMuted, opacity: 0.2, width: '50%' }} />
                      <div className="h-1.5 rounded mt-1" style={{ background: localAccentBg, width: '30%' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className={`text-[10px] text-center ${isDark ? 'text-[#4a5068]' : 'text-slate-400'}`}>Approximate preview · actual storefront may vary</p>
      </div>

    </div>
  );
}

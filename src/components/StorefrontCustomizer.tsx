'use client';

import React, { useState, useRef } from 'react';
import { Check, LayoutGrid, List, Eye, Save, Link, Upload, Loader2, X } from 'lucide-react';
import { PRESETS, resolvePreset } from '@/lib/storefrontPresets';

interface StorefrontConfig {
  // Shop identity (top-level settings fields, saved separately)
  shopName: string;
  shopDescription: string;
  shopLogoUrl: string;
  shopTimezone: string;
  // Storefront-specific
  preset: string;
  shopTagline: string;
  logoUrl: string;
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
}

const DEFAULT_CONFIG: StorefrontConfig = {
  shopName: '',
  shopDescription: '',
  shopLogoUrl: '',
  shopTimezone: 'Asia/Bangkok',
  preset: 'midnight',
  shopTagline: '',
  logoUrl: '',
  bannerUrl: '',
  accentColor: '',
  cardLayout: 'grid',
  showBrandFilter: true,
  showCategoryFilter: true,
  showSearch: true,
  announcementText: '',
  announcementEnabled: false,
  announcementColor: 'accent',
  maintenanceMode: false,
  maintenanceMessage: 'We will be back soon.',
  postCheckoutUrl: '',
  language: 'th',
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

function LogoUpload({ value, onChange, isDark }: { value: string; onChange: (url: string) => void; isDark: boolean }) {
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
    <div className="flex items-center gap-3">
      <img src={value} alt="logo" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-slate-200 dark:border-[#2d3555]" onError={e => (e.currentTarget.style.display = 'none')} />
      <div className="space-y-1.5">
        <button onClick={() => onChange('')} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}>
          <X size={11} /> Remove
        </button>
        <button onClick={() => inputRef.current?.click()} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}>
          <Upload size={11} /> Replace
        </button>
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
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dragging ? 'border-accent bg-accent/5' : isDark ? 'border-[#1f2335] hover:border-accent/50' : 'border-slate-200 hover:border-accent/50'}`}
      >
        {uploading ? <Loader2 size={18} className="animate-spin text-accent" /> : <Upload size={18} className={isDark ? 'text-[#8b92ad]' : 'text-slate-400'} />}
        <div>
          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>Drop logo or <span className="text-accent">browse</span></p>
          <p className={`text-xs ${isDark ? 'text-[#8b92ad]' : 'text-slate-400'}`}>PNG, JPG, WebP · max 2 MB · square recommended</p>
        </div>
      </div>
      {err && <p className="text-xs text-red-400 mt-1.5">{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
    </div>
  );
}

export default function StorefrontCustomizer({ shopName, slug: initialSlug, initial, theme = 'light', accentColor = '#00b900', onSave, onSaveSlug }: Props) {
  const isDark = theme === 'dark';
  const [config, setConfig] = useState<StorefrontConfig>({ ...DEFAULT_CONFIG, ...initial });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Slug state
  const [slugInput, setSlugInput]   = useState(initialSlug ?? '');
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugSaved, setSlugSaved]   = useState(false);
  const [slugError, setSlugError]   = useState('');

  const p = resolvePreset(config.preset, config.accentColor);

  function set<K extends keyof StorefrontConfig>(key: K, value: StorefrontConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSlug() {
    if (!slugInput.trim() || slugSaving) return;
    setSlugSaving(true);
    setSlugError('');
    setSlugSaved(false);
    const result = await onSaveSlug(slugInput.trim().toLowerCase());
    if (result.ok) {
      setSlugSaved(true);
      setTimeout(() => setSlugSaved(false), 2500);
    } else {
      setSlugError(result.error ?? 'Failed to save handle');
    }
    setSlugSaving(false);
  }

  const sectionHeading = `text-sm font-semibold mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`;
  const fieldLabel = `text-xs font-medium mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-800'}`;
  const inputCls = `w-full border rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-accent/40 ${isDark ? 'border-gray-700 text-gray-100 placeholder-gray-500' : 'border-gray-200 text-gray-900 placeholder-gray-500'}`;

  return (
    <div className="flex gap-12 items-start">

      {/* ── Left: Controls ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 max-w-2xl space-y-8">

        {/* Shop Identity */}
        <section>
          <h3 className={sectionHeading}>Shop Identity</h3>
          <div className="space-y-4">
            <div>
              <label className={fieldLabel}>Shop Name</label>
              <input
                type="text"
                value={config.shopName}
                onChange={e => set('shopName', e.target.value)}
                placeholder="My Awesome Shop"
                className={inputCls}
                autoComplete="off"
              />
              <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Shown on storefront and all outgoing LINE messages</p>
            </div>
            <div>
              <label className={fieldLabel}>Shop Description</label>
              <textarea
                rows={2}
                value={config.shopDescription}
                onChange={e => set('shopDescription', e.target.value)}
                placeholder="Short tagline or bio shown on your storefront"
                className={`${inputCls} resize-none`}
                maxLength={160}
                autoComplete="off"
              />
              <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{config.shopDescription.length}/160 characters</p>
            </div>
            <div>
              <label className={fieldLabel}>Shop Logo</label>
              <LogoUpload value={config.shopLogoUrl} onChange={url => set('shopLogoUrl', url)} isDark={isDark} />
            </div>
            <div>
              <label className={fieldLabel}>Timezone</label>
              <select value={config.shopTimezone} onChange={e => set('shopTimezone', e.target.value)} className={inputCls}>
                <option value="Asia/Bangkok">🇹🇭 Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Tokyo">🇯🇵 Asia/Tokyo (UTC+9)</option>
                <option value="Asia/Seoul">🇰🇷 Asia/Seoul (UTC+9)</option>
                <option value="Asia/Singapore">🇸🇬 Asia/Singapore (UTC+8)</option>
                <option value="Asia/Taipei">🇹🇼 Asia/Taipei (UTC+8)</option>
                <option value="Asia/Jakarta">🇮🇩 Asia/Jakarta (UTC+7)</option>
                <option value="Europe/London">🇬🇧 Europe/London</option>
                <option value="America/New_York">🇺🇸 America/New_York</option>
              </select>
              <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Used for business hours and scheduled messages</p>
            </div>
          </div>
        </section>

        {/* Store handle */}
        <section>
          <h3 className={sectionHeading}>Store handle</h3>
          <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
            Your custom short URL. Customers can reach your store at <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>/shop/yourhandle</span> instead of the long ID.
          </p>
          <div className="flex gap-2">
            <div className={`flex-1 flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-accent/40 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <span className={`px-3 py-2 text-sm border-r select-none flex-shrink-0 ${isDark ? 'text-gray-500 border-gray-700 bg-white/5' : 'text-gray-600 border-gray-200 bg-gray-50'}`}>/shop/</span>
              <input
                type="text"
                value={slugInput}
                onChange={e => { setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugError(''); setSlugSaved(false); }}
                onKeyDown={e => e.key === 'Enter' && handleSaveSlug()}
                placeholder="your-handle"
                maxLength={30}
                className={`flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none ${isDark ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
              />
            </div>
            <button
              onClick={handleSaveSlug}
              disabled={slugSaving || !slugInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity flex-shrink-0 disabled:opacity-50 hover:opacity-90 text-white"
              style={{ backgroundColor: slugSaved ? '#10b981' : accentColor }}
            >
              {slugSaved ? <><Check size={14} />Saved</> : slugSaving ? 'Saving…' : <><Link size={14} />Apply</>}
            </button>
          </div>
          {slugError && <p className="mt-1.5 text-xs text-red-500">{slugError}</p>}
          {slugSaved && (
            <p className={`mt-1.5 text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Store is now reachable at <span className="font-medium">/shop/{slugInput}</span>
            </p>
          )}
          <p className={`mt-1.5 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Lowercase letters, numbers, and hyphens only · 3–30 characters
          </p>
        </section>

        {/* Preset picker */}
        <section>
          <h3 className={sectionHeading}>Theme preset</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(PRESETS).map(preset => {
              const active = config.preset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => set('preset', preset.id)}
                  className={`relative rounded-xl border-2 overflow-hidden text-left transition-all ${active ? 'shadow-lg' : 'border-transparent'}`}
                  style={active ? { borderColor: accentColor, boxShadow: `0 10px 15px -3px ${accentColor}33` } : undefined}
                >
                  <div className="h-16 flex gap-1 p-2" style={{ background: preset.pageBg }}>
                    <div className="flex-1 rounded-lg" style={{ background: preset.cardBg, border: `1px solid ${preset.cardBorder}` }} />
                    <div className="flex-1 rounded-lg" style={{ background: preset.cardBg, border: `1px solid ${preset.cardBorder}` }} />
                    <div className="w-6 rounded-lg self-end h-8" style={{ background: preset.accent }} />
                  </div>
                  <div className="px-2 py-1.5" style={{ background: preset.cardBg, borderTop: `1px solid ${preset.cardBorder}` }}>
                    <p className="text-xs font-semibold" style={{ color: preset.textPrimary }}>{preset.name}</p>
                    <p className="text-xs" style={{ color: preset.textMuted }}>{preset.description}</p>
                  </div>
                  {active && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Accent color override */}
        <section>
          <h3 className={sectionHeading}>Accent color</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* First swatch: always the base preset default (resets override on click) */}
            {(() => {
              const baseAccent = PRESETS[config.preset]?.accent ?? p.accent;
              const isDefault = !config.accentColor;
              return (
                <button
                  key="preset-default"
                  onClick={() => set('accentColor', '')}
                  title={`Preset default (${baseAccent})`}
                  style={{
                    backgroundColor: baseAccent,
                    ...(isDefault ? { outline: `2.5px solid ${baseAccent}`, outlineOffset: '2px' } : {}),
                  }}
                  className={`w-7 h-7 rounded-full transition-all ${isDefault ? 'scale-110' : 'hover:scale-105'}`}
                />
              );
            })()}
            {(['#ec4899', '#38bdf8', '#d97706', '#3b82f6', '#a855f7', '#ef4444'] as const).map(color => {
              const isActive = config.accentColor === color;
              return (
                <button
                  key={color}
                  onClick={() => set('accentColor', color)}
                  title={color}
                  style={{
                    backgroundColor: color,
                    ...(isActive ? { outline: `2.5px solid ${color}`, outlineOffset: '2px' } : {}),
                  }}
                  className={`w-7 h-7 rounded-full transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                />
              );
            })}
            <label
              title="Custom color"
              className={`w-7 h-7 rounded-full border-2 cursor-pointer overflow-hidden relative hover:scale-105 transition-all flex items-center justify-center ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
            >
              <input
                type="color"
                value={config.accentColor || p.accent}
                onChange={e => set('accentColor', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <span className={`text-[13px] font-bold leading-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
            </label>
            {config.accentColor && (
              <button
                onClick={() => set('accentColor', '')}
                className={`text-[10px] font-semibold ml-1 transition-colors ${isDark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
              >
                Reset
              </button>
            )}
          </div>
        </section>

        {/* Branding */}
        <section>
          <h3 className={sectionHeading}>Branding</h3>
          <div className="space-y-3">
            <div>
              <label className={fieldLabel}>Tagline</label>
              <input
                type="text"
                value={config.shopTagline}
                onChange={e => set('shopTagline', e.target.value)}
                placeholder="e.g. Fresh Korean fashion, delivered fast"
                className={inputCls}
              />
            </div>
            <div>
              <label className={fieldLabel}>Logo URL</label>
              <input
                type="url"
                value={config.logoUrl}
                onChange={e => set('logoUrl', e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </div>
            <div>
              <label className={fieldLabel}>Banner image URL</label>
              <input
                type="url"
                value={config.bannerUrl}
                onChange={e => set('bannerUrl', e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
              {config.bannerUrl && (
                <img
                  src={config.bannerUrl}
                  alt="Banner preview"
                  className="mt-2 w-full h-24 object-cover rounded-lg"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>
            <div className="space-y-2">
              <label className={fieldLabel}>Announcement bar</label>
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Enable announcement</span>
                <div
                  onClick={() => set('announcementEnabled', !config.announcementEnabled)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${config.announcementEnabled ? '' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                  style={config.announcementEnabled ? { backgroundColor: accentColor } : undefined}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.announcementEnabled ? 'translate-x-4' : ''}`} />
                </div>
              </div>
              {config.announcementEnabled && (
                <>
                  <input
                    type="text"
                    value={config.announcementText}
                    onChange={e => set('announcementText', e.target.value)}
                    placeholder="e.g. Free shipping on orders over ฿500 🎉"
                    className={inputCls}
                  />
                  <div>
                    <label className={`${fieldLabel} mb-1.5`}>Banner color</label>
                    <div className="flex items-center gap-2">
                      {(['accent', 'blue', 'amber', 'red'] as const).map(color => {
                        const bg = color === 'accent' ? accentColor : color === 'blue' ? '#3b82f6' : color === 'amber' ? '#f59e0b' : '#ef4444';
                        const isActive = config.announcementColor === color;
                        return (
                          <button
                            key={color}
                            onClick={() => set('announcementColor', color)}
                            style={{ backgroundColor: bg, ...(isActive ? { outline: `2px solid ${bg}`, outlineOffset: '2px' } : {}) }}
                            className={`w-6 h-6 rounded-full transition-all ${isActive ? 'scale-110' : 'hover:scale-105'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Product layout */}
        <section>
          <h3 className={sectionHeading}>Product layout</h3>
          <div className="flex gap-3">
            {([
              { id: 'grid', icon: <LayoutGrid size={18} />, label: 'Grid' },
              { id: 'list', icon: <List size={18} />, label: 'List' },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => set('cardLayout', opt.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  config.cardLayout === opt.id
                    ? 'text-white'
                    : isDark ? 'border-gray-700 text-gray-300 hover:border-gray-600' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
                style={config.cardLayout === opt.id ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Show / hide elements */}
        <section>
          <h3 className={sectionHeading}>Show / hide elements</h3>
          <div className="space-y-2">
            {([
              { key: 'showSearch',         label: 'Search bar' },
              { key: 'showCategoryFilter', label: 'Category filter pills' },
              { key: 'showBrandFilter',    label: 'Brand filter pills' },
            ] as { key: keyof StorefrontConfig; label: string }[]).map(({ key, label }) => (
              <label
                key={key}
                className={`flex items-center justify-between py-2 px-3 rounded-xl border cursor-pointer ${isDark ? 'border-gray-800 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <span className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{label}</span>
                <div
                  onClick={() => set(key, !config[key] as any)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${config[key] ? '' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                  style={config[key] ? { backgroundColor: accentColor } : undefined}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${config[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Storefront language */}
        <section>
          <h3 className={sectionHeading}>Storefront Language</h3>
          <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
            Language shown to customers on your public storefront. Translations are applied when available.
          </p>
          <select
            value={config.language}
            onChange={e => set('language', e.target.value)}
            className={inputCls}
            style={{ maxWidth: '280px' }}
          >
            <option value="th">🇹🇭 Thai (ภาษาไทย)</option>
            <option value="ja">🇯🇵 Japanese (日本語)</option>
            <option value="en">🇬🇧 English</option>
            <option value="ko">🇰🇷 Korean (한국어)</option>
            <option value="zh-TW">🇹🇼 Traditional Chinese (繁體中文)</option>
          </select>
        </section>

        {/* Maintenance mode */}
        <section>
          <h3 className={sectionHeading}>Maintenance Mode</h3>
          <div className="space-y-3">
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Store offline</span>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Visitors see a maintenance page instead of products</p>
              </div>
              <div
                onClick={() => set('maintenanceMode', !config.maintenanceMode)}
                className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${config.maintenanceMode ? '' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                style={config.maintenanceMode ? { backgroundColor: accentColor } : undefined}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.maintenanceMode ? 'translate-x-4' : ''}`} />
              </div>
            </div>
            {config.maintenanceMode && (
              <div>
                <label className={fieldLabel}>Maintenance message</label>
                <input
                  type="text"
                  value={config.maintenanceMessage}
                  onChange={e => set('maintenanceMessage', e.target.value)}
                  placeholder="We will be back soon."
                  className={inputCls}
                />
              </div>
            )}
          </div>
        </section>

        {/* Post-checkout redirect */}
        <section>
          <h3 className={sectionHeading}>Post-checkout Redirect</h3>
          <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
            Redirect customers to this URL after a successful order. Leave blank to stay on the storefront.
          </p>
          <input
            type="url"
            value={config.postCheckoutUrl}
            onChange={e => set('postCheckoutUrl', e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 hover:opacity-90 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-opacity"
          style={{ backgroundColor: accentColor }}
        >
          {saved ? <><Check size={16} />Saved!</> : saving ? 'Saving...' : <><Save size={16} />Save storefront</>}
        </button>
      </div>

      {/* ── Right: Persistent Preview ──────────────────────────────────── */}
      <div className="flex-1 min-w-64 sticky top-6 self-start space-y-3">
        <div className="flex items-center gap-2">
          <Eye size={14} className={isDark ? 'text-gray-400' : 'text-gray-700'} />
          <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Live Preview</h3>
          <span className={`text-[10px] ml-auto ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Updates instantly</span>
        </div>

        <div
          className={`rounded-2xl overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          style={{ background: p.pageBg }}
        >
          {/* Announcement bar */}
          {config.announcementEnabled && config.announcementText && (() => {
            const bannerBg = config.announcementColor === 'blue' ? '#3b82f6' : config.announcementColor === 'amber' ? '#f59e0b' : config.announcementColor === 'red' ? '#ef4444' : p.accent;
            return (
              <div className="px-4 py-1.5 text-xs text-center font-medium" style={{ background: bannerBg, color: '#fff' }}>
                {config.announcementText}
              </div>
            );
          })()}

          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: p.headerBg, borderBottom: `1px solid ${p.headerBorder}` }}
          >
            <div className="flex items-center gap-2">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  className="w-7 h-7 rounded-lg object-cover"
                  alt="logo"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div className="w-7 h-7 rounded-lg" style={{ background: p.accent }} />
              )}
              <div>
                <p className="text-xs font-bold" style={{ color: p.textPrimary }}>{shopName || 'My Shop'}</p>
                {config.shopTagline && (
                  <p className="text-[10px]" style={{ color: p.textMuted }}>{config.shopTagline}</p>
                )}
              </div>
            </div>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: p.accent }}>
              <div className="w-3 h-3 rounded-sm bg-white/80" />
            </div>
          </div>

          {/* Banner */}
          {config.bannerUrl && (
            <img
              src={config.bannerUrl}
              alt="banner"
              className="w-full h-20 object-cover"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          )}

          {/* Search + filters */}
          <div className="px-3 pt-3 space-y-2">
            {config.showSearch && (
              <div
                className="rounded-lg px-3 py-1.5 flex items-center gap-2"
                style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: p.textMuted }} />
                <div className="h-2 rounded flex-1" style={{ background: p.textMuted, opacity: 0.3 }} />
              </div>
            )}
            {(config.showCategoryFilter || config.showBrandFilter) && (
              <div className="flex gap-1.5">
                {['All', 'A', 'B', 'C'].map((t, i) => (
                  <div
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                    style={{
                      background: i === 0 ? p.pillActiveBg : p.pillBg,
                      color: i === 0 ? p.pillActiveText : p.textMuted,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product cards */}
          <div className={`p-3 ${config.cardLayout === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}`}>
            {[1, 2].map(i => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ background: p.cardBg, border: `1px solid ${p.cardBorder}` }}
              >
                {config.cardLayout === 'grid' ? (
                  <>
                    <div className="aspect-square" style={{ background: p.inputBg }} />
                    <div className="p-2 space-y-1">
                      <div className="h-2 rounded" style={{ background: p.textMuted, opacity: 0.4, width: '70%' }} />
                      <div className="h-2 rounded" style={{ background: p.accent, width: '40%' }} />
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2 p-2">
                    <div className="w-14 h-14 rounded-lg flex-shrink-0" style={{ background: p.inputBg }} />
                    <div className="flex-1 space-y-1 pt-1">
                      <div className="h-2 rounded" style={{ background: p.textMuted, opacity: 0.4, width: '70%' }} />
                      <div className="h-2 rounded" style={{ background: p.textMuted, opacity: 0.2, width: '50%' }} />
                      <div className="h-2 rounded mt-2" style={{ background: p.accent, width: '30%' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className={`text-[10px] text-center ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          Approximate preview · actual storefront may vary
        </p>
      </div>

    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Check, LayoutGrid, List, Eye, Save } from 'lucide-react';
import { PRESETS, resolvePreset } from '@/lib/storefrontPresets';

interface StorefrontConfig {
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
}

const DEFAULT_CONFIG: StorefrontConfig = {
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
};

interface Props {
  shopName: string;
  initial?: Partial<StorefrontConfig>;
  onSave: (config: StorefrontConfig) => Promise<void>;
}

export default function StorefrontCustomizer({ shopName, initial, onSave }: Props) {
  const [config, setConfig] = useState<StorefrontConfig>({ ...DEFAULT_CONFIG, ...initial });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Preset picker */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Theme preset</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.values(PRESETS).map(preset => {
            const active = config.preset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => set('preset', preset.id)}
                className={`relative rounded-xl border-2 overflow-hidden text-left transition-all ${
                  active ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-transparent'
                }`}
              >
                {/* Mini preview swatch */}
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
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
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
        <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Accent color override</h3>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={config.accentColor || p.accent}
            onChange={e => set('accentColor', e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={config.accentColor}
            onChange={e => set('accentColor', e.target.value)}
            placeholder={`Default: ${p.accent}`}
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {config.accentColor && (
            <button onClick={() => set('accentColor', '')} className="text-xs text-gray-400 hover:text-gray-600">Reset</button>
          )}
        </div>
      </section>

      {/* Branding */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Branding</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tagline</label>
            <input
              type="text"
              value={config.shopTagline}
              onChange={e => set('shopTagline', e.target.value)}
              placeholder="e.g. Fresh Korean fashion, delivered fast"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Logo URL</label>
            <input
              type="url"
              value={config.logoUrl}
              onChange={e => set('logoUrl', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Banner image URL</label>
            <input
              type="url"
              value={config.bannerUrl}
              onChange={e => set('bannerUrl', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {config.bannerUrl && (
              <img src={config.bannerUrl} alt="Banner preview" className="mt-2 w-full h-24 object-cover rounded-lg" onError={e => (e.currentTarget.style.display = 'none')} />
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Announcement bar</label>
            <input
              type="text"
              value={config.announcementText}
              onChange={e => set('announcementText', e.target.value)}
              placeholder="e.g. Free shipping on orders over ฿500 🎉"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </section>

      {/* Layout */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Product layout</h3>
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
                  ? 'bg-green-500 text-white border-green-500'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Visibility toggles */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Show / hide elements</h3>
        <div className="space-y-2">
          {([
            { key: 'showSearch', label: 'Search bar' },
            { key: 'showCategoryFilter', label: 'Category filter pills' },
            { key: 'showBrandFilter', label: 'Brand filter pills' },
          ] as { key: keyof StorefrontConfig; label: string }[]).map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between py-2 px-3 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
              <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              <div
                onClick={() => set(key, !config[key] as any)}
                className={`w-10 h-6 rounded-full transition-colors relative ${config[key] ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${config[key] ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Live mini-preview */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2"><Eye size={14} /> Preview</h3>
        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ background: p.pageBg }}>
          {/* Announcement bar */}
          {config.announcementText && (
            <div className="px-4 py-1.5 text-xs text-center font-medium" style={{ background: p.accent, color: p.accentText }}>
              {config.announcementText}
            </div>
          )}
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: p.headerBg, borderBottom: `1px solid ${p.headerBorder}` }}>
            <div className="flex items-center gap-2">
              {config.logoUrl
                ? <img src={config.logoUrl} className="w-7 h-7 rounded-lg object-cover" alt="logo" onError={e => (e.currentTarget.style.display = 'none')} />
                : <div className="w-7 h-7 rounded-lg" style={{ background: p.accent }} />
              }
              <div>
                <p className="text-xs font-bold" style={{ color: p.textPrimary }}>{shopName || 'My Shop'}</p>
                {config.shopTagline && <p className="text-[10px]" style={{ color: p.textMuted }}>{config.shopTagline}</p>}
              </div>
            </div>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: p.accent }}>
              <div className="w-3 h-3 rounded-sm bg-white/80" />
            </div>
          </div>
          {/* Banner */}
          {config.bannerUrl && (
            <img src={config.bannerUrl} alt="banner" className="w-full h-20 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          {/* Search + filters */}
          <div className="px-3 pt-3 space-y-2">
            {config.showSearch && (
              <div className="rounded-lg px-3 py-1.5 flex items-center gap-2" style={{ background: p.inputBg, border: `1px solid ${p.inputBorder}` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: p.textMuted }} />
                <div className="h-2 rounded flex-1" style={{ background: p.textMuted, opacity: 0.3 }} />
              </div>
            )}
            {(config.showCategoryFilter || config.showBrandFilter) && (
              <div className="flex gap-1.5">
                {['All', 'A', 'B', 'C'].map((t, i) => (
                  <div key={t} className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{
                    background: i === 0 ? p.pillActiveBg : p.pillBg,
                    color: i === 0 ? p.pillActiveText : p.textMuted
                  }}>{t}</div>
                ))}
              </div>
            )}
          </div>
          {/* Product cards */}
          <div className={`p-3 ${config.cardLayout === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}`}>
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ background: p.cardBg, border: `1px solid ${p.cardBorder}` }}>
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
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
      >
        {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> Save storefront</>}
      </button>
    </div>
  );
}

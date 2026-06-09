import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  ImageIcon,
  Search,
  ChevronDown,
  Layers,
  Filter,
  DollarSign,
  ArrowUpDown,
  Eye,
  EyeOff,
  BarChart2,
  FileSpreadsheet,
  Upload,
  Check,
  CheckCircle,
  AlertCircle,
  ChevronDown as ChevronDownIcon,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LoadingView from './LoadingView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ALL_CURRENCIES = ['THB','JPY','TWD','KRW','USD','EUR','GBP','SGD','MYR','IDR','PHP','VND','AUD','HKD','CNY'];

// --- Color presets (shared across all merchants) ---
const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Black',     hex: '#111111' }, { name: 'White',    hex: '#FFFFFF' },
  { name: 'Cream',     hex: '#FFFDD0' }, { name: 'Beige',    hex: '#F5F0E8' },
  { name: 'Grey',      hex: '#9CA3AF' }, { name: 'Silver',   hex: '#D1D5DB' },
  { name: 'Brown',     hex: '#92400E' }, { name: 'Camel',    hex: '#C19A6B' },
  { name: 'Navy',      hex: '#1E3A5F' }, { name: 'Blue',     hex: '#3B82F6' },
  { name: 'Sky Blue',  hex: '#7DD3FC' }, { name: 'Red',      hex: '#EF4444' },
  { name: 'Pink',      hex: '#F472B6' }, { name: 'Maroon',   hex: '#7F1D1D' },
  { name: 'Orange',    hex: '#F97316' }, { name: 'Yellow',   hex: '#FBBF24' },
  { name: 'Olive',     hex: '#65A30D' }, { name: 'Green',    hex: '#16A34A' },
  { name: 'Sage',      hex: '#87AE73' }, { name: 'Purple',   hex: '#7C3AED' },
  { name: 'Lavender',  hex: '#A78BFA' }, { name: 'Gold',     hex: '#D97706' },
  { name: 'Rose Gold', hex: '#B76E79' }, { name: 'Burgundy', hex: '#800020' },
];

// --- Interfaces ---

interface ProductOption {
  name: string;
  values: string[];
}

interface ProductVariant {
  combination: Record<string, string>;
  imageUrl: string;
  price: string;
  cost: string;
  stock: string;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  modelLine?: string;
  description?: string;
  price: number;
  soldCurrency?: string;
  costCurrency?: string;
  categories: string[];
  imageUrl?: string;
  images?: string[];
  options?: ProductOption[];
  variants: any[];
  isActive: boolean;
  trackStock?: boolean;
  isQuickAdd?: boolean;
}

export interface ProductForm {
  name: string;
  brand: string;
  modelLine: string;
  description: string;
  price: string;
  cost: string;
  soldCurrency: string;
  costCurrency: string;
  categories: string[];
  images: string[];
  options: ProductOption[];
  variants: ProductVariant[];
  isActive: boolean;
  trackStock: boolean;
  simpleStock: string; // stock qty for simple products (no variants)
  // Fix 7: optional detail fields
  sku?: string;
  barcode?: string;
  weight?: string;
}

// --- Helpers ---

function cartesian(options: ProductOption[]): Record<string, string>[] {
  const active = options.filter(o => o.name && o.values.length > 0);
  if (!active.length) return [];
  return active.reduce<Record<string, string>[]>((acc, opt) => {
    if (!acc.length) return opt.values.map(v => ({ [opt.name]: v }));
    return acc.flatMap(combo => opt.values.map(v => ({ ...combo, [opt.name]: v })));
  }, []);
}

export function normalizeToForm(raw: any): ProductForm {
  const images: string[] = raw.images?.length ? raw.images : (raw.imageUrl ? [raw.imageUrl] : []);
  const base = {
    name: raw.name || '', brand: raw.brand || '', modelLine: raw.modelLine || '',
    description: raw.description || '', price: String(raw.price || ''),
    categories: raw.categories || [], images,
    isActive: raw.isActive !== false, trackStock: !!raw.trackStock,
    // Fix 7: seed detail fields from existing data
    sku: raw.sku || '', barcode: raw.barcode || '', weight: raw.weight ? String(raw.weight) : '',
  };

  if (raw.options?.length) {
    return {
      ...base,
      cost: raw.cost != null ? String(raw.cost) : '',
      soldCurrency: raw.soldCurrency || 'THB',
      costCurrency: raw.costCurrency || 'THB',
      options: raw.options,
      variants: (raw.variants || []).map((v: any) => ({
        combination: v.combination || {},
        imageUrl: v.imageUrl || '',
        price: v.price != null ? String(v.price) : '',
        cost: v.cost != null ? String(v.cost) : '',
        stock: String(v.stock ?? 0),
      })),
      simpleStock: '0',
    };
  }

  const allVariants: any[] = raw.variants || [];
  // Phantom variant: combination:{} with no variantName — used for simple product stock
  const phantomVariant = allVariants.find(v =>
    v.combination && Object.keys(v.combination).length === 0 && !v.variantName
  );
  // Legacy variantName/colors variants (filter out phantom)
  const oldVariants = allVariants.filter(v => v.variantName || (v.colors && v.colors.length > 0));

  const optGroups: ProductOption[] = [];
  const variantNames = [...new Set(oldVariants.map((v: any) => v.variantName).filter(Boolean))] as string[];
  if (variantNames.length) optGroups.push({ name: 'Variant', values: variantNames });
  const allColors = [...new Set(oldVariants.flatMap((v: any) => v.colors || []).filter(Boolean))] as string[];
  if (allColors.length) optGroups.push({ name: 'Color', values: allColors });

  const newVariants: ProductVariant[] = [];
  if (optGroups.length === 2) {
    oldVariants.forEach((v: any) => {
      if (!v.variantName) return;
      (v.colors?.length ? v.colors : ['']).forEach((c: string) => {
        newVariants.push({
          combination: { Variant: v.variantName, ...(c ? { Color: c } : {}) },
          imageUrl: '',
          price: v.price != null ? String(v.price) : '',
          cost: v.cost != null ? String(v.cost) : '',
          stock: String(v.stock ?? 0),
        });
      });
    });
  } else if (optGroups.length === 1) {
    variantNames.forEach(vn => {
      const m = oldVariants.find((v: any) => v.variantName === vn);
      newVariants.push({
        combination: { Variant: vn },
        imageUrl: '',
        price: m?.price != null ? String(m.price) : '',
        cost: m?.cost != null ? String(m.cost) : '',
        stock: String(m?.stock ?? 0),
      });
    });
  }

  return {
    ...base,
    cost: raw.cost != null ? String(raw.cost) : '',
    soldCurrency: raw.soldCurrency || 'THB',
    costCurrency: raw.costCurrency || 'THB',
    options: optGroups,
    variants: newVariants,
    simpleStock: String(phantomVariant?.stock ?? 0),
  };
}

const EMPTY_FORM: ProductForm = {
  name: '', brand: '', modelLine: '', description: '',
  price: '', cost: '', soldCurrency: 'THB', costCurrency: 'THB',
  categories: [], images: [], options: [], variants: [],
  isActive: true,
  trackStock: false,
  simpleStock: '0',
  sku: '', barcode: '', weight: '',
};

// Fix 11: named constant for low-stock threshold
const LOW_STOCK_THRESHOLD = 5;

// --- Reusable Components ---

export function CreatableDropdown({
  label, value, onChange, options, placeholder, theme = 'light', required = false
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
  placeholder: string; theme?: 'light' | 'dark'; required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => o && typeof o === 'string' && o.toLowerCase().includes(search.toLowerCase()));
  const showCreate = search.trim() !== '' && !options.some(o => (o || '').toLowerCase() === search.toLowerCase().trim());

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn("w-full border rounded-xl px-4 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between",
          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]",
          "focus-within:border-accent focus-within:ring-1 focus-within:ring-accent")}
        onClick={() => setIsOpen(true)}
      >
        <span className={value ? (theme === 'dark' ? "text-white font-medium" : "text-[#1a1d2e] font-medium") : "text-[#8b92ad]"}>{value || placeholder}</span>
        <ChevronDown size={14} className="text-[#8b92ad]" />
      </button>
      {isOpen && (
        <div className={cn("absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-xl z-50 overflow-hidden",
          theme === 'dark' ? "bg-[#1f2335] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
          <div className={cn("p-2 border-b", theme === 'dark' ? "border-[#2d324d]" : "border-[#f4f6f9]")}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={14} />
              <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && search.trim()) { onChange(search.trim()); setIsOpen(false); setSearch(''); } }}
                placeholder="Search or add..."
                className={cn("w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none", theme === 'dark' ? "bg-[#161925] text-white" : "bg-[#f4f6f9] text-[#1a1d2e]")} />
            </div>
          </div>
          <div role="listbox" className="max-h-48 overflow-y-auto p-1">
            {filtered.map(opt => (
              <button key={opt} role="option" aria-selected={value === opt} className={cn("w-full text-left px-3 py-2 text-sm rounded-lg transition-colors", theme === 'dark' ? "text-white hover:bg-[#2d324d]" : "text-[#1a1d2e] hover:bg-[#f4f6f9]")}
                onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}>{opt}</button>
            ))}
            {showCreate && (
              <button role="option" aria-selected={false} className={cn("w-full text-left px-3 py-2 text-sm rounded-lg font-bold flex items-center gap-2", theme === 'dark' ? "text-accent hover:bg-accent/[7%]" : "text-accent hover:bg-accent/[3%]")}
                onClick={() => { onChange(search.trim()); setIsOpen(false); setSearch(''); }}>
                <Plus size={14} /> Create "{search.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TagSelector({
  label, selected, onAdd, onRemove, options, placeholder = "Type to search or add...",
  isColorMode = false, theme = 'light', required = false
}: {
  label?: string; selected: string[]; onAdd: (c: string) => void; onRemove: (c: string) => void;
  options: string[]; placeholder?: string; isColorMode?: boolean; theme?: 'light' | 'dark'; required?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => o && typeof o === 'string' && !selected.includes(o) && o.toLowerCase().includes(search.toLowerCase()));
  const isHex = (str: string) => /^#[0-9A-F]{6}$/i.test(str);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const inputId = label ? `tag-selector-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined;

  return (
    <div ref={wrapperRef}>
      {label && <label htmlFor={inputId} className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">{label} {required && <span className="text-red-500">*</span>}</label>}
      <div className={cn("w-full border rounded-xl px-2 py-2 flex flex-wrap gap-2", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
        {selected.map(c => (
          <div key={c} className={cn("flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-xs font-bold", theme === 'dark' ? "bg-[#161925] text-white" : "bg-[#f4f6f9] text-[#1a1d2e]")}>
            {isHex(c) && <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c }} />}
            {c}
            <button onClick={() => onRemove(c)} aria-label={`Remove ${c}`} className="hover:text-red-400 opacity-70 hover:opacity-100"><X size={10} /></button>
          </div>
        ))}
        <div className="relative flex-1 min-w-[150px]">
          <input id={inputId} type="text" value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setIsOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' && search.trim()) { if (!selected.includes(search.trim())) onAdd(search.trim()); setSearch(''); setIsOpen(false); } }}
            placeholder={placeholder}
            className={cn("w-full bg-transparent border-none outline-none px-2 py-1.5 text-sm", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")} />
          {isOpen && (
            <div className={cn("absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-xl z-50 overflow-hidden", theme === 'dark' ? "bg-[#1f2335] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
              <div className="max-h-40 overflow-y-auto p-1">
                {filtered.map(o => (
                  <button key={o} onClick={() => { onAdd(o); setSearch(''); setIsOpen(false); }} className={cn("w-full text-left px-3 py-2 text-sm rounded-lg", theme === 'dark' ? "text-white hover:bg-[#2d324d]" : "text-[#1a1d2e] hover:bg-[#f4f6f9]")}>
                    {isHex(o) && <span className="w-3 h-3 rounded-full border border-black/10 inline-block mr-1" style={{ backgroundColor: o }} />}{o}
                  </button>
                ))}
                {search && !options.some(o => (o || '').toLowerCase() === search.toLowerCase().trim()) && (
                  <button onClick={() => { onAdd(search.trim()); setSearch(''); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-accent font-bold hover:bg-accent/[3%] rounded-lg flex items-center gap-2">
                    <Plus size={14} /> Create "{search}"
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {isColorMode && <input ref={colorInputRef} type="color" className="sr-only" onChange={e => { const hex = e.target.value.toUpperCase(); if (!selected.includes(hex)) onAdd(hex); }} />}
    </div>
  );
}

// --- MultiImageUploader ---

export function MultiImageUploader({ images, onChange, theme = 'light' }: {
  images: string[]; onChange: (images: string[]) => void; theme?: 'light' | 'dark';
}) {
  function processFiles(files: File[], callback: (urls: string[]) => void) {
    const results: string[] = [];
    let done = 0;
    if (!files.length) return;
    files.forEach(file => {
      // Fix 6: reject files over 8 MB
      if (file.size > 8 * 1024 * 1024) {
        alert(`"${file.name}" is too large (max 8 MB). Please resize and try again.`);
        done++;
        if (done === files.length) callback(results);
        return;
      }
      if (!file.type.startsWith('image/')) { done++; if (done === files.length) callback(results); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const max = 1000;
          if (w > h && w > max) { h *= max / w; w = max; } else if (h > max) { w *= max / h; h = max; }
          canvas.width = w; canvas.height = h;
          // Fix 6: null-guard canvas context
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            alert(`Could not process image "${file.name}". Skipping.`);
            done++;
            if (done === files.length) callback(results);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          results.push(canvas.toDataURL('image/jpeg', 0.82));
          done++;
          if (done === files.length) callback(results);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  const openPicker = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
    input.onchange = (e: any) => {
      const files = Array.from(e.target.files as FileList);
      processFiles(files, urls => onChange([...images, ...urls]));
    };
    input.click();
  };

  return (
    <div>
      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
        Product Photos <span className="font-normal normal-case text-[#8b92ad]">· first photo is primary</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={i} className={cn("relative group w-20 h-20 rounded-xl overflow-hidden border flex-shrink-0", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
            <img src={img} className="w-full h-full object-cover" alt="" />
            {i === 0 && (
              <div className="absolute bottom-0 left-0 right-0 text-white text-[8px] font-black text-center py-0.5 uppercase tracking-wider" style={{ background: 'var(--accent-gradient)' }}>
                Primary
              </div>
            )}
            <button
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              aria-label={`Remove image ${i + 1}`}
              className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus:opacity-100 flex items-center justify-center shadow-lg z-10 transition-opacity"
            >
              <X size={8} />
            </button>
          </div>
        ))}
        <button
          onClick={openPicker}
          className={cn(
            "w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all flex-shrink-0 cursor-pointer",
            theme === 'dark' ? "border-[#1f2335] hover:border-accent text-[#8b92ad]" : "border-[#e2e5ef] hover:border-accent text-[#8b92ad]"
          )}
        >
          <Plus size={16} />
          <span className="text-[9px] font-bold">Add</span>
        </button>
      </div>
    </div>
  );
}

// --- ColorOptionEditor ---

function ColorOptionEditor({ values, onAdd, onRemove, theme }: {
  values: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; theme: 'light' | 'dark';
}) {
  const [customInput, setCustomInput] = useState('');
  const [customHex, setCustomHex] = useState('#6366f1');
  const [showCustom, setShowCustom] = useState(false);

  const presetNames = COLOR_PRESETS.map(c => c.name);
  const customValues = values.filter(v => !presetNames.includes(v));
  const isHexVal = (s: string) => /^#[0-9A-F]{6}$/i.test(s);
  const colorForSwatch = (v: string) => {
    if (isHexVal(v)) return v;
    const preset = COLOR_PRESETS.find(p => p.name.toLowerCase() === v.toLowerCase());
    return preset ? preset.hex : v; // falls back to CSS color name (e.g. "blue")
  };

  const toggle = (name: string) => values.includes(name) ? onRemove(name) : onAdd(name);

  const addCustom = () => {
    const val = customInput.trim() || customHex;
    if (!val || values.includes(val)) return;
    onAdd(val);
    setCustomInput('');
    setShowCustom(false);
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider block">Colors</label>

      {/* Preset grid */}
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map(c => {
          const selected = values.includes(c.name);
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => toggle(c.name)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all active:scale-95",
                selected
                  ? "border-accent bg-accent/10 text-accent"
                  : isDarkTheme(theme)
                    ? "border-[#1f2335] text-[#8b92ad] hover:border-[#8b92ad]"
                    : "border-[#e2e5ef] text-[#8b92ad] hover:border-[#8b92ad]"
              )}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                style={{ backgroundColor: c.hex, outline: c.hex === '#FFFFFF' ? '1px solid #e2e5ef' : undefined }}
              />
              {c.name}
              {selected && <Check size={9} className="text-accent" />}
            </button>
          );
        })}

        {/* Custom values */}
        {customValues.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onRemove(v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all border-accent bg-accent/10 text-accent"
          >
            <span className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: colorForSwatch(v) }} />
            {isHexVal(v) ? v.toUpperCase() : v}
            <X size={9} />
          </button>
        ))}

        {/* Add custom */}
        {showCustom ? (
          <div className={cn("flex items-center gap-2 p-2 rounded-xl border", theme === 'dark' ? "border-[#1f2335] bg-[#1a1d2e]" : "border-[#e2e5ef] bg-[#f8f9fc]")}>
            <div className="relative flex-shrink-0">
              <input
                type="color"
                value={customHex}
                onChange={e => setCustomHex(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
                title="Pick a color"
              />
            </div>
            <input
              autoFocus
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') setShowCustom(false); }}
              placeholder="Name (optional)"
              className={cn(
                "w-24 border rounded-lg px-2 py-1 text-[10px] outline-none focus:border-accent",
                theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
              )}
            />
            <button type="button" onClick={addCustom} className="text-accent text-[10px] font-bold hover:underline whitespace-nowrap">Add</button>
            <button type="button" onClick={() => setShowCustom(false)} className="text-[#8b92ad] text-[10px] hover:text-red-400">✕</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-dashed transition-all",
              theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:border-accent hover:text-accent" : "border-[#e2e5ef] text-[#8b92ad] hover:border-accent hover:text-accent"
            )}
          >
            <Plus size={10} /> Custom
          </button>
        )}
      </div>
    </div>
  );
}

function isDarkTheme(theme: 'light' | 'dark') { return theme === 'dark'; }

// --- OptionCard ---

function OptionCard({ option, index, existingOptions, onUpdate, onRemove, theme }: {
  option: ProductOption; index: number;
  existingOptions: { optionNames: string[]; optionValues: string[] };
  onUpdate: (updates: Partial<ProductOption>) => void; onRemove: () => void; theme: 'light' | 'dark';
}) {
  return (
    <div className={cn("border rounded-2xl p-4 relative animate-in slide-in-from-right-4 transition-colors", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-[#f8f9fc] border-[#e2e5ef]")}>
      <button onClick={onRemove} aria-label="Remove option" className={cn("absolute top-1 right-1 border text-red-400 p-2 rounded-full shadow-sm hover:text-red-600 z-50", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
        <Trash2 size={12} />
      </button>
      <div className="mb-3 relative z-[20]">
        <CreatableDropdown label={`Option ${index + 1}`} value={option.name} onChange={name => onUpdate({ name })}
          options={existingOptions.optionNames} placeholder="e.g. Color, Size, Material" theme={theme} />
      </div>
      {option.name.toLowerCase() === 'color' ? (
        <ColorOptionEditor
          values={option.values}
          onAdd={v => !option.values.includes(v) && onUpdate({ values: [...option.values, v] })}
          onRemove={v => onUpdate({ values: option.values.filter(x => x !== v) })}
          theme={theme}
        />
      ) : (
        <TagSelector label="Values" selected={option.values}
          onAdd={v => !option.values.includes(v) && onUpdate({ values: [...option.values, v] })}
          onRemove={v => onUpdate({ values: option.values.filter(x => x !== v) })}
          options={existingOptions.optionValues.filter(v => !option.values.includes(v))}
          placeholder="Add value..." theme={theme} />
      )}
    </div>
  );
}

// --- ImageUploader (single image, compat for admin quick-order form) ---

export function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  function pickFile() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          const max = 1000;
          if (w > h && w > max) { h *= max / w; w = max; } else if (h > max) { w *= max / h; h = max; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          onChange(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
  return (
    <div>
      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Product Photo</label>
      <button type="button" onClick={pickFile} className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-[#e2e5ef] hover:border-accent/50 transition-colors bg-[#f8f9fc] flex items-center justify-center relative">
        {value
          ? <img src={value} className="w-full h-full object-cover" alt="product" />
          : <span className="text-[#8b92ad] text-xs">Click to upload photo</span>
        }
      </button>
      {value && <button type="button" onClick={() => onChange('')} className="mt-1 text-xs text-red-400 hover:text-red-600">Remove photo</button>}
    </div>
  );
}

// --- ProductModal ---

export function ProductModal({
  isOpen, initialData, onSave, onClose, isSaving,
  existingOptions, suggestedOptions, theme = 'light', quickOrderMode = false, defaultTrackStock = false,
  defaultSoldCurrency = 'THB', defaultCostCurrency = 'THB', onSaveAsDefault, priceError = '',
}: {
  isOpen: boolean; initialData: ProductForm | null;
  onSave: (data: ProductForm) => void; onClose: () => void; isSaving: boolean;
  existingOptions: { brands: string[], modelLines: string[], categories: string[], optionNames: string[], optionValues: string[] };
  suggestedOptions?: ProductOption[]; theme?: 'light' | 'dark'; quickOrderMode?: boolean; defaultTrackStock?: boolean;
  defaultSoldCurrency?: string; defaultCostCurrency?: string;
  onSaveAsDefault?: (val: boolean) => void; priceError?: string;
}) {
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [imagePickerRow, setImagePickerRow] = useState<number | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const prevIdRef = useRef<string | null>(null);
  const prevOptionsRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      if (!initialData) {
        const initOpts = suggestedOptions ?? [];
        const initVariants = cartesian(initOpts).map(combo => ({ combination: combo, imageUrl: '', price: '', cost: '', stock: '0' }));
        setForm({ ...EMPTY_FORM, trackStock: defaultTrackStock, soldCurrency: defaultSoldCurrency, costCurrency: defaultCostCurrency, options: initOpts, variants: initVariants });
        setTouched({});
        prevOptionsRef.current = JSON.stringify(initOpts);
        prevIdRef.current = null;
      } else {
        const currentId = (initialData as any)?._id;
        if (currentId !== prevIdRef.current) {
          setForm({ ...initialData, soldCurrency: defaultSoldCurrency });
          setTouched({});
          prevOptionsRef.current = JSON.stringify(initialData.options || []);
          prevIdRef.current = currentId;
        }
      }
    } else {
      prevIdRef.current = null; prevOptionsRef.current = '';
    }
  }, [isOpen, initialData]);

  // Sync variants from options changes
  // Fix 3: only react to options changes, not price/cost keystrokes
  useEffect(() => {
    const json = JSON.stringify(form.options);
    if (json === prevOptionsRef.current) return;
    prevOptionsRef.current = json;
    const combinations = cartesian(form.options);
    const existingMap = new Map<string, ProductVariant>();
    form.variants.forEach(v => existingMap.set(JSON.stringify(v.combination), v));
    setForm(prev => {
      const newVariants = combinations.map(combo => {
        const key = JSON.stringify(combo);
        return existingMap.get(key) || { combination: combo, imageUrl: '', price: prev.price || '', cost: prev.cost || '', stock: '0' };
      });
      return { ...prev, variants: newVariants };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.options]);

  // Close image picker on outside click
  useEffect(() => {
    if (imagePickerRow === null) return;
    const handler = () => setImagePickerRow(null);
    setTimeout(() => document.addEventListener('click', handler, { once: true }), 0);
    return () => document.removeEventListener('click', handler);
  }, [imagePickerRow]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { mounted: pmMounted, visible: pmVisible } = useDelayedUnmount(isOpen);
  if (!pmMounted) return null;

  const updateForm = (updates: Partial<ProductForm>) => setForm(prev => ({ ...prev, ...updates }));
  const addOption = () => { if (form.options.length >= 3) return; updateForm({ options: [...form.options, { name: '', values: [] }] }); };
  const removeOption = (i: number) => updateForm({ options: form.options.filter((_, idx) => idx !== i) });
  const updateOption = (i: number, updates: Partial<ProductOption>) => { const next = [...form.options]; next[i] = { ...next[i], ...updates }; updateForm({ options: next }); };
  const updateVariant = (i: number, field: keyof ProductVariant, value: string) => { const next = [...form.variants]; next[i] = { ...next[i], [field]: value }; updateForm({ variants: next }); };

  const activeOptions = form.options.filter(o => o.name && o.values.length > 0);
  const isValid = quickOrderMode ? form.name.trim() !== '' : form.name.trim() !== '' && form.brand.trim() !== '';

  const isDark = theme === 'dark';
  const surface = isDark ? 'bg-[#0f1117] border-[#1f2335]' : 'bg-[#f8f9fc] border-[#e2e5ef]';
  const inputCls = cn('w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors', isDark ? 'bg-[#161925] border-[#1f2335] text-white placeholder:text-[#3a4060]' : 'bg-white border-[#e2e5ef] text-[#1a1d2e]');
  const sectionLabel = 'text-[9px] font-black uppercase tracking-widest text-[#8b92ad]';

  return (
    <div
      className="modal-overlay fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      data-state={pmVisible ? 'open' : 'closed'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        data-state={pmVisible ? 'open' : 'closed'}
        className={cn('modal-panel w-full max-w-6xl rounded-[32px] overflow-hidden shadow-2xl max-h-[96vh] flex flex-col', isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-[#e2e5ef]')}
      >
        {/* ── Header ── */}
        <div className={cn('flex items-center gap-4 px-7 pt-5 pb-4 border-b flex-shrink-0', isDark ? 'border-[#1f2335]' : 'border-[#f0f2f7]')}>
          <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0', isDark ? 'bg-accent/15 text-accent' : 'bg-accent/10 text-accent')}>
            <Package size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="product-modal-title" className={cn('text-base font-black', isDark ? 'text-white' : 'text-[#1a1d2e]')}>
              {initialData ? 'Edit Product' : 'Catalog New Product'}
            </h3>
            <p className="text-[11px] text-[#8b92ad] mt-0.5">
              {quickOrderMode ? 'Fill what you need now — manage stock and photos later' : 'Options auto-generate variant combinations'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className={cn('w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-colors', isDark ? 'bg-[#1a1d2e] text-[#8b92ad] hover:bg-[#2d324d] hover:text-white' : 'bg-[#f4f6f9] text-[#8b92ad] hover:bg-[#e2e5ef]')}>
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 overflow-hidden">

          {/* Left column */}
          <div className={cn('px-6 py-4 space-y-4 overflow-y-auto', isDark ? 'border-r border-[#1f2335]' : 'border-r border-[#f0f2f7]')}>

            {/* Photos */}
            <div>
              <p className={cn(sectionLabel, 'mb-2')}>Product Photos · first is primary</p>
              <MultiImageUploader images={form.images} onChange={imgs => updateForm({ images: imgs })} theme={theme} />
            </div>

            {/* Identity */}
            <div>
              <p className={cn(sectionLabel, 'mb-2')}>Identity</p>
              <div className={cn('rounded-2xl border p-3 space-y-2.5', surface)}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative z-[100]">
                    <CreatableDropdown label="Brand" value={form.brand} onChange={v => updateForm({ brand: v })} options={existingOptions.brands} placeholder="e.g. Nike" theme={theme} required={true} />
                  </div>
                  <div className="relative z-[90]">
                    <CreatableDropdown label="Model Line" value={form.modelLine} onChange={v => updateForm({ modelLine: v })} options={existingOptions.modelLines} placeholder="e.g. Air Max" theme={theme} />
                  </div>
                </div>
                <div>
                  <label className={cn(sectionLabel, 'mb-1.5 block')}>Display Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={e => updateForm({ name: e.target.value })} placeholder="e.g. Classic Tee"
                    onBlur={() => setTouched(t => ({ ...t, name: true }))}
                    className={cn(inputCls, touched.name && !form.name.trim() && '!border-red-500')} />
                  {touched.name && !form.name.trim() && <p role="alert" className="text-[10px] text-red-500 mt-1">Display name is required</p>}
                </div>
                <div>
                  <label className={cn(sectionLabel, 'mb-1.5 block')}>Description</label>
                  <textarea value={form.description} onChange={e => updateForm({ description: e.target.value })} rows={1}
                    placeholder="What makes this product special..."
                    className={cn(inputCls, 'resize-none')} />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={sectionLabel}>Pricing</p>
                <span className="text-[9px] text-[#8b92ad]">Variants can override</span>
              </div>
              <div className={cn('rounded-2xl border p-3 space-y-2', surface)}>
                <div>
                  <label className={cn(sectionLabel, 'mb-1.5 block')}>Selling Price <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" min="0.01" step="any" value={form.price} onChange={e => updateForm({ price: e.target.value })} placeholder="299"
                      className={cn(inputCls, 'col-span-2 font-bold text-accent')} />
                    <div className={cn('border rounded-xl px-3 py-2.5 text-xs font-bold flex items-center justify-center select-none', isDark ? 'bg-[#161925] border-[#1f2335] text-[#8b92ad]' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#8b92ad]')}
                      title="Selling currency is set in Settings → Local currency">
                      {form.soldCurrency || defaultSoldCurrency}
                    </div>
                  </div>
                  {priceError && <p role="alert" className="text-[10px] text-red-500 mt-1">{priceError}</p>}
                </div>
                <div>
                  <label className={cn(sectionLabel, 'mb-1.5 block')}>Cost Price</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={form.cost} onChange={e => updateForm({ cost: e.target.value })} placeholder="150"
                      className={cn(inputCls, 'col-span-2 font-bold')} />
                    <select value={form.costCurrency} onChange={e => updateForm({ costCurrency: e.target.value })}
                      className={cn('border rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-accent transition-colors', isDark ? 'bg-[#161925] border-[#1f2335] text-white' : 'bg-white border-[#e2e5ef] text-[#1a1d2e]')}>
                      {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div>
              <p className={cn(sectionLabel, 'mb-2')}>Details</p>
              <div className={cn('rounded-2xl border p-3', surface)}>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { field: 'sku', label: 'SKU', placeholder: 'SKU-001', type: 'text' },
                    { field: 'barcode', label: 'Barcode', placeholder: '8851234…', type: 'text' },
                    { field: 'weight', label: 'Weight (g)', placeholder: '250', type: 'number' },
                  ].map(({ field, label, placeholder, type }) => (
                    <div key={field}>
                      <label className="text-[9px] font-bold text-[#8b92ad] mb-1.5 block">{label}</label>
                      <input type={type} min={type === 'number' ? 0 : undefined}
                        value={(form as any)[field] || ''}
                        onChange={e => updateForm({ [field]: e.target.value } as any)}
                        placeholder={placeholder}
                        className={cn('w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-accent transition-colors', isDark ? 'bg-[#161925] border-[#1f2335] text-white placeholder:text-[#3a4060]' : 'bg-white border-[#e2e5ef] text-[#1a1d2e]')} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="px-6 py-4 space-y-4 overflow-y-auto">

            {/* Inventory */}
            <div>
              <p className={cn(sectionLabel, 'mb-2')}>Inventory</p>
              <div className={cn('rounded-2xl border p-3 space-y-2.5', surface)}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-[#1a1d2e]')}>Track Stock</p>
                    <p className="text-[10px] text-[#8b92ad] mt-0.5">Count inventory &amp; get low-stock alerts</p>
                  </div>
                  <button type="button" role="switch" aria-checked={form.trackStock} aria-label="Track stock quantity"
                    onClick={() => updateForm({ trackStock: !form.trackStock })}
                    className={cn('relative w-11 h-6 rounded-full transition-colors flex-shrink-0', form.trackStock ? 'bg-accent' : (isDark ? 'bg-[#2a2f45]' : 'bg-slate-300'))}>
                    <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.trackStock && 'translate-x-5')} />
                  </button>
                </div>
                {onSaveAsDefault && (
                  form.trackStock === defaultTrackStock ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                      <CheckCircle size={10} /> Default: {defaultTrackStock ? 'Track ON' : 'Track OFF'}
                    </span>
                  ) : (
                    <button type="button" onClick={() => onSaveAsDefault(form.trackStock)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-accent/40 text-accent hover:bg-accent/10 hover:border-accent transition-all active:scale-95">
                      <Check size={9} /> Save &quot;{form.trackStock ? 'ON' : 'OFF'}&quot; as default
                    </button>
                  )
                )}
                {form.trackStock && form.options.length === 0 && !quickOrderMode && (
                  <div className={cn('border-t pt-3', isDark ? 'border-[#1f2335]' : 'border-[#e2e5ef]')}>
                    <label className={cn(sectionLabel, 'mb-2 block')}>Current Stock</label>
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label="Decrease stock"
                        onClick={() => updateForm({ simpleStock: String(Math.max(0, (parseInt(form.simpleStock) || 0) - 1)) })}
                        className={cn('w-9 h-9 rounded-xl border text-lg font-bold flex items-center justify-center transition-colors active:scale-95', isDark ? 'border-[#1f2335] text-white hover:bg-[#2d324d]' : 'border-[#e2e5ef] text-[#1a1d2e] hover:bg-[#f4f6f9]')}>−</button>
                      <input type="number" min="0" value={form.simpleStock} onChange={e => updateForm({ simpleStock: e.target.value })}
                        className={cn('flex-1 border rounded-xl px-3 py-2 text-sm font-bold text-center outline-none focus:border-accent transition-colors', isDark ? 'bg-[#161925] border-[#1f2335] text-white' : 'bg-white border-[#e2e5ef] text-[#1a1d2e]')} />
                      <button type="button" aria-label="Increase stock"
                        onClick={() => updateForm({ simpleStock: String((parseInt(form.simpleStock) || 0) + 1) })}
                        className={cn('w-9 h-9 rounded-xl border text-lg font-bold flex items-center justify-center transition-colors active:scale-95', isDark ? 'border-[#1f2335] text-white hover:bg-[#2d324d]' : 'border-[#e2e5ef] text-[#1a1d2e] hover:bg-[#f4f6f9]')}>+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Categories */}
            <div>
              <p className={cn(sectionLabel, 'mb-2')}>Categories</p>
              <TagSelector selected={form.categories}
                onAdd={c => !form.categories.includes(c) && updateForm({ categories: [...form.categories, c] })}
                onRemove={c => updateForm({ categories: form.categories.filter(x => x !== c) })}
                options={existingOptions.categories} placeholder="Search or add category..." theme={theme} />
            </div>

            {/* Options */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className={sectionLabel}>Product Options</p>
                  <p className="text-[9px] text-[#8b92ad] mt-0.5">Max 3 · variants auto-generated</p>
                </div>
                <div className="flex items-center gap-2">
                  {!form.options.some(o => o.name.toLowerCase() === 'color') && form.options.length < 3 && (
                    <button onClick={() => updateForm({ options: [...form.options, { name: 'Color', values: [] }] })}
                      className={cn('text-[10px] font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all', isDark ? 'border-[#1f2335] text-[#8b92ad] hover:border-accent/50 hover:text-accent bg-[#0f1117]' : 'border-[#e2e5ef] text-[#8b92ad] hover:border-accent/50 hover:text-accent bg-[#f8f9fc]')}>
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 flex-shrink-0" />
                      + Color
                    </button>
                  )}
                  <button onClick={addOption} disabled={form.options.length >= 3}
                    className="text-accent text-[10px] font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-accent/30 hover:bg-accent/10 transition-colors disabled:opacity-30">
                    <Plus size={12} /> Add Option
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="animate-slide-up" style={{ zIndex: (form.options.length - idx) * 10 + 10, position: 'relative', animationDelay: `${idx * 80}ms` }}>
                    <OptionCard option={opt} index={idx} existingOptions={existingOptions}
                      onUpdate={updates => updateOption(idx, updates)} onRemove={() => removeOption(idx)} theme={theme} />
                  </div>
                ))}
              </div>

              {form.options.length === 0 && (
                <div onClick={addOption}
                  className={cn('rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors group mt-1', isDark ? 'border-[#1f2335] hover:border-accent/40' : 'border-[#e2e5ef] hover:border-accent/40')}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors', isDark ? 'bg-[#1a1d2e] text-[#8b92ad] group-hover:text-accent' : 'bg-[#f4f6f9] text-[#8b92ad] group-hover:text-accent')}>
                    <Plus size={16} />
                  </div>
                  <p className={cn('text-xs font-bold', isDark ? 'text-[#8b92ad]' : 'text-[#4a5170]')}>Add your first option</p>
                  <p className="text-[10px] text-[#8b92ad] mt-0.5">e.g. Color, Size, Material</p>
                </div>
              )}

              {form.options.length === 0 && (
                <div className={cn('mt-2.5 rounded-xl px-3 py-2.5 flex items-center gap-2.5', isDark ? 'bg-[#0f1117]' : 'bg-[#f4f6f9]')}>
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', isDark ? 'bg-[#2a2f45]' : 'bg-[#c8cdd8]')} />
                  <p className="text-[10px] text-[#8b92ad]">Simple product — base price, no variant selection for customers</p>
                </div>
              )}

              {form.options.length > 0 && activeOptions.length === 0 && (
                <div className={cn('mt-2 rounded-xl p-3.5 text-center', isDark ? 'bg-[#0f1117]' : 'bg-[#f8f9fc]')}>
                  <p className="text-xs text-[#8b92ad]">Set a name and at least one value to generate variants.</p>
                </div>
              )}

              {/* Variant table */}
              {activeOptions.length > 0 && form.variants.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className={sectionLabel}>Variants ({form.variants.length})</p>
                    {form.images.length > 0 && <span className="text-[9px] text-[#8b92ad]">Click photo icon to assign image</span>}
                  </div>
                  <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'border-[#1f2335]' : 'border-[#e2e5ef]')}>
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                      <table className="w-full min-w-[360px]">
                        <thead className="sticky top-0">
                          <tr className={cn('text-[9px] font-black uppercase tracking-widest border-b', isDark ? 'bg-[#0f1117] border-[#1f2335] text-[#8b92ad]' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#8b92ad]')}>
                            {activeOptions.map(o => <th key={o.name} className="px-3 py-2 text-left whitespace-nowrap">{o.name}</th>)}
                            {form.images.length > 0 && <th className="px-2 py-2 text-left">Photo</th>}
                            <th className="px-2 py-2 text-left">Price</th>
                            <th className="px-2 py-2 text-left">Cost</th>
                            {form.trackStock && <th className="px-2 py-2 text-left">Stock</th>}
                          </tr>
                        </thead>
                        <tbody className={cn('divide-y', isDark ? 'divide-[#1f2335]' : 'divide-[#f4f6f9]')}>
                          {form.variants.map((v, idx) => (
                            <tr key={JSON.stringify(v.combination || idx)} className={cn('animate-fade-in transition-colors hover:bg-accent/[0.03]', isDark ? 'hover:bg-[#1a1d2e]' : 'hover:bg-[#fafbfc]')} style={{ animationDelay: `${idx * 25}ms` }}>
                              {activeOptions.map(o => (
                                <td key={o.name} className={cn('px-3 py-1.5 text-xs font-bold whitespace-nowrap', isDark ? 'text-white' : 'text-[#1a1d2e]')}>
                                  {v.combination[o.name] || '—'}
                                </td>
                              ))}
                              {form.images.length > 0 && (
                                <td className="px-1.5 py-1">
                                  <div className="relative" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => setImagePickerRow(imagePickerRow === idx ? null : idx)}
                                      aria-label={`Assign image to variant ${Object.values(v.combination || {}).join('/')}`}
                                      aria-expanded={imagePickerRow === idx}
                                      className={cn('w-10 h-10 rounded-lg border overflow-hidden flex items-center justify-center transition-colors',
                                        v.imageUrl ? 'border-accent' : (isDark ? 'border-[#1f2335] border-dashed' : 'border-dashed border-[#e2e5ef]')
                                      )}>
                                      {v.imageUrl ? <img src={v.imageUrl} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={12} className="text-[#8b92ad]" />}
                                    </button>
                                    {imagePickerRow === idx && (
                                      <div className={cn('absolute left-0 top-10 z-[60] border rounded-xl shadow-xl p-2 flex gap-1.5 flex-wrap', isDark ? 'bg-[#1f2335] border-[#2d324d]' : 'bg-white border-[#e2e5ef]')} style={{ minWidth: 112 }}>
                                        <button onClick={() => { updateVariant(idx, 'imageUrl', ''); setImagePickerRow(null); }}
                                          className={cn('w-8 h-8 rounded-lg border-dashed border flex items-center justify-center text-[#8b92ad] hover:border-red-400 hover:text-red-400', isDark ? 'border-[#2d324d]' : 'border-[#e2e5ef]')}>
                                          <X size={10} />
                                        </button>
                                        {form.images.map((img, imgIdx) => (
                                          <button key={imgIdx} onClick={() => { updateVariant(idx, 'imageUrl', img); setImagePickerRow(null); }}
                                            className={cn('w-8 h-8 rounded-lg border-2 overflow-hidden transition-all', v.imageUrl === img ? 'border-accent scale-110' : 'border-transparent hover:border-[#8b92ad]')}>
                                            <img src={img} className="w-full h-full object-cover" alt="" />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="px-1.5 py-1">
                                <input type="number" value={v.price} onChange={e => updateVariant(idx, 'price', e.target.value)}
                                  placeholder={form.price || '—'}
                                  aria-label={`Price for ${Object.values(v.combination || {}).join('/')}`}
                                  className={cn('w-20 border rounded-lg px-2 py-1 text-xs font-bold text-accent outline-none focus:border-accent', isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]')} />
                              </td>
                              <td className="px-1.5 py-1">
                                <input type="number" value={v.cost} onChange={e => updateVariant(idx, 'cost', e.target.value)}
                                  placeholder={form.cost || '—'}
                                  aria-label={`Cost for ${Object.values(v.combination || {}).join('/')}`}
                                  className={cn('w-20 border rounded-lg px-2 py-1 text-xs outline-none focus:border-accent', isDark ? 'bg-[#161925] border-[#1f2335] text-white' : 'bg-white border-[#e2e5ef] text-[#1a1d2e]')} />
                              </td>
                              {form.trackStock && (
                                <td className="px-1.5 py-1">
                                  <input type="number" min="0" value={v.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)}
                                    placeholder="0"
                                    aria-label={`Stock for ${Object.values(v.combination || {}).join('/')}`}
                                    className={cn('w-16 border rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-accent', isDark ? 'bg-[#161925] border-[#1f2335] text-emerald-400' : 'bg-white border-[#e2e5ef] text-emerald-600')} />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#8b92ad] mt-1.5">{form.trackStock ? 'Set stock quantities per variant above.' : 'Enable Track Stock to set quantities per variant.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className={cn('flex gap-3 px-6 py-4 border-t flex-shrink-0', isDark ? 'border-[#1f2335]' : 'border-[#f0f2f7]')}>
          <button onClick={onClose} className={cn('px-6 py-3 text-sm font-bold rounded-2xl transition-colors', isDark ? 'bg-[#1a1d2e] text-[#8b92ad] hover:bg-[#2d324d]' : 'bg-[#f4f6f9] text-[#8b92ad] hover:bg-[#e2e5ef]')}>
            Cancel
          </button>
          <div className="flex-1 flex flex-col gap-1">
            <button disabled={!isValid || isSaving} onClick={() => onSave(form)}
              className="w-full py-3 text-sm font-black text-white rounded-2xl shadow-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--accent-gradient)' }}>
              {isSaving ? 'Processing...' : quickOrderMode ? 'Save & Select' : initialData ? 'Stage Changes' : 'Save Product'}
            </button>
            {initialData && !isSaving && (
              <p className="text-center text-[9px] text-[#8b92ad]">Changes saved when you click &apos;Save X changes&apos;</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- StockModal ---

function StockModal({ product, onClose, onSave, isSaving, theme, stockError = '', open }: {
  product: Product; onClose: () => void;
  onSave: (updatedVariants: any[]) => void;
  isSaving: boolean; theme?: 'light' | 'dark'; stockError?: string; open?: boolean;
}) {
  const [stocks, setStocks] = useState<Record<number, string>>({});

  useEffect(() => {
    const init: Record<number, string> = {};
    if (product.variants.length === 0) {
      init[0] = '0';
    } else {
      product.variants.forEach((v, i) => { init[i] = String(v.stock ?? 0); });
    }
    setStocks(init);
  }, [product]);

  function variantLabel(v: any) {
    if (v.combination && Object.keys(v.combination).length > 0) return Object.values(v.combination).join(' / ');
    return [v.variantName, v.colors?.[0]].filter(Boolean).join(' — ') || 'Default';
  }

  const { mounted: stMounted, visible: stVisible } = useDelayedUnmount(open !== false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!stMounted) return null;

  return (
    <div
      className="modal-overlay fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
      data-state={stVisible ? 'open' : 'closed'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
        data-state={stVisible ? 'open' : 'closed'}
        className={cn("modal-panel w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}
      >
        <div className={cn("flex items-center justify-between px-8 pt-8 pb-4 border-b", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <div>
            <h3 id="stock-modal-title" className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Manage Stock</h3>
            <p className="text-xs text-[#8b92ad] truncate max-w-[220px]">{product.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className={cn("w-8 h-8 flex items-center justify-center rounded-full", theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#2d324d]" : "bg-[#f4f6f9] hover:bg-[#e2e5ef]")}><X size={16} /></button>
        </div>

        <div className="px-8 py-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {product.variants.length === 0 ? (
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="flex-1">
                <span className={cn("text-sm font-medium", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Total Stock</span>
                <p className="text-[10px] text-[#8b92ad] mt-0.5">Simple product · no variants configured</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-bold text-[#8b92ad] uppercase">Qty</span>
                <input type="number" min="0" value={stocks[0] ?? '0'}
                  onChange={e => setStocks(prev => ({ ...prev, [0]: e.target.value }))}
                  className={cn("w-24 border rounded-xl px-3 py-2 text-sm font-bold text-center outline-none focus:border-accent", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]")} />
              </div>
            </div>
          ) : product.variants.map((v, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {(v.imageUrl || product.images?.[0] || product.imageUrl) && (
                  <img src={v.imageUrl || product.images?.[0] || product.imageUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                )}
                <span className={cn("text-sm font-medium truncate", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{variantLabel(v)}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-bold text-[#8b92ad] uppercase">Stock</span>
                <input type="number" min="0" value={stocks[i] ?? '0'}
                  onChange={e => setStocks(prev => ({ ...prev, [i]: e.target.value }))}
                  className={cn("w-20 border rounded-xl px-3 py-2 text-sm font-bold text-center outline-none focus:border-accent", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]")} />
              </div>
            </div>
          ))}
        </div>

        <div className={cn("px-8 pb-8 pt-4 border-t", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          {stockError && <p role="alert" className="text-xs text-red-500 mb-3">{stockError}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className={cn("flex-1 py-3 text-sm font-bold rounded-2xl", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f8f9fc] text-[#8b92ad]")}>Cancel</button>
            <button
              disabled={isSaving}
              onClick={() => {
                if (product.variants.length === 0) {
                  onSave([{ combination: {}, imageUrl: '', price: null, cost: null, stock: parseInt(stocks[0] ?? '0') || 0 }]);
                } else {
                  onSave(product.variants.map((v, i) => ({ ...v, stock: parseInt(stocks[i] ?? '0') || 0 })));
                }
              }}
              className="flex-1 py-3 text-sm font-bold text-white rounded-2xl shadow-lg disabled:opacity-40"
              style={{ background: 'var(--accent-gradient)' }}>
              {isSaving ? 'Saving...' : 'Save Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main ProductManagement Hub ---

const ProductManagement = React.memo(function ProductManagement({ theme, t, onLimitHit, onDirtyChange }: { theme?: 'light' | 'dark', t: any, onLimitHit?: (feature: string, limit?: number, current?: number) => void, onDirtyChange?: (dirty: boolean, save: () => Promise<void>, discard: () => void) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>('');
  const [showImport, setShowImport] = useState(false);
  const [importGuideOpen, setImportGuideOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; errors: string[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [isStockSaving, setIsStockSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [stockError, setStockError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [saveFailCount, setSaveFailCount] = useState(0);
  const [defaultTrackStock, setDefaultTrackStock] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('defaultTrackStock') === 'true';
    return false;
  });
  const [pendingEdits, setPendingEdits] = useState<Record<string, ProductForm>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkPriceMode, setBulkPriceMode] = useState(false);
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [cardSize, setCardSize] = useState<number>(() => {
    if (typeof window !== 'undefined') return parseInt(localStorage.getItem('catalogCardSize') || '3');
    return 3;
  });
  const [productsPerPage, setProductsPerPage] = useState<number>(() => {
    if (typeof window !== 'undefined') return parseInt(localStorage.getItem('catalogProductsPerPage') || '25');
    return 25;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const secret = typeof window !== 'undefined' ? localStorage.getItem('admin_secret') || '' : '';
  const [merchantCurrencies, setMerchantCurrencies] = useState({ sold: 'THB', cost: 'THB' });

  const stockProductRef = useRef<Product | null>(null);
  if (stockProduct !== null) stockProductRef.current = stockProduct;
  const { mounted: smMounted, visible: smVisible } = useDelayedUnmount(!!stockProduct);
  const { mounted: siMounted, visible: siVisible } = useDelayedUnmount(showImport);
  const { mounted: dcMounted, visible: dcVisible } = useDelayedUnmount(!!deleteConfirm);
  const { mounted: bdMounted, visible: bdVisible } = useDelayedUnmount(bulkDeleteConfirmOpen);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products', { headers: { 'x-admin-secret': secret } });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [secret]);

  useEffect(() => {
    if (!secret) return;
    fetch('/api/settings', { headers: { 'x-admin-secret': secret } })
      .then(r => r.json())
      .then(s => {
        setMerchantCurrencies({
          sold: s?.localCurrency || 'THB',
          cost: s?.importCurrency || 'THB'
        });
      })
      .catch(() => {});
  }, [secret]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const unique = (path: string) => {
    const vals = new Set<string>();
    products.forEach(p => {
      if (path === 'category') p.categories?.forEach((c: string) => vals.add(c));
      else if ((p as any)[path]) vals.add((p as any)[path]);
    });
    return Array.from(vals).sort();
  };

  const existingOptions = useMemo(() => {
    const optionNames = new Set<string>();
    const optionValues = new Set<string>();
    products.forEach(p => {
      p.options?.forEach((o: any) => {
        if (o.name) optionNames.add(o.name);
        o.values?.forEach((v: string) => optionValues.add(v));
      });
      p.variants?.forEach((v: any) => {
        if (v.variantName) { optionNames.add('Variant'); optionValues.add(v.variantName); }
        v.colors?.forEach((c: string) => { optionNames.add('Color'); optionValues.add(c); });
      });
    });
    return {
      brands: unique('brand'),
      modelLines: unique('modelLine'),
      categories: unique('category'),
      optionNames: Array.from(optionNames).sort(),
      optionValues: Array.from(optionValues).sort(),
    };
  }, [products]);

  const suggestedOptions = useMemo((): ProductOption[] => {
    if (products.length < 2) return [];
    const freq: Record<string, Record<string, number>> = {};
    products.forEach(p => {
      if (p.options?.length) {
        p.options.forEach((o: any) => {
          if (!o.name) return;
          if (!freq[o.name]) freq[o.name] = {};
          o.values?.forEach((v: string) => { freq[o.name][v] = (freq[o.name][v] || 0) + 1; });
        });
      } else {
        p.variants?.forEach((v: any) => {
          if (v.variantName) { if (!freq['Variant']) freq['Variant'] = {}; freq['Variant'][v.variantName] = (freq['Variant'][v.variantName] || 0) + 1; }
          v.colors?.forEach((c: string) => { if (!freq['Color']) freq['Color'] = {}; freq['Color'][c] = (freq['Color'][c] || 0) + 1; });
        });
      }
    });
    const threshold = Math.max(2, Math.ceil(products.length * 0.5));
    return Object.entries(freq)
      .filter(([, vals]) => Object.values(vals).some(count => count >= threshold))
      .map(([name, vals]) => ({ name, values: Object.entries(vals).filter(([, count]) => count >= threshold).sort(([, a], [, b]) => b - a).map(([v]) => v) }))
      .filter(o => o.values.length > 0)
      .slice(0, 3);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = !searchTerm || (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.modelLine || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.categories || []).some((c: string) => c.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? p.isActive : !p.isActive);
      return matchesSearch && matchesStatus && (!brandFilter || p.brand === brandFilter) && (!categoryFilter || p.categories.includes(categoryFilter));
    });
    result.sort((a, b) => {
      if (sortOrder === 'newest') return new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime();
      if (sortOrder === 'price-asc') return a.price - b.price;
      if (sortOrder === 'price-desc') return b.price - a.price;
      if (sortOrder === 'name-az') return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [products, searchTerm, brandFilter, categoryFilter, statusFilter, sortOrder]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, currentPage, productsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const stats = useMemo(() => ({ total: products.length, active: products.filter(p => p.isActive).length }), [products]);
  const normalizedEditingProduct = useMemo(() => editingProduct ? normalizeToForm(editingProduct) : null, [editingProduct]);

  const buildPayload = (form: ProductForm) => {
    const isSimple = form.options.length === 0 && form.variants.length === 0;
    const mappedVariants = form.variants.map(v => ({
      combination: v.combination,
      imageUrl: v.imageUrl || '',
      price: v.price !== '' ? parseFloat(v.price) : null,
      cost: v.cost !== '' ? parseFloat(v.cost) : null,
      // Fix 2: clamp variant stock to non-negative
      stock: Math.max(0, parseInt(v.stock as any) || 0),
    }));
    return {
      ...form,
      price: parseFloat(form.price as any) || 0,
      cost: form.cost !== '' ? parseFloat(form.cost as any) : null,
      imageUrl: form.images[0] || '',
      images: form.images,
      options: form.options,
      variants: isSimple && form.trackStock
        // Fix 2: clamp simpleStock to non-negative
        ? [{ combination: {}, imageUrl: '', price: null, cost: null, stock: Math.max(0, parseInt(form.simpleStock) || 0) }]
        : mappedVariants,
      // Fix 7: include optional detail fields
      ...(form.sku && { sku: form.sku }),
      ...(form.barcode && { barcode: form.barcode }),
      ...(form.weight && { weight: form.weight }),
    };
  };

  const handleSave = async (form: ProductForm) => {
    // Fix 1: validate price is a valid positive number before proceeding
    const parsedPrice = parseFloat(form.price as any);
    if (!form.price || isNaN(parsedPrice) || parsedPrice <= 0) {
      setPriceError('Please enter a valid selling price greater than 0.');
      return;
    }
    setPriceError('');

    if (editingProduct) {
      // Buffer the edit — optimistically update card, persist later
      setProducts(prev => prev.map(p => {
        if (p._id !== editingProduct._id) return p;
        return {
          ...p,
          name: form.name,
          brand: form.brand,
          modelLine: form.modelLine,
          description: form.description,
          price: parseFloat(form.price as any) || p.price,
          categories: form.categories,
          images: form.images,
          imageUrl: form.images[0] || p.imageUrl,
          options: form.options,
          isActive: form.isActive,
          trackStock: form.trackStock,
          variants: form.variants.length > 0
            ? form.variants.map(v => ({
                combination: v.combination, imageUrl: v.imageUrl || '',
                price: v.price !== '' ? Math.max(0, parseFloat(v.price)) : null,
                cost: v.cost !== '' ? parseFloat(v.cost) : null,
                stock: Math.max(0, parseInt(v.stock as any) || 0),
              }))
            : (form.trackStock
                ? [{ combination: {}, imageUrl: '', price: null, cost: null, stock: Math.max(0, parseInt(form.simpleStock) || 0) }]
                : []),
        };
      }));
      setPendingEdits(prev => ({ ...prev, [editingProduct._id]: form }));
      setIsModalOpen(false);
      return;
    }
    // New product — save immediately
    setIsSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(buildPayload(form)),
      });
      if (res.ok) { setIsModalOpen(false); loadProducts(); }
      else {
        const err = await res.json().catch(() => ({}));
        if (err?.error === 'TIER_LIMIT_REACHED') {
          onLimitHit?.(err.feature, err.limit, err.current);
        } else {
          alert(`Save failed: ${err?.error || res.status}`);
        }
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleSaveAllPending = async () => {
    const entries = Object.entries(pendingEdits);
    if (!entries.length) return;
    setIsSaving(true);
    setSaveFailCount(0);
    try {
      const results = await Promise.allSettled(entries.map(([id, form]) =>
        fetch(`/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
          body: JSON.stringify(buildPayload(form)),
        }).then(res => ({ id, ok: res.ok }))
      ));
      const failedIds = new Set<string>();
      let failCount = 0;
      results.forEach((result, i) => {
        if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok)) {
          failedIds.add(entries[i][0]);
          failCount++;
        }
      });
      if (failCount > 0) setSaveFailCount(failCount);
      setPendingEdits(prev => {
        const next: Record<string, ProductForm> = {};
        failedIds.forEach(id => { if (prev[id]) next[id] = prev[id]; });
        return next;
      });
      loadProducts();
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleDiscardPending = () => {
    setPendingEdits({});
    loadProducts();
  };

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    const hasPending = Object.keys(pendingEdits).length > 0;
    onDirtyChangeRef.current?.(hasPending, handleSaveAllPending, handleDiscardPending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEdits]);

  const handleStockSave = async (updatedVariants: any[]) => {
    if (!stockProduct) return;
    setIsStockSaving(true);
    try {
      const res = await fetch(`/api/products/${stockProduct._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ variants: updatedVariants }),
      });
      if (res.ok) { setStockProduct(null); loadProducts(); }
      else setStockError('Stock save failed. Please try again.');
    } catch (err) { console.error(err); } finally { setIsStockSaving(false); }
  };

  const handleImportCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return;

    // Parse header row, strip BOM
    const header = lines[0].replace(/^﻿/, '').split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const col = (row: string[], name: string) => {
      const i = header.findIndex(h => h.includes(name));
      return i >= 0 ? (row[i] ?? '').replace(/"/g, '').trim() : '';
    };

    const rows = lines.slice(1).map(line => {
      // Simple CSV split — handles quoted fields with commas
      const cells: string[] = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cells.push(cur); cur = ''; }
        else { cur += ch; }
      }
      cells.push(cur);
      return cells;
    });

    setImportProgress({ done: 0, total: rows.length, errors: [] });
    const errors: string[] = [];
    let duplicatesSkipped = 0;
    const importedNames = new Set<string>(); // tracks names added in this import batch

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Fix 5: validate column count
      if (row.length < header.length) {
        errors.push(`Row ${i + 2}: malformed — expected ${header.length} columns, got ${row.length}. Skipping.`);
        setImportProgress({ done: i + 1, total: rows.length, errors: [...errors] });
        continue;
      }
      const name = col(row, 'name');
      // Support both new ("Sold Price") and legacy ("Price (THB)") column names
      const colExact = (row: string[], exact: string) => {
        const i = header.findIndex(h => h === exact.toLowerCase());
        return i >= 0 ? (row[i] ?? '').replace(/"/g, '').trim() : '';
      };
      const priceStr = colExact(row, 'sold price') || col(row, 'price');
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));

      if (!name) { errors.push(`Row ${i + 2}: missing name`); setImportProgress({ done: i + 1, total: rows.length, errors: [...errors] }); continue; }
      if (isNaN(price)) { errors.push(`Row ${i + 2}: invalid price "${priceStr}"`); setImportProgress({ done: i + 1, total: rows.length, errors: [...errors] }); continue; }

      const soldCurrency = colExact(row, 'sold currency') || col(row, 'soldcurrency') || '';
      const costStr = colExact(row, 'cost price') || col(row, 'cost');
      const cost = costStr ? parseFloat(costStr.replace(/[^0-9.]/g, '')) : null;
      const costCurrency = colExact(row, 'cost currency') || col(row, 'costcurrency') || '';
      const colorsRaw = col(row, 'color');
      const colors = colorsRaw ? colorsRaw.split(';').map((c: string) => c.trim()).filter(Boolean) : [];
      const trackStockRaw = colExact(row, 'track stock') || col(row, 'trackstock') || col(row, 'track');
      const trackStock = trackStockRaw ? trackStockRaw.toLowerCase() === 'yes' || trackStockRaw === '1' || trackStockRaw.toLowerCase() === 'true' : false;
      const imageUrlRaw = colExact(row, 'image url') || col(row, 'imageurl') || col(row, 'image');
      const imageUrls = imageUrlRaw ? imageUrlRaw.split(';').map((u: string) => u.trim()).filter(Boolean) : [];
      const modelLine = colExact(row, 'model line') || col(row, 'modelline') || col(row, 'model');
      const body: any = {
        name,
        price,
        ...(soldCurrency && { soldCurrency }),
        ...(costCurrency && { costCurrency }),
        description: col(row, 'description') || col(row, 'desc'),
        brand: col(row, 'brand'),
        modelLine: modelLine || '',
        categories: col(row, 'categor') ? col(row, 'categor').split(';').map((c: string) => c.trim()).filter(Boolean) : [],
        isActive: col(row, 'active').toLowerCase() !== 'no',
        trackStock,
        imageUrl: imageUrls[0] || '',
        images: imageUrls,
        ...(colors.length > 0 && {
          options: [{ name: 'Color', values: colors }],
          variants: colors.map(c => ({ combination: { Color: c }, imageUrl: '', price: null, cost: !isNaN(cost as number) ? cost : null, stock: 0 })),
        }),
        ...(colors.length === 0 && (cost !== null && !isNaN(cost) || trackStock) && {
          variants: [{ combination: {}, imageUrl: '', price: null, cost: (cost !== null && !isNaN(cost)) ? cost : null, stock: 0 }],
        }),
      };

      // Fix 8: skip duplicates — check both existing products AND names imported in this batch
      const isDuplicate = products.some(p => p.name.toLowerCase() === name.toLowerCase()) || importedNames.has(name.toLowerCase());
      if (isDuplicate) {
        duplicatesSkipped++;
        setImportProgress({ done: i + 1, total: rows.length, errors: [...errors] });
        continue;
      }

      try {
        // Fix 4: include auth header on CSV import fetch
        const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify(body) });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          errors.push(`Row ${i + 2} "${name}": ${d.error ?? 'failed'}`);
        } else {
          importedNames.add(name.toLowerCase());
        }
      } catch {
        errors.push(`Row ${i + 2} "${name}": network error`);
      }
      setImportProgress({ done: i + 1, total: rows.length, errors: [...errors] });
    }

    if (duplicatesSkipped > 0) {
      setImportProgress(prev => prev ? {
        ...prev,
        errors: [...prev.errors, `${duplicatesSkipped} duplicate(s) skipped (same name already exists).`],
      } : null);
    }
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDeleteError(`Delete failed: ${err?.error || res.status}`);
        return;
      }
      loadProducts();
      setDeleteConfirm(null);
      setDeletingName('');
    } catch (err) { console.error(err); setDeleteError('Delete failed. Please try again.'); } finally {
      setIsDeleting(false);
    }
  };

  const bulkSetVisibility = async (visible: boolean) => {
    setIsBulkActing(true);
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify({ isActive: visible }) })
      ));
      loadProducts();
    } catch (err) { console.error(err); } finally { setIsBulkActing(false); setSelectedIds(new Set()); }
  };

  // Fix 9: bulk price update
  const bulkSetPrice = async (newPrice: number) => {
    if (isNaN(newPrice) || newPrice <= 0) return;
    // Optimistic update
    setProducts(prev => prev.map(p => selectedIds.has(p._id) ? { ...p, price: newPrice } : p));
    setBulkPriceMode(false);
    setBulkPriceValue('');
    setIsBulkActing(true);
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
          body: JSON.stringify({ price: newPrice }),
        })
      ));
    } catch (err) { console.error(err); loadProducts(); } finally { setIsBulkActing(false); setSelectedIds(new Set()); }
  };

  const bulkDelete = async () => {
    setBulkDeleteConfirmOpen(true);
  };

  const executeBulkDelete = async () => {
    setBulkDeleteConfirmOpen(false);
    setIsBulkActing(true);
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch(`/api/products/${id}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } })
      ));
      loadProducts();
    } catch (err) { console.error(err); } finally { setIsBulkActing(false); setSelectedIds(new Set()); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleVisibility = async (p: Product) => {
    setProducts(prev => prev.map(prod => prod._id === p._id ? { ...prod, isActive: !p.isActive } : prod));
    try {
      await fetch(`/api/products/${p._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify({ isActive: !p.isActive }) });
    } catch (err) {
      setProducts(prev => prev.map(prod => prod._id === p._id ? { ...prod, isActive: p.isActive } : prod));
      console.error(err);
    }
  };

  // Escape key: deselect bulk selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) setSelectedIds(new Set());
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedIds]);

  // Escape key: close delete confirm modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirm) { setDeleteConfirm(null); setDeletingName(''); }
        if (bulkDeleteConfirmOpen) setBulkDeleteConfirmOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [deleteConfirm, bulkDeleteConfirmOpen]);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className={cn("text-2xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
            <div className="p-2 bg-accent/[7%] rounded-xl text-accent"><Package size={24} /></div>
            {t.catalog_hub || 'Catalog Hub'}
          </h2>
          <p className="text-[#8b92ad] text-xs font-medium mt-1 uppercase tracking-widest">{t.inventory_desc || 'Inventory & Product Lifecycle'}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              const bom = '﻿';
              const header = 'Name,Description,Brand,Model Line,Category,Sold Price,Sold Currency,Cost Price,Cost Currency,Track Stock,Image URL,Active\n';
              const rows = filteredProducts.map(p => {
                const baseVariant = p.variants?.find((v: any) => Object.keys(v.combination || {}).length === 0) || p.variants?.[0];
                const cost = baseVariant?.cost ?? '';
                return [
                  p.name, p.description ?? '', p.brand, p.modelLine ?? '',
                  (p.categories || []).join(';'),
                  p.price, p.soldCurrency || 'THB',
                  cost, p.costCurrency || 'THB',
                  p.trackStock ? 'Yes' : 'No',
                  (p.images || []).filter(Boolean).join(';'),
                  p.isActive ? 'Yes' : 'No',
                ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
              }).join('\n');
              const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
              a.download = `products_${new Date().toISOString().slice(0,10)}.csv`; a.click();
            }}
            className={cn("px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all active:scale-95", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:text-white" : "border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e]")}
          >
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button
            onClick={() => { setShowImport(true); setImportProgress(null); setImportGuideOpen(false); }}
            className={cn("px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all active:scale-95", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:text-white" : "border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e]")}
          >
            <Upload size={14} /> Import CSV
          </button>
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
            style={{ background: 'var(--accent-gradient)' }}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatsCard icon={<BarChart2 size={16} />} label="Total Catalog" value={stats.total.toString()} color="indigo" theme={theme} isLoading={isLoading} />
        <StatsCard icon={<Eye size={16} />} label="Active Storefront" value={stats.active.toString()} color="emerald" theme={theme} isLoading={isLoading} />
        <StatsCard icon={<Filter size={16} />} label="Filtered Results" value={filteredProducts.length.toString()} color="blue" theme={theme} isLoading={isLoading} />
        <StatsCard
          icon={<DollarSign size={16} />}
          label="Avg Price (Filtered)"
          value={filteredProducts.length ? `฿${Math.round(filteredProducts.reduce((s, p) => s + (p.price || 0), 0) / filteredProducts.length).toLocaleString()}` : '—'}
          color="amber"
          theme={theme}
          isLoading={isLoading}
        />
      </div>

      <div className={cn("p-4 rounded-3xl border mb-6 flex flex-col lg:flex-row gap-4", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={16} />
          <input type="text" placeholder={t.search_catalog || "Search name, brand, or family..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className={cn("w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none border focus:ring-2 focus:ring-accent/20", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white focus:border-accent" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e] focus:border-accent")} />
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
          {[
            { icon: <Filter size={14} />, val: brandFilter, set: setBrandFilter, opts: existingOptions.brands, label: t.all_brands || 'All Brands' },
            { icon: <Layers size={14} />, val: categoryFilter, set: setCategoryFilter, opts: existingOptions.categories, label: t.all_categories || 'All Categories' },
          ].map((f, i) => (
            <div key={i} className="relative min-w-[140px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none">{f.icon}</div>
              <select value={f.val} onChange={e => f.set(e.target.value)}
                className={cn("w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border cursor-pointer", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]")}>
                <option value="">{f.label}</option>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
            </div>
          ))}
          {/* Status filter */}
          <div className="relative min-w-[130px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none"><Eye size={14} /></div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'hidden')}
              className={cn("w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border cursor-pointer", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]",
                statusFilter !== 'all' ? "border-accent ring-1 ring-accent/20" : ""
              )}>
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
          </div>
          {/* Sort */}
          <div className="relative min-w-[140px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none"><ArrowUpDown size={14} /></div>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
              className={cn("w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border cursor-pointer", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]")}>
              <option value="newest">{t.sort_newest || 'Sort: Newest'}</option>
              <option value="name-az">{t.sort_az || 'Sort: A-Z'}</option>
              <option value="price-asc">{t.sort_price_asc || 'Sort: Price Low'}</option>
              <option value="price-desc">{t.sort_price_desc || 'Sort: Price High'}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
          </div>
          {/* Card size control — + larger cards (fewer cols), − smaller cards (more cols) */}
          <div className={cn("flex items-center gap-1 pl-3 border-l", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
            <button
              title="Smaller cards (more columns)"
              aria-label="Smaller cards (more columns)"
              onClick={() => { const n = Math.min(5, cardSize + 1); setCardSize(n); localStorage.setItem('catalogCardSize', String(n)); }}
              disabled={cardSize === 5}
              className={cn("w-8 h-8 rounded-xl border text-sm font-bold flex items-center justify-center transition-all active:scale-90 disabled:opacity-30", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e]" : "border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-[#f4f6f9]")}
            >−</button>
            <button
              title="Larger cards (fewer columns)"
              aria-label="Larger cards (fewer columns)"
              onClick={() => { const n = Math.max(1, cardSize - 1); setCardSize(n); localStorage.setItem('catalogCardSize', String(n)); }}
              disabled={cardSize === 1}
              className={cn("w-8 h-8 rounded-xl border text-sm font-bold flex items-center justify-center transition-all active:scale-90 disabled:opacity-30", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e]" : "border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-[#f4f6f9]")}
            >+</button>
          </div>

          {/* Pagination controls */}
          <div className={cn("flex items-center gap-2 pl-3 border-l", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
            {[25, 50, 100].map(n => (
              <button
                key={n}
                onClick={() => { setProductsPerPage(n); localStorage.setItem('catalogProductsPerPage', String(n)); setCurrentPage(1); }}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-bold border transition-all active:scale-90",
                  productsPerPage === n
                    ? "bg-accent text-white border-accent"
                    : theme === 'dark'
                    ? "border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e]"
                    : "border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-[#f4f6f9]"
                )}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => { setProductsPerPage(products.length); localStorage.setItem('catalogProductsPerPage', String(products.length)); setCurrentPage(1); }}
              className={cn(
                "px-2 py-1 rounded-lg text-xs font-bold border transition-all active:scale-90",
                productsPerPage > 100
                  ? "bg-accent text-white border-accent"
                  : theme === 'dark'
                  ? "border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e]"
                  : "border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-[#f4f6f9]"
              )}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl border px-4 py-3 flex items-center gap-3 shadow-2xl w-fit max-w-[90vw]",
          theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(selectedIds.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map(p => p._id)))}
              className="text-xs font-bold text-accent hover:underline"
            >
              {selectedIds.size === filteredProducts.length ? 'Deselect All' : `Select All (${filteredProducts.length})`}
            </button>
            <span className="text-xs text-[#8b92ad]">{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={selectedIds.size === 0 || isBulkActing} onClick={() => bulkSetVisibility(true)}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 disabled:opacity-40", theme === 'dark' ? "border-[#1f2335] text-emerald-400 hover:bg-emerald-500/10" : "border-[#e2e5ef] text-emerald-600 hover:bg-emerald-50")}>
              <Eye size={12} /> Show
            </button>
            <button disabled={selectedIds.size === 0 || isBulkActing} onClick={() => bulkSetVisibility(false)}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 disabled:opacity-40", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:bg-[#1a1d2e]" : "border-[#e2e5ef] text-[#8b92ad] hover:bg-[#f8f9fc]")}>
              <EyeOff size={12} /> Hide
            </button>
            {/* Fix 9: bulk set price */}
            {bulkPriceMode ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="number"
                  min="0.01"
                  step="any"
                  value={bulkPriceValue}
                  onChange={e => setBulkPriceValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') bulkSetPrice(parseFloat(bulkPriceValue));
                    if (e.key === 'Escape') { setBulkPriceMode(false); setBulkPriceValue(''); }
                  }}
                  placeholder="New price"
                  className={cn("w-24 border rounded-xl px-2 py-1.5 text-xs font-bold outline-none focus:border-accent", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]")}
                />
                <button
                  onClick={() => bulkSetPrice(parseFloat(bulkPriceValue))}
                  disabled={!bulkPriceValue || isNaN(parseFloat(bulkPriceValue)) || parseFloat(bulkPriceValue) <= 0}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: 'var(--accent-gradient)' }}
                >OK</button>
                <button onClick={() => { setBulkPriceMode(false); setBulkPriceValue(''); }} className="px-2 py-1.5 rounded-xl text-xs text-[#8b92ad] hover:text-red-400">✕</button>
              </div>
            ) : (
              <button disabled={selectedIds.size === 0 || isBulkActing} onClick={() => setBulkPriceMode(true)}
                className={cn("px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 disabled:opacity-40", theme === 'dark' ? "border-[#1f2335] text-blue-400 hover:bg-blue-500/10" : "border-[#e2e5ef] text-blue-600 hover:bg-blue-50")}>
                <DollarSign size={12} /> Set Price
              </button>
            )}
            <button disabled={selectedIds.size === 0 || isBulkActing} onClick={bulkDelete}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all active:scale-95 disabled:opacity-40">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Unsaved changes warning */}
      {Object.keys(pendingEdits).length > 0 && (
        <div
          role="alert"
          className={cn(
          "sticky top-4 z-40 rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 mb-4 shadow-lg",
          theme === 'dark' ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
            <span className={cn("text-xs font-bold", theme === 'dark' ? "text-amber-400" : "text-amber-600")}>
              {Object.keys(pendingEdits).length} unsaved change{Object.keys(pendingEdits).length !== 1 ? 's' : ''}
              {saveFailCount > 0 && <span className="ml-2 text-red-500">({saveFailCount} failed to save)</span>}
            </span>
            <span className="hidden sm:inline text-xs text-amber-500/80">— edits will be lost if you leave</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscardPending}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-500/10 transition-all border border-amber-500/30", theme === 'dark' ? "text-amber-400" : "text-amber-600")}
            >
              Discard
            </button>
            <button
              disabled={isSaving}
              onClick={handleSaveAllPending}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg disabled:opacity-50 transition-all"
              style={{ background: 'var(--accent-gradient)' }}
            >
              {isSaving ? 'Saving...' : `Save ${Object.keys(pendingEdits).length} change${Object.keys(pendingEdits).length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingView theme={theme} message="Loading Product Catalog..." />
      ) : (
        <>
        <div className={cn("grid gap-6", {
          1: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2',
          2: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
          3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
          5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
        }[cardSize] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
          {paginatedProducts.map((p, idx) => (
            <div key={p._id} className="animate-scale-in" style={{ animationDelay: `${idx * 45}ms` }}>
              <ProductCard product={p} theme={theme}
                onEdit={() => { setEditingProduct(p); setIsModalOpen(true); }}
                onCardClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                onDelete={() => { setDeleteConfirm(p._id); setDeletingName(p.name); }}
                onToggleVisibility={() => toggleVisibility(p)}
                onManageStock={() => setStockProduct(p)}
                hasPendingEdit={!!pendingEdits[p._id]}
                selected={selectedIds.has(p._id)}
                onSelect={() => toggleSelect(p._id)}
              />
            </div>
          ))}
          {products.length === 0 && !isLoading && (
            <div className="col-span-full flex flex-col items-center justify-center flex-1 gap-4 py-20 text-center px-6">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", theme === 'dark' ? "bg-[#1a1d2e]" : "bg-slate-100")}>
                <Package size={28} className="text-[#8b92ad] animate-pulse" />
              </div>
              <div>
                <p className={cn("text-sm font-semibold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>No products yet</p>
                <p className="text-xs mt-1 text-[#8b92ad]">Add your first product to start selling.</p>
              </div>
              <button
                onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
                style={{ background: 'var(--accent-gradient)' }}
              >
                <Plus size={14} /> Add first product
              </button>
            </div>
          )}
          {filteredProducts.length === 0 && products.length > 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
              <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center", theme === 'dark' ? "bg-[#1a1d2e]" : "bg-[#f8f9fc]")}><Search size={32} className="opacity-20" /></div>
              <div className="text-center">
                <p className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>No products match</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
              <button onClick={() => { setSearchTerm(''); setBrandFilter(''); setCategoryFilter(''); setStatusFilter('all'); setSortOrder('newest'); }} className="text-accent text-xs font-bold hover:underline">Clear filters</button>
            </div>
          )}

        </div>

        {/* Pagination controls */}
        {filteredProducts.length > 0 && (
          <div className={cn("mt-6 flex items-center justify-between px-4 py-3 rounded-xl border", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
            <div className={cn("text-xs font-semibold", theme === 'dark' ? "text-[#8b92ad]" : "text-slate-600")}>
              Showing {(currentPage - 1) * productsPerPage + 1}–{Math.min(currentPage * productsPerPage, filteredProducts.length)} of {filteredProducts.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-90 disabled:opacity-30", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:bg-[#1a1d2e]" : "border-[#e2e5ef] text-[#8b92ad] hover:bg-[#f4f6f9]")}
              >
                ← Prev
              </button>
              <div className={cn("text-xs font-semibold px-3 py-1.5", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-90 disabled:opacity-30", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:bg-[#1a1d2e]" : "border-[#e2e5ef] text-[#8b92ad] hover:bg-[#f4f6f9]")}
              >
                Next →
              </button>
            </div>
          </div>
        )}
        </>
      )}

      <ProductModal theme={theme} isOpen={isModalOpen}
        initialData={normalizedEditingProduct}
        onSave={handleSave} onClose={() => setIsModalOpen(false)} isSaving={isSaving}
        existingOptions={existingOptions} suggestedOptions={suggestedOptions}
        defaultTrackStock={defaultTrackStock}
        defaultSoldCurrency={merchantCurrencies.sold}
        defaultCostCurrency={merchantCurrencies.cost}
        onSaveAsDefault={(val) => { setDefaultTrackStock(val); localStorage.setItem('defaultTrackStock', String(val)); }}
        priceError={priceError} />

      {smMounted && stockProductRef.current && (
        <StockModal open={smVisible} product={stockProductRef.current} onClose={() => { setStockProduct(null); setStockError(''); }} onSave={handleStockSave} isSaving={isStockSaving} theme={theme} stockError={stockError} />
      )}

      {/* ── CSV Import modal ── */}
      {siMounted && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" data-state={siVisible ? 'open' : 'closed'}>
          <div data-state={siVisible ? 'open' : 'closed'} className={cn('modal-panel w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden', theme === 'dark' ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white')}>
            <div className={cn('flex items-center justify-between px-6 py-4 border-b', theme === 'dark' ? 'border-[#1f2335]' : 'border-slate-200')}>
              <p className={cn('text-sm font-semibold', theme === 'dark' ? 'text-white' : 'text-slate-900')}>Import Products from CSV</p>
              <button onClick={() => setShowImport(false)} className="text-[#8b92ad] hover:text-white transition-colors"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Guide toggle */}
              <button
                onClick={() => setImportGuideOpen(o => !o)}
                className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold border transition-colors', theme === 'dark' ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800')}
              >
                <span>CSV Format Guide</span>
                <ChevronDownIcon size={14} className={cn('transition-transform', importGuideOpen && 'rotate-180')} />
              </button>

              {importGuideOpen && (
                <div className={cn('rounded-xl p-4 space-y-3 text-xs', theme === 'dark' ? 'bg-[#0f1117]' : 'bg-slate-50')}>
                  <p className={cn('font-semibold', theme === 'dark' ? 'text-white' : 'text-slate-800')}>Required columns</p>
                  <div className="space-y-1 font-mono">
                    {[
                      { col: 'Name', note: 'Required. Product display name.' },
                      { col: 'Sold Price', note: 'Required. Selling price, number only, e.g. 299' },
                      { col: 'Sold Currency', note: 'Optional. e.g. THB, USD. Defaults to your local currency.' },
                      { col: 'Cost Price', note: 'Optional. Cost price for profit tracking.' },
                      { col: 'Cost Currency', note: 'Optional. e.g. KRW, USD. Defaults to your import currency.' },
                      { col: 'Description', note: 'Optional. Plain text description.' },
                      { col: 'Brand', note: 'Optional. Brand name.' },
                      { col: 'Model Line', note: 'Optional. Product line / sub-brand, e.g. Air Max' },
                      { col: 'Category', note: 'Optional. Semicolons for multiple: Bags;Fashion' },
                      { col: 'Colors', note: 'Optional. Semicolons for multiple: Black;White;Navy' },
                      { col: 'Track Stock', note: 'Optional. Yes or No. Defaults to No.' },
                      { col: 'Image URL', note: 'Optional. Semicolons for multiple image URLs.' },
                      { col: 'Active', note: 'Optional. Yes or No. Defaults to Yes.' },
                    ].map(({ col, note }) => (
                      <div key={col} className="flex gap-2">
                        <span className="text-accent w-28 flex-shrink-0">{col}</span>
                        <span className={theme === 'dark' ? 'text-[#8b92ad]' : 'text-slate-500'}>{note}</span>
                      </div>
                    ))}
                  </div>
                  <p className={cn('text-[10px]', theme === 'dark' ? 'text-[#8b92ad]' : 'text-slate-400')}>
                    Per-variant options (e.g. Size) cannot be imported — add them after import using the product editor.
                  </p>
                  <button
                    onClick={() => {
                      const template = '﻿Name,Description,Brand,Model Line,Category,Sold Price,Sold Currency,Cost Price,Cost Currency,Colors,Track Stock,Image URL,Active\nExample Bag,A stylish tote,MyBrand,Classic,Bags;Fashion,599,THB,300,KRW,Black;White;Navy,No,,Yes\n';
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(new Blob([template], { type: 'text/csv;charset=utf-8;' }));
                      a.download = 'product_import_template.csv'; a.click();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-accent border border-accent/30 hover:bg-accent/5 transition-colors"
                  >
                    <FileSpreadsheet size={12} /> Download template
                  </button>
                </div>
              )}

              {/* File picker */}
              {!importProgress && (
                <div
                  onClick={() => importFileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportCSV(f); }}
                  className={cn('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors', theme === 'dark' ? 'border-[#1f2335] hover:border-accent/50' : 'border-slate-200 hover:border-accent/50')}
                >
                  <Upload size={24} className="text-[#8b92ad] mx-auto mb-2" />
                  <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-white' : 'text-slate-700')}>Click to select your CSV file</p>
                  <p className="text-[11px] text-[#8b92ad] mt-1">or drag and drop</p>
                  <input ref={importFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); }} />
                </div>
              )}

              {/* Progress */}
              {importProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>
                      {importProgress.done < importProgress.total ? `Importing… ${importProgress.done} / ${importProgress.total}` : `Done — ${importProgress.total - importProgress.errors.length} imported, ${importProgress.errors.length} errors`}
                    </span>
                  </div>
                  <div className={cn('w-full rounded-full h-2', theme === 'dark' ? 'bg-[#1f2335]' : 'bg-slate-100')}>
                    <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }} />
                  </div>
                  {importProgress.errors.length > 0 && (
                    <div className={cn('rounded-xl p-3 space-y-1 max-h-32 overflow-y-auto', theme === 'dark' ? 'bg-[#0f1117]' : 'bg-red-50')}>
                      {importProgress.errors.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px]">
                          <AlertCircle size={11} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <span className={theme === 'dark' ? 'text-red-300' : 'text-red-700'}>{e}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {importProgress.done === importProgress.total && importProgress.errors.length === 0 && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs">
                      <CheckCircle size={14} /> All products imported successfully.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={cn('px-6 py-4 border-t', theme === 'dark' ? 'border-[#1f2335]' : 'border-slate-200')}>
              {importProgress?.done === importProgress?.total ? (
                <button onClick={() => setShowImport(false)} className="w-full py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ background: 'var(--accent-gradient)' }}>Done</button>
              ) : (
                <button onClick={() => setShowImport(false)} className={cn('w-full py-2 rounded-xl text-sm border transition-colors', theme === 'dark' ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500')}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      {dcMounted && (
        <div
          className="modal-overlay fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
          data-state={dcVisible ? 'open' : 'closed'}
          onClick={(e) => { if (e.target === e.currentTarget) { setDeleteConfirm(null); setDeletingName(''); } }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            data-state={dcVisible ? 'open' : 'closed'}
            className={cn("modal-panel rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}
          >
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
            <h3 id="delete-confirm-title" className={cn("text-xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Delete &ldquo;{deletingName}&rdquo;?</h3>
            <p className="text-sm text-[#8b92ad] mb-6">This will remove it from the catalog permanently.</p>
            {deleteError && <p role="alert" className="text-xs text-red-500 mb-4">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirm(null); setDeletingName(''); setDeleteError(''); }} disabled={isDeleting} className={cn("flex-1 py-3 text-sm font-bold rounded-xl", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f4f6f9] text-[#8b92ad]")}>Cancel</button>
              <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={isDeleting} className="flex-1 py-3 text-sm font-bold bg-red-500 text-white rounded-xl disabled:opacity-50">{isDeleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {bdMounted && (
        <div
          className="modal-overlay fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
          data-state={bdVisible ? 'open' : 'closed'}
          onClick={(e) => { if (e.target === e.currentTarget) setBulkDeleteConfirmOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-confirm-title"
            data-state={bdVisible ? 'open' : 'closed'}
            className={cn("modal-panel rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}
          >
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
            <h3 id="bulk-delete-confirm-title" className={cn("text-xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Delete {selectedIds.size} Product{selectedIds.size !== 1 ? 's' : ''}?</h3>
            <p className="text-sm text-[#8b92ad] mb-6">This will permanently remove all selected products from the catalog.</p>
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteConfirmOpen(false)} className={cn("flex-1 py-3 text-sm font-bold rounded-xl", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f4f6f9] text-[#8b92ad]")}>Cancel</button>
              <button onClick={executeBulkDelete} className="flex-1 py-3 text-sm font-bold bg-red-500 text-white rounded-xl">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function ProductCard({ product, theme, onEdit, onCardClick, onDelete, onToggleVisibility, onManageStock, hasPendingEdit, selected, onSelect }: any) {
  const displayImage = product.images?.[0] || product.imageUrl;
  const totalStock = product.trackStock
    ? (product.variants?.reduce((s: number, v: any) => s + (v.stock ?? 0), 0) ?? 0)
    : null;

  return (
    <div
      onClick={onCardClick}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(); } }}
      className={cn(
        "rounded-[32px] border p-5 shadow-sm hover:shadow-xl transition-all hover-lift group relative overflow-hidden flex flex-col h-full cursor-pointer",
        theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]",
        !product.isActive && "opacity-60",
        selected && "ring-2 ring-accent border-accent/40"
      )}
    >
      <div className={cn("relative aspect-[4/3] rounded-3xl overflow-hidden mb-5 border", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-[#f4f6f9] border-[#e2e5ef]")}>
        {displayImage ? (
          <img src={displayImage} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#8b92ad]"><ImageIcon size={32} strokeWidth={1.5} /></div>
        )}

        {/* Always-visible select circle */}
        <button
          onClick={e => { e.stopPropagation(); onSelect?.(); }}
          className={cn(
            "absolute top-3 left-3 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm transition-all",
            selected
              ? "bg-accent border-accent"
              : "bg-white/60 border-white/40 hover:bg-white/90 hover:border-accent"
          )}
        >
          {selected && <Check size={12} className="text-white" />}
        </button>

        <button onClick={e => { e.stopPropagation(); onToggleVisibility(); }}
          className={cn("absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90", product.isActive ? "bg-white text-accent" : "bg-[#1a1d2e] text-[#8b92ad]")}>
          {product.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        {!product.isActive && (
          <span className="absolute bottom-3 left-3 bg-[#1a1d2e] text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><EyeOff size={8} /> HIDDEN</span>
        )}

        {/* Photo count badge */}
        {product.images?.length > 1 && product.isActive && (
          <div className="absolute bottom-3 left-3 bg-[#1a1d2e]/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            {product.images.length} photos
          </div>
        )}
        {/* Stock badge */}
        {totalStock !== null && (
          <div className={cn(
            "absolute bottom-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full backdrop-blur-sm",
            totalStock === 0 ? "bg-red-500/80 text-white" : totalStock <= LOW_STOCK_THRESHOLD ? "bg-amber-500/80 text-white" : "bg-[#1a1d2e]/70 text-white"
          )}>
            {totalStock === 0 ? 'OUT' : `${totalStock} left`}
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="text-[10px] font-black text-accent uppercase tracking-wider truncate flex-1">
            {[product.brand, product.modelLine].filter(Boolean).join(' • ') || <span className="text-[#8b92ad] font-normal normal-case">No brand</span>}
          </div>
          {hasPendingEdit && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/50 text-amber-500 text-[8px] font-black uppercase tracking-wider">Unsaved</span>
          )}
        </div>
        <h3 className={cn("font-bold text-base mb-1", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{product.name}</h3>
        {product.isQuickAdd && (
          <div className="flex items-center gap-1 mb-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 w-fit">
            <AlertCircle size={9} className="text-amber-500 flex-shrink-0" />
            <span className={cn("text-[8px] font-black uppercase tracking-wide", theme === 'dark' ? "text-amber-400" : "text-amber-600")}>Incomplete · add more info</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.categories?.slice(0, 2).map((c: string) => (
            <span key={c} className={cn("px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f4f6f9] text-[#8b92ad]")}>{c}</span>
          ))}
          {product.categories?.length > 2 && <span className="text-[8px] font-bold text-[#8b92ad]">+{product.categories.length - 2}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className={cn("text-lg font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>฿{product.price?.toLocaleString()}</div>
          {product.variants?.length > 0 && (
            <span className="text-[9px] font-bold text-[#8b92ad]">{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className={cn("flex gap-2 mt-5 pt-5 border-t", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className={cn("flex-1 py-3 rounded-2xl text-[10px] font-black active:scale-95 flex items-center justify-center gap-2", theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#2d324d]" : "bg-[#f4f6f9] text-[#1a1d2e] hover:bg-[#e2e5ef]")}>
          <Edit2 size={12} /> EDIT
        </button>
        {product.trackStock && (
          <button onClick={e => { e.stopPropagation(); onManageStock(); }} className={cn("py-3 px-3 rounded-2xl text-[10px] font-black active:scale-95 flex items-center justify-center gap-1.5", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad] hover:bg-[#2d324d]" : "bg-[#f4f6f9] text-[#8b92ad] hover:bg-[#e2e5ef]")} title="Manage Stock">
            <Layers size={12} /> STOCK
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className={cn("p-3 rounded-2xl active:scale-95 flex items-center justify-center", theme === 'dark' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100")}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color, theme, isLoading }: any) {
  const colorMap: any = { emerald: "text-emerald-500 bg-emerald-500/10", amber: "text-amber-500 bg-amber-500/10", blue: "text-blue-500 bg-blue-500/10", indigo: "text-indigo-500 bg-indigo-500/10", rose: "text-rose-500 bg-rose-500/10" };
  return (
    <div className={cn("px-3 py-2.5 rounded-2xl border shadow-sm flex flex-col gap-1", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
      <div className="text-[#8b92ad] text-[10px] font-bold uppercase tracking-wider truncate">{label}</div>
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", colorMap[color])}>{icon}</div>
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-t-transparent border-accent rounded-full animate-spin" />
        ) : (
          <div className={cn("text-lg font-black leading-none", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{value}</div>
        )}
      </div>
    </div>
  );
}

export default ProductManagement;

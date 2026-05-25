import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  ArrowUpDown,
  Eye,
  EyeOff,
  BarChart2,
  FileSpreadsheet,
  Upload,
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
  categories: string[];
  imageUrl?: string;
  images?: string[];
  options?: ProductOption[];
  variants: any[];
  isActive: boolean;
  trackStock?: boolean;
}

export interface ProductForm {
  name: string;
  brand: string;
  modelLine: string;
  description: string;
  price: string;
  categories: string[];
  images: string[];
  options: ProductOption[];
  variants: ProductVariant[];
  isActive: boolean;
  trackStock: boolean;
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

  if (raw.options?.length) {
    return {
      name: raw.name || '', brand: raw.brand || '', modelLine: raw.modelLine || '',
      description: raw.description || '', price: String(raw.price || ''),
      categories: raw.categories || [],
      images,
      options: raw.options,
      variants: (raw.variants || []).map((v: any) => ({
        combination: v.combination || {},
        imageUrl: v.imageUrl || '',
        price: v.price != null ? String(v.price) : '',
        cost: v.cost != null ? String(v.cost) : '',
        stock: String(v.stock ?? 0),
      })),
      isActive: raw.isActive !== false,
      trackStock: !!raw.trackStock,
    };
  }

  // Legacy variantName/colors → convert to option groups
  const oldVariants = raw.variants || [];
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
    name: raw.name || '', brand: raw.brand || '', modelLine: raw.modelLine || '',
    description: raw.description || '', price: String(raw.price || ''),
    categories: raw.categories || [], images, options: optGroups, variants: newVariants,
    isActive: raw.isActive !== false,
    trackStock: !!raw.trackStock,
  };
}

const EMPTY_FORM: ProductForm = {
  name: '', brand: '', modelLine: '', description: '',
  price: '', categories: [], images: [], options: [], variants: [],
  isActive: true,
  trackStock: false,
};

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
      <div
        className={cn("w-full border rounded-xl px-4 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between",
          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]",
          "focus-within:border-accent focus-within:ring-1 focus-within:ring-accent")}
        onClick={() => setIsOpen(true)}
      >
        <span className={value ? (theme === 'dark' ? "text-white font-medium" : "text-[#1a1d2e] font-medium") : "text-[#8b92ad]"}>{value || placeholder}</span>
        <ChevronDown size={14} className="text-[#8b92ad]" />
      </div>
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
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map(opt => (
              <button key={opt} className={cn("w-full text-left px-3 py-2 text-sm rounded-lg transition-colors", theme === 'dark' ? "text-white hover:bg-[#2d324d]" : "text-[#1a1d2e] hover:bg-[#f4f6f9]")}
                onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}>{opt}</button>
            ))}
            {showCreate && (
              <button className={cn("w-full text-left px-3 py-2 text-sm rounded-lg font-bold flex items-center gap-2", theme === 'dark' ? "text-accent hover:bg-accent/[7%]" : "text-accent hover:bg-accent/[3%]")}
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

  return (
    <div ref={wrapperRef}>
      {label && <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">{label} {required && <span className="text-red-500">*</span>}</label>}
      <div className={cn("w-full border rounded-xl px-2 py-2 flex flex-wrap gap-2", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
        {selected.map(c => (
          <div key={c} className={cn("flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-xs font-bold", theme === 'dark' ? "bg-[#161925] text-white" : "bg-[#f4f6f9] text-[#1a1d2e]")}>
            {isHex(c) && <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c }} />}
            {c}
            <button onClick={() => onRemove(c)} className="hover:text-red-400 opacity-70 hover:opacity-100"><X size={10} /></button>
          </div>
        ))}
        <div className="relative flex-1 min-w-[150px]">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onFocus={() => setIsOpen(true)}
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
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
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
          <div key={i} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-[#e2e5ef] dark:border-[#1f2335] flex-shrink-0">
            <img src={img} className="w-full h-full object-cover" alt="" />
            {i === 0 && (
              <div className="absolute bottom-0 left-0 right-0 text-white text-[8px] font-black text-center py-0.5 uppercase tracking-wider" style={{ background: 'var(--accent-gradient)' }}>
                Primary
              </div>
            )}
            <button
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center shadow-lg z-10"
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

// --- OptionCard ---

function OptionCard({ option, index, existingOptions, onUpdate, onRemove, theme }: {
  option: ProductOption; index: number;
  existingOptions: { optionNames: string[]; optionValues: string[] };
  onUpdate: (updates: Partial<ProductOption>) => void; onRemove: () => void; theme: 'light' | 'dark';
}) {
  return (
    <div className={cn("border rounded-2xl p-4 relative animate-in slide-in-from-right-4 transition-colors", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-[#f8f9fc] border-[#e2e5ef]")}>
      <button onClick={onRemove} className={cn("absolute -top-2 -right-2 border text-red-400 p-1 rounded-full shadow-sm hover:text-red-600 z-50", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
        <Trash2 size={12} />
      </button>
      <div className="mb-3 relative z-[20]">
        <CreatableDropdown label={`Option ${index + 1}`} value={option.name} onChange={name => onUpdate({ name })}
          options={existingOptions.optionNames} placeholder="e.g. Color, Size, Material" theme={theme} />
      </div>
      <TagSelector label="Values" selected={option.values}
        onAdd={v => !option.values.includes(v) && onUpdate({ values: [...option.values, v] })}
        onRemove={v => onUpdate({ values: option.values.filter(x => x !== v) })}
        options={existingOptions.optionValues.filter(v => !option.values.includes(v))}
        placeholder="Add value..." theme={theme} />
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
  existingOptions, suggestedOptions, theme = 'light', quickOrderMode = false,
}: {
  isOpen: boolean; initialData: ProductForm | null;
  onSave: (data: ProductForm) => void; onClose: () => void; isSaving: boolean;
  existingOptions: { brands: string[], modelLines: string[], categories: string[], optionNames: string[], optionValues: string[] };
  suggestedOptions?: ProductOption[]; theme?: 'light' | 'dark'; quickOrderMode?: boolean;
}) {
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultCost, setDefaultCost] = useState('');
  const [imagePickerRow, setImagePickerRow] = useState<number | null>(null);
  const prevIdRef = useRef<string | null>(null);
  const prevOptionsRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      if (!initialData) {
        const initOpts = suggestedOptions ?? [];
        const initVariants = cartesian(initOpts).map(combo => ({ combination: combo, imageUrl: '', price: '', cost: '', stock: '0' }));
        setForm({ ...EMPTY_FORM, options: initOpts, variants: initVariants });
        prevOptionsRef.current = JSON.stringify(initOpts);
        prevIdRef.current = null;
        setDefaultPrice(''); setDefaultCost('');
      } else {
        const currentId = (initialData as any)?._id;
        if (currentId !== prevIdRef.current) {
          setForm(initialData);
          prevOptionsRef.current = JSON.stringify(initialData.options || []);
          prevIdRef.current = currentId;
        }
      }
    } else {
      prevIdRef.current = null; prevOptionsRef.current = '';
    }
  }, [isOpen, initialData]);

  // Sync variants from options changes
  useEffect(() => {
    const json = JSON.stringify(form.options);
    if (json === prevOptionsRef.current) return;
    prevOptionsRef.current = json;
    const combinations = cartesian(form.options);
    const existingMap = new Map<string, ProductVariant>();
    form.variants.forEach(v => existingMap.set(JSON.stringify(v.combination), v));
    const newVariants = combinations.map(combo => {
      const key = JSON.stringify(combo);
      return existingMap.get(key) || { combination: combo, imageUrl: '', price: defaultPrice, cost: defaultCost, stock: '0' };
    });
    setForm(prev => ({ ...prev, variants: newVariants }));
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

  if (!isOpen) return null;

  const updateForm = (updates: Partial<ProductForm>) => setForm(prev => ({ ...prev, ...updates }));
  const addOption = () => { if (form.options.length >= 3) return; updateForm({ options: [...form.options, { name: '', values: [] }] }); };
  const removeOption = (i: number) => updateForm({ options: form.options.filter((_, idx) => idx !== i) });
  const updateOption = (i: number, updates: Partial<ProductOption>) => { const next = [...form.options]; next[i] = { ...next[i], ...updates }; updateForm({ options: next }); };
  const updateVariant = (i: number, field: keyof ProductVariant, value: string) => { const next = [...form.variants]; next[i] = { ...next[i], [field]: value }; updateForm({ variants: next }); };

  const activeOptions = form.options.filter(o => o.name && o.values.length > 0);
  const isValid = quickOrderMode ? form.name.trim() !== '' : form.name.trim() !== '' && form.brand.trim() !== '';

  return (
    <div 
      className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn("w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}>
        {/* Header */}
        <div className={cn("flex items-center justify-between px-8 pt-8 pb-4 border-b", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <div>
            <h3 className={cn("text-xl font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{initialData ? 'Edit Product' : 'Catalog New Product'}</h3>
            <p className="text-xs text-[#8b92ad]">{quickOrderMode ? 'Fill what you need now — manage stock and photos later' : 'Options auto-generate variant combinations'}</p>
          </div>
          <button onClick={onClose} className={cn("w-8 h-8 flex items-center justify-center rounded-full", theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#2d324d]" : "bg-[#f4f6f9] hover:bg-[#e2e5ef]")}><X size={16} /></button>
        </div>

        <div className="px-8 py-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-5">
            <MultiImageUploader images={form.images} onChange={imgs => updateForm({ images: imgs })} theme={theme} />

            <div className="grid grid-cols-2 gap-4">
              <div className="relative z-[100]">
                <CreatableDropdown label="Brand" value={form.brand} onChange={v => updateForm({ brand: v })} options={existingOptions.brands} placeholder="e.g. Nike" theme={theme} required={true} />
              </div>
              <div className="relative z-[90]">
                <CreatableDropdown label="Model Line" value={form.modelLine} onChange={v => updateForm({ modelLine: v })} options={existingOptions.modelLines} placeholder="e.g. Air Max" theme={theme} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Display Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => updateForm({ name: e.target.value })} placeholder="e.g. Classic Tee"
                className={cn("w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]")} />
            </div>

            {/* Base Price + Base Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Base Price (THB)</label>
                <input type="number" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} placeholder="Inherited by variants"
                  className={cn("w-full border rounded-xl px-3 py-2.5 text-sm font-bold text-accent outline-none focus:border-accent", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Base Cost</label>
                <input type="number" value={defaultCost} onChange={e => setDefaultCost(e.target.value)} placeholder="Inherited by variants"
                  className={cn("w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent", theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]")} />
              </div>
            </div>

            <TagSelector label="Categories" selected={form.categories}
              onAdd={c => !form.categories.includes(c) && updateForm({ categories: [...form.categories, c] })}
              onRemove={c => updateForm({ categories: form.categories.filter(x => x !== c) })}
              options={existingOptions.categories} placeholder="Search or add category..." theme={theme} />

            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={e => updateForm({ description: e.target.value })} rows={3}
                className={cn("w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent resize-none", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]")} />
            </div>

            <div className={cn("flex items-center justify-between border rounded-xl px-4 py-3.5", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
              <div>
                <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-0.5 block">Track stock</label>
                <p className="text-[9.5px] text-[#8b92ad]">Enable stock count tracking and low/out-of-stock alerts for this product</p>
              </div>
              <button
                type="button"
                onClick={() => updateForm({ trackStock: !form.trackStock })}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
                  form.trackStock ? "bg-accent" : (theme === 'dark' ? "bg-[#2a2f45]" : "bg-slate-300")
                )}
              >
                <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", form.trackStock && "translate-x-5")} />
              </button>
            </div>
          </div>

          {/* Right Column: Options & Variants */}
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">Product Options</label>
                <p className="text-[9px] text-[#8b92ad] mt-0.5">Max 3 · variants auto-generated</p>
              </div>
              <button onClick={addOption} disabled={form.options.length >= 3}
                className="text-accent text-[10px] font-bold flex items-center gap-1 hover:underline disabled:opacity-30 disabled:no-underline">
                <Plus size={14} /> Add Option
              </button>
            </div>

            {form.options.length === 0 && (
              <div className={cn("rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors", theme === 'dark' ? "border-[#1f2335] hover:border-accent/40" : "border-[#e2e5ef] hover:border-accent/40")} onClick={addOption}>
                <Plus size={18} className="mx-auto mb-1 opacity-30" />
                <p className="text-xs font-bold text-[#8b92ad]">Add an option</p>
                <p className="text-[10px] text-[#8b92ad] mt-0.5">e.g. Color, Size, Material, Thickness</p>
              </div>
            )}

            <div className="space-y-3">
              {form.options.map((opt, idx) => (
                <div key={idx} style={{ zIndex: (form.options.length - idx) * 10 + 10, position: 'relative' }}>
                  <OptionCard option={opt} index={idx} existingOptions={existingOptions}
                    onUpdate={updates => updateOption(idx, updates)} onRemove={() => removeOption(idx)} theme={theme} />
                </div>
              ))}
            </div>

            {/* Variant Table */}
            {activeOptions.length > 0 && form.variants.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">Variants ({form.variants.length})</label>
                  {form.images.length > 0 && <span className="text-[9px] text-[#8b92ad]">Click photo icon to assign image per variant</span>}
                </div>
                <div className={cn("rounded-2xl border overflow-hidden", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full min-w-[360px]">
                      <thead className="sticky top-0">
                        <tr className={cn("text-[9px] font-bold uppercase tracking-wider border-b", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-[#8b92ad]" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#8b92ad]")}>
                          {activeOptions.map(o => <th key={o.name} className="px-3 py-2 text-left whitespace-nowrap">{o.name}</th>)}
                          {form.images.length > 0 && <th className="px-2 py-2 text-left">Photo</th>}
                          <th className="px-2 py-2 text-left">Price</th>
                          <th className="px-2 py-2 text-left">Cost</th>
                        </tr>
                      </thead>
                      <tbody className={cn("divide-y", theme === 'dark' ? "divide-[#1f2335]" : "divide-[#f4f6f9]")}>
                        {form.variants.map((v, idx) => (
                          <tr key={idx} className={cn("transition-colors", theme === 'dark' ? "hover:bg-[#1a1d2e]" : "hover:bg-[#fafbfc]")}>
                            {activeOptions.map(o => (
                              <td key={o.name} className={cn("px-3 py-1.5 text-xs font-bold whitespace-nowrap", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
                                {v.combination[o.name] || '—'}
                              </td>
                            ))}
                            {/* Photo picker */}
                            {form.images.length > 0 && (
                              <td className="px-1.5 py-1">
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => setImagePickerRow(imagePickerRow === idx ? null : idx)}
                                    className={cn("w-8 h-8 rounded-lg border overflow-hidden flex items-center justify-center transition-colors",
                                      v.imageUrl ? "border-accent" : (theme === 'dark' ? "border-[#1f2335] border-dashed" : "border-dashed border-[#e2e5ef]")
                                    )}
                                  >
                                    {v.imageUrl
                                      ? <img src={v.imageUrl} className="w-full h-full object-cover" alt="" />
                                      : <ImageIcon size={12} className="text-[#8b92ad]" />
                                    }
                                  </button>
                                  {imagePickerRow === idx && (
                                    <div className={cn("absolute left-0 top-10 z-[60] border rounded-xl shadow-xl p-2 flex gap-1.5 flex-wrap", theme === 'dark' ? "bg-[#1f2335] border-[#2d324d]" : "bg-white border-[#e2e5ef]")} style={{ minWidth: 112 }}>
                                      <button onClick={() => { updateVariant(idx, 'imageUrl', ''); setImagePickerRow(null); }}
                                        className={cn("w-8 h-8 rounded-lg border-dashed border flex items-center justify-center text-[#8b92ad] hover:border-red-400 hover:text-red-400", theme === 'dark' ? "border-[#2d324d]" : "border-[#e2e5ef]")}>
                                        <X size={10} />
                                      </button>
                                      {form.images.map((img, imgIdx) => (
                                        <button key={imgIdx} onClick={() => { updateVariant(idx, 'imageUrl', img); setImagePickerRow(null); }}
                                          className={cn("w-8 h-8 rounded-lg border-2 overflow-hidden transition-all", v.imageUrl === img ? "border-accent scale-110" : "border-transparent hover:border-[#8b92ad]")}>
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
                                placeholder={defaultPrice || '—'}
                                className={cn("w-20 border rounded-lg px-2 py-1 text-xs font-bold text-accent outline-none focus:border-accent", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")} />
                            </td>
                            <td className="px-1.5 py-1">
                              <input type="number" value={v.cost} onChange={e => updateVariant(idx, 'cost', e.target.value)}
                                placeholder={defaultCost || '—'}
                                className={cn("w-20 border rounded-lg px-2 py-1 text-xs outline-none focus:border-accent", theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]")} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-[10px] text-[#8b92ad] mt-1.5">Stock is managed from the catalog after saving.</p>
              </div>
            )}

            {form.options.length > 0 && activeOptions.length === 0 && (
              <div className={cn("rounded-2xl p-4 text-center", theme === 'dark' ? "bg-[#1a1d2e]" : "bg-[#f8f9fc]")}>
                <p className="text-xs text-[#8b92ad]">Set a name and at least one value for each option to generate variants.</p>
              </div>
            )}

            {form.options.length === 0 && (
              <div className={cn("rounded-2xl p-4 text-center border border-dashed", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
                <p className="text-xs text-[#8b92ad] font-medium">Simple product</p>
                <p className="text-[10px] text-[#8b92ad] mt-0.5">Base price applies · no variant selection for customers</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={cn("p-8 pt-4 border-t flex gap-3", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <button onClick={onClose} className={cn("flex-1 py-4 text-sm font-bold rounded-2xl", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad] hover:bg-[#2d324d]" : "bg-[#f8f9fc] text-[#8b92ad] hover:bg-[#e2e5ef]")}>Cancel</button>
          <button disabled={!isValid || isSaving} onClick={() => onSave(form)}
            className="flex-1 py-4 text-sm font-bold text-white rounded-2xl shadow-lg hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--accent-gradient)' }}>
            {isSaving ? 'Processing...' : quickOrderMode ? 'Save & Select' : initialData ? 'Update Catalog' : 'Catalog Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- StockModal ---

function StockModal({ product, onClose, onSave, isSaving, theme }: {
  product: Product; onClose: () => void;
  onSave: (updatedVariants: any[]) => void;
  isSaving: boolean; theme?: 'light' | 'dark';
}) {
  const [stocks, setStocks] = useState<Record<number, string>>({});

  useEffect(() => {
    const init: Record<number, string> = {};
    product.variants.forEach((v, i) => { init[i] = String(v.stock ?? 0); });
    setStocks(init);
  }, [product]);

  function variantLabel(v: any) {
    if (v.combination && Object.keys(v.combination).length > 0) return Object.values(v.combination).join(' / ');
    return [v.variantName, v.colors?.[0]].filter(Boolean).join(' — ') || 'Default';
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn("w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}>
        <div className={cn("flex items-center justify-between px-8 pt-8 pb-4 border-b", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <div>
            <h3 className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Manage Stock</h3>
            <p className="text-xs text-[#8b92ad] truncate max-w-[220px]">{product.name}</p>
          </div>
          <button onClick={onClose} className={cn("w-8 h-8 flex items-center justify-center rounded-full", theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#2d324d]" : "bg-[#f4f6f9] hover:bg-[#e2e5ef]")}><X size={16} /></button>
        </div>

        <div className="px-8 py-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {product.variants.length === 0 ? (
            <p className="text-sm text-[#8b92ad] text-center py-6">No variants defined. Add options to the product first.</p>
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

        <div className={cn("px-8 pb-8 pt-4 border-t flex gap-3", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <button onClick={onClose} className={cn("flex-1 py-3 text-sm font-bold rounded-2xl", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f8f9fc] text-[#8b92ad]")}>Cancel</button>
          <button disabled={isSaving} onClick={() => onSave(product.variants.map((v, i) => ({ ...v, stock: parseInt(stocks[i] ?? '0') || 0 })))}
            className="flex-1 py-3 text-sm font-bold text-white rounded-2xl shadow-lg disabled:opacity-40"
            style={{ background: 'var(--accent-gradient)' }}>
            {isSaving ? 'Saving...' : 'Save Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main ProductManagement Hub ---

const ProductManagement = React.memo(function ProductManagement({ theme, t, onLimitHit }: { theme?: 'light' | 'dark', t: any, onLimitHit?: (feature: string, limit?: number, current?: number) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importGuideOpen, setImportGuideOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; errors: string[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [isStockSaving, setIsStockSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const secret = typeof window !== 'undefined' ? localStorage.getItem('admin_secret') || '' : '';

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products', { headers: { 'x-admin-secret': secret } });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
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
      return matchesSearch && (!brandFilter || p.brand === brandFilter) && (!categoryFilter || p.categories.includes(categoryFilter));
    });
    result.sort((a, b) => {
      if (sortOrder === 'newest') return -1;
      if (sortOrder === 'price-asc') return a.price - b.price;
      if (sortOrder === 'price-desc') return b.price - a.price;
      if (sortOrder === 'name-az') return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [products, searchTerm, brandFilter, categoryFilter, sortOrder]);

  const stats = useMemo(() => ({ total: products.length, active: products.filter(p => p.isActive).length }), [products]);

  const handleSave = async (form: ProductForm) => {
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price as any) || 0,
        imageUrl: form.images[0] || '',
        images: form.images,
        options: form.options,
        variants: form.variants.map(v => ({
          combination: v.combination,
          imageUrl: v.imageUrl || '',
          price: v.price !== '' ? parseFloat(v.price) : null,
          cost: v.cost !== '' ? parseFloat(v.cost) : null,
          stock: parseInt(v.stock as any) || 0,
        })),
      };
      const res = await fetch(editingProduct ? `/api/products/${editingProduct._id}` : '/api/products', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(payload),
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
      else alert('Stock save failed');
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = col(row, 'name');
      const priceStr = col(row, 'price');
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));

      if (!name) { errors.push(`Row ${i + 2}: missing name`); setImportProgress({ done: i + 1, total: rows.length, errors: [...errors] }); continue; }
      if (isNaN(price)) { errors.push(`Row ${i + 2}: invalid price "${priceStr}"`); setImportProgress({ done: i + 1, total: rows.length, errors: [...errors] }); continue; }

      const body: any = {
        name,
        price,
        description: col(row, 'description') || col(row, 'desc'),
        brand: col(row, 'brand'),
        categories: col(row, 'categor') ? col(row, 'categor').split(';').map((c: string) => c.trim()).filter(Boolean) : [],
        isActive: col(row, 'active').toLowerCase() !== 'no',
      };

      try {
        const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          errors.push(`Row ${i + 2} "${name}": ${d.error ?? 'failed'}`);
        }
      } catch {
        errors.push(`Row ${i + 2} "${name}": network error`);
      }
      setImportProgress({ done: i + 1, total: rows.length, errors: [...errors] });
    }

    loadProducts();
  };

  const toggleVisibility = async (p: Product) => {
    try {
      await fetch(`/api/products/${p._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret }, body: JSON.stringify({ isActive: !p.isActive }) });
      loadProducts();
    } catch (err) { console.error(err); }
  };

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
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              const bom = '﻿';
              const header = 'Name,Description,Brand,Category,Price (THB),Active\n';
              const rows = filteredProducts.map(p =>
                [p.name, p.description ?? '', p.brand, (p.categories || []).join(';'), p.price, p.isActive ? 'Yes' : 'No']
                  .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
              ).join('\n');
              const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
              a.download = `products_${new Date().toISOString().slice(0,10)}.csv`; a.click();
            }}
            className={cn("px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all active:scale-95", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:text-white" : "border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e]")}
            title="Export products as CSV"
          >
            <FileSpreadsheet size={16} />
          </button>
          <button
            onClick={() => { setShowImport(true); setImportProgress(null); setImportGuideOpen(false); }}
            className={cn("px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all active:scale-95", theme === 'dark' ? "border-[#1f2335] text-[#8b92ad] hover:text-white" : "border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e]")}
            title="Import products from CSV"
          >
            <Upload size={16} />
          </button>
          <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex-1 md:flex-none text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
            style={{ background: 'var(--accent-gradient)' }}>
            <Plus size={18} /> {t.add_catalog || 'Add New Catalog'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatsCard icon={<BarChart2 size={20} />} label={t.total_catalog || "Total Catalog"} value={stats.total.toString()} color="indigo" theme={theme} isLoading={isLoading} />
        <StatsCard icon={<Eye size={20} />} label={t.active_storefront || "Active Storefront"} value={stats.active.toString()} color="emerald" theme={theme} isLoading={isLoading} />
      </div>

      <div className={cn("p-4 rounded-3xl border mb-6 flex flex-col lg:flex-row gap-4", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={16} />
          <input type="text" placeholder={t.search_catalog || "Search name, brand, or family..."} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className={cn("w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none border focus:ring-2 focus:ring-accent/20", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white focus:border-accent" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e] focus:border-accent")} />
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-3">
          {[
            { icon: <Filter size={14} />, val: brandFilter, set: setBrandFilter, opts: existingOptions.brands, label: t.all_brands || 'All Brands' },
            { icon: <Layers size={14} />, val: categoryFilter, set: setCategoryFilter, opts: existingOptions.categories, label: t.all_categories || 'All Categories' },
            { icon: <ArrowUpDown size={14} />, val: sortOrder, set: setSortOrder, opts: [], label: '' },
          ].map((f, i) => (
            <div key={i} className="relative min-w-[140px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none">{f.icon}</div>
              <select value={f.val} onChange={e => f.set(e.target.value)}
                className={cn("w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border cursor-pointer", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]")}>
                {i === 2 ? (
                  <>
                    <option value="newest">{t.sort_newest || 'Sort: Newest'}</option>
                    <option value="name-az">{t.sort_az || 'Sort: A-Z'}</option>
                    <option value="price-asc">{t.sort_price_asc || 'Sort: Price Low'}</option>
                    <option value="price-desc">{t.sort_price_desc || 'Sort: Price High'}</option>
                  </>
                ) : (
                  <>
                    <option value="">{f.label}</option>
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </>
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingView theme={theme} message="Loading Product Catalog..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(p => (
            <ProductCard key={p._id} product={p} theme={theme}
              onEdit={() => { setEditingProduct(p); setIsModalOpen(true); }}
              onDelete={() => setDeleteConfirm(p._id)}
              onToggleVisibility={() => toggleVisibility(p)}
              onManageStock={() => setStockProduct(p)} />
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
              <div className="w-16 h-16 bg-[#f8f9fc] rounded-3xl flex items-center justify-center"><Search size={32} className="opacity-20" /></div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#1a1d2e] dark:text-white">No products found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
              <button onClick={() => { setSearchTerm(''); setBrandFilter(''); setCategoryFilter(''); setSortOrder('newest'); }} className="text-accent text-xs font-bold hover:underline">Clear all filters</button>
            </div>
          )}
        </div>
      )}

      <ProductModal theme={theme} isOpen={isModalOpen}
        initialData={useMemo(() => editingProduct ? normalizeToForm(editingProduct) : null, [editingProduct])}
        onSave={handleSave} onClose={() => setIsModalOpen(false)} isSaving={isSaving}
        existingOptions={existingOptions} suggestedOptions={suggestedOptions} />

      {stockProduct && (
        <StockModal product={stockProduct} onClose={() => setStockProduct(null)} onSave={handleStockSave} isSaving={isStockSaving} theme={theme} />
      )}

      {/* ── CSV Import modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={cn('w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden', theme === 'dark' ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white')}>
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
                      { col: 'Name', note: 'Required. Product name.' },
                      { col: 'Price (THB)', note: 'Required. Number only, e.g. 299' },
                      { col: 'Description', note: 'Optional. Plain text.' },
                      { col: 'Brand', note: 'Optional.' },
                      { col: 'Category', note: 'Optional. Use semicolons for multiple: Food;Drink' },
                      { col: 'Active', note: 'Optional. Yes or No. Defaults to Yes.' },
                    ].map(({ col, note }) => (
                      <div key={col} className="flex gap-2">
                        <span className="text-accent w-28 flex-shrink-0">{col}</span>
                        <span className={theme === 'dark' ? 'text-[#8b92ad]' : 'text-slate-500'}>{note}</span>
                      </div>
                    ))}
                  </div>
                  <p className={cn('text-[10px]', theme === 'dark' ? 'text-[#8b92ad]' : 'text-slate-400')}>
                    Variants cannot be imported via CSV — add them after import using the product editor. Images must be added manually.
                  </p>
                  <button
                    onClick={() => {
                      const template = '﻿Name,Description,Brand,Category,Price (THB),Active\nExample Bag,A stylish tote,MyBrand,Bags;Fashion,599,Yes\n';
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

      {deleteConfirm && (
        <div 
          className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className={cn("rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl animate-in zoom-in-95", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
            <h3 className={cn("text-xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Delete Product?</h3>
            <p className="text-sm text-[#8b92ad] mb-6">This will remove it from the catalog permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className={cn("flex-1 py-3 text-sm font-bold rounded-xl", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f4f6f9] text-[#8b92ad]")}>Cancel</button>
              <button onClick={() => { fetch(`/api/products/${deleteConfirm}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } }).then(() => { loadProducts(); setDeleteConfirm(null); }); }} className="flex-1 py-3 text-sm font-bold bg-red-500 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function ProductCard({ product, theme, onEdit, onDelete, onToggleVisibility, onManageStock }: any) {
  const displayImage = product.images?.[0] || product.imageUrl;

  return (
    <div className={cn("rounded-[32px] border p-5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-full", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]", !product.isActive && "opacity-60")}>
      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-5 bg-[#f4f6f9] dark:bg-[#1a1d2e] border border-[#e2e5ef] dark:border-[#1f2335]">
        {displayImage ? (
          <img src={displayImage} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#8b92ad]"><ImageIcon size={32} strokeWidth={1.5} /></div>
        )}
        <div className="absolute top-3 left-3">
          {!product.isActive && <span className="bg-[#1a1d2e] text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg flex items-center gap-1"><EyeOff size={8} /> HIDDEN</span>}
        </div>
        <button onClick={e => { e.stopPropagation(); onToggleVisibility(); }}
          className={cn("absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90", product.isActive ? "bg-white text-accent" : "bg-[#1a1d2e] text-[#8b92ad]")}>
          {product.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        {/* Photo count badge */}
        {product.images?.length > 1 && (
          <div className="absolute bottom-3 left-3 bg-[#1a1d2e]/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            {product.images.length} photos
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="text-[10px] font-black text-accent uppercase tracking-wider truncate mb-1">
          {product.brand} {product.modelLine && `• ${product.modelLine}`}
        </div>
        <h3 className={cn("font-bold text-base mb-1", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{product.name}</h3>
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

      <div className={cn("flex gap-2 mt-5 pt-5 border-t opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
        <button onClick={onEdit} className={cn("flex-1 py-3 rounded-2xl text-[10px] font-black active:scale-95 flex items-center justify-center gap-2", theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#2d324d]" : "bg-[#f4f6f9] text-[#1a1d2e] hover:bg-[#e2e5ef]")}>
          <Edit2 size={12} /> EDIT
        </button>
        {product.variants?.length > 0 && (
          <button onClick={onManageStock} className={cn("py-3 px-3 rounded-2xl text-[10px] font-black active:scale-95 flex items-center justify-center gap-1.5", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad] hover:bg-[#2d324d]" : "bg-[#f4f6f9] text-[#8b92ad] hover:bg-[#e2e5ef]")} title="Manage Stock">
            <Layers size={12} /> STOCK
          </button>
        )}
        <button onClick={onDelete} className={cn("p-3 rounded-2xl active:scale-95 flex items-center justify-center", theme === 'dark' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100")}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color, theme, isLoading }: any) {
  const colorMap: any = { emerald: "text-emerald-500 bg-emerald-500/10", amber: "text-amber-500 bg-amber-500/10", blue: "text-blue-500 bg-blue-500/10", indigo: "text-indigo-500 bg-indigo-500/10" };
  return (
    <div className={cn("p-5 rounded-3xl border shadow-sm flex flex-col gap-3", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", colorMap[color])}>{icon}</div>
      <div>
        <div className="text-[#8b92ad] text-[10px] font-bold uppercase tracking-wider mb-1">{label}</div>
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-t-transparent border-accent rounded-full animate-spin mt-1" />
        ) : (
          <div className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{value}</div>
        )}
      </div>
    </div>
  );
}

export default ProductManagement;

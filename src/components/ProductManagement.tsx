"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, X, ImageIcon, Search, ChevronDown, Layers, Palette, Ruler } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
import LoadingView from './LoadingView';

interface ProductVariant {
  thickness: string;
  colors: string[];
  price: string;
  cost: string;
  stock: string;
}

interface ProductForm {
  name: string; // Display Name (e.g. Kunka)
  brand: string;
  modelLine: string; // Family (e.g. Croc Handle)
  description: string;
  price: string; // minPrice
  categories: string[];
  variants: ProductVariant[];
  imageUrl: string;
}

const EMPTY_VARIANT: ProductVariant = {
  thickness: '',
  colors: [],
  price: '',
  cost: '',
  stock: '0',
};

const EMPTY_FORM: ProductForm = {
  name: '',
  brand: '',
  modelLine: '',
  description: '',
  price: '',
  categories: [],
  variants: [
    { ...EMPTY_VARIANT, thickness: '1.2mm' },
    { ...EMPTY_VARIANT, thickness: '2mm' }
  ],
  imageUrl: '',
};

export function CreatableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  theme = 'light'
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  theme?: 'light' | 'dark';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const showCreate = search.trim() !== '' && !options.some(o => o.toLowerCase() === search.toLowerCase().trim());

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (search.trim() !== '') {
        onChange(search.trim());
        setIsOpen(false);
        setSearch('');
      }
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div 
        className={cn(
          "w-full border rounded-xl px-4 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between",
          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]",
          "focus-within:border-[#00b900] focus-within:ring-1 focus-within:ring-[#00b900]"
        )}
        onClick={() => setIsOpen(true)}
      >
        <span className={value ? (theme === 'dark' ? "text-white font-medium" : "text-[#1a1d2e] font-medium") : "text-[#8b92ad]"}>{value || placeholder}</span>
        <ChevronDown size={14} className="text-[#8b92ad]" />
      </div>

      {isOpen && (
        <div className={cn(
          "absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100",
          theme === 'dark' ? "bg-[#1f2335] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
        )}>
          <div className={cn("p-2 border-b transition-colors", theme === 'dark' ? "border-[#2d324d]" : "border-[#f4f6f9]")}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={14} />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or add..."
                className={cn(
                  "w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#00b900] transition-colors",
                  theme === 'dark' ? "bg-[#161925] text-white" : "bg-[#f4f6f9] text-[#1a1d2e]"
                )}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map(opt => (
              <button
                key={opt}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                  theme === 'dark' ? "text-white hover:bg-[#2d324d]" : "text-[#1a1d2e] hover:bg-[#f4f6f9]"
                )}
                onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}
              >
                {opt}
              </button>
            ))}
            {showCreate && (
              <button
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg font-bold transition-colors flex items-center gap-2",
                  theme === 'dark' ? "text-[#00b900] hover:bg-[#00b90011]" : "text-[#00b900] hover:bg-[#00b90008]"
                )}
                onClick={() => { onChange(search.trim()); setIsOpen(false); setSearch(''); }}
              >
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
  label,
  selected, 
  onAdd, 
  onRemove, 
  options,
  placeholder = "Type to search or add...",
  isColorMode = false,
  theme = 'light'
}: { 
  label?: string,
  selected: string[], 
  onAdd: (c: string) => void, 
  onRemove: (c: string) => void,
  options: string[],
  placeholder?: string,
  isColorMode?: boolean,
  theme?: 'light' | 'dark'
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => !selected.includes(o) && o.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isHex = (str: string) => /^#[0-9A-F]{6}$/i.test(str);

  return (
    <div ref={wrapperRef}>
      {label && <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">{label}</label>}
      <div className={cn(
        "w-full border rounded-xl px-2 py-2 flex flex-wrap gap-2 transition-colors",
        theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
      )}>
        {selected.map(c => (
          <div key={c} className={cn(
            "flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg text-xs font-bold transition-colors animate-in zoom-in-90",
            theme === 'dark' ? "bg-[#161925] text-white" : "bg-[#f4f6f9] text-[#1a1d2e]"
          )}>
            {isHex(c) && <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c }} />}
            {c}
            <button onClick={() => onRemove(c)} className="hover:text-red-400 opacity-70 hover:opacity-100"><X size={10} /></button>
          </div>
        ))}
        <div className="relative flex-1 min-w-[150px]">
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={cn("w-full bg-transparent border-none outline-none px-2 py-1.5 text-sm", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}
          />
          {isOpen && (
            <div className={cn(
              "absolute bottom-full left-0 right-0 mb-2 border rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 duration-100",
              theme === 'dark' ? "bg-[#1f2335] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
            )}>
              <div className="max-h-40 overflow-y-auto p-1">
                {filtered.map(o => (
                  <button key={o} onClick={() => { onAdd(o); setSearch(''); setIsOpen(false); }} className={cn("w-full text-left px-3 py-2 text-sm rounded-lg transition-colors", theme === 'dark' ? "text-white hover:bg-[#2d324d]" : "text-[#1a1d2e] hover:bg-[#f4f6f9]")}>
                    {isHex(o) && <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: o }} />}
                    {o}
                  </button>
                ))}
                {search && !options.some(o => o.toLowerCase() === search.toLowerCase().trim()) && (
                  <button onClick={() => { onAdd(search.trim()); setSearch(''); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-[#00b900] font-bold hover:bg-[#00b90008] rounded-lg flex items-center gap-2">
                    <Plus size={14} /> Create "{search}"
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {isColorMode && (
        <input 
          ref={colorInputRef}
          type="color"
          className="sr-only"
          onChange={(e) => {
            const hex = e.target.value.toUpperCase();
            if (!selected.includes(hex)) onAdd(hex);
          }}
        />
      )}
    </div>
  );
}

export function ImageUploader({ value, onChange, theme = 'light' }: { value: string, onChange: (v: string) => void, theme?: 'light' | 'dark' }) {
  const [isUploading, setIsUploading] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max = 800;
        if (width > height && width > max) { height *= max / width; width = max; } else if (height > max) { width *= max / height; height = max; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        onChange(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Product Image</label>
      <div className={cn(
        "relative rounded-2xl overflow-hidden aspect-video border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer",
        theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] hover:border-[#00b900]" : "bg-[#f8f9fc] border-[#e2e5ef] hover:border-[#00b900]"
      )}
        onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = (e: any) => { if (e.target.files[0]) processFile(e.target.files[0]); }; i.click(); }}
      >
        {value ? (
          <img src={value} className="w-full h-full object-contain" />
        ) : (
          <div className="text-center text-[#8b92ad]">
            <ImageIcon className="mx-auto mb-2 opacity-50" size={24} />
            <div className="text-xs font-bold text-[#1a1d2e]">Drop or Click to upload</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductModal({
  isOpen,
  initialData,
  onSave,
  onClose,
  isSaving,
  existingOptions
}: {
  isOpen: boolean;
  initialData: ProductForm | null;
  onSave: (data: ProductForm) => void;
  onClose: () => void;
  isSaving: boolean;
  existingOptions: { brands: string[], modelLines: string[], categories: string[], colors: string[], thicknesses: string[] };
  theme?: 'light' | 'dark';
}) {
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentId = (initialData as any)?._id || 'new';
      if (currentId !== prevId.current) {
        setForm(initialData ?? EMPTY_FORM);
        prevId.current = currentId;
      }
    } else {
      prevId.current = null;
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const updateForm = (updates: Partial<ProductForm>) => setForm(prev => ({ ...prev, ...updates }));

  const addVariant = () => updateForm({ variants: [...form.variants, { ...EMPTY_VARIANT }] });
  const removeVariant = (index: number) => updateForm({ variants: form.variants.filter((_, i) => i !== index) });
  const updateVariant = (index: number, updates: Partial<ProductVariant>) => {
    const next = [...form.variants];
    next[index] = { ...next[index], ...updates };
    updateForm({ variants: next });
  };

  const isValid = form.name.trim() && form.brand.trim() && form.variants.length > 0 && form.variants.every(v => v.thickness && v.price);

  return (
    <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={cn(
        "w-full max-w-4xl transition-all rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col",
        theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white"
      )}>
        <div className={cn("flex items-center justify-between px-8 pt-8 pb-4 border-b transition-colors", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <div>
            <h3 className={cn("text-xl font-bold transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{initialData ? 'Edit Product' : 'Catalog New Product'}</h3>
            <p className="text-xs text-[#8b92ad]">Luxury Hierarchy Management (Brand &gt; Model Line &gt; Product Name)</p>
          </div>
          <button onClick={onClose} className={cn("w-8 h-8 flex items-center justify-center rounded-full transition-colors", theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#2d324d]" : "bg-[#f4f6f9] hover:bg-[#e2e5ef]")}><X size={16} /></button>
        </div>

        <div className="px-8 py-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Core Info */}
          <div className="space-y-6">
            <ImageUploader value={form.imageUrl} onChange={v => updateForm({ imageUrl: v })} theme={theme} />
            
            <div className="grid grid-cols-2 gap-4">
              <CreatableDropdown 
                label="Brand" 
                value={form.brand} 
                onChange={v => updateForm({ brand: v })} 
                options={existingOptions.brands} 
                placeholder="e.g. Celine" 
                theme={theme}
              />
              <CreatableDropdown 
                label="Model Line / Family" 
                value={form.modelLine} 
                onChange={v => updateForm({ modelLine: v })} 
                options={existingOptions.modelLines} 
                placeholder="e.g. Boston Bag" 
                theme={theme}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block transition-colors">Display Product Name *</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => updateForm({ name: e.target.value })}
                placeholder="e.g. Kunka"
                className={cn(
                  "w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00b900] transition-colors",
                  theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                )}
              />
            </div>

            <TagSelector 
              label="Categories"
              selected={form.categories} 
              onAdd={c => !form.categories.includes(c) && updateForm({ categories: [...form.categories, c] })}
              onRemove={c => updateForm({ categories: form.categories.filter(x => x !== c) })}
              options={existingOptions.categories}
              placeholder="Search or add category..."
              theme={theme}
            />

            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block transition-colors">Description</label>
              <textarea 
                value={form.description}
                onChange={e => updateForm({ description: e.target.value })}
                rows={3}
                className={cn(
                  "w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00b900] resize-none transition-colors",
                  theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                )}
              />
            </div>
          </div>

          {/* Right Column: Variant Matrix */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">Thickness & Color Variants</label>
              <button onClick={addVariant} className="text-[#00b900] text-[10px] font-bold flex items-center gap-1 hover:underline">
                <Plus size={14} /> Add Thickness
              </button>
            </div>

            <div className="space-y-4">
              {form.variants.map((v, idx) => (
                <div key={idx} className={cn(
                  "border rounded-2xl p-4 relative group animate-in slide-in-from-right-4 transition-colors",
                  theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-[#f8f9fc] border-[#e2e5ef]"
                )}>
                  {form.variants.length > 1 && (
                    <button onClick={() => removeVariant(idx)} className={cn("absolute -top-2 -right-2 border text-red-400 p-1 rounded-full shadow-sm hover:text-red-600 z-10 transition-colors", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
                      <Trash2 size={12} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <CreatableDropdown 
                      label="Thickness" 
                      value={v.thickness} 
                      onChange={val => updateVariant(idx, { thickness: val })} 
                      options={existingOptions.thicknesses} 
                      placeholder="1.2 mm" 
                      theme={theme}
                    />
                    <div>
                      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Price (THB)</label>
                      <input 
                        type="number" 
                        value={v.price} 
                        onChange={e => updateVariant(idx, { price: e.target.value })}
                        className={cn(
                          "w-full border rounded-xl px-3 py-2 text-sm font-bold text-[#00b900] outline-none focus:border-[#00b900] transition-colors",
                          theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
                        )}
                      />
                    </div>
                  </div>
                  
                  <TagSelector 
                    label={`Available Colors for ${v.thickness || '?'}`}
                    selected={v.colors}
                    onAdd={c => !v.colors.includes(c) && updateVariant(idx, { colors: [...v.colors, c] })}
                    onRemove={c => updateVariant(idx, { colors: v.colors.filter(x => x !== c) })}
                    options={existingOptions.colors}
                    placeholder="Search or add color..."
                    isColorMode={true}
                    theme={theme}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn("p-8 pt-4 border-t flex gap-3 transition-colors", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <button onClick={onClose} className={cn("flex-1 py-4 text-sm font-bold rounded-2xl transition-all", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad] hover:bg-[#2d324d]" : "bg-[#f8f9fc] text-[#8b92ad] hover:bg-[#e2e5ef]")}>Cancel</button>
          <button 
            disabled={!isValid || isSaving}
            onClick={() => onSave(form)}
            className="flex-1 py-4 text-sm font-bold text-white bg-[#00b900] rounded-2xl shadow-lg shadow-[#00b90033] hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {isSaving ? 'Processing...' : initialData ? 'Update Catalog' : 'Catalog Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(function ProductManagement({ theme }: { theme?: 'light' | 'dark' }) {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const secret = typeof window !== 'undefined' ? localStorage.getItem('admin_secret') || '' : '';

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products', { headers: { 'x-admin-secret': secret } });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadProducts(); }, []);

  const unique = (path: string) => {
    const vals = new Set<string>();
    products.forEach(p => {
      if (path === 'category') p.categories?.forEach((c: string) => vals.add(c));
      else if (path === 'thickness') p.variants?.forEach((v: any) => vals.add(v.thickness));
      else if (path === 'color') p.variants?.forEach((v: any) => v.colors?.forEach((c: string) => vals.add(c)));
      else if (p[path]) vals.add(p[path]);
    });
    return Array.from(vals).sort();
  };

  const existingOptions = useMemo(() => ({
    brands: unique('brand'),
    modelLines: unique('modelLine'),
    categories: unique('category'),
    colors: unique('color'),
    thicknesses: unique('thickness'),
  }), [products]);

  const handleSave = async (form: ProductForm) => {
    setIsSaving(true);
    try {
      const res = await fetch(editingProduct ? `/api/products/${editingProduct._id}` : '/api/products', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setIsModalOpen(false);
        loadProducts();
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className={`text-2xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>
          <Package size={28} className="text-[#8b92ad]" /> {products.length} Products
        </h2>
        <button 
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="bg-[#00b900] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#00b90033] hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={18} /> New Product
        </button>
      </div>

      {isLoading ? (
        <LoadingView theme={theme} message="Loading Product Catalog..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p._id} className={`${theme === 'dark' ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'} rounded-3xl border p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}>
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#f4f6f9] flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#e2e5ef]">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-[#8b92ad]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-[#00b900] uppercase tracking-wider mb-1">{p.brand} {p.modelLine ? `• ${p.modelLine}` : ''}</div>
                  <h3 className={`font-bold text-sm mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>{p.name}</h3>
                  <div className="text-xs text-[#8b92ad]">฿{p.price?.toLocaleString()}</div>
                </div>
              </div>
              <div className={cn("flex gap-2 mt-6 pt-6 border-t transition-colors", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
                <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold transition-colors", theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#2d324d]" : "bg-[#f4f6f9] text-[#1a1d2e] hover:bg-[#e2e5ef]")}>Edit</button>
                <button onClick={() => setDeleteConfirm(p._id)} className={cn("p-2 rounded-xl transition-colors", theme === 'dark' ? "text-red-500 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50")}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductModal 
        theme={theme}
        isOpen={isModalOpen} 
        initialData={useMemo(() => editingProduct ? {
          ...editingProduct,
          price: String(editingProduct.price),
          variants: editingProduct.variants?.map((v: any) => ({ ...v, price: String(v.price), cost: String(v.cost), stock: String(v.stock) })) || [{ ...EMPTY_VARIANT }]
        } : null, [editingProduct])}
        onSave={handleSave}
        onClose={() => setIsModalOpen(false)}
        isSaving={isSaving}
        existingOptions={existingOptions}
      />

        <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className={cn("rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl animate-in zoom-in-95 transition-colors", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}>
            <h3 className={cn("text-xl font-bold mb-2 transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Delete Product?</h3>
            <p className="text-sm text-[#8b92ad] mb-6">This will remove it from the catalog permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-colors", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f4f6f9] text-[#8b92ad]")}>Cancel</button>
              <button onClick={() => {
                fetch(`/api/products/${deleteConfirm}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } }).then(() => { loadProducts(); setDeleteConfirm(null); });
              }} className="flex-1 py-3 text-sm font-bold bg-red-500 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
    </div>
  );
});

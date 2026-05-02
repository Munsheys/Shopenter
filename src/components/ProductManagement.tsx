"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, X, ImageIcon, Search, ChevronDown, Layers, Palette, Ruler } from 'lucide-react';

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
  variants: [{ ...EMPTY_VARIANT }],
  imageUrl: '',
};

export function CreatableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
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
        className="w-full border border-[#e2e5ef] rounded-xl px-4 py-2.5 text-sm cursor-pointer bg-white focus-within:border-[#00b900] focus-within:ring-1 focus-within:ring-[#00b900] transition-all flex items-center justify-between"
        onClick={() => setIsOpen(true)}
      >
        <span className={value ? "text-[#1a1d2e] font-medium" : "text-[#8b92ad]"}>{value || placeholder}</span>
        <ChevronDown size={14} className="text-[#8b92ad]" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e2e5ef] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-[#f4f6f9]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={14} />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or add..."
                className="w-full bg-[#f4f6f9] rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#00b900]"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map(opt => (
              <button
                key={opt}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#f4f6f9] transition-colors"
                onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}
              >
                {opt}
              </button>
            ))}
            {showCreate && (
              <button
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#00b90008] text-[#00b900] font-bold transition-colors flex items-center gap-2"
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

function TagSelector({ 
  label,
  selected, 
  onAdd, 
  onRemove, 
  options,
  placeholder = "Type to search or add...",
  isColorMode = false
}: { 
  label?: string,
  selected: string[], 
  onAdd: (c: string) => void, 
  onRemove: (c: string) => void,
  options: string[],
  placeholder?: string,
  isColorMode?: boolean
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
      <div className="flex flex-wrap gap-1.5 mb-2">
        {selected.map(c => (
          <span key={c} className="bg-[#1a1d2e] text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 animate-in zoom-in-90">
            {isHex(c) && <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: c }} />}
            {c}
            <button onClick={() => onRemove(c)} className="hover:text-red-400 opacity-70 hover:opacity-100"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text"
            placeholder={placeholder}
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && search.trim()) {
                e.preventDefault();
                onAdd(search.trim());
                setSearch('');
              }
            }}
            className="w-full border border-[#e2e5ef] rounded-xl px-4 py-2 text-sm outline-none focus:border-[#00b900] bg-white transition-all"
          />
          {isColorMode && (
            <button 
              onClick={() => colorInputRef.current?.click()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#8b92ad] hover:text-[#00b900] transition-colors"
              title="Pick color"
            >
              <Palette size={16} />
            </button>
          )}
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

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e5ef] rounded-xl shadow-xl z-[60] p-1 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100">
            {filtered.map(o => (
              <button key={o} onClick={() => { onAdd(o); setSearch(''); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[#f4f6f9] rounded-lg transition-colors flex items-center gap-2">
                {isHex(o) && <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: o }} />}
                {o}
              </button>
            ))}
            {search && !options.some(o => o.toLowerCase() === search.toLowerCase().trim()) && (
              <button onClick={() => { onAdd(search.trim()); setSearch(''); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-[#00b900] font-bold hover:bg-[#00b90008] rounded-lg flex items-center gap-2">
                <Plus size={14} /> Create "{search}"
              </button>
            )}
            {!search && filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-center text-[#8b92ad] italic">
                {options.length === 0 ? "No existing items found. Type to create new." : "All items already selected."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ImageUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isDragging, setIsDragging] = useState(false);

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
        if (width > height && width > max) {
          height *= max / width; width = max;
        } else if (height > max) {
          width *= max / height; height = max;
        }
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
      <div 
        className={`relative w-full h-40 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden cursor-pointer ${isDragging ? 'border-[#00b900] bg-[#00b90008]' : 'border-[#e2e5ef] bg-[#f8f9fc] hover:border-[#00b900]'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) processFile(file); }}
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
  existingOptions: { brands: string[], modelLines: string[], categories: string[], colors: string[], thicknesses: string[] }
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
      <div className="bg-white rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-[#f4f6f9]">
          <div>
            <h3 className="text-xl font-bold text-[#1a1d2e]">{initialData ? 'Edit Product' : 'Catalog New Product'}</h3>
            <p className="text-xs text-[#8b92ad]">Luxury Hierarchy Management (Brand &gt; Model Line &gt; Product Name)</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f4f6f9] hover:bg-[#e2e5ef] transition-colors"><X size={16} /></button>
        </div>

        <div className="px-8 py-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Core Info */}
          <div className="space-y-6">
            <ImageUploader value={form.imageUrl} onChange={v => updateForm({ imageUrl: v })} />
            
            <div className="grid grid-cols-2 gap-4">
              <CreatableDropdown 
                label="Brand" 
                value={form.brand} 
                onChange={v => updateForm({ brand: v })} 
                options={existingOptions.brands} 
                placeholder="e.g. Celine" 
              />
              <CreatableDropdown 
                label="Model Line / Family" 
                value={form.modelLine} 
                onChange={v => updateForm({ modelLine: v })} 
                options={existingOptions.modelLines} 
                placeholder="e.g. Boston Bag" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Display Product Name *</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => updateForm({ name: e.target.value })}
                placeholder="e.g. Kunka"
                className="w-full border border-[#e2e5ef] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00b900]"
              />
            </div>

            <TagSelector 
              label="Categories"
              selected={form.categories} 
              onAdd={c => !form.categories.includes(c) && updateForm({ categories: [...form.categories, c] })}
              onRemove={c => updateForm({ categories: form.categories.filter(x => x !== c) })}
              options={existingOptions.categories}
              placeholder="Search or add category..."
            />

            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Description</label>
              <textarea 
                value={form.description}
                onChange={e => updateForm({ description: e.target.value })}
                rows={3}
                className="w-full border border-[#e2e5ef] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00b900] resize-none"
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
                <div key={idx} className="bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl p-4 relative group animate-in slide-in-from-right-4">
                  {form.variants.length > 1 && (
                    <button onClick={() => removeVariant(idx)} className="absolute -top-2 -right-2 bg-white border border-[#e2e5ef] text-red-400 p-1 rounded-full shadow-sm hover:text-red-600 z-10">
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
                    />
                    <div>
                      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">Price (THB)</label>
                      <input 
                        type="number" 
                        value={v.price} 
                        onChange={e => updateVariant(idx, { price: e.target.value })}
                        className="w-full border border-[#e2e5ef] rounded-xl px-3 py-2 text-sm font-bold text-[#00b900] outline-none focus:border-[#00b900]"
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
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 pt-4 border-t border-[#f4f6f9] flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 text-sm font-bold text-[#8b92ad] bg-[#f8f9fc] rounded-2xl transition-all">Cancel</button>
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

export default React.memo(function ProductManagement() {
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
      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/products/${editingProduct._id}` : '/api/products';
      
      const prices = form.variants.map(v => parseFloat(v.price) || 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({
          ...form,
          price: minPrice,
          maxPrice: maxPrice,
          variants: form.variants.map(v => ({
            ...v,
            price: parseFloat(v.price) || 0,
            cost: parseFloat(v.cost) || 0,
            stock: parseInt(v.stock) || 0
          }))
        }),
      });

      if (res.ok) {
        await loadProducts();
        setIsModalOpen(false);
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Package className="text-[#8b92ad]" size={28} /> Product Catalog
        </h2>
        <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="bg-[#00b900] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all">
          <Plus size={18} /> New Product
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-[#00b900]/20 border-t-[#00b900] rounded-full animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-[#8b92ad]">No products in catalog.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map((p: any) => (
            <div key={p._id} className="bg-white rounded-2xl border border-[#e2e5ef] overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="aspect-[4/3] bg-[#f4f6f9] relative">
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className="bg-black/60 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest self-start">{p.brand}</span>
                  {p.modelLine && <span className="bg-[#00b900] text-white text-[7px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest self-start">{p.modelLine}</span>}
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-sm truncate">{p.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1 mb-2">
                  {p.categories?.slice(0, 2).map((c: string) => <span key={c} className="text-[8px] bg-[#f4f6f9] px-1.5 py-0.5 rounded text-[#8b92ad] font-bold">{c}</span>)}
                </div>
                <div className="text-xs font-black text-[#00b900] mt-auto">
                  ฿{p.price?.toLocaleString()} {p.maxPrice > p.price ? `- ฿${p.maxPrice.toLocaleString()}` : ''}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2 bg-[#f4f6f9] rounded-lg hover:bg-[#e2e5ef] transition-colors flex justify-center"><Edit2 size={14} /></button>
                  <button onClick={() => setDeleteConfirm(p._id)} className="p-2 bg-[#fff1f0] text-red-500 rounded-lg hover:bg-[#ffccc7] transition-colors flex justify-center"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductModal 
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

      {deleteConfirm && (
        <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-2">Delete Product?</h3>
            <p className="text-sm text-[#8b92ad] mb-6">This will remove it from the catalog permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 text-sm font-bold bg-[#f4f6f9] rounded-xl">Cancel</button>
              <button onClick={() => {
                fetch(`/api/products/${deleteConfirm}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } }).then(() => { loadProducts(); setDeleteConfirm(null); });
              }} className="flex-1 py-3 text-sm font-bold bg-red-500 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

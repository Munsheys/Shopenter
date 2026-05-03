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
  Palette, 
  Ruler,
  Filter,
  ArrowUpDown,
  Eye,
  EyeOff,
  AlertCircle,
  BarChart2,
  Check,
  RefreshCw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LoadingView from './LoadingView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Interfaces ---
interface ProductVariant {
  thickness: string;
  colors: string[];
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
  variants: ProductVariant[];
  isActive: boolean;
}

interface ProductForm {
  name: string;
  brand: string;
  modelLine: string;
  description: string;
  price: string;
  categories: string[];
  variants: ProductVariant[];
  imageUrl: string;
  isActive: boolean;
}

// --- Components ---

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
  isActive: true,
};

export function CreatableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  theme = 'light',
  required = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  theme?: 'light' | 'dark';
  required?: boolean;
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

  const filtered = options.filter(o => o && typeof o === 'string' && o.toLowerCase().includes(search.toLowerCase()));
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
        {label} {required && <span className="text-red-500">*</span>}
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
  theme = 'light',
  required = false
}: { 
  label?: string,
  selected: string[], 
  onAdd: (c: string) => void, 
  onRemove: (c: string) => void,
  options: string[],
  placeholder?: string,
  isColorMode?: boolean,
  theme?: 'light' | 'dark',
  required?: boolean
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => o && typeof o === 'string' && !selected.includes(o) && o.toLowerCase().includes(search.toLowerCase()));

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
      {label && (
        <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block transition-colors">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
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
  existingOptions,
  theme = 'light'
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

  const isValid = form.name.trim() !== '' && form.brand.trim() !== '' && form.variants.length > 0 && form.variants.every(v => v.thickness.trim() !== '' && v.price.trim() !== '');

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
              <div className="relative z-[100]">
                <CreatableDropdown 
                  label="Brand" 
                  value={form.brand} 
                  onChange={v => updateForm({ brand: v })} 
                  options={existingOptions.brands} 
                  placeholder="e.g. Celine" 
                  theme={theme}
                  required={true}
                />
              </div>
              <div className="relative z-[90]">
                <CreatableDropdown 
                  label="Model Line / Family" 
                  value={form.modelLine} 
                  onChange={v => updateForm({ modelLine: v })} 
                  options={existingOptions.modelLines} 
                  placeholder="e.g. Boston Bag" 
                  theme={theme}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block transition-colors">
                Display Product Name <span className="text-red-500">*</span>
              </label>
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
                )} style={{ zIndex: (form.variants.length - idx) * 10 }}>
                  {form.variants.length > 1 && (
                    <button onClick={() => removeVariant(idx)} className={cn("absolute -top-2 -right-2 border text-red-400 p-1 rounded-full shadow-sm hover:text-red-600 z-50 transition-colors", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
                      <Trash2 size={12} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="relative z-[20]">
                      <CreatableDropdown 
                        label="Thickness" 
                        value={v.thickness} 
                        onChange={val => updateVariant(idx, { thickness: val })} 
                        options={existingOptions.thicknesses} 
                        placeholder="1.2 mm" 
                        theme={theme}
                        required={true}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
                        Price (THB) <span className="text-red-500">*</span>
                      </label>
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

// --- Main ProductManagement Hub ---

const ProductManagement = React.memo(function ProductManagement({ theme }: { theme?: 'light' | 'dark' }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filters & Sorting
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
      else if (path === 'thickness') p.variants?.forEach((v: any) => vals.add(v.thickness));
      else if (path === 'color') p.variants?.forEach((v: any) => v.colors?.forEach((c: string) => vals.add(c)));
      else if ((p as any)[path]) vals.add((p as any)[path]);
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

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.modelLine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categories.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesBrand = !brandFilter || p.brand === brandFilter;
      const matchesCategory = !categoryFilter || p.categories.includes(categoryFilter);

      return matchesSearch && matchesBrand && matchesCategory;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortOrder === 'newest') return -1;
      if (sortOrder === 'price-asc') return a.price - b.price;
      if (sortOrder === 'price-desc') return b.price - a.price;
      if (sortOrder === 'name-az') return a.name.localeCompare(b.name);
      return 0;
    });

    return result;
  }, [products, searchTerm, brandFilter, categoryFilter, sortOrder]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.isActive).length;

    return { total, active };
  }, [products]);

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

  const toggleVisibility = async (p: Product) => {
    try {
      await fetch(`/api/products/${p._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ isActive: !p.isActive })
      });
      loadProducts();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className={cn("text-2xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
            <div className="p-2 bg-[#00b90011] rounded-xl text-[#00b900]">
              <Package size={24} />
            </div>
            Catalog Hub
          </h2>
          <p className="text-[#8b92ad] text-xs font-medium mt-1 uppercase tracking-widest">Inventory & Product Lifecycle</p>
        </div>
        
        <button 
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-[#00b900] text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#00b90022] hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={18} /> Add New Catalog
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
        <StatsCard 
          icon={<BarChart2 size={20} />} 
          label="Total Catalog" 
          value={stats.total.toString()} 
          color="indigo" 
          theme={theme} 
        />
        <StatsCard 
          icon={<Eye size={20} />} 
          label="Active Storefront" 
          value={stats.active.toString()} 
          color="emerald" 
          theme={theme} 
        />
      </div>

      {/* Discovery Ribbon */}
      <div className={cn(
        "p-4 rounded-3xl border mb-6 flex flex-col lg:flex-row gap-4 transition-colors",
        theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
      )}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={16} />
          <input 
            type="text"
            placeholder="Search name, brand, or family..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-[#00b900]/20",
              theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white focus:border-[#00b900]" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e] focus:border-[#00b900]"
            )}
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3">
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={14} />
            <select 
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className={cn(
                "w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border transition-all cursor-pointer",
                theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]"
              )}
            >
              <option value="">All Brands</option>
              {existingOptions.brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
          </div>

          <div className="relative min-w-[140px]">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={14} />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={cn(
                "w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border transition-all cursor-pointer",
                theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]"
              )}
            >
              <option value="">All Categories</option>
              {existingOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
          </div>

          <div className="relative min-w-[140px]">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={14} />
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={cn(
                "w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border transition-all cursor-pointer",
                theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]"
              )}
            >
              <option value="newest">Sort: Newest</option>
              <option value="name-az">Sort: A-Z</option>
              <option value="price-asc">Sort: Price Low</option>
              <option value="price-desc">Sort: Price High</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {isLoading ? (
        <LoadingView theme={theme} message="Loading Product Catalog..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(p => (
            <ProductCard 
              key={p._id} 
              product={p} 
              theme={theme} 
              onEdit={() => { setEditingProduct(p); setIsModalOpen(true); }}
              onDelete={() => setDeleteConfirm(p._id)}
              onToggleVisibility={() => toggleVisibility(p)}
            />
          ))}
          
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
              <div className="w-16 h-16 bg-[#f8f9fc] dark:bg-[#1a1d2e] rounded-3xl flex items-center justify-center">
                <Search size={32} className="opacity-20" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#1a1d2e] dark:text-white">No products found</p>
                <p className="text-xs mt-1">Try adjusting your filters or search terms</p>
              </div>
              <button 
                onClick={() => { setSearchTerm(''); setBrandFilter(''); setCategoryFilter(''); setSortOrder('newest'); }}
                className="text-[#00b900] text-xs font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
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

      {deleteConfirm && (
        <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className={cn("rounded-[32px] w-full max-w-sm p-8 text-center shadow-2xl animate-in zoom-in-95 transition-colors", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}>
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
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
      )}
    </div>
  );
});

function ProductCard({ product, theme, onEdit, onDelete, onToggleVisibility }: any) {
  const totalStock = product.variants.reduce((sum: number, v: any) => sum + (parseInt(v.stock) || 0), 0);
  const isLowStock = product.variants.some((v: any) => (parseInt(v.stock) || 0) < 5);

  return (
    <div className={cn(
      "rounded-[32px] border p-5 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-full",
      theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]",
      !product.isActive && "opacity-60"
    )}>
      {/* Visual Header */}
      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-5 bg-[#f4f6f9] dark:bg-[#1a1d2e] border border-[#e2e5ef] dark:border-[#1f2335]">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#8b92ad]">
            <ImageIcon size={32} strokeWidth={1.5} />
          </div>
        )}
        
        {/* Quick Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {!product.isActive && (
            <span className="bg-[#1a1d2e] text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
              <EyeOff size={8} /> HIDDEN
            </span>
          )}
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
          className={cn(
            "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90",
            product.isActive ? "bg-white text-[#00b900]" : "bg-[#1a1d2e] text-[#8b92ad]"
          )}
        >
          {product.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-[10px] font-black text-[#00b900] uppercase tracking-wider truncate">
            {product.brand} {product.modelLine && `• ${product.modelLine}`}
          </div>
        </div>
        
        <h3 className={cn("font-bold text-base mb-1 transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
          {product.name}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {product.categories?.slice(0, 2).map((c: string) => (
            <span key={c} className={cn(
              "px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider",
              theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f4f6f9] text-[#8b92ad]"
            )}>
              {c}
            </span>
          ))}
          {product.categories?.length > 2 && <span className="text-[8px] font-bold text-[#8b92ad]">+{product.categories.length - 2}</span>}
        </div>

        <div className="flex items-center justify-between">
          <div className={cn("text-lg font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
            ฿{product.price?.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={cn(
        "flex gap-2 mt-6 pt-5 border-t opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0",
        theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]"
      )}>
        <button 
          onClick={onEdit} 
          className={cn(
            "flex-1 py-3 rounded-2xl text-[10px] font-black transition-all active:scale-95 flex items-center justify-center gap-2",
            theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#2d324d]" : "bg-[#f4f6f9] text-[#1a1d2e] hover:bg-[#e2e5ef]"
          )}
        >
          <Edit2 size={12} /> EDIT CATALOG
        </button>
        <button 
          onClick={onDelete} 
          className={cn(
            "p-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center",
            theme === 'dark' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100"
          )}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color, theme }: any) {
  const colorMap: any = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
  };

  return (
    <div className={cn(
      "p-5 rounded-3xl border transition-all shadow-sm flex flex-col gap-3",
      theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
    )}>
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", colorMap[color])}>
        {icon}
      </div>
      <div>
        <div className="text-[#8b92ad] text-[10px] font-bold uppercase tracking-wider mb-1">{label}</div>
        <div className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{value}</div>
      </div>
    </div>
  );
}

export default ProductManagement;

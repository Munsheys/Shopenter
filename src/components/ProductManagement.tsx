"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Edit2, Trash2, X, ImageIcon, Search, ChevronDown } from 'lucide-react';

interface ProductForm {
  name: string;
  brand: string;
  description: string;
  price: string;
  category: string;
  color: string;
  thickness: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  brand: '',
  description: '',
  price: '',
  category: '',
  color: '',
  thickness: '',
  imageUrl: '',
};

function CreatableDropdown({
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
            {!showCreate && filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-center text-[#8b92ad]">No options found</div>
            )}
          </div>
        </div>
      )}
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
        const max = 800; // Compress logic
        
        if (width > height && width > max) {
          height *= max / width;
          width = max;
        } else if (height > max) {
          width *= max / height;
          height = max;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onChange(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) processFile(file);
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div>
      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
        Product Image (Paste, Drop, or Click)
      </label>
      <div 
        className={`relative w-full h-36 rounded-2xl border-2 border-dashed transition-colors flex items-center justify-center overflow-hidden cursor-pointer ${isDragging ? 'border-[#00b900] bg-[#00b90008]' : 'border-[#e2e5ef] bg-[#f8f9fc] hover:border-[#00b900] hover:bg-white'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) processFile(file);
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) processFile(file);
          };
          input.click();
        }}
      >
        {value ? (
          <>
            <img src={value} className="w-full h-full object-contain bg-[#f4f6f9]" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-sm">
              Click or drop to replace
            </div>
          </>
        ) : (
          <div className="text-center text-[#8b92ad]">
            <ImageIcon className="mx-auto mb-2 opacity-50" size={24} />
            <div className="text-xs font-bold text-[#1a1d2e]">Drop image here or click</div>
            <div className="text-[10px] mt-1 opacity-70">You can also hit Ctrl+V to paste</div>
          </div>
        )}
      </div>
      <div className="mt-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Or paste an image URL here..."
          className="w-full border border-[#e2e5ef] rounded-xl px-4 py-2 text-xs outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900] transition-all bg-[#fafbfc]"
        />
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
  existingOptions: { brands: string[], categories: string[], colors: string[], thicknesses: string[] }
}) {
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  useEffect(() => {
    if (isOpen) setForm(initialData ?? EMPTY_FORM);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const set = (field: keyof ProductForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const isValid = form.name.trim() && form.price.trim() && parseFloat(form.price) > 0;

  return (
    <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0 border-b border-[#f4f6f9]">
          <div>
            <h3 className="text-xl font-bold text-[#1a1d2e]">
              {initialData ? 'Edit Product' : 'Add New Product'}
            </h3>
            <p className="text-xs text-[#8b92ad] mt-0.5">Fill in the product details below.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f4f6f9] hover:bg-[#e2e5ef] transition-colors text-[#8b92ad]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-8 py-6 overflow-y-auto space-y-5">
          <ImageUploader value={form.imageUrl} onChange={v => set('imageUrl', v)} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
                Product Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Card Holder Wallet"
                className="w-full border border-[#e2e5ef] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900] transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
                Price (THB) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="1250"
                className="w-full border border-[#e2e5ef] rounded-xl px-4 py-2.5 text-sm font-bold text-[#00b900] outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CreatableDropdown
              label="Brand"
              value={form.brand}
              onChange={v => set('brand', v)}
              options={existingOptions.brands}
              placeholder="e.g. Samorga"
            />
            <CreatableDropdown
              label="Category"
              value={form.category}
              onChange={v => set('category', v)}
              options={existingOptions.categories}
              placeholder="e.g. Wallets"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CreatableDropdown
              label="Color"
              value={form.color}
              onChange={v => set('color', v)}
              options={existingOptions.colors}
              placeholder="e.g. Black"
            />
            <CreatableDropdown
              label="Thickness"
              value={form.thickness}
              onChange={v => set('thickness', v)}
              options={existingOptions.thicknesses}
              placeholder="e.g. 1.2mm"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Short product description..."
              rows={2}
              className="w-full border border-[#e2e5ef] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900] transition-all resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-8 pt-4 border-t border-[#f4f6f9] flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-[#8b92ad] bg-[#f8f9fc] rounded-2xl hover:bg-[#f0f2f5] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => isValid && onSave(form)}
            disabled={!isValid || isSaving}
            className="flex-1 py-3 text-sm font-bold text-white bg-[#00b900] rounded-2xl shadow-lg shadow-[#00b90033] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'Saving...' : initialData ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const secret = typeof window !== 'undefined'
    ? localStorage.getItem('admin_secret') || process.env.NEXT_PUBLIC_ADMIN_SECRET || ''
    : process.env.NEXT_PUBLIC_ADMIN_SECRET || '';

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products', {
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  // Aggregate unique options from products
  const unique = (key: string) => Array.from(new Set(products.map(p => p[key]).filter(Boolean))).sort();
  const existingOptions = {
    brands: unique('brand'),
    categories: unique('category'),
    colors: unique('color'),
    thicknesses: unique('thickness'),
  };

  const handleSave = async (form: ProductForm) => {
    setIsSaving(true);
    try {
      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          brand: form.brand.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price),
          category: form.category.trim(),
          color: form.color.trim(),
          thickness: form.thickness.trim(),
          imageUrl: form.imageUrl.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      await loadProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Save product error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': secret },
      });
      await loadProducts();
    } catch (err) {
      console.error('Delete product error:', err);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const openAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Package className="text-[#8b92ad]" size={28} /> Product Management
        </h2>
        <button
          id="add-product-btn"
          onClick={openAdd}
          className="bg-[#00b900] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-[#00b90022] transition-all active:scale-95"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-48 text-[#8b92ad]">
          <div className="w-8 h-8 border-4 border-[#00b900]/20 border-t-[#00b900] rounded-full animate-spin mr-3" />
          Loading products...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-[#8b92ad]">
          <div className="w-16 h-16 rounded-3xl bg-[#f4f6f9] flex items-center justify-center">
            <Package size={32} className="opacity-40" />
          </div>
          <div className="text-center">
            <p className="font-bold text-[#1a1d2e] mb-1">No products yet</p>
            <p className="text-sm opacity-70">Click "Add Product" to create your first product.</p>
          </div>
          <button
            onClick={openAdd}
            className="bg-[#00b900] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-[#00b90022] transition-all"
          >
            <Plus size={16} /> Add First Product
          </button>
        </div>
      )}

      {/* Product Grid */}
      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {products.map((p: any) => (
            <div
              key={p._id}
              className="bg-white rounded-2xl border border-[#e2e5ef] overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#f4f6f9] overflow-hidden relative flex-shrink-0">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e: any) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#8b92ad]">
                    <ImageIcon size={32} className="opacity-30" />
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {p.brand && <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">{p.brand}</span>}
                  <span className="bg-[#00b900] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow">
                    ฿{p.price?.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-sm mb-0.5 truncate" title={p.name}>{p.name}</h3>
                <p className="text-[10px] text-[#8b92ad] mb-2 truncate">
                  {p.category || 'No category'} {p.color ? `• ${p.color}` : ''} {p.thickness ? `• ${p.thickness}` : ''}
                </p>
                <div className="text-sm font-black text-[#00b900] mt-auto mb-3">฿{p.price?.toLocaleString()}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex items-center justify-center gap-1 bg-[#f4f6f9] text-[#1a1d2e] py-2 rounded-lg text-xs font-bold hover:bg-[#e2e5ef] transition-colors"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(p._id)}
                    className="flex items-center justify-center gap-1 bg-[#fff1f0] text-red-500 py-2 rounded-lg text-xs font-bold hover:bg-[#ffccc7] transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <ProductModal
        isOpen={isModalOpen}
        initialData={
          editingProduct
            ? {
                name: editingProduct.name || '',
                brand: editingProduct.brand || '',
                description: editingProduct.description || '',
                price: String(editingProduct.price ?? ''),
                category: editingProduct.category || '',
                color: editingProduct.color || '',
                thickness: editingProduct.thickness || '',
                imageUrl: editingProduct.imageUrl || '',
              }
            : null
        }
        onSave={handleSave}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
        isSaving={isSaving}
        existingOptions={existingOptions}
      />

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-red-50 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1a1d2e] mb-2">Delete Product?</h3>
              <p className="text-[#8b92ad] text-sm leading-relaxed">This product will be permanently removed and cannot be undone.</p>
            </div>
            <div className="flex border-t border-[#f4f6f9]">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-5 text-sm font-bold text-[#8b92ad] hover:bg-[#fafbfc] transition-colors border-r border-[#f4f6f9]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

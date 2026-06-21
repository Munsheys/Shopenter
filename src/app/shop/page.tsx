"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, User, Search, X, CheckCircle, ArrowRight, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import liff from '@line/liff';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

type CartItem = { productId: string; name: string; price: number; variantLabel?: string; qty: number; imageUrl?: string; };
type Product = any;

function getProductOptions(product: Product): Array<{ name: string; values: string[] }> {
  if (product?.options?.length) return product.options;
  const opts: Array<{ name: string; values: string[] }> = [];
  const variantNames = [...new Set((product?.variants || []).map((v: any) => v.variantName).filter(Boolean))] as string[];
  if (variantNames.length) opts.push({ name: 'Variant', values: variantNames });
  const colors = [...new Set((product?.variants || []).flatMap((v: any) => v.colors || []).filter(Boolean))] as string[];
  if (colors.length) opts.push({ name: 'Color', values: colors });
  return opts;
}

function findMatchingVariant(product: Product, selections: Record<string, string>): any {
  if (!product?.variants?.length) return null;
  if (product.options?.length) {
    return product.variants.find((v: any) =>
      Object.keys(selections).every(k => v.combination?.[k] === selections[k])
    ) ?? null;
  }
  const variantName = selections['Variant'];
  const color = selections['Color'];
  return product.variants.find((v: any) =>
    (!variantName || v.variantName === variantName) &&
    (!color || v.colors?.includes(color))
  ) ?? null;
}

type View = 'home' | 'detail' | 'cart' | 'payment';
type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'brand' | 'featured';
type PriceRange = 'all' | 'under500' | '500-1000' | '1000-3000' | 'over3000';

/* ─── Dropdown Filter Component ─────────────────────────────────── */
function FilterDropdown({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 pl-5 pr-4 py-2.5 rounded-full border text-sm transition-all",
          "bg-white hover:border-[#3d5a3e]/30",
          open ? "border-[#3d5a3e]/40 shadow-sm" : "border-[#1a1d2e]/10"
        )}
      >
        <span className="flex flex-col items-start">
          <span className="text-[10px] text-[#1a1d2e]/40 font-medium leading-none">{label}</span>
          <span className="text-[#1a1d2e] font-bold text-[13px] leading-tight">{selectedLabel}</span>
        </span>
        <ChevronDown size={14} className={cn("text-[#1a1d2e]/30 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl border border-[#1a1d2e]/8 shadow-xl z-50 min-w-[180px] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full text-left px-5 py-2.5 text-sm transition-colors",
                value === opt.value
                  ? "text-[#3d5a3e] font-bold bg-[#3d5a3e]/5"
                  : "text-[#1a1d2e]/70 hover:bg-[#1a1d2e]/3 font-medium"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Shop() {
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeBrand, setActiveBrand] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // N-Dimensional Option Selections
  const [selections, setSelections] = useState<Record<string, string>>({});

  const [customer, setCustomer] = useState<any>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [authStatus, setAuthStatus] = useState<'idle' | 'verifying' | 'logged_in' | 'guest'>('idle');
  const liffLock = useRef(false);

  // Load shop info and init LIFF
  useEffect(() => {
    const url = new URL(window.location.href);
    const hasParams = url.searchParams.has('code') || url.searchParams.has('liff.state') || window.location.hash.includes('access_token');
    
    const cached = localStorage.getItem('liff_profile');
    if (cached) {
      try {
        setCustomer(JSON.parse(cached));
        setAuthStatus('logged_in');
      } catch (e) { localStorage.removeItem('liff_profile'); }
    } else if (hasParams) {
      setAuthStatus('verifying');
    }

    const initShop = async () => {
      try {
        const infoRes = await fetch('/api/shop-info', { cache: 'no-store' });
        const data = await infoRes.json();
        setShopInfo(data);

        if (data.liffId && !liffLock.current) {
          liffLock.current = true;
          try {
            if (!cached) setAuthStatus('verifying');
            await liff.init({ liffId: data.liffId, withLoginOnExternalBrowser: true });
            if (liff.isLoggedIn()) {
              try {
                const profile = await liff.getProfile();
                setCustomer(profile);
                localStorage.setItem('liff_profile', JSON.stringify(profile));
                setAuthStatus('logged_in');
              } catch (pErr) {
                const token = liff.getDecodedIDToken();
                if (token) {
                  const p = { userId: token.sub, displayName: token.name || "Member", pictureUrl: token.picture };
                  setCustomer(p);
                  localStorage.setItem('liff_profile', JSON.stringify(p));
                  setAuthStatus('logged_in');
                } else { setAuthStatus('guest'); }
              }
            } else {
              setAuthStatus('guest');
              localStorage.removeItem('liff_profile');
              if (liff.isInClient() && !hasParams) {
                liff.login({ redirectUri: window.location.origin + '/shop' });
              }
            }
          } catch (liffErr) { setAuthStatus('guest'); }
        }
      } catch (err) { console.error(err); }
    };
    initShop();
    
    fetch('/api/products')
      .then(r => r.json())
      .then(data => setProducts(Array.isArray(data) ? data.filter((p: any) => p.isActive !== false) : []));
  }, []);

  const brands = useMemo(() => {
    const counts: Record<string, number> = { 'All': products.length };
    products.forEach(p => {
      const b = p.brand || 'Other';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [products]);

  const categories = useMemo(() => {
    const filteredByBrand = products.filter(p => activeBrand === 'All' || p.brand === activeBrand);
    const counts: Record<string, number> = { 'All': filteredByBrand.length };
    filteredByBrand.forEach(p => {
      p.categories?.forEach((c: string) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [products, activeBrand]);

  const filteredAndSorted = useMemo(() => {
    let result = products.filter(p => {
      const matchBrand = activeBrand === 'All' || p.brand === activeBrand;
      const matchCat = activeCategory === 'All' || p.categories?.includes(activeCategory);
      const matchSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Price range filter
      let matchPrice = true;
      if (priceRange !== 'all') {
        const price = p.price || 0;
        switch (priceRange) {
          case 'under500': matchPrice = price < 500; break;
          case '500-1000': matchPrice = price >= 500 && price <= 1000; break;
          case '1000-3000': matchPrice = price >= 1000 && price <= 3000; break;
          case 'over3000': matchPrice = price > 3000; break;
        }
      }
      
      return matchBrand && matchCat && matchSearch && matchPrice;
    });

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => b._id.localeCompare(a._id));
        break;
      case 'price-asc':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'brand':
        result.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
        break;
      default:
        break;
    }
    return result;
  }, [products, activeBrand, activeCategory, searchQuery, sortBy, priceRange]);

  // Derived option groups for selected product
  const productOptions = useMemo(() => {
    return selectedProduct ? getProductOptions(selectedProduct) : [];
  }, [selectedProduct]);

  const productImages = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.images?.length ? selectedProduct.images : (selectedProduct.imageUrl ? [selectedProduct.imageUrl] : []);
  }, [selectedProduct]);

  const displayImage = useMemo(() => {
    if (selectedVariant?.imageUrl) return selectedVariant.imageUrl;
    return productImages[activeImgIdx] ?? productImages[0] ?? null;
  }, [selectedVariant, productImages, activeImgIdx]);

  // Update matched variant whenever selections change
  useEffect(() => {
    if (!selectedProduct) return;
    const match = findMatchingVariant(selectedProduct, selections);
    setSelectedVariant(match || null);
  }, [selections, selectedProduct]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const shippingFee = (() => {
    const s = shopInfo?.shipping;
    if (!s || s.payer !== 'customer') return 0;
    if (s.freeThreshold?.enabled && cartTotal >= s.freeThreshold.amount) return 0;
    return s.defaultCost || 0;
  })();
  const orderTotal = cartTotal + shippingFee;

  const addToCart = useCallback(() => {
    if (!selectedProduct) return;
    const price = selectedVariant?.price ?? selectedProduct.price;
    const variantLabel = Object.values(selections).filter(Boolean).join(' · ') || undefined;
    const key = selectedProduct._id + (variantLabel || '');
    setCart(prev => {
      const existing = prev.find(i => i.productId + (i.variantLabel || '') === key);
      if (existing) return prev.map(i => i.productId + (i.variantLabel || '') === key ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { productId: selectedProduct._id, name: selectedProduct.name, price, variantLabel, qty, imageUrl: selectedProduct.imageUrl }];
    });
    setView('home');
    setIsCartOpen(true);
    setSelections({});
    setSelectedVariant(null);
    setQty(1);
  }, [selectedProduct, selectedVariant, selections, qty]);

  const handleConfirmOrder = async () => {
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.origin + '/shop' }); return; }
    setIsOrdering(true);
    try {
      const res = await fetch('/api/shop-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: customer?.userId,
          platform: 'line',
          displayName: customer?.displayName,
          pictureUrl: customer?.pictureUrl,
          items: cart,
          totalTHB: orderTotal,
          shipCostTHB: shippingFee
        })
      });
      if (res.ok) {
        const orderData = await res.json();
        setCurrentOrder(orderData);
        setCart([]);
        setIsCartOpen(false);
        setView('payment');
      } else { alert("Failed to place order."); }
    } catch { alert("Error connecting to server."); }
    finally { setIsOrdering(false); }
  };

  /* ─── Loading State ─────────────────────────────────────────────── */
  if (!shopInfo) return (
    <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#3d5a3e]/20 border-t-[#3d5a3e] rounded-full animate-spin" />
    </div>
  );

  /* ─── Determine first variant color dot for a product ─────────── */
  const getVariantDot = (p: Product) => {
    const colors = (p.variants || []).flatMap((v: any) => v.colors || []).filter(Boolean);
    if (!colors.length) return null;
    const colorMap: Record<string, string> = {
      'black': '#1a1d2e', 'white': '#ffffff', 'red': '#c44b4b', 'blue': '#4b6bc4',
      'green': '#4b8c4b', 'pink': '#d4a0a0', 'beige': '#c8b89a', 'gray': '#8b8b8b',
      'grey': '#8b8b8b', 'navy': '#2c3e6b', 'brown': '#8b6b4b', 'cream': '#e8dcc8',
    };
    const c = colors[0].toLowerCase();
    return colorMap[c] || '#c8b89a';
  };

  const isOutOfStock = (p: Product) => {
    if (p.stock === 0) return true;
    if (p.trackInventory && p.stock !== undefined && p.stock <= 0) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#f0ede8] text-[#1a1d2e] font-sans selection:bg-[#3d5a3e]/15">

      {/* ═══ HEADER ═══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#f0ede8]/92 backdrop-blur-xl border-b border-[#1a1d2e]/6">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto px-5 sm:px-8 py-3 sm:py-4">

          {/* Logo / Brand */}
          <button onClick={() => setView('home')} className="flex items-center gap-2.5 min-w-0">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1a1d2e] leading-none">
                {shopInfo.name}
              </span>
            </div>
          </button>

          {/* Center Nav (desktop) */}
          <nav className="hidden lg:flex items-center gap-8">
            <button onClick={() => setView('home')} className="text-sm font-bold text-[#1a1d2e] underline underline-offset-4 decoration-[#3d5a3e] decoration-2">Shop</button>
            <span className="text-sm font-medium text-[#1a1d2e]/35 cursor-default">Collections</span>
            <span className="text-sm font-medium text-[#1a1d2e]/35 cursor-default flex items-center gap-1">Explore <ArrowRight size={12} /></span>
            <span className="text-[#1a1d2e]/15 text-lg leading-none">•••</span>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex items-center gap-1.5 text-[#1a1d2e]/70 hover:text-[#1a1d2e] transition-colors"
            >
              <Search size={18} />
              <span className="hidden sm:inline text-sm font-medium">Search</span>
            </button>

            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 text-[#1a1d2e]/70 hover:text-[#1a1d2e] transition-colors"
            >
              <ShoppingBag size={18} />
              <span className="text-sm font-bold">Cart {cartCount > 0 && cartCount}</span>
            </button>

            {/* Account */}
            {customer ? (
              <div className="flex items-center gap-2">
                {customer.pictureUrl ? (
                  <img src={customer.pictureUrl} className="w-8 h-8 rounded-full border border-[#1a1d2e]/10 object-cover" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1a1d2e]/5 border border-[#1a1d2e]/10 flex items-center justify-center">
                    <User size={14} className="text-[#1a1d2e]/40" />
                  </div>
                )}
                <span className="hidden sm:inline text-sm font-medium text-[#1a1d2e]/70 truncate max-w-[100px]">{customer.displayName}</span>
              </div>
            ) : (
              <button
                onClick={() => liff.login()}
                className="flex items-center gap-1.5 text-[#1a1d2e]/70 hover:text-[#1a1d2e] transition-colors"
              >
                <User size={18} />
                <span className="hidden sm:inline text-sm font-medium">My Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Search bar (expandable) */}
        {searchOpen && (
          <div className="border-t border-[#1a1d2e]/5 px-5 sm:px-8 py-3 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="max-w-[1400px] mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a1d2e]/30" size={18} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-white border border-[#1a1d2e]/10 rounded-xl pl-11 pr-10 py-3 text-sm text-[#1a1d2e] placeholder-[#1a1d2e]/25 focus:border-[#3d5a3e]/40 outline-none transition-all"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1a1d2e]/30 hover:text-[#1a1d2e]/60">
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══ HOME VIEW ════════════════════════════════════════════════ */}
      {view === 'home' && (
        <main className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-32">

          {/* Hero heading */}
          <div className="mb-8 sm:mb-10">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold text-[#1a1d2e] leading-[1.1] tracking-tight max-w-3xl">
              {shopInfo.tagline || "The Curated Merchant Showcase"}
            </h2>
            <p className="text-[#1a1d2e]/50 text-base sm:text-lg mt-3 max-w-2xl leading-relaxed font-medium">
              {shopInfo.description || "Explore a diverse selection of high-quality goods, sourced and sold by verified independent merchants. Discover unique and essential products for every lifestyle. Reliable. Authentic. Unique."}
            </p>
          </div>

          {/* Filter Dropdowns Row */}
          <div className="flex flex-wrap gap-3 mb-10 sm:mb-12">
            <FilterDropdown
              label="Category"
              value={activeCategory}
              options={categories.map(c => ({ value: c.name, label: c.name }))}
              onChange={setActiveCategory}
            />
            <FilterDropdown
              label="Brand"
              value={activeBrand}
              options={brands.map(b => ({ value: b.name, label: b.name }))}
              onChange={(val) => { setActiveBrand(val); setActiveCategory('All'); }}
            />
            <FilterDropdown
              label="Price"
              value={priceRange}
              options={[
                { value: 'all', label: 'All Prices' },
                { value: 'under500', label: 'Under ฿500' },
                { value: '500-1000', label: '฿500 – ฿1,000' },
                { value: '1000-3000', label: '฿1,000 – ฿3,000' },
                { value: 'over3000', label: 'Over ฿3,000' },
              ]}
              onChange={(val) => setPriceRange(val as PriceRange)}
            />
          </div>

          {/* Product Grid */}
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-24">
              <Package size={48} className="mx-auto mb-4 text-[#1a1d2e]/10" />
              <p className="font-bold text-[#1a1d2e]/35 text-sm">No items match your selection</p>
              <button
                onClick={() => { setActiveBrand('All'); setActiveCategory('All'); setSearchQuery(''); setPriceRange('all'); }}
                className="mt-4 text-[#3d5a3e] text-sm font-bold underline underline-offset-4"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* First row: 2 large cards */}
              {filteredAndSorted.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filteredAndSorted.slice(0, 2).map((p: Product) => (
                    <button
                      key={p._id}
                      onClick={() => { setSelectedProduct(p); setSelections({}); setQty(1); setActiveImgIdx(0); setView('detail'); }}
                      className="group text-left w-full"
                    >
                      <div className="relative">
                        {/* Variant color dot */}
                        {getVariantDot(p) && (
                          <div className="flex justify-center mb-2">
                            <div className="w-3 h-3 rounded-full border border-[#1a1d2e]/10" style={{ backgroundColor: getVariantDot(p)! }} />
                          </div>
                        )}
                        <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#e4e0db] relative">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10">
                              <Package size={48} />
                            </div>
                          )}
                          {/* Out of stock badge */}
                          {isOutOfStock(p) && (
                            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-[#1a1d2e]/70 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-[#1a1d2e]/5">
                              <Package size={12} />
                              Out of Stock
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3.5 px-0.5">
                        <p className="font-bold text-[15px] sm:text-base text-[#1a1d2e] leading-snug mb-0.5 group-hover:text-[#3d5a3e] transition-colors line-clamp-2">
                          {p.name}
                        </p>
                        {p.brand && (
                          <p className="text-[13px] text-[#1a1d2e]/40 font-medium">By {p.brand}</p>
                        )}
                        <p className="text-[#1a1d2e] font-extrabold text-base mt-1">
                          ฿{p.price?.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Remaining rows: 4-column grid */}
              {filteredAndSorted.length > 2 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {filteredAndSorted.slice(2).map((p: Product) => (
                    <button
                      key={p._id}
                      onClick={() => { setSelectedProduct(p); setSelections({}); setQty(1); setActiveImgIdx(0); setView('detail'); }}
                      className="group text-left w-full"
                    >
                      <div className="relative">
                        {getVariantDot(p) && (
                          <div className="flex justify-center mb-2">
                            <div className="w-2.5 h-2.5 rounded-full border border-[#1a1d2e]/10" style={{ backgroundColor: getVariantDot(p)! }} />
                          </div>
                        )}
                        <div className="aspect-square w-full rounded-2xl overflow-hidden bg-[#e4e0db] relative">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10">
                              <Package size={32} />
                            </div>
                          )}
                          {isOutOfStock(p) && (
                            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-[#1a1d2e]/70 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-[#1a1d2e]/5">
                              <Package size={10} />
                              Out of Stock
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 px-0.5">
                        <p className="font-bold text-sm text-[#1a1d2e] leading-snug mb-0.5 group-hover:text-[#3d5a3e] transition-colors line-clamp-2">
                          {p.name}
                        </p>
                        {p.brand && (
                          <p className="text-[12px] text-[#1a1d2e]/40 font-medium">By {p.brand}</p>
                        )}
                        <p className="text-[#1a1d2e] font-extrabold text-sm mt-0.5">
                          ฿{p.price?.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ═══ DETAIL VIEW ══════════════════════════════════════════════ */}
      {view === 'detail' && selectedProduct && (
        <div className="max-w-[1400px] mx-auto min-h-screen bg-[#f0ede8] animate-in fade-in slide-in-from-bottom-4 duration-500 pb-40">
          {/* Back bar */}
          <div className="sticky top-16 sm:top-[60px] z-40 bg-[#f0ede8]/85 backdrop-blur-md px-5 sm:px-8 py-3 flex items-center justify-between">
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-sm font-bold text-[#1a1d2e]/60 hover:text-[#1a1d2e] transition-colors">
              <ChevronLeft size={18} />
              <span>Back</span>
            </button>
            <div className="w-10" />
          </div>

          <div className="lg:flex lg:gap-12 xl:gap-16 lg:px-8 lg:pt-6">
            {/* Images */}
            <div className="px-5 mb-8 lg:w-1/2 lg:flex lg:flex-col lg:items-end">
              <div className="rounded-2xl overflow-hidden w-full aspect-square lg:max-w-[520px] bg-[#e4e0db]">
                {displayImage ? (
                  <img src={displayImage} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10">
                    <Package size={80} />
                  </div>
                )}
              </div>
              {productImages.length > 1 && (
                <div className="flex gap-2 mt-3 lg:max-w-[520px] overflow-x-auto pb-1">
                  {productImages.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImgIdx(i)}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all",
                        !selectedVariant?.imageUrl && activeImgIdx === i
                          ? "border-[#3d5a3e]"
                          : "border-transparent opacity-50 hover:opacity-100"
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="px-5 sm:px-8 lg:w-1/2 lg:flex lg:flex-col lg:justify-center">
              {selectedProduct.brand && (
                <p className="text-[13px] font-semibold text-[#1a1d2e]/40 mb-2">By {selectedProduct.brand}</p>
              )}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1a1d2e] mb-4 tracking-tight leading-tight">
                {selectedProduct.name}
              </h2>
              {selectedProduct.description && (
                <p className="text-[#1a1d2e]/50 text-base sm:text-lg leading-relaxed mb-6 lg:mb-8 font-medium max-w-xl">
                  {selectedProduct.description}
                </p>
              )}
              <div className="flex items-baseline gap-2 mb-8 lg:mb-10">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#1a1d2e]">
                  ฿{(selectedVariant?.price ?? selectedProduct.price)?.toLocaleString()}
                </span>
              </div>

              {/* N-Dimensional Option Selector */}
              {productOptions.map((option, i) => (
                <div key={option.name} className="mb-6 text-left">
                  <p className="text-xs font-bold text-[#1a1d2e]/35 uppercase tracking-wider mb-3">
                    {option.name}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {option.values.map(val => (
                      <button
                        key={val}
                        onClick={() => setSelections(prev => ({ ...prev, [option.name]: val }))}
                        className={cn(
                          "px-5 py-2.5 rounded-xl text-sm font-bold border transition-all",
                          selections[option.name] === val
                            ? "bg-[#1a1d2e] border-[#1a1d2e] text-white"
                            : "bg-white border-[#1a1d2e]/10 text-[#1a1d2e]/60 hover:border-[#3d5a3e]/30 hover:text-[#1a1d2e]"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className="flex items-center justify-between bg-white rounded-2xl p-4 lg:p-5 mb-8 lg:mb-10 lg:max-w-sm border border-[#1a1d2e]/8">
                <span className="text-xs font-bold text-[#1a1d2e]/40 uppercase tracking-wider">Quantity</span>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e]/50 hover:bg-[#f0ede8] transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-extrabold text-xl text-[#1a1d2e] w-6 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-9 h-9 rounded-full border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e]/50 hover:bg-[#f0ede8] transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Desktop Add-to-cart */}
              <div className="hidden lg:block lg:max-w-sm">
                <button
                  onClick={addToCart}
                  disabled={productOptions.some(o => !selections[o.name])}
                  className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <ShoppingBag size={20} />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>

          {/* Mobile fixed Add-to-cart */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#f0ede8] via-[#f0ede8] to-transparent z-40">
            <div className="max-w-lg mx-auto">
              <button
                onClick={addToCart}
                disabled={productOptions.some(o => !selections[o.name])}
                className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-4 rounded-2xl font-bold text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
              >
                <ShoppingBag size={18} />
                {productOptions.some(o => !selections[o.name])
                  ? 'Select options'
                  : `Add to Cart · ฿${((selectedVariant?.price ?? selectedProduct.price) * qty).toLocaleString()}`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PAYMENT VIEW ═════════════════════════════════════════════ */}
      {view === 'payment' && currentOrder && (
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-32 text-center animate-in zoom-in-95 duration-700">
          <div className="w-16 h-16 bg-[#3d5a3e]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#3d5a3e]/15">
            <CheckCircle className="text-[#3d5a3e]" size={32} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1d2e] mb-2 tracking-tight">Order Confirmed</h2>
          <p className="text-[#1a1d2e]/50 text-sm sm:text-base font-medium mb-10">
            Thank you for your order. Please complete the payment below.
          </p>
          <div className="bg-white rounded-3xl p-8 sm:p-12 inline-block mb-10 border border-[#1a1d2e]/6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1d2e] text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
              Secure Payment
            </div>
            <img
              src={`/api/qr?amount=${currentOrder.soldTHB}&ref=${currentOrder._id}${shopInfo?.merchantId ? `&merchantId=${shopInfo.merchantId}` : ''}`}
              alt="PromptPay QR"
              className="w-56 h-56 sm:w-72 sm:h-72 mx-auto object-contain mb-6"
            />
            <div className="text-[#1a1d2e] font-extrabold text-3xl sm:text-4xl">
              ฿{currentOrder.soldTHB?.toLocaleString()}
            </div>
            <p className="text-xs font-bold text-[#1a1d2e]/30 uppercase tracking-widest mt-3">
              REF: {currentOrder._id.slice(-8).toUpperCase()}
            </p>
          </div>
          <br />
          <button
            onClick={() => setView('home')}
            className="w-full max-w-md mx-auto bg-white border border-[#1a1d2e]/10 text-[#1a1d2e] py-4 rounded-2xl font-bold text-sm hover:bg-[#1a1d2e]/3 transition-all flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* ═══ CART MODAL ═══════════════════════════════════════════════ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:justify-center lg:items-center">
          <div className="absolute inset-0 bg-[#0a0b10]/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative bg-white border-t lg:border border-[#1a1d2e]/6 rounded-t-3xl lg:rounded-3xl w-full lg:max-w-2xl max-h-[90vh] lg:max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-400 lg:zoom-in-95">
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-10 h-1 bg-[#1a1d2e]/10 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[#1a1d2e]/6">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1a1d2e]">Your Cart</h3>
              <button onClick={() => setIsCartOpen(false)} className="w-9 h-9 rounded-full bg-[#1a1d2e]/5 flex items-center justify-center text-[#1a1d2e]/40 hover:text-[#1a1d2e]/70 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-5 space-y-5">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag size={48} className="mx-auto mb-3 text-[#1a1d2e]/8" />
                  <p className="font-bold text-[#1a1d2e]/25 text-sm">Your cart is empty</p>
                </div>
              ) : cart.map((item, idx) => (
                <div key={idx} className="flex gap-4 sm:gap-6 items-center">
                  <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-[#e4e0db] flex-shrink-0 border border-[#1a1d2e]/5">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10">
                        <Package size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-bold text-sm sm:text-base text-[#1a1d2e] truncate leading-snug mb-0.5">{item.name}</p>
                    {item.variantLabel && (
                      <p className="text-[11px] sm:text-xs font-medium text-[#1a1d2e]/40">{item.variantLabel}</p>
                    )}
                    <p className="text-[#1a1d2e] font-extrabold text-sm sm:text-base mt-0.5">
                      ฿{(item.price * item.qty).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="flex items-center gap-3 bg-[#f0ede8] rounded-xl px-2.5 py-1.5 border border-[#1a1d2e]/5">
                      <button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it))} className="text-[#1a1d2e]/40 hover:text-[#1a1d2e]">
                        <Minus size={13} />
                      </button>
                      <span className="text-sm font-bold text-[#1a1d2e] w-4 text-center">{item.qty}</span>
                      <button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it))} className="text-[#1a1d2e]/40 hover:text-[#1a1d2e]">
                        <Plus size={13} />
                      </button>
                    </div>
                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400/40 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer totals & checkout */}
            {cart.length > 0 && (
              <div className="px-6 sm:px-8 pt-5 pb-8 bg-[#faf8f5] border-t border-[#1a1d2e]/6 rounded-b-3xl">
                <div className="space-y-2 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#1a1d2e]/40 font-bold text-xs uppercase tracking-wider">Subtotal</span>
                    <span className="text-[#1a1d2e] font-extrabold text-base">฿{cartTotal.toLocaleString()}</span>
                  </div>
                  {shippingFee > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#1a1d2e]/40 font-bold text-xs uppercase tracking-wider">Shipping</span>
                      <span className="text-[#1a1d2e] font-extrabold text-base">฿{shippingFee.toLocaleString()}</span>
                    </div>
                  )}
                  {shippingFee === 0 && shopInfo?.shipping?.payer === 'customer' && shopInfo?.shipping?.freeThreshold?.enabled && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#1a1d2e]/40 font-bold text-xs uppercase tracking-wider">Shipping</span>
                      <span className="text-emerald-600 font-extrabold text-base">Free</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-[#1a1d2e]/8">
                    <span className="text-[#1a1d2e]/40 font-bold text-xs uppercase tracking-wider">Total</span>
                    <span className="text-[#1a1d2e] font-extrabold text-2xl sm:text-3xl">฿{orderTotal.toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isOrdering}
                  className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-4 rounded-2xl font-bold text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
                >
                  {isOrdering ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirm Order
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

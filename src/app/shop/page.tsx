"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, User, Search, X, CheckCircle, ArrowRight, Package, Sparkles, SlidersHorizontal, ArrowUpDown, Clock, Tag, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import liff from '@line/liff';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

type CartItem = { productId: string; name: string; price: number; variantLabel?: string; qty: number; imageUrl?: string; };
type Product = any;
type View = 'home' | 'detail' | 'cart' | 'payment';
type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'brand' | 'featured';

export default function Shop() {
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBrand, setActiveBrand] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  
  // 2-Tier Selection States
  const [selThickness, setSelThickness] = useState<string>('');
  const [selColor, setSelColor] = useState<string>('');

  const [customer, setCustomer] = useState<any>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [qty, setQty] = useState(1);
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
      return matchBrand && matchCat && matchSearch;
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
  }, [products, activeBrand, activeCategory, searchQuery, sortBy]);

  // Derived Variant Selection
  const availableThicknesses = useMemo<string[]>(() => {
    if (!selectedProduct?.variants) return [];
    return Array.from(new Set(selectedProduct.variants.map((v: any) => String(v.thickness)))).filter(Boolean) as string[];
  }, [selectedProduct]);

  const availableColors = useMemo<string[]>(() => {
    if (!selectedProduct?.variants || !selThickness) return [];
    const matching = selectedProduct.variants.filter((v: any) => v.thickness === selThickness);
    const colors = new Set<string>();
    matching.forEach((v: any) => v.colors?.forEach((c: any) => colors.add(String(c))));
    return Array.from(colors) as string[];
  }, [selectedProduct, selThickness]);

  // Update selected variant when thickness/color changes
  useEffect(() => {
    if (!selectedProduct?.variants) return;
    const match = selectedProduct.variants.find((v: any) => 
      v.thickness === selThickness && v.colors?.includes(selColor)
    );
    setSelectedVariant(match || null);
  }, [selThickness, selColor, selectedProduct]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = useCallback(() => {
    if (!selectedProduct) return;
    const price = selectedVariant?.price ?? selectedProduct.price;
    const variantLabel = selectedVariant ? [selectedVariant.thickness, selColor].filter(Boolean).join(' · ') : undefined;
    const key = selectedProduct._id + (variantLabel || '');
    setCart(prev => {
      const existing = prev.find(i => i.productId + (i.variantLabel || '') === key);
      if (existing) return prev.map(i => i.productId + (i.variantLabel || '') === key ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { productId: selectedProduct._id, name: selectedProduct.name, price, variantLabel, qty, imageUrl: selectedProduct.imageUrl }];
    });
    setView('home');
    setIsCartOpen(true);
    setSelThickness('');
    setSelColor('');
    setSelectedVariant(null);
    setQty(1);
  }, [selectedProduct, selectedVariant, selColor, qty]);

  const handleConfirmOrder = async () => {
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.origin + '/shop' }); return; }
    setIsOrdering(true);
    try {
      const res = await fetch('/api/shop-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: customer?.userId,
          displayName: customer?.displayName,
          pictureUrl: customer?.pictureUrl,
          items: cart,
          totalTHB: cartTotal
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

  if (!shopInfo) return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1a1d2e] font-sans selection:bg-[#d4af37]/20">

      {/* LUXURY HEADER */}
      <header className="sticky top-0 z-50 bg-[#fdfbf7]/90 backdrop-blur-xl border-b border-[#1a1d2e]/5 px-4 sm:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3 min-w-[120px] lg:min-w-[200px]">
            <div className="relative flex-shrink-0">
              {customer?.pictureUrl
                ? <img src={customer.pictureUrl} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#d4af37] object-cover shadow-sm" alt="" />
                : <button onClick={() => liff.login()} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1a1d2e]/5 border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e]/40"><User size={16} /></button>
              }
              {authStatus === 'verifying' && <div className="absolute inset-0 rounded-full border-2 border-t-[#d4af37] border-transparent animate-spin" />}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#d4af37] mb-0.5">{authStatus === 'verifying' ? "Verifying Session" : customer ? "Verified Member" : "Guest Account"}</span>
              {authStatus === 'verifying' ? <span className="text-xs font-bold animate-pulse">Syncing...</span> : customer ? <span className="text-xs font-bold truncate max-w-[150px]">{customer.displayName}</span> : <button onClick={() => liff.login()} className="text-xs font-bold">Sign in</button>}
            </div>
          </div>

          <div className="flex flex-col items-center cursor-pointer" onClick={() => setView('home')}>
             <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-[#1a1d2e] tracking-tight italic">{shopInfo.name}</h1>
          </div>

          <div className="flex items-center justify-end min-w-[120px] lg:min-w-[200px]">
            <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 sm:gap-3 bg-[#1a1d2e] text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-full sm:rounded-2xl transition-all active:scale-95 shadow-lg group">
              <ShoppingBag size={16} className="text-[#d4af37] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-sm font-black tracking-tight">฿{cartTotal.toLocaleString()}</span>
              {cartCount > 0 && <span className="bg-[#d4af37] text-[#1a1d2e] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center -mr-1">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* HOME VIEW */}
      {view === 'home' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-32">
          {/* CONTROL CENTER */}
          <div className="mb-10 lg:mb-16">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-10">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                  <h2 className="text-4xl sm:text-6xl font-serif font-black text-[#1a1d2e] tracking-tight italic">Shop</h2>
                  {activeBrand !== 'All' && (
                    <div className="flex items-center gap-2 text-[#d4af37]">
                      <ChevronRight size={24} className="mt-2" />
                      <span className="text-2xl sm:text-4xl font-serif font-black mt-2 italic">{activeBrand}</span>
                    </div>
                  )}
                </div>
                <p className="text-[#8b92ad] text-sm font-medium">Curated boutique selection from Seoul, Korea</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-[300px] lg:w-[350px] group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1a1d2e]/30 group-focus-within:text-[#d4af37] transition-colors" size={18} />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search collection..."
                    className="w-full bg-white border border-[#1a1d2e]/10 rounded-full sm:rounded-2xl pl-12 pr-5 py-3.5 text-sm text-[#1a1d2e] placeholder-[#1a1d2e]/20 shadow-sm focus:border-[#d4af37] outline-none transition-all"
                  />
                </div>

                <div className="relative group min-w-[180px]">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1a1d2e]/30 pointer-events-none"><ArrowUpDown size={16} /></div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full bg-white border border-[#1a1d2e]/10 rounded-full sm:rounded-2xl pl-12 pr-10 py-3.5 text-sm text-[#1a1d2e] appearance-none shadow-sm focus:border-[#d4af37] outline-none transition-all cursor-pointer font-bold"
                  >
                    <option value="featured">Featured</option>
                    <option value="newest">Newest Arrival</option>
                    <option value="brand">Brand (A-Z)</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#1a1d2e]/20"><SlidersHorizontal size={14} /></div>
                </div>
              </div>
            </div>

            {/* BRAND SELECTION */}
            <div className="mb-6">
              <p className="text-[10px] font-black text-[#1a1d2e]/20 uppercase tracking-widest mb-4 ml-1">Boutique Brands</p>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {brands.map(b => (
                  <button
                    key={b.name}
                    onClick={() => { setActiveBrand(b.name); setActiveCategory('All'); }}
                    className={cn(
                      "whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-black transition-all border flex-shrink-0 uppercase tracking-widest flex items-center gap-2 outline-none focus:ring-2 focus:ring-[#d4af37]/20",
                      activeBrand === b.name
                        ? "bg-[#1a1d2e] border-[#1a1d2e] text-white shadow-xl shadow-[#1a1d2e]/20 scale-105"
                        : "bg-white border-[#1a1d2e]/10 text-[#1a1d2e]/40 hover:border-[#d4af37]/40 hover:text-[#1a1d2e]"
                    )}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* CATEGORY SELECTION */}
            <div className="mb-6">
              <p className="text-[10px] font-black text-[#1a1d2e]/20 uppercase tracking-widest mb-4 ml-1">Categories {activeBrand !== 'All' ? `within ${activeBrand}` : ''}</p>
              <div className="flex gap-3 overflow-x-auto py-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={cn(
                      "whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-black transition-all border flex-shrink-0 uppercase tracking-widest flex items-center gap-2 outline-none focus:ring-2 focus:ring-[#d4af37]/20",
                      activeCategory === cat.name
                        ? "bg-[#1a1d2e] border-[#1a1d2e] text-white shadow-xl shadow-[#1a1d2e]/20 scale-105"
                        : "bg-white border-[#1a1d2e]/10 text-[#1a1d2e]/40 hover:border-[#d4af37]/40 hover:text-[#1a1d2e]"
                    )}
                  >
                    {cat.name}
                    <span className={cn(
                      "w-5 h-5 rounded-full text-[9px] flex items-center justify-center",
                      activeCategory === cat.name ? "bg-[#d4af37] text-[#1a1d2e]" : "bg-[#1a1d2e]/5 text-[#1a1d2e]/30"
                    )}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SQUARE MODERNIST GRID */}
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-20 lg:py-40">
              <Package size={48} className="mx-auto mb-4 text-[#1a1d2e]/10" />
              <p className="font-bold text-[#1a1d2e]/40 uppercase tracking-widest text-xs">No Items Match Your Selection</p>
              <button onClick={() => {setActiveBrand('All'); setActiveCategory('All'); setSearchQuery('');}} className="mt-4 text-[#d4af37] text-xs font-black uppercase underline underline-offset-4">Clear Selection</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-12">
              {filteredAndSorted.map((p: Product) => (
                <button
                  key={p._id}
                  onClick={() => { setSelectedProduct(p); setSelThickness(''); setSelColor(''); setQty(1); setView('detail'); }}
                  className="group text-left active:scale-[0.98] transition-all"
                >
                  <div className="aspect-square rounded-[32px] overflow-hidden bg-[#1a1d2e]/5 mb-4 relative shadow-sm group-hover:shadow-2xl transition-all border border-transparent group-hover:border-[#d4af37]/20">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={32} /></div>}
                    {p.brand && <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-[#1a1d2e] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-[#1a1d2e]/5">{p.brand}</span>}
                  </div>
                  <div className="px-2">
                    <p className="font-serif font-black text-xl text-[#1a1d2e] leading-tight mb-1 group-hover:text-[#d4af37] transition-colors line-clamp-1">{p.name}</p>
                    <p className="text-[#d4af37] font-black text-base tracking-tight">฿{p.price?.toLocaleString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      )}

      {/* DETAIL VIEW */}
      {view === 'detail' && selectedProduct && (
        <div className="max-w-7xl mx-auto min-h-screen bg-[#fdfbf7] animate-in fade-in slide-in-from-bottom-6 duration-700 pb-40">
          <div className="sticky top-16 sm:top-20 z-40 bg-[#fdfbf7]/80 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
            <button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-[#1a1d2e]/5 flex items-center justify-center text-[#1a1d2e]"><ChevronLeft size={20} /></button>
            <div className="w-10" />
          </div>
          <div className="lg:flex lg:gap-16 lg:px-8 lg:pt-8">
            <div className="px-5 mb-10 lg:w-1/2 lg:flex lg:justify-end">
              <div className="rounded-[48px] overflow-hidden aspect-square bg-[#1a1d2e]/5 shadow-2xl border border-[#1a1d2e]/5 w-full lg:max-w-md">
                {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={80} /></div>}
              </div>
            </div>
            <div className="px-8 lg:w-1/2 lg:flex lg:flex-col lg:justify-center">
              <div className="flex items-center gap-2 mb-3 lg:mb-6"><div className="h-[1px] w-8 bg-[#d4af37]" /><p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.3em]">{selectedProduct.brand || "Boutique Selection"}</p></div>
              <h2 className="text-4xl sm:text-6xl font-serif font-black text-[#1a1d2e] mb-4 lg:mb-8 tracking-tight leading-none italic">{selectedProduct.name}</h2>
              {selectedProduct.description && <p className="text-[#8b92ad] text-base sm:text-xl leading-relaxed mb-8 lg:mb-12 font-medium max-w-xl text-left">{selectedProduct.description}</p>}
              <div className="flex items-end gap-3 mb-10 lg:mb-16"><span className="text-4xl sm:text-6xl font-black text-[#1a1d2e]">฿{(selectedVariant?.price ?? selectedProduct.price)?.toLocaleString()}</span><span className="text-xs font-bold text-[#8b92ad] mb-2 uppercase tracking-widest">Investment</span></div>
              
              {/* 2-TIER VARIANT SELECTOR */}
              {availableThicknesses.length > 0 && (
                <div className="mb-8 text-left">
                  <p className="text-[10px] font-black text-[#1a1d2e]/30 uppercase tracking-[0.2em] mb-4">1. Choose Thickness</p>
                  <div className="flex flex-wrap gap-3">
                    {availableThicknesses.map(t => (
                      <button 
                        key={t} 
                        onClick={() => { setSelThickness(t); setSelColor(''); }} 
                        className={cn("px-6 py-3 rounded-2xl text-[10px] sm:text-xs font-black border transition-all uppercase tracking-widest", selThickness === t ? "bg-[#1a1d2e] border-[#1a1d2e] text-white shadow-xl" : "bg-white border-[#1a1d2e]/10 text-[#1a1d2e]/40 hover:border-[#d4af37]/40")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selThickness && availableColors.length > 0 && (
                <div className="mb-10 lg:mb-14 animate-in fade-in slide-in-from-top-2 duration-500 text-left">
                  <p className="text-[10px] font-black text-[#1a1d2e]/30 uppercase tracking-[0.2em] mb-4">2. Choose Color</p>
                  <div className="flex flex-wrap gap-3">
                    {availableColors.map(c => (
                      <button 
                        key={c} 
                        onClick={() => setSelColor(c)} 
                        className={cn("px-6 py-3 rounded-2xl text-[10px] sm:text-xs font-black border transition-all uppercase tracking-widest", selColor === c ? "bg-[#1a1d2e] border-[#1a1d2e] text-white shadow-xl" : "bg-white border-[#1a1d2e]/10 text-[#1a1d2e]/40 hover:border-[#d4af37]/40")}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-[#1a1d2e]/5 rounded-3xl p-4 lg:p-6 mb-10 lg:mb-16 lg:max-w-md"><span className="text-[10px] font-black uppercase tracking-widest text-[#1a1d2e]/40">Quantity</span><div className="flex items-center gap-6 sm:gap-10"><button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e] hover:bg-white transition-all"><Minus size={14} /></button><span className="font-black text-lg sm:text-2xl text-[#1a1d2e]">{qty}</span><button onClick={() => setQty(q => q + 1)} className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e] hover:bg-white transition-all"><Plus size={14} /></button></div></div>
              <div className="hidden lg:block lg:max-w-md"><button onClick={addToCart} disabled={(availableThicknesses.length > 0 && !selThickness) || (availableColors.length > 0 && !selColor)} className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-6 rounded-[32px] font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"><ShoppingBag size={24} className="text-[#d4af37]" />ADD TO BAG</button></div>
            </div>
          </div>
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#fdfbf7] via-[#fdfbf7] to-transparent z-40">
            <div className="max-w-lg mx-auto"><button onClick={addToCart} disabled={(availableThicknesses.length > 0 && !selThickness) || (availableColors.length > 0 && !selColor)} className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-5 rounded-[24px] font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"><ShoppingBag size={20} className="text-[#d4af37]" />{(availableThicknesses.length > 0 && !selThickness) || (availableColors.length > 0 && !selColor) ? 'COMPLETE SELECTION' : `ADD TO BAG · ฿${((selectedVariant?.price ?? selectedProduct.price) * qty).toLocaleString()}`}</button></div>
          </div>
        </div>
      )}

      {/* PAYMENT & CART */}
      {view === 'payment' && currentOrder && (
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-32 text-center animate-in zoom-in-95 duration-700">
          <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-[#d4af37]/20"><CheckCircle className="text-[#d4af37]" size={40} /></div>
          <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#1a1d2e] mb-2 tracking-tight italic">Acquisition Confirmed</h2>
          <p className="text-[#8b92ad] text-sm sm:text-base font-medium mb-12 text-center">Thank you for your acquisition. Please complete the transfer below.</p>
          <div className="bg-white rounded-[48px] sm:rounded-[64px] p-10 sm:p-16 inline-block mb-12 shadow-2xl border border-[#1a1d2e]/5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1d2e] text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.3em]">Official Secure Portal</div>
            <img src={`/api/qr?amount=${currentOrder.soldTHB}&ref=${currentOrder._id}`} alt="PromptPay QR" className="w-64 h-64 sm:w-80 sm:h-80 mx-auto object-contain mb-6 sm:mb-10" />
            <div className="text-[#1a1d2e] font-black text-3xl sm:text-5xl tracking-tighter">฿{currentOrder.soldTHB?.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs font-black text-[#d4af37] uppercase tracking-widest mt-2 sm:mt-4">REF: {currentOrder._id.slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={() => setView('home')} className="w-full max-w-md mx-auto bg-[#1a1d2e]/5 text-[#1a1d2e] py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-[#1a1d2e]/10 transition-all flex items-center justify-center gap-2">Finish & Return <ArrowRight size={16} /></button>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:justify-center lg:items-center">
          <div className="absolute inset-0 bg-[#0a0b10]/80 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
          <div className="relative bg-white border-t lg:border border-[#1a1d2e]/5 rounded-t-[40px] lg:rounded-[48px] w-full lg:max-w-2xl max-h-[90vh] lg:h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-500 lg:zoom-in-95 shadow-2xl">
            <div className="flex justify-center pt-4 pb-2 lg:hidden"><div className="w-12 h-1.5 bg-[#1a1d2e]/10 rounded-full" /></div>
            <div className="flex items-center justify-between px-8 py-6 sm:py-8 border-b border-[#1a1d2e]/5"><h3 className="text-2xl sm:text-4xl font-serif font-black text-[#1a1d2e] italic">Your Selection</h3><button onClick={() => setIsCartOpen(false)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1a1d2e]/5 flex items-center justify-center text-[#1a1d2e]/40"><X size={20} /></button></div>
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">
              {cart.length === 0 ? <div className="text-center py-20 lg:py-40"><ShoppingBag size={64} className="mx-auto mb-4 text-[#1a1d2e]/5" /><p className="font-black text-[#1a1d2e]/20 uppercase tracking-widest text-xs">Collection is empty</p></div> : cart.map((item, idx) => (
                <div key={idx} className="flex gap-6 sm:gap-10 items-center">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[20px] sm:rounded-[32px] overflow-hidden bg-[#1a1d2e]/5 flex-shrink-0 border border-[#1a1d2e]/5 text-left">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={24} /></div>}</div>
                  <div className="flex-1 min-w-0 text-left"><p className="font-serif font-black text-lg sm:text-2xl text-[#1a1d2e] truncate leading-none mb-1 sm:mb-2">{item.name}</p>{item.variantLabel && <p className="text-[10px] sm:text-xs font-bold text-[#8b92ad] uppercase tracking-wider">{item.variantLabel}</p>}<p className="text-[#d4af37] font-black text-base sm:text-xl mt-1">฿{(item.price * item.qty).toLocaleString()}</p></div>
                  <div className="flex flex-col items-center gap-4"><div className="flex items-center gap-4 bg-[#1a1d2e]/5 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 border border-[#1a1d2e]/5"><button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it))} className="text-[#1a1d2e]/40 hover:text-[#1a1d2e]"><Minus size={14} /></button><span className="text-sm sm:text-lg font-black text-[#1a1d2e] w-4 text-center">{item.qty}</span><button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: it.qty + i.qty } : it))} className="text-[#1a1d2e]/40 hover:text-[#1a1d2e]"><Plus size={14} /></button></div><button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button></div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="px-8 pt-8 pb-12 bg-[#fdfbf7] border-t border-[#1a1d2e]/5 rounded-b-[48px]"><div className="flex justify-between items-center mb-8"><span className="text-[#1a1d2e]/40 font-black uppercase tracking-widest text-[10px] sm:text-xs">Total Investment</span><span className="text-[#1a1d2e] font-black text-3xl sm:text-5xl tracking-tighter">฿{cartTotal.toLocaleString()}</span></div><button onClick={handleConfirmOrder} disabled={isOrdering} className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-5 sm:py-6 rounded-[24px] sm:rounded-[32px] font-black text-base sm:text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">{isOrdering ? <div className="w-5 h-5 border-2 border-white/20 border-t-[#d4af37] rounded-full animate-spin" /> : <>CONFIRM ACQUISITION <ArrowRight size={18} className="text-[#d4af37]" /></>}</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

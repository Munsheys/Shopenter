"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, User, Search, X, CheckCircle, ArrowRight, Package, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import liff from '@line/liff';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

type CartItem = { productId: string; name: string; price: number; variantLabel?: string; qty: number; imageUrl?: string; };
type Product = any;
type View = 'home' | 'detail' | 'cart' | 'payment';

export default function Shop() {
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [authStatus, setAuthStatus] = useState<'idle' | 'verifying' | 'logged_in' | 'guest'>('idle');
  const liffInitialized = useRef(false);

  // Load shop info and init LIFF
  useEffect(() => {
    // Warm Cache: Pre-load customer from localStorage to prevent "Guest" flicker
    const cachedCustomer = localStorage.getItem('liff_profile');
    if (cachedCustomer) {
      try {
        setCustomer(JSON.parse(cachedCustomer));
        setAuthStatus('logged_in');
      } catch (e) { localStorage.removeItem('liff_profile'); }
    }

    fetch('/api/shop-info')
      .then(r => r.json())
      .then(async data => {
        setShopInfo(data);
        if (data.liffId && !liffInitialized.current) {
          liffInitialized.current = true;
          try {
            setAuthStatus('verifying');
            await liff.init({ liffId: data.liffId });
            
            if (liff.isLoggedIn()) {
              try {
                const profile = await liff.getProfile();
                setCustomer(profile);
                localStorage.setItem('liff_profile', JSON.stringify(profile));
                setAuthStatus('logged_in');
              } catch (pErr) {
                // Fallback: ID Token
                const token = liff.getDecodedIDToken();
                if (token) {
                  const p = { userId: token.sub, displayName: token.name || "Member", pictureUrl: token.picture };
                  setCustomer(p);
                  localStorage.setItem('liff_profile', JSON.stringify(p));
                  setAuthStatus('logged_in');
                } else {
                  setAuthStatus('guest');
                }
              }
            } else {
              setAuthStatus('guest');
              localStorage.removeItem('liff_profile');
              if (liff.isInClient()) {
                liff.login();
              }
            }
          } catch (err) {
            console.error("LIFF Init failed:", err);
            setAuthStatus('guest');
          }
        }
      });
    
    fetch('/api/products')
      .then(r => r.json())
      .then(data => setProducts(Array.isArray(data) ? data.filter((p: any) => p.isActive !== false) : []));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => p.categories?.forEach((c: string) => cats.add(c)));
    return ['All', ...Array.from(cats)];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'All' || p.categories?.includes(activeCategory);
      const matchSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = useCallback(() => {
    if (!selectedProduct) return;
    const price = selectedVariant?.price ?? selectedProduct.price;
    const variantLabel = selectedVariant ? [selectedVariant.thickness, selectedVariant.colors?.join('/')].filter(Boolean).join(' · ') : undefined;
    const key = selectedProduct._id + (variantLabel || '');
    setCart(prev => {
      const existing = prev.find(i => i.productId + (i.variantLabel || '') === key);
      if (existing) return prev.map(i => i.productId + (i.variantLabel || '') === key ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { productId: selectedProduct._id, name: selectedProduct.name, price, variantLabel, qty, imageUrl: selectedProduct.imageUrl }];
    });
    setView('home');
    setIsCartOpen(true);
    setSelectedVariant(null);
    setQty(1);
  }, [selectedProduct, selectedVariant, qty]);

  const handleConfirmOrder = async () => {
    if (!liff.isLoggedIn()) { liff.login(); return; }
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
      } else {
        alert("Failed to place order. Please try again.");
      }
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

      {/* Responsive Luxury Header */}
      <header className="sticky top-0 z-50 bg-[#fdfbf7]/90 backdrop-blur-xl border-b border-[#1a1d2e]/5 px-4 sm:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Profile Section */}
          <div className="flex items-center gap-3 min-w-[120px] lg:min-w-[200px]">
            <div className="relative flex-shrink-0">
              {customer?.pictureUrl
                ? <img src={customer.pictureUrl} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#d4af37] object-cover shadow-sm" alt="" />
                : (
                  <button 
                    onClick={() => liff.login()}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1a1d2e]/5 border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e]/40 hover:border-[#d4af37]/40 transition-all"
                  >
                    <User size={16} />
                  </button>
                )
              }
              {authStatus === 'verifying' && (
                <div className="absolute inset-0 rounded-full border-2 border-t-[#d4af37] border-transparent animate-spin" />
              )}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#d4af37] leading-none mb-0.5">
                {customer ? "Verified Member" : "Guest Account"}
              </span>
              {customer ? (
                <span className="text-xs font-bold text-[#1a1d2e] leading-none truncate max-w-[100px] lg:max-w-[150px]">
                  {customer.displayName}
                </span>
              ) : (
                <button onClick={() => liff.login()} className="text-xs font-bold text-[#1a1d2e] leading-none hover:text-[#d4af37] transition-colors">Sign in</button>
              )}
            </div>
          </div>

          {/* Central Shop Brand */}
          <div className="flex flex-col items-center cursor-pointer" onClick={() => setView('home')}>
             <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-[#1a1d2e] tracking-tight italic">
               {shopInfo.name}
             </h1>
          </div>

          {/* Cart Section */}
          <div className="flex items-center justify-end min-w-[120px] lg:min-w-[200px]">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 sm:gap-3 bg-[#1a1d2e] text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-full sm:rounded-2xl transition-all active:scale-95 shadow-lg shadow-[#1a1d2e]/10 group"
            >
              <ShoppingBag size={16} className="text-[#d4af37] group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-sm font-black tracking-tight">฿{cartTotal.toLocaleString()}</span>
              {cartCount > 0 && (
                <span className="bg-[#d4af37] text-[#1a1d2e] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center -mr-1">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* HOME VIEW */}
      {view === 'home' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-32">
          {/* Sub-Header Branding */}
          <div className="mb-10 text-center lg:text-left flex flex-col lg:flex-row lg:items-end lg:justify-between lg:mb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#d4af37]/10 rounded-full mb-3">
                <Sparkles size={12} className="text-[#d4af37]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37]">Exclusive Boutique</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#1a1d2e] tracking-tight mb-2 italic">
                Our Collection
              </h2>
              <p className="text-[#8b92ad] text-sm font-medium">Curated selection of premium items from Seoul, Korea</p>
            </div>
            
            {/* Search - Integrated on Desktop */}
            <div className="relative mt-8 lg:mt-0 lg:w-[400px] group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1a1d2e]/30 group-focus-within:text-[#d4af37] transition-colors" size={18} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search collection..."
                className="w-full bg-white border border-[#1a1d2e]/10 rounded-full sm:rounded-2xl pl-12 pr-5 py-3 sm:py-4 text-base text-[#1a1d2e] placeholder-[#1a1d2e]/20 shadow-sm focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/5 outline-none transition-all"
              />
            </div>
          </div>

          {/* Luxury Categories */}
          {categories.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-4 mb-8 sm:mb-12 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-black transition-all border flex-shrink-0 uppercase tracking-[0.15em]",
                    activeCategory === cat
                      ? "bg-[#1a1d2e] border-[#1a1d2e] text-white shadow-xl shadow-[#1a1d2e]/20"
                      : "bg-white border-[#1a1d2e]/10 text-[#1a1d2e]/40 hover:border-[#1a1d2e]/30"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid - Fully Responsive */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 lg:py-40">
              <Package size={48} className="mx-auto mb-4 text-[#1a1d2e]/10" />
              <p className="font-bold text-[#1a1d2e]/40 uppercase tracking-widest text-xs">No Items Found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-10 sm:gap-y-16">
              {filtered.map((p: Product) => (
                <button
                  key={p._id}
                  onClick={() => { setSelectedProduct(p); setSelectedVariant(null); setQty(1); setView('detail'); }}
                  className="group text-left active:scale-[0.98] transition-all"
                >
                  <div className="aspect-[4/5] rounded-[24px] sm:rounded-[48px] overflow-hidden bg-[#1a1d2e]/5 mb-4 sm:mb-6 relative shadow-sm group-hover:shadow-3xl group-hover:shadow-[#1a1d2e]/15 transition-all border border-transparent group-hover:border-[#d4af37]/20">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                      : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={40} /></div>
                    }
                    {p.brand && (
                      <span className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/90 backdrop-blur-md text-[#1a1d2e] text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-full uppercase tracking-widest border border-[#1a1d2e]/5">
                        {p.brand}
                      </span>
                    )}
                  </div>
                  <div className="px-1 sm:px-4">
                    <p className="font-serif font-black text-lg sm:text-2xl text-[#1a1d2e] leading-tight mb-1 sm:mb-2 group-hover:text-[#d4af37] transition-colors">{p.name}</p>
                    <p className="text-[#d4af37] font-black text-sm sm:text-lg tracking-tight">
                      ฿{p.price?.toLocaleString()}
                      {p.maxPrice && p.maxPrice !== p.price && <span className="text-[#1a1d2e]/30 font-medium ml-1">...</span>}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      )}

      {/* DETAIL VIEW - LUXURY OVERLAY */}
      {view === 'detail' && selectedProduct && (
        <div className="max-w-7xl mx-auto min-h-screen bg-[#fdfbf7] animate-in fade-in slide-in-from-bottom-6 duration-700 pb-40">
          <div className="sticky top-16 sm:top-20 z-40 bg-[#fdfbf7]/80 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
            <button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-[#1a1d2e]/5 flex items-center justify-center text-[#1a1d2e] hover:bg-[#1a1d2e]/10 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]">Collection 2026</span>
            <div className="w-10" />
          </div>

          <div className="lg:flex lg:gap-16 lg:px-8 lg:pt-8">
            {/* Hero Image - Responsive */}
            <div className="px-5 mb-10 lg:w-1/2 lg:px-0">
              <div className="rounded-[32px] sm:rounded-[64px] overflow-hidden aspect-[4/5] bg-[#1a1d2e]/5 shadow-2xl shadow-[#1a1d2e]/10 border border-[#1a1d2e]/5">
                {selectedProduct.imageUrl
                  ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={80} /></div>
                }
              </div>
            </div>

            <div className="px-8 lg:w-1/2 lg:px-0 lg:flex lg:flex-col lg:justify-center">
              <div className="flex items-center gap-2 mb-3 lg:mb-6">
                <div className="h-[1px] w-8 bg-[#d4af37]" />
                <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.3em]">{selectedProduct.brand || "Boutique Exclusive"}</p>
              </div>
              <h2 className="text-4xl sm:text-6xl font-serif font-black text-[#1a1d2e] mb-4 lg:mb-8 tracking-tight leading-none italic">{selectedProduct.name}</h2>
              {selectedProduct.description && <p className="text-[#8b92ad] text-base sm:text-xl leading-relaxed mb-8 lg:mb-12 font-medium max-w-xl">{selectedProduct.description}</p>}

              <div className="flex items-end gap-3 mb-10 lg:mb-16">
                <span className="text-4xl sm:text-6xl font-black text-[#1a1d2e]">฿{(selectedVariant?.price ?? selectedProduct.price)?.toLocaleString()}</span>
                <span className="text-xs font-bold text-[#8b92ad] mb-2 uppercase tracking-widest">Premium Selection</span>
              </div>

              {/* Premium Variants */}
              {selectedProduct.variants?.length > 0 && (
                <div className="mb-8 lg:mb-12">
                  <p className="text-[10px] font-black text-[#1a1d2e]/30 uppercase tracking-[0.2em] mb-4">Specifications</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedProduct.variants.map((v: any, i: number) => {
                      const label = [v.thickness, v.colors?.join(' / ')].filter(Boolean).join(' · ');
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedVariant(v)}
                          className={cn(
                            "px-6 py-3 rounded-2xl text-[10px] sm:text-xs font-black border transition-all uppercase tracking-widest",
                            selectedVariant === v
                              ? "bg-[#1a1d2e] border-[#1a1d2e] text-white shadow-xl shadow-[#1a1d2e]/20"
                              : "bg-white border-[#1a1d2e]/10 text-[#1a1d2e]/40 hover:border-[#1a1d2e]/30"
                          )}
                        >
                          {label || `Model ${i + 1}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Qty Selector */}
              <div className="flex items-center justify-between bg-[#1a1d2e]/5 rounded-3xl p-4 lg:p-6 mb-10 lg:mb-16 lg:max-w-md">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#1a1d2e]/40">Quantity</span>
                <div className="flex items-center gap-6 sm:gap-10">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e] hover:bg-white transition-all"><Minus size={14} /></button>
                  <span className="font-black text-lg sm:text-2xl text-[#1a1d2e]">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e] hover:bg-white transition-all"><Plus size={14} /></button>
                </div>
              </div>
              
              {/* Desktop CTA */}
              <div className="hidden lg:block lg:max-w-md">
                 <button
                  onClick={addToCart}
                  disabled={selectedProduct.variants?.length > 0 && !selectedVariant}
                  className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-6 rounded-[32px] font-black text-lg shadow-2xl shadow-[#1a1d2e]/30 active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  <ShoppingBag size={24} className="text-[#d4af37]" />
                  ADD TO COLLECTION
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Sticky CTA */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#fdfbf7] via-[#fdfbf7] to-transparent z-40">
            <div className="max-w-lg mx-auto">
              <button
                onClick={addToCart}
                disabled={selectedProduct.variants?.length > 0 && !selectedVariant}
                className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-5 rounded-[24px] font-black text-base shadow-2xl shadow-[#1a1d2e]/30 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <ShoppingBag size={20} className="text-[#d4af37]" />
                {selectedProduct.variants?.length > 0 && !selectedVariant 
                  ? 'CHOOSE SPEC' 
                  : `ADD TO COLLECTION · ฿${((selectedVariant?.price ?? selectedProduct.price) * qty).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT - VIP RECEIPT */}
      {view === 'payment' && currentOrder && (
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-32 text-center animate-in zoom-in-95 duration-700">
          <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-[#d4af37]/20">
            <CheckCircle className="text-[#d4af37]" size={40} />
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-black text-[#1a1d2e] mb-2 tracking-tight italic">Acquisition Confirmed</h2>
          <p className="text-[#8b92ad] text-sm sm:text-base font-medium mb-12">Thank you for your trust. Please settle the transfer using the secure QR below.</p>

          <div className="bg-white rounded-[48px] sm:rounded-[64px] p-10 sm:p-16 inline-block mb-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] border border-[#1a1d2e]/5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1d2e] text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.3em]">Official Secure Portal</div>
            <img
              src={`/api/qr?amount=${currentOrder.soldTHB}&ref=${currentOrder._id}`}
              alt="PromptPay QR"
              className="w-64 h-64 sm:w-80 sm:h-80 mx-auto object-contain mb-6 sm:mb-10"
            />
            <div className="text-[#1a1d2e] font-black text-3xl sm:text-5xl tracking-tighter">฿{currentOrder.soldTHB?.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs font-black text-[#d4af37] uppercase tracking-widest mt-2 sm:mt-4">Payment Reference ID: {currentOrder._id.slice(-8).toUpperCase()}</p>
          </div>

          <button
            onClick={() => setView('home')}
            className="w-full max-w-md mx-auto bg-[#1a1d2e]/5 text-[#1a1d2e] py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-[#1a1d2e]/10 transition-all flex items-center justify-center gap-2"
          >
            Finish & Return to Collection <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* CART DRAWER - RESPONSIVE */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:justify-center lg:items-center">
          <div className="absolute inset-0 bg-[#0a0b10]/80 backdrop-blur-md" onClick={() => setIsCartOpen(false)} />
          <div className="relative bg-white border-t lg:border border-[#1a1d2e]/5 rounded-t-[40px] lg:rounded-[48px] w-full lg:max-w-2xl max-h-[90vh] lg:h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-500 lg:zoom-in-95 shadow-2xl">
            <div className="flex justify-center pt-4 pb-2 lg:hidden">
              <div className="w-12 h-1.5 bg-[#1a1d2e]/10 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-8 py-6 sm:py-8 border-b border-[#1a1d2e]/5">
              <h3 className="text-2xl sm:text-4xl font-serif font-black text-[#1a1d2e] italic">Your Selection</h3>
              <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1a1d2e]/5 flex items-center justify-center text-[#1a1d2e]/40 hover:bg-[#1a1d2e]/10 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">
              {cart.length === 0 ? (
                <div className="text-center py-20 lg:py-40">
                  <ShoppingBag size={64} className="mx-auto mb-4 text-[#1a1d2e]/5" />
                  <p className="font-black text-[#1a1d2e]/20 uppercase tracking-widest text-xs">Collection is empty</p>
                </div>
              ) : cart.map((item, idx) => (
                <div key={idx} className="flex gap-6 sm:gap-10 items-center">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[20px] sm:rounded-[32px] overflow-hidden bg-[#1a1d2e]/5 flex-shrink-0 border border-[#1a1d2e]/5">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={24} /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-black text-lg sm:text-2xl text-[#1a1d2e] truncate leading-none mb-1 sm:mb-2">{item.name}</p>
                    {item.variantLabel && <p className="text-[10px] sm:text-xs font-bold text-[#8b92ad] uppercase tracking-wider">{item.variantLabel}</p>}
                    <p className="text-[#d4af37] font-black text-base sm:text-xl mt-1">฿{(item.price * item.qty).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4 bg-[#1a1d2e]/5 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 border border-[#1a1d2e]/5">
                      <button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it))} className="text-[#1a1d2e]/40 hover:text-[#1a1d2e]"><Minus size={14} /></button>
                      <span className="text-sm sm:text-lg font-black text-[#1a1d2e] w-4 text-center">{item.qty}</span>
                      <button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it))} className="text-[#1a1d2e]/40 hover:text-[#1a1d2e]"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="px-8 pt-8 pb-12 bg-[#fdfbf7] border-t border-[#1a1d2e]/5 rounded-b-[48px]">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-[#1a1d2e]/40 font-black uppercase tracking-widest text-[10px] sm:text-xs">Total Investment</span>
                  <span className="text-[#1a1d2e] font-black text-3xl sm:text-5xl tracking-tighter">฿{cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isOrdering}
                  className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-5 sm:py-6 rounded-[24px] sm:rounded-[32px] font-black text-base sm:text-lg shadow-2xl shadow-[#1a1d2e]/30 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {isOrdering ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-[#d4af37] rounded-full animate-spin" />
                  ) : (
                    <>CONFIRM ACQUISITION <ArrowRight size={18} className="text-[#d4af37]" /></>
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

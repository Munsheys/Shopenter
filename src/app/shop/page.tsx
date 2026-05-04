"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

  // Load shop info and init LIFF
  useEffect(() => {
    fetch('/api/shop-info')
      .then(r => r.json())
      .then(async data => {
        setShopInfo(data);
        if (data.liffId) {
          try {
            setAuthStatus('verifying');
            await liff.init({ liffId: data.liffId });
            
            if (liff.isLoggedIn()) {
              try {
                const profile = await liff.getProfile();
                setCustomer(profile);
                setAuthStatus('logged_in');
              } catch (pErr) {
                // Fallback: try decoding token if getProfile fails
                const token = liff.getDecodedIDToken();
                if (token) {
                  setCustomer({
                    userId: token.sub,
                    displayName: token.name || "Member",
                    pictureUrl: token.picture
                  });
                  setAuthStatus('logged_in');
                } else {
                  setAuthStatus('guest');
                }
              }
            } else {
              setAuthStatus('guest');
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

      {/* Header Boutique */}
      <header className="sticky top-0 z-50 bg-[#fdfbf7]/80 backdrop-blur-xl border-b border-[#1a1d2e]/5 px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              {customer?.pictureUrl
                ? <img src={customer.pictureUrl} className="w-10 h-10 rounded-full border-2 border-[#d4af37] object-cover shadow-sm" alt="" />
                : (
                  <button 
                    onClick={() => liff.login()}
                    className="w-10 h-10 rounded-full bg-[#1a1d2e]/5 border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e]/40 hover:border-[#d4af37]/40 transition-all"
                  >
                    <User size={18} />
                  </button>
                )
              }
              {authStatus === 'verifying' && (
                <div className="absolute inset-0 rounded-full border-2 border-t-[#d4af37] border-transparent animate-spin" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] leading-none mb-0.5">
                {authStatus === 'verifying' ? "Authenticating..." : customer ? "Verified Member" : "Guest Account"}
              </span>
              {customer ? (
                <span className="text-sm font-bold text-[#1a1d2e] leading-none truncate max-w-[120px]">
                  {customer.displayName}
                </span>
              ) : (
                <button 
                  onClick={() => liff.login()}
                  className="text-sm font-bold text-[#1a1d2e] leading-none hover:text-[#d4af37] transition-colors"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2.5 bg-[#1a1d2e] text-white px-5 py-2.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-[#1a1d2e]/10"
          >
            <ShoppingBag size={16} className="text-[#d4af37]" />
            <span className="text-sm font-black">฿{cartTotal.toLocaleString()}</span>
            {cartCount > 0 && (
              <span className="bg-[#d4af37] text-[#1a1d2e] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center -mr-1">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HOME VIEW */}
      {view === 'home' && (
        <main className="max-w-lg mx-auto px-5 pt-8 pb-32">
          {/* Brand Identity */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#d4af37]/10 rounded-full mb-3">
              <Sparkles size={12} className="text-[#d4af37]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37]">Exclusive Boutique</span>
            </div>
            <h1 className="text-4xl font-serif font-black text-[#1a1d2e] tracking-tight mb-2 italic">
              {shopInfo.name || 'Boutique'}
            </h1>
            <p className="text-[#8b92ad] text-sm font-medium">Curated selection from Seoul, Korea</p>
          </div>

          {/* Search Luxury */}
          <div className="relative mb-8 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1a1d2e]/30 group-focus-within:text-[#d4af37] transition-colors" size={18} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search our collection..."
              className="w-full bg-white border border-[#1a1d2e]/10 rounded-3xl pl-12 pr-5 py-4 text-base text-[#1a1d2e] placeholder-[#1a1d2e]/20 shadow-sm focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/5 outline-none transition-all"
            />
          </div>

          {/* Luxury Categories */}
          {categories.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide -mx-5 px-5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-black transition-all border flex-shrink-0 uppercase tracking-widest",
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

          {/* Product Grid - High Fashion Style */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package size={48} className="mx-auto mb-4 text-[#1a1d2e]/10" />
              <p className="font-bold text-[#1a1d2e]/40 uppercase tracking-widest text-xs">No Items Found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8">
              {filtered.map((p: Product) => (
                <button
                  key={p._id}
                  onClick={() => { setSelectedProduct(p); setSelectedVariant(null); setQty(1); setView('detail'); }}
                  className="group text-left active:scale-[0.98] transition-all"
                >
                  <div className="aspect-[4/5] rounded-[32px] overflow-hidden bg-[#1a1d2e]/5 mb-4 relative shadow-sm group-hover:shadow-2xl group-hover:shadow-[#1a1d2e]/10 transition-all border border-transparent group-hover:border-[#d4af37]/20">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={40} /></div>
                    }
                    {p.brand && (
                      <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-[#1a1d2e] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-[#1a1d2e]/5">
                        {p.brand}
                      </span>
                    )}
                  </div>
                  <div className="px-1">
                    <p className="font-serif font-black text-lg text-[#1a1d2e] leading-tight mb-1 group-hover:text-[#d4af37] transition-colors">{p.name}</p>
                    <p className="text-[#d4af37] font-black text-sm tracking-tight">
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
        <div className="max-w-lg mx-auto min-h-screen bg-white animate-in fade-in slide-in-from-bottom-6 duration-500 pb-40">
          <div className="p-4 flex items-center justify-between">
            <button onClick={() => setView('home')} className="w-10 h-10 rounded-full bg-[#1a1d2e]/5 flex items-center justify-center text-[#1a1d2e] hover:bg-[#1a1d2e]/10 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]">Collection 2026</span>
            <div className="w-10" />
          </div>

          {/* Hero Image */}
          <div className="px-5 mb-10">
            <div className="rounded-[48px] overflow-hidden aspect-[4/5] bg-[#1a1d2e]/5 shadow-2xl shadow-[#1a1d2e]/10 border border-[#1a1d2e]/5">
              {selectedProduct.imageUrl
                ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={80} /></div>
              }
            </div>
          </div>

          <div className="px-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-[1px] w-8 bg-[#d4af37]" />
              <p className="text-[#d4af37] text-[10px] font-black uppercase tracking-[0.3em]">{selectedProduct.brand || "Boutique Exclusive"}</p>
            </div>
            <h2 className="text-4xl font-serif font-black text-[#1a1d2e] mb-4 tracking-tight leading-none">{selectedProduct.name}</h2>
            {selectedProduct.description && <p className="text-[#8b92ad] text-base leading-relaxed mb-8 font-medium">{selectedProduct.description}</p>}

            <div className="flex items-end gap-3 mb-10">
              <span className="text-4xl font-black text-[#1a1d2e]">฿{(selectedVariant?.price ?? selectedProduct.price)?.toLocaleString()}</span>
              <span className="text-xs font-bold text-[#8b92ad] mb-2 uppercase tracking-widest">Inc. VAT</span>
            </div>

            {/* Premium Variants */}
            {selectedProduct.variants?.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-black text-[#1a1d2e]/30 uppercase tracking-[0.2em] mb-4">Specifications</p>
                <div className="flex flex-wrap gap-3">
                  {selectedProduct.variants.map((v: any, i: number) => {
                    const label = [v.thickness, v.colors?.join(' / ')].filter(Boolean).join(' · ');
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "px-6 py-3 rounded-2xl text-xs font-black border transition-all uppercase tracking-widest",
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

            {/* Qty Selector - Sleek */}
            <div className="flex items-center justify-between bg-[#1a1d2e]/5 rounded-3xl p-4 mb-10">
              <span className="text-xs font-black uppercase tracking-widest text-[#1a1d2e]/40">Quantity</span>
              <div className="flex items-center gap-6">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e] hover:bg-white transition-colors"><Minus size={14} /></button>
                <span className="font-black text-lg text-[#1a1d2e]">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-full border border-[#1a1d2e]/10 flex items-center justify-center text-[#1a1d2e] hover:bg-white transition-colors"><Plus size={14} /></button>
              </div>
            </div>
          </div>

          {/* Sticky Checkout Luxury */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent z-40">
            <div className="max-w-lg mx-auto">
              <button
                onClick={addToCart}
                disabled={selectedProduct.variants?.length > 0 && !selectedVariant}
                className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-5 rounded-[24px] font-black text-base shadow-2xl shadow-[#1a1d2e]/30 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <ShoppingBag size={20} className="text-[#d4af37]" />
                {selectedProduct.variants?.length > 0 && !selectedVariant 
                  ? 'SELECT SPECIFICATION' 
                  : `ADD TO COLLECTION · ฿${((selectedVariant?.price ?? selectedProduct.price) * qty).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT - VIP RECEIPT */}
      {view === 'payment' && currentOrder && (
        <div className="max-w-lg mx-auto px-6 pt-20 pb-32 text-center animate-in zoom-in-95 duration-700">
          <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-[#d4af37]/20">
            <CheckCircle className="text-[#d4af37]" size={40} />
          </div>
          <h2 className="text-3xl font-serif font-black text-[#1a1d2e] mb-2 tracking-tight">Order Confirmed</h2>
          <p className="text-[#8b92ad] text-sm font-medium mb-12">Thank you for your acquisition. Please complete the transfer below.</p>

          <div className="bg-white rounded-[48px] p-10 inline-block mb-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] border border-[#1a1d2e]/5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a1d2e] text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.3em]">Official QR</div>
            <img
              src={`/api/qr?amount=${currentOrder.soldTHB}&ref=${currentOrder._id}`}
              alt="PromptPay QR"
              className="w-64 h-64 mx-auto object-contain mb-6"
            />
            <div className="text-[#1a1d2e] font-black text-3xl tracking-tighter">฿{currentOrder.soldTHB?.toLocaleString()}</div>
            <p className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest mt-2">Awaiting Transfer</p>
          </div>

          <button
            onClick={() => setView('home')}
            className="w-full bg-[#1a1d2e]/5 text-[#1a1d2e] py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-[#1a1d2e]/10 transition-all flex items-center justify-center gap-2"
          >
            Finish & Return <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* CART DRAWER - HIGH END SHEET */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-[#0a0b10]/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative bg-white border-t border-[#1a1d2e]/5 rounded-t-[48px] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-500 shadow-2xl">
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-[#1a1d2e]/10 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-8 pb-6 border-b border-[#1a1d2e]/5">
              <h3 className="text-2xl font-serif font-black text-[#1a1d2e]">Your Selection</h3>
              <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 rounded-full bg-[#1a1d2e]/5 flex items-center justify-center text-[#1a1d2e]/40">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag size={64} className="mx-auto mb-4 text-[#1a1d2e]/5" />
                  <p className="font-black text-[#1a1d2e]/20 uppercase tracking-widest text-xs">Your collection is empty</p>
                </div>
              ) : cart.map((item, idx) => (
                <div key={idx} className="flex gap-6 items-center">
                  <div className="w-20 h-20 rounded-[24px] overflow-hidden bg-[#1a1d2e]/5 flex-shrink-0 border border-[#1a1d2e]/5">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[#1a1d2e]/10"><Package size={24} /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-black text-lg text-[#1a1d2e] truncate leading-none mb-1">{item.name}</p>
                    {item.variantLabel && <p className="text-[11px] font-bold text-[#8b92ad] uppercase tracking-wider">{item.variantLabel}</p>}
                    <p className="text-[#d4af37] font-black text-base mt-1">฿{(item.price * item.qty).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-4 bg-[#1a1d2e]/5 rounded-2xl px-3 py-1.5 border border-[#1a1d2e]/5">
                      <button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it))} className="text-[#1a1d2e]/40 hover:text-[#1a1d2e]"><Minus size={14} /></button>
                      <span className="text-sm font-black text-[#1a1d2e] w-4 text-center">{item.qty}</span>
                      <button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it))} className="text-[#1a1d2e]/40 hover:text-[#1a1d2e]"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="px-8 pt-6 pb-12 bg-[#fdfbf7] border-t border-[#1a1d2e]/5">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[#1a1d2e]/40 font-black uppercase tracking-widest text-xs">Total Investment</span>
                  <span className="text-[#1a1d2e] font-black text-3xl tracking-tighter">฿{cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isOrdering}
                  className="w-full bg-[#1a1d2e] disabled:opacity-20 text-white py-5 rounded-[24px] font-black text-base shadow-2xl shadow-[#1a1d2e]/30 active:scale-95 transition-all flex items-center justify-center gap-3"
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

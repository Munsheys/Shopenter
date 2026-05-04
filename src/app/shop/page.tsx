"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, User, Search, X, CheckCircle, ArrowRight, Package } from 'lucide-react';
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

  useEffect(() => {
    fetch('/api/shop-info')
      .then(r => r.json())
      .then(async data => {
        setShopInfo(data);
        if (data.liffId) {
          try {
            // Initialize LIFF
            await liff.init({ liffId: data.liffId });
            
            if (liff.isLoggedIn()) {
              const profile = await liff.getProfile();
              setCustomer(profile);
            } else if (liff.isInClient()) {
              // Auto-login only if running inside the LINE app (In-App Browser)
              liff.login();
            }
          } catch (err) {
            console.error("LIFF Init failed:", err);
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
    const variantLabel = selectedVariant ? `${selectedVariant.thickness || ''}${selectedVariant.colors?.length ? ' · ' + selectedVariant.colors.join(', ') : ''}`.trim() : undefined;
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
    if (!customer) { liff.login(); return; }
    setIsOrdering(true);
    try {
      const res = await fetch('/api/shop-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: customer.userId,
          displayName: customer.displayName,
          pictureUrl: customer.pictureUrl,
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
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#00b900]/20 border-t-[#00b900] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white font-sans">

      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-[#0a0d14]/80 backdrop-blur-2xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {customer?.pictureUrl
              ? <img src={customer.pictureUrl} className="w-9 h-9 rounded-full border-2 border-[#00b900]/60 object-cover" alt="" />
              : (
                <button 
                  onClick={() => liff.login()}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:border-[#00b900]/40 transition-colors"
                >
                  <User size={16} className="text-white/40" />
                </button>
              )
            }
            <div>
              <p className="text-[11px] text-white/40 leading-none">
                {customer ? "Welcome back" : "Guest Mode"}
              </p>
              {customer ? (
                <p className="text-sm font-bold text-white leading-tight truncate max-w-[140px]">
                  {customer.displayName?.split(' ')[0]}
                </p>
              ) : (
                <button 
                  onClick={() => liff.login()}
                  className="text-sm font-bold text-[#00b900] leading-tight hover:underline"
                >
                  Sign in with LINE
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 bg-white/5 border border-white/10 hover:border-[#00b900]/40 px-4 py-2 rounded-2xl transition-all active:scale-95"
          >
            <ShoppingBag size={16} className="text-[#00b900]" />
            <span className="text-sm font-bold">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#00b900] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-[#00b90040]">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* HOME VIEW */}
      {view === 'home' && (
        <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
          {/* Hero */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white mb-1">{shopInfo.name || 'Our Store'}</h1>
            <p className="text-white/40 text-sm">Premium products, shipped from Korea 🇰🇷</p>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-white/5 border border-white/10 focus:border-[#00b900]/50 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Chips */}
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide -mx-4 px-4">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border flex-shrink-0",
                    activeCategory === cat
                      ? "bg-[#00b900] border-[#00b900] text-white shadow-lg shadow-[#00b90030]"
                      : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Product Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((p: Product) => (
                <button
                  key={p._id}
                  onClick={() => { setSelectedProduct(p); setSelectedVariant(null); setQty(1); setView('detail'); }}
                  className="bg-white/5 border border-white/8 rounded-[24px] overflow-hidden text-left active:scale-95 transition-all hover:border-[#00b900]/30 group"
                >
                  <div className="aspect-square overflow-hidden bg-white/5 relative">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-white/20"><Package size={32} /></div>
                    }
                    {p.brand && (
                      <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white/70 text-[9px] font-bold px-2 py-0.5 rounded-full">{p.brand}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm text-white truncate leading-tight mb-1">{p.name}</p>
                    <p className="text-[#00b900] font-black text-sm">
                      ฿{p.price?.toLocaleString()}
                      {p.maxPrice && p.maxPrice !== p.price && <span className="text-white/40 font-medium"> – ฿{p.maxPrice?.toLocaleString()}</span>}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === 'detail' && selectedProduct && (
        <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="px-4 pt-4 pb-2">
            <button onClick={() => setView('home')} className="flex items-center gap-1 text-white/50 hover:text-white text-sm font-semibold transition-colors">
              <ChevronLeft size={18} /> Back
            </button>
          </div>

          {/* Product Image */}
          <div className="px-4 pb-4">
            <div className="rounded-[32px] overflow-hidden aspect-square bg-white/5 border border-white/8">
              {selectedProduct.imageUrl
                ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white/20"><Package size={64} /></div>
              }
            </div>
          </div>

          <div className="px-6 pb-32">
            {selectedProduct.brand && <p className="text-[#00b900] text-xs font-black uppercase tracking-widest mb-1">{selectedProduct.brand}</p>}
            <h2 className="text-2xl font-black text-white mb-2">{selectedProduct.name}</h2>
            {selectedProduct.description && <p className="text-white/50 text-sm leading-relaxed mb-6">{selectedProduct.description}</p>}

            <div className="text-3xl font-black text-white mb-6">
              ฿{(selectedVariant?.price ?? selectedProduct.price)?.toLocaleString()}
            </div>

            {/* Variants */}
            {selectedProduct.variants?.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Select Option</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.variants.map((v: any, i: number) => {
                    const label = [v.thickness, v.colors?.join(' / ')].filter(Boolean).join(' · ');
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                          selectedVariant === v
                            ? "bg-[#00b90022] border-[#00b900] text-[#00b900]"
                            : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                        )}
                      >
                        {label || `Option ${i + 1}`}
                        {v.price && <span className="ml-1 text-[10px] opacity-70">฿{v.price.toLocaleString()}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Qty selector */}
            <div className="flex items-center gap-4 mb-8">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Quantity</p>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="text-white/50 hover:text-white"><Minus size={14} /></button>
                <span className="font-black text-sm w-6 text-center">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="text-white/50 hover:text-white"><Plus size={14} /></button>
              </div>
            </div>
          </div>

          {/* Sticky Add to Cart */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0d14] to-transparent z-40">
            <div className="max-w-lg mx-auto">
              <button
                onClick={addToCart}
                disabled={selectedProduct.variants?.length > 0 && !selectedVariant}
                className="w-full bg-gradient-to-r from-[#00b900] to-[#00d900] disabled:opacity-40 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-[#00b90033] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag size={18} />
                {selectedProduct.variants?.length > 0 && !selectedVariant ? 'Select an option' : `Add to Cart · ฿${((selectedVariant?.price ?? selectedProduct.price) * qty).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT VIEW */}
      {view === 'payment' && currentOrder && (
        <div className="max-w-lg mx-auto px-4 pt-16 pb-24 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-[#00b90022] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#00b900]" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Order Confirmed!</h2>
          <p className="text-white/50 text-sm mb-8">Scan the QR code below to complete payment</p>

          <div className="bg-white rounded-[32px] p-6 inline-block mb-8 shadow-2xl shadow-[#00b90033]">
            <img
              src={`/api/qr?amount=${currentOrder.soldTHB}&ref=${currentOrder._id}`}
              alt="PromptPay QR"
              className="w-56 h-56 mx-auto object-contain"
            />
            <div className="mt-4 text-[#1a1d2e] font-black text-2xl">฿{currentOrder.soldTHB?.toLocaleString()}</div>
          </div>

          <button
            onClick={() => setView('home')}
            className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            Return to Shop <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative bg-[#0f1219] border-t border-white/10 rounded-t-[32px] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5">
              <h3 className="text-lg font-black text-white">Your Cart</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Your cart is empty</p>
                </div>
              ) : cart.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center bg-white/5 border border-white/8 p-3 rounded-2xl">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white/20"><Package size={20} /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{item.name}</p>
                    {item.variantLabel && <p className="text-[11px] text-white/40">{item.variantLabel}</p>}
                    <p className="text-[#00b900] font-black text-sm mt-0.5">฿{(item.price * item.qty).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-2 py-1">
                      <button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it))} className="text-white/50 hover:text-white"><Minus size={12} /></button>
                      <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                      <button onClick={() => setCart(cart.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it))} className="text-white/50 hover:text-white"><Plus size={12} /></button>
                    </div>
                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400/60 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="px-6 py-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/60 font-bold">Total</span>
                  <span className="text-white font-black text-xl">฿{cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isOrdering}
                  className="w-full bg-gradient-to-r from-[#00b900] to-[#00d900] disabled:opacity-50 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-[#00b90033] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isOrdering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Confirm Order <ArrowRight size={18} /></>
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

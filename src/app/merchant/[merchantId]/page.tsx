'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, Search, X, CheckCircle, ArrowRight, Package, SlidersHorizontal, ArrowUpDown, Tag } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { use } from 'react';
import liff from '@line/liff';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

type CartItem = { productId: string; name: string; price: number; variantLabel?: string; qty: number; imageUrl?: string };
type View = 'home' | 'detail' | 'cart' | 'payment';
type SortOption = 'newest' | 'price-asc' | 'price-desc';

export default function MerchantStorefront({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = use(params);

  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>('home');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selThickness, setSelThickness] = useState('');
  const [selColor, setSelColor] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [authStatus, setAuthStatus] = useState<'idle' | 'verifying' | 'logged_in' | 'guest'>('idle');
  const [notFound, setNotFound] = useState(false);
  const liffLock = useRef(false);

  useEffect(() => {
    const cached = localStorage.getItem(`liff_profile_${merchantId}`);
    if (cached) {
      try { setCustomer(JSON.parse(cached)); setAuthStatus('logged_in'); } catch { localStorage.removeItem(`liff_profile_${merchantId}`); }
    }

    async function init() {
      try {
        const [infoRes, productsRes] = await Promise.all([
          fetch(`/api/storefront/${merchantId}/shop-info`),
          fetch(`/api/storefront/${merchantId}/products`)
        ]);

        if (!infoRes.ok) { setNotFound(true); return; }
        const [info, prods] = await Promise.all([infoRes.json(), productsRes.json()]);
        setShopInfo(info);
        setProducts(prods);

        if (info.liffId && !liffLock.current) {
          liffLock.current = true;
          try {
            if (!cached) setAuthStatus('verifying');
            await liff.init({ liffId: info.liffId, withLoginOnExternalBrowser: true });
            if (liff.isLoggedIn()) {
              const profile = await liff.getProfile();
              setCustomer(profile);
              localStorage.setItem(`liff_profile_${merchantId}`, JSON.stringify(profile));
              setAuthStatus('logged_in');
            } else {
              setAuthStatus('guest');
            }
          } catch { setAuthStatus('guest'); }
        } else if (!info.liffId) {
          setAuthStatus('guest');
        }
      } catch { setNotFound(true); }
    }
    init();
  }, [merchantId]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => p.categories?.forEach((c: string) => cats.add(c)));
    return ['All', ...Array.from(cats)];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchQ = !q || p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q);
      const matchCat = activeCategory === 'All' || p.categories?.includes(activeCategory);
      return matchQ && matchCat;
    });
    if (sortBy === 'price-asc') list = list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') list = list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, searchQuery, activeCategory, sortBy]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart() {
    if (!selectedProduct) return;
    const variantLabel = selectedVariant
      ? `${selThickness || ''}${selThickness && selColor ? ' / ' : ''}${selColor || ''}`.trim()
      : '';
    const price = selectedVariant?.price ?? selectedProduct.price;
    setCart(prev => {
      const key = `${selectedProduct._id}-${variantLabel}`;
      const existing = prev.find(i => `${i.productId}-${i.variantLabel}` === key);
      if (existing) return prev.map(i => `${i.productId}-${i.variantLabel}` === key ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { productId: selectedProduct._id, name: selectedProduct.name, price, variantLabel, qty, imageUrl: selectedProduct.imageUrl }];
    });
    setView('home');
    setQty(1);
  }

  async function placeOrder(address: string) {
    if (!customer) return;
    setIsOrdering(true);
    try {
      const items = cart.map(i => ({ productId: i.productId, name: i.name, variantLabel: i.variantLabel, price: i.price, qty: i.qty, imageUrl: i.imageUrl }));
      const res = await fetch(`/api/storefront/${merchantId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: customer.userId,
          displayName: customer.displayName,
          address,
          items,
          product: items.map(i => `${i.qty > 1 ? `${i.qty}x ` : ''}${i.name}`).join(', '),
          quantity: items.reduce((s, i) => s + i.qty, 0),
          soldTHB: cartTotal
        })
      });
      if (res.ok) {
        setCurrentOrder(await res.json());
        setCart([]);
        setView('payment');
      }
    } finally {
      setIsOrdering(false);
    }
  }

  const theme = shopInfo?.branding?.theme || 'light';
  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-[#0f1117]' : 'bg-gray-50';
  const card = isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const sub = isDark ? 'text-gray-400' : 'text-gray-500';

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-700 mb-2">Store not found</h1>
          <p className="text-gray-400 text-sm">This store link may be invalid or the store may no longer exist.</p>
        </div>
      </div>
    );
  }

  if (!shopInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ---- Payment view ----
  if (view === 'payment' && currentOrder) {
    return (
      <div className={`min-h-screen ${bg} ${text} flex items-center justify-center p-4`}>
        <div className={`rounded-2xl border p-8 w-full max-w-sm text-center ${card}`}>
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Order placed!</h2>
          <p className={`text-sm mb-6 ${sub}`}>We'll contact you on LINE when your order is ready for payment.</p>
          <button onClick={() => { setCurrentOrder(null); setView('home'); }}
            className="w-full bg-green-500 text-white rounded-xl py-3 font-semibold text-sm">
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  // ---- Product detail view ----
  if (view === 'detail' && selectedProduct) {
    const thicknesses = [...new Set(selectedProduct.variants?.map((v: any) => v.thickness).filter(Boolean))] as string[];
    const colors = selectedVariant ? (selectedVariant.colors || []) : [];

    return (
      <div className={`min-h-screen ${bg} ${text}`}>
        <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b ${card}`}>
          <button onClick={() => setView('home')} className="p-1.5 rounded-xl hover:bg-gray-100"><ChevronLeft size={20} /></button>
          <span className="font-semibold text-sm">{selectedProduct.name}</span>
        </div>
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {selectedProduct.imageUrl && (
            <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full aspect-square object-cover rounded-2xl" />
          )}
          <div>
            <h2 className="text-lg font-bold">{selectedProduct.name}</h2>
            {selectedProduct.brand && <p className={`text-sm ${sub}`}>{selectedProduct.brand}</p>}
            <p className="text-green-500 font-bold text-xl mt-1">
              ฿{(selectedVariant?.price ?? selectedProduct.price).toLocaleString()}
            </p>
            {selectedProduct.description && <p className={`text-sm mt-2 ${sub}`}>{selectedProduct.description}</p>}
          </div>

          {thicknesses.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Size / Thickness</p>
              <div className="flex flex-wrap gap-2">
                {thicknesses.map(t => (
                  <button key={t} onClick={() => { setSelThickness(t); setSelColor(''); setSelectedVariant(selectedProduct.variants?.find((v: any) => v.thickness === t)); }}
                    className={`px-3 py-1.5 rounded-lg text-sm border font-medium transition-colors ${selThickness === t ? 'bg-green-500 text-white border-green-500' : isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c: string) => (
                  <button key={c} onClick={() => setSelColor(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm border font-medium transition-colors ${selColor === c ? 'bg-green-500 text-white border-green-500' : isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">Qty</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}><Minus size={14} /></button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}><Plus size={14} /></button>
            </div>
          </div>

          <button onClick={addToCart} className="w-full bg-green-500 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2">
            <ShoppingBag size={16} /> Add to cart
          </button>
        </div>
      </div>
    );
  }

  // ---- Cart view ----
  if (view === 'cart') {
    return (
      <CartView
        cart={cart} cartTotal={cartTotal} isDark={isDark} bg={bg} card={card} text={text} sub={sub}
        customer={customer} isOrdering={isOrdering}
        onBack={() => setView('home')}
        onRemove={(id: string) => setCart(prev => prev.filter(i => i.productId !== id))}
        onQtyChange={(id: string, delta: number) => setCart(prev => prev.map(i => i.productId === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))}
        onOrder={placeOrder}
      />
    );
  }

  // ---- Home / product list ----
  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${card}`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-base">{shopInfo.shopName}</h1>
          {cartCount > 0 && (
            <button onClick={() => setView('cart')} className="relative p-2">
              <ShoppingBag size={20} />
              <span className="absolute -top-0.5 -right-0.5 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">{cartCount}</span>
            </button>
          )}
        </div>
        <div className="px-4 pb-3">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${isDark ? 'bg-[#1f2335] border-[#2a2e45]' : 'bg-gray-100 border-transparent'}`}>
            <Search size={14} className={sub} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..."
              className={`flex-1 bg-transparent text-sm outline-none ${text}`} />
          </div>
        </div>
        {categories.length > 1 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-green-500 text-white' : isDark ? 'bg-[#1f2335] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="p-4 grid grid-cols-2 gap-3 max-w-2xl mx-auto">
        {filtered.map(p => (
          <button key={p._id} onClick={() => { setSelectedProduct(p); setSelectedVariant(null); setSelThickness(''); setSelColor(''); setQty(1); setView('detail'); }}
            className={`rounded-2xl border overflow-hidden text-left transition-all active:scale-95 ${card}`}>
            {p.imageUrl
              ? <img src={p.imageUrl} alt={p.name} className="w-full aspect-square object-cover" />
              : <div className="w-full aspect-square bg-gray-100 flex items-center justify-center"><Package size={32} className="text-gray-300" /></div>
            }
            <div className="p-3">
              <p className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</p>
              {p.brand && <p className={`text-xs mt-0.5 ${sub}`}>{p.brand}</p>}
              <p className="text-green-500 font-bold text-sm mt-1">฿{p.price.toLocaleString()}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 py-16 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className={`text-sm ${sub}`}>No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CartView({ cart, cartTotal, isDark, bg, card, text, sub, customer, isOrdering, onBack, onRemove, onQtyChange, onOrder }: any) {
  const [address, setAddress] = useState('');

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b ${card}`}>
        <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-gray-100"><ChevronLeft size={20} /></button>
        <span className="font-semibold text-sm">Cart ({cart.length} items)</span>
      </div>
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {cart.map((item: CartItem) => (
          <div key={`${item.productId}-${item.variantLabel}`} className={`rounded-2xl border p-3 flex items-center gap-3 ${card}`}>
            {item.imageUrl
              ? <img src={item.imageUrl} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt={item.name} />
              : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-gray-300" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm line-clamp-1">{item.name}</p>
              {item.variantLabel && <p className={`text-xs ${sub}`}>{item.variantLabel}</p>}
              <p className="text-green-500 font-bold text-sm">฿{(item.price * item.qty).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onQtyChange(item.productId, -1)} className="w-7 h-7 rounded-lg border flex items-center justify-center"><Minus size={12} /></button>
              <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
              <button onClick={() => onQtyChange(item.productId, 1)} className="w-7 h-7 rounded-lg border flex items-center justify-center"><Plus size={12} /></button>
              <button onClick={() => onRemove(item.productId)} className="w-7 h-7 ml-1 rounded-lg flex items-center justify-center text-red-400"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}

        <div className={`rounded-2xl border p-4 ${card}`}>
          <p className="text-sm font-medium mb-2">Delivery address</p>
          <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} placeholder="Enter your delivery address..."
            className={`w-full bg-transparent text-sm outline-none resize-none border rounded-xl p-3 ${isDark ? 'border-gray-600' : 'border-gray-200'}`} />
        </div>

        <div className={`rounded-2xl border p-4 flex items-center justify-between ${card}`}>
          <span className="font-medium">Total</span>
          <span className="font-bold text-lg text-green-500">฿{cartTotal.toLocaleString()}</span>
        </div>

        {!customer && (
          <div className={`rounded-xl p-3 text-sm text-center ${isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
            Please open this store in LINE to place an order
          </div>
        )}

        <button
          disabled={!customer || !address.trim() || isOrdering || cart.length === 0}
          onClick={() => onOrder(address)}
          className="w-full bg-green-500 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isOrdering ? 'Placing order...' : <><ArrowRight size={16} /> Place order</>}
        </button>
      </div>
    </div>
  );
}

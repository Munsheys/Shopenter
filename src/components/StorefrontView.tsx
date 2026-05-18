'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, Search, X, CheckCircle, ArrowRight, Package } from 'lucide-react';
import liff from '@line/liff';
import { resolvePreset, type StorefrontPreset } from '@/lib/storefrontPresets';

type CartItem = { productId: string; name: string; price: number; variantLabel?: string; qty: number; imageUrl?: string };
type View = 'home' | 'detail' | 'cart' | 'payment';

function getProductOptions(product: any): Array<{ name: string; values: string[] }> {
  if (product?.options?.length) return product.options;
  const opts: Array<{ name: string; values: string[] }> = [];
  const variantNames = [...new Set((product?.variants || []).map((v: any) => v.variantName).filter(Boolean))] as string[];
  if (variantNames.length) opts.push({ name: 'Variant', values: variantNames });
  const colors = [...new Set((product?.variants || []).flatMap((v: any) => v.colors || []).filter(Boolean))] as string[];
  if (colors.length) opts.push({ name: 'Color', values: colors });
  return opts;
}

function findMatchingVariant(product: any, selections: Record<string, string>): any {
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

export default function StorefrontView({ merchantId }: { merchantId: string }) {
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>('home');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeBrand, setActiveBrand] = useState('All');
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [customer, setCustomer] = useState<any>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const liffLock = useRef(false);

  useEffect(() => {
    const cached = localStorage.getItem(`liff_profile_${merchantId}`);
    if (cached) {
      try { setCustomer(JSON.parse(cached)); } catch { localStorage.removeItem(`liff_profile_${merchantId}`); }
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
        setProducts(Array.isArray(prods) ? prods : []);

        if (info.liffId && !liffLock.current) {
          liffLock.current = true;
          try {
            await liff.init({ liffId: info.liffId, withLoginOnExternalBrowser: true });
            if (liff.isLoggedIn()) {
              const profile = await liff.getProfile();
              setCustomer(profile);
              localStorage.setItem(`liff_profile_${merchantId}`, JSON.stringify(profile));
            }
          } catch { /* guest mode */ }
        }
      } catch { setNotFound(true); }
    }
    init();
  }, [merchantId]);

  const sf = shopInfo?.storefront ?? {};
  const p: StorefrontPreset = resolvePreset(sf.preset || 'midnight', sf.accentColor);
  const cardLayout: 'grid' | 'list' = sf.cardLayout || 'grid';

  const categories = useMemo(() => {
    const s = new Set<string>();
    products.forEach(pr => pr.categories?.forEach((c: string) => s.add(c)));
    return ['All', ...Array.from(s)];
  }, [products]);

  const brands = useMemo(() => {
    const s = new Set<string>();
    products.forEach(pr => pr.brand && s.add(pr.brand));
    return ['All', ...Array.from(s)];
  }, [products]);

  const filtered = useMemo(() => products.filter(pr => {
    const q = searchQuery.toLowerCase();
    return (!q || pr.name?.toLowerCase().includes(q) || pr.brand?.toLowerCase().includes(q))
      && (activeCategory === 'All' || pr.categories?.includes(activeCategory))
      && (activeBrand === 'All' || pr.brand === activeBrand);
  }), [products, searchQuery, activeCategory, activeBrand]);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart() {
    if (!selectedProduct) return;
    const variantLabel = Object.values(selections).filter(Boolean).join(' / ');
    const price = selectedVariant?.price ?? selectedProduct.price;
    const key = `${selectedProduct._id}-${variantLabel}`;
    setCart(prev => {
      const existing = prev.find(i => `${i.productId}-${i.variantLabel}` === key);
      if (existing) return prev.map(i => `${i.productId}-${i.variantLabel}` === key ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { productId: selectedProduct._id, name: selectedProduct.name, price, variantLabel, qty, imageUrl: selectedProduct.imageUrl }];
    });
    setView('home'); setQty(1);
  }

  async function placeOrder(address: string, couponCode?: string, redeemPoints?: number) {
    if (!customer) return;
    setIsOrdering(true);
    try {
      const items = cart.map(i => ({ productId: i.productId, name: i.name, variantLabel: i.variantLabel, price: i.price, qty: i.qty, imageUrl: i.imageUrl }));
      const res = await fetch(`/api/storefront/${merchantId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: customer.userId, displayName: customer.displayName, address, items,
          product: items.map(i => `${i.qty > 1 ? `${i.qty}x ` : ''}${i.name}`).join(', '),
          quantity: items.reduce((s, i) => s + i.qty, 0), soldTHB: cartTotal,
          couponCode: couponCode || undefined,
          redeemPoints: redeemPoints || undefined,
        })
      });
      if (res.ok) { setCart([]); setView('payment'); }
    } finally { setIsOrdering(false); }
  }

  const style = {
    page: { background: p.pageBg, color: p.textPrimary, minHeight: '100vh' } as React.CSSProperties,
    header: { background: p.headerBg, borderBottom: `1px solid ${p.headerBorder}` } as React.CSSProperties,
    card: { background: p.cardBg, border: `1px solid ${p.cardBorder}` } as React.CSSProperties,
    input: { background: p.inputBg, border: `1px solid ${p.inputBorder}`, color: p.textPrimary } as React.CSSProperties,
    accent: { background: p.accent, color: p.accentText } as React.CSSProperties,
    pill: (active: boolean): React.CSSProperties => ({ background: active ? p.pillActiveBg : p.pillBg, color: active ? p.pillActiveText : p.textMuted }),
    muted: { color: p.textMuted } as React.CSSProperties,
    sub: { color: p.textSecondary } as React.CSSProperties,
  };

  if (notFound) return (
    <div style={style.page} className="flex items-center justify-center">
      <div className="text-center p-8">
        <Package size={48} className="mx-auto mb-4 opacity-30" />
        <h1 className="text-xl font-bold mb-2">Store not found</h1>
        <p style={style.muted} className="text-sm">This store link may be invalid or no longer exists.</p>
      </div>
    </div>
  );

  if (!shopInfo) return (
    <div style={{ ...style.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${p.accent}40`, borderTopColor: p.accent }} />
    </div>
  );

  if (view === 'payment') return (
    <div style={style.page} className="flex items-center justify-center p-4">
      <div style={style.card} className="rounded-2xl p-8 w-full max-w-sm text-center">
        <CheckCircle size={48} className="mx-auto mb-4" style={{ color: p.accent }} />
        <h2 className="text-xl font-bold mb-2">Order placed!</h2>
        <p style={style.muted} className="text-sm mb-6">We'll contact you on LINE when your order is ready for payment.</p>
        <button onClick={() => setView('home')} style={style.accent} className="w-full rounded-xl py-3 font-semibold text-sm">Continue shopping</button>
      </div>
    </div>
  );

  if (view === 'detail' && selectedProduct) {
    const productOptions = getProductOptions(selectedProduct);
    const allSelected = productOptions.every(o => selections[o.name]);
    const imgs: string[] = selectedProduct.images?.length ? selectedProduct.images : (selectedProduct.imageUrl ? [selectedProduct.imageUrl] : []);
    const displayImg = selectedVariant?.imageUrl || imgs[activeImgIdx] || imgs[0] || null;
    return (
      <div style={style.page}>
        <div style={style.header} className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3">
          <button onClick={() => setView('home')} style={{ color: p.textPrimary }} className="p-1.5 rounded-xl"><ChevronLeft size={20} /></button>
          <span className="font-semibold text-sm">{selectedProduct.name}</span>
        </div>
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {displayImg
            ? <img src={displayImg} alt={selectedProduct.name} className="w-full aspect-square object-cover rounded-2xl" />
            : <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: p.inputBg }}><Package size={48} style={style.muted} /></div>
          }
          {imgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imgs.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImgIdx(i)}
                  className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all"
                  style={{ borderColor: !selectedVariant?.imageUrl && activeImgIdx === i ? p.accent : 'transparent', opacity: !selectedVariant?.imageUrl && activeImgIdx === i ? 1 : 0.6 }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold">{selectedProduct.name}</h2>
            {selectedProduct.brand && <p className="text-sm" style={style.muted}>{selectedProduct.brand}</p>}
            <p className="text-xl font-bold mt-1" style={{ color: p.accent }}>฿{(selectedVariant?.price ?? selectedProduct.price).toLocaleString()}</p>
            {selectedProduct.description && <p className="text-sm mt-2" style={style.sub}>{selectedProduct.description}</p>}
          </div>
          {productOptions.map(option => (
            <div key={option.name}>
              <p className="text-sm font-medium mb-2">{option.name}</p>
              <div className="flex flex-wrap gap-2">
                {option.values.map(val => (
                  <button key={val}
                    onClick={() => {
                      const next = { ...selections, [option.name]: val };
                      setSelections(next);
                      setSelectedVariant(findMatchingVariant(selectedProduct, next));
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium" style={style.pill(selections[option.name] === val)}>{val}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">Qty</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={style.card} className="w-8 h-8 rounded-lg flex items-center justify-center"><Minus size={14} /></button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={style.card} className="w-8 h-8 rounded-lg flex items-center justify-center"><Plus size={14} /></button>
            </div>
          </div>
          <button onClick={addToCart} disabled={!allSelected} style={allSelected ? style.accent : { background: '#ccc', color: '#fff' }} className="w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            <ShoppingBag size={16} /> {allSelected ? 'Add to cart' : 'Select options'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'cart') return (
    <CartView p={p} style={style} cart={cart} cartTotal={cartTotal} customer={customer} isOrdering={isOrdering}
      merchantId={merchantId}
      onBack={() => setView('home')}
      onRemove={(id: string) => setCart(prev => prev.filter(i => i.productId !== id))}
      onQtyChange={(id: string, delta: number) => setCart(prev => prev.map(i => i.productId === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))}
      onOrder={placeOrder}
    />
  );

  return (
    <div style={style.page}>
      {sf.announcementText && (
        <div className="px-4 py-1.5 text-xs text-center font-medium" style={style.accent}>{sf.announcementText}</div>
      )}
      <div style={style.header} className="sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sf.logoUrl
              ? <img src={sf.logoUrl} alt="logo" className="w-8 h-8 rounded-xl object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
              : <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={style.accent}>{(shopInfo.shopName || 'S')[0]}</div>
            }
            <div>
              <p className="font-bold text-sm">{shopInfo.shopName}</p>
              {sf.shopTagline && <p className="text-xs" style={style.muted}>{sf.shopTagline}</p>}
            </div>
          </div>
          {cartCount > 0 && (
            <button onClick={() => setView('cart')} className="relative p-2" style={{ color: p.textPrimary }}>
              <ShoppingBag size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={style.accent}>{cartCount}</span>
            </button>
          )}
        </div>
        {sf.bannerUrl && (
          <img src={sf.bannerUrl} alt="banner" className="w-full h-28 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
        )}
        {sf.showSearch !== false && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={style.input}>
              <Search size={14} style={style.muted} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..."
                className="flex-1 bg-transparent text-sm outline-none" style={{ color: p.textPrimary }} />
              {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} style={style.muted} /></button>}
            </div>
          </div>
        )}
        {sf.showCategoryFilter !== false && categories.length > 1 && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium" style={style.pill(activeCategory === cat)}>{cat}</button>
            ))}
          </div>
        )}
        {sf.showBrandFilter !== false && brands.length > 1 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {brands.map(b => (
              <button key={b} onClick={() => setActiveBrand(b)} className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium" style={style.pill(activeBrand === b)}>{b}</button>
            ))}
          </div>
        )}
      </div>

      <div className={`p-4 max-w-2xl mx-auto ${cardLayout === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}`}>
        {filtered.map(pr => (
          <button key={pr._id}
            onClick={() => { setSelectedProduct(pr); setSelectedVariant(null); setSelections({}); setQty(1); setActiveImgIdx(0); setView('detail'); }}
            className={`rounded-2xl overflow-hidden text-left transition-all active:scale-95 ${cardLayout === 'list' ? 'flex gap-3 p-3' : ''}`}
            style={style.card}
          >
            {cardLayout === 'grid' ? (
              <>
                {pr.imageUrl
                  ? <img src={pr.imageUrl} alt={pr.name} className="w-full aspect-square object-cover" />
                  : <div className="w-full aspect-square flex items-center justify-center" style={{ background: p.inputBg }}><Package size={32} style={style.muted} /></div>
                }
                <div className="p-3">
                  <p className="font-semibold text-sm leading-tight line-clamp-2">{pr.name}</p>
                  {pr.brand && <p className="text-xs mt-0.5" style={style.muted}>{pr.brand}</p>}
                  <p className="font-bold text-sm mt-1" style={{ color: p.accent }}>฿{pr.price.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <>
                {pr.imageUrl
                  ? <img src={pr.imageUrl} alt={pr.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: p.inputBg }}><Package size={20} style={style.muted} /></div>
                }
                <div className="flex-1 min-w-0 py-1">
                  <p className="font-semibold text-sm line-clamp-2">{pr.name}</p>
                  {pr.brand && <p className="text-xs mt-0.5" style={style.muted}>{pr.brand}</p>}
                  <p className="font-bold text-sm mt-1" style={{ color: p.accent }}>฿{pr.price.toLocaleString()}</p>
                </div>
              </>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className={`${cardLayout === 'grid' ? 'col-span-2' : ''} py-16 text-center`}>
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm" style={style.muted}>No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CartView({ p, style, cart, cartTotal, customer, isOrdering, merchantId, onBack, onRemove, onQtyChange, onOrder }: {
  p: StorefrontPreset; style: any; cart: CartItem[]; cartTotal: number; customer: any;
  isOrdering: boolean; merchantId: string; onBack: () => void; onRemove: (id: string) => void;
  onQtyChange: (id: string, delta: number) => void; onOrder: (address: string, couponCode?: string, redeemPoints?: number) => void;
}) {
  const [address, setAddress] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState<{ discount: number; description: string; code: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [loyalty, setLoyalty] = useState<{ enabled: boolean; points: number; redeemRate: number; minRedeemPoints: number } | null>(null);
  const [usePoints, setUsePoints] = useState(false);

  useEffect(() => {
    if (customer?.userId) {
      fetch(`/api/storefront/${merchantId}/loyalty?lineUserId=${customer.userId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.enabled) setLoyalty(data); })
        .catch(() => {});
    }
  }, [customer, merchantId]);

  const validateCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    setCouponResult(null);
    try {
      const res = await fetch(`/api/storefront/${merchantId}/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), orderTotal: cartTotal }),
      });
      const data = await res.json();
      if (res.ok && data.valid) setCouponResult(data);
      else setCouponError(data.error || 'Invalid coupon');
    } catch { setCouponError('Failed to validate coupon'); }
    finally { setValidatingCoupon(false); }
  };

  const pointsDiscount = loyalty && usePoints && loyalty.points >= loyalty.minRedeemPoints
    ? Math.floor(Math.min(loyalty.points, loyalty.points) / loyalty.redeemRate)
    : 0;
  const totalDiscount = (couponResult?.discount ?? 0) + pointsDiscount;
  const finalTotal = Math.max(0, cartTotal - totalDiscount);

  return (
    <div style={style.page}>
      <div style={style.header} className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3">
        <button onClick={onBack} style={{ color: p.textPrimary }} className="p-1.5 rounded-xl"><ChevronLeft size={20} /></button>
        <span className="font-semibold text-sm">Cart ({cart.length} items)</span>
      </div>
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {cart.map(item => (
          <div key={`${item.productId}-${item.variantLabel}`} style={style.card} className="rounded-2xl p-3 flex items-center gap-3">
            {item.imageUrl
              ? <img src={item.imageUrl} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt={item.name} />
              : <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: p.inputBg }}><Package size={20} style={style.muted} /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm line-clamp-1">{item.name}</p>
              {item.variantLabel && <p className="text-xs" style={style.muted}>{item.variantLabel}</p>}
              <p className="font-bold text-sm" style={{ color: p.accent }}>฿{(item.price * item.qty).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onQtyChange(item.productId, -1)} style={style.card} className="w-7 h-7 rounded-lg flex items-center justify-center"><Minus size={12} /></button>
              <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
              <button onClick={() => onQtyChange(item.productId, 1)} style={style.card} className="w-7 h-7 rounded-lg flex items-center justify-center"><Plus size={12} /></button>
              <button onClick={() => onRemove(item.productId)} className="w-7 h-7 ml-1 rounded-lg flex items-center justify-center" style={{ color: '#ef4444' }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}

        {/* Coupon input */}
        <div style={style.card} className="rounded-2xl p-4">
          <p className="text-sm font-medium mb-2">Coupon Code</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponResult(null); setCouponError(''); }}
              placeholder="Enter coupon code"
              style={{ ...style.input, flex: 1, borderRadius: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', outline: 'none', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '0.1em' }}
            />
            <button
              onClick={validateCoupon}
              disabled={!couponInput.trim() || validatingCoupon}
              style={couponResult ? { background: '#00b900', color: '#fff' } : style.accent}
              className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 whitespace-nowrap"
            >
              {validatingCoupon ? '...' : couponResult ? '✓ Applied' : 'Apply'}
            </button>
          </div>
          {couponResult && <p className="text-xs mt-1.5 font-medium" style={{ color: '#00b900' }}>-฿{couponResult.discount.toLocaleString()} ({couponResult.description})</p>}
          {couponError && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{couponError}</p>}
        </div>

        {/* Loyalty points */}
        {loyalty && loyalty.points >= loyalty.minRedeemPoints && (
          <div style={style.card} className="rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Loyalty Points</p>
                <p className="text-xs mt-0.5" style={style.muted}>You have {loyalty.points.toLocaleString()} pts · {loyalty.redeemRate} pts = ฿1</p>
              </div>
              <div className="flex items-center gap-2">
                {usePoints && <span className="text-xs font-bold" style={{ color: '#00b900' }}>-฿{pointsDiscount.toLocaleString()}</span>}
                <button
                  onClick={() => setUsePoints(v => !v)}
                  style={usePoints ? { background: '#00b900' } : style.card}
                  className="relative w-11 h-6 rounded-full transition-colors"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${usePoints ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={style.card} className="rounded-2xl p-4">
          <p className="text-sm font-medium mb-2">Delivery address</p>
          <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} placeholder="Enter your delivery address..."
            style={{ ...style.input, resize: 'none' as const, width: '100%', borderRadius: '0.75rem', padding: '0.75rem', fontSize: '0.875rem', outline: 'none', display: 'block' }} />
        </div>

        <div style={style.card} className="rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span style={style.muted}>Subtotal</span>
            <span>฿{cartTotal.toLocaleString()}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#00b900' }}>Discount</span>
              <span style={{ color: '#00b900' }}>-฿{totalDiscount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between font-bold">
            <span>Total</span>
            <span className="text-lg" style={{ color: p.accent }}>฿{finalTotal.toLocaleString()}</span>
          </div>
        </div>

        {!customer && (
          <div className="rounded-xl p-3 text-sm text-center" style={{ background: `${p.accent}20`, color: p.accent }}>
            Please open this store in LINE to place an order
          </div>
        )}
        <button disabled={!customer || !address.trim() || isOrdering || cart.length === 0}
          onClick={() => onOrder(address, couponResult?.code, usePoints ? loyalty?.points : undefined)}
          style={style.accent}
          className="w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {isOrdering ? 'Placing order...' : <><ArrowRight size={16} /> Place order</>}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, Search, X, CheckCircle, ArrowRight, Package } from 'lucide-react';
import liff from '@line/liff';
import { resolvePreset, type StorefrontPreset } from '@/lib/storefrontPresets';
import { getAccentText } from '@/lib/accent';

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
  // Fix 14: cart toast state
  const [cartToast, setCartToast] = useState(false);
  const liffLock = useRef(false);

  // Non-LINE platforms embed identity in URL params; LINE uses LIFF
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUid = urlParams.get('uid');
    const urlPlatform = urlParams.get('platform');
    const urlName = urlParams.get('name');
    const urlProduct = urlParams.get('product');
    const isNonLinePlatform = !!(urlUid && urlPlatform && urlPlatform !== 'line');

    if (isNonLinePlatform) {
      setCustomer({ userId: urlUid, displayName: urlName || urlUid, platform: urlPlatform });
    } else {
      const cached = localStorage.getItem(`liff_profile_${merchantId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Support both plain profile objects (legacy) and {profile, cachedAt} shape
          if (parsed && parsed.cachedAt !== undefined) {
            if (Date.now() - parsed.cachedAt > 24 * 60 * 60 * 1000) {
              localStorage.removeItem(`liff_profile_${merchantId}`);
            } else {
              setCustomer(parsed.profile);
            }
          } else {
            // Legacy cache without TTL — accept it but don't re-set
            setCustomer(parsed);
          }
        } catch { localStorage.removeItem(`liff_profile_${merchantId}`); }
      }
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
        const prodList: any[] = Array.isArray(prods) ? prods : [];
        setProducts(prodList);

        // Deep-link: open specific product if ?product= param is present
        if (urlProduct) {
          const found = prodList.find((p: any) => String(p._id) === urlProduct);
          if (found) {
            setSelectedProduct(found);
            setSelectedVariant(null);
            setSelections({});
            setQty(1);
            setActiveImgIdx(0);
            setView('detail');
          }
        }

        if (!isNonLinePlatform && info.liffId && !liffLock.current) {
          liffLock.current = true;
          try {
            await liff.init({ liffId: info.liffId, withLoginOnExternalBrowser: true });
            if (liff.isLoggedIn()) {
              const profile = await liff.getProfile();
              setCustomer(profile);
              localStorage.setItem(`liff_profile_${merchantId}`, JSON.stringify({ profile, cachedAt: Date.now() }));
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
  const accentText = getAccentText(sf.accentColor || p.accent);

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

  // Fix 13: memoize cartTotal and cartCount
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  // Fix 18: memoize style object
  const style = useMemo(() => ({
    page: { background: p.pageBg, color: p.textPrimary, minHeight: '100vh' } as React.CSSProperties,
    header: { background: p.headerBg, borderBottom: `1px solid ${p.headerBorder}` } as React.CSSProperties,
    card: { background: p.cardBg, border: `1px solid ${p.cardBorder}` } as React.CSSProperties,
    input: { background: p.inputBg, border: `1px solid ${p.inputBorder}`, color: p.textPrimary } as React.CSSProperties,
    accent: { background: sf.accentGradient || p.accent, color: accentText } as React.CSSProperties,
    pill: (active: boolean): React.CSSProperties => ({ background: active ? p.pillActiveBg : p.pillBg, color: active ? p.pillActiveText : p.textMuted }),
    muted: { color: p.textMuted } as React.CSSProperties,
    sub: { color: p.textSecondary } as React.CSSProperties,
  }), [p, sf, accentText]);

  // Fix 14: addToCart with toast
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
    setCartToast(true);
    setTimeout(() => setCartToast(false), 2000);
    setView('home'); setQty(1);
  }

  async function placeOrder(address: string, couponCode?: string, redeemPoints?: number): Promise<string | null> {
    if (!customer) return 'Please open this store from your messaging app to place an order';
    setIsOrdering(true);
    try {
      const items = cart.map(i => ({ productId: i.productId, name: i.name, variantLabel: i.variantLabel, price: i.price, qty: i.qty, imageUrl: i.imageUrl }));
      const isLiffClient = liff.isInClient?.() ?? false;
      const res = await fetch(`/api/storefront/${merchantId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: customer.userId, platform: customer.platform || 'line', displayName: customer.displayName, address, items,
          product: items.map(i => `${i.qty > 1 ? `${i.qty}x ` : ''}${i.name}`).join(', '),
          quantity: items.reduce((s, i) => s + i.qty, 0), soldTHB: cartTotal,
          couponCode: couponCode || undefined,
          redeemPoints: redeemPoints || undefined,
          isLiffClient,
        })
      });
      if (res.ok) {
        const orderData = await res.json();
        // When inside LINE's browser, send the order summary from the customer to the OA chat
        // so it appears in both the merchant's LINE app and the dashboard chat view
        if (isLiffClient && (customer.platform || 'line') === 'line') {
          const finalPrice = orderData.soldTHB ?? cartTotal;
          const summary = `📦 สั่งซื้อแล้ว!\n${items.map(i => `• ${i.qty > 1 ? `${i.qty}x ` : ''}${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}`).join('\n')}\n\nรวม ฿${finalPrice.toLocaleString()}`;
          try { await liff.sendMessages([{ type: 'text', text: summary }]); } catch { /* not available in all LIFF contexts */ }
        }
        setCart([]); setView('payment'); return null;
      }
      const err = await res.json().catch(() => ({}));
      return err.error || 'Failed to place order. Please try again.';
    } catch {
      return 'Network error. Please check your connection and try again.';
    } finally { setIsOrdering(false); }
  }

  if (notFound) return (
    <div style={style.page} className="flex items-center justify-center">
      <div className="text-center p-8">
        <Package size={48} className="mx-auto mb-4 opacity-30" />
        <h1 className="text-xl font-bold mb-2">Store not found</h1>
        <p style={style.muted} className="text-sm">This store link may be invalid or no longer exists.</p>
      </div>
    </div>
  );

  if (shopInfo && sf.maintenanceMode) return (
    <div style={style.page} className="flex items-center justify-center min-h-screen">
      <div className="text-center p-8 max-w-sm">
        <div className="text-5xl mb-4">🔧</div>
        <h1 className="text-xl font-bold mb-2">{shopInfo.shopName || 'Store'}</h1>
        <p style={style.muted} className="text-sm">{sf.maintenanceMessage || 'We will be back soon.'}</p>
      </div>
    </div>
  );

  // Fix 9: loading spinner with role="status"
  if (!shopInfo) return (
    <div style={{ ...style.page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} className="animate-fade-in">
      <div className="flex items-center justify-center py-6">
        <div role="status" aria-label="Loading store">
          <div aria-hidden="true" className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${p.accent}40`, borderTopColor: p.accent }} />
        </div>
      </div>
      {/* Skeleton placeholder grid — supplements the spinner above while products load */}
      <div aria-hidden="true" className="p-4 max-w-2xl w-full mx-auto grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl overflow-hidden" style={{ ...style.card, animationDelay: `${idx * 40}ms` }}>
            <div className="w-full aspect-square skeleton-shimmer" style={{ background: p.inputBg }} />
            <div className="p-3 space-y-2">
              <div className="h-3 rounded skeleton-shimmer" style={{ background: p.inputBg, width: '80%' }} />
              <div className="h-3 rounded skeleton-shimmer" style={{ background: p.inputBg, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (view === 'payment') return (
    <div style={style.page} className="flex items-center justify-center p-4 animate-fade-in">
      <div style={style.card} className="rounded-2xl p-8 w-full max-w-sm text-center">
        <CheckCircle size={48} className="mx-auto mb-4" style={{ color: p.accent }} />
        <h2 className="text-xl font-bold mb-2">Order placed!</h2>
        <p style={style.muted} className="text-sm mb-6">We'll contact you when your order is ready for payment.</p>
        <button onClick={() => setView('home')} style={style.accent} className="w-full rounded-xl py-3 font-semibold text-sm">Continue shopping</button>
      </div>
    </div>
  );

  if (view === 'detail' && selectedProduct) {
    const productOptions = getProductOptions(selectedProduct);
    const allSelected = productOptions.every(o => selections[o.name]);
    const imgs: string[] = selectedProduct.images?.length ? selectedProduct.images : (selectedProduct.imageUrl ? [selectedProduct.imageUrl] : []);
    const displayImg = selectedVariant?.imageUrl || imgs[activeImgIdx] || imgs[0] || null;
    // Fix 16: out-of-stock detection
    const isOutOfStock = selectedProduct.trackStock === true && (selectedProduct.stock ?? 0) <= 0;
    return (
      <div style={style.page} className="animate-fade-in">
        {/* Fix 5 & 15: back button p-3, aria-label, cart button in header */}
        <div style={style.header} className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3">
          <button onClick={() => setView('home')} aria-label="Back" style={{ color: p.textPrimary }} className="p-3 rounded-xl"><ChevronLeft size={20} /></button>
          <span className="font-semibold text-sm flex-1">{selectedProduct.name}</span>
          {cartCount > 0 && (
            <button
              onClick={() => setView('cart')}
              aria-label={`View cart, ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
              className="relative p-2"
              style={{ color: p.textPrimary }}
            >
              <ShoppingBag size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={style.accent}>{cartCount}</span>
            </button>
          )}
        </div>
        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {displayImg
            ? <img src={displayImg} alt={selectedProduct.name} className="w-full aspect-square object-cover rounded-2xl animate-fade-in" />
            : <div className="w-full aspect-square rounded-2xl flex items-center justify-center" style={{ background: p.inputBg }}><Package size={48} style={style.muted} /></div>
          }
          {/* Fix 6: thumbnail buttons with aria-label and aria-pressed */}
          {imgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imgs.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImgIdx(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={activeImgIdx === i}
                  className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all"
                  style={{ borderColor: !selectedVariant?.imageUrl && activeImgIdx === i ? p.accent : 'transparent', opacity: !selectedVariant?.imageUrl && activeImgIdx === i ? 1 : 0.6 }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover animate-fade-in" />
                </button>
              ))}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold">{selectedProduct.name}</h2>
            {selectedProduct.brand && <p className="text-sm" style={style.muted}>{selectedProduct.brand}</p>}
            <p key={selectedVariant?._id ?? 'base'} className="text-xl font-bold mt-1 animate-scale-in" style={{ color: p.accent }}>฿{(selectedVariant?.price ?? selectedProduct.price).toLocaleString()}</p>
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
          {/* Fix 1: qty stepper touch targets w-8 h-8 -> w-11 h-11 */}
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">Qty</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={style.card} className="w-11 h-11 rounded-lg flex items-center justify-center"><Minus size={14} /></button>
              <span key={qty} className="w-6 text-center font-semibold animate-scale-in">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} style={style.card} className="w-11 h-11 rounded-lg flex items-center justify-center"><Plus size={14} /></button>
            </div>
          </div>
          {/* Fix 16: disable add-to-cart and show out-of-stock */}
          {isOutOfStock ? (
            <button disabled style={{ background: '#ccc', color: '#fff' }} className="w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 opacity-60">
              Out of stock
            </button>
          ) : (
            <button onClick={addToCart} disabled={!allSelected} style={allSelected ? style.accent : { background: '#ccc', color: '#fff' }} className="w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <ShoppingBag size={16} /> {allSelected ? 'Add to cart' : 'Select options'}
            </button>
          )}
        </div>
        {/* Fix 14: cart toast */}
        {cartToast && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium text-white z-50 animate-toast" style={{ background: p.accent }}>Added to cart</div>
        )}
      </div>
    );
  }

  if (view === 'cart') return (
    <CartView p={p} style={style} cart={cart} cartTotal={cartTotal} customer={customer} isOrdering={isOrdering}
      merchantId={merchantId}
      onBack={() => setView('home')}
      onRemove={(key: string) => setCart(prev => prev.filter(i => `${i.productId}-${i.variantLabel}` !== key))}
      onQtyChange={(key: string, delta: number) => setCart(prev => prev.map(i => `${i.productId}-${i.variantLabel}` === key ? { ...i, qty: Math.max(1, i.qty + delta) } : i))}
      onOrder={placeOrder}
    />
  );

  const announcementBgMap: Record<string, string> = {
    blue:   '#3b82f6', amber: '#f59e0b', red: '#ef4444',
    accent: sf.accentGradient || p.accent,
  };
  const announcementBg = announcementBgMap[sf.announcementColor || 'accent'] ?? p.accent;

  return (
    <div style={style.page} className="animate-fade-in">
      {/* Fix 8: single announcement block — only show when enabled */}
      {sf.announcementText && sf.announcementEnabled && (
        <div className="px-4 py-1.5 text-xs text-center font-medium" style={{ background: announcementBg, color: sf.announcementColor === 'accent' ? accentText : '#ffffff' }}>{sf.announcementText}</div>
      )}
      <div style={style.header} className="sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Fix 7: logo alt text */}
            {shopInfo.shopLogoUrl
              ? <img src={shopInfo.shopLogoUrl} alt={`${shopInfo.shopName} logo`} className="w-8 h-8 rounded-xl object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
              : <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={style.accent}>{(shopInfo.shopName || 'S')[0]}</div>
            }
            <div>
              <p className="font-bold text-sm">{shopInfo.shopName}</p>
              {sf.shopTagline && <p className="text-xs" style={style.muted}>{sf.shopTagline}</p>}
            </div>
          </div>
          {/* Fix 2: cart button aria-label */}
          {cartCount > 0 && (
            <button
              onClick={() => setView('cart')}
              aria-label={`View cart, ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
              className="relative p-2"
              style={{ color: p.textPrimary }}
            >
              <ShoppingBag size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold" style={style.accent}>{cartCount}</span>
            </button>
          )}
        </div>
        {/* Fix 7: banner alt text */}
        {sf.bannerUrl && (
          <img src={sf.bannerUrl} alt={`${shopInfo.shopName} banner`} className="w-full h-28 object-cover animate-fade-in" onError={e => (e.currentTarget.style.display = 'none')} />
        )}
        {/* Fix 3: search role and aria-labels */}
        {sf.showSearch !== false && (
          <div className="px-4 pb-2">
            <div role="search" className="flex items-center gap-2 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-accent/30 transition-all" style={style.input}>
              <Search size={14} style={style.muted} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: p.textPrimary }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="p-3">
                  <X size={14} style={style.muted} />
                </button>
              )}
            </div>
          </div>
        )}
        {/* Fix 4: category filter pill padding and focus-visible */}
        {sf.showCategoryFilter !== false && categories.length > 1 && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="flex-shrink-0 px-3 py-2.5 rounded-lg text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={style.pill(activeCategory === cat)}>{cat}</button>
            ))}
          </div>
        )}
        {/* Fix 4: brand filter pill padding and focus-visible */}
        {sf.showBrandFilter !== false && brands.length > 1 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {brands.map(b => (
              <button key={b} onClick={() => setActiveBrand(b)} className="flex-shrink-0 px-3 py-2.5 rounded-lg text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={style.pill(activeBrand === b)}>{b}</button>
            ))}
          </div>
        )}
      </div>

      <div key={`${searchQuery}-${activeCategory}-${activeBrand}`} className={`p-4 max-w-2xl mx-auto ${cardLayout === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}`}>
        {filtered.map((pr, idx) => {
          // Fix 16: out-of-stock on product card
          const cardOutOfStock = pr.trackStock === true && (pr.stock ?? 0) <= 0;
          return (
            <button key={pr._id}
              onClick={() => { setSelectedProduct(pr); setSelectedVariant(null); setSelections({}); setQty(1); setActiveImgIdx(0); setView('detail'); }}
              className={`rounded-2xl overflow-hidden text-left transition-all active:scale-95 hover-lift group animate-scale-in ${cardLayout === 'list' ? 'flex gap-3 p-3' : ''}`}
              style={{ ...style.card, animationDelay: `${idx * 40}ms` }}
            >
              {cardLayout === 'grid' ? (
                <>
                  <div className="relative overflow-hidden">
                    {pr.imageUrl
                      ? <img src={pr.imageUrl} alt={pr.name} className="w-full aspect-square object-cover animate-fade-in transition-transform duration-300 group-hover:scale-105" />
                      : <div className="w-full aspect-square flex items-center justify-center" style={{ background: p.inputBg }}><Package size={32} style={style.muted} /></div>
                    }
                    {cardOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold px-2 py-1 rounded-lg bg-black/60">Out of stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm leading-tight line-clamp-2">{pr.name}</p>
                    {pr.brand && <p className="text-xs mt-0.5" style={style.muted}>{pr.brand}</p>}
                    <p className="font-bold text-sm mt-1" style={{ color: p.accent }}>฿{pr.price.toLocaleString()}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex-shrink-0 overflow-hidden">
                    {pr.imageUrl
                      ? <img src={pr.imageUrl} alt={pr.name} className="w-16 h-16 rounded-xl object-cover animate-fade-in transition-transform duration-300 group-hover:scale-105" />
                      : <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: p.inputBg }}><Package size={20} style={style.muted} /></div>
                    }
                    {cardOutOfStock && (
                      <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">OOS</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p className="font-semibold text-sm line-clamp-2">{pr.name}</p>
                    {pr.brand && <p className="text-xs mt-0.5" style={style.muted}>{pr.brand}</p>}
                    <p className="font-bold text-sm mt-1" style={{ color: p.accent }}>฿{pr.price.toLocaleString()}</p>
                    {cardOutOfStock && <p className="text-xs font-medium mt-0.5" style={{ color: '#ef4444' }}>Out of stock</p>}
                  </div>
                </>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className={`${cardLayout === 'grid' ? 'col-span-2' : ''} py-16 text-center animate-fade-in animate-scale-in`}>
            <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: `${p.accent}20` }}>
              <Package size={28} style={{ color: p.accent }} />
            </div>
            <p className="text-sm" style={style.muted}>No products found</p>
          </div>
        )}
      </div>
      {/* Fix 14: toast shown on home view after navigating back */}
      {cartToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium text-white z-50 animate-toast" style={{ background: p.accent }}>Added to cart</div>
      )}
    </div>
  );
}

function CartView({ p, style, cart, cartTotal, customer, isOrdering, merchantId, onBack, onRemove, onQtyChange, onOrder }: {
  p: StorefrontPreset; style: any; cart: CartItem[]; cartTotal: number; customer: any;
  isOrdering: boolean; merchantId: string; onBack: () => void; onRemove: (key: string) => void;
  onQtyChange: (key: string, delta: number) => void; onOrder: (address: string, couponCode?: string, redeemPoints?: number) => Promise<string | null>;
}) {
  const [address, setAddress] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState<{ discount: number; description: string; code: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [loyalty, setLoyalty] = useState<{ enabled: boolean; points: number; redeemRate: number; minRedeemPoints: number } | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    if (customer?.userId) {
      fetch(`/api/storefront/${merchantId}/loyalty?userId=${customer.userId}`)
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

  const couponDiscount = couponResult?.discount ?? 0;
  const remainingAfterCoupon = Math.max(0, cartTotal - couponDiscount);
  const maxPointsNeeded = Math.ceil(remainingAfterCoupon * (loyalty?.redeemRate ?? 100));
  const pointsToUse = loyalty ? Math.min(loyalty.points, maxPointsNeeded) : 0;
  const pointsDiscount = loyalty && usePoints && loyalty.points >= loyalty.minRedeemPoints
    ? Math.floor(pointsToUse / loyalty.redeemRate)
    : 0;
  const totalDiscount = couponDiscount + pointsDiscount;
  const finalTotal = Math.max(0, cartTotal - totalDiscount);

  return (
    <div style={style.page} className="animate-fade-in">
      {/* Fix 5: back button p-3 and aria-label */}
      <div style={style.header} className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3">
        <button onClick={onBack} aria-label="Back" style={{ color: p.textPrimary }} className="p-3 rounded-xl"><ChevronLeft size={20} /></button>
        <span className="font-semibold text-sm">Cart ({cart.length} items)</span>
      </div>
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {cart.map((item, idx) => (
          <div key={`${item.productId}-${item.variantLabel}`} data-cart-item="true" style={{ ...style.card, animationDelay: `${idx * 50}ms` }} className="rounded-2xl p-3 flex items-center gap-3 animate-slide-left">
            {item.imageUrl
              ? <img src={item.imageUrl} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 animate-fade-in" alt={item.name} />
              : <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: p.inputBg }}><Package size={20} style={style.muted} /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm line-clamp-1">{item.name}</p>
              {item.variantLabel && <p className="text-xs" style={style.muted}>{item.variantLabel}</p>}
              <p className="font-bold text-sm" style={{ color: p.accent }}>฿{(item.price * item.qty).toLocaleString()}</p>
            </div>
            {/* Fix 1: cart row qty buttons w-7 h-7 -> w-10 h-10; trash w-7 h-7 -> w-10 h-10 */}
            <div className="flex items-center gap-1">
              <button onClick={() => onQtyChange(`${item.productId}-${item.variantLabel}`, -1)} style={style.card} className="w-10 h-10 rounded-lg flex items-center justify-center"><Minus size={12} /></button>
              <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
              <button onClick={() => onQtyChange(`${item.productId}-${item.variantLabel}`, 1)} style={style.card} className="w-10 h-10 rounded-lg flex items-center justify-center"><Plus size={12} /></button>
              <button
                onClick={(e) => {
                  const el = (e.currentTarget as HTMLElement).closest('[data-cart-item]');
                  if (el) {
                    el.classList.add('animate-cart-exit');
                    setTimeout(() => onRemove(`${item.productId}-${item.variantLabel}`), 280);
                  } else {
                    onRemove(`${item.productId}-${item.variantLabel}`);
                  }
                }}
                className="w-10 h-10 ml-1 rounded-lg flex items-center justify-center"
                style={{ color: '#ef4444' }}
              ><Trash2 size={12} /></button>
            </div>
          </div>
        ))}

        {/* Fix 11: Coupon input label */}
        <div style={style.card} className="rounded-2xl p-4">
          <label htmlFor="coupon-code" className="text-sm font-medium mb-2 block">Coupon Code</label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
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

        {/* Fix 12: Loyalty points toggle ARIA */}
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
                  role="switch"
                  aria-checked={usePoints}
                  aria-label="Use loyalty points for discount"
                  style={usePoints ? { background: '#00b900' } : style.card}
                  className="relative w-11 h-6 rounded-full transition-colors"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${usePoints ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fix 10: Delivery address label and textarea id */}
        <div style={style.card} className="rounded-2xl p-4">
          <label htmlFor="delivery-address" className="text-sm font-medium mb-2 block">Delivery address</label>
          <textarea id="delivery-address" value={address} onChange={e => setAddress(e.target.value)} rows={3} placeholder="Enter your delivery address..."
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
            Please open this store from your messaging app to place an order
          </div>
        )}
        {orderError && (
          <div className="rounded-xl p-3 text-sm text-center" style={{ background: '#fee2e2', color: '#dc2626' }}>
            {orderError}
          </div>
        )}
        <button disabled={!customer || !address.trim() || isOrdering || cart.length === 0}
          onClick={async () => {
            setOrderError('');
            const err = await onOrder(address, couponResult?.code, usePoints && loyalty ? pointsToUse : undefined);
            if (err) setOrderError(err);
          }}
          style={style.accent}
          className="w-full rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {isOrdering ? 'Placing order...' : <><ArrowRight size={16} /> Place order</>}
        </button>
      </div>
    </div>
  );
}

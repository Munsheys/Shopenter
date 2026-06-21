'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingBag, ChevronLeft, Plus, Minus, Trash2, User, Search, X, CheckCircle, ArrowRight, Package, ChevronDown } from 'lucide-react';
import liff from '@line/liff';
import { resolvePreset, resolveAnnouncementColor, type StorefrontPreset } from '@/lib/storefrontPresets';
import {
  cardRadiusClass, controlRadiusClass, pillRadiusClass, gridGapClass, sectionGapClass, headingFontClass,
  type HeaderStyle, type HeroStyle, type CardStyle,
} from '@/lib/storefrontLayouts';
import { getAccentText } from '@/lib/accent';

type CartItem = { productId: string; name: string; price: number; variantLabel?: string; qty: number; imageUrl?: string };
type View = 'home' | 'detail' | 'cart' | 'payment';
type PriceRange = 'all' | 'under500' | '500-1000' | '1000-3000' | 'over3000';

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

function ProductImg({ src, alt, className, bg, iconColor, iconSize = 32, eager }: {
  src?: string; alt: string; className?: string; bg: string; iconColor?: string; iconSize?: number; eager?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className={`flex items-center justify-center ${className ?? ''}`} style={{ background: bg }}>
        <Package size={iconSize} style={iconColor ? { color: iconColor } : undefined} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}

const PRICE_RANGE_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: 'all', label: 'All Prices' },
  { value: 'under500', label: 'Under ฿500' },
  { value: '500-1000', label: '฿500 – ฿1,000' },
  { value: '1000-3000', label: '฿1,000 – ฿3,000' },
  { value: 'over3000', label: 'Over ฿3,000' },
];

/* ─── Dropdown Filter Component ─────────────────────────────────── */
function FilterDropdown({ label, value, options, onChange, p, radius }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  p: StorefrontPreset;
  radius: string;
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
        className={`flex items-center gap-2 pl-5 pr-4 py-2.5 ${radius} border text-sm transition-all shadow-sm cursor-pointer`}
        style={{ background: p.inputBg, borderColor: p.inputBorder }}
      >
        <span className="flex flex-col items-start">
          <span className="text-[10px] font-medium leading-none" style={{ color: p.textMuted }}>{label}</span>
          <span className="font-bold text-[13px] leading-tight" style={{ color: p.textPrimary }}>{selectedLabel}</span>
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: p.textMuted }} />
      </button>

      {open && (
        <div className={`absolute top-full left-0 mt-2 ${cardRadiusClass('soft')} border shadow-xl z-50 min-w-[180px] py-2 animate-in fade-in slide-in-from-top-2 duration-200`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-5 py-2.5 text-sm transition-colors cursor-pointer font-medium"
              style={value === opt.value ? { color: p.accent, fontWeight: 700, background: `${p.accent}0d` } : { color: p.textSecondary }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StorefrontView({ merchantId }: { merchantId: string }) {
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<View>('home');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeBrand, setActiveBrand] = useState('All');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [customer, setCustomer] = useState<any>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [notFound, setNotFound] = useState(false);
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
          if (parsed && parsed.cachedAt !== undefined) {
            if (Date.now() - parsed.cachedAt > 24 * 60 * 60 * 1000) {
              localStorage.removeItem(`liff_profile_${merchantId}`);
            } else {
              setCustomer(parsed.profile);
            }
          } else {
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

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, activeBrand, priceRange]);

  const filtered = useMemo(() => products.filter(pr => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || pr.name?.toLowerCase().includes(q) || pr.brand?.toLowerCase().includes(q);
    const matchCategory = activeCategory === 'All' || pr.categories?.includes(activeCategory);
    const matchBrand = activeBrand === 'All' || pr.brand === activeBrand;

    // Price range filter
    let matchPrice = true;
    if (priceRange !== 'all') {
      const price = pr.price || 0;
      switch (priceRange) {
        case 'under500': matchPrice = price < 500; break;
        case '500-1000': matchPrice = price >= 500 && price <= 1000; break;
        case '1000-3000': matchPrice = price >= 1000 && price <= 3000; break;
        case 'over3000': matchPrice = price > 3000; break;
      }
    }

    return matchSearch && matchCategory && matchBrand && matchPrice;
  }), [products, searchQuery, activeCategory, activeBrand, priceRange]);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const sf = shopInfo?.storefront ?? {};

  // Theme + layout slots — every store can look structurally different from these independent controls
  const p = resolvePreset(sf.preset || 'linen', sf.accentColor);
  const localAccentBg = sf.accentGradient || p.accent;
  const accentText = p.accentText;
  const cardRadius = cardRadiusClass(sf.cornerStyle || 'soft');
  const controlRadius = controlRadiusClass(sf.cornerStyle || 'soft');
  const pillRadius = pillRadiusClass(sf.cornerStyle || 'soft');
  const gridGap = gridGapClass(sf.density || 'comfortable');
  const sectionGap = sectionGapClass(sf.density || 'comfortable');
  const headingFont = headingFontClass(sf.typography || 'modern');
  const headerStyle: HeaderStyle = sf.headerStyle || 'logo-left';
  const heroStyle: HeroStyle = sf.heroStyle || 'classic';
  const cardStyle: CardStyle = sf.cardStyle || 'bordered';
  const showPriceFilter = sf.showPriceFilter !== false;

  // Pagination values
  const paginationEnabled = sf.paginationEnabled ?? false;
  const productsPerPage = sf.productsPerPage ?? 20;

  const paginatedProducts = useMemo(() => {
    if (!paginationEnabled) return filtered;
    return filtered.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);
  }, [filtered, paginationEnabled, currentPage, productsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filtered.length / productsPerPage);
  }, [filtered, productsPerPage]);

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

  const isOutOfStock = (p: any) => {
    if (p.stock === 0) return true;
    if (p.trackStock && p.stock !== undefined && p.stock <= 0) return true;
    return false;
  };

  const getVariantDot = (p: any) => {
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

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: p.pageBg, color: p.textPrimary }}>
      <div className="text-center p-8">
        <Package size={48} className="mx-auto mb-4 opacity-30" />
        <h1 className="text-xl font-bold mb-2">Store not found</h1>
        <p className="text-sm opacity-50">This store link may be invalid or no longer exists.</p>
      </div>
    </div>
  );

  if (shopInfo && sf.maintenanceMode) return (
    <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: p.pageBg, color: p.textPrimary }}>
      <div className="text-center p-8 max-w-sm">
        <div className="text-5xl mb-4">🔧</div>
        <h1 className="text-xl font-bold mb-2">{shopInfo.shopName || 'Store'}</h1>
        <p className="text-sm opacity-50">{sf.maintenanceMessage || 'We will be back soon.'}</p>
      </div>
    </div>
  );

  if (!shopInfo) return (
    <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: p.pageBg }}>
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: `2px solid ${p.accent}33`, borderTopColor: p.accent }} />
    </div>
  );

  const showFeaturedRow = sf.showFeaturedRow !== false;
  const filterStyle = sf.filterStyle || 'dropdowns';

  const priceFilterDropdown = showPriceFilter && (
    <FilterDropdown label="Price" value={priceRange} options={PRICE_RANGE_OPTIONS} onChange={val => setPriceRange(val as PriceRange)} p={p} radius="rounded-full" />
  );

  const priceFilterPills = showPriceFilter && (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: `${p.textMuted}` }}>Price</p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {PRICE_RANGE_OPTIONS.map(opt => {
          const active = priceRange === opt.value;
          return (
            <button key={opt.value} onClick={() => setPriceRange(opt.value)}
              className={`flex-shrink-0 px-4 py-2 ${pillRadius} text-xs font-semibold transition-all cursor-pointer border`}
              style={active ? { background: p.pillActiveBg, color: p.pillActiveText, borderColor: p.pillActiveBg } : { background: p.pillBg, color: p.textMuted, borderColor: p.inputBorder }}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  function cardSurfaceStyle(): React.CSSProperties {
    if (cardStyle === 'minimal') return {};
    if (cardStyle === 'shadow') return { background: p.cardBg };
    return { background: p.cardBg, border: `1px solid ${p.cardBorder}` };
  }
  const cardSurfaceClass = cardStyle === 'shadow' ? 'shadow-md hover:shadow-lg transition-shadow' : '';

  function BrandLabel({ product, overlay }: { product: any; overlay?: boolean }) {
    if (!product.brand) return null;
    if (cardStyle === 'badge') {
      if (!overlay) return null;
      return (
        <span className={`absolute top-2.5 left-2.5 px-2.5 py-1 text-[10px] font-bold ${pillRadius}`} style={{ background: p.pillActiveBg, color: p.pillActiveText }}>
          {product.brand}
        </span>
      );
    }
    if (overlay) return null;
    return <p className="text-[12px] font-medium" style={{ color: p.textMuted }}>By {product.brand}</p>;
  }

  return (
    <div className="min-h-screen font-sans selection:opacity-80" style={{ background: p.pageBg, color: p.textPrimary }}>
      {/* ═══ HEADER ═══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: `${p.headerBg}eb`, borderColor: p.headerBorder }}>
        <div className="relative flex items-center justify-between max-w-[1400px] mx-auto px-5 sm:px-8 py-3 sm:py-4">

          {/* Logo / Brand */}
          <button
            onClick={() => setView('home')}
            className={`flex items-center gap-2.5 min-w-0 cursor-pointer ${headerStyle === 'logo-center' ? 'absolute left-1/2 -translate-x-1/2' : ''}`}
          >
            {shopInfo.shopLogoUrl ? (
              <img src={shopInfo.shopLogoUrl} alt={shopInfo.shopName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
            ) : null}
            <span className={`text-xl sm:text-2xl leading-none truncate ${headingFont}`} style={{ color: p.textPrimary }}>
              {shopInfo.shopName}
            </span>
          </button>

          {headerStyle !== 'minimal' && headerStyle === 'logo-left' && (
            <nav className="hidden lg:flex items-center gap-8">
              <span className="text-sm font-bold underline underline-offset-4 decoration-2" style={{ color: p.textPrimary, textDecorationColor: p.accent }}>Shop</span>
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-5">
            {headerStyle !== 'minimal' && (
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="flex items-center gap-1.5 transition-colors cursor-pointer"
                style={{ color: p.textMuted }}
              >
                <Search size={18} />
                <span className="hidden sm:inline text-sm font-medium">Search</span>
              </button>
            )}

            {/* Cart */}
            <button
              onClick={() => {
                if (cart.length > 0) setView('cart');
              }}
              className="flex items-center gap-1.5 transition-colors cursor-pointer"
              style={{ color: p.textMuted }}
            >
              <ShoppingBag size={18} />
              <span className="text-sm font-bold" style={{ color: p.textPrimary }}>Cart {cartCount > 0 && cartCount}</span>
            </button>

            {/* Account */}
            {headerStyle !== 'minimal' && (
              customer ? (
                <div className="flex items-center gap-2">
                  {customer.pictureUrl ? (
                    <img src={customer.pictureUrl} className="w-8 h-8 rounded-full object-cover" style={{ border: `1px solid ${p.cardBorder}` }} alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: p.inputBg, border: `1px solid ${p.cardBorder}` }}>
                      <User size={14} style={{ color: p.textMuted }} />
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium truncate max-w-[100px]" style={{ color: p.textMuted }}>{customer.displayName}</span>
                </div>
              ) : (
                <button
                  onClick={() => liff.login()}
                  className="flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{ color: p.textMuted }}
                >
                  <User size={18} />
                  <span className="hidden sm:inline text-sm font-medium">My Account</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Search bar (expandable) */}
        {searchOpen && (
          <div className="border-t px-5 sm:px-8 py-3 animate-in slide-in-from-top-2 fade-in duration-200" style={{ borderColor: p.headerBorder }}>
            <div className="max-w-[1400px] mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: p.textMuted }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className={`w-full pl-11 pr-10 py-3 text-sm border ${controlRadius} outline-none transition-all`}
                style={{ background: p.inputBg, borderColor: p.inputBorder, color: p.textPrimary }}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: p.textMuted }}>
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Announcement bar (if enabled) */}
      {sf.announcementText && sf.announcementEnabled && (
        <div className="px-4 py-2 text-xs text-center font-bold" style={{ background: resolveAnnouncementColor(sf.announcementColor, localAccentBg), color: accentText }}>{sf.announcementText}</div>
      )}

      {/* ═══ HOME VIEW ════════════════════════════════════════════════ */}
      {view === 'home' && (
        <main className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-32">

          {/* Hero section */}
          {heroStyle !== 'none' && heroStyle === 'classic' && (
            <div className={sectionGap}>
              <h2 className={`text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] max-w-3xl ${headingFont}`} style={{ color: p.textPrimary }}>
                {sf.heroHeading || sf.shopTagline || "The Curated Merchant Showcase"}
              </h2>
              <p className="text-base sm:text-lg mt-3 max-w-2xl leading-relaxed font-medium opacity-60" style={{ color: p.textPrimary }}>
                {sf.heroDescription || shopInfo.shopDescription || "Explore a diverse selection of high-quality goods, sourced and sold by verified independent merchants. Discover unique and essential products for every lifestyle. Reliable. Authentic. Unique."}
              </p>
            </div>
          )}

          {heroStyle === 'banner-overlay' && sf.bannerUrl && (
            <div className={`relative w-full h-72 sm:h-96 ${cardRadius} overflow-hidden ${sectionGap}`}>
              <img src={sf.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/45" />
              <div className="relative h-full flex flex-col justify-end p-6 sm:p-10">
                <h2 className={`text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.1] max-w-2xl text-white ${headingFont}`}>
                  {sf.heroHeading || sf.shopTagline || "The Curated Merchant Showcase"}
                </h2>
                <p className="text-sm sm:text-base mt-2 max-w-xl leading-relaxed font-medium text-white/80">
                  {sf.heroDescription || shopInfo.shopDescription || "Explore a diverse selection of high-quality goods."}
                </p>
              </div>
            </div>
          )}
          {heroStyle === 'banner-overlay' && !sf.bannerUrl && (
            <div className={sectionGap}>
              <h2 className={`text-[clamp(2rem,5vw,3.5rem)] leading-[1.1] max-w-3xl ${headingFont}`} style={{ color: p.textPrimary }}>
                {sf.heroHeading || sf.shopTagline || "The Curated Merchant Showcase"}
              </h2>
              <p className="text-base sm:text-lg mt-3 max-w-2xl leading-relaxed font-medium opacity-60" style={{ color: p.textPrimary }}>
                {sf.heroDescription || shopInfo.shopDescription || "Explore a diverse selection of high-quality goods, sourced and sold by verified independent merchants."}
              </p>
            </div>
          )}

          {heroStyle === 'split' && (
            <div className={`flex flex-col sm:flex-row gap-6 sm:gap-10 items-stretch ${sectionGap}`}>
              <div className={`w-full sm:w-1/2 aspect-[4/3] sm:aspect-auto ${cardRadius} overflow-hidden flex-shrink-0`} style={{ background: sf.bannerUrl ? undefined : `${localAccentBg}1a` }}>
                {sf.bannerUrl ? (
                  <img src={sf.bannerUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package size={48} style={{ color: p.textMuted }} /></div>
                )}
              </div>
              <div className="w-full sm:w-1/2 flex flex-col justify-center">
                <h2 className={`text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] ${headingFont}`} style={{ color: p.textPrimary }}>
                  {sf.heroHeading || sf.shopTagline || "The Curated Merchant Showcase"}
                </h2>
                <p className="text-base mt-3 leading-relaxed font-medium opacity-60" style={{ color: p.textPrimary }}>
                  {sf.heroDescription || shopInfo.shopDescription || "Explore a diverse selection of high-quality goods, sourced and sold by verified independent merchants."}
                </p>
              </div>
            </div>
          )}

          {/* Filters styling row */}
          {filterStyle === 'dropdowns' ? (
            /* Dropdowns style */
            <div className={`flex flex-wrap gap-3 ${sectionGap}`}>
              {sf.showCategoryFilter !== false && categories.length > 1 && (
                <FilterDropdown
                  label="Category"
                  value={activeCategory}
                  options={categories.map(c => ({ value: c, label: c }))}
                  onChange={setActiveCategory}
                  p={p}
                  radius="rounded-full"
                />
              )}
              {sf.showBrandFilter !== false && brands.length > 1 && (
                <FilterDropdown
                  label="Brand"
                  value={activeBrand}
                  options={brands.map(b => ({ value: b, label: b }))}
                  onChange={(val) => { setActiveBrand(val); setActiveCategory('All'); }}
                  p={p}
                  radius="rounded-full"
                />
              )}
              {priceFilterDropdown}
            </div>
          ) : (
            /* Tag Pills Style */
            <div className={`space-y-4 ${sectionGap}`}>
              {sf.showCategoryFilter !== false && categories.length > 1 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: p.textMuted }}>Category</p>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {categories.map(cat => {
                      const active = activeCategory === cat;
                      return (
                        <button key={cat} onClick={() => setActiveCategory(cat)}
                          className={`flex-shrink-0 px-4 py-2 ${pillRadius} text-xs font-semibold transition-all cursor-pointer border`}
                          style={active ? { background: p.pillActiveBg, color: p.pillActiveText, borderColor: p.pillActiveBg } : { background: p.pillBg, color: p.textMuted, borderColor: p.inputBorder }}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {sf.showBrandFilter !== false && brands.length > 1 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1" style={{ color: p.textMuted }}>Brand</p>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {brands.map(b => {
                      const active = activeBrand === b;
                      return (
                        <button key={b} onClick={() => { setActiveBrand(b); setActiveCategory('All'); }}
                          className={`flex-shrink-0 px-4 py-2 ${pillRadius} text-xs font-semibold transition-all cursor-pointer border`}
                          style={active ? { background: p.pillActiveBg, color: p.pillActiveText, borderColor: p.pillActiveBg } : { background: p.pillBg, color: p.textMuted, borderColor: p.inputBorder }}>
                          {b}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {priceFilterPills}
            </div>
          )}

          {/* Product Grid */}
          {paginatedProducts.length === 0 ? (
            <div className="text-center py-24">
              <Package size={48} className="mx-auto mb-4 opacity-10" style={{ color: p.textPrimary }} />
              <p className="font-bold text-sm opacity-35" style={{ color: p.textPrimary }}>No items match your selection</p>
              <button
                onClick={() => { setActiveBrand('All'); setActiveCategory('All'); setSearchQuery(''); setPriceRange('all'); }}
                className="mt-4 text-sm font-bold underline underline-offset-4 cursor-pointer bg-transparent border-0"
                style={{ color: p.accent }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sf.cardLayout === 'list' ? (
                /* List view layout */
                <div className="flex flex-col gap-4">
                  {paginatedProducts.map((pr: any) => (
                    <button
                      key={pr._id}
                      onClick={() => { setSelectedProduct(pr); setSelections({}); setQty(1); setActiveImgIdx(0); setView('detail'); }}
                      className={`group flex gap-4 p-4 ${cardRadius} text-left transition-all active:scale-[0.99] cursor-pointer ${cardSurfaceClass}`}
                      style={cardSurfaceStyle()}
                    >
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-xl" style={{ background: p.inputBg }}>
                        {pr.imageUrl ? (
                          <img src={pr.imageUrl} alt={pr.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-10" style={{ color: p.textPrimary }}>
                            <Package size={24} />
                          </div>
                        )}
                        {isOutOfStock(pr) && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60">OOS</span>
                          </div>
                        )}
                        <BrandLabel product={pr} overlay />
                      </div>
                      <div className="flex-1 min-w-0 self-center">
                        <p className="font-bold text-sm sm:text-base leading-snug truncate" style={{ color: p.textPrimary }}>
                          {pr.name}
                        </p>
                        <BrandLabel product={pr} />
                        <p className="font-extrabold text-sm sm:text-base mt-1" style={{ color: p.accent }}>
                          ฿{pr.price?.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* Grid view layout */
                <div className="space-y-6">
                  {/* First row: 2 large cards (if enabled) */}
                  {showFeaturedRow && paginatedProducts.length > 0 && (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridGap}`}>
                      {paginatedProducts.slice(0, 2).map((pr: any) => (
                        <button
                          key={pr._id}
                          onClick={() => { setSelectedProduct(pr); setSelections({}); setQty(1); setActiveImgIdx(0); setView('detail'); }}
                          className="group text-left w-full cursor-pointer"
                        >
                          <div className="relative">
                            {getVariantDot(pr) && (
                              <div className="flex justify-center mb-2">
                                <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: getVariantDot(pr)!, borderColor: p.cardBorder }} />
                              </div>
                            )}
                            <div className={`aspect-[4/3] w-full ${cardRadius} overflow-hidden relative`} style={{ background: p.inputBg }}>
                              {pr.imageUrl ? (
                                <img src={pr.imageUrl} alt={pr.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10" style={{ color: p.textPrimary }}>
                                  <Package size={48} />
                                </div>
                              )}
                              {isOutOfStock(pr) && (
                                <div className="absolute bottom-4 right-4 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: `${p.cardBg}e6`, color: p.textMuted }}>
                                  <Package size={12} />
                                  Out of Stock
                                </div>
                              )}
                              <BrandLabel product={pr} overlay />
                            </div>
                          </div>
                          <div className="mt-3.5 px-0.5">
                            <p className="font-bold text-[15px] sm:text-base leading-snug mb-0.5 transition-colors line-clamp-2" style={{ color: p.textPrimary }}>
                              {pr.name}
                            </p>
                            <BrandLabel product={pr} />
                            <p className="font-extrabold text-base mt-1" style={{ color: p.accent }}>
                              ฿{pr.price?.toLocaleString()}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Remaining or uniform Grid rows */}
                  {(!showFeaturedRow || paginatedProducts.length > 2) && (
                    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${gridGap}`}>
                      {paginatedProducts.slice(showFeaturedRow ? 2 : 0).map((pr: any) => (
                        <button
                          key={pr._id}
                          onClick={() => { setSelectedProduct(pr); setSelections({}); setQty(1); setActiveImgIdx(0); setView('detail'); }}
                          className="group text-left w-full cursor-pointer"
                        >
                          <div className="relative">
                            {getVariantDot(pr) && (
                              <div className="flex justify-center mb-2">
                                <div className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: getVariantDot(pr)!, borderColor: p.cardBorder }} />
                              </div>
                            )}
                            <div className={`aspect-square w-full ${cardRadius} overflow-hidden relative`} style={{ background: p.inputBg }}>
                              {pr.imageUrl ? (
                                <img src={pr.imageUrl} alt={pr.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10" style={{ color: p.textPrimary }}>
                                  <Package size={32} />
                                </div>
                              )}
                              {isOutOfStock(pr) && (
                                <div className="absolute bottom-3 right-3 backdrop-blur-sm text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: `${p.cardBg}e6`, color: p.textMuted }}>
                                  <Package size={10} />
                                  Out of Stock
                                </div>
                              )}
                              <BrandLabel product={pr} overlay />
                            </div>
                          </div>
                          <div className="mt-3 px-0.5">
                            <p className="font-bold text-sm leading-snug mb-0.5 transition-colors line-clamp-2" style={{ color: p.textPrimary }}>
                              {pr.name}
                            </p>
                            <BrandLabel product={pr} />
                            <p className="font-extrabold text-sm mt-0.5" style={{ color: p.accent }}>
                              ฿{pr.price?.toLocaleString()}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pagination controls */}
              {paginationEnabled && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12 animate-in fade-in duration-300">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                    className={`w-10 h-10 ${controlRadius} border text-sm font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer transition-all`}
                    style={{ background: p.cardBg, borderColor: p.cardBorder, color: p.textPrimary }}
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`w-10 h-10 ${controlRadius} text-sm font-bold flex items-center justify-center cursor-pointer transition-all ${currentPage === idx + 1 ? 'shadow-md scale-105' : 'border'}`}
                      style={currentPage === idx + 1 ? { background: localAccentBg, color: accentText } : { background: p.cardBg, borderColor: p.cardBorder, color: p.textMuted }}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                    className={`w-10 h-10 ${controlRadius} border text-sm font-bold flex items-center justify-center disabled:opacity-30 cursor-pointer transition-all`}
                    style={{ background: p.cardBg, borderColor: p.cardBorder, color: p.textPrimary }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ═══ DETAIL VIEW ══════════════════════════════════════════════ */}
      {view === 'detail' && selectedProduct && (
        <div className="max-w-[1400px] mx-auto min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500 pb-40" style={{ background: p.pageBg }}>
          {/* Back bar */}
          <div className="sticky top-16 sm:top-[60px] z-40 backdrop-blur-md px-5 sm:px-8 py-3 flex items-center justify-between" style={{ background: `${p.pageBg}d9` }}>
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-sm font-bold transition-colors cursor-pointer bg-transparent border-0" style={{ color: p.textMuted }}>
              <ChevronLeft size={18} />
              <span>Back</span>
            </button>
            <div className="w-10" />
          </div>

          <div className="lg:flex lg:gap-12 xl:gap-16 lg:px-8 lg:pt-6">
            {/* Images */}
            <div className="px-5 mb-8 lg:w-1/2 lg:flex lg:flex-col lg:items-end">
              <div className={`${cardRadius} overflow-hidden w-full aspect-square lg:max-w-[520px]`} style={{ background: p.inputBg }}>
                {selectedVariant?.imageUrl || selectedProduct.imageUrl ? (
                  <img src={selectedVariant?.imageUrl || selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-10" style={{ color: p.textPrimary }}>
                    <Package size={80} />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="px-5 sm:px-8 lg:w-1/2 lg:flex lg:flex-col lg:justify-center">
              {selectedProduct.brand && (
                <p className="text-[13px] font-semibold mb-2 opacity-40" style={{ color: p.textPrimary }}>By {selectedProduct.brand}</p>
              )}
              <h2 className={`text-3xl sm:text-4xl lg:text-5xl mb-4 leading-tight ${headingFont}`} style={{ color: p.textPrimary }}>
                {selectedProduct.name}
              </h2>
              {selectedProduct.description && (
                <p className="text-base sm:text-lg leading-relaxed mb-6 lg:mb-8 font-medium max-w-xl opacity-50" style={{ color: p.textPrimary }}>
                  {selectedProduct.description}
                </p>
              )}
              <div className="flex items-baseline gap-2 mb-8 lg:mb-10">
                <span className="text-3xl sm:text-4xl font-extrabold" style={{ color: p.accent }}>
                  ฿{(selectedVariant?.price ?? selectedProduct.price)?.toLocaleString()}
                </span>
              </div>

              {/* N-Dimensional Option Selector */}
              {getProductOptions(selectedProduct).map((option) => (
                <div key={option.name} className="mb-6 text-left">
                  <p className="text-xs font-bold uppercase tracking-wider mb-3 opacity-35" style={{ color: p.textPrimary }}>
                    {option.name}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {option.values.map(val => {
                      const active = selections[option.name] === val;
                      return (
                        <button
                          key={val}
                          onClick={() => {
                            const next = { ...selections, [option.name]: val };
                            setSelections(next);
                            setSelectedVariant(findMatchingVariant(selectedProduct, next));
                          }}
                          className={`px-5 py-2.5 ${controlRadius} text-sm font-bold border transition-all cursor-pointer`}
                          style={active ? { background: p.textPrimary, borderColor: p.textPrimary, color: p.pageBg } : { background: p.cardBg, borderColor: p.cardBorder, color: p.textMuted }}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className={`flex items-center justify-between ${cardRadius} p-4 lg:p-5 mb-8 lg:mb-10 lg:max-w-sm border`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-40" style={{ color: p.textPrimary }}>Quantity</span>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer"
                    style={{ borderColor: p.cardBorder, color: p.textMuted }}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-extrabold text-xl w-6 text-center" style={{ color: p.textPrimary }}>{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer"
                    style={{ borderColor: p.cardBorder, color: p.textMuted }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Add to Cart button */}
              <div className="lg:max-w-sm">
                {isOutOfStock(selectedProduct) ? (
                  <button
                    disabled
                    className={`w-full py-4 ${controlRadius} font-bold text-base cursor-not-allowed opacity-30`}
                    style={{ background: p.textPrimary, color: p.pageBg }}
                  >
                    Out of Stock
                  </button>
                ) : (
                  <button
                    onClick={addToCart}
                    disabled={getProductOptions(selectedProduct).some(o => !selections[o.name])}
                    className={`w-full py-4 ${controlRadius} font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-20`}
                    style={{ background: localAccentBg, color: accentText }}
                  >
                    <ShoppingBag size={20} />
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PAYMENT VIEW ═════════════════════════════════════════════ */}
      {view === 'payment' && (
        <div className="max-w-3xl mx-auto px-6 pt-20 pb-32 text-center animate-in zoom-in-95 duration-700">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border" style={{ background: `${p.accent}1a`, borderColor: `${p.accent}33` }}>
            <CheckCircle style={{ color: p.accent }} size={32} />
          </div>
          <h2 className={`text-3xl sm:text-4xl mb-2 leading-tight ${headingFont}`} style={{ color: p.textPrimary }}>Order Confirmed</h2>
          <p className="text-sm sm:text-base font-medium mb-10 opacity-50" style={{ color: p.textPrimary }}>
            Thank you for your order. We'll contact you when your order is ready for payment.
          </p>
          {sf.postCheckoutUrl ? (
            <a
              href={sf.postCheckoutUrl}
              className={`w-full max-w-md mx-auto py-4 ${controlRadius} font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer`}
              style={{ background: localAccentBg, color: accentText }}
            >
              Continue
              <ArrowRight size={16} />
            </a>
          ) : (
            <button
              onClick={() => setView('home')}
              className={`w-full max-w-md mx-auto border py-4 ${controlRadius} font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer`}
              style={{ background: p.cardBg, borderColor: p.cardBorder, color: p.textPrimary }}
            >
              Continue Shopping
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* ═══ CART VIEW ═══════════════════════════════════════════════ */}
      {view === 'cart' && (
        <CartView
          p={p}
          controlRadius={controlRadius}
          cardRadius={cardRadius}
          cart={cart}
          cartTotal={cartTotal}
          customer={customer}
          isOrdering={isOrdering}
          merchantId={merchantId}
          onBack={() => setView('home')}
          onRemove={(key: string) => setCart(prev => prev.filter(i => `${i.productId}-${i.variantLabel}` !== key))}
          onQtyChange={(key: string, delta: number) => setCart(prev => prev.map(i => `${i.productId}-${i.variantLabel}` === key ? { ...i, qty: Math.max(1, i.qty + delta) } : i))}
          onOrder={placeOrder}
        />
      )}

      {/* Toast popup */}
      {cartToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-bold z-50 animate-toast" style={{ background: localAccentBg, color: accentText }}>
          Added to cart
        </div>
      )}
    </div>
  );
}

function CartView({ p, controlRadius, cardRadius, cart, cartTotal, customer, isOrdering, merchantId, onBack, onRemove, onQtyChange, onOrder }: {
  p: StorefrontPreset; controlRadius: string; cardRadius: string; cart: CartItem[]; cartTotal: number; customer: any;
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
    <div className="animate-fade-in max-w-lg mx-auto p-4 space-y-4 pb-24" style={{ background: p.pageBg, color: p.textPrimary }}>
      <div className="flex items-center gap-3 py-2">
        <button onClick={onBack} aria-label="Back" className="p-2 rounded-xl cursor-pointer" style={{ color: p.textPrimary }}><ChevronLeft size={20} /></button>
        <span className="font-extrabold text-lg">Your Cart</span>
      </div>

      {cart.map((item) => (
        <div key={`${item.productId}-${item.variantLabel}`} className={`${cardRadius} p-4 flex items-center gap-4 border`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
          <ProductImg src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" bg={p.inputBg} />
          <div className="flex-1 min-w-0 text-left">
            <p className="font-bold text-sm sm:text-base truncate" style={{ color: p.textPrimary }}>{item.name}</p>
            {item.variantLabel && <p className="text-xs" style={{ color: p.textMuted }}>{item.variantLabel}</p>}
            <p className="font-extrabold text-sm sm:text-base mt-1" style={{ color: p.accent }}>฿{(item.price * item.qty).toLocaleString()}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 border" style={{ background: p.inputBg, borderColor: p.inputBorder }}>
              <button onClick={() => onQtyChange(`${item.productId}-${item.variantLabel}`, -1)} className="cursor-pointer" style={{ color: p.textMuted }}><Minus size={12} /></button>
              <span className="w-5 text-center text-sm font-bold" style={{ color: p.textPrimary }}>{item.qty}</span>
              <button onClick={() => onQtyChange(`${item.productId}-${item.variantLabel}`, 1)} className="cursor-pointer" style={{ color: p.textMuted }}><Plus size={12} /></button>
            </div>
            <button onClick={() => onRemove(`${item.productId}-${item.variantLabel}`)} className="text-red-500 hover:text-red-700 transition-colors p-1 cursor-pointer"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      {/* Coupon input */}
      <div className={`${cardRadius} p-4 border`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
        <label htmlFor="coupon-code" className="text-sm font-bold mb-2 block text-left" style={{ color: p.textMuted }}>Coupon Code</label>
        <div className="flex gap-2">
          <input
            id="coupon-code"
            type="text"
            value={couponInput}
            onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponResult(null); setCouponError(''); }}
            placeholder="Enter coupon code"
            className={`flex-1 ${controlRadius} px-3 py-2 text-sm outline-none font-bold tracking-wider border`}
            style={{ background: p.inputBg, borderColor: p.inputBorder, color: p.textPrimary }}
          />
          <button
            onClick={validateCoupon}
            disabled={!couponInput.trim() || validatingCoupon}
            className={`px-4 py-2 ${controlRadius} text-sm font-bold disabled:opacity-50 whitespace-nowrap cursor-pointer`}
            style={{ background: p.textPrimary, color: p.pageBg }}
          >
            {validatingCoupon ? '...' : couponResult ? '✓ Applied' : 'Apply'}
          </button>
        </div>
        {couponResult && <p className="text-xs mt-1.5 font-medium text-left" style={{ color: p.accent }}>-฿{couponResult.discount.toLocaleString()} ({couponResult.description})</p>}
        {couponError && <p className="text-xs mt-1.5 text-red-500 text-left">{couponError}</p>}
      </div>

      {/* Loyalty Points */}
      {loyalty && loyalty.points >= loyalty.minRedeemPoints && (
        <div className={`${cardRadius} p-4 border`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm font-bold" style={{ color: p.textPrimary }}>Loyalty Points</p>
              <p className="text-xs mt-0.5" style={{ color: p.textMuted }}>You have {loyalty.points.toLocaleString()} pts · {loyalty.redeemRate} pts = ฿1</p>
            </div>
            <div className="flex items-center gap-2">
              {usePoints && <span className="text-xs font-bold" style={{ color: p.accent }}>-฿{pointsDiscount.toLocaleString()}</span>}
              <button
                onClick={() => setUsePoints(v => !v)}
                role="switch"
                aria-checked={usePoints}
                className="relative w-11 h-6 rounded-full transition-colors cursor-pointer"
                style={{ background: usePoints ? p.accent : `${p.textMuted}30` }}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${usePoints ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Address */}
      <div className={`${cardRadius} p-4 border`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
        <label htmlFor="delivery-address" className="text-sm font-bold mb-2 block text-left" style={{ color: p.textMuted }}>Delivery Address</label>
        <textarea
          id="delivery-address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          rows={3}
          placeholder="Enter your delivery address..."
          className={`w-full ${controlRadius} p-3 text-sm outline-none border`}
          style={{ background: p.inputBg, borderColor: p.inputBorder, color: p.textPrimary }}
        />
      </div>

      {/* Totals */}
      <div className={`${cardRadius} p-4 border space-y-2`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold" style={{ color: p.textMuted }}>Subtotal</span>
          <span className="font-bold" style={{ color: p.textPrimary }}>฿{cartTotal.toLocaleString()}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold" style={{ color: p.accent }}>Discount</span>
            <span className="font-bold" style={{ color: p.accent }}>-฿{totalDiscount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-center justify-between font-extrabold pt-2 border-t" style={{ borderColor: p.cardBorder }}>
          <span style={{ color: p.textPrimary }}>Total</span>
          <span className="text-lg" style={{ color: p.accent }}>฿{finalTotal.toLocaleString()}</span>
        </div>
      </div>

      {orderError && (
        <div className="rounded-xl p-3 text-sm text-center bg-red-100 text-red-700 font-bold">
          {orderError}
        </div>
      )}

      <button
        disabled={!customer || !address.trim() || isOrdering || cart.length === 0}
        onClick={async () => {
          setOrderError('');
          const err = await onOrder(address, couponResult?.code, usePoints && loyalty ? pointsToUse : undefined);
          if (err) setOrderError(err);
        }}
        className={`w-full disabled:opacity-50 py-4 ${controlRadius} font-bold text-sm flex items-center justify-center gap-2 cursor-pointer`}
        style={{ background: p.accent, color: p.accentText }}
      >
        {isOrdering ? 'Placing order...' : <><ArrowRight size={16} /> Place order</>}
      </button>
    </div>
  );
}

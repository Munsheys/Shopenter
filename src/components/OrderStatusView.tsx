'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, Package, Truck, XCircle, Loader2 } from 'lucide-react';
import { resolvePreset } from '@/lib/storefrontPresets';
import { cardRadiusClass, controlRadiusClass, headingFontClass, type CornerStyle, type TypographyStyle } from '@/lib/storefrontLayouts';

interface OrderItem {
  productId?: string;
  name: string;
  variantLabel?: string;
  price: number;
  qty: number;
  imageUrl?: string;
}

interface OrderData {
  status: string;
  items?: OrderItem[];
  product?: string;
  quantity?: number;
  soldTHB: number;
  discountAmount?: number;
  couponCode?: string;
  tracking?: string;
  courier?: string;
  address?: string;
  createdAt: string;
}

// Linear happy-path steps. 'cancelled' orders get a distinct badge instead of this stepper;
// 'partially_fulfilled' still uses the stepper (mapped onto the 'shipped' step — see
// stepIndexForStatus below) with an extra caption clarifying it's not fully shipped yet.
const STEPS = [
  { key: 'pending', label: 'Order placed' },
  { key: 'paid', label: 'Payment confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
] as const;

// 'fulfilled' is the terminal state for orders that don't go through shipping (e.g. pickup) —
// treat it the same as 'delivered' for stepper purposes. 'partially_fulfilled' (per
// src/lib/recomputeOrderStatus.ts) only ever happens after an order is paid, prepared, and
// at least one parcel has shipped — map it to the 'shipped' step so the stepper doesn't fall
// through the `idx === -1` fallback and render as if nothing had happened yet. The `isPartial`
// flag (used where this is called) keeps that step visually "in progress" rather than fully
// checked, plus the caption below the stepper explains the partial state.
function stepIndexForStatus(status: string): number {
  if (status === 'fulfilled') return STEPS.findIndex(s => s.key === 'delivered');
  if (status === 'partially_fulfilled') return STEPS.findIndex(s => s.key === 'shipped');
  const idx = STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
}

export default function OrderStatusView({
  merchantId,
  orderId,
  token,
  shopName,
  shopLogoUrl,
  storefront,
}: {
  merchantId: string;
  orderId: string;
  token: string;
  shopName: string;
  shopLogoUrl: string;
  storefront: any;
}) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const p = resolvePreset(storefront?.preset || 'linen', storefront?.accentColor);
  const cardRadius = cardRadiusClass(storefront?.cornerStyle || 'soft' as CornerStyle);
  const controlRadius = controlRadiusClass(storefront?.cornerStyle || 'soft' as CornerStyle);
  const headingFont = headingFontClass(storefront?.typography || 'modern' as TypographyStyle);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetch(`/api/storefront/${merchantId}/orders/${orderId}?t=${encodeURIComponent(token)}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); return null; }
        return res.json();
      })
      .then(data => { if (data) setOrder(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [merchantId, orderId, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: p.pageBg }}>
        <Loader2 className="animate-spin" style={{ color: p.accent }} size={28} />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: p.pageBg, color: p.textPrimary }}>
        <div className="text-center p-8">
          <Package size={48} className="mx-auto mb-4 opacity-30" />
          <h1 className="text-xl font-bold mb-2">Order not found</h1>
          <p className="text-sm opacity-50">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isPartial = order.status === 'partially_fulfilled';
  const currentStep = stepIndexForStatus(order.status);
  const items = order.items?.length
    ? order.items
    : [{ name: order.product || 'Item', price: order.soldTHB, qty: order.quantity || 1 } as OrderItem];

  return (
    <div className="min-h-screen font-sans" style={{ background: p.pageBg, color: p.textPrimary }}>
      <header className="border-b px-6 py-4 flex items-center gap-3" style={{ background: p.headerBg, borderColor: p.headerBorder }}>
        {shopLogoUrl ? (
          <img src={shopLogoUrl} alt={shopName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: p.accent }}>
            <Package size={16} style={{ color: p.accentText }} />
          </div>
        )}
        <span className="font-bold text-sm">{shopName}</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className={`text-2xl mb-1 ${headingFont}`}>Order status</h1>
        <p className="text-xs opacity-50 mb-8">
          Placed {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>

        {/* Status stepper — cancelled/partially-fulfilled orders get a plain badge instead */}
        {isCancelled ? (
          <div className={`flex items-center gap-2 p-4 mb-8 border ${cardRadius}`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
            <XCircle size={20} className="text-red-500 flex-shrink-0" />
            <span className="text-sm font-semibold">This order was cancelled</span>
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, i) => (
                <div key={step.key} className="flex-1 flex flex-col items-center relative">
                  {i > 0 && (
                    <div
                      className="absolute top-3 right-1/2 h-0.5 w-full -z-0"
                      style={{ background: i <= currentStep ? p.accent : p.cardBorder }}
                    />
                  )}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center relative z-10"
                    style={{ background: i <= currentStep ? p.accent : p.cardBg, border: `1px solid ${i <= currentStep ? p.accent : p.cardBorder}` }}
                  >
                    {i < currentStep || (i === currentStep && !isPartial) ? (
                      <CheckCircle size={14} style={{ color: i <= currentStep ? p.accentText : p.textMuted }} />
                    ) : (
                      <Circle size={8} style={{ color: p.textMuted }} fill={p.textMuted} />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold mt-2 text-center leading-tight" style={{ color: i <= currentStep ? p.textPrimary : p.textMuted }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            {isPartial && (
              <p className="text-xs text-center mt-3 font-semibold" style={{ color: p.accent }}>
                Partially fulfilled — some items are still on the way
              </p>
            )}
          </div>
        )}

        {(order.tracking || order.courier) && (
          <div className={`flex items-center gap-3 p-4 mb-6 border ${cardRadius}`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
            <Truck size={18} style={{ color: p.accent }} className="flex-shrink-0" />
            <div className="text-sm">
              {order.courier && <p className="font-semibold">{order.courier}</p>}
              {order.tracking && <p className="opacity-60 text-xs mt-0.5">Tracking: {order.tracking}</p>}
            </div>
          </div>
        )}

        <div className={`border overflow-hidden ${cardRadius}`} style={{ background: p.cardBg, borderColor: p.cardBorder }}>
          <div className="p-4 border-b" style={{ borderColor: p.cardBorder }}>
            <p className="text-xs font-bold uppercase tracking-wide opacity-50">Items</p>
          </div>
          <div className="divide-y" style={{ borderColor: p.cardBorder }}>
            {items.map((item, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: p.pageBg }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <Package size={18} style={{ color: p.textMuted }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.qty > 1 ? `${item.qty}x ` : ''}{item.name}</p>
                  {item.variantLabel && <p className="text-xs opacity-50">{item.variantLabel}</p>}
                </div>
                <span className="text-sm font-bold flex-shrink-0">฿{(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t space-y-1" style={{ borderColor: p.cardBorder }}>
            {!!order.discountAmount && (
              <div className="flex justify-between text-xs opacity-60">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span>-฿{order.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1">
              <span>Total</span>
              <span style={{ color: p.accent }}>฿{order.soldTHB.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {order.address && (
          <p className="text-xs opacity-50 mt-6 text-center">Delivering to: {order.address}</p>
        )}
      </div>
    </div>
  );
}

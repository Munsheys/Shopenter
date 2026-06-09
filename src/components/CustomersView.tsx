'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';
import {
  MessageCircle, ShoppingCart, Send, Search, X, Plus, Minus, Trash2,
  Package, CheckCircle, QrCode, ChevronRight, ChevronLeft, MapPin,
  Clock, Printer, History, ChevronDown, AlertTriangle, Pencil, Check, Ban,
  CornerUpLeft, Truck, Coins, PackagePlus,
} from 'lucide-react';
import { type ProductForm } from './ProductManagement';
import NumberStepper from '@/components/NumberStepper';

type Customer = {
  _id: string; userId: string; displayName: string; pictureUrl?: string;
  addresses: string[]; lastSeen: string; unreadCount: number;
  platform?: 'line' | 'instagram' | 'telegram';
  status?: 'active' | 'blocked';
  shopCredits?: number;
  loyaltyPoints?: number;
};
type OrderItem = { productId?: string; name: string; variantLabel?: string; price: number; qty: number };
type FulfilmentItem = { productId?: string; name: string; variantLabel?: string; qty: number; price: number };
type Fulfilment = {
  _id: string;
  orderId: string;
  items: FulfilmentItem[];
  tracking?: string;
  courier?: string;
  address?: string;
  shipCostTHB: number;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: string;
};
type Order = {
  _id: string; userId: string; platform?: 'line' | 'instagram'; displayName: string; product: string;
  quantity: number; items: OrderItem[]; soldTHB: number; costKRW: number;
  costTHB: number; profit: number; shipCostTHB: number;
  costCurrency?: string; soldCurrency?: string;
  tracking?: string; courier?: string; address?: string;
  status: 'pending' | 'paid' | 'preparing' | 'partially_fulfilled' | 'shipped' | 'delivered' | 'fulfilled' | 'cancelled';
  paymentQrSent: boolean; createdAt: string;
  rateUsed?: number;
  statusBeforeParcel?: string;
  fulfilmentSummary?: { total: number; shipped: number; delivered: number } | null;
};
type Message = {
  _id: string; userId: string; platform?: 'line' | 'instagram';
  type: 'text' | 'image' | 'sticker' | 'audio' | 'video' | 'system';
  text: string; sender: 'user' | 'admin' | 'system'; createdAt: string;
  messageId?: string;
  metadata?: {
    originalContentUrl?: string;
    previewImageUrl?: string;
    packageId?: string;
    stickerId?: string;
    altText?: string;
    flexContent?: any;
  };
};
type Product = {
  _id: string; name: string; brand?: string; price: number; imageUrl?: string;
  isQuickAdd?: boolean;
  options?: { name: string; values: string[] }[];
  variants?: { combination?: Record<string, string>; variantName?: string; colors?: string[]; price?: number; cost?: number }[];
};

const COST_CURRENCIES = ['THB', 'KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'HKD', 'SGD', 'TWD'];

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500',
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function fmt(n: number) { return (n || 0).toLocaleString('en', { maximumFractionDigits: 0 }); }

// Design tokens — mirrors lineoa-personal
const DK = {
  bg: 'bg-[#0f1117]',
  surface: 'bg-[#161925] border border-[#1f2335]',
  surfaceDeep: 'bg-[#1a1d2e]',
  border: 'border-[#1f2335]',
  text: 'text-white',
  muted: 'text-[#8b92ad]',
  hover: 'hover:bg-white/5 transition-all duration-300',
  input: 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad] focus:border-accent',
};
const LITK = {
  bg: 'bg-[#d9dfe8]',
  surface: 'bg-[#e7ecf3] border border-[#cdd3dd]',
  surfaceDeep: 'bg-[#dce1ea]',
  border: 'border-[#cdd3dd]',
  text: 'text-[#2f3744]',
  muted: 'text-[#6d7a8c]',
  hover: 'hover:bg-[#dce1ea] transition-all duration-300',
  input: 'bg-[#f0f3f8] border-[#cdd3dd] text-[#2f3744] placeholder-[#7a8598] focus:border-accent',
};
const LK = {
  bg: 'bg-slate-50',
  surface: 'bg-white shadow-sm border-slate-200/60',
  surfaceDeep: 'bg-slate-100/50',
  border: 'border-slate-200',
  text: 'text-slate-900',
  muted: 'text-slate-500',
  hover: 'hover:bg-slate-50 transition-all duration-300',
  input: 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-accent',
};

export default function CustomersView({ theme, onLimitHit, jumpToUserId, onJumpConsumed, jumpToOrderId, onJumpOrderConsumed, onOrderMutated }: { theme: string; onLimitHit?: (feature: string, limit?: number, current?: number) => void; jumpToUserId?: string | null; onJumpConsumed?: () => void; jumpToOrderId?: string | null; onJumpOrderConsumed?: () => void; onOrderMutated?: () => void }) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';
  const k = isDark ? DK : isLite ? LITK : LK;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [merchantSettings, setMerchantSettings] = useState<any>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [actingOrderIds, setActingOrderIds] = useState<Set<string>>(new Set());
  const [batchActing, setBatchActing] = useState(false);
  const [batchEditTotal, setBatchEditTotal] = useState('');
  type EditingOrderState = { id: string; items: EditLineItem[]; costTHB: number; shipCostTHB: number; discount: number };
  const [editingOrder, setEditingOrder] = useState<EditingOrderState | null>(null);
  const [listWidth, setListWidth] = useState(300);
  const [chatWidth, setChatWidth] = useState(280);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'line' | 'instagram' | 'telegram'>('all');
  const [findPlatformFilter, setFindPlatformFilter] = useState<'all' | 'line' | 'instagram' | 'telegram'>('all');

  const [qoSearch, setQoSearch] = useState('');
  const [qoDraftItems, setQoDraftItems] = useState<Array<{ productId?: string; name: string; variantLabel?: string; qty: number; price: number }>>([]);
  const [qoDiscount, setQoDiscount] = useState(0);
  const [qoShipping, setQoShipping] = useState(0);
  const [qoCostPrice, setQoCostPrice] = useState('');
  const [qoCostCurrency, setQoCostCurrency] = useState('KRW');
  const [qoSubmitting, setQoSubmitting] = useState(false);
  const [qoNewProdOpen, setQoNewProdOpen] = useState(false);
  const [qoNewProdName, setQoNewProdName] = useState('');
  const [qoNewProdPrice, setQoNewProdPrice] = useState('');
  const [qoNewProdOpts, setQoNewProdOpts] = useState<{ name: string; value: string }[]>([]);
  const [qoNewProdSaving, setQoNewProdSaving] = useState(false);

  const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
  const [showFindCustomerModal, setShowFindCustomerModal] = useState(false);
  const [findCustomerSearch, setFindCustomerSearch] = useState('');

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const [cancelCreditModal, setCancelCreditModal] = useState<{
    open: boolean; orderId: string; amount: number; productName: string;
  } | null>(null);

  const [testOrderCreating, setTestOrderCreating] = useState(false);

  const [drawerWidth, setDrawerWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [chatButtonY, setChatButtonY] = useState(200);
  const [isDraggingButton, setIsDraggingButton] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [highlightedCustomerId, setHighlightedCustomerId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  // Auto-expand oldest active order when customer changes
  useEffect(() => {
    const active = selectedCustomer
      ? allOrders.filter(o => o.userId === selectedCustomer.userId && ['pending', 'paid'].includes(o.status))
      : [];
    if (active.length === 0) { setExpandedOrderId(null); return; }
    const oldest = active.reduce((a, b) => new Date(a.createdAt) < new Date(b.createdAt) ? a : b);
    setExpandedOrderId(oldest._id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?._id]);

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }

  // Fulfilment state
  const [fulfilmentModalOrderId, setFulfilmentModalOrderId] = useState<string | null>(null);
  const [fulfilmentModalOrder, setFulfilmentModalOrder] = useState<Order | null>(null);
  const [expandedFulfilments, setExpandedFulfilments] = useState<Record<string, boolean>>({});
  const [fulfilmentsCache, setFulfilmentsCache] = useState<Record<string, Fulfilment[]>>({});

  // Products to Fulfil state — removed; items box directly to parcel from order card

  // Modal animation states
  const { mounted: qoMounted, visible: qoVisible } = useDelayedUnmount(showModal && !!selectedCustomer);
  const { mounted: fcMounted, visible: fcVisible } = useDelayedUnmount(showFindCustomerModal);
  const { mounted: eoMounted, visible: eoVisible } = useDelayedUnmount(!!editingOrder);
  const { mounted: fmMounted, visible: fmVisible } = useDelayedUnmount(!!fulfilmentModalOrderId && !!fulfilmentModalOrder);
  const { mounted: ccMounted, visible: ccVisible } = useDelayedUnmount(!!cancelCreditModal?.open);
  const { mounted: batchMounted, visible: batchVisible } = useDelayedUnmount(selectedOrderIds.size > 0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedRef = useRef<Customer | null>(null);
  selectedRef.current = selectedCustomer;
  const resizeRef = useRef<number | null>(null);
  const dragButtonRef = useRef<{ startY: number; startPos: number }| null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const evsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [evsReconnecting, setEvsReconnecting] = useState(false);
  const scrollPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function connect() {
      const evs = new EventSource('/api/stream');
      evs.onmessage = (e) => {
        try {
          const { type, customers: c } = JSON.parse(e.data);
          if ((type === 'init' || type === 'update') && c) {
            setCustomers(c);
            setIsLoading(false);
            setEvsReconnecting(false);
            if (selectedRef.current) {
              const updated = c.find((x: Customer) => x._id === selectedRef.current!._id);
              if (updated) setSelectedCustomer(updated);
            }
          }
        } catch {}
      };
      evs.onerror = () => {
        evs.close();
        setEvsReconnecting(true);
        if (evsRetryRef.current) clearTimeout(evsRetryRef.current);
        evsRetryRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
      return evs;
    }
    const evs = connect();
    return () => {
      evs.close();
      if (evsRetryRef.current) clearTimeout(evsRetryRef.current);
    };
  }, []);

  const selectCustomer = useCallback((c: Customer) => {
    setSelectedCustomer(c);
    setSelectedAddressIdx(0);
    setSelectedOrderIds(new Set());
    setFulfilmentsCache({});
    if (c.unreadCount > 0) {
      fetch(`/api/customers/${c.userId}/read`, { method: 'POST' }).catch(() => {});
    }
  }, []);

  // Auto-select customer when navigating from Orders "View in Chat"
  useEffect(() => {
    if (!jumpToUserId || customers.length === 0) return;
    const target = customers.find(c => c.userId === jumpToUserId);
    if (target) {
      selectCustomer(target);
      // Flash the sidebar entry briefly so it feels like the cursor landed there
      setHighlightedCustomerId(target._id);
      const t = setTimeout(() => setHighlightedCustomerId(null), 1600);
      onJumpConsumed?.();
      return () => clearTimeout(t);
    }
  // selectCustomer and onJumpConsumed are stable references (useCallback / prop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToUserId, customers, selectCustomer, onJumpConsumed]);

  // Highlight a specific order card when jumping from another view
  useEffect(() => {
    if (!jumpToOrderId) return;
    setHighlightedOrderId(jumpToOrderId);
    onJumpOrderConsumed?.();
    // Scroll into view after customer panel has had time to render (~500ms)
    const scrollTimer = setTimeout(() => {
      const el: Element | null =
        document.querySelector(`[data-order-id="${jumpToOrderId}"]`) ||
        Array.from(document.querySelectorAll<Element>('[data-order-ids]')).find(
          el => (el.getAttribute('data-order-ids') ?? '').split(',').includes(jumpToOrderId)
        ) || null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
    const clearTimer = setTimeout(() => setHighlightedOrderId(null), 3000);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [jumpToOrderId]);

  const refreshOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setAllOrders(data);
    }
  }, []);

  useEffect(() => {
    // Recompute fulfilment statuses once on mount to self-correct any records
    // that were set to partially_fulfilled when they should be shipped/fulfilled.
    refreshOrders();
    fetch('/api/orders/recompute', { method: 'POST' })
      .then(() => refreshOrders())
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setProducts(d);
    }).catch(() => {});
    fetch('/api/settings').then(r => r.json()).then(s => {
      setMerchantSettings(s);
      setQoCostCurrency(s.importCurrency || 'KRW');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('chat-drawer-width');
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= 320 && w <= 600) setDrawerWidth(w);
    }
    const savedY = localStorage.getItem('chat-button-y-position');
    if (savedY) {
      const y = parseInt(savedY, 10);
      if (y >= 0) setChatButtonY(y);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || resizeRef.current === null) return;
      const delta = resizeRef.current - e.clientX;
      const newWidth = drawerWidth + delta;
      if (newWidth >= 320 && newWidth <= 600) {
        setDrawerWidth(newWidth);
        resizeRef.current = e.clientX;
      }
    };
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        resizeRef.current = null;
        localStorage.setItem('chat-drawer-width', String(drawerWidth));
      }
    };
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, drawerWidth]);

  useEffect(() => {
    let currentY = chatButtonY;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingButton || !dragButtonRef.current || !containerRef.current) return;
      const delta = e.clientY - dragButtonRef.current.startY;
      const newY = dragButtonRef.current.startPos + delta;
      const container = containerRef.current;
      const maxY = Math.max(0, container.clientHeight - 48);
      currentY = Math.max(60, Math.min(newY, maxY));
      setChatButtonY(currentY);
    };
    const handleMouseUp = () => {
      if (isDraggingButton) {
        setIsDraggingButton(false);
        dragButtonRef.current = null;
        localStorage.setItem('chat-button-y-position', String(currentY));
      }
    };
    if (isDraggingButton) {
      document.addEventListener('mousemove', handleMouseMove, false);
      document.addEventListener('mouseup', handleMouseUp, false);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove, false);
        document.removeEventListener('mouseup', handleMouseUp, false);
      };
    }
  }, [isDraggingButton]);

  const loadMessages = useCallback(async (userId: string) => {
    const res = await fetch(`/api/messages/${userId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    }
  }, []);

  useEffect(() => {
    if (!selectedCustomer) { setMessages([]); return; }
    const userId = selectedCustomer.userId;
    loadMessages(userId);
    pollRef.current = setInterval(async () => {
      // Guard: skip update if the selected customer has changed since interval was set
      if (selectedRef.current?.userId !== userId) return;
      const res = await fetch(`/api/messages/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && selectedRef.current?.userId === userId) {
          setMessages(data);
        }
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedCustomer?.userId, loadMessages]);

  useEffect(() => {
    // Only auto-scroll when the user is already near the bottom
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      const { scrollHeight, scrollTop, clientHeight } = container;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (nearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Fallback: scroll on first load (container not yet scrollable)
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const closeQuickOrder = useCallback(() => {
    setShowModal(false);
    setQoSearch('');
    setQoDraftItems([]);
    setQoDiscount(0);
    setQoShipping(0);
    setQoCostPrice('');
    setQoNewProdOpen(false);
    setQoNewProdName('');
    setQoNewProdPrice('');
    setQoNewProdOpts(defaultOptNames);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        closeQuickOrder();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, closeQuickOrder]);

  async function sendMessage() {
    if (!selectedCustomer || !inputText.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedCustomer.userId, text: inputText.trim() }),
      });
      setInputText('');
      await loadMessages(selectedCustomer.userId);
    } finally { setSending(false); }
  }

  async function patchOrder(id: string, patch: object, toastMsg?: string) {
    setAllOrders(prev => prev.map(o => o._id === id ? { ...o, ...patch } : o));
    setActingOrderIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setAllOrders(prev => prev.map(o => o._id === id ? updated : o));
        onOrderMutated?.();
        if (toastMsg) showToast(toastMsg);
      } else {
        refreshOrders();
      }
    } catch {
      refreshOrders();
    } finally {
      setActingOrderIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function deleteOrder(id: string) {
    setAllOrders(prev => prev.filter(o => o._id !== id));
    onOrderMutated?.();
    showToast('Order deleted');
    fetch(`/api/orders/${id}`, { method: 'DELETE' }).catch(() => refreshOrders());
  }

  // Fulfilment helpers
  async function fetchFulfilments(orderId: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}/fulfilments`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFulfilmentsCache(prev => ({ ...prev, [orderId]: data }));
        }
      }
    } catch {}
  }

  function toggleFulfilmentsExpanded(orderId: string) {
    setExpandedFulfilments(prev => {
      const next = { ...prev, [orderId]: !prev[orderId] };
      if (next[orderId] && !fulfilmentsCache[orderId]) {
        fetchFulfilments(orderId);
      }
      return next;
    });
  }

  async function patchFulfilment(fulfilmentId: string, orderId: string, patch: object) {
    try {
      const res = await fetch(`/api/fulfilments/${fulfilmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        await fetchFulfilments(orderId);
        await refreshOrders();
        onOrderMutated?.();
      }
    } catch {}
  }

  async function deleteFulfilment(fulfilmentId: string, orderId: string) {
    try {
      const res = await fetch(`/api/fulfilments/${fulfilmentId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchFulfilments(orderId);
        await refreshOrders();
        onOrderMutated?.();
      }
    } catch {}
  }

  // Box items directly into this order's pending parcel (or create one). Each order owns its own parcels.
  async function boxItemsToParcel(
    orderId: string,
    items: Array<{ productId?: string; name: string; variantLabel?: string; qty: number; price: number }>
  ) {
    if (!items.length) return;

    // Only look at this order's own parcels — never merge into another order's parcel.
    // This keeps progress tracking accurate even when two orders share the same item+variant.
    const existingParcel = (fulfilmentsCache[orderId] || []).find(f => f.status === 'pending');

    const prevCache = fulfilmentsCache;
    if (existingParcel) {
      const mergedItems = [...(existingParcel.items || []), ...items];
      setFulfilmentsCache(prev => ({
        ...prev,
        [orderId]: (prev[orderId] || []).map(f =>
          f._id === existingParcel._id ? { ...f, items: mergedItems } : f
        ),
      }));
    } else {
      const optimisticParcel: Fulfilment = {
        _id: `optimistic-${Date.now()}`,
        orderId,
        items,
        shipCostTHB: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setFulfilmentsCache(prev => ({
        ...prev,
        [orderId]: [...(prev[orderId] || []), optimisticParcel],
      }));
    }

    try {
      let ok = false;
      if (existingParcel) {
        const newItems = [...(existingParcel.items || []), ...items];
        const res = await fetch(`/api/fulfilments/${existingParcel._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: newItems }),
        });
        ok = res.ok;
        if (ok) await fetchFulfilments(orderId);
      } else {
        const res = await fetch(`/api/orders/${orderId}/fulfilments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            address: selectedCustomer?.addresses[selectedAddressIdx] || '',
            shipCostTHB: 0,
            status: 'pending',
          }),
        });
        ok = res.ok;
        if (ok) await fetchFulfilments(orderId);
      }

      if (ok) { onOrderMutated?.(); showToast(`${items.length === 1 ? items[0].name : `${items.length} items`} moved to parcel`); }
      else {
        setFulfilmentsCache(prevCache);
        setConfirm({ open: true, title: 'Failed', message: 'Could not add to parcel. Please try again.', onConfirm: () => {} });
      }
    } catch {
      setFulfilmentsCache(prevCache);
      setConfirm({ open: true, title: 'Error', message: 'Something went wrong. Please try again.', onConfirm: () => {} });
    }
  }

  // Remove an item from this order's pending parcel (undo "Add to Parcel")
  async function unboxItemFromParcel(orderId: string, itemName: string) {
    const targetFulfilment = (fulfilmentsCache[orderId] || []).find(
      f => f.status === 'pending' && (f.items || []).some(i => i.name === itemName)
    );
    if (!targetFulfilment) return;

    const newItems = (targetFulfilment.items || []).filter(i => i.name !== itemName);
    const prevCache = fulfilmentsCache;

    if (newItems.length === 0) {
      setFulfilmentsCache(prev => ({
        ...prev,
        [orderId]: (prev[orderId] || []).filter(f => f._id !== targetFulfilment._id),
      }));
    } else {
      setFulfilmentsCache(prev => ({
        ...prev,
        [orderId]: (prev[orderId] || []).map(f =>
          f._id === targetFulfilment._id ? { ...f, items: newItems } : f
        ),
      }));
    }

    try {
      if (newItems.length === 0) {
        await fetch(`/api/fulfilments/${targetFulfilment._id}`, { method: 'DELETE' });
      } else {
        await fetch(`/api/fulfilments/${targetFulfilment._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: newItems }),
        });
      }
      await fetchFulfilments(orderId);
      onOrderMutated?.();
      showToast(`${itemName} removed from parcel`);
    } catch {
      setFulfilmentsCache(prevCache);
      setConfirm({ open: true, title: 'Error', message: 'Something went wrong. Please try again.', onConfirm: () => {} });
    }
  }

  useEffect(() => {
    if (!selectedCustomer) return;
    allOrders
      .filter(o => o.userId === selectedCustomer.userId && ['pending', 'paid'].includes(o.status))
      .forEach(o => fetchFulfilments(o._id));
  // Runs on customer change or whenever order list is refreshed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?._id, allOrders.length]);


  async function createTestOrder() {
    if (testOrderCreating || !selectedCustomer) return;
    setTestOrderCreating(true);
    try {
      // Use real catalog products when available
      let items: OrderItem[] = [];
      try {
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const prods: Product[] = Array.isArray(prodData) ? prodData : (prodData.products || []);
          const picked = prods.filter(p => p.price > 0).slice(0, 3);
          items = picked.map((p, i) => {
            const variant = p.variants?.[0];
            const variantLabel = variant?.variantName
              || (variant?.combination ? Object.values(variant.combination).join(' / ') : undefined);
            const price = variant?.price ?? p.price ?? 299;
            return {
              productId: p._id,
              name: p.name,
              variantLabel: variantLabel || undefined,
              qty: i === 0 ? 2 : 1,
              price,
            };
          });
        }
      } catch {}

      if (items.length === 0) {
        items = [
          { name: '[TEST] Product A', qty: 2, price: 499 },
          { name: '[TEST] Product B', qty: 1, price: 299 },
          { name: '[TEST] Product C', qty: 1, price: 199 },
        ];
      }

      const soldTHB = items.reduce((s, i) => s + i.price * i.qty, 0);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCustomer.userId,
          displayName: selectedCustomer.displayName,
          platform: selectedCustomer.platform ?? 'line',
          product: '[TEST] Multi-item order',
          quantity: items.reduce((s, i) => s + i.qty, 0),
          items,
          soldTHB,
          costTHB: 0, costKRW: 0, shipCostTHB: 0,
          status: 'paid',
        }),
      });
      if (res.ok) {
        const order = await res.json();
        setAllOrders(prev => [order, ...prev]);
      }
    } finally { setTestOrderCreating(false); }
  }

  function openFulfilmentModal(order: Order) {
    setFulfilmentModalOrderId(order._id);
    setFulfilmentModalOrder(order);
    // Pre-fetch existing fulfilments for greying out
    if (!fulfilmentsCache[order._id]) {
      fetchFulfilments(order._id);
    }
  }

  function closeFulfilmentModal() {
    setFulfilmentModalOrderId(null);
    setFulfilmentModalOrder(null);
  }

  async function sendQR(id: string) {
    setActingOrderIds(prev => new Set(prev).add(id));
    try {
      await fetch(`/api/orders/${id}/send-qr`, { method: 'POST' });
      setAllOrders(prev => prev.map(o => o._id === id ? { ...o, paymentQrSent: true } : o));
      if (selectedCustomer) loadMessages(selectedCustomer.userId);
      showToast('QR code sent');
    } finally {
      setActingOrderIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function markPaid(id: string) {
    setAllOrders(prev => prev.map(o => o._id === id ? { ...o, status: 'paid' } : o));
    setActingOrderIds(prev => new Set(prev).add(id));
    try {
      await fetch(`/api/orders/${id}/mark-paid`, { method: 'POST' });
      if (selectedCustomer) loadMessages(selectedCustomer.userId);
      showToast('Order marked as paid');
    } catch {
      refreshOrders();
    } finally {
      setActingOrderIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  function toggleOrderSelect(id: string) {
    setSelectedOrderIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function sendBatchQR(ids: string[], currentTotal: number) {
    setBatchActing(true);
    const override = parseFloat(batchEditTotal);
    const hasOverride = !isNaN(override) && override > 0 && override !== currentTotal;
    try {
      await fetch('/api/orders/batch/send-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids, ...(hasOverride ? { overrideAmount: override } : {}) }),
      });
      if (hasOverride) {
        // Reflect proportional redistribution in local state
        const ratio = override / currentTotal;
        setAllOrders(prev => prev.map(o =>
          ids.includes(o._id)
            ? { ...o, paymentQrSent: true, soldTHB: Math.round((o.soldTHB || 0) * ratio) }
            : o
        ));
      } else {
        setAllOrders(prev => prev.map(o => ids.includes(o._id) ? { ...o, paymentQrSent: true } : o));
      }
      if (selectedCustomer) loadMessages(selectedCustomer.userId);
      setSelectedOrderIds(new Set());
    } finally {
      setBatchActing(false);
    }
  }

  async function markBatchPaid(ids: string[]) {
    setBatchActing(true);
    try {
      await fetch('/api/orders/batch/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });
      setAllOrders(prev => prev.map(o => ids.includes(o._id) ? { ...o, status: 'paid' } : o));
      if (selectedCustomer) loadMessages(selectedCustomer.userId);
      setSelectedOrderIds(new Set());
    } finally {
      setBatchActing(false);
    }
  }

  async function submitQuickOrder() {
    if (!selectedCustomer || qoSubmitting || qoDraftItems.length === 0) return;
    const costAmount = parseFloat(qoCostPrice) || 0;
    const subtotal = qoDraftItems.reduce((s, i) => s + i.qty * i.price, 0);
    const customerPaysShipping = merchantSettings?.shippingPayer === 'customer';
    const shippingFee = customerPaysShipping ? qoShipping : 0;
    const total = Math.max(0, subtotal - qoDiscount + shippingFee);
    const totalQty = qoDraftItems.reduce((s, i) => s + i.qty, 0);
    const primaryName = qoDraftItems[0]?.name || '';

    setQoSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCustomer.userId,
          displayName: selectedCustomer.displayName,
          platform: selectedCustomer.platform,
          product: primaryName,
          quantity: totalQty,
          items: qoDraftItems,
          soldTHB: total,
          shipCostTHB: qoShipping || 0,
          costKRW: costAmount,
          costCurrency: qoCostCurrency,
          discount: qoDiscount || 0,
          status: 'pending',
        }),
      });
      if (res.ok) {
        const order = await res.json();
        setAllOrders(prev => [order, ...prev]);
        closeQuickOrder();
        setQoCostCurrency(merchantSettings?.importCurrency || 'KRW');
        showToast('New order created');
      }
    } finally { setQoSubmitting(false); }
  }

  async function handleQoNewProd() {
    if (!qoNewProdName.trim() || qoNewProdSaving) return;
    setQoNewProdSaving(true);
    const filledOpts = qoNewProdOpts.filter(o => o.name.trim() && o.value.trim());
    const price = parseFloat(qoNewProdPrice) || 0;
    const combination: Record<string, string> = {};
    filledOpts.forEach(o => { combination[o.name] = o.value; });
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: qoNewProdName.trim(),
          price,
          isActive: true,
          isQuickAdd: true,
          options: filledOpts.map(o => ({ name: o.name, values: [o.value] })),
          variants: filledOpts.length > 0
            ? [{ combination, imageUrl: '', price, cost: null, stock: 0 }]
            : [],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setProducts(prev => [created, ...prev]);
        const variantLabel = filledOpts.map(o => o.value).join(' · ');
        setQoDraftItems(prev => [...prev, {
          productId: created._id,
          name: created.name,
          variantLabel,
          qty: 1,
          price,
        }]);
        setQoNewProdName('');
        setQoNewProdPrice('');
        setQoNewProdOpts(defaultOptNames);
        setQoNewProdOpen(false);
        showToast(`"${qoNewProdName.trim()}" created & added to order`);
      }
    } finally { setQoNewProdSaving(false); }
  }

  async function addAddress(addr: string) {
    if (!selectedCustomer || !addr.trim()) return;
    const updated = [...(selectedCustomer.addresses || []), addr.trim()];
    const res = await fetch(`/api/customers/${selectedCustomer.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: updated }),
    });
    if (res.ok) {
      const c = await res.json();
      setSelectedCustomer(c);
      setCustomers(prev => prev.map(x => x._id === c._id ? c : x));
    }
  }

  async function removeAddress(idx: number) {
    if (!selectedCustomer) return;
    const updated = (selectedCustomer.addresses || []).filter((_, i) => i !== idx);
    const res = await fetch(`/api/customers/${selectedCustomer.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: updated }),
    });
    if (res.ok) {
      const c = await res.json();
      setSelectedCustomer(c);
      setCustomers(prev => prev.map(x => x._id === c._id ? c : x));
      // Keep selectedAddressIdx valid after deletion
      setSelectedAddressIdx(prev => (idx <= prev ? Math.max(0, prev - 1) : prev));
    }
  }

  async function seedMockData() {
    setSeedLoading(true);
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      if (res.ok) {
        showToast('Mock data seeded — refresh to see customers', 'success');
      } else {
        const e = await res.json().catch(() => ({}));
        showToast(e.error || 'Seed failed', 'error');
      }
    } catch {
      showToast('Network error during seed', 'error');
    } finally {
      setSeedLoading(false);
    }
  }

  function confirmDeleteAddress(idx: number) {
    setConfirm({
      open: true,
      title: 'Delete Address?',
      message: 'This address will be permanently removed from this customer profile.',
      danger: true,
      onConfirm: () => removeAddress(idx)
    });
  }

  function confirmDeleteOrder(id: string) {
    setConfirm({
      open: true,
      title: 'Delete Order?',
      message: 'This will permanently remove the order from your records. This action cannot be undone.',
      danger: true,
      onConfirm: () => deleteOrder(id)
    });
  }

  function confirmCancelOrder(id: string) {
    const order = allOrders.find(o => o._id === id);
    if (!order) return;

    // Paid orders get the credit choice modal
    if (order.status === 'paid' && order.soldTHB > 0) {
      setCancelCreditModal({ open: true, orderId: id, amount: order.soldTHB, productName: order.product });
      return;
    }

    // Pending (unpaid) — just cancel, no refund needed
    setConfirm({
      open: true,
      title: 'Cancel Order?',
      message: 'The order will be marked as cancelled and kept in your records.',
      danger: true,
      onConfirm: () => patchOrder(id, { status: 'cancelled' }, 'Order cancelled')
    });
  }

  async function issueCreditsAndCancel(orderId: string, amount: number) {
    await patchOrder(orderId, { status: 'cancelled' }, 'Order cancelled');
    if (!selectedCustomer) { setCancelCreditModal(null); return; }
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addCredits: amount }),
      });
      if (res.ok) {
        const updated = await res.json();
        const newCredits = updated.shopCredits ?? 0;
        setSelectedCustomer(prev => prev ? { ...prev, shopCredits: newCredits } : prev);
        setCustomers(prev => prev.map(c => c.userId === selectedCustomer.userId ? { ...c, shopCredits: newCredits } : c));
      }
    } catch {}
    setCancelCreditModal(null);
  }

  async function markAsRead() {
    if (!selectedCustomer) return;
    await fetch(`/api/customers/${selectedCustomer.userId}/read`, { method: 'POST' }).catch(() => {});
    setSelectedCustomer(prev => prev ? { ...prev, unreadCount: 0 } : prev);
    setCustomers(prev => prev.map(c => c.userId === selectedCustomer.userId ? { ...c, unreadCount: 0 } : c));
  }

  function startListResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = listWidth;
    const onMove = (me: MouseEvent) => setListWidth(Math.max(200, Math.min(520, startW + me.clientX - startX)));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function startChatResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    const onMove = (me: MouseEvent) => setChatWidth(Math.max(220, Math.min(480, startW - (me.clientX - startX))));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Smart default option names derived from the merchant's actual products
  const defaultOptNames = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      (p as any).options?.forEach((o: any) => { if (o.name) counts[o.name] = (counts[o.name] || 0) + 1; });
    });
    const total = products.length || 1;
    return Object.entries(counts)
      .filter(([, n]) => n / total >= 0.3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => ({ name, value: '' }));
  }, [products]);

  const customerOrders = selectedCustomer
    ? allOrders.filter(o => o.userId === selectedCustomer.userId)
    : [];
  const activeOrders = customerOrders
    .filter(o => ['pending', 'paid', 'shipped', 'partially_fulfilled'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const pendingOrders = activeOrders.filter(o => o.status === 'pending');

  const selectedTotal = activeOrders.filter(o => selectedOrderIds.has(o._id)).reduce((s, o) => s + (o.soldTHB || 0), 0);
  const allPendingSelected = pendingOrders.length > 0 && pendingOrders.every(o => selectedOrderIds.has(o._id));
  // Sync editable total whenever selection changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setBatchEditTotal(String(selectedTotal)); }, [selectedTotal, selectedOrderIds.size]);
  const parcelOrders = customerOrders.filter(o => o.status === 'preparing');
  // Pending fulfilments across all active orders — items moved to parcel but not yet shipped
  const pendingFulfilments = activeOrders.flatMap(o =>
    (fulfilmentsCache[o._id] || []).filter(f => f.status === 'pending' && (f.items?.length ?? 0) > 0)
  );
  const inTransitOrders = customerOrders.filter(o => ['shipped', 'partially_fulfilled'].includes(o.status));
  // Group shipped orders by parcel: same tracking+courier = same parcel
  const inTransitGroups: Order[][] = (() => {
    const map = new Map<string, Order[]>();
    for (const o of inTransitOrders) {
      const key = o.tracking ? `${o.courier ?? ''}::${o.tracking}` : `solo::${o._id}`;
      const g = map.get(key);
      if (g) g.push(o);
      else map.set(key, [o]);
    }
    return [...map.values()];
  })();
  const historyOrders = customerOrders.filter(o => ['delivered', 'fulfilled', 'cancelled'].includes(o.status));
  // Keep combined list for places that still need all post-active orders
  const shippedOrders = customerOrders.filter(o => ['shipped', 'partially_fulfilled', 'delivered', 'fulfilled', 'cancelled'].includes(o.status));

  const totalSpent = customerOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.soldTHB || 0), 0);
  // Realized profit — delivered/fulfilled orders only (shipped orders are in-transit and not yet realized)
  const totalProfit = customerOrders.filter(o => ['delivered', 'fulfilled'].includes(o.status)).reduce((s, o) => s + (o.profit || 0), 0);

  const filteredProducts = products.filter(p => {
    const q = qoSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.brand?.toLowerCase().includes(q) ?? false);
  });


  const visibleCustomers = customers.filter(c => {
    if (platformFilter !== 'all' && (c.platform ?? 'line') !== platformFilter) return false;
    return !customerSearch || c.displayName.toLowerCase().includes(customerSearch.toLowerCase());
  });

  const findCustomerResults = customers.filter(c => {
    if (findPlatformFilter !== 'all' && (c.platform ?? 'line') !== findPlatformFilter) return false;
    return !findCustomerSearch || c.displayName.toLowerCase().includes(findCustomerSearch.toLowerCase());
  });

  const totalUnread = customers.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className={`flex h-screen overflow-hidden ${k.bg} font-sans antialiased text-slate-100`}>

      {/* ── Customer list panel ── */}
      <aside
        className={`flex-shrink-0 flex flex-col border-r ${k.border} ${isDark ? 'bg-[#161925]' : 'bg-white shadow-xl'} z-30 transition-[background-color] duration-300`}
        style={{ width: listOpen ? listWidth : 80 }}
      >
        {listOpen ? (
          <>
            <div className={`flex items-center gap-2 px-4 py-3 border-b ${k.border} flex-shrink-0`}>
              <span className={`font-black text-xs tracking-wide flex-1 ${k.text}`}>
                CUSTOMERS
                {totalUnread > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
                )}
              </span>
              <button
                onClick={seedMockData}
                disabled={seedLoading}
                title="Generate mock customers & orders for testing"
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
              >
                {seedLoading ? <div className="w-3 h-3 border border-t-transparent border-current rounded-full animate-spin" /> : <Plus size={10} />}
                {seedLoading ? 'Seeding…' : 'Mock Data'}
              </button>
              <button
                onClick={() => setListOpen(false)}
                aria-label="Collapse customer list"
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 transition-all hover:scale-105 active:scale-95 shadow-md`}
                style={{ background: 'var(--accent-gradient)' }}
                title="Collapse list"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className={`flex gap-1.5 px-3 py-2 border-b ${k.border} flex-shrink-0`}>
              {(['all', 'line', 'instagram', 'telegram'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${platformFilter === p ? 'text-white shadow-sm' : `${k.muted} hover:text-accent`}`}
                  style={platformFilter === p ? { background: 'var(--accent-gradient)' } : undefined}
                >{p === 'all' ? 'All' : p === 'line' ? 'LINE' : p === 'instagram' ? 'IG' : 'TG'}</button>
              ))}
            </div>

            <div className={`px-3 py-2 border-b ${k.border} flex-shrink-0`}>
              <div className="relative">
                <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${k.muted}`} />
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search customers..."
                  aria-label="Search customers"
                  className={`w-full text-xs rounded-xl pl-7 pr-7 py-1.5 border outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all ${k.input}`}
                />
                {customerSearch && (
                  <button onClick={() => setCustomerSearch('')} aria-label="Clear search" className={`absolute right-2 top-1/2 -translate-y-1/2 ${k.muted} hover:text-red-500`}>
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            {evsReconnecting && (
              <div className={`px-3 py-1.5 text-[10px] font-bold text-center ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'} border-b ${k.border}`}>
                Reconnecting…
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-[#8b92ad]">
                  <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Syncing customers...</span>
                </div>
              ) : customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100'}`}>
                    <MessageCircle size={24} className="text-[#8b92ad] animate-pulse" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${k.text}`}>No customers yet</p>
                    <p className={`text-xs mt-1 ${k.muted}`}>Customers appear here after they message your LINE, Telegram, or Instagram bot.</p>
                  </div>
                </div>
              ) : visibleCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100'}`}>
                    <Search size={24} className="text-[#8b92ad]" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${k.text}`}>No customers match your search.</p>
                    <p className={`text-xs mt-1 ${k.muted}`}>Try a different name or clear the search.</p>
                  </div>
                </div>
              ) : (
                visibleCustomers.map((c, index) => {
                  const isSelected = selectedCustomer?._id === c._id;
                  const ac = avatarColor(c.displayName);
                  const isBlocked = c.status === 'blocked';
                  return (
                    <button
                      key={c._id}
                      onClick={() => selectCustomer(c)}
                      aria-pressed={isSelected}
                      aria-label={`Customer ${c.displayName}${isBlocked ? ', blocked' : ''}${c.unreadCount > 0 ? `, ${c.unreadCount} unread` : ''}`}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all border-l-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40 animate-slide-left hover-lift ${
                        isSelected
                          ? isDark ? 'bg-accent/10 border-l-accent' : 'bg-accent/5 border-l-accent'
                          : `border-l-transparent ${k.hover}`
                      } ${isBlocked ? 'opacity-50' : ''} ${highlightedCustomerId === c._id ? 'sidebar-flash ring-1 ring-accent/50' : ''}`}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <div className="relative flex-shrink-0">
                        {c.pictureUrl ? (
                          <img src={c.pictureUrl} alt={c.displayName} className={`w-8 h-8 rounded-full object-cover ${isBlocked ? 'grayscale' : ''}`} />
                        ) : (
                          <div className={`w-8 h-8 rounded-full ${ac} text-white flex items-center justify-center text-xs font-bold`}>
                            {(c.displayName || '?')[0].toUpperCase()}
                          </div>
                        )}
                        {c.unreadCount > 0 && !isBlocked && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-0.5 leading-none">
                            {c.unreadCount > 9 ? '9+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${k.text}`}>{c.displayName}</p>
                            {isBlocked && (
                              <span className="flex-shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 uppercase tracking-wide">Blocked</span>
                            )}
                          </div>
                          <span className={`text-[10px] flex-shrink-0 ${k.muted}`}>{timeAgo(c.lastSeen)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className={`text-[10px] truncate ${!isBlocked && c.unreadCount > 0 ? 'text-accent font-medium' : k.muted}`}>
                            {isBlocked
                              ? 'Unfollowed — messages won\'t deliver'
                              : c.unreadCount > 0
                                ? `${c.unreadCount} new message${c.unreadCount > 1 ? 's' : ''}`
                                : c.platform === 'instagram' ? 'Instagram' : c.platform === 'telegram' ? 'Telegram' : c.platform === 'line' ? 'LINE' : 'No platform'}
                          </p>
                          {(c.shopCredits || 0) > 0 && (
                            <span className={`flex-shrink-0 flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full border ${isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : "text-amber-600 bg-amber-50 border-amber-200/80"}`}>
                              <Coins size={8} /> {fmt(c.shopCredits || 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-2 gap-2 flex-1 overflow-y-auto">
            <button
              onClick={() => { setListOpen(true); setChatDrawerOpen(false); }}
              aria-label="Expand customer list"
              title="Expand customer list"
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 transition-all hover:scale-105 active:scale-95 shadow-md`}
              style={{ background: 'var(--accent-gradient)' }}
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setShowFindCustomerModal(true)}
              aria-label="Find customer"
              title="Find customer"
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.muted} ${k.hover} flex-shrink-0 transition-colors`}
            >
              <Search size={14} />
            </button>
            {visibleCustomers.map(c => {
              const ac = avatarColor(c.displayName);
              return (
                <button
                  key={c._id}
                  onClick={() => selectCustomer(c)}
                  aria-label={c.displayName}
                  title={c.displayName}
                  className={`relative w-8 h-8 rounded-full flex-shrink-0 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    selectedCustomer?._id === c._id ? 'ring-2 ring-accent ring-offset-1' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {c.pictureUrl ? (
                    <img src={c.pictureUrl} alt={c.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className={`w-full h-full rounded-full ${ac} text-white flex items-center justify-center text-xs font-bold`}>
                      {(c.displayName || '?')[0].toUpperCase()}
                    </div>
                  )}
                  {c.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 border border-white text-white text-[7px] font-bold w-3 h-3 rounded-full flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </aside>
      {listOpen && (
        <div
          onMouseDown={startListResize}
          className={`w-1 flex-shrink-0 cursor-col-resize transition-colors hover:bg-accent/40 ${isDark ? 'bg-[#1f2335]' : 'bg-slate-200'}`}
          title="Drag to resize"
        />
      )}

      {/* ── Main panel ── */}
      {!selectedCustomer ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-[#f8f9fc]'}`}>
              <MessageCircle size={28} className={`${k.muted} opacity-30 animate-pulse`} />
            </div>
            <p className={`text-sm font-semibold ${k.text}`}>Select a customer</p>
            <p className={`text-xs mt-1 ${k.muted}`}>View orders, parcels, and chat history</p>
          </div>
        </div>
      ) : (
        <>
          <div ref={containerRef} className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300" style={{ marginRight: chatDrawerOpen ? drawerWidth : 0 }}>
            {/* Customer header */}
            <div className={`flex items-center justify-between px-8 py-5 border-b ${k.border} ${isDark ? 'bg-[#1a1d2e]' : 'bg-white shadow-sm'} flex-shrink-0 z-20`}>
              <div className="flex items-center gap-3 min-w-0">
                {selectedCustomer.pictureUrl ? (
                  <img src={selectedCustomer.pictureUrl} className="w-10 h-10 rounded-full ring-2 ring-accent/30 flex-shrink-0" alt="" />
                ) : (
                  <div className={`w-10 h-10 rounded-full ${avatarColor(selectedCustomer.displayName)} text-white flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 ring-offset-1 ring-accent/20`}>
                    {(selectedCustomer.displayName || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className={`font-black text-sm truncate ${k.text}`}>{selectedCustomer.displayName}</h2>
                    {selectedCustomer.status === 'blocked' && (
                      <span className="flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 uppercase tracking-wide">Blocked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className={`text-[10px] ${k.muted}`}>{selectedCustomer.platform === 'instagram' ? 'Instagram' : selectedCustomer.platform === 'telegram' ? 'Telegram' : 'LINE'} Customer</span>
                    {activeOrders.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${isDark ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-orange-100 text-orange-600 border-orange-200"}`}>
                        {activeOrders.length} active
                      </span>
                    )}
                    {parcelOrders.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-blue-100 text-blue-600 border-blue-200"}`}>
                        {parcelOrders.length} in parcel
                      </span>
                    )}
                    {totalSpent > 0 && (
                      <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-bold">
                        ฿{fmt(totalSpent)} total
                      </span>
                    )}
                    {(selectedCustomer.shopCredits || 0) > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-amber-100 text-amber-700 border-amber-200/80"}`}>
                        <Coins size={9} /> ฿{fmt(selectedCustomer.shopCredits || 0)} credits
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedCustomer.unreadCount > 0 && (
                  <button
                    onClick={markAsRead}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${isDark ? 'border-[#2a3050] text-[#8b92ad] hover:border-accent hover:text-accent' : 'border-[#e2e5ef] text-[#8b92ad] hover:border-accent hover:text-accent'}`}
                  >
                    <CheckCircle size={12} /> Mark as read
                  </button>
                )}
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  style={{ background: 'var(--accent-gradient)' }}
                >
                  <ShoppingCart size={12} /> New Order
                </button>
                <button
                  onClick={createTestOrder}
                  disabled={testOrderCreating}
                  title="Create a multi-item paid test order for partial-fulfilment testing"
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-40 ${isDark ? 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10' : 'border-violet-300 text-violet-500 hover:bg-violet-50'}`}
                >
                  🧪 {testOrderCreating ? 'Creating…' : 'Test Order'}
                </button>
              </div>
            </div>


            {/* Scrollable content */}
            <div ref={scrollPanelRef} className="flex-1 overflow-y-auto relative">
              <div className="p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 lg:space-y-10 max-w-5xl mx-auto">

                {/* ORDER BANNERS — Top section showing active orders with [+] buttons */}
                <div data-section="section-orders" />
                {activeOrders.length > 0 && (
                  <section aria-label="Active order banners">
                    <SectionLabel>Orders</SectionLabel>
                    <div className="space-y-3 mt-3">
                      {activeOrders.map((order, idx) => {
                        const orderFulfilments = fulfilmentsCache[order._id] || [];

                        const computeShippedQty = (itemName: string, variantLabel?: string): number =>
                          orderFulfilments
                            .filter(f => ['shipped', 'delivered'].includes(f.status))
                            .reduce((s, f) => s + (f.items?.find(fi => fi.name === itemName && (fi.variantLabel || '') === (variantLabel || ''))?.qty || 0), 0);

                        const computeInParcelQty = (itemName: string, variantLabel?: string): number =>
                          orderFulfilments
                            .filter(f => f.status === 'pending')
                            .reduce((s, f) => s + (f.items?.find(fi => fi.name === itemName && (fi.variantLabel || '') === (variantLabel || ''))?.qty || 0), 0);

                        return (
                          <div key={order._id} className="animate-scale-in" style={{ animationDelay: `${idx * 55}ms` }}>
                            <OrderBanner
                              order={order}
                              isDark={isDark}
                              k={k}
                              products={products}
                              customerAddresses={selectedCustomer?.addresses || []}
                              selectedAddress={selectedCustomer?.addresses[selectedAddressIdx] || ''}
                              onAddAddress={async (addr) => {
                                await addAddress(addr);
                                const newIdx = (selectedCustomer?.addresses || []).length;
                                setSelectedAddressIdx(newIdx);
                              }}
                              onSelectOrderAddress={(addr) => {
                                const idx = (selectedCustomer?.addresses || []).findIndex(a => a.trim() === addr.trim());
                                if (idx >= 0) setSelectedAddressIdx(idx);
                              }}
                              onBoxItems={(items) => boxItemsToParcel(order._id, items)}
                              onUnboxItem={(itemName) => unboxItemFromParcel(order._id, itemName)}
                              onSendQR={() => sendQR(order._id)}
                              onMarkPaid={() => markPaid(order._id)}
                              onMarkDelivered={() => patchOrder(order._id, { status: 'delivered' }, 'Order delivered')}
                              onCancel={() => confirmCancelOrder(order._id)}
                              onDelete={() => confirmDeleteOrder(order._id)}
                              onEdit={() => setEditingOrder({ id: order._id, costTHB: order.costTHB || 0, shipCostTHB: order.shipCostTHB || 0, discount: 0, items: (order.items?.length > 0 ? order.items.map((i: any) => ({ productId: i.productId, name: i.name, variantLabel: i.variantLabel ?? '', qty: i.qty, price: i.price })) : [{ name: order.product, variantLabel: '', qty: order.quantity || 1, price: order.soldTHB || 0 }]) })}
                              computeShippedQty={computeShippedQty}
                              computeInParcelQty={computeInParcelQty}
                              isActing={actingOrderIds.has(order._id)}
                              isExpanded={expandedOrderId === order._id}
                              onToggle={() => setExpandedOrderId(id => id === order._id ? null : order._id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Delivery Addresses */}
                <section data-section="section-addresses" aria-label="Delivery addresses">
                  <SectionLabel>Delivery Addresses</SectionLabel>
                  <AddressSection
                    customer={selectedCustomer}
                    isDark={isDark}
                    k={k}
                    selectedIdx={selectedAddressIdx}
                    onSelect={setSelectedAddressIdx}
                    onAdd={addAddress}
                    onRemove={confirmDeleteAddress}
                  />
                </section>

                {/* PARCELS AWAITING SHIPMENT — all pending fulfilments merged into one parcel */}
                <div data-section="section-parcels" />
                {pendingFulfilments.length > 0 && (
                  <section aria-label="Parcels awaiting shipment">
                    <SectionLabel>Parcels Awaiting Shipment</SectionLabel>
                    <div className="mt-3">
                      <ParcelFulfilmentContainer
                        fulfilments={pendingFulfilments}
                        selectedAddress={selectedCustomer?.addresses[selectedAddressIdx] || ''}
                        isDark={isDark}
                        k={k}
                        merchantSettings={merchantSettings}
                        products={products}
                        onUpdateItem={async (fid, orderId, items) => {
                          await patchFulfilment(fid, orderId, { items });
                        }}
                        onShip={async (courier, tracking) => {
                          await Promise.all(pendingFulfilments.map(f =>
                            patchFulfilment(f._id, f.orderId, {
                              courier, tracking,
                              address: selectedCustomer?.addresses[selectedAddressIdx] || '',
                              status: 'shipped',
                            })
                          ));
                        }}
                        onCancel={() => {
                          setConfirm({
                            open: true,
                            title: 'Remove Parcel?',
                            message: pendingFulfilments.length > 1
                              ? 'This will delete all pending parcels and return items to pending.'
                              : 'This will delete the parcel and return items to pending.',
                            onConfirm: async () => {
                              await Promise.all(pendingFulfilments.map(f => deleteFulfilment(f._id, f.orderId)));
                            },
                            danger: true,
                          });
                        }}
                      />
                    </div>
                  </section>
                )}

                {/* In Transit */}
                <div data-section="section-intransit" />
                {inTransitGroups.length > 0 && (
                  <section aria-label="Orders in transit">
                    <div className="flex items-center justify-between mb-1">
                      <SectionLabel>In Transit</SectionLabel>
                      <AutoDeliverBadge
                        merchantSettings={merchantSettings}
                        isDark={isDark}
                        onSettingsChange={(updated) => setMerchantSettings((s: any) => ({ ...s, ...updated }))}
                      />
                    </div>
                    <div className={`${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200'} border rounded-3xl overflow-hidden mt-3`}>
                      {inTransitGroups.map((group, i) => {
                        const isLast = i === inTransitGroups.length - 1;
                        const isGroupHighlighted = group.some(o => highlightedOrderId === o._id);
                        if (group.length === 1) {
                          const o = group[0];
                          return (
                            <div key={o._id} data-order-id={o._id}>
                              <HistoryRow order={o} isDark={isDark} k={k}
                                isLast={isLast}
                                onPatch={(patch) => patchOrder(o._id, patch)}
                                onDelete={() => confirmDeleteOrder(o._id)}
                                isHighlighted={isGroupHighlighted}
                                onToggleFulfilments={o.status === 'partially_fulfilled' && (o.fulfilmentSummary?.total ?? 0) > 0 ? () => toggleFulfilmentsExpanded(o._id) : undefined}
                                fulfilmentsExpanded={!!expandedFulfilments[o._id]}
                                fulfilments={fulfilmentsCache[o._id]}
                                onPatchFulfilment={(fid, patch) => patchFulfilment(fid, o._id, patch)}
                                onDeleteFulfilment={(fid) => deleteFulfilment(fid, o._id)}
                                products={products}
                              />
                            </div>
                          );
                        }
                        return (
                          <div key={group[0].tracking || group[0]._id} data-order-ids={group.map(o => o._id).join(',')}>
                            <InTransitParcelGroup
                              orders={group}
                              isDark={isDark}
                              k={k}
                              isLast={isLast}
                              onPatchOrder={(id, patch) => patchOrder(id, patch)}
                              onDeleteOrder={(id) => confirmDeleteOrder(id)}
                              isGroupHighlighted={isGroupHighlighted}
                              products={products}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Order History */}
                <section data-section="section-history" aria-label="Order history">
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel>Order History</SectionLabel>
                    {historyOrders.length > 0 && totalProfit > 0 && (
                      <span
                        className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full cursor-help"
                        title="Realized profit — delivered orders only"
                      >
                        Realized profit: ฿{fmt(totalProfit)}
                      </span>
                    )}
                  </div>
                  {historyOrders.length === 0 ? (
                    <div className={`${k.surface} border ${k.border} rounded-3xl p-8 text-center`}>
                      <div className={`w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-[#f8f9fc]'}`}>
                        <History size={18} className={`${k.muted} opacity-40 animate-pulse`} />
                      </div>
                      <p className={`text-xs font-semibold ${k.text}`}>No completed orders yet</p>
                      <p className={`text-[10px] mt-0.5 ${k.muted}`}>Delivered and cancelled orders will appear here</p>
                    </div>
                  ) : (
                    <div className={`${k.surface} border ${k.border} rounded-3xl overflow-hidden`}>
                      {historyOrders.map((order, idx) => (
                        <div key={order._id} data-order-id={order._id} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                          <HistoryRow order={order} isDark={isDark} k={k}
                            isLast={idx === historyOrders.length - 1}
                            onPatch={(patch) => patchOrder(order._id, patch)}
                            onDelete={() => confirmDeleteOrder(order._id)}
                            isHighlighted={highlightedOrderId === order._id}
                            onToggleFulfilments={['fulfilled'].includes(order.status) && (order.fulfilmentSummary?.total ?? 0) > 0 ? () => toggleFulfilmentsExpanded(order._id) : undefined}
                            fulfilmentsExpanded={!!expandedFulfilments[order._id]}
                            fulfilments={fulfilmentsCache[order._id]}
                            onPatchFulfilment={(fid, patch) => patchFulfilment(fid, order._id, patch)}
                            onDeleteFulfilment={(fid) => deleteFulfilment(fid, order._id)}
                            products={products}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>
            </div>
          </div>

          {/* ── Chat Drawer (Fixed Overlay) ── */}
          <div
            className={`fixed top-14 right-0 bottom-0 z-40 transform transition-transform duration-300 ease-out ${
              chatDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            } ${k.surface} border-l ${k.border} flex flex-col shadow-2xl`}
            style={{ width: drawerWidth }}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                resizeRef.current = e.clientX;
              }}
              className="absolute left-0 top-0 bottom-0 w-1 hover:bg-accent/50 cursor-col-resize transition-colors z-50"
              aria-label="Resize chat drawer"
            />
            <div className={`flex items-center justify-between px-4 py-4 border-b ${k.border} flex-shrink-0`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-full ${avatarColor(selectedCustomer.displayName)} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                  {(selectedCustomer.displayName || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${k.text}`}>{selectedCustomer.displayName}</p>
                  <p className={`text-[10px] ${k.muted}`}>{selectedCustomer.platform === 'instagram' ? 'Instagram DM' : selectedCustomer.platform === 'telegram' ? 'Telegram Chat' : 'LINE Chat'}</p>
                </div>
              </div>
              <button
                onClick={() => setChatDrawerOpen(false)}
                className={`p-2.5 rounded-lg w-11 h-11 flex items-center justify-center ${k.muted} hover:text-accent transition-colors`}
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
            {selectedCustomer.unreadCount > 0 && (
              <div className={`px-4 py-2 border-b ${k.border} flex-shrink-0`}>
                <button
                  onClick={markAsRead}
                  className="w-full text-[10px] px-2 py-1.5 rounded-lg bg-accent/10 text-accent font-bold hover:bg-accent/20 transition-colors whitespace-nowrap"
                >
                  Mark as read
                </button>
              </div>
            )}
            {selectedCustomer.status === 'blocked' && (
              <div className={`mx-3 mt-2 px-3 py-2 rounded-xl border text-[10px] font-medium flex-shrink-0 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                ⚠️ This customer has blocked or unfollowed your account. Messages cannot be delivered.
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {messages.map((msg, idx) => {
                    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (msg.sender === 'system') {
                      const t = msg.text;
                      const isOrder = t.startsWith('Order created') || t.includes('order');
                      const isQR = t.toLowerCase().includes('qr') || t.toLowerCase().includes('payment') || t.toLowerCase().includes('qr code');
                      const isNotif = t.toLowerCase().includes('notification') || t.toLowerCase().includes('sent') || t.toLowerCase().includes('delivered') || t.toLowerCase().includes('shipped') || t.toLowerCase().includes('preparing') || t.toLowerCase().includes('paid');
                      const icon = isOrder ? '🛍️' : isQR ? '💳' : isNotif ? '🔔' : '•';
                      const color = isOrder ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200') :
                                    isQR    ? (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200') :
                                    isNotif ? (isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200') :
                                               (isDark ? 'bg-white/5 text-[#8b92ad] border-white/10' : 'bg-[#f8f9fc] text-[#8b92ad] border-slate-200');
                      return (
                        <div key={msg._id} className="flex justify-center my-1">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium flex items-center gap-1 max-w-[90%] text-center ${color}`}>
                            <span>{icon}</span>
                            <span style={{ wordBreak: 'break-word' }}>{t}</span>
                          </span>
                        </div>
                      );
                    }

                    const isAdmin = msg.sender === 'admin';
                    const imgUrl = msg.type === 'image'
                      ? (msg.metadata?.previewImageUrl || msg.metadata?.originalContentUrl || (msg.messageId ? `/api/messages/image/${msg.messageId}` : null))
                      : null;

                    return (
                      <div key={msg._id} className={`flex items-end gap-1.5 ${isAdmin ? 'justify-end animate-slide-right' : 'justify-start animate-slide-left'}`} style={{ animationDelay: `${idx * 20}ms` }}>
                        {!isAdmin && (
                          <div className={`w-5 h-5 rounded-full flex-shrink-0 mb-1 flex items-center justify-center text-[8px] font-bold text-white ${avatarColor(selectedCustomer.displayName)}`}>
                            {(selectedCustomer.displayName || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div className={`max-w-[80%] flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                          {imgUrl ? (
                            <div className={`rounded-2xl overflow-hidden ${isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                              <img
                                src={imgUrl}
                                alt="Image"
                                className="max-w-[180px] max-h-[180px] object-cover block"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                              <p className={`text-[9px] px-2 py-0.5 ${isAdmin ? 'text-green-100 bg-accent' : isDark ? 'text-[#8b92ad] bg-white/10' : 'text-slate-400 bg-white'}`}>
                                {timeStr}
                              </p>
                            </div>
                          ) : msg.type === 'sticker' ? (
                            <div className="text-center">
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                😊
                              </div>
                              <p className={`text-[9px] mt-0.5 ${k.muted}`}>{timeStr}</p>
                            </div>
                          ) : (
                            <div
                              className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                                isAdmin
                                  ? isDark ? 'bg-white text-black rounded-br-sm' : 'bg-black text-white rounded-br-sm'
                                  : isDark ? 'bg-[#1f2540] text-gray-100 rounded-bl-sm border border-[#2a2e45]' : 'bg-white shadow-sm border border-[#e2e5ef] text-[#1a1d2e] rounded-bl-sm'
                              }`}
                            >
                              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</p>
                              <p className={`text-[9px] mt-1 ${isAdmin ? isDark ? 'text-gray-600' : 'text-gray-400' : k.muted}`}>{timeStr}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
              })}
              {messages.length === 0 && <p className={`text-[11px] text-center ${k.muted} pt-6`}>No messages yet</p>}
              <div ref={messagesEndRef} />
            </div>
            <div className={`flex items-center gap-2 px-4 py-3 border-t ${k.border} flex-shrink-0`}>
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                aria-label="Chat message input"
                className={`flex-1 text-xs rounded-lg px-3 py-2 border outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all ${k.input}`}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || sending}
                aria-label="Send message"
                className="hover:opacity-90 disabled:opacity-40 text-white rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                style={{ background: 'var(--accent-gradient)' }}
              >
                <Send size={13} />
              </button>
            </div>
          </div>

          {/* Persistent Chat Side Button (Draggable within container) */}
          {!chatDrawerOpen && (
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingButton(true);
                dragButtonRef.current = {
                  startY: e.clientY,
                  startPos: chatButtonY
                };
              }}
              onClick={() => { setChatDrawerOpen(true); setListOpen(false); }}
              className="absolute right-0 w-12 h-12 rounded-l-2xl flex items-center justify-center transition-all hover:opacity-90 active:scale-95 shadow-lg cursor-grab active:cursor-grabbing"
              style={{
                background: 'var(--accent-gradient)',
                zIndex: 35,
                top: `${chatButtonY}px`
              }}
              aria-label="Open chat drawer (drag to move)"
              title="Click to open chat, drag to move"
            >
              <MessageCircle size={20} className="text-white" />
            </button>
          )}

        </>
      )}

      {/* ── New Order Modal (2-panel) ── */}
      {qoMounted && selectedCustomer && (
        <div
          className="modal-overlay fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 overflow-x-auto"
          data-state={qoVisible ? 'open' : 'closed'}
          role="dialog" aria-modal="true" aria-label="New order"
          onClick={(e) => { if (e.target === e.currentTarget) closeQuickOrder(); }}
        >
          <div className="modal-panel flex items-start gap-4 flex-shrink-0" data-state={qoVisible ? 'open' : 'closed'}>

            {/* ── New Product slide-in panel (left) ── */}
            <div
              className="overflow-hidden flex-shrink-0 transition-all duration-300 ease-out"
              style={{ width: qoNewProdOpen ? 340 : 0, opacity: qoNewProdOpen ? 1 : 0 }}
            >
              <div
                className={`w-[340px] ${isDark ? 'bg-[#0f1117]' : 'bg-white'} rounded-3xl shadow-2xl border ${k.border} flex flex-col`}
                style={{ maxHeight: '92vh' }}
              >
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border} flex-shrink-0`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-accent">NEW PRODUCT</p>
                    <p className={`text-sm font-black ${k.text}`}>Quick Catalog</p>
                  </div>
                  <button onClick={() => setQoNewProdOpen(false)} aria-label="Close"
                    className={`p-1.5 rounded-xl ${k.muted} ${k.hover} transition-colors`}>
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
                  <input
                    autoFocus
                    value={qoNewProdName}
                    onChange={e => setQoNewProdName(e.target.value)}
                    placeholder="Product name *"
                    className={`w-full text-xs rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all font-semibold ${k.input}`}
                  />
                  <input
                    type="number"
                    value={qoNewProdPrice}
                    onChange={e => setQoNewProdPrice(e.target.value)}
                    placeholder="Price (฿) for this variant"
                    className={`w-full text-xs rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`}
                  />
                  {/* Cost */}
                  <div className="flex items-center gap-2">
                    <select
                      value={qoCostCurrency}
                      onChange={e => setQoCostCurrency(e.target.value)}
                      className={`text-[10px] rounded-lg px-2 py-1.5 border outline-none focus:border-accent ${k.input} w-16`}
                    >
                      {COST_CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input
                      type="number"
                      value={qoCostPrice}
                      onChange={e => setQoCostPrice(e.target.value)}
                      placeholder="Cost (optional)"
                      className={`flex-1 text-xs rounded-xl px-3 py-1.5 border outline-none focus:border-accent transition-all ${k.input}`}
                    />
                  </div>
                  {/* Options */}
                  <p className={`text-[10px] font-semibold pt-1 ${k.muted}`}>Options ordered (only what customer wants):</p>
                  {qoNewProdOpts.map((opt, i) => (
                    <div key={i} className="flex gap-1.5">
                      <input
                        value={opt.name}
                        onChange={e => { const n = [...qoNewProdOpts]; n[i] = { ...n[i], name: e.target.value }; setQoNewProdOpts(n); }}
                        placeholder="e.g. Color"
                        className={`w-24 text-[10px] rounded-lg px-2 py-1.5 border outline-none focus:border-accent ${k.input}`}
                      />
                      <input
                        value={opt.value}
                        onChange={e => { const n = [...qoNewProdOpts]; n[i] = { ...n[i], value: e.target.value }; setQoNewProdOpts(n); }}
                        placeholder="e.g. Red"
                        className={`flex-1 text-[10px] rounded-lg px-2 py-1.5 border outline-none focus:border-accent ${k.input}`}
                      />
                      <button type="button"
                        onClick={() => setQoNewProdOpts(qoNewProdOpts.filter((_, j) => j !== i))}
                        className={`px-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border ${k.border} transition-colors`}
                      ><X size={11} /></button>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => setQoNewProdOpts([...qoNewProdOpts, { name: '', value: '' }])}
                    className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                  ><Plus size={10} /> Add option</button>
                </div>

                {/* Footer */}
                <div className={`border-t ${k.border} p-4 flex-shrink-0`}>
                  <button
                    disabled={!qoNewProdName.trim() || qoNewProdSaving}
                    onClick={handleQoNewProd}
                    className="w-full py-2.5 rounded-2xl text-xs font-black text-white disabled:opacity-40 transition-all active:scale-95"
                    style={{ background: 'var(--accent-gradient)' }}
                  >
                    {qoNewProdSaving ? 'Creating...' : 'Create & Add to Order →'}
                  </button>
                  <p className={`text-[9px] ${k.muted} text-center leading-relaxed mt-2`}>
                    Saved to catalog as incomplete — fill in remaining variants later in Products.
                  </p>
                </div>
              </div>
            </div>

            {/* ── New Order modal (right) ── */}
            <div className={`${isDark ? 'bg-[#0f1117]' : 'bg-white'} rounded-3xl shadow-2xl w-[min(896px,90vw)] border ${k.border} flex flex-col flex-shrink-0`} style={{ maxHeight: '92vh' }}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border} flex-shrink-0`}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-accent">NEW ORDER</p>
                <p className={`text-sm font-black ${k.text}`}>{selectedCustomer.displayName}</p>
              </div>
              <button onClick={closeQuickOrder} aria-label="Close"
                className={`p-1.5 rounded-xl ${k.muted} ${k.hover} transition-colors`}>
                <X size={16} />
              </button>
            </div>

            {/* Body — 2 panels */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

              {/* ── Left panel: product catalog ── */}
              <div className={`w-64 sm:w-72 flex-shrink-0 border-r ${k.border} flex flex-col`}>
                {/* Search */}
                <div className="p-3 flex-shrink-0">
                  <div className="relative">
                    <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${k.muted}`} />
                    <input
                      value={qoSearch}
                      onChange={e => setQoSearch(e.target.value)}
                      placeholder="Search products..."
                      className={`w-full text-xs rounded-xl pl-7 pr-3 py-2 border outline-none focus:border-accent transition-all ${k.input}`}
                    />
                  </div>
                </div>

                {/* Product list */}
                <div className="flex-1 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button
                      key={p._id}
                      onClick={() => setQoDraftItems(prev => [...prev, { productId: p._id, name: p.name, variantLabel: '', qty: 1, price: p.price }])}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b ${k.border} ${k.hover}`}
                    >
                      <div className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package size={10} className={k.muted} /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-semibold truncate ${k.text}`}>{p.name}</p>
                        <p className={`text-[10px] ${k.muted}`}>฿{p.price.toLocaleString()}</p>
                      </div>
                      <Plus size={13} className="text-accent flex-shrink-0" />
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className={`text-[11px] text-center py-6 ${k.muted}`}>No products found</p>
                  )}
                </div>

                {/* New product section */}
                <div className={`border-t ${k.border} p-3 flex-shrink-0`}>
                  <button
                    onClick={() => setQoNewProdOpen(!qoNewProdOpen)}
                    className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors ${qoNewProdOpen ? 'text-accent/60 hover:text-accent' : 'text-accent hover:underline'}`}
                  >
                    <Plus size={11} />
                    {qoNewProdOpen ? 'New product panel open ←' : 'Not in catalog? Add new product'}
                  </button>
                </div>
              </div>

              {/* ── Right panel: draft items ── */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Items list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {qoDraftItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
                      <ShoppingCart size={28} className={k.muted} />
                      <p className={`text-xs font-medium ${k.muted}`}>Add products from the left panel</p>
                    </div>
                  ) : (
                    qoDraftItems.map((item, idx) => (
                      <EditOrderItemCard
                        key={`${item.productId ?? 'custom'}-${idx}`}
                        item={item}
                        products={products}
                        isDark={isDark}
                        k={k}
                        onUpdate={patch => setQoDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))}
                        onRemove={() => setQoDraftItems(prev => prev.filter((_, i) => i !== idx))}
                      />
                    ))
                  )}
                </div>

                {/* Footer */}
                {(() => {
                  const subtotal = qoDraftItems.reduce((s, i) => s + i.qty * i.price, 0);
                  const customerPaysShipping = merchantSettings?.shippingPayer === 'customer';
                  const shippingFee = customerPaysShipping ? qoShipping : 0;
                  const total = Math.max(0, subtotal - qoDiscount + shippingFee);
                  return (
                    <div className={`border-t ${k.border} px-4 py-4 space-y-3 flex-shrink-0`}>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${k.muted}`}>Subtotal</span>
                          <span className={`text-xs font-bold ${k.text}`}>฿{fmt(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${k.muted}`}>Discount</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs ${k.muted}`}>-฿</span>
                            <input
                              type="number"
                              value={qoDiscount || ''}
                              onChange={e => setQoDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                              placeholder="0"
                              className={`w-20 text-xs text-right rounded-lg px-2 py-1 border outline-none focus:border-accent transition-all ${k.input}`}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${k.muted}`}>Shipping{!customerPaysShipping && ' (merchant)'}</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs ${k.muted}`}>฿</span>
                            <input
                              type="number"
                              value={qoShipping || ''}
                              onChange={e => setQoShipping(Math.max(0, parseFloat(e.target.value) || 0))}
                              placeholder="0"
                              className={`w-20 text-xs text-right rounded-lg px-2 py-1 border outline-none focus:border-accent transition-all ${k.input}`}
                            />
                          </div>
                        </div>
                        <div className={`flex items-center justify-between pt-1.5 border-t ${k.border}`}>
                          <span className={`text-sm font-black ${k.text}`}>Total</span>
                          <span className="text-sm font-black text-accent">฿{fmt(total)}</span>
                        </div>
                      </div>
                      <button
                        disabled={qoSubmitting || qoDraftItems.length === 0}
                        onClick={submitQuickOrder}
                        className="w-full py-3 rounded-2xl text-sm font-black text-white hover:opacity-90 disabled:opacity-40 transition-all active:scale-95"
                        style={{ background: 'var(--accent-gradient)' }}
                      >
                        {qoSubmitting ? 'Creating...' : 'Create Order'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          </div>{/* flex row */}
        </div>
      )}


      {/* Find Customer Modal */}
      {fcMounted && (
        <div
          className="modal-overlay fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          data-state={fcVisible ? 'open' : 'closed'}
        >
          <div
            className={`modal-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${isDark ? 'bg-[#161925]' : 'bg-white'}`}
            data-state={fcVisible ? 'open' : 'closed'}
            role="dialog"
            aria-modal="true"
            aria-label="Find customer"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Escape') { setShowFindCustomerModal(false); setFindCustomerSearch(''); } }}
          >
            {/* Modal Header */}
            <div className={`px-6 py-5 border-b ${k.border} flex-shrink-0 text-center`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-accent/10' : 'bg-accent/5'}`}>
                <Package size={24} className="text-accent" />
              </div>
              <h3 className={`text-lg font-black ${k.text}`}>Finding customers...</h3>
            </div>

            {/* Search Input */}
            <div className={`px-6 py-3 border-b ${k.border} flex-shrink-0 space-y-2`}>
              <div className="relative">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${k.muted}`} />
                <input
                  autoFocus
                  type="text"
                  value={findCustomerSearch}
                  onChange={(e) => setFindCustomerSearch(e.target.value)}
                  placeholder="Search customer name..."
                  className={`w-full text-sm rounded-xl pl-10 pr-4 py-3 border outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all ${k.input}`}
                />
              </div>
              <div className="flex gap-1.5">
                {(['all', 'line', 'instagram', 'telegram'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setFindPlatformFilter(p)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${findPlatformFilter === p ? 'text-white shadow-sm' : `${k.muted} hover:text-accent`}`}
                    style={findPlatformFilter === p ? { background: 'var(--accent-gradient)' } : undefined}
                  >{p === 'all' ? 'All' : p === 'line' ? 'LINE' : p === 'instagram' ? 'IG' : 'TG'}</button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-[#8b92ad]">
                  <div className="w-5 h-5 border-2 border-t-transparent border-accent rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Syncing customers...</span>
                </div>
              ) : findCustomerResults.length === 0 && findCustomerSearch ? (
                <div className={`text-center px-4 py-8 text-xs ${k.muted}`}>
                  No results for "{findCustomerSearch}"
                </div>
              ) : findCustomerResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-4 gap-3 py-8">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-[#f8f9fc]'}`}>
                    <MessageCircle size={20} className={`${k.muted} opacity-40 animate-pulse`} />
                  </div>
                  <p className={`text-xs font-semibold ${k.text}`}>No customers yet</p>
                </div>
              ) : (
                <div className={`divide-y ${isDark ? "divide-[#1f2335]" : "divide-[#e2e5ef]"}`}>
                  {findCustomerResults.map((c) => {
                    const ac = avatarColor(c.displayName);
                    const isSelected = selectedCustomer?._id === c._id;
                    return (
                      <button
                        key={c._id}
                        onClick={() => {
                          selectCustomer(c);
                          setShowFindCustomerModal(false);
                          setFindCustomerSearch('');
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left hover:bg-accent/5 active:bg-accent/10 ${
                          isSelected ? (isDark ? 'bg-accent/10' : 'bg-accent/5') : ''
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          {c.pictureUrl ? (
                            <img src={c.pictureUrl} alt={c.displayName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className={`w-10 h-10 rounded-full ${ac} text-white flex items-center justify-center text-xs font-bold`}>
                              {(c.displayName || '?')[0].toUpperCase()}
                            </div>
                          )}
                          {/* Show presence dot only when lastSeen was within the last 5 minutes */}
                          {c.lastSeen && (Date.now() - new Date(c.lastSeen).getTime()) < 5 * 60 * 1000 && (
                            <span className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 ${isDark ? "border-[#161925]" : "border-white"}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${k.text}`}>{c.displayName}</p>
                          <p className={`text-[10px] mt-0.5 ${k.muted}`}>
                            Last updated: {new Date(c.lastSeen).toLocaleDateString()}
                          </p>
                        </div>
                        {c.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {c.unreadCount > 9 ? '9+' : c.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t ${k.border} flex-shrink-0 flex items-center gap-3 justify-end`}>
              <button
                onClick={() => {
                  setShowFindCustomerModal(false);
                  setFindCustomerSearch('');
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isDark ? 'text-[#8b92ad] hover:text-white' : 'text-[#6b7280] hover:text-[#1f2937]'
                }`}
              >
                Cancel
              </button>
              <button
                disabled={!selectedCustomer}
                onClick={() => {
                  setShowFindCustomerModal(false);
                  setFindCustomerSearch('');
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--accent-gradient)' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item-level order edit modal ── */}
      {eoMounted && (() => {
        const lineTotal = (item: EditLineItem) => item.qty * item.price;
        const orderSubtotal = (editingOrder?.items ?? []).reduce((s, i) => s + lineTotal(i), 0);
        const orderTotal = Math.max(0, orderSubtotal - (editingOrder?.discount || 0));
        const orderProfit = orderTotal - (editingOrder?.costTHB ?? 0) - (editingOrder?.shipCostTHB ?? 0);
        const updateItem = (idx: number, patch: Partial<EditLineItem>) =>
          setEditingOrder(v => v && { ...v, items: v.items.map((it, i) => i === idx ? { ...it, ...patch } : it) });
        const removeItem = (idx: number) =>
          setEditingOrder(v => v && { ...v, items: v.items.filter((_, i) => i !== idx) });
        const addItem = () =>
          setEditingOrder(v => v && { ...v, items: [...v.items, { name: '', variantLabel: '', qty: 1, price: 0 }] });
        const addFromCatalog = (p: Product) =>
          setEditingOrder(v => v && { ...v, items: [...v.items, { productId: p._id, name: p.name, variantLabel: '', qty: 1, price: p.price }] });
        return (
          <div className="modal-overlay fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            data-state={eoVisible ? 'open' : 'closed'}
            onClick={e => { if (e.target === e.currentTarget) setEditingOrder(null); }}>
            <div className={`modal-panel w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col max-h-[92vh] ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'}`}
              data-state={eoVisible ? 'open' : 'closed'}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0 border-b" style={{ borderColor: isDark ? '#1f2335' : '#e2e5ef' }}>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#8b92ad]">Edit Order</p>
                  <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>#{editingOrder?.id.slice(-6).toUpperCase()}</p>
                </div>
                <button onClick={() => setEditingOrder(null)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:bg-white/10' : 'text-[#8b92ad] hover:bg-black/5'}`}><X size={15} /></button>
              </div>

              {/* Two-panel body */}
              <div className="flex flex-1 min-h-0">
                {/* ── Left panel: catalog browser ── */}
                <div className={`w-72 flex-shrink-0 flex flex-col border-r ${isDark ? 'border-[#1f2335]' : 'border-[#e2e5ef]'}`}>
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-[#1f2335]' : 'border-[#e2e5ef]'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#8b92ad] mb-2">Product Catalog</p>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b92ad]" />
                      <input
                        placeholder="Search products…"
                        onChange={e => {
                          const q = e.target.value.toLowerCase();
                          const list = e.currentTarget.closest('[data-catalog-panel]')?.querySelector('[data-catalog-list]');
                          if (list) {
                            (list as HTMLElement).querySelectorAll('[data-product-name]').forEach(el => {
                              const name = el.getAttribute('data-product-name') || '';
                              (el as HTMLElement).style.display = name.toLowerCase().includes(q) ? '' : 'none';
                            });
                          }
                        }}
                        className={`w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg border outline-none focus:border-accent transition-all ${isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad]' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e] placeholder-[#9ca3af]'}`}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto" data-catalog-panel="">
                    <div data-catalog-list="">
                      {products.map(p => (
                        <button
                          key={p._id}
                          data-product-name={p.name}
                          type="button"
                          onClick={() => addFromCatalog(p)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors border-b ${isDark ? 'border-[#1f2335] hover:bg-white/5' : 'border-[#f0f0f0] hover:bg-slate-50'}`}
                        >
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            : <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}><Package size={13} className="text-[#8b92ad]" /></div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-semibold truncate ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{p.name}</p>
                            <p className="text-[10px] text-[#8b92ad] font-medium">฿{p.price.toLocaleString()}</p>
                          </div>
                          <Plus size={12} className="text-accent flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Right panel: order items ── */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {(editingOrder?.items ?? []).map((item, idx) => (
                      <EditOrderItemCard
                        key={idx}
                        item={item}
                        products={products}
                        isDark={isDark}
                        k={k}
                        onUpdate={patch => updateItem(idx, patch)}
                        onRemove={() => removeItem(idx)}
                      />
                    ))}
                    <button
                      onClick={addItem}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold border-dashed border-2 transition-all ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:border-accent hover:text-accent' : 'border-[#e2e5ef] text-[#8b92ad] hover:border-accent hover:text-accent'}`}
                    >
                      + Add custom item
                    </button>
                  </div>

                  {/* Footer summary + save */}
                  <div className={`px-5 pt-3 pb-5 flex-shrink-0 border-t space-y-3 ${isDark ? 'border-[#1f2335]' : 'border-[#e2e5ef]'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#8b92ad] font-medium">Subtotal</span>
                      <span className={`text-xs font-bold ${isDark ? 'text-white/70' : 'text-[#1a1d2e]/70'}`}>฿{orderSubtotal.toLocaleString()}</span>
                    </div>
                    {/* Discount row */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-[#8b92ad] font-medium flex-shrink-0">Discount</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold ${k.muted}`}>-฿</span>
                        <input
                          type="number" min={0} max={orderSubtotal}
                          value={editingOrder?.discount || 0}
                          onChange={e => setEditingOrder(v => v && { ...v, discount: Math.max(0, parseFloat(e.target.value) || 0) })}
                          placeholder="0"
                          className={`w-24 text-xs font-bold rounded-xl px-3 py-1.5 border outline-none focus:border-accent transition-all ${isDark ? 'bg-[#1a1d2e] border-[#2a3050] text-white' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]'}`}
                        />
                      </div>
                    </div>
                    <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-[#1f2335]' : 'border-[#e2e5ef]'}`}>
                      <span className="text-sm text-[#8b92ad] font-semibold">Total</span>
                      <span className={`text-lg font-black ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>฿{orderTotal.toLocaleString()}</span>
                    </div>
                    {(editingOrder?.costTHB ?? 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8b92ad] font-medium">Profit</span>
                        <span className={`text-xs font-black ${orderProfit >= 0 ? 'text-accent' : 'text-rose-500'}`}>
                          {orderProfit >= 0 ? '+' : ''}฿{orderProfit.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (!editingOrder) return;
                        const totalQty = editingOrder.items.reduce((s, i) => s + i.qty, 0);
                        const primaryName = editingOrder.items[0]?.name || '';
                        patchOrder(editingOrder.id, {
                          items: editingOrder.items,
                          soldTHB: orderTotal,
                          quantity: totalQty,
                          product: primaryName,
                          discount: editingOrder.discount || 0,
                          profit: orderTotal - editingOrder.costTHB - editingOrder.shipCostTHB,
                        }, 'Order updated');
                        setEditingOrder(null);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-black text-white hover:opacity-90 transition-all active:scale-95"
                      style={{ background: 'var(--accent-gradient)' }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Toast notifications ── */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl text-[12px] font-bold text-white transition-all ${
                t.type === 'error' ? 'bg-red-500' : t.type === 'info' ? 'bg-blue-500' : 'bg-[#22c55e]'
              }`}
            >
              {t.type === 'error' ? <X size={13} /> : t.type === 'info' ? <AlertTriangle size={13} /> : <Check size={13} />}
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* ── Floating batch selection toolbar ── */}
      {batchMounted && (
        <div className={`toolbar-slide fixed bottom-6 left-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-2xl w-fit max-w-[90vw] ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'}`}
          data-state={batchVisible ? 'open' : 'closed'}>
          <span className={`text-xs font-bold text-accent whitespace-nowrap`}>{selectedOrderIds.size} selected</span>
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-semibold ${isDark ? 'text-[#8b92ad]' : 'text-[#8b92ad]'}`}>฿</span>
            <input
              type="number"
              value={batchEditTotal}
              onChange={e => setBatchEditTotal(e.target.value)}
              className={`w-24 text-xs font-black rounded-lg px-2 py-1.5 border outline-none focus:border-accent transition-all ${isDark ? 'bg-[#1f2335] border-[#2a3050] text-white' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]'}`}
            />
          </div>
          <button
            onClick={() => sendBatchQR([...selectedOrderIds], selectedTotal)}
            disabled={batchActing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 text-amber-950 text-[11px] font-bold hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            <QrCode size={11} /> {batchActing ? 'Sending...' : 'Combined QR'}
          </button>
          <button
            onClick={() => markBatchPaid([...selectedOrderIds])}
            disabled={batchActing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
            style={{ background: 'var(--accent-gradient)' }}
          >
            <CheckCircle size={11} /> {batchActing ? 'Processing...' : 'Mark All Paid'}
          </button>
          <button
            onClick={() => setSelectedOrderIds(new Set())}
            disabled={batchActing}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${isDark ? 'text-[#8b92ad] hover:bg-white/10' : 'text-[#8b92ad] hover:bg-black/5'}`}
          >
            <X size={12} />
          </button>
        </div>
      )}

      <ConfirmModal config={confirm} onClose={() => setConfirm(v => ({ ...v, open: false }))} isDark={isDark} k={k} />

      {/* ── Fulfilment Modal ── */}
      {fmMounted && (
        <FulfilmentModal
          open={fmVisible}
          order={fulfilmentModalOrder!}
          existingFulfilments={fulfilmentsCache[fulfilmentModalOrderId!] ?? []}
          isDark={isDark}
          k={k}
          shippingCompanies={merchantSettings?.shippingCompanies ?? ['Flash Express', 'ThaiPost', 'Kerry Express', 'J&T Express']}
          onClose={closeFulfilmentModal}
          onSuccess={async () => {
            await refreshOrders();
            await fetchFulfilments(fulfilmentModalOrderId!);
            onOrderMutated?.();
            closeFulfilmentModal();
          }}
        />
      )}

      {/* Cancel + Credit Modal */}
      {ccMounted && (
        <div
          className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={ccVisible ? 'open' : 'closed'}
          onClick={e => { if (e.target === e.currentTarget) setCancelCreditModal(null); }}
        >
          <div className={`modal-panel w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}
            data-state={ccVisible ? 'open' : 'closed'}>
            <div className="p-8">
              <div className="w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-5 bg-amber-500/10 text-amber-500">
                <Coins size={30} />
              </div>
              <h3 className={`text-xl font-black text-center mb-1 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>Handle Refund?</h3>
              <p className={`text-xs text-center mb-6 ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>
                This order was paid (฿{fmt(cancelCreditModal?.amount ?? 0)}). Choose how to handle the refund.
              </p>

              <div className="space-y-3 mb-4">
                {/* Option 1 — manual refund */}
                <button
                  onClick={() => { if (cancelCreditModal) patchOrder(cancelCreditModal.orderId, { status: 'cancelled' }); setCancelCreditModal(null); }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all hover:border-accent/40 active:scale-[0.98] ${isDark ? 'border-[#2a3050] hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className={`text-xs font-black mb-0.5 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>↩ Refund Manually</div>
                  <div className={`text-[10px] ${isDark ? 'text-[#8b92ad]' : 'text-slate-400'}`}>Cancel the order. Handle the money return outside the system.</div>
                </button>

                {/* Option 2 — issue shop credits */}
                <button
                  onClick={() => cancelCreditModal && issueCreditsAndCancel(cancelCreditModal.orderId, cancelCreditModal.amount)}
                  className="w-full p-4 rounded-2xl border border-amber-200 bg-amber-50 text-left transition-all hover:bg-amber-100 active:scale-[0.98]"
                >
                  <div className="text-xs font-black text-amber-700 flex items-center gap-2 mb-0.5">
                    <Coins size={13} /> Issue ฿{fmt(cancelCreditModal?.amount ?? 0)} Shop Credits
                  </div>
                  <div className="text-[10px] text-amber-600/80">Customer receives credits to spend on future orders at this shop.</div>
                </button>
              </div>

              <button
                onClick={() => setCancelCreditModal(null)}
                className={`w-full py-3 rounded-2xl font-black text-xs transition-all active:scale-95 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ config, onClose, isDark, k }: { config: any, onClose: () => void, isDark: boolean, k: typeof DK }) {
  const { mounted, visible } = useDelayedUnmount(!!config.open);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!mounted) return null;
  return (
    <div
      className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      data-state={visible ? 'open' : 'closed'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal-panel w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}
        data-state={visible ? 'open' : 'closed'}>
        <div className="p-10 text-center">
          <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-8 ${config.danger ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <AlertTriangle size={36} />
          </div>
          <h3 className={`text-2xl font-black mb-4 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{config.title}</h3>
          <p className={`text-sm leading-relaxed mb-10 ${k.muted}`}>{config.message}</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { config.onConfirm(); onClose(); }}
              className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl ${
                config.danger 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                  : 'bg-emerald-500 hover:opacity-90 text-white shadow-emerald-500/20'
              }`}
            >
              Confirm Action
            </button>
            <button
              onClick={onClose}
              className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
      <span className="w-1 h-3 bg-emerald-500 rounded-full" />
      {children}
    </p>
  );
}

function AutoDeliverBadge({ merchantSettings, isDark, onSettingsChange }: {
  merchantSettings: any;
  isDark: boolean;
  onSettingsChange: (updated: any) => void;
}) {
  const enabled: boolean = !!merchantSettings?.autoDeliver?.enabled;
  const serverDays: number = merchantSettings?.autoDeliver?.afterDays ?? 14;

  const [localDays, setLocalDays] = useState(serverDays);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local in sync when parent merchantSettings changes from outside
  useEffect(() => { setLocalDays(serverDays); }, [serverDays]);

  function saveDays(newDays: number) {
    setLocalDays(newDays);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const next = { autoDeliver: { ...(merchantSettings?.autoDeliver || {}), enabled: true, afterDays: newDays } };
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      if (res.ok) {
        onSettingsChange(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      }
    }, 600);
  }

  async function toggleEnabled(on: boolean) {
    const next = { autoDeliver: { ...(merchantSettings?.autoDeliver || {}), enabled: on, afterDays: localDays } };
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    if (res.ok) onSettingsChange(next);
  }

  const base = `text-[10px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${isDark ? 'border-[#1f2335]' : 'border-slate-200'}`;

  if (!enabled) {
    return (
      <button
        onClick={() => toggleEnabled(true)}
        title="Auto-deliver marks shipped orders as delivered after N days"
        className={`${base} ${isDark ? 'text-[#8b92ad] hover:text-emerald-400 hover:border-emerald-500/40 bg-[#1a1d2e]' : 'text-slate-400 hover:text-emerald-600 hover:border-emerald-400/50 bg-white'} active:scale-95`}
      >
        <Clock size={10} />
        Auto-deliver off · Enable
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${isDark ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-emerald-50 border-emerald-200'} border rounded-full px-2 py-0.5`}>
      <Clock size={10} className="text-emerald-500 flex-shrink-0" />
      <span className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Auto-delivers after</span>
      <button
        onClick={() => saveDays(Math.max(1, localDays - 1))}
        disabled={localDays <= 1}
        aria-label="Decrease days"
        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black transition-all active:scale-90 disabled:opacity-30 ${isDark ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-700'}`}
      >−</button>
      <span className={`text-[10px] font-black tabular-nums min-w-[14px] text-center ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
        {saved ? <Check size={9} className="inline text-emerald-500" /> : localDays}
      </span>
      <button
        onClick={() => saveDays(Math.min(90, localDays + 1))}
        disabled={localDays >= 90}
        aria-label="Increase days"
        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black transition-all active:scale-90 disabled:opacity-30 ${isDark ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-700'}`}
      >+</button>
      <span className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>days</span>
      <button
        onClick={() => toggleEnabled(false)}
        title="Disable auto-deliver"
        aria-label="Disable auto-deliver"
        className={`ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all active:scale-90 ${isDark ? 'text-[#8b92ad] hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
      >
        <X size={8} />
      </button>
    </div>
  );
}

// ── Active Order Card ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, any> = {
  pending:             { bg: 'bg-amber-500',   text: 'text-amber-600',   border: 'border-amber-200',   lightBg: 'bg-amber-50'   },
  paid:                { bg: 'bg-sky-500',     text: 'text-sky-600',     border: 'border-sky-200',     lightBg: 'bg-sky-50'     },
  preparing:           { bg: 'bg-indigo-500',  text: 'text-indigo-600',  border: 'border-indigo-200',  lightBg: 'bg-indigo-50'  },
  partially_fulfilled: { bg: 'bg-orange-500',  text: 'text-orange-600',  border: 'border-orange-200',  lightBg: 'bg-orange-50'  },
  shipped:             { bg: 'bg-violet-500',  text: 'text-violet-600',  border: 'border-violet-200',  lightBg: 'bg-violet-50'  },
  delivered:           { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', lightBg: 'bg-emerald-50' },
  fulfilled:           { bg: 'bg-green-600',   text: 'text-green-700',   border: 'border-green-200',   lightBg: 'bg-green-50'   },
  cancelled:           { bg: 'bg-rose-500',    text: 'text-rose-600',    border: 'border-rose-200',    lightBg: 'bg-rose-50'    },
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'New Order', paid: 'Paid', preparing: 'In Parcel',
  partially_fulfilled: 'Part. Fulfilled',
  shipped: 'Shipped', delivered: 'Delivered', fulfilled: 'Fulfilled', cancelled: 'Cancelled',
};

const DARK_STATUS: Record<string, string> = {
  pending:             'bg-amber-500/15 text-amber-400 border-amber-500/30',
  paid:                'bg-sky-500/15 text-sky-400 border-sky-500/30',
  preparing:           'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  partially_fulfilled: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  shipped:             'bg-violet-500/15 text-violet-400 border-violet-500/30',
  delivered:           'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  fulfilled:           'bg-green-500/15 text-green-400 border-green-500/30',
  cancelled:           'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

function ActiveOrderCard({ order, isDark, k, onDelete, onPatch, onEdit, onSendQR, onMarkPaid, onMoveToParcel, onCancel, onToggleFulfilments, fulfilmentsExpanded, fulfilments, onPatchFulfilment, onDeleteFulfilment, selected, onToggleSelect, isActing }: {
  order: Order; isDark: boolean; k: typeof DK;
  onDelete: () => void;
  onPatch?: (patch: object) => void;
  onEdit?: () => void;
  onSendQR?: () => void;
  onMarkPaid?: () => void;
  onMoveToParcel?: () => void;
  onCancel?: () => void;
  onToggleFulfilments?: () => void;
  fulfilmentsExpanded?: boolean;
  fulfilments?: Fulfilment[];
  onPatchFulfilment?: (fulfilmentId: string, patch: object) => void;
  onDeleteFulfilment?: (fulfilmentId: string) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  isActing?: boolean;
}) {
  const status = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const label = STATUS_LABEL[order.status] || 'Order';

  const cardClasses = isDark
    ? `bg-[#161925] border border-[#1f2335] hover:bg-white/10 ${status.glow || ''}`
    : `bg-white ${status.border} shadow-sm hover:shadow-md transition-all ${status.glow || ''}`;

  const borderColors: Record<string, string> = {
    pending: '#fbbf24', paid: '#60a5fa', preparing: '#34d399', shipped: '#94a3b8', delivered: '#4ade80',
  };

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border-l-4 p-5 transition-all duration-300 ${cardClasses} ${selected && onToggleSelect ? 'ring-2 ring-accent/40' : ''}`}
      style={!isDark ? { borderLeftColor: borderColors[order.status] ?? borderColors.pending } : { borderLeftColor: 'transparent' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <div
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              role="checkbox"
              aria-checked={selected}
              aria-label={selected ? 'Deselect order' : 'Select order'}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggleSelect(); } }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 cursor-pointer"
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                selected
                  ? 'bg-accent border-accent'
                  : isDark ? 'border-white/30 hover:border-accent/60' : 'border-gray-300 hover:border-accent/60'
              }`}>
                {selected && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
            </div>
          )}
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
            isDark ? 'bg-white/5 text-white/70 border-white/10' : `${status.lightBg} ${status.text} ${status.border}`
          }`}>
            {label}
          </span>
          {order.paymentQrSent && order.status === 'pending' && (
            <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-100">QR SENT</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onEdit && order.status !== 'cancelled' && (
            <button onClick={onEdit} aria-label="Edit order" title="Edit order" className="text-[#8b92ad] hover:text-accent transition-colors p-1">
              <Pencil size={12} />
            </button>
          )}
          {onCancel && !['cancelled', 'delivered', 'fulfilled', 'shipped', 'partially_fulfilled'].includes(order.status) && (
            <button onClick={onCancel} aria-label="Cancel order" title="Cancel order" className="text-[#8b92ad] hover:text-rose-500 transition-colors p-1">
              <Ban size={13} />
            </button>
          )}
          {order.status === 'preparing' ? (
            <button onClick={onDelete} aria-label="Remove from parcel" title="Remove from parcel — returns to active orders" className="text-[#8b92ad] hover:text-accent transition-colors p-1">
              <CornerUpLeft size={13} />
            </button>
          ) : (
            <button onClick={onDelete} aria-label="Delete order" title="Delete order" className="text-[#8b92ad] hover:text-red-500 transition-colors p-1">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <p className={`font-bold text-sm leading-snug mb-3 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{order.product}</p>

      {/* Fulfilment progress indicator */}
      {order.fulfilmentSummary && order.fulfilmentSummary.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold ${k.muted}`}>
              {order.fulfilmentSummary.shipped} of {order.fulfilmentSummary.total} parcels shipped
            </span>
            <span className={`text-[10px] font-black ${order.fulfilmentSummary.delivered === order.fulfilmentSummary.total ? 'text-emerald-500' : 'text-orange-500'}`}>
              {order.fulfilmentSummary.delivered === order.fulfilmentSummary.total ? 'All delivered' : `${order.fulfilmentSummary.delivered} delivered`}
            </span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${order.fulfilmentSummary.total > 0 ? (order.fulfilmentSummary.shipped / order.fulfilmentSummary.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>
            ฿{fmt(order.soldTHB)}
          </p>
          {(order.profit || 0) > 0 && (
            <span className={`text-[10px] font-bold ${isDark ? 'text-accent' : 'text-accent bg-accent/5 px-1.5 py-0.5 rounded-md'}`}>
              +฿{fmt(order.profit)}
            </span>
          )}
        </div>
      </div>

      {order.status !== 'preparing' && (
        <div className={`flex flex-wrap gap-2 mt-4 pt-3 border-t border-dashed ${k.border}`}>
          {onMoveToParcel && order.status === 'paid' && (
            <button onClick={onMoveToParcel} disabled={isActing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-[#1a1d2e] text-white hover:bg-black transition-all active:scale-95 disabled:opacity-50">
              <Package size={12} /> {isActing ? 'Moving...' : 'Move to Parcel'}
            </button>
          )}
          {onSendQR && order.status === 'pending' && (
            <button onClick={onSendQR} disabled={isActing}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 disabled:opacity-50 ${
                order.paymentQrSent
                  ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                  : 'bg-amber-400 border-amber-400 text-amber-950 hover:bg-amber-500'
              }`}>
              <QrCode size={12} /> {isActing ? 'Sending...' : order.paymentQrSent ? 'Resend QR' : 'Send QR'}
            </button>
          )}
          {onMarkPaid && order.status === 'pending' && (
            <button onClick={onMarkPaid} disabled={isActing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-white hover:opacity-90 transition-all active:scale-95 shadow-sm disabled:opacity-50"
              style={{ background: 'var(--accent-gradient)' }}>
              <CheckCircle size={12} /> {isActing ? 'Processing...' : 'Mark Paid'}
            </button>
          )}
        </div>
      )}

      {/* Parcels list (expandable) */}
      {onToggleFulfilments && (
        <div className={`mt-3 pt-3 border-t ${k.border}`}>
          <button
            onClick={onToggleFulfilments}
            className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${k.muted} hover:text-accent`}
          >
            <PackagePlus size={12} />
            Parcels ({order.fulfilmentSummary?.total ?? '…'})
            <ChevronDown size={10} className={`transition-transform ${fulfilmentsExpanded ? 'rotate-180' : ''}`} />
          </button>
          {fulfilmentsExpanded && (
            <div className="mt-2 space-y-2">
              {!fulfilments ? (
                <div className={`text-[10px] ${k.muted} flex items-center gap-1.5`}>
                  <div className="w-3 h-3 border border-t-transparent border-accent rounded-full animate-spin" /> Loading…
                </div>
              ) : fulfilments.length === 0 ? (
                <p className={`text-[10px] ${k.muted}`}>No parcels yet.</p>
              ) : (
                fulfilments.map(f => (
                  <ParcelRow
                    key={f._id}
                    fulfilment={f}
                    isDark={isDark}
                    k={k}
                    onPatch={onPatchFulfilment ? (patch) => onPatchFulfilment(f._id, patch) : undefined}
                    onDelete={onDeleteFulfilment ? () => onDeleteFulfilment(f._id) : undefined}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── Parcel Card ───────────────────────────────────────────────────────────────
function ParcelContainer({ orders, isDark, k, onPatch, onCancelParcel, onShip, onAddItem, onEditOrder, merchantSettings }: {
  orders: Order[]; isDark: boolean; k: typeof DK;
  onPatch: (id: string, patch: object) => void;
  onCancelParcel: (id: string) => void;
  onShip: (tracking: string, courier: string) => void;
  onAddItem?: () => void;
  onEditOrder?: (order: Order) => void;
  merchantSettings?: any;
}) {
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');
  const [shipping, setShipping] = useState(false);
  const [shipError, setShipError] = useState('');

  const firstOrder = orders[0];
  const parcelId = firstOrder?._id || 'NEW';
  const parcelShortId = firstOrder?._id.slice(-4).toUpperCase() || 'NEW';
  const parcelCreatedAt = firstOrder?.createdAt
    ? new Date(firstOrder.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const inner = isDark ? 'bg-[#1a1d2e] border-[#2a3050]' : 'bg-white border-[#e2e5ef]';
  const outer = isDark ? 'border-[#2a3050]' : 'border-[#e2e5ef]';

  async function handleShip() {
    if (!tracking || !courier) {
      setShipError('Courier and tracking are required');
      return;
    }
    setShipError('');
    setShipping(true);
    await onShip(tracking, courier);
    setShipping(false);
  }

  return (
    <article className={`rounded-[32px] border-2 border-dashed ${outer} ${isDark ? 'bg-[#161925]' : 'bg-white shadow-xl'} p-8 space-y-6 transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Package size={20} className="text-accent" />
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${k.muted}`}>Parcel Identity</p>
            <p className={`text-sm font-black ${k.text}`} title={parcelId}>#{parcelShortId}</p>
            {parcelCreatedAt && (
              <p className={`text-[10px] ${k.muted} mt-0.5`}>{parcelCreatedAt}</p>
            )}
          </div>
        </div>
        <button onClick={onAddItem} className="flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-2xl hover:opacity-90 text-white transition-all active:scale-95 shadow-lg" style={{ background: 'var(--accent-gradient)' }}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="space-y-3">
        {orders.map(order => (
          <ActiveOrderCard
            key={order._id}
            order={order}
            isDark={isDark}
            k={k}
            onEdit={onEditOrder ? () => onEditOrder(order) : undefined}
            onDelete={() => onCancelParcel(order._id)}
            onCancel={() => onPatch(order._id, { status: 'cancelled' })}
            onPatch={(patch) => onPatch(order._id, patch)}
          />
        ))}
      </div>

      <div className={`border rounded-[24px] p-8 ${isDark ? 'bg-[#1a1d2e] border-[#1f2335]' : 'bg-slate-50'} space-y-6`}>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${k.muted}`}>Courier Service</label>
            <select
              value={courier}
              onChange={e => setCourier(e.target.value)}
              className={`w-full text-sm rounded-2xl px-4 py-3.5 border outline-none focus:border-emerald-500 transition-all ${k.input}`}
            >
              <option value="">Choose a courier</option>
              {merchantSettings?.shippingCompanies?.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-[9px] font-black uppercase tracking-widest mb-2 ${k.muted}`}>Tracking Reference</label>
            <input
              placeholder="e.g. TH12345678"
              value={tracking}
              onChange={e => setTracking(e.target.value)}
              className={`w-full text-sm rounded-2xl px-4 py-3.5 border outline-none focus:border-emerald-500 transition-all ${k.input}`}
            />
          </div>
        </div>

        {shipError && (
          <p className="text-xs font-semibold text-red-500">{shipError}</p>
        )}
        <button
          onClick={handleShip}
          disabled={shipping || orders.length === 0}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-[20px] bg-[#020617] hover:bg-black text-white font-black text-sm shadow-2xl transition-all active:scale-95 disabled:opacity-40"
        >
          <Printer size={18} /> {shipping ? 'Processing...' : 'Complete Shipment & Print'}
        </button>
      </div>
    </article>
  );
}

// ── Address Section ───────────────────────────────────────────────────────────
// ── Address Section ───────────────────────────────────────────────────────────
function AddressSection({ customer, isDark, k, selectedIdx, onSelect, onAdd, onRemove }: {
  customer: Customer; isDark: boolean; k: typeof DK;
  selectedIdx: number; onSelect: (idx: number) => void;
  onAdd: (addr: string) => void; onRemove: (idx: number) => void;
}) {
  const [newAddr, setNewAddr] = useState('');

  return (
    <div className="space-y-2 mt-3">
      {(customer?.addresses || []).length === 0 ? (
        <div className={`p-6 border border-dashed ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-3xl text-center`}>
          <MapPin size={16} className={`mx-auto mb-2 ${k.muted}`} />
          <p className={`text-[10px] font-bold uppercase tracking-widest ${k.muted}`}>No addresses saved</p>
        </div>
      ) : (
        (customer?.addresses || []).map((addr, i) => (
          <div 
            key={i} 
            onClick={() => onSelect(i)}
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedIdx === i 
                ? (isDark ? 'bg-accent/5 border-accent/30 shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_10%,transparent)]' : 'bg-accent/5 border-accent/30 shadow-sm')
                : (isDark ? 'bg-white/5 border-white/5 opacity-60' : 'bg-white border-gray-100 opacity-70')
            } hover:opacity-100 group`}
          >
            <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
              selectedIdx === i ? 'border-accent bg-accent' : (isDark ? 'border-white/20' : 'border-gray-300')
            }`}>
              {selectedIdx === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className={`text-xs flex-1 font-medium leading-relaxed ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{addr}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              aria-label={`Remove address: ${addr}`}
              className={`text-xs ${k.muted} hover:text-red-500 transition-colors p-0.5 opacity-0 group-hover:opacity-100`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))
      )}
      <div className="flex gap-2 pt-1">
        <input
          value={newAddr}
          onChange={e => setNewAddr(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newAddr.trim()) { onAdd(newAddr); setNewAddr(''); } }}
          placeholder="Add new delivery address..."
          className={`flex-1 text-sm rounded-xl px-3 py-2 border outline-none focus:border-accent transition-all ${k.input}`}
        />
        <button
          onClick={() => { if (newAddr.trim()) { onAdd(newAddr); setNewAddr(''); } }}
          className="p-2 text-white rounded-xl hover:opacity-90 transition-all active:scale-95"
          style={{ background: 'var(--accent-gradient)' }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ── History Row ───────────────────────────────────────────────────────────────
function HistoryRow({ order, isDark, k, isLast, onPatch, onDelete, isHighlighted, onToggleFulfilments, fulfilmentsExpanded, fulfilments, onPatchFulfilment, onDeleteFulfilment, products }: {
  order: Order; isDark: boolean; k: typeof DK; isLast: boolean;
  onPatch: (patch: object) => void;
  onDelete: () => void;
  isHighlighted?: boolean;
  onToggleFulfilments?: () => void;
  fulfilmentsExpanded?: boolean;
  fulfilments?: Fulfilment[];
  onPatchFulfilment?: (fulfilmentId: string, patch: object) => void;
  onDeleteFulfilment?: (fulfilmentId: string) => void;
  products?: Product[];
}) {
  const [open, setOpen] = useState(false);
  // Use rateUsed or fallback to calculated rate; guard against division by zero and NaN
  const initialRate = order.rateUsed || (order.costKRW > 0 && order.costTHB > 0 ? (order.costTHB / order.costKRW) : 0);
  const [rate, setRate] = useState(String(initialRate || ''));
  const [saving, setSaving] = useState(false);

  const sc = order.soldCurrency || 'THB';
  const cc = order.costCurrency || 'KRW';

  // Derived values — sold and cost come from the order record; only rate is editable
  const currentRate = parseFloat(rate) || 0;
  const currentCostTHB = (order.costKRW || 0) * currentRate;
  const currentProfit = (order.soldTHB || 0) - currentCostTHB - (order.shipCostTHB || 0);

  async function saveUpdate() {
    setSaving(true);
    await onPatch({
      costTHB: currentCostTHB,
      profit: currentProfit,
      rateUsed: currentRate
    });
    setSaving(false);
    setOpen(false);
  }

  const statusBadge: Record<string, string> = {
    shipped:             isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600',
    partially_fulfilled: isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
    delivered:           isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    fulfilled:           isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700',
    cancelled:           isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600',
  };
  const statusLabel: Record<string, string> = { shipped: 'IN TRANSIT', partially_fulfilled: 'PART. FULFILLED', delivered: 'DELIVERED', fulfilled: 'FULFILLED', cancelled: 'CANCELLED' };

  return (
    <div className={`transition-all duration-300 ${!isLast ? `border-b ${k.border}` : ''} ${open ? (isDark ? 'bg-white/5' : 'bg-slate-50') : ''} ${isHighlighted ? 'ring-2 ring-accent/80 shadow-lg shadow-accent/20 order-glow-pulse' : ''}`}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left transition-all ${k.hover} outline-none`}
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          ['shipped', 'partially_fulfilled'].includes(order.status) ? (isDark ? 'bg-violet-500/10' : 'bg-violet-50') :
          order.status === 'cancelled' ? (isDark ? 'bg-rose-500/10' : 'bg-rose-50') :
          (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
        }`}>
          {['shipped', 'partially_fulfilled'].includes(order.status) ? <Truck size={16} className="text-violet-500" /> :
           order.status === 'cancelled' ? <Ban size={16} className="text-rose-500" /> :
           <Package size={16} className="text-emerald-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{order.product}</p>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 ${statusBadge[order.status] || ''}`}>
              {statusLabel[order.status] || order.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] ${k.muted} flex items-center gap-1`}>
              <Clock size={9} />
              {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {order.tracking && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-[#8b92ad]' : 'bg-[#f8f9fc] text-[#8b92ad]'}`}>
                {order.courier || 'Shipped'} · {order.tracking}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-black ${currentProfit >= 0 ? 'text-accent' : 'text-red-500'}`}>
            {sc} {fmt(currentProfit)}
          </p>
          <p className={`text-[10px] ${k.muted}`}>Sales: {sc} {fmt(order.soldTHB)}</p>
        </div>
        {order.status === 'shipped' && (
          <button
            onClick={e => { e.stopPropagation(); onPatch({ status: 'delivered' }); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95 flex-shrink-0"
            title="Mark as delivered"
          >
            <CheckCircle size={11} /> Delivered
          </button>
        )}
        {order.status === 'shipped' && (
          <button
            onClick={e => {
              e.stopPropagation();
              const w = window.open('', '_blank', 'width=480,height=600');
              if (!w) return;
              w.document.write(`<html><head><title>Order Receipt</title><style>body{font-family:sans-serif;padding:24px;font-size:13px}h2{margin:0 0 4px}p{margin:4px 0}hr{border:none;border-top:1px solid #ddd;margin:12px 0}.label{color:#888;font-size:11px}</style></head><body>
                <h2>${order.product}</h2>
                <p class="label">${new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <hr/>
                ${order.tracking ? `<p><b>Courier:</b> ${order.courier || ''} · ${order.tracking}</p>` : ''}
                ${order.address ? `<p><b>Address:</b> ${order.address}</p>` : ''}
                <hr/>
                <p><b>Sales:</b> ${sc} ${fmt(order.soldTHB)}</p>
                <p><b>Cost:</b> ${cc} ${fmt(order.costKRW)} (${sc} ${fmt(Math.round(currentCostTHB))})</p>
                ${order.shipCostTHB ? `<p><b>Shipping:</b> ${sc} ${fmt(order.shipCostTHB)}</p>` : ''}
                <p><b>Profit:</b> ${sc} ${fmt(Math.round(currentProfit))}</p>
                <script>window.onload=()=>window.print()</script>
              </body></html>`);
              w.document.close();
            }}
            className={`p-2 ml-2 rounded-lg flex-shrink-0 transition-colors ${k.muted} hover:text-accent`}
            title="Print receipt"
            aria-label="Print order receipt"
          >
            <Printer size={14} />
          </button>
        )}
        <div className="flex items-center ml-1 flex-shrink-0">
          <ChevronDown size={14} className={`${k.muted} transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className={`px-5 pb-4 ${isDark ? 'bg-[#1a1d2e]' : 'bg-[#f8f9fc]'}`}>
          {/* Item table */}
          {(() => {
            const orderItems = order.items || [];
            if (orderItems.length === 0) return null;
            const divBorder = isDark ? 'border-[#1f2335]' : 'border-slate-200';
            return (
              <div className={`rounded-xl overflow-hidden border ${divBorder} mb-3`}>
                {orderItems.map((item, idx) => {
                  const product = products?.find(p => p._id === item.productId);
                  const isItemLast = idx === orderItems.length - 1;
                  return (
                    <div key={idx} className={`flex items-center gap-3 px-3 py-2.5 ${!isItemLast ? `border-b ${divBorder}` : ''} ${isDark ? 'bg-[#161925]' : 'bg-white'}`}>
                      <div className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        {product?.imageUrl
                          ? <img src={product.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package size={12} className={k.muted} /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium truncate ${isDark ? 'text-white/90' : 'text-[#1a1d2e]'}`}>{item.name}</p>
                        {item.variantLabel && (
                          <p className={`text-[10px] ${k.muted}`}>{item.variantLabel}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[11px] font-bold ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>×{item.qty}</p>
                        <p className={`text-[10px] ${k.muted}`}>฿{fmt(item.price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {/* Rate editor — sold and cost come from the order record automatically */}
          <div className="flex items-end gap-3 mb-3">
            <div className="w-48">
              <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Exchange Rate ({cc} → {sc})</label>
              <NumberStepper value={currentRate} onChange={v => setRate(String(v))} min={0} step={0.001} isDark={isDark} />
            </div>
            <div className={`text-[10px] ${k.muted} pb-2`}>
              Cost: {sc} {fmt(Math.round(currentCostTHB))} · Profit: <span className={currentProfit >= 0 ? 'text-accent' : 'text-red-500'}>{sc} {fmt(Math.round(currentProfit))}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={saveUpdate} disabled={saving}
              className="flex-1 py-3 rounded-xl text-xs font-black bg-[#1a1d2e] hover:bg-black text-white transition-all active:scale-95 disabled:opacity-40">
              {saving ? 'Saving...' : 'Update Rate'}
            </button>
            {['shipped', 'partially_fulfilled'].includes(order.status) && (
              <button onClick={() => onPatch({ status: order.status === 'partially_fulfilled' ? 'fulfilled' : 'delivered' })}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95">
                <CheckCircle size={13} /> {order.status === 'partially_fulfilled' ? 'Mark Fulfilled' : 'Mark Delivered'}
              </button>
            )}
            <button onClick={onDelete}
              className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
              <Trash2 size={14} />
            </button>
          </div>

          {/* Parcels list */}
          {onToggleFulfilments && (
            <div className={`pt-3 border-t ${isDark ? 'border-[#1f2335]' : 'border-slate-200'}`}>
              <button
                onClick={onToggleFulfilments}
                className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${isDark ? 'text-[#8b92ad] hover:text-accent' : 'text-slate-500 hover:text-accent'}`}
              >
                <PackagePlus size={12} />
                Parcels ({order.fulfilmentSummary?.total ?? '…'})
                <ChevronDown size={10} className={`transition-transform ${fulfilmentsExpanded ? 'rotate-180' : ''}`} />
              </button>
              {fulfilmentsExpanded && (
                <div className="mt-2 space-y-2">
                  {!fulfilments ? (
                    <div className={`text-[10px] flex items-center gap-1.5 ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>
                      <div className="w-3 h-3 border border-t-transparent border-accent rounded-full animate-spin" /> Loading…
                    </div>
                  ) : fulfilments.length === 0 ? (
                    <p className={`text-[10px] ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>No parcels yet.</p>
                  ) : (
                    fulfilments.map(f => (
                      <ParcelRow
                        key={f._id}
                        fulfilment={f}
                        isDark={isDark}
                        k={k}
                        onPatch={onPatchFulfilment ? (patch) => onPatchFulfilment(f._id, patch) : undefined}
                        onDelete={onDeleteFulfilment ? () => onDeleteFulfilment(f._id) : undefined}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── In-Transit Parcel Group ───────────────────────────────────────────────────
function InTransitParcelGroup({ orders, isDark, k, isLast, onPatchOrder, onDeleteOrder, isGroupHighlighted, products }: {
  orders: Order[]; isDark: boolean; k: typeof DK; isLast: boolean;
  onPatchOrder: (id: string, patch: object) => void;
  onDeleteOrder: (id: string) => void;
  isGroupHighlighted?: boolean;
  products?: Product[];
}) {
  const [open, setOpen] = useState(false);
  const firstOrder = orders[0];
  const totalSold = orders.reduce((s, o) => s + (o.soldTHB || 0), 0);
  const totalProfit = orders.reduce((s, o) => s + (o.profit || 0), 0);
  const sc = firstOrder.soldCurrency || 'THB';
  const date = new Date(firstOrder.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`transition-all duration-300 ${!isLast ? `border-b ${k.border}` : ''} ${open ? (isDark ? 'bg-white/5' : 'bg-slate-50') : ''} ${isGroupHighlighted ? 'ring-2 ring-accent/80 shadow-lg shadow-accent/20 order-glow-pulse' : ''}`}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left transition-all ${k.hover} outline-none`}
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
          <Truck size={16} className="text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>
              {orders.length} items · {firstOrder.courier}{firstOrder.tracking ? ` · ${firstOrder.tracking}` : ''}
            </p>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 ${isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
              IN TRANSIT
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-[10px] ${k.muted} flex items-center gap-1`}>
              <Clock size={9} />{date}
            </span>
          </div>
          <p className={`text-[10px] mt-0.5 truncate ${k.muted}`}>
            {orders.map(o => o.product).join(' · ')}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-black ${totalProfit >= 0 ? 'text-accent' : 'text-red-500'}`}>
            {sc} {fmt(totalProfit)}
          </p>
          <p className={`text-[10px] ${k.muted}`}>Sales: {sc} {fmt(totalSold)}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); orders.forEach(o => onPatchOrder(o._id, { status: 'delivered' })); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95 flex-shrink-0"
          title="Mark all as delivered"
        >
          <CheckCircle size={11} /> Delivered
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            const w = window.open('', '_blank', 'width=480,height=700');
            if (!w) return;
            const rows = orders.map(o =>
              `<tr><td>${o.product}</td><td style="text-align:right;padding-left:16px">${sc} ${fmt(o.soldTHB)}</td></tr>`
            ).join('');
            w.document.write(`<html><head><title>Parcel Receipt</title><style>body{font-family:sans-serif;padding:24px;font-size:13px}h2{margin:0 0 4px}p{margin:4px 0}hr{border:none;border-top:1px solid #ddd;margin:12px 0}table{width:100%}.label{color:#888;font-size:11px}td{padding:4px 0}</style></head><body>
              <h2>Parcel · ${orders.length} items</h2>
              <p class="label">${firstOrder.courier ? `${firstOrder.courier} · ` : ''}${firstOrder.tracking || ''}</p>
              <p class="label">${date}</p>
              <hr/>
              ${firstOrder.address ? `<p><b>Address:</b> ${firstOrder.address}</p><hr/>` : ''}
              <table>${rows}<tr style="font-weight:bold;border-top:1px solid #ddd"><td>Total</td><td style="text-align:right;padding-left:16px">${sc} ${fmt(totalSold)}</td></tr></table>
              <hr/>
              <p><b>Profit:</b> ${sc} ${fmt(Math.round(totalProfit))}</p>
              <script>window.onload=()=>window.print()</script>
            </body></html>`);
            w.document.close();
          }}
          className={`p-2 ml-2 rounded-lg flex-shrink-0 transition-colors ${k.muted} hover:text-accent`}
          title="Print parcel receipt"
          aria-label="Print parcel receipt"
        >
          <Printer size={14} />
        </button>
        <div className="flex items-center ml-1 flex-shrink-0">
          <ChevronDown size={14} className={`${k.muted} transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className={`px-5 pb-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-[#f8f9fc]'}`}>
          {orders.map(order => {
            const profit = order.profit || 0;
            const orderItems = order.items || [];
            const divBorder = isDark ? 'border-[#1f2335]' : 'border-slate-200';
            return (
              <div key={order._id} className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200'}`}>
                {/* Order header row */}
                <div className={`flex items-center gap-3 px-4 py-3 border-b ${divBorder}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{order.product}</p>
                    <p className={`text-[10px] ${k.muted}`}>
                      #{order._id.slice(-6).toUpperCase()} · Sales: {sc} {fmt(order.soldTHB)} · Profit: {sc} {fmt(profit)}
                    </p>
                  </div>
                  <button
                    onClick={() => onPatchOrder(order._id, { status: 'delivered' })}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex-shrink-0"
                  >
                    <CheckCircle size={9} /> Delivered
                  </button>
                  <button
                    onClick={() => onDeleteOrder(order._id)}
                    className={`p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0`}
                    aria-label="Delete order"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {/* Item rows */}
                {orderItems.map((item, idx) => {
                  const product = products?.find(p => p._id === item.productId);
                  const isItemLast = idx === orderItems.length - 1;
                  return (
                    <div key={idx} className={`flex items-center gap-3 px-4 py-2.5 ${!isItemLast ? `border-b ${divBorder}` : ''}`}>
                      <div className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        {product?.imageUrl
                          ? <img src={product.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package size={11} className={k.muted} /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium truncate ${isDark ? 'text-white/90' : 'text-[#1a1d2e]'}`}>{item.name}</p>
                        {item.variantLabel && <p className={`text-[10px] ${k.muted}`}>{item.variantLabel}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[11px] font-bold ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>×{item.qty}</p>
                        <p className={`text-[10px] ${k.muted}`}>฿{fmt(item.price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Parcel Row (single fulfilment inside an order card's parcel list) ─────────
function ParcelRow({ fulfilment, isDark, k, onPatch, onDelete }: {
  fulfilment: Fulfilment; isDark: boolean; k: typeof DK;
  onPatch?: (patch: object) => void;
  onDelete?: () => void;
}) {
  const [acting, setActing] = useState(false);

  const statusPill: Record<string, string> = {
    shipped:   isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200',
    delivered: isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  };
  const statusLabel: Record<string, string> = { shipped: 'In Transit', delivered: 'Delivered' };

  function handleDelete() {
    if (window.confirm('Delete this shipment? This will update the order status.')) {
      onDelete?.();
    }
  }

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${isDark ? 'bg-[#1a1d2e] border-[#2a3050]' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${statusPill[fulfilment.status] ?? ''}`}>
          {statusLabel[fulfilment.status] ?? fulfilment.status}
        </span>
        <div className="flex items-center gap-1 text-[10px]">
          {fulfilment.courier && <span className={k.muted}>{fulfilment.courier}</span>}
          {fulfilment.tracking && <span className={`font-bold ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>· {fulfilment.tracking}</span>}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {fulfilment.status === 'shipped' && (
            <button
              onClick={async () => { setActing(true); await onPatch?.({ status: 'delivered' }); setActing(false); }}
              disabled={acting}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black transition-all active:scale-95 disabled:opacity-50 ${isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
            >
              <CheckCircle size={9} /> {acting ? '…' : 'Mark Delivered'}
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={acting}
              className={`p-1 rounded-lg transition-colors disabled:opacity-50 text-red-400 hover:bg-red-500/10`}
              aria-label="Delete parcel"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
      {/* Items list */}
      <p className={`text-[10px] ${k.muted} leading-relaxed`}>
        {fulfilment.items.map(i => `${i.qty}x ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}`).join(', ')}
      </p>
    </div>
  );
}

// ── Fulfilment Modal ───────────────────────────────────────────────────────────
function FulfilmentModal({ order, existingFulfilments, isDark, k, shippingCompanies, onClose, onSuccess, open }: {
  order: Order;
  existingFulfilments: Fulfilment[];
  isDark: boolean;
  k: typeof DK;
  shippingCompanies: string[];
  onClose: () => void;
  onSuccess: () => void;
  open?: boolean;
}) {
  // Compute how many of each item have already been assigned to parcels
  const alreadyFulfilledQty: Record<string, number> = {};
  existingFulfilments.forEach(f => {
    f.items.forEach(fi => {
      const key = `${fi.name}::${fi.variantLabel ?? ''}`;
      alreadyFulfilledQty[key] = (alreadyFulfilledQty[key] ?? 0) + fi.qty;
    });
  });

  const defaultSelected: Record<number, boolean> = {};
  order.items.forEach((item, idx) => {
    const key = `${item.name}::${item.variantLabel ?? ''}`;
    const done = alreadyFulfilledQty[key] ?? 0;
    defaultSelected[idx] = done < item.qty;
  });

  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>(defaultSelected);
  const [courier, setCourier] = useState('');
  const [customCourier, setCustomCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [shipCost, setShipCost] = useState('0');
  const [address, setAddress] = useState(order.address ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const effectiveCourier = courier === '__other__' ? customCourier : courier;
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const shipCostNum = parseFloat(shipCost) || 0;

  const itemsForParcel = order.items
    .map((item, idx) => ({ item, idx }))
    .filter(({ idx }) => selectedItems[idx])
    .map(({ item }) => ({
      productId: item.productId,
      name: item.name,
      variantLabel: item.variantLabel,
      qty: item.qty,
      price: item.price,
    }));

  async function handleSubmit() {
    if (itemsForParcel.length === 0) { setError('Select at least one item.'); return; }
    if (!tracking.trim()) { setError('Tracking number is required.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/fulfilments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsForParcel,
          tracking: tracking.trim() || undefined,
          courier: effectiveCourier.trim() || undefined,
          address: address.trim() || undefined,
          shipCostTHB: shipCostNum,
          status: 'shipped',
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { onSuccess(); }, 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to create shipment.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="modal-overlay fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      data-state={open !== false ? 'open' : 'closed'}
      role="dialog"
      aria-modal="true"
      aria-label="Ship items"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal-panel w-full max-w-lg rounded-3xl shadow-2xl border flex flex-col max-h-[90vh] ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200'}`}
        data-state={open !== false ? 'open' : 'closed'}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border} flex-shrink-0`}>
          <div>
            <h3 className={`font-black text-sm ${k.text}`}>Create Shipment</h3>
            <p className={`text-[10px] mt-0.5 ${k.muted}`}>{order.product}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className={`p-1.5 rounded-xl ${k.muted} ${k.hover} transition-colors`}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>
              <p className={`text-sm font-black ${k.text}`}>Shipment created — parcel is now in transit</p>
              <p className={`text-[10px] ${k.muted}`}>Closing…</p>
            </div>
          ) : (
            <>
              {/* Item selector */}
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${k.muted}`}>Items in this parcel</p>
                <div className="space-y-1.5">
                  {order.items.map((item, idx) => {
                    const key = `${item.name}::${item.variantLabel ?? ''}`;
                    const alreadyDone = alreadyFulfilledQty[key] ?? 0;
                    const isFullyFulfilled = alreadyDone >= item.qty;
                    const isChecked = !!selectedItems[idx];
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? isDark ? 'bg-accent/10 border-accent/30' : 'bg-accent/5 border-accent/30'
                            : isDark ? 'bg-white/5 border-[#2a3050]' : 'bg-slate-50 border-slate-200'
                        } ${isFullyFulfilled ? 'opacity-50' : ''}`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isChecked ? 'bg-accent border-accent' : isDark ? 'border-white/30' : 'border-slate-300'
                          }`}
                          onClick={() => setSelectedItems(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        >
                          {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${k.text}`}>{item.name}</p>
                          {item.variantLabel && <p className={`text-[10px] ${k.muted}`}>{item.variantLabel}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-bold ${k.muted}`}>x{item.qty}</span>
                          {isFullyFulfilled && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                              done
                            </span>
                          )}
                          {!isFullyFulfilled && alreadyDone > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                              {alreadyDone} shipped
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Shipment details */}
              <div className="space-y-3">
                <p className={`text-[10px] font-black uppercase tracking-widest ${k.muted}`}>Shipment details</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Courier</label>
                    <select
                      value={courier}
                      onChange={e => setCourier(e.target.value)}
                      className={`w-full text-xs rounded-xl px-3 py-2 border outline-none focus:border-accent transition-all ${k.input}`}
                    >
                      <option value="">Choose courier</option>
                      {shippingCompanies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__other__">Other…</option>
                    </select>
                    {courier === '__other__' && (
                      <input
                        value={customCourier}
                        onChange={e => setCustomCourier(e.target.value)}
                        placeholder="Courier name"
                        className={`w-full mt-1.5 text-xs rounded-xl px-3 py-2 border outline-none focus:border-accent transition-all ${k.input}`}
                      />
                    )}
                  </div>
                  <div>
                    <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Tracking No. *</label>
                    <input
                      value={tracking}
                      onChange={e => setTracking(e.target.value)}
                      placeholder="e.g. TH12345678"
                      className={`w-full text-xs rounded-xl px-3 py-2 border outline-none focus:border-accent transition-all ${k.input}`}
                    />
                    <p className={`text-[9px] mt-1 ${k.muted}`}>Enter the tracking number from your courier label</p>
                  </div>
                </div>

                <div>
                  <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Shipping Cost (THB)</label>
                  <input
                    type="number"
                    min={0}
                    value={shipCost}
                    onChange={e => setShipCost(e.target.value)}
                    className={`w-full text-xs rounded-xl px-3 py-2 border outline-none focus:border-accent transition-all ${k.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Delivery Address</label>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    rows={2}
                    placeholder="Delivery address"
                    className={`w-full text-xs rounded-xl px-3 py-2 border outline-none focus:border-accent transition-all resize-none ${k.input}`}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                <span className={`text-[10px] font-bold ${k.muted}`}>
                  {selectedCount} item{selectedCount !== 1 ? 's' : ''} in this parcel
                </span>
                {shipCostNum > 0 && (
                  <span className={`text-[10px] font-black ${k.text}`}>฿{fmt(shipCostNum)} shipping</span>
                )}
              </div>

              {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className={`flex gap-3 px-6 py-4 border-t ${k.border} flex-shrink-0`}>
            <button
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedCount === 0 || !tracking.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: 'var(--accent-gradient)' }}
            >
              <Truck size={12} /> {submitting ? 'Creating…' : 'Ship Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Color preset map for swatch rendering ────────────────────────────────────
const COLOR_HEX_MAP: Record<string, string> = {
  black: '#111111', white: '#FFFFFF', cream: '#FFFDD0', beige: '#F5F0E8',
  grey: '#9CA3AF', gray: '#9CA3AF', silver: '#D1D5DB', brown: '#92400E',
  camel: '#C19A6B', navy: '#1E3A5F', blue: '#3B82F6', 'sky blue': '#7DD3FC',
  red: '#EF4444', pink: '#F472B6', maroon: '#7F1D1D', orange: '#F97316',
  yellow: '#FBBF24', olive: '#65A30D', green: '#16A34A', sage: '#87AE73',
  purple: '#7C3AED', lavender: '#A78BFA', gold: '#D97706', 'rose gold': '#B76E79',
  burgundy: '#800020',
};
function colorForSwatch(v: string): string {
  if (/^#[0-9A-F]{6}$/i.test(v)) return v;
  return COLOR_HEX_MAP[v.toLowerCase()] ?? '#9CA3AF';
}

// ── Edit Order Item Card ──────────────────────────────────────────────────────
// Right-panel item card: shows product name (locked), option/variant pickers, qty stepper
// Product selection happens via the left catalog panel — no search input here
type EditLineItem = { productId?: string; name: string; variantLabel?: string; qty: number; price: number };
function EditOrderItemCard({
  item, products, isDark, k, onUpdate, onRemove,
}: {
  item: EditLineItem; products: Product[]; isDark: boolean; k: typeof DK;
  onUpdate: (patch: Partial<EditLineItem>) => void;
  onRemove: () => void;
}) {
  const [variantSel, setVariantSel] = useState<Record<string, string>>({});
  const linkedProduct = item.productId ? products.find(p => p._id === item.productId) ?? null : null;

  useEffect(() => {
    if (!linkedProduct || !item.variantLabel) { setVariantSel({}); return; }
    const parts = item.variantLabel.split(' · ');
    const sel: Record<string, string> = {};
    linkedProduct.options?.forEach((opt, i) => { if (parts[i]) sel[opt.name] = parts[i]; });
    setVariantSel(sel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.productId]);

  const handleOptionSelect = (optName: string, value: string) => {
    const newSel = { ...variantSel, [optName]: value };
    setVariantSel(newSel);
    const label = linkedProduct?.options?.map(o => newSel[o.name]).filter(Boolean).join(' · ') ?? '';
    const match = linkedProduct?.variants?.find(vr =>
      Object.entries(newSel).every(([k2, val]) => vr.combination?.[k2] === val)
    );
    onUpdate({ variantLabel: label, ...(match?.price != null ? { price: match.price } : {}) });
  };

  const divider = isDark ? '#1f2335' : '#e2e5ef';

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1a1d2e] border-[#1f2335]' : 'bg-[#f8f9fc] border-[#e2e5ef]'}`}>
      {/* Header: thumbnail + name + qty + remove */}
      <div className="flex items-center gap-2.5 p-3">
        <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
          {linkedProduct?.imageUrl
            ? <img src={linkedProduct.imageUrl} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-[#8b92ad]" /></div>
          }
        </div>
        <p className={`flex-1 text-[12px] font-semibold leading-snug line-clamp-2 min-w-0 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{item.name}</p>
        {/* Qty stepper inline */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onUpdate({ qty: Math.max(1, item.qty - 1) })}
            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all disabled:opacity-30 ${isDark ? 'border-[#2a3050] text-[#8b92ad] hover:text-white hover:bg-white/10' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}><Minus size={9} /></button>
          <span className={`w-8 text-center text-[12px] font-black ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{item.qty}</span>
          <button onClick={() => onUpdate({ qty: item.qty + 1 })}
            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${isDark ? 'border-[#2a3050] text-[#8b92ad] hover:text-white hover:bg-white/10' : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}><Plus size={9} /></button>
        </div>
        <button onClick={onRemove} className="p-1 rounded-lg text-rose-400/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"><X size={13} /></button>
      </div>

      {/* Option pickers (product with variants) */}
      {linkedProduct?.options && linkedProduct.options.length > 0 && (
        <div className="px-3 pb-3 pt-2 space-y-2 border-t" style={{ borderColor: divider }}>
          {linkedProduct.options.map(opt => {
            const isColor = opt.name.toLowerCase() === 'color';
            return (
              <div key={opt.name}>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#8b92ad] mb-1.5">{opt.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {opt.values.map(v => {
                    const sel = variantSel[opt.name] === v;
                    if (isColor) {
                      return (
                        <button key={v} type="button" onClick={() => handleOptionSelect(opt.name, v)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${sel ? 'border-accent bg-accent/10 text-accent' : `${k.border} ${k.muted} ${k.hover}`}`}>
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: colorForSwatch(v) }} />
                          {v}
                        </button>
                      );
                    }
                    return (
                      <button key={v} type="button" onClick={() => handleOptionSelect(opt.name, v)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${sel ? 'text-white border-transparent' : `${k.border} ${k.muted} ${k.hover}`}`}
                        style={sel ? { background: 'var(--accent-gradient)' } : undefined}>
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Free-text variant for unlinked / custom items */}
      {!linkedProduct && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: divider }}>
          <input
            value={item.variantLabel ?? ''}
            placeholder="Variant (optional)"
            onChange={e => onUpdate({ variantLabel: e.target.value })}
            className={`w-full text-[11px] rounded-xl px-3 py-1.5 mt-2 border outline-none focus:border-accent transition-all ${isDark ? 'bg-[#161925] border-[#2a3050] text-[#8b92ad] placeholder-[#8b92ad]' : 'bg-white border-[#e2e5ef] text-[#8b92ad]'}`}
          />
        </div>
      )}
    </div>
  );
}

// ── Box Control ───────────────────────────────────────────────────────────────
// Read-only qty + Parcel button for a single pending item row
function BoxControl({ max, isDark, k, isActing, onBox }: {
  max: number; isDark: boolean; k: typeof DK; isActing: boolean;
  onBox: (qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
      {max > 1 && (
        <span className={`text-[11px] font-bold tabular-nums ${isDark ? 'text-white/50' : 'text-slate-400'}`}>×{max}</span>
      )}
      <button
        onClick={() => onBox(max)}
        disabled={isActing}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
        style={{ background: 'var(--accent-gradient)' }}
      ><Package size={10} />Parcel</button>
    </div>
  );
}

// ── Order Banner ──────────────────────────────────────────────────────────────
// Collapsible active-order card with progress bar, per-item thumbnails, and [+] buttons
function OrderBanner({
  order,
  isDark,
  k,
  customerAddresses,
  selectedAddress,
  onAddAddress,
  onSelectOrderAddress,
  onBoxItems,
  onUnboxItem,
  onSendQR,
  onMarkPaid,
  onMarkDelivered,
  onCancel,
  onDelete,
  onEdit,
  computeShippedQty,
  computeInParcelQty,
  isActing,
  products,
  isExpanded,
  onToggle,
}: {
  order: Order;
  isDark: boolean;
  k: typeof DK;
  customerAddresses: string[];
  selectedAddress: string;
  onAddAddress: (addr: string) => void;
  onSelectOrderAddress: (addr: string) => void;
  onBoxItems: (items: Array<{ productId?: string; name: string; variantLabel?: string; qty: number; price: number }>) => Promise<void>;
  onUnboxItem: (itemName: string) => Promise<void>;
  onSendQR: () => void;
  onMarkPaid: () => void;
  onMarkDelivered: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
  computeShippedQty: (itemName: string, variantLabel?: string) => number;
  computeInParcelQty: (itemName: string, variantLabel?: string) => number;
  isActing: boolean;
  products?: Product[];
  isExpanded: boolean;
  onToggle: () => void;
}) {

  const status = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const label = STATUS_LABEL[order.status] || 'Order';
  const darkStatusClass = DARK_STATUS[order.status] || DARK_STATUS.pending;

  const orderItems = order.items || [];

  // Fulfillment progress: items shipped OR boxed / total
  const totalQty = orderItems.reduce((s, i) => s + i.qty, 0);
  const processedQty = orderItems.reduce((s, i) => s + computeShippedQty(i.name, i.variantLabel) + computeInParcelQty(i.name, i.variantLabel), 0);
  const progress = totalQty > 0 ? Math.round((processedQty / totalQty) * 100) : 0;

  const orderAddr = order.address?.trim();
  const addrInList = !orderAddr || customerAddresses.some(a => a.trim() === orderAddr);

  const divider = isDark ? 'border-[#1f2335]' : 'border-slate-200';

  return (
    <article className={`rounded-2xl border overflow-hidden transition-shadow duration-300 ${
      isDark
        ? isExpanded ? 'bg-[#161925] border-accent/40 shadow-[0_0_0_1px_var(--accent),0_0_24px_rgba(99,102,241,0.12)]' : 'bg-[#161925] border-[#1f2335]'
        : isExpanded ? 'bg-white border-accent/40 shadow-[0_0_0_1px_var(--accent),0_4px_20px_rgba(99,102,241,0.10)] shadow-sm' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* ── Clickable header row ─────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => onToggle()}
        onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && onToggle()}
        className={`flex items-center gap-2 sm:gap-3 px-4 py-3.5 cursor-pointer select-none transition-colors ${
          isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
        }`}
      >
        <ChevronRight
          size={14}
          className={`flex-shrink-0 transition-transform duration-200 ${k.muted} ${isExpanded ? 'rotate-90' : ''}`}
        />

        {/* Left group: ID · status · products on line 1, date on line 2 */}
        <div className="w-[250px] flex-shrink-0 overflow-hidden">
          <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
            <p className={`text-sm font-black leading-none flex-shrink-0 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>
              #{order._id.slice(-6).toUpperCase()}
            </p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border flex-shrink-0 min-w-[62px] text-center ${
              isDark ? darkStatusClass : `${status.lightBg} ${status.text} ${status.border}`
            }`}>
              {label}
            </span>
            <span className={`hidden sm:inline text-[10px] font-medium px-2 py-0.5 rounded-md border flex-shrink-0 ${
              isDark ? 'bg-white/5 border-white/10 text-white/60' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              {orderItems.length} {orderItems.length !== 1 ? 'Products' : 'Product'}
            </span>
          </div>
          <p className={`text-[9px] mt-0.5 tabular-nums ${k.muted}`}>
            {new Date(order.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short' })} · {timeAgo(order.createdAt)}
          </p>
        </div>

        {/* Progress bar — flex-1 with right margin for breathing room before action buttons */}
        <div className="hidden sm:flex flex-col gap-0.5 flex-1 min-w-[60px] mr-3">
          <span className={`text-[9px] font-medium ${k.muted}`}>{progress}%</span>
          <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: progress === 100 ? '#22c55e' : 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Action column — fixed width, QR matches Paid height exactly */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
          <div className="flex items-center gap-1 w-[96px] justify-end flex-shrink-0" onClick={e => e.stopPropagation()}>
            {order.status === 'pending' && (
              <>
                <button
                  onClick={onSendQR}
                  disabled={isActing}
                  title={order.paymentQrSent ? 'Resend QR' : 'Send QR'}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 disabled:opacity-50 ${
                    order.paymentQrSent
                      ? (isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600')
                      : 'bg-amber-400 border-amber-400 text-amber-950 hover:bg-amber-500'
                  }`}
                >
                  <QrCode size={10} /> QR
                </button>
                <button
                  onClick={onMarkPaid}
                  disabled={isActing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'var(--accent-gradient)' }}
                >
                  <CheckCircle size={10} /> Paid
                </button>
              </>
            )}
            {order.status === 'shipped' && (
              <button
                onClick={onMarkDelivered}
                disabled={isActing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle size={10} /> Delivered
              </button>
            )}
            {order.status !== 'pending' && order.status !== 'shipped' && (() => {
              const pendingItems = orderItems
                .map(item => ({ productId: item.productId, name: item.name, variantLabel: item.variantLabel, qty: Math.max(0, item.qty - computeShippedQty(item.name, item.variantLabel) - computeInParcelQty(item.name, item.variantLabel)), price: item.price }))
                .filter(i => i.qty > 0);
              if (pendingItems.length === 0) return null;
              return (
                <button
                  onClick={() => onBoxItems(pendingItems)}
                  disabled={isActing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'var(--accent-gradient)' }}
                >
                  <Package size={10} /> Parcel
                </button>
              );
            })()}
          </div>

          {/* Price — fixed width, right-aligned */}
          <p className={`text-sm font-black w-[72px] text-right flex-shrink-0 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>
            ฿{fmt(order.soldTHB)}
          </p>

          {/* Pencil — rightmost, stops propagation so it doesn't toggle expand */}
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            title="Edit order items"
            aria-label="Edit order items"
            className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${isDark ? 'text-[#8b92ad] hover:text-accent hover:bg-white/10' : 'text-slate-400 hover:text-accent hover:bg-slate-100'}`}
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* ── Expanded body ───────────────────────────────────────────── */}
      {isExpanded && (
        <div className={`border-t ${divider} px-4 pt-3 pb-4 space-y-3`}>
          {/* Order address — read-only record of what customer submitted */}
          {orderAddr && (
            <div className={`flex items-start gap-2 p-2.5 rounded-xl border ${
              addrInList
                ? (isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200')
                : (isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200')
            }`}>
              <MapPin size={11} className={`flex-shrink-0 mt-0.5 ${addrInList ? k.muted : 'text-amber-500'}`} />
              <p className={`text-[11px] flex-1 leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{orderAddr}</p>
              {!addrInList && (
                <button
                  onClick={e => { e.stopPropagation(); onAddAddress(orderAddr); }}
                  className="text-[10px] font-medium px-2 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex-shrink-0 whitespace-nowrap"
                >
                  + Add to list
                </button>
              )}
              {addrInList && selectedAddress.trim() !== orderAddr && (
                <button
                  onClick={e => { e.stopPropagation(); onSelectOrderAddress(orderAddr); }}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex-shrink-0 whitespace-nowrap ${
                    isDark ? 'bg-white/8 border-white/15 text-white/60 hover:bg-accent hover:border-accent hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-accent hover:border-accent hover:text-white'
                  }`}
                >
                  Select
                </button>
              )}
            </div>
          )}

          {/* Item rows */}
          <div className={`rounded-xl overflow-hidden border ${divider}`}>
            {orderItems.map((item, idx) => {
              const shippedQty = computeShippedQty(item.name, item.variantLabel);
              const inParcelQty = computeInParcelQty(item.name, item.variantLabel);
              const pendingQty = Math.max(0, item.qty - shippedQty - inParcelQty);
              const product = products?.find(p => p._id === item.productId);
              const isLast = idx === orderItems.length - 1;

              return (
                <div key={idx} className={`flex items-center gap-3 px-3 py-2.5 ${
                  !isLast ? `border-b ${divider}` : ''
                } ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50/50'} transition-colors`}>
                  {/* Thumbnail */}
                  <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    {product?.imageUrl
                      ? <img src={product.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package size={14} className={k.muted} /></div>
                    }
                  </div>

                  {/* Name + variant */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-medium leading-snug truncate ${isDark ? 'text-white/90' : 'text-[#1a1d2e]'}`}>{item.name}</p>
                    {item.variantLabel && (() => {
                      const parts = item.variantLabel.split(' · ');
                      const optionNames = product?.options?.map(o => o.name) ?? [];
                      return (
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {parts.map((part, pi) => {
                            const optName = optionNames[pi]?.toLowerCase();
                            const isColor = optName === 'color';
                            const hex = isColor ? colorForSwatch(part) : null;
                            return (
                              <span key={pi} className={`flex items-center gap-1 text-[10px] font-medium ${k.muted}`}>
                                {hex && <span className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0 inline-block" style={{ backgroundColor: hex }} />}
                                {part}
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {shippedQty > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}>✓ {shippedQty} shipped</span>
                      )}
                      {inParcelQty > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>Boxed ×{inParcelQty}</span>
                      )}
                    </div>
                  </div>

                  {/* Pending → BoxControl (paid/partially_fulfilled only); shipped → no boxing */}
                  {pendingQty > 0 && order.status !== 'pending' && order.status !== 'shipped' ? (
                    <BoxControl
                      max={pendingQty}
                      isDark={isDark}
                      k={k}
                      isActing={isActing}
                      onBox={(qty) => {
                        onBoxItems([{ productId: item.productId, name: item.name, variantLabel: item.variantLabel, qty, price: item.price }]);
                      }}
                    />
                  ) : inParcelQty > 0 ? (
                    <button
                      onClick={e => { e.stopPropagation(); onUnboxItem(item.name); }}
                      disabled={isActing}
                      title="Remove from parcel"
                      aria-label="Remove from parcel"
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
                        isDark ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-orange-50 text-orange-500 hover:bg-orange-100 border border-orange-200'
                      }`}
                    >
                      <CornerUpLeft size={12} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Bottom action row */}
          {(() => {
            const allPending = orderItems
              .map(item => ({ productId: item.productId, name: item.name, variantLabel: item.variantLabel, qty: Math.max(0, item.qty - computeShippedQty(item.name, item.variantLabel) - computeInParcelQty(item.name, item.variantLabel)), price: item.price }))
              .filter(i => i.qty > 0);
            return (
              <div className="flex gap-2">
                {order.status === 'shipped' ? (
                  <button
                    onClick={onMarkDelivered}
                    disabled={isActing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle size={12} /> Mark Delivered
                  </button>
                ) : (
                  <>
                    {order.status !== 'pending' && order.status !== 'cancelled' && allPending.length > 0 && (
                      <button
                        onClick={() => onBoxItems(allPending)}
                        disabled={isActing}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold text-white transition-all active:scale-95 disabled:opacity-50 hover:opacity-90"
                        style={{ background: 'var(--accent-gradient)' }}
                      >
                        <Package size={12} /> Box {allPending.length} Pending
                      </button>
                    )}
                    {order.status !== 'cancelled' && (
                      <button
                        onClick={onCancel}
                        disabled={isActing}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Ban size={12} /> Cancel Order
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={onDelete}
                  disabled={isActing}
                  title="Permanently delete order"
                  aria-label="Permanently delete order"
                  className={`flex items-center justify-center px-3 py-2.5 rounded-xl text-[11px] border transition-all active:scale-95 disabled:opacity-50 ${
                    isDark
                      ? 'border-red-500/20 text-red-500/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40'
                      : 'border-red-200 text-red-300 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </article>
  );
}

// ── Parcel Fulfilment Container ────────────────────────────────────────────────
// Shows a pending fulfilment with editable items, ready to be shipped
type MergedFulfilmentItem = FulfilmentItem & { _fid: string; _orderId: string };

function buildMergedItems(fulfilments: Fulfilment[]): MergedFulfilmentItem[] {
  return fulfilments.flatMap(f =>
    (f.items || []).map(item => ({ ...item, _fid: f._id, _orderId: String(f.orderId) }))
  );
}

function ParcelFulfilmentContainer({
  fulfilments,
  selectedAddress,
  isDark,
  k,
  merchantSettings,
  products,
  onUpdateItem,
  onShip,
  onCancel,
}: {
  fulfilments: Fulfilment[];
  selectedAddress: string;
  isDark: boolean;
  k: typeof DK;
  merchantSettings?: any;
  products?: Product[];
  onUpdateItem: (fulfilmentId: string, orderId: string, items: FulfilmentItem[]) => Promise<void>;
  onShip: (courier: string, tracking: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [localItems, setLocalItems] = useState<MergedFulfilmentItem[]>(() => buildMergedItems(fulfilments));
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [shipping, setShipping] = useState(false);
  const [shipError, setShipError] = useState('');

  const totalItemCount = fulfilments.reduce((s, f) => s + (f.items?.length ?? 0), 0);
  useEffect(() => {
    setLocalItems(buildMergedItems(fulfilments));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItemCount, fulfilments.length]);

  const totalPrice = localItems.reduce((s, i) => s + (i.price * i.qty), 0);
  const multiOrder = fulfilments.length > 1;

  async function handleUpdateItem(idx: number, updates: Partial<FulfilmentItem>) {
    const meta = localItems[idx];
    const updated = localItems.map((item, i) => i === idx ? { ...item, ...updates } : item);
    setLocalItems(updated);
    const forFulfilment = updated.filter(i => i._fid === meta._fid).map(({ _fid, _orderId, ...rest }) => rest as FulfilmentItem);
    await onUpdateItem(meta._fid, meta._orderId, forFulfilment).catch(() => setLocalItems(buildMergedItems(fulfilments)));
  }

  async function handleRemoveItem(idx: number) {
    const meta = localItems[idx];
    const updated = localItems.filter((_, i) => i !== idx);
    setLocalItems(updated);
    const forFulfilment = updated.filter(i => i._fid === meta._fid).map(({ _fid, _orderId, ...rest }) => rest as FulfilmentItem);
    await onUpdateItem(meta._fid, meta._orderId, forFulfilment).catch(() => setLocalItems(buildMergedItems(fulfilments)));
  }

  async function handleShipAndPrint() {
    if (!courier || !tracking) { setShipError('Courier and tracking number are required'); return; }
    setShipError('');
    setShipping(true);
    await onShip(courier, tracking);
    setShipping(false);
    window.print();
  }

  const tableBorder = isDark ? 'border-[#2a3050]' : 'border-slate-200';

  return (
    <article className={`rounded-2xl border p-5 space-y-4 transition-all ${
      isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200 shadow-md'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-accent" />
          </div>
          <div>
            <p className={`text-sm font-black ${k.text}`}>
              Pending Parcel
              {multiOrder && <span className={`ml-2 text-[10px] font-medium ${k.muted}`}>· {fulfilments.length} orders</span>}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          aria-label="Remove parcel"
          className={`p-1.5 rounded-lg transition-colors ${
            isDark
              ? 'text-red-500/40 hover:text-red-400 hover:bg-red-500/10'
              : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
          }`}
        >
          <X size={16} />
        </button>
      </div>

      {/* Items — compact table */}
      <div className={`rounded-xl overflow-hidden border ${tableBorder}`}>
        <table className="w-full">
          <thead>
            <tr className={`text-left border-b ${tableBorder} ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
              <th className={`py-2 px-3 text-[10px] font-medium ${k.muted}`}>Product</th>
              <th className={`py-2 px-3 text-[10px] font-medium text-center w-24 ${k.muted}`}>Qty</th>
              <th className={`py-2 px-3 text-[10px] font-medium text-right w-24 ${k.muted}`}>Unit</th>
              <th className={`py-2 px-3 text-[10px] font-medium text-right w-20 ${k.muted}`}>Total</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {localItems.map((item, idx) => {
              const prevItem = idx > 0 ? localItems[idx - 1] : null;
              const showGroupHeader = multiOrder && (!prevItem || prevItem._fid !== item._fid);
              return (
                <React.Fragment key={`${item._fid}-${idx}`}>
                  {showGroupHeader && (
                    <tr className={isDark ? 'bg-[#1a1d2e]/70' : 'bg-slate-50'}>
                      <td colSpan={5} className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${k.muted}`}>
                        Order #{item._orderId.slice(-6).toUpperCase()}
                      </td>
                    </tr>
                  )}
                  <ParcelItemRow
                    item={item}
                    isDark={isDark}
                    k={k}
                    products={products}
                    onUpdate={(updates) => handleUpdateItem(idx, updates)}
                    onRemove={() => handleRemoveItem(idx)}
                  />
                </React.Fragment>
              );
            })}
            {localItems.length === 0 && (
              <tr>
                <td colSpan={5} className={`py-4 text-center text-[11px] ${k.muted}`}>No items yet</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className={`border-t ${tableBorder} ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
              <td colSpan={3} className={`py-2.5 px-3 text-right text-[11px] font-medium ${k.muted}`}>Grand Total</td>
              <td className={`py-2.5 px-3 text-right text-[13px] font-black ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>
                ฿{fmt(totalPrice)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Delivery address */}
      {selectedAddress && (
        <div className={`flex items-start gap-2 p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <MapPin size={12} className={`${k.muted} mt-0.5 flex-shrink-0`} />
          <p className={`text-[11px] ${isDark ? 'text-white/60' : 'text-slate-600'}`}>{selectedAddress}</p>
        </div>
      )}

      {/* Courier + Tracking + Ship */}
      <div className={`rounded-xl p-4 space-y-3 border ${isDark ? 'bg-[#1a1d2e] border-[#2a3050]' : 'bg-slate-50 border-slate-200'}`}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-[10px] font-medium mb-1.5 ${k.muted}`}>Courier</label>
            <select
              value={courier}
              onChange={e => setCourier(e.target.value)}
              className={`w-full text-[12px] rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`}
            >
              <option value="">Choose courier</option>
              {(merchantSettings?.shippingCompanies || []).map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-[10px] font-medium mb-1.5 ${k.muted}`}>Tracking</label>
            <input
              placeholder="e.g. TH12345678"
              value={tracking}
              onChange={e => setTracking(e.target.value)}
              className={`w-full text-[12px] rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`}
            />
          </div>
        </div>

        {shipError && <p className="text-[11px] font-medium text-red-500">{shipError}</p>}

        <button
          onClick={handleShipAndPrint}
          disabled={shipping || localItems.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-lg shadow-accent/20"
          style={{ background: 'var(--accent-gradient)' }}
        >
          <Truck size={14} /> {shipping ? 'Shipping...' : 'Ship Parcel & Print Label'}
        </button>
      </div>
    </article>
  );
}

// ── Parcel Item Row ────────────────────────────────────────────────────────────
// Editable table row for an item within a parcel; name is locked when productId is set
function ParcelItemRow({
  item,
  isDark,
  k,
  onUpdate,
  onRemove,
  products,
}: {
  item: FulfilmentItem;
  isDark: boolean;
  k: typeof DK;
  onUpdate: (updates: Partial<FulfilmentItem>) => void;
  onRemove: () => void;
  products?: Product[];
}) {
  const [qty, setQty] = useState(item.qty);

  useEffect(() => {
    if (qty === item.qty) return;
    const timer = setTimeout(() => onUpdate({ qty }), 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty]);

  const product = products?.find(p => p._id === item.productId);
  const rowBorder = isDark ? 'border-[#2a3050]' : 'border-slate-200';

  return (
    <tr className={`border-b last:border-0 ${rowBorder} ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50/60'} transition-colors`}>
      {/* Thumbnail + Name */}
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            {product?.imageUrl
              ? <img src={product.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Package size={12} className={k.muted} /></div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[12px] font-medium truncate ${isDark ? 'text-white/90' : 'text-[#1a1d2e]'}`}>{item.name}</p>
            {item.variantLabel && (
              <p className={`text-[10px] ${k.muted} mt-0.5`}>{item.variantLabel}</p>
            )}
          </div>
        </div>
      </td>
      {/* Qty stepper */}
      <td className="py-2 px-3">
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease qty"
            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${k.border} ${k.hover}`}>
            <Minus size={9} />
          </button>
          <span className={`w-6 text-center text-[12px] font-bold ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{qty}</span>
          <button onClick={() => setQty(qty + 1)} aria-label="Increase qty"
            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${k.border} ${k.hover}`}>
            <Plus size={9} />
          </button>
        </div>
      </td>
      {/* Unit price — read-only */}
      <td className={`py-2 px-3 text-right text-[12px] ${k.muted}`}>
        ฿{fmt(item.price)}
      </td>
      {/* Line total */}
      <td className={`py-2 px-3 text-right text-[12px] font-bold whitespace-nowrap ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>
        ฿{fmt(item.price * qty)}
      </td>
      {/* Remove */}
      <td className="py-2 px-2">
        <button onClick={onRemove} aria-label={`Remove ${item.name}`}
          className={`p-1 rounded-lg transition-colors ${isDark ? 'text-red-500/40 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  );
}

// ── Seed Button ───────────────────────────────────────────────────────────────
function SeedButton({ isDark, k, onDone }: { isDark: boolean; k: typeof DK; onDone?: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function seed() {
    setState('loading');
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      if (res.ok) { setState('done'); onDone?.(); }
      else setState('error');
    } catch { setState('error'); }
  }

  if (state === 'done') return (
    <p className="text-xs text-accent font-bold text-center">Seeded — customers will appear shortly</p>
  );

  return (
    <button
      onClick={seed}
      disabled={state === 'loading'}
      className={`text-xs px-4 py-2 rounded-xl border font-bold transition-all disabled:opacity-50 ${
        isDark ? 'border-[#2a3050] text-[#8b92ad] hover:border-accent hover:text-accent' : 'border-[#e2e5ef] text-[#8b92ad] hover:border-accent hover:text-accent'
      }`}
    >
      {state === 'loading' ? 'Seeding...' : state === 'error' ? 'Failed — try again' : '+ Add mock customers'}
    </button>
  );
}

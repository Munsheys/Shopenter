'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageCircle, ShoppingCart, Send, Search, X, Plus, Minus, Trash2,
  Package, CheckCircle, QrCode, ChevronRight, ChevronLeft, MapPin,
  Clock, Printer, History, ChevronDown, AlertTriangle, Pencil, Check, Ban,
  CornerUpLeft, Truck, Coins,
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
type Order = {
  _id: string; userId: string; platform?: 'line' | 'instagram'; displayName: string; product: string;
  quantity: number; items: OrderItem[]; soldTHB: number; costKRW: number;
  costTHB: number; profit: number; shipCostTHB: number;
  costCurrency?: string; soldCurrency?: string;
  tracking?: string; courier?: string; address?: string;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  paymentQrSent: boolean; createdAt: string;
  rateUsed?: number;
  statusBeforeParcel?: string;
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

export default function CustomersView({ theme, onLimitHit, jumpToUserId, onJumpConsumed, jumpToOrderId, onJumpOrderConsumed }: { theme: string; onLimitHit?: (feature: string, limit?: number, current?: number) => void; jumpToUserId?: string | null; onJumpConsumed?: () => void; jumpToOrderId?: string | null; onJumpOrderConsumed?: () => void }) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';
  const k = isDark ? DK : isLite ? LITK : LK;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [editingOrder, setEditingOrder] = useState<{ id: string; name: string; sold: string; qty: number } | null>(null);
  const [listWidth, setListWidth] = useState(300);
  const [chatWidth, setChatWidth] = useState(280);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'line' | 'instagram' | 'telegram'>('all');
  const [findPlatformFilter, setFindPlatformFilter] = useState<'all' | 'line' | 'instagram' | 'telegram'>('all');

  const [qoMode, setQoMode] = useState<'existing' | 'new'>('existing');
  const [qoSearch, setQoSearch] = useState('');
  const [qoSelected, setQoSelected] = useState<Product | null>(null);
  const [qoVariantSel, setQoVariantSel] = useState<Record<string, string>>({});
  const [qoNewProduct, setQoNewProduct] = useState<Product | null>(null);
  const [qoQuickName, setQoQuickName] = useState('');
  const [qoQuickPrice, setQoQuickPrice] = useState('');
  const [qoQuickOpts, setQoQuickOpts] = useState<{ name: string; value: string }[]>([]);
  const [qoQuickSaving, setQoQuickSaving] = useState(false);
  const [qoPrice, setQoPrice] = useState('');
  const [qoUnitPrice, setQoUnitPrice] = useState(0);
  const [qoCostPrice, setQoCostPrice] = useState('');
  const [qoCostCurrency, setQoCostCurrency] = useState('KRW');
  const [qoQty, setQoQty] = useState(1);
  const [qoSubmitting, setQoSubmitting] = useState(false);

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

  const [drawerWidth, setDrawerWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [chatButtonY, setChatButtonY] = useState(200);
  const [isDraggingButton, setIsDraggingButton] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedRef = useRef<Customer | null>(null);
  selectedRef.current = selectedCustomer;
  const resizeRef = useRef<number | null>(null);
  const dragButtonRef = useRef<{ startY: number; startPos: number }| null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const evsRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [evsReconnecting, setEvsReconnecting] = useState(false);

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
      onJumpConsumed?.();
    }
  // selectCustomer and onJumpConsumed are stable references (useCallback / prop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToUserId, customers, selectCustomer, onJumpConsumed]);

  // Highlight a specific order card when jumping from another view
  useEffect(() => {
    if (!jumpToOrderId) return;
    setHighlightedOrderId(jumpToOrderId);
    onJumpOrderConsumed?.();
    const timer = setTimeout(() => setHighlightedOrderId(null), 3000);
    return () => clearTimeout(timer);
  }, [jumpToOrderId]);

  const refreshOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setAllOrders(data);
    }
  }, []);

  useEffect(() => { refreshOrders(); }, [refreshOrders]);

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
    setQoMode('existing'); setQoNewProduct(null); setQoSelected(null); setQoSearch(''); setQoVariantSel({});
    setQoPrice(''); setQoUnitPrice(0); setQoCostPrice(''); setQoQty(1);
    setQoQuickName(''); setQoQuickPrice(''); setQoQuickOpts(defaultOptNames);
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

  async function patchOrder(id: string, patch: object) {
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
    fetch(`/api/orders/${id}`, { method: 'DELETE' }).catch(() => refreshOrders());
  }

  async function sendQR(id: string) {
    setActingOrderIds(prev => new Set(prev).add(id));
    try {
      await fetch(`/api/orders/${id}/send-qr`, { method: 'POST' });
      setAllOrders(prev => prev.map(o => o._id === id ? { ...o, paymentQrSent: true } : o));
      if (selectedCustomer) loadMessages(selectedCustomer.userId);
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
    if (!selectedCustomer || qoSubmitting) return;
    const product = qoMode === 'existing' ? qoSelected : qoNewProduct;
    if (!product) return;
    const total = parseFloat(qoPrice) || product.price * qoQty;
    const pricePerUnit = qoQty > 0 ? total / qoQty : total;
    const costAmount = parseFloat(qoCostPrice) || 0;

    // Build variant label for order name
    const variantLabel = qoMode === 'existing' && Object.keys(qoVariantSel).length > 0
      ? Object.values(qoVariantSel).filter(Boolean).join(' · ')
      : qoMode === 'new' && qoQuickOpts.some(o => o.value.trim())
        ? qoQuickOpts.filter(o => o.value.trim()).map(o => o.value.trim()).join(' · ')
        : '';
    const productLabel = variantLabel ? `${product.name} (${variantLabel})` : product.name;

    setQoSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCustomer.userId,
          displayName: selectedCustomer.displayName,
          product: `${qoQty > 1 ? `${qoQty}x ` : ''}${productLabel}`,
          quantity: qoQty,
          items: [{ productId: product._id, name: productLabel, qty: qoQty, price: pricePerUnit }],
          soldTHB: total,
          costKRW: costAmount,
          costCurrency: qoCostCurrency,
          status: 'pending',
        }),
      });
      if (res.ok) {
        const order = await res.json();
        setAllOrders(prev => [order, ...prev]);
        setShowModal(false);
        setQoPrice(''); setQoUnitPrice(0); setQoCostPrice('');
        setQoQty(1); setQoSelected(null); setQoSearch(''); setQoVariantSel({});
        setQoNewProduct(null); setQoMode('existing');
        setQoQuickName(''); setQoQuickPrice(''); setQoQuickOpts(defaultOptNames);
        setQoCostCurrency(merchantSettings?.importCurrency || 'KRW');
      }
    } finally { setQoSubmitting(false); }
  }

  async function handleQuickAdd() {
    if (!qoQuickName.trim() || qoQuickSaving) return;
    setQoQuickSaving(true);
    const filledOpts = qoQuickOpts.filter(o => o.name.trim() && o.value.trim());
    const price = parseFloat(qoQuickPrice) || 0;
    const combination: Record<string, string> = {};
    filledOpts.forEach(o => { combination[o.name] = o.value; });
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: qoQuickName.trim(),
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
        setQoNewProduct(created);
        setQoPrice(String(price || 0));
      }
    } finally { setQoQuickSaving(false); }
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
      onConfirm: () => patchOrder(id, { status: 'cancelled' })
    });
  }

  async function issueCreditsAndCancel(orderId: string, amount: number) {
    await patchOrder(orderId, { status: 'cancelled' });
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
  const activeOrders = customerOrders.filter(o => ['pending', 'paid'].includes(o.status));
  const pendingOrders = activeOrders.filter(o => o.status === 'pending');
  const selectedTotal = activeOrders.filter(o => selectedOrderIds.has(o._id)).reduce((s, o) => s + (o.soldTHB || 0), 0);
  const allPendingSelected = pendingOrders.length > 0 && pendingOrders.every(o => selectedOrderIds.has(o._id));
  // Sync editable total whenever selection changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setBatchEditTotal(String(selectedTotal)); }, [selectedTotal, selectedOrderIds.size]);
  const parcelOrders = customerOrders.filter(o => o.status === 'preparing');
  const inTransitOrders = customerOrders.filter(o => o.status === 'shipped');
  const historyOrders = customerOrders.filter(o => ['delivered', 'cancelled'].includes(o.status));
  // Keep combined list for places that still need all post-active orders
  const shippedOrders = customerOrders.filter(o => ['shipped', 'delivered', 'cancelled'].includes(o.status));

  const totalSpent = customerOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.soldTHB || 0), 0);
  // Realized profit — delivered orders only (shipped orders are in-transit and not yet realized)
  const totalProfit = customerOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.profit || 0), 0);

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
              <span className={`font-black text-xs tracking-wide ${k.text}`}>
                CUSTOMERS
                {totalUnread > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
                )}
              </span>
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
                <div className="flex flex-col items-center justify-center h-full px-4 gap-3 py-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-[#f8f9fc]'}`}>
                    <MessageCircle size={22} className={`${k.muted} opacity-40`} />
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-semibold ${k.text}`}>No customers yet</p>
                    <p className={`text-[10px] mt-0.5 ${k.muted}`}>They appear when they message your LINE OA</p>
                  </div>
                  <SeedButton isDark={isDark} k={k} onDone={refreshOrders} />
                </div>
              ) : visibleCustomers.length === 0 ? (
                <div className={`text-center px-4 py-8 text-xs ${k.muted}`}>No results for "{customerSearch}"</div>
              ) : (
                visibleCustomers.map(c => {
                  const isSelected = selectedCustomer?._id === c._id;
                  const ac = avatarColor(c.displayName);
                  const isBlocked = c.status === 'blocked';
                  return (
                    <button
                      key={c._id}
                      onClick={() => selectCustomer(c)}
                      aria-pressed={isSelected}
                      aria-label={`Customer ${c.displayName}${isBlocked ? ', blocked' : ''}${c.unreadCount > 0 ? `, ${c.unreadCount} unread` : ''}`}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all border-l-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                        isSelected
                          ? isDark ? 'bg-accent/10 border-l-accent' : 'bg-accent/5 border-l-accent'
                          : `border-l-transparent ${k.hover}`
                      } ${isBlocked ? 'opacity-50' : ''}`}
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
              onClick={() => setListOpen(true)}
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
              <MessageCircle size={28} className={`${k.muted} opacity-30`} />
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
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto relative">
              <div className="p-10 space-y-10 max-w-5xl mx-auto">

                {/* Active Orders */}
                {activeOrders.length > 0 && (
                  <section aria-label="Active orders">
                    <div className="flex items-center justify-between">
                      <SectionLabel>Active Orders</SectionLabel>
                      {pendingOrders.length > 1 && (
                        <button
                          onClick={() => setSelectedOrderIds(allPendingSelected ? new Set() : new Set(pendingOrders.map(o => o._id)))}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                            allPendingSelected
                              ? 'text-accent bg-accent/10'
                              : `${k.muted} hover:text-accent`
                          }`}
                        >
                          {allPendingSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {activeOrders.map(order => (
                        <div key={order._id} className={highlightedOrderId === order._id ? 'ring-2 ring-accent shadow-lg shadow-accent/20 rounded-2xl' : ''}>
                          <ActiveOrderCard order={order} isDark={isDark} k={k}
                            onDelete={() => confirmDeleteOrder(order._id)}
                            onCancel={() => confirmCancelOrder(order._id)}
                            onEdit={() => setEditingOrder({ id: order._id, name: order.product, sold: String(order.soldTHB || ''), qty: order.quantity || 1 })}
                            onSendQR={() => sendQR(order._id)}
                            onMarkPaid={() => markPaid(order._id)}
                            onMoveToParcel={() => patchOrder(order._id, { status: 'preparing', statusBeforeParcel: order.status })}
                            selected={selectedOrderIds.has(order._id)}
                            onToggleSelect={order.status === 'pending' ? () => toggleOrderSelect(order._id) : undefined}
                            isActing={actingOrderIds.has(order._id)} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Parcel Fulfillment */}
                {parcelOrders.length > 0 && (
                  <section aria-label="Parcels awaiting shipment">
                    <div className={`space-y-4 ${parcelOrders.some(o => o._id === highlightedOrderId) ? 'ring-2 ring-accent shadow-lg shadow-accent/20 rounded-[32px]' : ''}`}>
                      <ParcelContainer
                        orders={parcelOrders}
                        isDark={isDark}
                        k={k}
                        merchantSettings={merchantSettings}
                        onPatch={(id, patch) => patchOrder(id, patch)}
                        onCancelParcel={(id) => patchOrder(id, { status: 'paid' })}
                        onShip={async (tracking, courier) => {
                          const addr = selectedCustomer?.addresses[selectedAddressIdx] || '';
                          for (const o of parcelOrders) {
                            await patchOrder(o._id, { tracking, courier, address: addr, status: 'shipped' });
                          }
                        }}
                        onAddItem={() => setShowModal(true)}
                        onEditOrder={(order) => setEditingOrder({ id: order._id, name: order.product, sold: String(order.soldTHB || ''), qty: order.quantity || 1 })}
                      />
                    </div>
                  </section>
                )}

                {/* Delivery Addresses */}
                <section aria-label="Delivery addresses">
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

                {/* In Transit */}
                {inTransitOrders.length > 0 && (
                  <section aria-label="Orders in transit">
                    <SectionLabel>In Transit</SectionLabel>
                    <div className={`${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-slate-200'} border rounded-3xl overflow-hidden mt-3`}>
                      {inTransitOrders.map((order, i) => (
                        <HistoryRow key={order._id} order={order} isDark={isDark} k={k}
                          isLast={i === inTransitOrders.length - 1}
                          onPatch={(patch) => patchOrder(order._id, patch)}
                          onDelete={() => confirmDeleteOrder(order._id)}
                          isHighlighted={highlightedOrderId === order._id}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Order History */}
                <section aria-label="Order history">
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
                        <History size={18} className={`${k.muted} opacity-40`} />
                      </div>
                      <p className={`text-xs font-semibold ${k.text}`}>No completed orders yet</p>
                      <p className={`text-[10px] mt-0.5 ${k.muted}`}>Delivered and cancelled orders will appear here</p>
                    </div>
                  ) : (
                    <div className={`${k.surface} border ${k.border} rounded-3xl overflow-hidden`}>
                      {historyOrders.map((order, i) => (
                        <HistoryRow key={order._id} order={order} isDark={isDark} k={k}
                          isLast={i === historyOrders.length - 1}
                          onPatch={(patch) => patchOrder(order._id, patch)}
                          onDelete={() => confirmDeleteOrder(order._id)}
                        />
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
              {messages.map(msg => {
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
                      <div key={msg._id} className={`flex items-end gap-1.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
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
              onClick={() => setChatDrawerOpen(true)}
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

      {/* ── Quick Order Modal ── */}
      {showModal && selectedCustomer && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Quick order"
          onClick={(e) => { if (e.target === e.currentTarget) closeQuickOrder(); }}
        >
          <div className={`${k.surface} rounded-3xl shadow-2xl w-full max-w-md border ${k.border}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border}`}>
              <div>
                <h3 className={`font-black text-sm ${k.text}`}>Quick Chat Order</h3>
                <p className={`text-[10px] mt-0.5 ${k.muted}`}>{selectedCustomer.displayName}</p>
              </div>
              <button onClick={closeQuickOrder} aria-label="Close" className={`p-1.5 rounded-xl ${k.muted} ${k.hover} transition-colors`}>
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {(['existing', 'new'] as const).map(m => (
                  <button key={m} onClick={() => setQoMode(m)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${qoMode === m ? 'text-white shadow-sm' : isDark ? 'bg-white/5 text-[#8b92ad] hover:bg-white/10' : 'bg-[#f8f9fc] text-[#8b92ad] hover:bg-[#f0f1f5]'}`}
                    style={qoMode === m ? { background: 'var(--accent-gradient)' } : undefined}>
                    {m === 'existing' ? 'Existing Product' : 'New Product'}
                  </button>
                ))}
              </div>

              {qoMode === 'existing' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${k.muted}`} />
                    <input value={qoSearch} onChange={e => setQoSearch(e.target.value)} placeholder="Search products..."
                      className={`w-full text-sm rounded-xl pl-8 pr-3 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`} />
                  </div>
                  <div className={`max-h-40 overflow-y-auto rounded-2xl border ${k.border} overflow-hidden`}>
                    {filteredProducts.slice(0, 15).map(p => (
                      <button key={p._id} onClick={() => {
                        setQoSelected(p);
                        setQoVariantSel({});
                        setQoUnitPrice(p.price);
                        setQoPrice(String(p.price * qoQty));
                        // Auto-fill cost from phantom/first variant
                        const baseCost = p.variants?.find(v => !v.combination || Object.keys(v.combination).length === 0)?.cost ?? p.variants?.[0]?.cost;
                        if (baseCost != null) setQoCostPrice(String(baseCost));
                      }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          qoSelected?._id === p._id ? 'text-white' : `${k.hover} ${k.text}`
                        }`}
                        style={qoSelected?._id === p._id ? { background: 'var(--accent-gradient)' } : undefined}>
                        <span className="truncate">{p.name}</span>
                        <span className="ml-2 flex-shrink-0 font-bold">฿{p.price.toLocaleString()}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <p className={`text-xs text-center py-4 ${k.muted}`}>No products found</p>}
                  </div>

                  {/* Variant picker for selected product */}
                  {qoSelected && qoSelected.options && qoSelected.options.length > 0 && (
                    <div className={`rounded-xl border p-3 space-y-2 ${k.border} ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${k.muted}`}>Variant</p>
                      {qoSelected.options.map(opt => (
                        <div key={opt.name} className="space-y-1">
                          <p className={`text-[10px] font-semibold ${k.muted}`}>{opt.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {opt.values.map(v => {
                              const sel = qoVariantSel[opt.name] === v;
                              return (
                                <button key={v} type="button" onClick={() => {
                                  const newSel = { ...qoVariantSel, [opt.name]: v };
                                  setQoVariantSel(newSel);
                                  // Update price/cost from matching variant
                                  const match = qoSelected.variants?.find(vr =>
                                    Object.entries(newSel).every(([k2, val]) => vr.combination?.[k2] === val)
                                  );
                                  if (match?.price != null) { setQoUnitPrice(match.price); setQoPrice(String(match.price * qoQty)); }
                                  if (match?.cost != null) setQoCostPrice(String(match.cost));
                                }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${sel ? 'text-white border-transparent' : `${k.border} ${k.muted} ${k.hover}`}`}
                                  style={sel ? { background: 'var(--accent-gradient)' } : undefined}
                                >{v}</button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Inline quick-add form ── */
                <div className="space-y-3">
                  {!qoNewProduct ? (
                    <div className={`rounded-xl border p-3 space-y-3 ${k.border}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${k.muted}`}>Quick-add product</p>

                      <input value={qoQuickName} onChange={e => setQoQuickName(e.target.value)}
                        placeholder="Product name *"
                        className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all font-semibold ${k.input}`} />

                      <input type="number" value={qoQuickPrice} onChange={e => setQoQuickPrice(e.target.value)}
                        placeholder="Price (optional — fill below if negotiating)"
                        className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`} />

                      <div className="space-y-2">
                        <p className={`text-[10px] font-semibold ${k.muted}`}>Variant options for this order</p>
                        {qoQuickOpts.map((opt, i) => (
                          <div key={i} className="flex gap-2">
                            <input value={opt.name} onChange={e => { const n = [...qoQuickOpts]; n[i] = { ...n[i], name: e.target.value }; setQoQuickOpts(n); }}
                              placeholder="Option (e.g. Color)"
                              className={`w-24 text-xs rounded-lg px-2 py-2 border outline-none focus:border-accent ${k.input}`} />
                            <input value={opt.value} onChange={e => { const n = [...qoQuickOpts]; n[i] = { ...n[i], value: e.target.value }; setQoQuickOpts(n); }}
                              placeholder="Value (e.g. Red)"
                              className={`flex-1 text-xs rounded-lg px-2 py-2 border outline-none focus:border-accent ${k.input}`} />
                            <button type="button" onClick={() => setQoQuickOpts(qoQuickOpts.filter((_, j) => j !== i))}
                              className={`px-2 rounded-lg text-red-400 hover:bg-red-500/10 ${k.border} border transition-colors`}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setQoQuickOpts([...qoQuickOpts, { name: '', value: '' }])}
                          className={`text-[10px] font-bold text-accent hover:underline flex items-center gap-1`}>
                          <Plus size={10} /> Add option
                        </button>
                      </div>

                      <button
                        disabled={!qoQuickName.trim() || qoQuickSaving}
                        onClick={handleQuickAdd}
                        className="w-full py-2 rounded-xl text-xs font-black text-white disabled:opacity-40 transition-all active:scale-95"
                        style={{ background: 'var(--accent-gradient)' }}
                      >
                        {qoQuickSaving ? 'Adding...' : 'Quick Add Product →'}
                      </button>
                      <p className={`text-[9px] ${k.muted} text-center`}>Product will be flagged as incomplete — add full details later in the catalog.</p>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${k.border} ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${k.text}`}>{qoNewProduct.name}</p>
                        {qoQuickOpts.filter(o => o.value.trim()).length > 0 && (
                          <p className={`text-[10px] ${k.muted}`}>{qoQuickOpts.filter(o => o.value.trim()).map(o => `${o.name}: ${o.value}`).join(', ')}</p>
                        )}
                      </div>
                      <button
                        onClick={() => { setQoNewProduct(null); setQoQuickName(''); setQoQuickPrice(''); setQoQuickOpts(defaultOptNames); }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${k.border} ${k.muted} ${k.hover} transition-colors`}
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>
                    Total ({merchantSettings?.localCurrency || 'THB'})
                  </label>
                  <input type="number" value={qoPrice} onChange={e => setQoPrice(e.target.value)} placeholder="0"
                    className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`} />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Qty</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { const n = Math.max(1, qoQty - 1); setQoQty(n); if (qoUnitPrice) setQoPrice(String(qoUnitPrice * n)); }}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${k.border} ${k.hover} ${k.text}`}><Minus size={12} /></button>
                    <span className={`w-8 text-center text-sm font-black ${k.text}`}>{qoQty}</span>
                    <button onClick={() => { const n = qoQty + 1; setQoQty(n); if (qoUnitPrice) setQoPrice(String(qoUnitPrice * n)); }}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${k.border} ${k.hover} ${k.text}`}><Plus size={12} /></button>
                  </div>
                </div>
              </div>

              <button
                disabled={qoSubmitting || (qoMode === 'existing' ? !qoSelected : !qoNewProduct)}
                onClick={submitQuickOrder}
                className="w-full hover:opacity-90 disabled:opacity-40 text-white rounded-2xl py-3 font-black text-sm shadow-sm transition-all active:scale-95"
                style={{ background: 'var(--accent-gradient)' }}
              >
                {qoSubmitting ? 'Creating...' : 'Add Order'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Find Customer Modal */}
      {showFindCustomerModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Find customer"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === 'Escape') { setShowFindCustomerModal(false); setFindCustomerSearch(''); } }}
            className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${isDark ? 'bg-[#161925]' : 'bg-white'}`}
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
                    <MessageCircle size={20} className={`${k.muted} opacity-40`} />
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

      {/* ── Floating order edit popup ── */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setEditingOrder(null); }}>
          <div className={`w-full max-w-xs rounded-2xl border shadow-2xl p-4 space-y-3 ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#8b92ad]' : 'text-[#8b92ad]'}`}>Edit Order</p>
              <button onClick={() => setEditingOrder(null)} className={`p-1 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:bg-white/10' : 'text-[#8b92ad] hover:bg-black/5'}`}><X size={14} /></button>
            </div>
            <input
              value={editingOrder.name}
              onChange={e => setEditingOrder(v => v && { ...v, name: e.target.value })}
              placeholder="Product name"
              className={`w-full text-sm rounded-xl px-3 py-2 border outline-none focus:border-accent transition-all ${isDark ? 'bg-[#1f2335] border-[#2a3050] text-white' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]'}`}
            />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#8b92ad]' : 'text-[#8b92ad]'}`}>Total ({merchantSettings?.localCurrency || 'THB'})</label>
                <input type="number" value={editingOrder.sold}
                  onChange={e => setEditingOrder(v => v && { ...v, sold: e.target.value })}
                  className={`w-full text-sm font-black rounded-xl px-3 py-2 border outline-none focus:border-accent transition-all ${isDark ? 'bg-[#1f2335] border-[#2a3050] text-white' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]'}`}
                />
              </div>
              <div className="w-24">
                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-[#8b92ad]' : 'text-[#8b92ad]'}`}>Qty</label>
                <NumberStepper value={editingOrder.qty} onChange={v => setEditingOrder(e => e && { ...e, qty: v })} min={1} step={1} isDark={isDark} size="sm" />
              </div>
            </div>
            <button
              onClick={() => {
                const newSold = parseFloat(editingOrder.sold) || 0;
                const orig = customerOrders.find(o => o._id === editingOrder.id);
                const costTHB = (orig?.costTHB) || 0;
                patchOrder(editingOrder.id, {
                  product: editingOrder.name,
                  quantity: editingOrder.qty,
                  soldTHB: newSold,
                  profit: newSold - costTHB - ((orig?.shipCostTHB) || 0),
                });
                setEditingOrder(null);
              }}
              className="w-full py-2 rounded-xl text-xs font-black text-white hover:opacity-90 transition-all active:scale-95"
              style={{ background: 'var(--accent-gradient)' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* ── Floating batch selection toolbar ── */}
      {selectedOrderIds.size > 0 && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-2xl w-fit max-w-[90vw] ${isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'}`}>
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

      {/* Cancel + Credit Modal */}
      {cancelCreditModal?.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setCancelCreditModal(null); }}
        >
          <div className={`w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}>
            <div className="p-8">
              <div className="w-16 h-16 rounded-[24px] flex items-center justify-center mx-auto mb-5 bg-amber-500/10 text-amber-500">
                <Coins size={30} />
              </div>
              <h3 className={`text-xl font-black text-center mb-1 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>Handle Refund?</h3>
              <p className={`text-xs text-center mb-6 ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>
                This order was paid (฿{fmt(cancelCreditModal.amount)}). Choose how to handle the refund.
              </p>

              <div className="space-y-3 mb-4">
                {/* Option 1 — manual refund */}
                <button
                  onClick={() => { patchOrder(cancelCreditModal.orderId, { status: 'cancelled' }); setCancelCreditModal(null); }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all hover:border-accent/40 active:scale-[0.98] ${isDark ? 'border-[#2a3050] hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className={`text-xs font-black mb-0.5 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>↩ Refund Manually</div>
                  <div className={`text-[10px] ${isDark ? 'text-[#8b92ad]' : 'text-slate-400'}`}>Cancel the order. Handle the money return outside the system.</div>
                </button>

                {/* Option 2 — issue shop credits */}
                <button
                  onClick={() => issueCreditsAndCancel(cancelCreditModal.orderId, cancelCreditModal.amount)}
                  className="w-full p-4 rounded-2xl border border-amber-200 bg-amber-50 text-left transition-all hover:bg-amber-100 active:scale-[0.98]"
                >
                  <div className="text-xs font-black text-amber-700 flex items-center gap-2 mb-0.5">
                    <Coins size={13} /> Issue ฿{fmt(cancelCreditModal.amount)} Shop Credits
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!config.open) return null;
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}>
        <div className="p-10 text-center">
          <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-8 ${config.danger ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            <AlertTriangle size={36} />
          </div>
          <h3 className={`text-2xl font-black mb-4 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{config.title}</h3>
          <p className={`text-sm leading-relaxed mb-10 ${k.muted}`}>{config.message}</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { config.onConfirm(); onClose(); }}
              className={`w-full py-4.5 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl ${
                config.danger 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                  : 'bg-emerald-500 hover:opacity-90 text-white shadow-emerald-500/20'
              }`}
            >
              Confirm Action
            </button>
            <button
              onClick={onClose}
              className={`w-full py-4.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
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

// ── Active Order Card ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, any> = {
  pending:   { bg: 'bg-amber-500',   text: 'text-amber-600',   border: 'border-amber-200',   lightBg: 'bg-amber-50'   },
  paid:      { bg: 'bg-sky-500',     text: 'text-sky-600',     border: 'border-sky-200',     lightBg: 'bg-sky-50'     },
  preparing: { bg: 'bg-indigo-500',  text: 'text-indigo-600',  border: 'border-indigo-200',  lightBg: 'bg-indigo-50'  },
  shipped:   { bg: 'bg-violet-500',  text: 'text-violet-600',  border: 'border-violet-200',  lightBg: 'bg-violet-50'  },
  delivered: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', lightBg: 'bg-emerald-50' },
  cancelled: { bg: 'bg-rose-500',    text: 'text-rose-600',    border: 'border-rose-200',    lightBg: 'bg-rose-50'    },
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'New Order', paid: 'Paid', preparing: 'In Parcel',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};

function ActiveOrderCard({ order, isDark, k, onDelete, onPatch, onEdit, onSendQR, onMarkPaid, onMoveToParcel, onCancel, selected, onToggleSelect, isActing }: {
  order: Order; isDark: boolean; k: typeof DK;
  onDelete: () => void;
  onPatch?: (patch: object) => void;
  onEdit?: () => void;
  onSendQR?: () => void;
  onMarkPaid?: () => void;
  onMoveToParcel?: () => void;
  onCancel?: () => void;
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
          {onCancel && !['cancelled', 'delivered', 'shipped'].includes(order.status) && (
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
function HistoryRow({ order, isDark, k, isLast, onPatch, onDelete, isHighlighted }: {
  order: Order; isDark: boolean; k: typeof DK; isLast: boolean;
  onPatch: (patch: object) => void;
  onDelete: () => void;
  isHighlighted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sold, setSold] = useState(String(order.soldTHB || ''));
  const [cost, setCost] = useState(String(order.costKRW || ''));
  // Use rateUsed or fallback to calculated rate; guard against division by zero and NaN
  const initialRate = order.rateUsed || (order.costKRW > 0 && order.costTHB > 0 ? (order.costTHB / order.costKRW) : 0);
  const [rate, setRate] = useState(String(initialRate || ''));
  const [saving, setSaving] = useState(false);
  
  const sc = order.soldCurrency || 'THB';
  const cc = order.costCurrency || 'KRW';

  // Derived values for dynamic UI
  const currentSold = parseFloat(sold) || 0;
  const currentCostKRW = parseFloat(cost) || 0;
  const currentRate = parseFloat(rate) || 0;
  const currentCostTHB = currentCostKRW * currentRate;
  const currentProfit = currentSold - currentCostTHB - (order.shipCostTHB || 0);

  async function saveUpdate() {
    setSaving(true);
    await onPatch({ 
      soldTHB: currentSold, 
      costKRW: currentCostKRW, 
      costTHB: currentCostTHB,
      profit: currentProfit,
      rateUsed: currentRate 
    });
    setSaving(false);
    setOpen(false);
  }

  const statusBadge: Record<string, string> = {
    shipped:   isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600',
    delivered: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
    cancelled: isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600',
  };
  const statusLabel: Record<string, string> = { shipped: 'IN TRANSIT', delivered: 'DELIVERED', cancelled: 'CANCELLED' };

  return (
    <div className={`transition-all duration-300 ${!isLast ? `border-b ${k.border}` : ''} ${open ? (isDark ? 'bg-white/5' : 'bg-slate-50') : ''} ${isHighlighted ? 'ring-2 ring-accent shadow-lg shadow-accent/20' : ''}`}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left transition-all ${k.hover} outline-none`}
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          order.status === 'shipped' ? (isDark ? 'bg-violet-500/10' : 'bg-violet-50') :
          order.status === 'cancelled' ? (isDark ? 'bg-rose-500/10' : 'bg-rose-50') :
          (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
        }`}>
          {order.status === 'shipped' ? <Truck size={16} className="text-violet-500" /> :
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
          <p className={`text-[10px] ${k.muted}`}>Sales: {sc} {fmt(currentSold)}</p>
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
                <p><b>Sales:</b> ${sc} ${fmt(currentSold)}</p>
                <p><b>Cost:</b> ${cc} ${fmt(currentCostKRW)} (${sc} ${fmt(Math.round(currentCostTHB))})</p>
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
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Cost ({cc})</label>
              <NumberStepper value={parseFloat(cost) || 0} onChange={v => setCost(String(v))} min={0} step={1000} isDark={isDark} />
            </div>
            <div>
              <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Sold ({sc})</label>
              <NumberStepper value={parseFloat(sold) || 0} onChange={v => setSold(String(v))} min={0} step={100} isDark={isDark} />
            </div>
            <div>
              <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Rate ({cc} → {sc})</label>
              <NumberStepper value={parseFloat(rate) || 0} onChange={v => setRate(String(v))} min={0} step={0.001} isDark={isDark} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveUpdate} disabled={saving}
              className="flex-1 py-3 rounded-xl text-xs font-black bg-[#1a1d2e] hover:bg-black text-white transition-all active:scale-95 disabled:opacity-40">
              {saving ? 'Saving...' : 'Update Prices'}
            </button>
            {order.status === 'shipped' && (
              <button onClick={() => onPatch({ status: 'delivered' })}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95">
                <CheckCircle size={13} /> Mark Delivered
              </button>
            )}
            <button onClick={onDelete}
              className="px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
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

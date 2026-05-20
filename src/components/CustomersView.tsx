'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageCircle, ShoppingCart, Send, Search, X, Plus, Minus, Trash2,
  Package, CheckCircle, QrCode, ChevronRight, ChevronLeft, MapPin,
  Clock, Printer, History, ChevronDown, AlertTriangle, Pencil, Check,
} from 'lucide-react';
import { ProductModal, type ProductForm } from './ProductManagement';
import NumberStepper from '@/components/NumberStepper';

type Customer = {
  _id: string; userId: string; displayName: string; pictureUrl?: string;
  addresses: string[]; lastSeen: string; unreadCount: number;
};
type OrderItem = { productId?: string; name: string; variantLabel?: string; price: number; qty: number };
type Order = {
  _id: string; lineUserId: string; displayName: string; product: string;
  quantity: number; items: OrderItem[]; soldTHB: number; costKRW: number;
  costTHB: number; profit: number; shipCostTHB: number;
  costCurrency?: string; soldCurrency?: string;
  tracking?: string; courier?: string; address?: string;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered';
  paymentQrSent: boolean; createdAt: string;
  rateUsed?: number;
  statusBeforeParcel?: string;
};
type Message = {
  _id: string; lineUserId: string;
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
  options?: { name: string; values: string[] }[];
  variants?: { combination?: Record<string, string>; variantName?: string; colors?: string[]; price?: number }[];
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

export default function CustomersView({ theme, onLimitHit }: { theme: string; onLimitHit?: (feature: string, limit?: number, current?: number) => void }) {
  const isDark = theme === 'dark';
  const k = isDark ? DK : LK;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [merchantSettings, setMerchantSettings] = useState<any>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [actingOrderIds, setActingOrderIds] = useState<Set<string>>(new Set());
  const [batchActing, setBatchActing] = useState(false);
  const [listWidth, setListWidth] = useState(300);
  const [chatWidth, setChatWidth] = useState(280);

  const [qoMode, setQoMode] = useState<'existing' | 'new'>('existing');
  const [qoSearch, setQoSearch] = useState('');
  const [qoSelected, setQoSelected] = useState<Product | null>(null);
  const [qoNewProduct, setQoNewProduct] = useState<Product | null>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductSaving, setNewProductSaving] = useState(false);
  const [qoPrice, setQoPrice] = useState('');
  const [qoCostPrice, setQoCostPrice] = useState('');
  const [qoCostCurrency, setQoCostCurrency] = useState('KRW');
  const [qoQty, setQoQty] = useState(1);
  const [qoSubmitting, setQoSubmitting] = useState(false);

  const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedRef = useRef<Customer | null>(null);
  selectedRef.current = selectedCustomer;

  useEffect(() => {
    const evs = new EventSource('/api/stream');
    evs.onmessage = (e) => {
      try {
        const { type, customers: c } = JSON.parse(e.data);
        if ((type === 'init' || type === 'update') && c) {
          setCustomers(c);
          setIsLoading(false);
          if (selectedRef.current) {
            const updated = c.find((x: Customer) => x._id === selectedRef.current!._id);
            if (updated) setSelectedCustomer(updated);
          }
        }
      } catch {}
    };
    return () => evs.close();
  }, []);

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

  const loadMessages = useCallback(async (userId: string) => {
    const res = await fetch(`/api/messages/${userId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    }
  }, []);

  useEffect(() => {
    if (!selectedCustomer) { setMessages([]); return; }
    loadMessages(selectedCustomer.userId);
    pollRef.current = setInterval(() => loadMessages(selectedCustomer.userId), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedCustomer?.userId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const closeQuickOrder = useCallback(() => {
    setShowModal(false);
    setQoMode('existing'); setQoNewProduct(null); setQoSelected(null); setQoSearch(''); setQoPrice(''); setQoCostPrice(''); setQoQty(1);
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

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setSelectedAddressIdx(0);
    setSelectedOrderIds(new Set());
    if (c.unreadCount > 0) {
      fetch(`/api/customers/${c.userId}/read`, { method: 'POST' }).catch(() => {});
    }
  }

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

  async function sendBatchQR(ids: string[]) {
    setBatchActing(true);
    try {
      await fetch('/api/orders/batch/send-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });
      setAllOrders(prev => prev.map(o => ids.includes(o._id) ? { ...o, paymentQrSent: true } : o));
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
    const price = parseFloat(qoPrice) || product.price;
    const costAmount = parseFloat(qoCostPrice) || 0;
    setQoSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: selectedCustomer.userId,
          displayName: selectedCustomer.displayName,
          product: `${qoQty > 1 ? `${qoQty}x ` : ''}${product.name}`,
          quantity: qoQty,
          items: [{ productId: product._id, name: product.name, qty: qoQty, price }],
          soldTHB: price * qoQty,
          costKRW: costAmount,
          costCurrency: qoCostCurrency,
          status: 'pending',
        }),
      });
      if (res.ok) {
        const order = await res.json();
        setAllOrders(prev => [order, ...prev]);
        setShowModal(false);
        setQoPrice(''); setQoCostPrice('');
        setQoQty(1); setQoSelected(null); setQoSearch('');
        setQoNewProduct(null); setQoMode('existing');
        setQoCostCurrency(merchantSettings?.importCurrency || 'KRW');
      }
    } finally { setQoSubmitting(false); }
  }

  async function handleNewProductSave(form: ProductForm) {
    setNewProductSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand || undefined,
          modelLine: form.modelLine || undefined,
          description: form.description || undefined,
          price: parseFloat(form.price as any) || 0,
          categories: form.categories,
          imageUrl: form.images?.[0] || undefined,
          images: form.images || [],
          isActive: true,
          variants: form.variants.map(v => ({
            ...v,
            price: parseFloat(v.price as any) || 0,
            cost: parseFloat(v.cost as any) || 0,
            stock: parseInt(v.stock as any) || 0,
          })),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setProducts(prev => [created, ...prev]);
        setQoNewProduct(created);
        setQoPrice(String(created.price || 0));
        setShowNewProductModal(false);
      }
    } finally {
      setNewProductSaving(false);
    }
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

  const customerOrders = selectedCustomer
    ? allOrders.filter(o => o.lineUserId === selectedCustomer.userId)
    : [];
  const activeOrders = customerOrders.filter(o => ['pending', 'paid'].includes(o.status));
  const pendingOrders = activeOrders.filter(o => o.status === 'pending');
  const selectedTotal = activeOrders.filter(o => selectedOrderIds.has(o._id)).reduce((s, o) => s + (o.soldTHB || 0), 0);
  const allPendingSelected = pendingOrders.length > 0 && pendingOrders.every(o => selectedOrderIds.has(o._id));
  const parcelOrders = customerOrders.filter(o => o.status === 'preparing');
  const shippedOrders = customerOrders.filter(o => o.status === 'shipped' || o.status === 'delivered');

  const totalSpent = customerOrders.reduce((s, o) => s + (o.soldTHB || 0), 0);
  const totalProfit = shippedOrders.reduce((s, o) => s + (o.profit || 0), 0);

  const filteredProducts = products.filter(p => {
    const q = qoSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.brand?.toLowerCase().includes(q) ?? false);
  });

  const existingProductOptions = useMemo(() => {
    const optionNames = new Set<string>();
    const optionValues = new Set<string>();
    products.forEach(p => {
      p.options?.forEach((o: any) => { if (o.name) optionNames.add(o.name); o.values?.forEach((v: string) => optionValues.add(v)); });
      p.variants?.forEach((v: any) => { if (v.variantName) { optionNames.add('Variant'); optionValues.add(v.variantName); } v.colors?.forEach((c: string) => { optionNames.add('Color'); optionValues.add(c); }); });
    });
    return {
      brands: [...new Set(products.map(p => p.brand).filter((b): b is string => !!b))].sort(),
      modelLines: [] as string[],
      categories: [] as string[],
      optionNames: Array.from(optionNames).sort(),
      optionValues: Array.from(optionValues).sort(),
    };
  }, [products]);

  const visibleCustomers = customers.filter(c =>
    !customerSearch || c.displayName.toLowerCase().includes(customerSearch.toLowerCase())
  );

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
              <div className="w-6 h-6 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={13} className="text-accent" />
              </div>
              <span className={`font-black text-xs flex-1 tracking-wide ${k.text}`}>
                CUSTOMERS
                {totalUnread > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
                )}
              </span>
              <button
                onClick={() => setListOpen(false)}
                aria-label="Collapse customer list"
                className={`p-1 rounded-lg ${k.muted} ${k.hover} flex-shrink-0 transition-colors`}
              >
                <ChevronLeft size={14} />
              </button>
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
                  <SeedButton isDark={isDark} k={k} />
                </div>
              ) : visibleCustomers.length === 0 ? (
                <div className={`text-center px-4 py-8 text-xs ${k.muted}`}>No results for "{customerSearch}"</div>
              ) : (
                visibleCustomers.map(c => {
                  const isSelected = selectedCustomer?._id === c._id;
                  const ac = avatarColor(c.displayName);
                  return (
                    <button
                      key={c._id}
                      onClick={() => selectCustomer(c)}
                      aria-pressed={isSelected}
                      aria-label={`Customer ${c.displayName}${c.unreadCount > 0 ? `, ${c.unreadCount} unread` : ''}`}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all border-l-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                        isSelected
                          ? isDark ? 'bg-accent/10 border-l-accent' : 'bg-accent/5 border-l-accent'
                          : `border-l-transparent ${k.hover}`
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        {c.pictureUrl ? (
                          <img src={c.pictureUrl} alt={c.displayName} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className={`w-8 h-8 rounded-full ${ac} text-white flex items-center justify-center text-xs font-bold`}>
                            {(c.displayName || '?')[0].toUpperCase()}
                          </div>
                        )}
                        {c.unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-0.5 leading-none">
                            {c.unreadCount > 9 ? '9+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${k.text}`}>{c.displayName}</p>
                          <span className={`text-[10px] flex-shrink-0 ${k.muted}`}>{timeAgo(c.lastSeen)}</span>
                        </div>
                        <p className={`text-[10px] truncate mt-0.5 ${c.unreadCount > 0 ? 'text-accent font-medium' : k.muted}`}>
                          {c.unreadCount > 0 ? `${c.unreadCount} new message${c.unreadCount > 1 ? 's' : ''}` : 'LINE customer'}
                        </p>
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
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.muted} ${k.hover} flex-shrink-0 transition-colors`}
            >
              <ChevronRight size={14} />
            </button>
            {customers.map(c => {
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
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
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
                  <h2 className={`font-black text-sm truncate ${k.text}`}>{selectedCustomer.displayName}</h2>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className={`text-[10px] ${k.muted}`}>LINE Customer</span>
                    {activeOrders.length > 0 && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-bold">
                        {activeOrders.length} active
                      </span>
                    )}
                    {parcelOrders.length > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-bold">
                        {parcelOrders.length} in parcel
                      </span>
                    )}
                    {totalSpent > 0 && (
                      <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-bold">
                        ฿{fmt(totalSpent)} total
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-accent/20 active:scale-95"
                >
                  <ShoppingCart size={12} /> New Order
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
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
                    {selectedOrderIds.size > 0 && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mt-2 ${isDark ? 'bg-accent/10 border border-accent/20' : 'bg-accent/5 border border-accent/20'}`}>
                        <span className="text-xs font-bold text-accent flex-1">
                          {selectedOrderIds.size} selected · ฿{fmt(selectedTotal)}
                        </span>
                        <button
                          onClick={() => sendBatchQR([...selectedOrderIds])}
                          disabled={batchActing}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 text-amber-950 text-[11px] font-bold hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <QrCode size={11} /> {batchActing ? 'Sending...' : 'Combined QR'}
                        </button>
                        <button
                          onClick={() => markBatchPaid([...selectedOrderIds])}
                          disabled={batchActing}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-white text-[11px] font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle size={11} /> {batchActing ? 'Processing...' : 'Mark All Paid'}
                        </button>
                        <button
                          onClick={() => setSelectedOrderIds(new Set())}
                          disabled={batchActing}
                          className={`p-1.5 rounded-lg ${k.muted} ${k.hover} transition-colors disabled:opacity-40`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {activeOrders.map(order => (
                        <ActiveOrderCard key={order._id} order={order} isDark={isDark} k={k}
                          onDelete={() => confirmDeleteOrder(order._id)}
                          onSendQR={() => sendQR(order._id)}
                          onMarkPaid={() => markPaid(order._id)}
                          onMoveToParcel={() => patchOrder(order._id, { status: 'preparing', statusBeforeParcel: order.status })}
                          selected={selectedOrderIds.has(order._id)}
                          onToggleSelect={order.status === 'pending' ? () => toggleOrderSelect(order._id) : undefined}
                          isActing={actingOrderIds.has(order._id)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Parcel Fulfillment */}
                {parcelOrders.length > 0 && (
                  <section aria-label="Parcels awaiting shipment">
                    <div className="space-y-4">
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

                {/* Order History */}
                <section aria-label="Order history">
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel>Fulfilled Order History</SectionLabel>
                    {shippedOrders.length > 0 && (
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        Total profit: ฿{fmt(totalProfit)}
                      </span>
                    )}
                  </div>
                  {shippedOrders.length === 0 ? (
                    <div className={`${k.surface} border ${k.border} rounded-3xl p-8 text-center`}>
                      <div className={`w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-[#f8f9fc]'}`}>
                        <History size={18} className={`${k.muted} opacity-40`} />
                      </div>
                      <p className={`text-xs font-semibold ${k.text}`}>No fulfilled orders yet</p>
                      <p className={`text-[10px] mt-0.5 ${k.muted}`}>Shipped orders will appear here</p>
                    </div>
                  ) : (
                    <div className={`${k.surface} border ${k.border} rounded-3xl overflow-hidden`}>
                      {shippedOrders.map((order, i) => (
                        <HistoryRow key={order._id} order={order} isDark={isDark} k={k}
                          isLast={i === shippedOrders.length - 1}
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

          {/* ── Chat panel ── */}
          {chatOpen && (
            <div
              onMouseDown={startChatResize}
              className={`w-1 flex-shrink-0 cursor-col-resize transition-colors hover:bg-accent/40 ${isDark ? 'bg-[#1f2335]' : 'bg-slate-200'}`}
              title="Drag to resize"
            />
          )}
          <div
            className={`flex-shrink-0 flex border-l ${k.border}`}
            style={{ width: chatOpen ? chatWidth + 32 : 32 }}
          >
            <button
              onClick={() => setChatOpen(v => !v)}
              aria-label={chatOpen ? 'Collapse chat' : 'Expand chat'}
              className={`w-8 flex-shrink-0 flex items-center justify-center ${k.muted} ${k.hover} border-r ${k.border} transition-colors`}
            >
              {chatOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            {chatOpen && (
              <div className={`flex-1 flex flex-col min-w-0 ${k.surface}`}>
                <div className={`flex items-center gap-2.5 px-3 py-3 border-b ${k.border} flex-shrink-0`}>
                  <div className={`w-7 h-7 rounded-full ${avatarColor(selectedCustomer.displayName)} text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0`}>
                    {(selectedCustomer.displayName || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${k.text}`}>{selectedCustomer.displayName}</p>
                    <p className={`text-[10px] ${k.muted}`}>LINE Chat</p>
                  </div>
                  {selectedCustomer.unreadCount > 0 && (
                    <button
                      onClick={markAsRead}
                      className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent font-bold hover:bg-accent/20 transition-colors whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
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
                            <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                              isAdmin
                                ? 'bg-accent text-white rounded-br-sm'
                                : isDark ? 'bg-[#1f2540] text-gray-100 rounded-bl-sm border border-[#2a2e45]' : 'bg-white shadow-sm border border-[#e2e5ef] text-[#1a1d2e] rounded-bl-sm'
                            }`}>
                              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</p>
                              <p className={`text-[9px] mt-1 ${isAdmin ? 'text-green-100/80' : k.muted}`}>{timeStr}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && <p className={`text-[11px] text-center ${k.muted} pt-6`}>No messages yet</p>}
                  <div ref={messagesEndRef} />
                </div>
                <div className={`flex items-center gap-2 px-3 py-2.5 border-t ${k.border} flex-shrink-0`}>
                  <input
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message..."
                    aria-label="Chat message input"
                    className={`flex-1 text-xs rounded-xl px-3 py-2 border outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all ${k.input}`}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    aria-label="Send message"
                    className="bg-accent hover:opacity-90 disabled:opacity-40 text-white rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
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
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${qoMode === m ? 'bg-accent text-white shadow-sm shadow-accent/20' : isDark ? 'bg-white/5 text-[#8b92ad] hover:bg-white/10' : 'bg-[#f8f9fc] text-[#8b92ad] hover:bg-[#f0f1f5]'}`}>
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
                      <button key={p._id} onClick={() => { setQoSelected(p); setQoPrice(String(p.price)); }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          qoSelected?._id === p._id ? 'bg-accent text-white' : `${k.hover} ${k.text}`
                        }`}>
                        <span className="truncate">{p.name}</span>
                        <span className="ml-2 flex-shrink-0 font-bold">฿{p.price.toLocaleString()}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <p className={`text-xs text-center py-4 ${k.muted}`}>No products found</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!qoNewProduct ? (
                    <button
                      onClick={() => setShowNewProductModal(true)}
                      className={`w-full border-2 border-dashed rounded-2xl py-8 flex flex-col items-center gap-2 text-accent hover:bg-accent/5 transition-all ${isDark ? 'border-accent/20' : 'border-accent/30'}`}
                    >
                      <Plus size={20} />
                      <span className="text-sm font-bold">Create New Product</span>
                      <span className={`text-[10px] ${k.muted}`}>Opens the full catalog form</span>
                    </button>
                  ) : (
                    <div className={`flex items-center gap-3 p-3 rounded-xl border ${k.border} ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                      {qoNewProduct.imageUrl && (
                        <img src={qoNewProduct.imageUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${k.text}`}>{qoNewProduct.name}</p>
                        {qoNewProduct.brand && <p className={`text-[10px] ${k.muted}`}>{qoNewProduct.brand}</p>}
                      </div>
                      <button
                        onClick={() => setShowNewProductModal(true)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${k.border} ${k.muted} ${k.hover} transition-colors`}
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Cost ({qoCostCurrency})</label>
                  <input type="number" value={qoCostPrice} onChange={e => setQoCostPrice(e.target.value)} placeholder="0"
                    className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`} />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Currency</label>
                  <select value={qoCostCurrency} onChange={e => setQoCostCurrency(e.target.value)}
                    className={`text-sm rounded-xl px-2 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`}>
                    {COST_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>
                    Sold ({merchantSettings?.localCurrency || 'THB'})
                  </label>
                  <input type="number" value={qoPrice} onChange={e => setQoPrice(e.target.value)} placeholder="0"
                    className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-accent transition-all ${k.input}`} />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Qty</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQoQty(q => Math.max(1, q - 1))}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${k.border} ${k.hover} ${k.text}`}><Minus size={12} /></button>
                    <span className={`w-8 text-center text-sm font-black ${k.text}`}>{qoQty}</span>
                    <button onClick={() => setQoQty(q => q + 1)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${k.border} ${k.hover} ${k.text}`}><Plus size={12} /></button>
                  </div>
                </div>
              </div>

              {qoCostCurrency !== (merchantSettings?.localCurrency || 'THB') && merchantSettings?.krwRate && (
                <p className={`text-[10px] ${k.muted} px-1`}>
                  @ {merchantSettings.krwRate} ({qoCostCurrency} → {merchantSettings.localCurrency || 'THB'}{merchantSettings.useAutoRate ? ' · live' : ''})
                </p>
              )}

              <button
                disabled={qoSubmitting || (qoMode === 'existing' ? !qoSelected : !qoNewProduct)}
                onClick={submitQuickOrder}
                className="w-full bg-accent hover:opacity-90 disabled:opacity-40 text-white rounded-2xl py-3 font-black text-sm shadow-sm shadow-accent/20 transition-all active:scale-95"
              >
                {qoSubmitting ? 'Creating...' : 'Add Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewProductModal && (
        <ProductModal
          isOpen={showNewProductModal}
          initialData={null}
          onSave={handleNewProductSave}
          onClose={() => setShowNewProductModal(false)}
          isSaving={newProductSaving}
          existingOptions={existingProductOptions}
          theme={isDark ? 'dark' : 'light'}
          quickOrderMode={true}
        />
      )}

      <ConfirmModal config={confirm} onClose={() => setConfirm(v => ({ ...v, open: false }))} isDark={isDark} k={k} />
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
  pending: {
    bg: 'bg-amber-500',
    text: 'text-amber-500',
    border: 'border-amber-500/30',
    lightBg: 'bg-amber-500/10',
    glow: 'glow-amber',
  },
  paid: {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
    lightBg: 'bg-blue-500/10',
    glow: 'box-shadow: 0 0 20px rgba(59, 130, 246, 0.15)',
  },
  preparing: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
    lightBg: 'bg-emerald-500/10',
    glow: 'glow-emerald',
  },
  shipped: {
    bg: 'bg-slate-500',
    text: 'text-slate-500',
    border: 'border-slate-500/30',
    lightBg: 'bg-slate-500/10',
  },
  delivered: {
    bg: 'bg-green-500',
    text: 'text-green-600',
    border: 'border-green-500/30',
    lightBg: 'bg-green-500/10',
  },
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'New Order', paid: 'Paid', preparing: 'In Parcel', shipped: 'Shipped', delivered: 'Delivered',
};

function ActiveOrderCard({ order, isDark, k, editable, onDelete, onPatch, onSendQR, onMarkPaid, onMoveToParcel, selected, onToggleSelect, isActing }: {
  order: Order; isDark: boolean; k: typeof DK;
  editable?: boolean;
  onDelete: () => void;
  onPatch?: (patch: object) => void;
  onSendQR?: () => void;
  onMarkPaid?: () => void;
  onMoveToParcel?: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  isActing?: boolean;
}) {
  const sc = order.soldCurrency || 'THB';
  const cc = order.costCurrency || 'KRW';
  const status = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const label = STATUS_LABEL[order.status] || 'Order';

  // For editable mode
  const [name, setName] = useState(order.product);
  const [qty, setQty] = useState(order.quantity || 1);
  const [sold, setSold] = useState(String(order.soldTHB || ''));
  const [cost, setCost] = useState(String(order.costKRW || ''));
  const initialRate = order.rateUsed || (order.costKRW ? (order.costTHB / order.costKRW) : 0);
  const [rate, setRate] = useState(String(initialRate || ''));

  const currentSold = parseFloat(sold) || 0;
  const currentCostKRW = parseFloat(cost) || 0;
  const currentRate = parseFloat(rate) || 0;
  const currentCostTHB = currentCostKRW * currentRate;
  const currentProfit = currentSold - currentCostTHB - (order.shipCostTHB || 0);

  const [isEditing, setIsEditing] = useState(false);
  const showEdit = editable || isEditing;

  // Sync state if order changes (e.g. from props)
  useEffect(() => {
    if (showEdit) {
      setName(order.product);
      setQty(order.quantity || 1);
      setSold(String(order.soldTHB || ''));
      setCost(String(order.costKRW || ''));
      setRate(String(initialRate || ''));
    }
  }, [order._id, showEdit]);

  const saveChanges = () => {
    if (onPatch) {
      onPatch({
        product: name,
        quantity: qty,
        soldTHB: currentSold,
        costKRW: currentCostKRW,
        costTHB: currentCostTHB,
        profit: currentProfit,
        rateUsed: currentRate
      });
    }
    setIsEditing(false);
  };

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
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              aria-label={selected ? 'Deselect order' : 'Select order'}
              className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                selected
                  ? 'bg-accent border-accent'
                  : isDark ? 'border-white/30 hover:border-accent/60' : 'border-gray-300 hover:border-accent/60'
              }`}
            >
              {selected && <Check size={10} className="text-white" strokeWidth={3} />}
            </button>
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
          {!editable && (
            <button onClick={() => setIsEditing(!isEditing)} aria-label="Edit order" className={`p-1 rounded-md transition-colors ${isEditing ? 'text-accent bg-accent/10' : 'text-[#8b92ad] hover:text-accent'}`}>
              <Pencil size={12} />
            </button>
          )}
          <button onClick={onDelete} aria-label="Delete order" className="text-[#8b92ad] hover:text-red-500 transition-colors p-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {!showEdit ? (
        <>
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
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={`block text-[8px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Product Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className={`w-full text-xs rounded-lg px-2 py-1.5 border outline-none focus:border-accent transition-all ${k.input}`} />
            </div>
            <div className="w-24">
              <label className={`block text-[8px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Qty</label>
              <NumberStepper value={qty} onChange={v => setQty(v)} min={1} step={1} isDark={isDark} size="sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={`block text-[8px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Cost ({cc})</label>
              <NumberStepper value={parseFloat(cost) || 0} onChange={v => setCost(String(v))} min={0} step={1000} isDark={isDark} size="sm" />
            </div>
            <div>
              <label className={`block text-[8px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Sold ({sc})</label>
              <NumberStepper value={parseFloat(sold) || 0} onChange={v => setSold(String(v))} min={0} step={100} isDark={isDark} size="sm" />
            </div>
            <div>
              <label className={`block text-[8px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Rate ({cc}→{sc})</label>
              <NumberStepper value={parseFloat(rate) || 0} onChange={v => setRate(String(v))} min={0} step={0.001} isDark={isDark} size="sm" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className={`text-[10px] font-black ${currentProfit >= 0 ? 'text-accent' : 'text-red-500'}`}>
              Profit: {sc} {fmt(currentProfit)}
            </p>
            <button onClick={saveChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:opacity-90 text-white text-[10px] font-black transition-all active:scale-95 shadow-sm shadow-accent/20">
              <CheckCircle size={11} /> Save Changes
            </button>
          </div>
        </div>
      )}

      {order.status !== 'preparing' && !showEdit && (
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
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-accent text-white hover:opacity-90 transition-all active:scale-95 shadow-sm shadow-accent/20 disabled:opacity-50">
              <CheckCircle size={12} /> {isActing ? 'Processing...' : 'Mark Paid'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ── Parcel Card ───────────────────────────────────────────────────────────────
function ParcelContainer({ orders, isDark, k, onPatch, onCancelParcel, onShip, onAddItem, merchantSettings }: {
  orders: Order[]; isDark: boolean; k: typeof DK;
  onPatch: (id: string, patch: object) => void;
  onCancelParcel: (id: string) => void;
  onShip: (tracking: string, courier: string) => void;
  onAddItem?: () => void;
  merchantSettings?: any;
}) {
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');
  const [shipping, setShipping] = useState(false);

  const parcelId = orders[0]?._id.slice(-4).toUpperCase() || 'NEW';
  const inner = isDark ? 'bg-[#1a1d2e] border-[#2a3050]' : 'bg-white border-[#e2e5ef]';
  const outer = isDark ? 'border-[#2a3050]' : 'border-[#e2e5ef]';

  async function handleShip() {
    if (!tracking || !courier) return;
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
            <p className={`text-sm font-black ${k.text}`}>{parcelId}</p>
          </div>
        </div>
        <button onClick={onAddItem} className="flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-2xl bg-accent hover:opacity-90 text-white transition-all active:scale-95 shadow-lg shadow-accent/20">
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
            editable={true}
            onDelete={() => onCancelParcel(order._id)}
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
          className="p-2 bg-accent text-white rounded-xl hover:opacity-90 transition-all active:scale-95"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ── History Row ───────────────────────────────────────────────────────────────
function HistoryRow({ order, isDark, k, isLast, onPatch, onDelete }: {
  order: Order; isDark: boolean; k: typeof DK; isLast: boolean;
  onPatch: (patch: object) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sold, setSold] = useState(String(order.soldTHB || ''));
  const [cost, setCost] = useState(String(order.costKRW || ''));
  // Use rateUsed or fallback to calculated rate
  const initialRate = order.rateUsed || (order.costKRW ? (order.costTHB / order.costKRW) : 0);
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

  return (
    <div className={`transition-all duration-300 ${!isLast ? `border-b ${k.border}` : ''} ${open ? (isDark ? 'bg-white/5' : 'bg-slate-50') : ''}`}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left transition-all ${k.hover} outline-none`}
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/10'}`}>
          <Package size={16} className="text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{order.product}</p>
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
        <div className="flex items-center ml-4 flex-shrink-0">
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
function SeedButton({ isDark, k }: { isDark: boolean; k: typeof DK }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function seed() {
    setState('loading');
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      setState(res.ok ? 'done' : 'error');
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

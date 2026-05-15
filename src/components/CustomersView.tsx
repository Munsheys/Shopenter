'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, ShoppingCart, Send, Search, X, Plus, Minus, Trash2,
  Package, CheckCircle, QrCode, ChevronRight, ChevronLeft, MapPin,
  Clock, Printer, History, ChevronDown, TrendingUp,
} from 'lucide-react';

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
  status: 'pending' | 'paid' | 'preparing' | 'shipped';
  paymentQrSent: boolean; createdAt: string;
};
type Message = {
  _id: string; lineUserId: string; type: 'text' | 'image' | 'system';
  text: string; sender: 'user' | 'admin' | 'system'; createdAt: string;
};
type Product = {
  _id: string; name: string; brand?: string; price: number; imageUrl?: string;
  variants?: { thickness?: string; colors?: string[]; price?: number }[];
};

const COST_CURRENCIES = ['THB', 'KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'HKD', 'SGD', 'TWD'];
const COURIERS = ['Flash Express', 'Kerry Express', 'J&T Express', 'Thai Post', 'DHL Express', 'Ninja Van', 'Best Express', 'Alpha Fast'];

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
  bg: 'bg-[#0f1117]', surface: 'bg-[#161925]', surfaceDeep: 'bg-[#1a1d2e]',
  border: 'border-[#1f2335]', text: 'text-white', muted: 'text-[#8b92ad]',
  hover: 'hover:bg-white/5', input: 'bg-[#1a1d2e] border-[#2a3050] text-white placeholder-[#8b92ad]',
};
const LK = {
  bg: 'bg-[#f8f9fc]', surface: 'bg-white', surfaceDeep: 'bg-[#f8f9fc]',
  border: 'border-[#e2e5ef]', text: 'text-[#1a1d2e]', muted: 'text-[#8b92ad]',
  hover: 'hover:bg-[#f8f9fc]', input: 'bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e] placeholder-[#8b92ad]',
};

export default function CustomersView({ theme }: { theme: string }) {
  const isDark = theme === 'dark';
  const k = isDark ? DK : LK;

  const [customers, setCustomers] = useState<Customer[]>([]);
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

  const [qoMode, setQoMode] = useState<'manual' | 'catalog'>('manual');
  const [qoSearch, setQoSearch] = useState('');
  const [qoSelected, setQoSelected] = useState<Product | null>(null);
  const [qoName, setQoName] = useState('');
  const [qoPrice, setQoPrice] = useState('');
  const [qoCostPrice, setQoCostPrice] = useState('');
  const [qoCostCurrency, setQoCostCurrency] = useState('KRW');
  const [qoQty, setQoQty] = useState(1);
  const [qoSubmitting, setQoSubmitting] = useState(false);

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

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
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
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setAllOrders(prev => prev.map(o => o._id === id ? updated : o));
    }
  }

  async function deleteOrder(id: string) {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    setAllOrders(prev => prev.filter(o => o._id !== id));
  }

  async function sendQR(id: string) {
    await fetch(`/api/orders/${id}/send-qr`, { method: 'POST' });
    setAllOrders(prev => prev.map(o => o._id === id ? { ...o, paymentQrSent: true } : o));
  }

  async function markPaid(id: string) {
    await fetch(`/api/orders/${id}/mark-paid`, { method: 'POST' });
    setAllOrders(prev => prev.map(o => o._id === id ? { ...o, status: 'paid' } : o));
  }

  async function submitQuickOrder() {
    if (!selectedCustomer || qoSubmitting) return;
    const name = qoMode === 'catalog' && qoSelected ? qoSelected.name : qoName.trim();
    if (!name) return;
    const price = parseFloat(qoPrice) || (qoSelected?.price ?? 0);
    const costAmount = parseFloat(qoCostPrice) || 0;
    setQoSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: selectedCustomer.userId,
          displayName: selectedCustomer.displayName,
          product: `${qoQty > 1 ? `${qoQty}x ` : ''}${name}`,
          quantity: qoQty,
          items: [{ productId: qoSelected?._id, name, qty: qoQty, price }],
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
        setQoName(''); setQoPrice(''); setQoCostPrice('');
        setQoQty(1); setQoSelected(null); setQoSearch('');
        setQoCostCurrency(merchantSettings?.importCurrency || 'KRW');
      }
    } finally { setQoSubmitting(false); }
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

  async function markAsRead() {
    if (!selectedCustomer) return;
    await fetch(`/api/customers/${selectedCustomer.userId}/read`, { method: 'POST' }).catch(() => {});
    setSelectedCustomer(prev => prev ? { ...prev, unreadCount: 0 } : prev);
    setCustomers(prev => prev.map(c => c.userId === selectedCustomer.userId ? { ...c, unreadCount: 0 } : c));
  }

  const customerOrders = selectedCustomer
    ? allOrders.filter(o => o.lineUserId === selectedCustomer.userId)
    : [];
  const activeOrders = customerOrders.filter(o => ['pending', 'paid', 'preparing'].includes(o.status));
  const parcelOrders = customerOrders.filter(o => o.status === 'preparing');
  const shippedOrders = customerOrders.filter(o => o.status === 'shipped');

  const totalSpent = customerOrders.reduce((s, o) => s + (o.soldTHB || 0), 0);
  const totalProfit = shippedOrders.reduce((s, o) => s + (o.profit || 0), 0);

  const filteredProducts = products.filter(p => {
    const q = qoSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.brand?.toLowerCase().includes(q) ?? false);
  });

  const visibleCustomers = customers.filter(c =>
    !customerSearch || c.displayName.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const totalUnread = customers.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className={`flex h-full overflow-hidden ${k.bg}`}>

      {/* ── Customer list panel ── */}
      <aside className={`flex-shrink-0 flex flex-col border-r ${k.border} ${k.surface} transition-all duration-200 ${listOpen ? 'w-64' : 'w-12'}`}>
        {listOpen ? (
          <>
            <div className={`flex items-center gap-2 px-4 py-3 border-b ${k.border} flex-shrink-0`}>
              <div className="w-6 h-6 rounded-xl bg-[#00b900]/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={13} className="text-[#00b900]" />
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
                  className={`w-full text-xs rounded-xl pl-7 pr-7 py-1.5 border outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/20 transition-all ${k.input}`}
                />
                {customerSearch && (
                  <button onClick={() => setCustomerSearch('')} aria-label="Clear search" className={`absolute right-2 top-1/2 -translate-y-1/2 ${k.muted} hover:text-red-500`}>
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {customers.length === 0 ? (
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
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all border-l-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#00b900]/40 ${
                        isSelected
                          ? isDark ? 'bg-[#00b900]/10 border-l-[#00b900]' : 'bg-[#00b900]/5 border-l-[#00b900]'
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
                        <p className={`text-[10px] truncate mt-0.5 ${c.unreadCount > 0 ? 'text-[#00b900] font-medium' : k.muted}`}>
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
                  className={`relative w-8 h-8 rounded-full flex-shrink-0 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#00b900]/40 ${
                    selectedCustomer?._id === c._id ? 'ring-2 ring-[#00b900] ring-offset-1' : 'opacity-60 hover:opacity-100'
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
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Customer header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border} ${k.surface} flex-shrink-0`}>
              <div className="flex items-center gap-3 min-w-0">
                {selectedCustomer.pictureUrl ? (
                  <img src={selectedCustomer.pictureUrl} className="w-10 h-10 rounded-full ring-2 ring-[#00b900]/30 flex-shrink-0" alt="" />
                ) : (
                  <div className={`w-10 h-10 rounded-full ${avatarColor(selectedCustomer.displayName)} text-white flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 ring-offset-1 ring-[#00b900]/20`}>
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
                      <span className="text-[10px] bg-[#00b900]/10 text-[#00b900] px-1.5 py-0.5 rounded-full font-bold">
                        ฿{fmt(totalSpent)} total
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowModal(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${k.border} ${k.text} ${k.hover} active:scale-95`}
                >
                  <ShoppingCart size={12} /> New Order
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#00b900] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#00b900]/20 active:scale-95"
                >
                  <Plus size={12} /> Add Parcel
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6 max-w-4xl">

                {/* Active Orders */}
                {activeOrders.length > 0 && (
                  <section aria-label="Active orders">
                    <SectionLabel>Active Orders</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {activeOrders.map(order => (
                        <ActiveOrderCard key={order._id} order={order} isDark={isDark} k={k}
                          onDelete={() => deleteOrder(order._id)}
                          onSendQR={() => sendQR(order._id)}
                          onMarkPaid={() => markPaid(order._id)}
                          onMoveToParcel={() => patchOrder(order._id, { status: 'preparing' })} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Parcel Fulfillment */}
                {parcelOrders.length > 0 && (
                  <section aria-label="Parcels awaiting shipment">
                    <div className="space-y-4">
                      {parcelOrders.map(order => (
                        <ParcelCard key={order._id} order={order} isDark={isDark} k={k}
                          onPatch={(patch) => patchOrder(order._id, patch)}
                          onDelete={() => deleteOrder(order._id)}
                          onMarkShipped={() => patchOrder(order._id, { status: 'shipped' })}
                          onAddItem={() => setShowModal(true)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Delivery Addresses */}
                <section aria-label="Delivery addresses">
                  <SectionLabel>Delivery Addresses</SectionLabel>
                  <AddressSection customer={selectedCustomer} isDark={isDark} k={k} onAdd={addAddress} onRemove={removeAddress} />
                </section>

                {/* Order History */}
                <section aria-label="Order history">
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel>Fulfilled Order History</SectionLabel>
                    {shippedOrders.length > 0 && (
                      <span className="text-[10px] font-bold text-[#00b900] bg-[#00b900]/10 px-2 py-0.5 rounded-full">
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
                          onPatch={(patch) => patchOrder(order._id, patch)} />
                      ))}
                    </div>
                  )}
                </section>

              </div>
            </div>
          </div>

          {/* ── Chat panel ── */}
          <div className={`flex-shrink-0 flex border-l ${k.border} transition-all duration-200 ${chatOpen ? 'w-72' : 'w-8'}`}>
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
                      className="text-[10px] px-2 py-1 rounded-full bg-[#00b900]/10 text-[#00b900] font-bold hover:bg-[#00b900]/20 transition-colors whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.map(msg => (
                    <div key={msg._id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                      {msg.sender === 'system' ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-[#8b92ad]' : 'bg-[#f8f9fc] text-[#8b92ad]'}`}>{msg.text}</span>
                      ) : (
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'admin'
                            ? 'bg-[#00b900] text-white rounded-br-sm'
                            : isDark ? 'bg-white/10 text-gray-100 rounded-bl-sm' : 'bg-white shadow-sm border border-[#e2e5ef] text-[#1a1d2e] rounded-bl-sm'
                        }`}>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                          <p className={`text-[9px] mt-1 ${msg.sender === 'admin' ? 'text-green-100' : k.muted}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
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
                    className={`flex-1 text-xs rounded-xl px-3 py-2 border outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/20 transition-all ${k.input}`}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    aria-label="Send message"
                    className="bg-[#00b900] hover:opacity-90 disabled:opacity-40 text-white rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Quick order">
          <div className={`${k.surface} rounded-3xl shadow-2xl w-full max-w-md border ${k.border}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border}`}>
              <div>
                <h3 className={`font-black text-sm ${k.text}`}>Quick Chat Order</h3>
                <p className={`text-[10px] mt-0.5 ${k.muted}`}>{selectedCustomer.displayName}</p>
              </div>
              <button onClick={() => setShowModal(false)} aria-label="Close" className={`p-1.5 rounded-xl ${k.muted} ${k.hover} transition-colors`}>
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                {(['manual', 'catalog'] as const).map(m => (
                  <button key={m} onClick={() => setQoMode(m)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${qoMode === m ? 'bg-[#00b900] text-white shadow-sm shadow-[#00b900]/20' : isDark ? 'bg-white/5 text-[#8b92ad] hover:bg-white/10' : 'bg-[#f8f9fc] text-[#8b92ad] hover:bg-[#f0f1f5]'}`}>
                    {m}
                  </button>
                ))}
              </div>

              {qoMode === 'manual' ? (
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Product Name</label>
                  <input value={qoName} onChange={e => setQoName(e.target.value)}
                    placeholder="e.g. [Goyard] Boheme Hobo – Linen"
                    className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/20 transition-all ${k.input}`} />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${k.muted}`} />
                    <input value={qoSearch} onChange={e => setQoSearch(e.target.value)} placeholder="Search products..."
                      className={`w-full text-sm rounded-xl pl-8 pr-3 py-2.5 border outline-none focus:border-[#00b900] transition-all ${k.input}`} />
                  </div>
                  <div className={`max-h-40 overflow-y-auto rounded-2xl border ${k.border} overflow-hidden`}>
                    {filteredProducts.slice(0, 15).map(p => (
                      <button key={p._id} onClick={() => { setQoSelected(p); setQoPrice(String(p.price)); }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          qoSelected?._id === p._id ? 'bg-[#00b900] text-white' : `${k.hover} ${k.text}`
                        }`}>
                        <span className="truncate">{p.name}</span>
                        <span className="ml-2 flex-shrink-0 font-bold">฿{p.price.toLocaleString()}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <p className={`text-xs text-center py-4 ${k.muted}`}>No products found</p>}
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Cost ({qoCostCurrency})</label>
                  <input type="number" value={qoCostPrice} onChange={e => setQoCostPrice(e.target.value)} placeholder="0"
                    className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] transition-all ${k.input}`} />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Currency</label>
                  <select value={qoCostCurrency} onChange={e => setQoCostCurrency(e.target.value)}
                    className={`text-sm rounded-xl px-2 py-2.5 border outline-none focus:border-[#00b900] transition-all ${k.input}`}>
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
                    className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] transition-all ${k.input}`} />
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

              {qoCostPrice && parseFloat(qoCostPrice) > 0 && (
                <p className={`text-[10px] ${k.muted} px-1`}>
                  Rate: 1 {qoCostCurrency} = {merchantSettings?.krwRate ?? '?'} {merchantSettings?.localCurrency || 'THB'}
                  {merchantSettings?.useAutoRate && ' · live rate applied on save'}
                </p>
              )}

              <button
                disabled={qoSubmitting || (qoMode === 'manual' ? !qoName.trim() : !qoSelected)}
                onClick={submitQuickOrder}
                className="w-full bg-[#00b900] hover:opacity-90 disabled:opacity-40 text-white rounded-2xl py-3 font-black text-sm shadow-sm shadow-[#00b900]/20 transition-all active:scale-95"
              >
                {qoSubmitting ? 'Creating...' : 'Add Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-[#8b92ad]">{children}</p>
  );
}

// ── Active Order Card ─────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  paid:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  preparing: 'bg-[#00b900]/10 text-[#00b900] border-[#00b900]/20',
  shipped:   'bg-slate-100 text-slate-600 border-slate-200',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'New Order', paid: '✓ Paid', preparing: '✓ In Parcel', shipped: 'Shipped',
};
const STATUS_BG: Record<string, string> = {
  pending: 'bg-amber-50 border-amber-100', paid: 'bg-emerald-50 border-emerald-100',
  preparing: 'bg-[#00b900]/5 border-[#00b900]/10', shipped: 'bg-slate-50 border-slate-100',
};

function ActiveOrderCard({ order, isDark, k, onDelete, onSendQR, onMarkPaid, onMoveToParcel }: {
  order: Order; isDark: boolean; k: typeof DK;
  onDelete: () => void; onSendQR?: () => void; onMarkPaid?: () => void; onMoveToParcel?: () => void;
}) {
  const sc = order.soldCurrency || 'THB';
  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
  const label = STATUS_LABEL[order.status] || 'Order';
  const cardBg = isDark ? 'bg-[#161925] border-[#1f2335]' : STATUS_BG[order.status] || STATUS_BG.pending;

  return (
    <article className={`rounded-2xl border p-4 ${cardBg}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className={`text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-wider ${badge}`}>
          {label}
        </span>
        <button onClick={onDelete} aria-label="Delete order" className="text-[#8b92ad] hover:text-red-500 transition-colors p-0.5 -mt-0.5">
          <Trash2 size={13} />
        </button>
      </div>

      <p className={`font-bold text-sm leading-snug mb-2 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{order.product}</p>

      <div className="flex items-center gap-2.5">
        <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>
          {sc} {fmt(order.soldTHB)}
        </p>
        {(order.profit || 0) > 0 && (
          <span className="text-[10px] text-[#00b900] font-bold bg-[#00b900]/10 px-1.5 py-0.5 rounded-full">
            +{fmt(order.profit)} profit
          </span>
        )}
      </div>

      {order.status !== 'preparing' && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {onMoveToParcel && order.status === 'paid' && (
            <button onClick={onMoveToParcel}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-500 hover:bg-blue-600 text-white transition-all active:scale-95">
              <Package size={10} /> Move to Parcel
            </button>
          )}
          {onSendQR && !order.paymentQrSent && (
            <button onClick={onSendQR}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-violet-500 hover:bg-violet-600 text-white transition-all active:scale-95">
              <QrCode size={10} /> Send QR
            </button>
          )}
          {onMarkPaid && order.status === 'pending' && (
            <button onClick={onMarkPaid}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95">
              <CheckCircle size={10} /> Mark Paid
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ── Parcel Card ───────────────────────────────────────────────────────────────
function ParcelCard({ order, isDark, k, onPatch, onDelete, onMarkShipped, onAddItem }: {
  order: Order; isDark: boolean; k: typeof DK;
  onPatch: (patch: object) => void; onDelete: () => void; onMarkShipped: () => void;
  onAddItem?: () => void;
}) {
  const sc = order.soldCurrency || 'THB';
  const cc = order.costCurrency || 'KRW';
  const parcelId = order._id.slice(-4).toUpperCase();

  // Editable item fields
  const [productName, setProductName] = useState(order.product);
  const [qty, setQty] = useState(order.quantity || 1);
  const [sold, setSold] = useState(order.soldTHB || 0);
  const [cost, setCost] = useState(order.costKRW || 0);
  const [tracking, setTracking] = useState(order.tracking || '');
  const [courier, setCourier] = useState(order.courier || '');
  const [saving, setSaving] = useState(false);

  const profit = sold - (order.costTHB || 0);

  async function ship() {
    setSaving(true);
    await onPatch({ product: productName, quantity: qty, soldTHB: sold, costKRW: cost, tracking, courier });
    onMarkShipped();
    setSaving(false);
  }

  const inner = isDark ? 'bg-[#1a1d2e] border-[#2a3050]' : 'bg-white border-[#e2e5ef]';
  const outer = isDark ? 'border-[#2a3050]' : 'border-[#e2e5ef]';

  return (
    <article className={`rounded-3xl border-2 border-dashed ${outer} ${isDark ? 'bg-[#161925]' : 'bg-[#f8f9fc]'} p-5 space-y-4`}>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${isDark ? 'bg-white/10 text-white' : 'bg-[#1a1d2e] text-white'}`}>
          Parcel ID: {parcelId}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddItem}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#00b900] hover:opacity-90 text-white transition-all active:scale-95"
          >
            <Plus size={11} /> Add Item
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete parcel"
            className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            Delete Parcel
          </button>
        </div>
      </div>

      {/* Item details card */}
      <div className={`border rounded-2xl p-5 ${inner}`}>
        <p className={`text-[9px] font-black uppercase tracking-widest mb-4 ${k.muted}`}>Item Details</p>

        {/* Product name + qty row */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Product Name</label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/20 transition-all ${k.input}`}
            />
          </div>
          <div className="flex-shrink-0">
            <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>QTY</label>
            <div className="flex items-center gap-0">
              <input
                type="number"
                value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-16 text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] transition-all text-center ${k.input}`}
              />
              <button onClick={onDelete} aria-label="Remove item" className={`ml-2 p-2 rounded-xl ${k.muted} hover:text-red-500 transition-colors`}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Sold + Cost row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Sold ({sc})</label>
            <input
              type="number"
              value={sold}
              onChange={e => setSold(parseFloat(e.target.value) || 0)}
              className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/20 transition-all ${k.input}`}
            />
          </div>
          <div>
            <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Cost ({cc})</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(parseFloat(e.target.value) || 0)}
              className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/20 transition-all ${k.input}`}
            />
          </div>
        </div>

        {/* Live profit */}
        <p className={`text-base font-black ${profit >= 0 ? 'text-[#00b900]' : 'text-red-500'}`}>
          Profit: {sc} {fmt(profit)}
        </p>
      </div>

      {/* Courier + Tracking */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Courier</label>
          <div className="relative">
            <select
              value={courier}
              onChange={e => setCourier(e.target.value)}
              aria-label="Select courier"
              className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] transition-all appearance-none ${k.input}`}
            >
              <option value="">-- Select --</option>
              {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className={`absolute right-3 top-1/2 -translate-y-1/2 ${k.muted} pointer-events-none`} />
          </div>
        </div>
        <div>
          <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${k.muted}`}>Tracking Number</label>
          <input
            value={tracking}
            onChange={e => setTracking(e.target.value)}
            placeholder="Ex: TH12345678"
            className={`w-full text-sm rounded-xl px-3 py-2.5 border outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/20 transition-all ${k.input}`}
          />
        </div>
      </div>

      {/* Ship button */}
      <button
        onClick={ship}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black bg-[#1a1d2e] hover:bg-black text-white transition-all active:scale-[0.98] disabled:opacity-40 shadow-md"
      >
        <Printer size={16} />
        {saving ? 'Shipping...' : 'Ship + Print Label'}
      </button>
    </article>
  );
}

// ── Address Section ───────────────────────────────────────────────────────────
function AddressSection({ customer, isDark, k, onAdd, onRemove }: {
  customer: Customer; isDark: boolean; k: typeof DK;
  onAdd: (addr: string) => void; onRemove: (idx: number) => void;
}) {
  const [newAddr, setNewAddr] = useState('');
  return (
    <div className={`mt-3 ${k.surface} rounded-2xl border ${k.border} p-4`}>
      <div className="space-y-2">
        {(customer.addresses || []).length === 0 && (
          <p className={`text-xs ${k.muted} pb-1`}>No saved addresses</p>
        )}
        {(customer.addresses || []).map((addr, i) => (
          <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${k.border} ${isDark ? 'bg-[#1a1d2e]' : 'bg-[#f8f9fc]'}`}>
            <MapPin size={13} className={`flex-shrink-0 ${i === 0 ? 'text-[#00b900]' : k.muted}`} />
            <span className={`text-xs flex-1 ${isDark ? 'text-white' : 'text-[#1a1d2e]'}`}>{addr}</span>
            {i === 0 && <span className="text-[9px] font-bold text-[#00b900] bg-[#00b900]/10 px-1.5 py-0.5 rounded-full">DEFAULT</span>}
            <button
              onClick={() => onRemove(i)}
              aria-label={`Remove address: ${addr}`}
              className={`text-xs ${k.muted} hover:text-red-500 transition-colors p-0.5`}
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input
            value={newAddr}
            onChange={e => setNewAddr(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newAddr.trim()) { onAdd(newAddr); setNewAddr(''); } }}
            placeholder="Add new delivery address..."
            aria-label="New address"
            className={`flex-1 text-sm rounded-xl px-3 py-2 border outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/20 transition-all ${k.input}`}
          />
          <button
            onClick={() => { if (newAddr.trim()) { onAdd(newAddr); setNewAddr(''); } }}
            className="px-4 py-2 bg-[#00b900] hover:opacity-90 text-white rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History Row ───────────────────────────────────────────────────────────────
function HistoryRow({ order, isDark, k, isLast, onPatch }: {
  order: Order; isDark: boolean; k: typeof DK; isLast: boolean;
  onPatch: (patch: object) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sold, setSold] = useState(String(order.soldTHB || ''));
  const [cost, setCost] = useState(String(order.costKRW || ''));
  const [rate, setRate] = useState(String(order.profit || ''));
  const [saving, setSaving] = useState(false);
  const sc = order.soldCurrency || 'THB';
  const cc = order.costCurrency || 'KRW';
  const profit = order.profit || 0;

  async function saveUpdate() {
    setSaving(true);
    await onPatch({ soldTHB: parseFloat(sold), costKRW: parseFloat(cost) });
    setSaving(false);
    setOpen(false);
  }

  return (
    <div className={`${!isLast ? `border-b ${k.border}` : ''}`}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${k.hover} outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00b900]/30`}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-[#00b900]/10' : 'bg-[#00b900]/10'}`}>
          <Package size={14} className="text-[#00b900]" />
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
          <p className={`text-sm font-black ${profit >= 0 ? 'text-[#00b900]' : 'text-red-500'}`}>
            {sc} {fmt(profit)}
          </p>
          <p className={`text-[10px] ${k.muted}`}>Sales: {sc} {fmt(order.soldTHB)}</p>
        </div>
        <ChevronDown size={13} className={`flex-shrink-0 ${k.muted} transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`px-5 pb-4 ${isDark ? 'bg-[#1a1d2e]' : 'bg-[#f8f9fc]'}`}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Sold ({sc})</label>
              <input type="number" value={sold} onChange={e => setSold(e.target.value)}
                className={`w-full text-sm rounded-xl px-3 py-2 border outline-none focus:border-[#00b900] transition-all ${k.input}`} />
            </div>
            <div>
              <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Cost ({cc})</label>
              <input type="number" value={cost} onChange={e => setCost(e.target.value)}
                className={`w-full text-sm rounded-xl px-3 py-2 border outline-none focus:border-[#00b900] transition-all ${k.input}`} />
            </div>
            <div>
              <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${k.muted}`}>Rate</label>
              <input type="number" value={rate} onChange={e => setRate(e.target.value)}
                className={`w-full text-sm rounded-xl px-3 py-2 border outline-none focus:border-[#00b900] transition-all ${k.input}`} />
            </div>
          </div>
          <button onClick={saveUpdate} disabled={saving}
            className="w-full py-2 rounded-xl text-xs font-black bg-[#1a1d2e] hover:bg-black text-white transition-all active:scale-95 disabled:opacity-40">
            {saving ? 'Saving...' : 'Update Prices'}
          </button>
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
    <p className="text-xs text-[#00b900] font-bold text-center">Seeded — customers will appear shortly</p>
  );

  return (
    <button
      onClick={seed}
      disabled={state === 'loading'}
      className={`text-xs px-4 py-2 rounded-xl border font-bold transition-all disabled:opacity-50 ${
        isDark ? 'border-[#2a3050] text-[#8b92ad] hover:border-[#00b900] hover:text-[#00b900]' : 'border-[#e2e5ef] text-[#8b92ad] hover:border-[#00b900] hover:text-[#00b900]'
      }`}
    >
      {state === 'loading' ? 'Seeding...' : state === 'error' ? 'Failed — try again' : '+ Add mock customers'}
    </button>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, ShoppingCart, Send, Search, X, Plus, Minus,
  Trash2, Package, CheckCircle, QrCode, ChevronRight, ChevronLeft,
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

export default function CustomersView({ theme }: { theme: string }) {
  const isDark = theme === 'dark';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [merchantSettings, setMerchantSettings] = useState<any>(null);

  // Quick order form
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

  // SSE for real-time customer list + pending orders
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

  // Load all orders once (and after mutations)
  const refreshOrders = useCallback(async () => {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setAllOrders(data);
    }
  }, []);

  useEffect(() => { refreshOrders(); }, [refreshOrders]);

  // Load products and settings for quick order modal
  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setProducts(d);
    }).catch(() => {});
    fetch('/api/settings').then(r => r.json()).then(s => {
      setMerchantSettings(s);
      setQoCostCurrency(s.importCurrency || 'KRW');
    }).catch(() => {});
  }, []);

  // Poll messages when customer is selected
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

  // Theme helpers
  const s = {
    bg: isDark ? 'bg-[#0f1117]' : 'bg-gray-50',
    surface: isDark ? 'bg-[#161925]' : 'bg-white',
    border: isDark ? 'border-[#1f2335]' : 'border-gray-200',
    text: isDark ? 'text-white' : 'text-gray-900',
    muted: isDark ? 'text-gray-400' : 'text-gray-500',
    hover: isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50',
    input: isDark
      ? 'bg-[#1e2433] border-[#2a3050] text-white placeholder-gray-600'
      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400',
  };

  const customerOrders = selectedCustomer
    ? allOrders.filter(o => o.lineUserId === selectedCustomer.userId)
    : [];
  const activeOrders = customerOrders.filter(o => ['pending', 'paid'].includes(o.status));
  const parcelOrders = customerOrders.filter(o => o.status === 'preparing');

  const filteredProducts = products.filter(p => {
    const q = qoSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.brand?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className={`flex h-full overflow-hidden ${s.bg}`}>
      {/* Narrow customer avatar sidebar */}
      <aside className={`w-14 flex-shrink-0 border-r ${s.border} ${s.surface} flex flex-col items-center py-3 gap-2 overflow-y-auto`}>
        {customers.length === 0 ? (
          <div className={`text-center px-1 pt-2 ${s.muted}`}>
            <MessageCircle size={20} className="mx-auto opacity-30" />
          </div>
        ) : customers.map(c => (
          <button
            key={c._id}
            onClick={() => selectCustomer(c)}
            title={c.displayName}
            className={`relative w-9 h-9 rounded-full flex-shrink-0 transition-all ${
              selectedCustomer?._id === c._id ? 'ring-2 ring-green-500 ring-offset-1' : 'opacity-70 hover:opacity-100'
            }`}
          >
            {c.pictureUrl ? (
              <img src={c.pictureUrl} alt={c.displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                {(c.displayName || '?')[0]}
              </div>
            )}
            {c.unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-0.5">
                {c.unreadCount > 9 ? '9+' : c.unreadCount}
              </span>
            )}
          </button>
        ))}
      </aside>

      {/* Main orders panel */}
      {!selectedCustomer ? (
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center ${s.muted}`}>
            <MessageCircle size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Select a customer to view their orders and chat</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Customer header */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${s.border} ${s.surface} flex-shrink-0`}>
              <div className="flex items-center gap-3">
                {selectedCustomer.pictureUrl ? (
                  <img src={selectedCustomer.pictureUrl} className="w-8 h-8 rounded-full" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                    {(selectedCustomer.displayName || '?')[0]}
                  </div>
                )}
                <div>
                  <h2 className={`font-semibold text-sm ${s.text}`}>{selectedCustomer.displayName || 'Unknown'}</h2>
                  <p className={`text-xs ${s.muted}`}>LINE Customer</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-xl text-xs font-medium"
                >
                  <ShoppingCart size={12} /> Quick Chat Order
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-medium"
                >
                  <Plus size={12} /> Add Parcel
                </button>
              </div>
            </div>

            {/* Orders content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Active orders */}
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${s.muted} mb-3`}>
                  Active Orders (Awaiting Fulfillment)
                </p>
                {activeOrders.length === 0 && parcelOrders.length === 0 ? (
                  <p className={`text-sm ${s.muted}`}>No active orders</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parcelOrders.map(order => (
                      <OrderCard
                        key={order._id} order={order} variant="parcel" isDark={isDark} s={s}
                        onDelete={() => deleteOrder(order._id)}
                      />
                    ))}
                    {activeOrders.map(order => (
                      <OrderCard
                        key={order._id} order={order} variant="active" isDark={isDark} s={s}
                        onDelete={() => deleteOrder(order._id)}
                        onSendQR={() => sendQR(order._id)}
                        onMarkPaid={() => markPaid(order._id)}
                        onMoveToParcel={() => patchOrder(order._id, { status: 'preparing' })}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery address */}
              <AddressSection
                customer={selectedCustomer} isDark={isDark} s={s}
                onAdd={addAddress}
              />

              {/* Parcel section with tracking */}
              {parcelOrders.length > 0 && (
                <ParcelSection
                  orders={parcelOrders} isDark={isDark} s={s}
                  onPatch={patchOrder}
                  onMarkShipped={(id) => patchOrder(id, { status: 'shipped' })}
                />
              )}
            </div>
          </div>

          {/* Collapsible chat panel */}
          <div className={`flex-shrink-0 flex border-l ${s.border} transition-all duration-200 ${chatOpen ? 'w-72' : 'w-8'}`}>
            <button
              onClick={() => setChatOpen(v => !v)}
              className={`w-8 flex-shrink-0 flex items-center justify-center ${s.muted} ${s.hover} border-r ${s.border}`}
            >
              {chatOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            {chatOpen && (
              <div className={`flex-1 flex flex-col min-w-0 ${s.surface}`}>
                <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${s.border} flex-shrink-0`}>
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {(selectedCustomer.displayName || '?')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${s.text}`}>{selectedCustomer.displayName}</p>
                    <p className={`text-[10px] ${s.muted}`}>LINE Chat</p>
                  </div>
                  <button className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${s.border} ${s.muted} text-[10px]`}>
                    Mark as Read
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.map(msg => (
                    <div key={msg._id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                      {msg.sender === 'system' ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{msg.text}</span>
                      ) : (
                        <div className={`max-w-[85%] px-2.5 py-1.5 rounded-2xl text-xs ${
                          msg.sender === 'admin'
                            ? 'bg-green-500 text-white rounded-br-sm'
                            : isDark ? 'bg-white/10 text-gray-100 rounded-bl-sm' : 'bg-white shadow-sm text-gray-900 rounded-bl-sm'
                        }`}>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                          <p className={`text-[9px] mt-0.5 ${msg.sender === 'admin' ? 'text-green-100' : s.muted}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className={`text-[11px] text-center ${s.muted} pt-4`}>No messages yet</p>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 border-t ${s.border} flex-shrink-0`}>
                  <input
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message..."
                    className={`flex-1 text-xs rounded-xl px-2.5 py-2 border outline-none ${s.input}`}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick Order Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`${s.surface} rounded-2xl shadow-xl w-full max-w-md`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${s.border}`}>
              <h3 className={`font-semibold text-sm ${s.text}`}>Quick Chat Order</h3>
              <button onClick={() => setShowModal(false)} className={s.muted}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className={`text-xs ${s.muted}`}>Customer: <span className={`font-medium ${s.text}`}>{selectedCustomer.displayName}</span></p>

              <div className="flex gap-2">
                {(['manual', 'catalog'] as const).map(m => (
                  <button key={m} onClick={() => setQoMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${qoMode === m ? 'bg-green-500 text-white' : isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {m}
                  </button>
                ))}
              </div>

              {qoMode === 'manual' ? (
                <div>
                  <label className={`block text-xs font-medium mb-1 ${s.muted}`}>Product name</label>
                  <input value={qoName} onChange={e => setQoName(e.target.value)}
                    placeholder="e.g. [Goyard] Boheme Hobo - Linen"
                    className={`w-full text-sm rounded-xl px-3 py-2 border outline-none ${s.input}`} />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${s.muted}`} />
                    <input value={qoSearch} onChange={e => setQoSearch(e.target.value)} placeholder="Search products..."
                      className={`w-full text-sm rounded-xl pl-8 pr-3 py-2 border outline-none ${s.input}`} />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border overflow-hidden" style={{ border: isDark ? '1px solid #2a3050' : '1px solid #e5e7eb' }}>
                    {filteredProducts.slice(0, 15).map(p => (
                      <button key={p._id} onClick={() => { setQoSelected(p); setQoPrice(String(p.price)); }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          qoSelected?._id === p._id ? 'bg-green-500 text-white' : s.hover + ' ' + s.text
                        }`}>
                        <span className="truncate">{p.name}</span>
                        <span className="ml-2 flex-shrink-0">฿{p.price.toLocaleString()}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className={`text-xs text-center py-3 ${s.muted}`}>No products found</p>
                    )}
                  </div>
                </div>
              )}

              {/* Cost price row */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className={`block text-xs font-medium mb-1 ${s.muted}`}>Cost ({qoCostCurrency})</label>
                  <input type="number" value={qoCostPrice} onChange={e => setQoCostPrice(e.target.value)} placeholder="0"
                    className={`w-full text-sm rounded-xl px-3 py-2 border outline-none ${s.input}`} />
                </div>
                <div className="flex-shrink-0">
                  <label className={`block text-xs font-medium mb-1 ${s.muted}`}>Currency</label>
                  <select
                    value={qoCostCurrency}
                    onChange={e => setQoCostCurrency(e.target.value)}
                    className={`text-sm rounded-xl px-2 py-2 border outline-none ${s.input}`}
                    style={{ height: 42 }}
                  >
                    {COST_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Sold price + qty row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-xs font-medium mb-1 ${s.muted}`}>
                    Sold ({merchantSettings?.localCurrency || 'THB'})
                  </label>
                  <input type="number" value={qoPrice} onChange={e => setQoPrice(e.target.value)} placeholder="0"
                    className={`w-full text-sm rounded-xl px-3 py-2 border outline-none ${s.input}`} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${s.muted}`}>Qty</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button onClick={() => setQoQty(q => Math.max(1, q - 1))}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${isDark ? 'border-[#2a3050]' : 'border-gray-200'}`}><Minus size={12} /></button>
                    <span className={`w-7 text-center text-sm font-semibold ${s.text}`}>{qoQty}</span>
                    <button onClick={() => setQoQty(q => q + 1)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${isDark ? 'border-[#2a3050]' : 'border-gray-200'}`}><Plus size={12} /></button>
                  </div>
                </div>
              </div>

              {/* Rate hint */}
              {qoCostPrice && parseFloat(qoCostPrice) > 0 && (
                <p className={`text-[10px] ${s.muted}`}>
                  Rate: 1 {qoCostCurrency} = {merchantSettings?.krwRate ?? '?'} {merchantSettings?.localCurrency || 'THB'}
                  {merchantSettings?.useAutoRate && ' · live rate applied on save'}
                </p>
              )}

              <button
                disabled={qoSubmitting || (qoMode === 'manual' ? !qoName.trim() : !qoSelected)}
                onClick={submitQuickOrder}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold text-sm"
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

function OrderCard({ order, variant, isDark, s, onDelete, onSendQR, onMarkPaid, onMoveToParcel }: {
  order: Order; variant: 'active' | 'parcel'; isDark: boolean; s: any;
  onDelete: () => void; onSendQR?: () => void; onMarkPaid?: () => void; onMoveToParcel?: () => void;
}) {
  return (
    <div className={`${s.surface} rounded-xl border ${s.border} p-3`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        {variant === 'parcel' ? (
          <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
            ✓ In Parcel (Not Shipped)
          </span>
        ) : (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${
            order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {order.status === 'paid' ? '✓ Paid' : 'New Order Request'}
          </span>
        )}
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 size={13} /></button>
      </div>
      <p className={`font-semibold text-sm leading-snug ${s.text}`}>{order.product}</p>
      <p className={`text-xs mt-0.5 ${s.muted}`}>{order.soldCurrency || 'THB'} {order.soldTHB?.toLocaleString()} · {order.displayName}</p>
      {variant === 'active' && (
        <div className="flex flex-wrap gap-1 mt-2">
          {onMoveToParcel && (
            <button onClick={onMoveToParcel} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${s.border} ${s.hover}`}>
              <Package size={10} /> Move to Parcel →
            </button>
          )}
          {onSendQR && !order.paymentQrSent && (
            <button onClick={onSendQR} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${s.border} ${s.hover}`}>
              <QrCode size={10} /> Send QR
            </button>
          )}
          {onMarkPaid && order.status === 'pending' && (
            <button onClick={onMarkPaid} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-green-300 text-green-700 hover:bg-green-50">
              <CheckCircle size={10} /> Mark Paid
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddressSection({ customer, isDark, s, onAdd }: {
  customer: Customer; isDark: boolean; s: any; onAdd: (addr: string) => void;
}) {
  const [newAddr, setNewAddr] = useState('');
  return (
    <div className={`${s.surface} rounded-xl border ${s.border} p-4`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${s.muted} mb-3`}>Select Delivery Address (Saved Addresses)</p>
      <div className="space-y-2">
        {(customer.addresses || []).map((addr, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${s.border}`}>
            <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0">
              {i === 0 && <div className="w-2 h-2 rounded-full bg-green-500" />}
            </div>
            <span className={`text-sm flex-1 ${s.text}`}>{addr}</span>
            <button className={`text-xs ${s.muted} hover:text-red-500`} onClick={() => {}}>×</button>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={newAddr} onChange={e => setNewAddr(e.target.value)}
            placeholder="Add new address..."
            className={`flex-1 text-sm rounded-xl px-3 py-2 border outline-none ${s.input}`}
          />
          <button
            onClick={() => { if (newAddr.trim()) { onAdd(newAddr); setNewAddr(''); } }}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium whitespace-nowrap"
          >
            + Add Address
          </button>
        </div>
      </div>
    </div>
  );
}

function ParcelSection({ orders, isDark, s, onPatch, onMarkShipped }: {
  orders: Order[]; isDark: boolean; s: any;
  onPatch: (id: string, patch: object) => void; onMarkShipped: (id: string) => void;
}) {
  const [trackingMap, setTrackingMap] = useState<Record<string, { tracking: string; courier: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function getT(o: Order) {
    return trackingMap[o._id] ?? { tracking: o.tracking || '', courier: o.courier || '' };
  }

  async function saveTracking(o: Order) {
    const { tracking, courier } = getT(o);
    setSaving(o._id);
    await onPatch(o._id, { tracking, courier });
    setSaving(null);
  }

  return (
    <div className={`rounded-xl border-2 border-dashed ${isDark ? 'border-[#2a3050]' : 'border-gray-300'} p-4 space-y-3`}>
      {orders.map((order, idx) => {
        const t = getT(order);
        const parcelId = order._id.slice(-4).toUpperCase();
        return (
          <div key={order._id}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                Parcel ID: {parcelId}
              </span>
              <div className="flex gap-2">
                <button className={`text-xs ${s.muted} ${s.hover} px-2 py-0.5 rounded`}>+ Add Item</button>
                <button className="text-xs text-red-500 hover:text-red-600 px-2 py-0.5 rounded">Delete Parcel</button>
              </div>
            </div>

            <div className={`${s.surface} border ${s.border} rounded-xl p-3`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${s.muted} mb-2`}>Item Details</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
                <div>
                  <span className={s.muted}>Product Name</span>
                  <span className="block font-medium">{order.product}</span>
                </div>
                <div>
                  <span className={s.muted}>QTY</span>
                  <span className="block font-medium">{order.quantity}</span>
                </div>
                <div>
                  <span className={s.muted}>Sold ({order.soldCurrency || 'THB'})</span>
                  <span className="block font-medium">{order.soldTHB?.toLocaleString()}</span>
                </div>
                <div>
                  <span className={s.muted}>Cost ({order.costCurrency || 'KRW'})</span>
                  <span className="block font-medium">{order.costKRW || 0}</span>
                </div>
              </div>
              <p className="text-xs font-bold text-green-500">
                Profit: {order.soldCurrency || 'THB'} {((order.soldTHB || 0) - (order.costTHB || 0)).toLocaleString('en', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className={`text-[10px] uppercase tracking-wide ${s.muted}`}>Tracking No.</label>
                <input value={t.tracking}
                  onChange={e => setTrackingMap(m => ({ ...m, [order._id]: { ...getT(order), tracking: e.target.value } }))}
                  placeholder="Enter tracking..."
                  className={`w-full text-xs rounded-lg px-2 py-1.5 border outline-none mt-0.5 ${s.input}`}
                />
              </div>
              <div>
                <label className={`text-[10px] uppercase tracking-wide ${s.muted}`}>Courier</label>
                <input value={t.courier}
                  onChange={e => setTrackingMap(m => ({ ...m, [order._id]: { ...getT(order), courier: e.target.value } }))}
                  placeholder="Flash, Kerry..."
                  className={`w-full text-xs rounded-lg px-2 py-1.5 border outline-none mt-0.5 ${s.input}`}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => saveTracking(order)} disabled={saving === order._id}
                className="text-[11px] font-medium text-green-500 hover:text-green-600 disabled:opacity-50">
                {saving === order._id ? 'Saving...' : 'Save Tracking'}
              </button>
              <button onClick={() => onMarkShipped(order._id)}
                className="text-[11px] font-medium text-blue-500 hover:text-blue-600">
                Mark Shipped →
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

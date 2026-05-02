"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Settings as SettingsIcon, 
  BarChart3, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Plus, 
  Trash2, 
  BarChart,
  ChevronDown,
  X,
  Printer,
  Bell,
  Clock,
  MessageCircle,
  CheckCircle2,
  History,
  Copy,
  Send,
  RefreshCw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// View Components
import ProductManagement from '@/components/ProductManagement';
import SettingsView from '@/components/SettingsView';
import ReportsView from '@/components/ReportsView';
import ShopOrdersView from '@/components/ShopOrdersView';
import SetupView from '@/components/SetupView';
import liff from '@line/liff';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type = 'confirm' }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className={`w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-[#00b90011] text-[#00b900]'}`}>
            {type === 'danger' ? <Trash2 size={32} /> : <Package size={32} />}
          </div>
          <h3 className="text-xl font-bold text-[#1a1d2e] mb-2">{title}</h3>
          <p className="text-[#8b92ad] text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-[#f4f6f9]">
          <button 
            onClick={onCancel}
            className="flex-1 py-5 text-sm font-bold text-[#8b92ad] hover:bg-[#fafbfc] transition-colors border-r border-[#f4f6f9]"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-5 text-sm font-bold transition-colors hover:opacity-90 ${type === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-[#00b900] hover:bg-[#00b90008]'}`}
          >
            {type === 'alert' ? 'OK' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}


function ChatHistory({ userId, customerName = "Customer" }: { userId: string, customerName?: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return;
    try {
      const secret = localStorage.getItem('admin_secret') || '';
      const res = await fetch(`/api/messages/${userId}`, { 
        signal,
        headers: { 'x-admin-secret': secret }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setMessages([]);
    
    const secret = localStorage.getItem('admin_secret') || '';
    const es = new EventSource(`/api/messages/${userId}/stream?secret=${encodeURIComponent(secret)}`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setMessages(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[SSE Messages] Parse error:', err);
      }
    };

    es.onerror = () => {
      console.warn('[SSE Messages] Connection error.');
      // Optional fallback logic could be placed here
    };

    return () => {
      es.close();
    };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Group messages by date
  const grouped: Array<{ type: 'date'; text: string } | any> = [];
  let lastDate = '';
  for (const m of messages) {
    const dateStr = new Date(m.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (dateStr !== lastDate) {
      grouped.push({ type: 'date', text: dateStr });
      lastDate = dateStr;
    }
    grouped.push(m);
  }

  const initials = customerName.charAt(0).toUpperCase();

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const textToSend = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    // Optimistic UI update
    const optimisticMsg = {
      _id: 'temp-' + Date.now(),
      lineUserId: userId,
      sender: 'admin',
      text: textToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
        },
        body: JSON.stringify({ userId, text: textToSend })
      });
      if (!res.ok) throw new Error('Failed to send');
      
      // Fetch fresh messages to get the real DB _id
      await fetchMessages();
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
      setSendError("Unable to send message (Database/API disconnected).");
      setTimeout(() => setSendError(""), 5000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#f4f5f7]">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-[#e2e5ef] bg-white flex items-center gap-3 shadow-sm z-10 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#eab308] text-[#1a1d2e] flex items-center justify-center font-bold text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-[#1a1d2e] truncate">{customerName}</div>
          <div className="text-[10px] text-[#00b900] font-semibold">LINE Chat</div>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#00b900] flex-shrink-0" title="Live polling active" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <div className="text-[#8b92ad] text-sm">Loading messages...</div>
          </div>
        )}

        {!isLoading && grouped.length === 0 && (
          <div className="flex flex-col justify-center items-center h-full gap-3 text-[#8b92ad]">
            <MessageCircle size={36} className="opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs text-center opacity-70">Messages will appear here once the webhook receives them from LINE.</p>
          </div>
        )}

        {!isLoading && grouped.map((m, i) => {
          if (m.type === 'date') {
            return (
              <div key={`date-${i}`} className="flex justify-center my-4">
                <span className="bg-[#b3b9c4] text-white text-[10px] font-bold px-3 py-1 rounded-full opacity-80">
                  {m.text}
                </span>
              </div>
            );
          }

          const timeStr = new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

          if (m.sender === 'admin') {
            return (
              <div key={m._id || i} className="flex justify-end items-end gap-2 mb-2">
                <span className="text-[10px] text-[#8b92ad] mb-1">{timeStr}</span>
                <div className="bg-[#a7e4b5] text-[#1a1d2e] max-w-[75%] px-4 py-2 rounded-2xl rounded-tr-sm text-sm shadow-sm">
                  {m.text}
                </div>
              </div>
            );
          }

          if (m.sender === 'user') {
            return (
              <div key={m._id || i} className="flex justify-start items-end gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#1a1d2e] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
                  {initials}
                </div>
                <div className="bg-white border border-[#e2e5ef] text-[#1a1d2e] max-w-[75%] px-4 py-2 rounded-2xl rounded-tl-sm text-sm shadow-sm">
                  {m.text}
                </div>
                <span className="text-[10px] text-[#8b92ad] mb-1">{timeStr}</span>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Area */}
      <div className="bg-white border-t border-[#e2e5ef] p-3 flex-shrink-0 z-10">
        {sendError && (
          <div className="mb-2 text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg text-center animate-in fade-in slide-in-from-bottom-2 border border-red-100">
            {sendError}
          </div>
        )}
        <form 
          onSubmit={handleSend}
          className="bg-[#f4f5f7] rounded-3xl flex items-end px-4 py-2 border border-[#e2e5ef] focus-within:border-[#00b900] focus-within:ring-1 focus-within:ring-[#00b900] transition-all"
        >
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none resize-none py-2 text-sm text-[#1a1d2e] max-h-32 min-h-[40px] leading-tight"
            rows={1}
            disabled={isSending}
            style={{ overflowY: newMessage.split('\n').length > 3 ? 'auto' : 'hidden' }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="ml-2 mb-1 w-8 h-8 rounded-full bg-[#00b900] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:bg-[#b3b9c4] transition-colors"
          >
            <Send size={14} className={isSending ? "animate-pulse" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}


function QuickOrderModal({ isOpen, products, onConfirm, onCancel }: any) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [price, setPrice] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <h3 className="text-xl font-bold text-[#1a1d2e] mb-6">Manual Quick Order</h3>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">SELECT PRODUCT</label>
              <select 
                className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900] bg-white"
                onChange={(e) => {
                  const p = products.find((prod: any) => prod._id === e.target.value);
                  setSelectedProduct(p);
                  setPrice(p?.price || 0);
                }}
              >
                <option value="">-- Choose Product --</option>
                {products.map((p: any) => (
                  <option key={p._id} value={p._id}>{p.name} (฿{p.price})</option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div>
                <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">FINAL PRICE (THB)</label>
                <input 
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value))}
                  className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm font-bold text-[#00b900] outline-none focus:border-[#00b900]"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 py-4 text-sm font-bold text-[#8b92ad] bg-[#f8f9fc] rounded-2xl hover:bg-[#f0f2f5] transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={!selectedProduct}
              onClick={() => onConfirm(selectedProduct, price)}
              className="flex-1 py-4 text-sm font-bold text-white bg-[#00b900] rounded-2xl shadow-lg shadow-[#00b90033] hover:opacity-90 disabled:opacity-50 transition-all"
            >
              Log Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ order, krwRate, onUpdate }: { order: any, krwRate: number, onUpdate: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editData, setEditData] = useState({ 
    soldTHB: order.soldTHB, 
    costKRW: order.costKRW,
    rateUsed: order.rateUsed || krwRate
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const profit = editData.soldTHB - (editData.costKRW * editData.rateUsed);
    const res = await fetch(`/api/orders/${order._id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
      },
      body: JSON.stringify({ ...editData, profit })
    });
    setIsSaving(false);
    setShowConfirm(false);
    if (res.ok) {
      setIsExpanded(false);
      onUpdate();
    }
  };

  const handleReprint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print Label</title></head>
          <body style="font-family: sans-serif; padding: 20px; text-align: center;">
            <div style="border: 2px solid #000; padding: 20px; border-radius: 10px;">
              <h2>SHIPPING LABEL (REPRINT)</h2>
              <hr />
              <div style="text-align: left; margin: 20px 0;">
                <strong>To:</strong> ${order.displayName}<br/>
                <strong>Address:</strong> ${order.address || 'N/A'}<br/>
                <strong>Tracking:</strong> ${order.tracking}<br/>
                <strong>Courier:</strong> ${order.courier}
              </div>
            </div>
            <script>window.print(); setTimeout(() => window.close(), 500);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e2e5ef] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer group"
      >
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1"
        >
          <div className="bg-[#f8f9fc] p-2 rounded-xl group-hover:bg-[#00b90011] transition-colors">
            <Package size={18} className="text-[#8b92ad] group-hover:text-[#00b900]" />
          </div>
          <div>
            <div className="font-bold text-sm">{order.product}</div>
            <div className="text-[10px] text-[#8b92ad] flex items-center gap-2">
              {new Date(order.createdAt).toLocaleDateString()} • {order.tracking}
              <span className="bg-[#f0f2f5] px-1.5 py-0.5 rounded text-[8px] font-bold">@{editData.rateUsed}</span>
              <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); handleReprint(); }}
            className="p-2 text-[#8b92ad] hover:text-[#00b900] hover:bg-[#00b90011] rounded-lg transition-all"
            title="Reprint Label"
          >
            <Printer size={16} />
          </button>
          <div className="text-right">
            <div className="text-sm font-bold text-[#00b900]">฿{order.profit.toLocaleString()}</div>
            <div className="text-[10px] text-[#8b92ad]">Sales: ฿{order.soldTHB.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#f4f6f9] bg-[#fafbfc]">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[9px] font-bold text-[#8b92ad] uppercase mb-1 block">Sold (THB)</label>
              <input 
                type="number" 
                step="0.01"
                value={editData.soldTHB}
                onChange={(e) => setEditData({...editData, soldTHB: parseFloat(e.target.value)})}
                className="w-full border border-[#e2e5ef] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00b900]"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#8b92ad] uppercase mb-1 block">Cost (KRW)</label>
              <input 
                type="number" 
                step="0.01"
                value={editData.costKRW}
                onChange={(e) => setEditData({...editData, costKRW: parseFloat(e.target.value)})}
                className="w-full border border-[#e2e5ef] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00b900]"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#8b92ad] uppercase mb-1 block">Rate</label>
              <input 
                type="number" 
                step="0.0001"
                value={editData.rateUsed}
                onChange={(e) => setEditData({...editData, rateUsed: parseFloat(e.target.value)})}
                className="w-full border border-[#e2e5ef] rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00b900]"
              />
            </div>
          </div>
          <button 
            onClick={() => setShowConfirm(true)}
            disabled={isSaving}
            className="w-full bg-[#1a1d2e] text-white py-2 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Update Prices'}
          </button>
        </div>
      )}

      <ConfirmModal 
        isOpen={showConfirm}
        title="Update Prices?"
        message="Are you sure you want to update this order? Profit will be recalculated using the current values."
        onConfirm={handleSave}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

export default function AdminDashboard() {
  const [liffState, setLiffState] = useState<'loading' | 'admin' | 'customer' | 'unauthorized'>('loading');
  const [activeTab, setActiveTab] = useState('orders');
  const [krwRate, setKrwRate] = useState(0.026);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGlobalRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    await new Promise(r => setTimeout(r, 600));
    setIsRefreshing(false);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [liveRate, setLiveRate] = useState(0.0221); // Simulated live rate
  const [chatSidebarWidth, setChatSidebarWidth] = useState(420);
  const isResizingChat = useRef(false);
  const rafId = useRef<number | null>(null);
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const chatSidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('admin_secret');
    if (saved) setAdminSecret(saved);
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingChat.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    if (isResizingChat.current) {
      isResizingChat.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizingChat.current) return;
    if (rafId.current !== null) return;

    rafId.current = requestAnimationFrame(() => {
      const containerRight = document.body.clientWidth;
      const newWidth = containerRight - e.clientX;
      if (newWidth < 200) {
        setIsChatOpen(false);
        stopResizing();
      } else if (newWidth <= 800) {
        setChatSidebarWidth(newWidth);
      }
      rafId.current = null;
    });
  }, [stopResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    if (liffState !== 'admin') return;

    const secret = localStorage.getItem('admin_secret') || '';
    const headers = { 'x-admin-secret': secret };
    
    fetch('/api/shop-info', { headers }).then(r => r.json()).then(data => setShopInfo(data)).catch(console.error);
    fetch('/api/rate', { headers }).then(r => r.ok ? r.json() : { rate: 0.026 }).then(data => setKrwRate(data?.rate || 0.026)).catch(console.error);

    // --- SSE Stream for real-time customer & order updates ---
    // One persistent connection per tab instead of N requests/5s
    let es: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      es = new EventSource(`/api/stream?secret=${encodeURIComponent(secret)}`);

      es.onmessage = (event) => {
        try {
          const { type, customers: c } = JSON.parse(event.data);
          if (type === 'init' || type === 'update') {
            if (Array.isArray(c)) setCustomers(c);
          }
        } catch (err) {
          console.error('[SSE] Parse error:', err);
        }
      };

      es.onerror = () => {
        console.warn('[SSE] Connection error, falling back to polling.');
        es?.close();
        es = null;
        // Fallback: poll every 10s if SSE is unavailable
        if (!fallbackInterval) {
          fallbackInterval = setInterval(() => {
            fetch('/api/customers', { headers }).then(r => r.ok ? r.json() : []).then(data => setCustomers(Array.isArray(data) ? data : [])).catch(() => {});
          }, 10000);
        }
      };
    };

    connectSSE();

    const rateInterval = setInterval(() => {
      setLiveRate(prev => 0.0221 + (Math.random() * 0.0005 - 0.00025));
    }, 3000);

    return () => {
      es?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      clearInterval(rateInterval);
    };
  }, [liffState]);

  // Debounced KRW Rate Sync to DB
  useEffect(() => {
    if (liffState !== 'admin') return;
    const timer = setTimeout(async () => {
      try {
        const secret = localStorage.getItem('admin_secret') || '';
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-secret': secret
          },
          body: JSON.stringify({ krwRate })
        });
      } catch (err) {
        console.error('Failed to sync KRW rate:', err);
      }
    }, 1000); // 1s debounce
    return () => clearTimeout(timer);
  }, [krwRate, liffState]);

  const initLiffRouter = useCallback(async () => {
    try {
      const secret = localStorage.getItem('admin_secret');
      if (!secret) {
        window.location.href = '/';
        return;
      }

      const headers = { 'x-admin-secret': secret || '' };
      
      // Verify the secret by testing a protected endpoint
      const verifyRes = await fetch('/api/customers', { headers, cache: 'no-store' });
      if (verifyRes.status === 401) {
        localStorage.removeItem('admin_secret');
        window.location.href = '/';
        return;
      }

      const res = await fetch('/api/shop-info', { cache: 'no-store' });
      const data = await res.json();
      
      // If system not configured, go to setup (which is on root /)
      if (!data.liffId) {
        window.location.href = '/';
        return;
      }

      setShopInfo(data);
      
      // 3. Init LIFF if we have an ID
      if (data.liffId) {
        try {
          await liff.init({ liffId: data.liffId });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            if (data.adminLineId && profile.userId !== data.adminLineId) {
              console.warn("LIFF User ID mismatch. Redirecting to shop.");
              window.location.href = '/shop';
              return;
            }
          } else {
            console.log("LIFF not logged in. Continuing with secret auth only.");
          }
        } catch (liffErr) {
          console.error("LIFF initialization failed. Continuing with secret auth only:", liffErr);
        }
      }

      setLiffState('admin');
    } catch (err) {
      console.error("Dashboard primary init failed:", err);
      // Only redirect to root if we don't have a valid session at all
      if (err instanceof Error && err.message.includes("401")) {
         window.location.href = '/';
      } else {
         // If it's just a network error or something else, stay on the page but show an error maybe?
         // For now, let's just let it be and see if it renders
         setLiffState('admin');
      }
    }
  }, []);

  useEffect(() => {
    initLiffRouter();
  }, [initLiffRouter]);

  if (liffState === 'loading') {
    return (
      <div className="h-screen w-full bg-[#1a1d2e] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00b900]/20 border-t-[#00b900] rounded-full animate-spin mb-6"></div>
        <p className="text-[#8b92ad] text-xs font-bold tracking-widest uppercase animate-pulse">Initializing Secure Session...</p>
      </div>
    );
  }

  if (liffState === 'admin') {
    return (
      <div className="flex flex-col h-screen bg-[#f4f6f9] text-[#1a1d2e] overflow-hidden">
        {/* Topbar */}
        <div className="bg-white h-16 border-b border-[#e2e5ef] flex items-center justify-between px-4 shadow-sm z-50">
          <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
             <span className="text-[#00b900]">✦</span> {shopInfo?.name || "Loading..."}
          </div>
          
          <nav className="flex gap-4">
            <TabButton icon={<Package size={18}/>} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
            <TabButton icon={<ShoppingCart size={18}/>} label="Shop Orders" active={activeTab === 'shop-orders'} onClick={() => setActiveTab('shop-orders')} />
            <TabButton icon={<Package size={18}/>} label="Products" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
            <TabButton icon={<BarChart3 size={18}/>} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
            <TabButton icon={<SettingsIcon size={18}/>} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#fffbe6] border border-[#ffe58f] px-4 py-1.5 rounded-full flex items-center gap-3 text-sm font-bold">
            <span className="text-[#1a1d2e] opacity-80 whitespace-nowrap">1 KRW =</span>
            <input 
              type="number" 
              step="0.0001" 
              value={krwRate} 
              onChange={(e) => setKrwRate(parseFloat(e.target.value))}
              className="bg-white border border-[#d9d9d9] rounded-lg w-20 px-2 py-0.5 text-center outline-none focus:ring-2 focus:ring-[#00b900] transition-all"
            />
            <span className="text-[#856404] opacity-50 font-medium">({liveRate.toFixed(4)})</span>
            <div className="flex gap-1 ml-2">
              <button className="bg-[#00b900] text-white px-2.5 py-1 rounded-md text-[10px] font-black tracking-tight">TH</button>
              <button className="bg-[#f0f0f0] text-[#888] px-2.5 py-1 rounded-md text-[10px] font-black tracking-tight">EN</button>
            </div>
          </div>
          {/* Global Refresh Button */}
          <button
            id="global-refresh-btn"
            onClick={handleGlobalRefresh}
            title="Refresh data"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#e2e5ef] bg-white text-[#8b92ad] hover:text-[#00b900] hover:border-[#00b900] hover:bg-[#00b90008] transition-all shadow-sm"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-[#00b900]' : ''} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-stretch overflow-hidden relative">
        {/* Sidebar (Only shown in Orders tab) */}
        {activeTab === 'orders' && (
          <div 
            className={cn(
              "bg-white border-r border-[#e2e5ef] flex flex-col transition-all duration-300 relative",
              isSidebarCollapsed ? "w-16" : "w-[300px]"
            )}
          >
            {!isSidebarCollapsed && (
              <div className="p-3 border-b border-[#e2e5ef]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search customers..." 
                    className="w-full bg-[#f4f6f9] border-none rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#00b900] transition-all outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
               {customers.filter((c: any) => c.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map((customer: any) => (
                 <CustomerItem 
                    key={customer.userId} 
                    customer={customer} 
                    active={selectedCustomer?.userId === customer.userId}
                    collapsed={isSidebarCollapsed}
                    onClick={() => { 
                      if (selectedCustomer?.userId !== customer.userId) {
                        setSelectedCustomer(customer); 
                      }
                      setIsChatOpen(true); 
                    }}
                 />
               ))}
            </div>

            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute bottom-6 right-[-15px] bg-white border border-[#e2e5ef] rounded-full p-1.5 shadow-md hover:bg-[#f9f9f9] transition-colors z-10"
            >
              {isSidebarCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
           {activeTab === 'orders' && <OrdersView customer={selectedCustomer} krwRate={krwRate} />}
           {activeTab === 'shop-orders' && <ShopOrdersView />}
           {activeTab === 'products' && <ProductManagement />}
           {activeTab === 'reports' && <ReportsView />}
           {activeTab === 'settings' && <SettingsView />}
        </main>
           
        {selectedCustomer && isChatOpen && (
          <div className="flex flex-row flex-shrink-0 z-20 relative" style={{ width: chatSidebarWidth }}>
            {/* Drag Handle */}
            <div
              className="w-1 flex-shrink-0 cursor-col-resize bg-[#e2e5ef] hover:bg-[#00b900] active:bg-[#00b900] transition-colors relative"
              onMouseDown={startResizing}
            >
              {/* Collapse Toggle Button */}
              <button
                onClick={() => setIsChatOpen(false)}
                className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 bg-white border border-[#e2e5ef] rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-[#f0f0f0] z-50"
                title="Close Chat"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {/* Chat Content */}
            <div ref={chatSidebarRef} className="flex flex-col flex-1 overflow-hidden bg-white shadow-xl border-l border-[#e2e5ef]">
              <ChatHistory userId={selectedCustomer.userId} customerName={selectedCustomer.displayName} />
            </div>
          </div>
        )}
        {/* Global Chat Toggle Button (when chat is closed but customer is selected) */}
        {selectedCustomer && !isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#1a1d2e] text-white p-3 rounded-l-xl shadow-2xl hover:pr-5 transition-all duration-200 z-50 flex items-center gap-2"
            title="Open Chat"
          >
            <MessageCircle size={18} />
            <ChevronLeft size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: any }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-1 py-1 border-b-2 transition-all duration-200 font-bold text-xs uppercase tracking-wider",
        active ? "border-[#00b900] text-[#1a1d2e]" : "border-transparent text-[#8b92ad] hover:text-[#1a1d2e]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CustomerItem({ customer, active, collapsed, onClick }: { customer: any, active: boolean, collapsed: boolean, onClick: any }) {
  if (collapsed) {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "p-3 flex justify-center cursor-pointer hover:bg-[#f9f9f9] transition-colors",
          active && "bg-[#e8f8e8] border-l-4 border-[#00b900]"
        )}
      >
        <img src={customer.pictureUrl} alt="" className="w-8 h-8 rounded-full bg-[#eee]" />
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={cn(
        "px-4 py-3 flex items-center gap-3 cursor-pointer border-b border-[#e2e5ef] hover:bg-[#f9f9f9] transition-colors",
        active && "bg-[#e8f8e8] border-l-4 border-[#00b900]"
      )}
    >
      <img 
        src={customer.pictureUrl} 
        alt={customer.displayName} 
        className="w-10 h-10 rounded-full bg-[#eee] object-cover" 
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.className = 'w-10 h-10 rounded-full bg-[#1a1d2e] text-white flex items-center justify-center text-sm font-bold';
          fallback.textContent = customer.displayName.charAt(0).toUpperCase();
          target.parentElement?.insertBefore(fallback, target);
        }}
      />
      <div className="flex-1 overflow-hidden">
        <div className="font-bold text-sm truncate">{customer.displayName}</div>
        <div className="text-[10px] text-[#8b92ad]">Last seen: {new Date(customer.lastSeen).toLocaleDateString()}</div>
      </div>
    </div>
  );
}

function OrdersView({ customer, krwRate }: { customer: any, krwRate: number }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [newAddress, setNewAddress] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [toast, setToast] = useState<{message: string, icon: string} | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [modal, setModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: null, type: 'confirm' });
  const [parcels, setParcels] = useState<any[]>([]);
  // Prevent refreshData from wiping manually-added parcels
  const hasSeededParcels = useRef(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, icon = '✨') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, icon });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const refreshData = async () => {
    if (!customer || isLocked.current) return;
    try {
      const r = await fetch('/api/customers/' + customer.userId, {
        headers: { 'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' }
      });
      const data = await r.json();
      
      // Double check lock before updating state
      if (isLocked.current) return;

      setCustomerData(data.customer);
      setOrders(data.orders || []);

      // Seed parcels from DB preparing orders only on first load.
      // Never wipe user-added parcels on subsequent refreshes.
      if (!hasSeededParcels.current && parcels.length === 0) {
        hasSeededParcels.current = true;
        const preparing = (data.orders || []).filter((o: any) => o.status === 'preparing');
        if (preparing.length > 0) {
          setParcels([{
            id: Date.now(),
            items: preparing.map((o: any) => ({
              id: Date.now() + Math.random(),
              orderId: o._id,
              name: o.product,
              sold: o.soldTHB,
              cost: o.costKRW || 0
            })),
            courier: '',
            tracking: ''
          }]);
        }
      }
    } catch (err) {
      console.error("Refresh data error:", err);
    }
  };

  useEffect(() => {
    const headers = { 'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' };
    fetch('/api/settings', { headers }).then(r => r.json()).then(data => setSettings(data));
    fetch('/api/products', { headers }).then(r => r.json()).then(data => setProducts(data));
    refreshData();
  }, [customer]);

  const handleAddAddress = async () => {
    if (!newAddress || !customer) return;
    
    // Lock background refreshes
    isLocked.current = true;
    
    const currentAddresses = customerData?.addresses || [];
    const updatedAddresses = [...currentAddresses, newAddress];
    
    // Optimistic UI
    setCustomerData((prev: any) => ({ ...prev, addresses: updatedAddresses }));
    setNewAddress('');

    try {
      const secret = typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '';
      const res = await fetch(`/api/customers/${customer.userId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': secret || ''
        },
        body: JSON.stringify({ addresses: updatedAddresses })
      });
      
      if (res.ok) {
        showToast('Address Added', '🏠');
      } else {
        setModal({ isOpen: true, title: 'Error', message: 'Failed to add address. Database might be disconnected.', type: 'alert', onConfirm: () => setModal({ ...modal, isOpen: false }) });
      }
    } catch (err) {
      setModal({ isOpen: true, title: 'Error', message: 'Network error. Please try again.', type: 'alert', onConfirm: () => setModal({ ...modal, isOpen: false }) });
    } finally {
      // Keep lock for a few more seconds to allow DB propagation
      setTimeout(() => {
        isLocked.current = false;
      }, 5000);
    }
  };

  const handleRemoveAddress = async (addrToRemove: string) => {
    if (!customer) return;
    
    setModal({
      isOpen: true,
      title: 'Remove Address?',
      message: `Are you sure you want to remove this address?\n${addrToRemove}`,
      type: 'danger',
      onConfirm: async () => {
        const updatedAddresses = (customerData?.addresses || []).filter((a: string) => a !== addrToRemove);
        try {
          const res = await fetch(`/api/customers/${customer.userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses: updatedAddresses })
          });
          if (res.ok) {
            const updated = await res.json();
            setCustomerData(updated);
            showToast('Address Removed', '🗑️');
          }
        } catch (err) {
          console.error("Remove address error:", err);
        }
        setModal({ ...modal, isOpen: false });
      },
      onCancel: () => setModal({ ...modal, isOpen: false })
    });
  };

  const addParcel = () => {
    isLocked.current = true;
    setTimeout(() => { isLocked.current = false; }, 3000); // 3s lock for local addition
    setParcels([...parcels, { 
      id: Date.now(), 
      items: [{ id: Date.now()+1, name: 'New Product', sold: 0, cost: 0 }], 
      courier: '', 
      tracking: '' 
    }]);
    showToast('Parcel Added');
  };

  const handleImportToParcel = async (order: any) => {
    if (order.status === 'preparing') return;
    
    setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'preparing' } : o));

    await fetch(`/api/orders/${order._id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
      },
      body: JSON.stringify({ status: 'preparing' })
    });

    const newItem = { id: Date.now(), name: order.product, sold: order.soldTHB, cost: order.costKRW, orderId: order._id };
    
    setParcels(prev => {
      const lastParcel = prev[prev.length - 1];
      if (lastParcel && !lastParcel.tracking && !lastParcel.courier) {
        return prev.map((p, idx) => idx === prev.length - 1 
          ? { ...p, items: [...p.items, newItem] } 
          : p
        );
      }
      return [...prev, {
        id: Date.now(),
        items: [newItem],
        courier: '',
        tracking: ''
      }];
    });

    showToast('In Parcel', '📦');
  };

  const removeParcel = (id: number) => {
    setModal({
      isOpen: true,
      title: 'Delete Parcel?',
      message: 'This will revert all items in this parcel back to Pending status.',
      type: 'danger',
      onConfirm: async () => {
        const parcel = parcels.find(p => p.id === id);
        if (parcel) {
          const orderIdsToRevert = parcel.items.map((i: any) => i.orderId).filter(Boolean);
          setOrders(prev => prev.map(o => orderIdsToRevert.includes(o._id) ? { ...o, status: 'pending' } : o));

          for (const item of parcel.items) {
            if (item.orderId) {
              await fetch(`/api/orders/${item.orderId}`, {
                method: 'PATCH',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
                },
                body: JSON.stringify({ status: 'pending' })
              });
            }
          }
        }
        setParcels(parcels.filter(p => p.id !== id));
        showToast('Parcel Deleted & Items Reverted', '🗑️');
        setModal({ ...modal, isOpen: false });
      },
      onCancel: () => setModal({ ...modal, isOpen: false })
    });
  };

  const removeItemFromParcel = (parcelId: number, itemId: number, orderId?: string) => {
    setModal({
      isOpen: true,
      title: 'Remove Item?',
      message: 'Remove this item from the parcel and revert to Pending?',
      type: 'confirm',
      onConfirm: async () => {
        if (orderId) {
          setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'pending' } : o));
          await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
            },
            body: JSON.stringify({ status: 'pending' })
          });
        }
        setParcels(parcels.map(p => p.id === parcelId ? {
          ...p,
          items: p.items.filter((i: any) => i.id !== itemId)
        } : p));
        showToast('Item Reverted to Pending', '↩️');
        setModal({ ...modal, isOpen: false });
      },
      onCancel: () => setModal({ ...modal, isOpen: false })
    });
  };

  const handleDeleteOrder = (order: any) => {
    setModal({
      isOpen: true,
      title: 'Delete Order Request?',
      message: order.status === 'preparing' 
        ? 'Warning: This order is currently in a parcel. Deleting it will also remove it from the active parcel. This action cannot be undone.'
        : 'Are you sure you want to delete this order request? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setOrders(prev => prev.filter(o => o._id !== order._id));
        if (order.status === 'preparing') {
          setParcels(prevParcels => prevParcels.map(p => ({
            ...p,
            items: p.items.filter((i: any) => i.orderId !== order._id)
          })));
        }

        await fetch(`/api/orders/${order._id}`, { 
          method: 'DELETE', 
          headers: { 'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' } 
        });
        showToast('Order Deleted', '🗑️');
        setModal({ ...modal, isOpen: false });
      },
      onCancel: () => setModal({ ...modal, isOpen: false })
    });
  };

  const handleQuickOrder = async (product: any, finalPrice: number) => {
    if (!customer) return;
    isLocked.current = true;
    try {
      const orderData = {
        lineUserId: customer.userId,
        displayName: customer.displayName,
        product: product.name,
        soldTHB: finalPrice,
        costKRW: product.cost || 0,
        profit: finalPrice - ((product.cost || 0) * krwRate),
        rateUsed: krwRate,
        status: 'shipped',
        tracking: 'manual-chat',
        courier: 'Chat Order'
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
        },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        setIsQuickOrderOpen(false);
        showToast('Chat Order Logged', '💬');
        refreshData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => { isLocked.current = false; }, 5000);
    }
  };

  const updateItem = (parcelId: number, itemId: number, field: string, value: any) => {
    setParcels(parcels.map(p => p.id === parcelId ? {
      ...p,
      items: p.items.map((i: any) => i.id === itemId ? { ...i, [field]: value } : i)
    } : p));
  };

  const updateParcel = (parcelId: number, field: string, value: any) => {
    setParcels(parcels.map(p => p.id === parcelId ? { ...p, [field]: value } : p));
  };

  const handleShipParcel = async (parcel: any) => {
    if (!customer || !settings || !selectedAddress) {
      showToast('Please select an address', '⚠️');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write('<html><head><title>Print Label</title></head><body><p>Preparing label...</p></body></html>');
      printWindow.document.close();
    }

    for (const item of parcel.items) {
      const profit = item.sold - (item.cost * krwRate);
      const orderPayload = {
        lineUserId: customer.userId,
        displayName: customer.displayName,
        product: item.name,
        soldTHB: item.sold,
        costKRW: item.cost,
        profit,
        rateUsed: krwRate,
        tracking: parcel.tracking,
        courier: parcel.courier,
        address: selectedAddress,
        status: 'shipped'
      };

      if (item.orderId) {
        await fetch(`/api/orders/${item.orderId}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
          },
          body: JSON.stringify(orderPayload)
        });
      } else {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
          },
          body: JSON.stringify(orderPayload)
        });
      }
    }

    if (printWindow) {
      const doc = printWindow.document;
      doc.body.innerHTML = '';
      doc.body.style.cssText = 'font-family: sans-serif; padding: 20px; text-align: center;';

      const container = doc.createElement('div');
      container.style.cssText = 'border: 2px solid #000; padding: 20px; border-radius: 10px;';

      const heading = doc.createElement('h2');
      heading.textContent = 'SHIPPING LABEL';
      container.appendChild(heading);

      const hr = doc.createElement('hr');
      container.appendChild(hr);

      const info = doc.createElement('div');
      info.style.cssText = 'text-align: left; margin: 20px 0; line-height: 1.6;';

      const createLine = (label: string, value: string) => {
        const p = doc.createElement('p');
        p.style.margin = '5px 0';
        const strong = doc.createElement('strong');
        strong.textContent = label + ': ';
        p.appendChild(strong);
        p.appendChild(doc.createTextNode(value));
        return p;
      };

      info.appendChild(createLine('To', customer.displayName));
      info.appendChild(createLine('Address', selectedAddress));
      info.appendChild(createLine('Tracking', parcel.tracking));
      info.appendChild(createLine('Courier', parcel.courier));

      container.appendChild(info);

      const barcode = doc.createElement('div');
      barcode.style.cssText = 'font-size: 24px; font-weight: bold; border-top: 1px dashed #ccc; padding-top: 10px; margin-top: 10px;';
      barcode.textContent = parcel.tracking;
      container.appendChild(barcode);

      doc.body.appendChild(container);

      const script = doc.createElement('script');
      script.textContent = 'window.print(); setTimeout(() => window.close(), 500);';
      doc.body.appendChild(script);
    }

    setParcels(prev => prev.filter(p => p.id !== parcel.id));
    showToast('Parcel Shipped', '📦');
    refreshData();
  };

  if (!customer) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#8b92ad] opacity-60 font-sans">
        <div className="bg-white p-8 rounded-full mb-4 shadow-sm">
           <Search size={48} />
        </div>
        <h2 className="text-xl font-bold">Select a customer to manage</h2>
        <p className="text-sm">Click on a customer name on the left to view orders</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto font-sans relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#1a1d2e] text-white px-6 py-3 rounded-full font-bold shadow-2xl z-[100] animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span>{toast.icon}</span> {toast.message}
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{customer.displayName}</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsQuickOrderOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1d2e] text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-lg active:scale-95 transition-all"
          >
            <Bell size={18} /> Quick Chat Order
          </button>
          <button 
            onClick={addParcel}
            className="flex items-center gap-2 px-4 py-2 bg-[#00b900] text-white rounded-lg text-xs font-bold hover:opacity-90 shadow-lg shadow-[#00b90033] active:scale-95 transition-all"
          >
            <Plus size={18} /> Add Parcel
          </button>
        </div>
      </div>

      <div className="min-h-[calc(100vh-200px)]">
           {/* Pending & Preparing Orders (Active Orders from Store) */}
           {orders.filter(o => ['pending', 'preparing'].includes(o.status)).length > 0 && (
             <div className="mb-8 animate-in fade-in slide-in-from-top-4">
               <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-4 block flex items-center gap-2">
                 <Clock size={12} className="text-orange-400" /> Active Orders (AWAITING FULFILLMENT)
               </label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {orders.filter(o => ['pending', 'preparing'].includes(o.status)).map((order) => {
                   const isPreparing = order.status === 'preparing';
                   return (
                     <div 
                       key={order._id} 
                       className={cn(
                         "border rounded-3xl p-5 flex justify-between items-center group transition-all",
                         isPreparing ? "bg-yellow-50 border-yellow-100" : "bg-orange-50/50 border-orange-100 hover:bg-orange-50"
                       )}
                     >
                       <div>
                         <div className={cn(
                           "text-[10px] font-bold uppercase mb-1",
                           isPreparing ? "text-yellow-600" : "text-orange-400"
                         )}>
                           {isPreparing ? "✓ In Parcel (Not Shipped)" : "New Order Request"}
                         </div>
                         <div className="font-bold text-[#1a1d2e]">{order.product}</div>
                         <div className="text-xs text-[#8b92ad]">฿{order.soldTHB.toLocaleString()} • Korean Import</div>
                       </div>
                       <div className="flex items-center gap-2">
                         <button 
                           onClick={() => {
                             if (isPreparing) {
                               const parcelWithItem = parcels.find(p => p.items.some((i: any) => i.orderId === order._id));
                               if (parcelWithItem) {
                                 const item = parcelWithItem.items.find((i: any) => i.orderId === order._id);
                                 if (item) removeItemFromParcel(parcelWithItem.id, item.id, order._id);
                               } else {
                                 // Fallback if item is orphaned: manually revert to pending
                                 setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'pending' } : o));
                                 fetch(`/api/orders/${order._id}`, {
                                   method: 'PATCH',
                                   headers: { 'Content-Type': 'application/json', 'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' },
                                   body: JSON.stringify({ status: 'pending' })
                                 });
                                 showToast('Orphaned item reverted', '↩️');
                               }
                             } else {
                               handleImportToParcel(order);
                             }
                           }}
                           className={cn(
                             "px-4 py-2 rounded-2xl text-[10px] font-bold transition-all shadow-sm flex justify-center items-center gap-1 group/btn",
                             isPreparing 
                               ? "bg-yellow-400 text-white border border-yellow-400 hover:bg-red-500 hover:border-red-500 active:scale-95" 
                               : "bg-white text-orange-500 border border-orange-200 hover:bg-orange-500 hover:text-white active:scale-95"
                           )}
                         >
                           {isPreparing ? (
                             <>
                               <span className="flex items-center gap-1 group-hover/btn:hidden"><CheckCircle2 size={14} /> ✓ In Parcel</span>
                               <span className="hidden items-center gap-1 group-hover/btn:flex"><Trash2 size={14} /> Remove from Parcel</span>
                             </>
                           ) : "Move to Parcel →"}
                         </button>
                         <button 
                           onClick={() => handleDeleteOrder(order)}
                           className="p-2 text-[#8b92ad] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                           title="Delete Order"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

           <div className="bg-white rounded-3xl border border-[#e2e5ef] p-6 mb-8 shadow-sm">
             <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-4 block">
               Select Delivery Address (SAVED ADDRESSES)
             </label>
             
             <div className="space-y-3">
               {customerData?.addresses?.map((addr: string, i: number) => (
                 <div key={i} className="flex items-center gap-3">
                   <label className={cn(
                      "flex-1 flex items-center gap-3 p-4 border rounded-2xl transition-all cursor-pointer group",
                      selectedAddress === addr ? "border-[#00b900] bg-[#00b90005]" : "border-[#e2e5ef] hover:border-[#00b900]"
                    )}>
                     <input 
                        type="radio" 
                        name="address" 
                        value={addr} 
                        checked={selectedAddress === addr}
                        onChange={() => setSelectedAddress(addr)}
                        className="w-4 h-4 accent-[#00b900]" 
                      />
                     <span className="text-sm">{addr}</span>
                   </label>
                   <button 
                     onClick={() => handleRemoveAddress(addr)}
                     className="p-3 text-[#8b92ad] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                     title="Remove address"
                   >
                     <Trash2 size={18} />
                   </button>
                 </div>
               ))}
               
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   placeholder="Add new address..." 
                   value={newAddress}
                   onChange={(e) => setNewAddress(e.target.value)}
                   className="flex-1 bg-white border border-[#e2e5ef] rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00b900] outline-none"
                 />
                 <button 
                   onClick={handleAddAddress}
                   className="bg-[#00b900] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
                 >
                   + Add Address
                 </button>
               </div>
             </div>
           </div>

           <div className="space-y-8">
             {parcels.map(parcel => (
               <div key={parcel.id} className="border-2 border-dashed border-[#e2e5ef] rounded-3xl p-6 relative bg-[#f8f9fc]">
                 <div className="absolute -top-4 left-6 bg-[#1a1d2e] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                   Parcel ID: {parcel.tracking || parcel.id.toString().slice(-4)}
                 </div>
                 
                 <div className="flex justify-end gap-2 mb-6">
                    <button 
                     onClick={() => setParcels(parcels.map(p => p.id === parcel.id ? { ...p, items: [...p.items, { id: Date.now(), name: 'New Product', sold: 0, cost: 0 }] } : p))}
                     className="bg-[#00b900] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Item
                    </button>
                    <button 
                     onClick={() => removeParcel(parcel.id)}
                     className="text-red-500 text-[10px] font-bold px-2"
                    >
                      Delete Parcel
                    </button>
                 </div>

                 {parcel.items.map((item: any) => {
                   const profit = item.sold - (item.cost * krwRate);
                   return (
                     <div key={item.id} className="bg-white rounded-2xl border border-[#e2e5ef] p-6 mb-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#00b900] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="flex justify-between items-start mb-6">
                           <div className="text-[10px] font-black text-[#1a1d2e] opacity-20 uppercase tracking-[0.2em]">Item Details</div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                           <div className="flex-1">
                             <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Product Name</label>
                             <input 
                                type="text" 
                                value={item.name} 
                                onChange={(e) => updateItem(parcel.id, item.id, 'name', e.target.value)}
                                className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900]" 
                             />
                           </div>
                           <button 
                             onClick={() => removeItemFromParcel(parcel.id, item.id, item.orderId)}
                             className="ml-2 mt-6 p-3 text-[#8b92ad] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                             title="Remove item and revert to pending"
                           >
                             <Trash2 size={18} />
                           </button>
                         </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Sold (THB)</label>
                            <input 
                               type="number" 
                               value={item.sold} 
                               onChange={(e) => updateItem(parcel.id, item.id, 'sold', parseFloat(e.target.value) || 0)}
                               className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900]" 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Cost (KRW)</label>
                            <input 
                               type="number" 
                               value={item.cost} 
                               onChange={(e) => updateItem(parcel.id, item.id, 'cost', parseFloat(e.target.value) || 0)}
                               className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900]" 
                            />
                          </div>
                        </div>

                        <div className={cn("font-bold text-lg", profit >= 0 ? "text-[#00b900]" : "text-red-500")}>
                          Profit: ฿{profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                     </div>
                   );
                 })}

                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">COURIER</label>
                      <select 
                        value={parcel.courier}
                        onChange={(e) => updateParcel(parcel.id, 'courier', e.target.value)}
                        className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00b900] bg-white transition-all appearance-none"
                      >
                        <option value="">-- Select --</option>
                        {settings?.shippingCompanies?.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Tracking Number</label>
                      <input 
                        type="text" 
                        value={parcel.tracking}
                        placeholder="Ex: TH12345678"
                        onChange={(e) => updateParcel(parcel.id, 'tracking', e.target.value)}
                        className="w-full border border-[#e2e5ef] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00b900]" 
                      />
                    </div>
                 </div>

                 <button 
                   onClick={() => handleShipParcel(parcel)}
                   className="w-full py-4 bg-[#1a1d2e] text-white rounded-2xl font-bold text-sm hover:opacity-90 shadow-xl shadow-[#1a1d2e33] active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Printer size={18} /> Ship + Print Label
                 </button>
               </div>
             ))}
           </div>

           {/* Fulfilled Order History Section */}
           {orders.filter(o => o.status === 'shipped').length > 0 && (
             <div className="mt-12 animate-in fade-in slide-in-from-bottom-4">
               <div className="flex items-center justify-between mb-6">
                 <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider flex items-center gap-2">
                   <History size={14} /> FULFILLED ORDER HISTORY
                 </label>
                 <div className="text-[10px] font-bold text-[#8b92ad] bg-white px-3 py-1.5 rounded-full border border-[#e2e5ef] shadow-sm">
                   Total Profit: <span className="text-[#00b900]">฿{orders.filter(o => o.status === 'shipped').reduce((sum, o) => sum + (o.profit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                 </div>
               </div>

               <div className="space-y-3">
                 {orders.filter(o => o.status === 'shipped').map((order) => (
                   <HistoryItem key={order._id} order={order} krwRate={krwRate} onUpdate={refreshData} />
                 ))}
               </div>
             </div>
           )}
        </div>

      <ConfirmModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel || (() => setModal({ ...modal, isOpen: false }))}
      />

      <QuickOrderModal 
        isOpen={isQuickOrderOpen}
        products={products}
        onConfirm={handleQuickOrder}
        onCancel={() => setIsQuickOrderOpen(false)}
      />
    </div>
    );
  }

  return null;
}

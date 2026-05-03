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
  RefreshCw,
  Check,
  QrCode,
  Menu
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// View Components
import ProductManagement, { CreatableDropdown, TagSelector, ImageUploader } from '@/components/ProductManagement';
import SettingsView from '@/components/SettingsView';
import ReportsView from '@/components/ReportsView';
import ShopOrdersView from '@/components/ShopOrdersView';
import SetupView from '@/components/SetupView';
import LoadingView from '@/components/LoadingView';
import liff from '@line/liff';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type = 'confirm', theme }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={cn(
        "rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 transition-colors",
        theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white"
      )}>
        <div className="p-8 text-center">
          <div className={`w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-[#00b90011] text-[#00b900]'}`}>
            {type === 'danger' ? <Trash2 size={32} /> : <Package size={32} />}
          </div>
          <h3 className={cn("text-xl font-bold mb-2", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{title}</h3>
          <p className="text-[#8b92ad] text-sm leading-relaxed">{message}</p>
        </div>
        <div className={cn("flex border-t", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <button 
            onClick={onCancel}
            className={cn(
              "flex-1 py-5 text-sm font-bold text-[#8b92ad] transition-colors border-r",
              theme === 'dark' ? "hover:bg-[#1a1d2e] border-[#1f2335]" : "hover:bg-[#fafbfc] border-[#f4f6f9]"
            )}
          >Cancel</button>
          <button 
            onClick={onConfirm}
            className={cn(
              "flex-1 py-5 text-sm font-bold transition-colors",
              type === 'danger' ? "text-red-500 hover:bg-red-50" : "text-[#00b900] hover:bg-[#00b90008]",
              theme === 'dark' && (type === 'danger' ? "hover:bg-red-500/10" : "hover:bg-[#00b90011]")
            )}
          >{type === 'alert' ? 'OK' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}


function ChatHistory({ 
  userId, 
  customerName = "Customer", 
  unreadCount = 0, 
  onMarkAsRead,
  fontSize = 14,
  onFontSizeChange,
  lang = 'en',
  theme = 'light',
  pictureUrl = ''
}: { 
  userId: string, 
  customerName?: string, 
  pictureUrl?: string,
  unreadCount?: number, 
  onMarkAsRead?: () => void,
  fontSize?: number,
  onFontSizeChange?: (size: number) => void,
  lang?: 'th' | 'en',
  theme?: 'light' | 'dark'
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isReadAnimating, setIsReadAnimating] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If user is within 20px of bottom, they probably want to keep auto-scrolling
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
      shouldScrollRef.current = isAtBottom;
    }
  };

  const handleMarkAsReadClick = () => {
    if (onMarkAsRead) onMarkAsRead();
    setIsReadAnimating(true);
    setTimeout(() => setIsReadAnimating(false), 1000);
  };

  const adminSecret = (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '';

  const fetchMessages = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/messages/${userId}`, { 
        signal,
        headers: { 'x-admin-secret': adminSecret }
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
  }, [userId, adminSecret]);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setMessages([]);
    
    const es = new EventSource(`/api/messages/${userId}/stream?secret=${encodeURIComponent(adminSecret)}`);

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
    };

    return () => {
      es.close();
    };
  }, [userId, adminSecret]);

  useEffect(() => {
    if (shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
      type: 'text',
      text: textToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret
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
      // After sending a message, we always want to scroll to bottom
      shouldScrollRef.current = true;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  if (isLoading) return <LoadingView theme={theme} message="Opening Secure Channel..." />;

  return (
    <div className={cn("flex flex-col flex-1 min-h-0 transition-colors", theme === 'dark' ? "bg-[#0f111a]" : "bg-[#f4f5f7]")}>
      {/* Compact Header */}
      <div className={cn(
        "px-4 py-3 border-b flex items-center gap-3 shadow-sm z-10 flex-shrink-0 transition-colors",
        theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
      )}>
        {pictureUrl ? (
          <img 
            src={pictureUrl} 
            alt={customerName} 
            className="w-8 h-8 rounded-full object-cover bg-[#eee] flex-shrink-0" 
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', theme === 'dark' ? "bg-[#eab308] text-[#1a1d2e]" : "bg-[#eab308] text-[#1a1d2e]");
              fallback.textContent = initials;
              target.parentElement?.insertBefore(fallback, target);
            }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#eab308] text-[#1a1d2e] flex items-center justify-center font-bold text-sm flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={cn("font-bold text-sm truncate", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{customerName}</div>
          <div className="text-[10px] text-[#00b900] font-semibold">LINE Chat</div>
        </div>
        
        <div className={cn(
          "flex items-center gap-1 p-0.5 rounded-lg border mr-1 transition-colors",
          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-[#f4f6f9] border-[#e2e5ef]"
        )}>
          <button 
            onClick={() => onFontSizeChange?.(Math.max(10, fontSize - 1))}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded transition-all font-bold text-xs",
              theme === 'dark' ? "text-[#8b92ad] hover:text-white hover:bg-[#161925]" : "text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-white"
            )}
            title="Decrease text size"
          >-</button>
          <div className={cn("w-[1px] h-3", theme === 'dark' ? "bg-[#1f2335]" : "bg-[#e2e5ef]")} />
          <button 
            onClick={() => onFontSizeChange?.(Math.min(24, fontSize + 1))}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded transition-all font-bold text-xs",
              theme === 'dark' ? "text-[#8b92ad] hover:text-white hover:bg-[#161925]" : "text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-white"
            )}
            title="Increase text size"
          >+</button>
        </div>
        <button 
          onClick={handleMarkAsReadClick}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all shadow-sm flex items-center gap-1 ${
            isReadAnimating 
              ? "bg-[#00b900] text-white scale-95" 
              : unreadCount > 0 
                ? "bg-[#00b900] text-white hover:bg-[#009900]" 
                : "bg-[#e2e5ef] text-[#8b92ad] hover:bg-[#d1d5e0]"
          }`}
        >
          {isReadAnimating ? (
            <>
              <Check size={12} className="text-white animate-in zoom-in" />
              <span>{lang === 'th' ? TRANSLATIONS.th.read : TRANSLATIONS.en.read}</span>
            </>
          ) : (
            <>
              <div className={`w-1.5 h-1.5 rounded-full ${unreadCount > 0 ? "bg-white animate-pulse" : "bg-[#8b92ad]"}`} />
              <span>Mark as Read</span>
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {!isLoading && grouped.length === 0 && (
          <div className="flex flex-col justify-center items-center h-full gap-3 text-[#8b92ad]">
            <MessageCircle size={36} className="opacity-30" />
            <p className="text-sm font-medium">{lang === 'th' ? TRANSLATIONS.th.no_messages : TRANSLATIONS.en.no_messages}</p>
            <p className="text-xs text-center opacity-70">{lang === 'th' ? TRANSLATIONS.th.no_messages_desc : TRANSLATIONS.en.no_messages_desc}</p>
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

          if (m.type === 'system' || m.sender === 'system') {
            return (
              <div key={m._id || i} className="flex justify-center my-4 px-4 text-center">
                <div className="bg-[#e2e5ef] text-[#1a1d2e] px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm border border-white/50 max-w-full">
                  <div>{m.text} {m.metadata?.amount && `• ฿${m.metadata.amount.toLocaleString()}`}</div>
                  {m.metadata?.product && (
                    <div className="text-[9px] opacity-60 mt-1 font-medium lowercase first-letter:uppercase leading-tight">
                      {m.metadata.product}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (m.sender === 'admin') {
            return (
              <div key={m._id || i} className="flex justify-end items-end gap-2 mb-2">
                <span className="text-[10px] text-[#8b92ad] mb-1">{timeStr}</span>
                <div 
                  className="bg-[#00b900] text-white max-w-[75%] px-4 py-2 rounded-2xl rounded-tr-sm shadow-sm leading-snug"
                  style={{ fontSize: `${fontSize}px` }}
                >
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
                {m.type === 'image' ? (
                  <div 
                    onClick={() => setLightboxImage(`/api/messages/image/${m.messageId}?secret=${encodeURIComponent(adminSecret)}`)}
                    className="relative group cursor-zoom-in max-w-[65%] rounded-2xl overflow-hidden shadow-md border-4 border-white transition-transform hover:scale-[1.02]"
                  >
                    <img 
                      src={`/api/messages/image/${m.messageId}?secret=${encodeURIComponent(adminSecret)}`} 
                      alt="User uploaded slip"
                      className="w-full h-auto object-cover max-h-[300px]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Search className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={24} />
                    </div>
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "p-3 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-sm transition-colors",
                      theme === 'dark' ? "bg-[#161925] text-white border border-[#1f2335] rounded-tl-none" : "bg-white text-[#1a1d2e] rounded-tl-none"
                    )}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {m.text}
                  </div>
                )}
                <span className="text-[10px] text-[#8b92ad] mb-1">{timeStr}</span>
              </div>
            );
          }
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Expanded view" 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Chat Input Area */}
      <div className={cn("border-t p-3 flex-shrink-0 z-10 transition-colors", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
        {sendError && (
          <div className="mb-2 text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg text-center animate-in fade-in slide-in-from-bottom-2 border border-red-100">
            {sendError}
          </div>
        )}
        <form 
          onSubmit={handleSend}
          className={cn(
            "rounded-3xl flex items-end px-4 py-2 border focus-within:border-[#00b900] focus-within:ring-1 focus-within:ring-[#00b900] transition-all",
            theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-[#f4f5f7] border-[#e2e5ef]"
          )}
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
            placeholder={lang === 'th' ? TRANSLATIONS.th.type_message : TRANSLATIONS.en.type_message}
            className={cn(
              "flex-1 bg-transparent border-none outline-none resize-none py-2 text-sm max-h-32 min-h-[40px] leading-tight transition-colors",
              theme === 'dark' ? "text-white placeholder-[#8b92ad]/50" : "text-[#1a1d2e] placeholder-[#8b92ad]"
            )}
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


function QuickOrderModal({ isOpen, products, onConfirm, onCancel, theme = 'light' }: any) {
  const [isManual, setIsManual] = useState(false);
  
  // SELECT Selection State
  const [selBrand, setSelBrand] = useState('');
  const [selModelLine, setSelModelLine] = useState('');
  const [selProduct, setSelProduct] = useState<any>(null);
  const [selThickness, setSelThickness] = useState('');
  const [selColor, setSelColor] = useState('');
  
  // NEW Manual State
  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualModelLine, setManualModelLine] = useState('');
  const [manualThickness, setManualThickness] = useState('');
  const [manualColor, setManualColor] = useState('');
  const [manualCategories, setManualCategories] = useState<string[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [autoCatalog, setAutoCatalog] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pre-calculations
  const brands = Array.from(new Set(products.map((p: any) => p.brand))).filter(Boolean).sort() as string[];
  const modelLines = Array.from(new Set(products.filter((p: any) => p.brand === selBrand).map((p: any) => p.modelLine))).filter(Boolean).sort() as string[];
  
  // Global search filtering
  const searchResults = searchTerm.length >= 2 
    ? products.filter((p: any) => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.modelLine?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : [];

  const filteredProducts = products.filter((p: any) => p.brand === selBrand && (!selModelLine || p.modelLine === selModelLine));
  
  const currentVariant = selProduct?.variants?.find((v: any) => v.thickness === selThickness);
  const thicknessOptions = selProduct?.variants?.map((v: any) => v.thickness) || [];
  const colorOptions = currentVariant?.colors || [];

  useEffect(() => {
    if (!isOpen) {
      setSelBrand('');
      setSelModelLine('');
      setSelProduct(null);
      setSelThickness('');
      setSelColor('');
      setManualName('');
      setManualBrand('');
      setManualModelLine('');
      setManualThickness('');
      setManualColor('');
      setManualCategories([]);
      setManualImageUrl('');
      setManualDescription('');
      setPrice('');
      setQuantity(1);
      setSearchTerm('');
      setIsManual(false);
    }
  }, [isOpen]);

  // Auto-advance logic
  useEffect(() => {
    if (selBrand && modelLines.length === 1 && !selModelLine) {
      setSelModelLine(modelLines[0]);
    }
  }, [selBrand, modelLines]);

  useEffect(() => {
    if (selModelLine && filteredProducts.length === 1 && !selProduct) {
      setSelProduct(filteredProducts[0]);
    }
  }, [selModelLine, filteredProducts]);

  useEffect(() => {
    if (currentVariant) {
      setPrice(currentVariant.price?.toString() || '');
    }
  }, [currentVariant]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalPrice = parseFloat(price) || 0;
    if (isManual) {
      onConfirm({ 
        name: manualName, 
        brand: manualBrand, 
        modelLine: manualModelLine,
        thickness: manualThickness,
        color: manualColor,
        categories: manualCategories, 
        imageUrl: manualImageUrl,
        description: manualDescription,
        cost: 0,
        autoCatalog 
      }, finalPrice, quantity);
    } else {
      onConfirm({
        ...selProduct,
        selectedThickness: selThickness,
        selectedColor: selColor
      }, finalPrice, quantity);
    }
  };

  const canConfirm = isManual 
    ? (manualName.trim() !== '' && manualBrand.trim() !== '' && price.trim() !== '' && manualThickness.trim() !== '' && manualColor.trim() !== '') 
    : (selProduct && selThickness && selColor && price.trim() !== '');

  return (
    <div className="fixed inset-0 bg-[#1a1d2e]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={cn(
        "w-full transition-all rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col",
        isManual ? 'max-w-4xl' : 'max-w-lg',
        theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white"
      )}>
        <div className={cn("p-8 pb-4 flex-shrink-0 border-b transition-colors", theme === 'dark' ? "border-[#1f2335]" : "border-[#f4f6f9]")}>
          <div className="flex justify-between items-center mb-2">
            <h3 className={cn("text-xl font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Manual Quick Order</h3>
            <div className={cn("flex p-1 rounded-xl transition-colors", theme === 'dark' ? "bg-[#1a1d2e]" : "bg-[#f8f9fc]")}>
              <button 
                onClick={() => setIsManual(false)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                  !isManual 
                    ? (theme === 'dark' ? "bg-[#2d324d] text-[#00b900] shadow-lg" : "bg-white shadow-sm text-[#00b900]") 
                    : "text-[#8b92ad]"
                )}
              >
                SELECT
              </button>
              <button 
                onClick={() => setIsManual(true)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                  isManual 
                    ? (theme === 'dark' ? "bg-[#2d324d] text-[#00b900] shadow-lg" : "bg-white shadow-sm text-[#00b900]") 
                    : "text-[#8b92ad]"
                )}
              >
                NEW
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[#8b92ad] font-bold uppercase tracking-widest truncate">
            {!isManual 
              ? `PATH: ${selBrand || '?'} ${selModelLine ? `> ${selModelLine}` : ''} > ${selProduct?.name || '?'} > ${selThickness || '?'} > ${selColor || '?'}`
              : 'Creating New Product Catalog Entry'
            }
          </p>
        </div>

        <div className="p-8 pt-6 overflow-y-auto space-y-6">
          {!isManual ? (
            <div className="space-y-5">
              {/* GLOBAL SEARCH */}
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search catalog (e.g. 'Boston' or 'Pink')..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "w-full border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00b900] outline-none transition-colors",
                    theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]"
                  )}
                />
                {searchResults.length > 0 && (
                  <div className={cn("absolute top-full left-0 right-0 border rounded-2xl mt-2 shadow-2xl z-[10] overflow-hidden transition-colors", theme === 'dark' ? "bg-[#1f2335] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
                    {searchResults.map((p: any) => (
                      <button 
                        key={p._id}
                        onClick={() => {
                          setSelBrand(p.brand);
                          setSelModelLine(p.modelLine);
                          setSelProduct(p);
                          setSearchTerm('');
                        }}
                        className={cn(
                          "w-full px-4 py-3 text-left border-b last:border-0 flex justify-between items-center group transition-colors",
                          theme === 'dark' ? "border-[#2d324d] hover:bg-[#161925]" : "border-[#f4f6f9] hover:bg-[#00b90005]"
                        )}
                      >
                        <div>
                          <div className="text-[9px] font-bold text-[#8b92ad] uppercase">{p.brand} &gt; {p.modelLine}</div>
                          <div className={cn("text-sm font-bold group-hover:text-[#00b900] transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{p.name}</div>
                        </div>
                        <span className="text-[10px] font-bold text-[#8b92ad]">Select →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-[1px] bg-[#f4f6f9] my-2"></div>
              {/* STEP 1: BRAND */}
              <div>
                <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">1. Select Brand</label>
                <div className="flex flex-wrap gap-2">
                  {brands.map(b => (
                    <button 
                      key={b} 
                      onClick={() => { setSelBrand(b); setSelModelLine(''); setSelProduct(null); setSelThickness(''); setSelColor(''); }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                        selBrand === b 
                          ? (theme === 'dark' ? "bg-white text-[#161925] border-white shadow-lg" : "bg-[#1a1d2e] text-white border-[#1a1d2e] shadow-lg") 
                          : (theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-[#8b92ad] hover:border-[#00b900]" : "bg-white border-[#e2e5ef] text-[#8b92ad] hover:border-[#00b900]")
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 2: MODEL LINE */}
              {selBrand && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">2. Model Line (Optional Filter)</label>
                  <div className="flex flex-wrap gap-2">
                    {modelLines.map(ml => (
                      <button 
                        key={ml} 
                        onClick={() => { 
                          if (selModelLine === ml) setSelModelLine(''); // Toggle off
                          else setSelModelLine(ml);
                          setSelProduct(null); 
                          setSelThickness(''); 
                          setSelColor(''); 
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                          selModelLine === ml 
                            ? (theme === 'dark' ? "bg-white text-[#161925] border-white shadow-md" : "bg-[#1a1d2e] text-white border-[#1a1d2e] shadow-md") 
                            : (theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-[#8b92ad] hover:border-[#00b900]" : "bg-white border-[#e2e5ef] text-[#8b92ad] hover:border-[#00b900]")
                        )}
                      >
                        {ml}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: PRODUCT NAME */}
              {selBrand && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">3. Product Listing</label>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredProducts.map((p: any) => (
                      <button 
                        key={p._id} 
                        onClick={() => { setSelProduct(p); setSelThickness(''); setSelColor(''); }}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold text-left transition-all border",
                          selProduct?._id === p._id 
                            ? "bg-[#00b900] text-white border-[#00b900] shadow-md" 
                            : (theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white hover:border-[#00b900]" : "bg-white border-[#e2e5ef] text-[#1a1d2e] hover:border-[#00b900]")
                        )}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: THICKNESS */}
              {selProduct && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">
                    4. Thickness <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {thicknessOptions.map((t: string) => (
                      <button 
                        key={t} 
                        onClick={() => { setSelThickness(t); setSelColor(''); }}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                          selThickness === t 
                            ? (theme === 'dark' ? "bg-white text-[#161925] border-white" : "bg-[#1a1d2e] text-white border-[#1a1d2e]") 
                            : (theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-[#8b92ad]" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#8b92ad]")
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: COLOR */}
              {selThickness && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">
                    5. Color Swatch <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c: string) => {
                      const isHex = c.startsWith('#');
                      return (
                        <button 
                          key={c} 
                          onClick={() => setSelColor(c)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all border",
                            selColor === c 
                              ? "bg-[#00b900] text-white border-[#00b900] shadow-md" 
                              : (theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]")
                          )}
                        >
                          {isHex && <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c }} />}
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in slide-in-from-left-4 duration-300 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Core Info */}
              <div className="space-y-6">
                <ImageUploader value={manualImageUrl} onChange={setManualImageUrl} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative z-[100]">
                    <CreatableDropdown
                      label="BRAND"
                      value={manualBrand}
                      onChange={setManualBrand}
                      options={brands}
                      placeholder="e.g. Celine"
                      required={true}
                    />
                  </div>
                  <div className="relative z-[90]">
                    <CreatableDropdown
                      label="MODEL LINE / FAMILY"
                      value={manualModelLine}
                      onChange={setManualModelLine}
                      options={Array.from(new Set(products.filter((p: any) => p.brand === manualBrand).map((p: any) => p.modelLine))).filter(Boolean) as string[]}
                      placeholder="e.g. Boston Bag"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">
                    DISPLAY PRODUCT NAME <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Kunka"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className={cn(
                      "w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00b900] transition-colors",
                      theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                    )}
                  />
                </div>

                <TagSelector 
                  label="CATEGORIES"
                  selected={manualCategories} 
                  onAdd={c => !manualCategories.includes(c) && setManualCategories([...manualCategories, c])}
                  onRemove={c => setManualCategories(manualCategories.filter(x => x !== c))}
                  options={Array.from(new Set(products.flatMap((p: any) => p.categories || []))).filter(Boolean) as string[]}
                  placeholder="Search or add category..."
                />

                <div>
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block">DESCRIPTION</label>
                  <textarea 
                    value={manualDescription}
                    onChange={e => setManualDescription(e.target.value)}
                    rows={3}
                    className={cn(
                      "w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#00b900] resize-none transition-colors",
                      theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                    )}
                  />
                </div>
              </div>

              {/* Right Column: Specific Variant */}
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">SPECIFIC THICKNESS & COLOR</label>
                  <div className={cn("border rounded-2xl p-4 transition-colors", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-[#f8f9fc] border-[#e2e5ef]")}>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="relative z-[80]">
                        <CreatableDropdown 
                          label="THICKNESS" 
                          value={manualThickness} 
                          onChange={setManualThickness}
                          theme={theme}
                          options={Array.from(new Set(products.flatMap((p: any) => p.variants?.map((v: any) => v.thickness) || []))).filter(Boolean) as string[]} 
                          placeholder="e.g. 1.2 mm" 
                          required={true}
                        />
                      </div>
                      <div className="relative z-[70]">
                        <CreatableDropdown 
                          label="COLOR" 
                          value={manualColor} 
                          onChange={setManualColor}
                          theme={theme}
                          options={Array.from(new Set(products.flatMap((p: any) => p.variants?.flatMap((v: any) => v.colors) || []))).filter(Boolean) as string[]} 
                          placeholder="e.g. Peach" 
                          required={true}
                        />
                      </div>
                    </div>
                    
                    <div className={cn("pt-4 border-t transition-colors", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
                      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block flex items-center justify-between">
                        <span>FINAL PRICE (THB) <span className="text-red-500">*</span></span>
                        <span className="text-[9px] font-bold text-[#00b900] bg-[#00b90011] px-2 py-0.5 rounded-full">Editable</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] font-bold text-sm">฿</span>
                        <input 
                          type="number"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className={cn(
                            "w-full border rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-[#00b900] font-bold transition-colors",
                            theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className={cn("pt-4 border-t transition-colors", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
                      <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block flex items-center justify-between">
                        QUANTITY
                      </label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-xl bg-[#f8f9fc] border border-[#e2e5ef] text-[#1a1d2e] font-bold hover:bg-[#e2e5ef] flex items-center justify-center transition-all">-</button>
                        <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-xl bg-[#f8f9fc] border border-[#e2e5ef] text-[#1a1d2e] font-bold hover:bg-[#e2e5ef] flex items-center justify-center transition-all">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-white border border-[#e2e5ef] rounded-2xl p-4 shadow-sm">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      checked={autoCatalog}
                      onChange={(e) => setAutoCatalog(e.target.checked)}
                      className="w-5 h-5 accent-[#00b900] cursor-pointer"
                    />
                    <div>
                      <span className="text-[11px] font-bold text-[#1a1d2e] group-hover:text-[#00b900] transition-colors uppercase tracking-wider block">Save to Catalog</span>
                      <span className="text-[10px] text-[#8b92ad]">Will create a catalog entry with these exact details</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* FINAL PRICE SECTION (Only for Non-Manual to keep original layout flow) */}
          {!isManual && (
            <div className="pt-4 border-t border-[#f4f6f9] flex-shrink-0">
              <div className="flex justify-between items-end mb-3">
                <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">
                  Final Price (Editable) <span className="text-red-500">*</span>
                </label>
                {currentVariant && price !== currentVariant.price.toString() && (
                  <span className="text-[9px] font-black text-[#00b900] bg-[#00b90008] px-2 py-0.5 rounded-full">Discount Applied</span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad] font-bold text-sm">฿</span>
                <input 
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-[#e2e5ef] rounded-2xl pl-8 pr-4 py-4 text-2xl font-black text-[#1a1d2e] outline-none focus:border-[#00b900] transition-all bg-[#fcfdfe]"
                />
              </div>

              <div className="mt-4 flex justify-between items-center bg-[#f8f9fc] border border-[#e2e5ef] rounded-2xl p-4">
                 <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">QUANTITY</label>
                 <div className="flex items-center gap-3">
                   <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-xl bg-white border border-[#e2e5ef] text-[#1a1d2e] font-bold shadow-sm hover:border-[#00b900] flex items-center justify-center transition-all active:scale-95">-</button>
                   <span className="font-bold text-xl w-8 text-center">{quantity}</span>
                   <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-xl bg-white border border-[#e2e5ef] text-[#1a1d2e] font-bold shadow-sm hover:border-[#00b900] flex items-center justify-center transition-all active:scale-95">+</button>
                 </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 pt-4 border-t border-[#f4f6f9] flex gap-3 flex-shrink-0">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-bold text-[#8b92ad] bg-[#f8f9fc] rounded-2xl hover:bg-[#f0f2f5] transition-all"
          >
            Cancel
          </button>
          <button 
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="flex-1 py-4 text-sm font-bold text-white bg-[#00b900] rounded-2xl shadow-lg shadow-[#00b90033] hover:opacity-90 disabled:opacity-30 transition-all active:scale-95"
          >
            Log Order
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ order, krwRate, onUpdate, theme = 'light' }: { order: any, krwRate: number, onUpdate: () => void, theme?: 'light' | 'dark' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({ 
    soldTHB: order.soldTHB, 
    costKRW: order.costKRW,
    rateUsed: order.rateUsed || krwRate
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await fetch(`/api/orders/${order._id}`, {
      method: 'DELETE',
      headers: { 
        'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
      }
    });
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    if (res.ok) {
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
    <div className={cn(
      "rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all",
      theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
    )}>
      <div 
        className="p-4 flex items-center justify-between cursor-pointer group"
      >
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1"
        >
          <div className={cn(
            "p-2 rounded-xl transition-colors",
            theme === 'dark' ? "bg-[#1a1d2e] group-hover:bg-[#00b90011]" : "bg-[#f8f9fc] group-hover:bg-[#00b90011]"
          )}>
            <Package size={18} className="text-[#8b92ad] group-hover:text-[#00b900]" />
          </div>
          <div>
            <div className={cn("font-bold text-sm transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{order.product}</div>
            <div className="text-[10px] text-[#8b92ad] flex items-center gap-2">
              {new Date(order.createdAt).toLocaleDateString()} • {order.tracking}
              <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors", theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad]" : "bg-[#f0f2f5] text-[#8b92ad]")}>@{editData.rateUsed}</span>
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
          <button 
            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
            className="p-2 text-[#8b92ad] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Delete Order History"
          >
            <Trash2 size={16} />
          </button>
          <div className="text-right">
            <div className="text-sm font-bold text-[#00b900]">฿{order.profit.toLocaleString()}</div>
            <div className="text-[10px] text-[#8b92ad]">Sales: ฿{order.soldTHB.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className={cn(
          "px-4 pb-4 pt-2 border-t transition-colors",
          theme === 'dark' ? "border-[#1f2335] bg-[#1a1d2e]" : "border-[#f4f6f9] bg-[#fafbfc]"
        )}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[9px] font-bold text-[#8b92ad] uppercase mb-1 block">Sold (THB)</label>
              <input 
                type="number" 
                step="0.01"
                value={editData.soldTHB}
                onChange={(e) => setEditData({...editData, soldTHB: parseFloat(e.target.value)})}
                className={cn(
                  "w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00b900] transition-colors",
                  theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                )}
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#8b92ad] uppercase mb-1 block">Cost (KRW)</label>
              <input 
                type="number" 
                step="0.01"
                value={editData.costKRW}
                onChange={(e) => setEditData({...editData, costKRW: parseFloat(e.target.value)})}
                className={cn(
                  "w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00b900] transition-colors",
                  theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                )}
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-[#8b92ad] uppercase mb-1 block">Rate</label>
              <input 
                type="number" 
                step="0.0001"
                value={editData.rateUsed}
                onChange={(e) => setEditData({...editData, rateUsed: parseFloat(e.target.value)})}
                className={cn(
                  "w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#00b900] transition-colors",
                  theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                )}
              />
            </div>
          </div>
          <button 
            onClick={() => setShowConfirm(true)}
            disabled={isSaving}
            className={cn(
              "w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50",
              theme === 'dark' ? "bg-[#2d324d] text-white hover:bg-[#3d4466]" : "bg-[#1a1d2e] text-white hover:opacity-90"
            )}
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
        theme={theme}
      />

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        title="Delete Order History?"
        message="Are you sure you want to delete this fulfilled order? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        type="danger"
        theme={theme}
      />
    </div>
  );
}

const TRANSLATIONS = {
  th: {
    orders: "ออเดอร์",
    shop_orders: "ออเดอร์ร้าน",
    products: "สินค้า",
    reports: "รายงาน",
    settings: "ตั้งค่า",
    search_customers: "ค้นหาลูกค้า...",
    select_customer: "เลือกลูกค้าเพื่อจัดการ",
    select_customer_desc: "คลิกที่ชื่อลูกค้าด้านซ้ายเพื่อดูออเดอร์",
    quick_order: "สั่งซื้อด่วน",
    add_parcel: "เพิ่มพัสดุ",
    active_orders: "ออเดอร์ที่กำลังดำเนินการ",
    new_order_request: "คำขอสั่งซื้อใหม่",
    in_parcel: "อยู่ในพัสดุ",
    paid: "ชำระเงินแล้ว",
    send_qr: "ส่ง QR",
    mark_paid: "แจ้งโอน",
    move_to_parcel: "ย้ายไปพัสดุ",
    items: "รายการ",
    stats: "สถิติ",
    config: "ตั้งค่า",
    last_seen: "ล่าสุดเมื่อ",
    loading_messages: "กำลังโหลดข้อความ...",
    no_messages: "ยังไม่มีข้อความ",
    no_messages_desc: "ข้อความจะปรากฏขึ้นที่นี่เมื่อได้รับจาก LINE",
    type_message: "พิมพ์ข้อความ...",
    initializing: "กำลังเข้าสู่ระบบที่ปลอดภัย...",
    read: "อ่านแล้ว",
    catalog_hub: "ศูนย์จัดการสินค้า",
    inventory_desc: "คลังสินค้าและวงจรชีวิตผลิตภัณฑ์",
    add_catalog: "เพิ่มสินค้าใหม่",
    total_catalog: "สินค้าทั้งหมด",
    active_storefront: "เปิดขายหน้าร้าน",
    search_catalog: "ค้นหาชื่อ, แบรนด์, หรือรุ่น...",
    sort_newest: "จัดเรียง: ใหม่สุด",
    sort_az: "จัดเรียง: A-Z",
    sort_price_asc: "จัดเรียง: ราคาต่ำ",
    sort_price_desc: "จัดเรียง: ราคาสูง",
    all_brands: "ทุกแบรนด์",
    all_categories: "ทุกหมวดหมู่",
    shop_orders_hub: "ศูนย์จัดการออเดอร์",
    fulfillment_management: "การจัดการการจัดส่งทั่วโลก",
    export_view: "ส่งออกข้อมูลปัจจุบัน",
    total_revenue: "รายได้ทั้งหมด",
    pending_payments: "รอการชำระเงิน",
    awaiting_delivery: "รอการจัดส่ง"
  },
  en: {
    orders: "Orders",
    shop_orders: "Shop Orders",
    products: "Products",
    reports: "Reports",
    settings: "Settings",
    search_customers: "Search customers...",
    select_customer: "Select a customer to manage",
    select_customer_desc: "Click on a customer name on the left to view orders",
    quick_order: "Quick Chat Order",
    add_parcel: "Add Parcel",
    active_orders: "Active Orders (AWAITING FULFILLMENT)",
    new_order_request: "New Order Request",
    in_parcel: "In Parcel (Not Shipped)",
    paid: "PAID",
    send_qr: "Send QR",
    mark_paid: "Mark Paid",
    move_to_parcel: "Move to Parcel →",
    items: "Items",
    stats: "Stats",
    config: "Config",
    last_seen: "Last seen",
    loading_messages: "Loading messages...",
    no_messages: "No messages yet",
    no_messages_desc: "Messages will appear here once received from LINE",
    type_message: "Type a message...",
    initializing: "Initializing Secure Channel...",
    read: "Read",
    catalog_hub: "Catalog Hub",
    inventory_desc: "Inventory & Product Lifecycle",
    add_catalog: "Add New Catalog",
    total_catalog: "Total Catalog",
    active_storefront: "Active Storefront",
    search_catalog: "Search name, brand, or family...",
    sort_newest: "Sort: Newest",
    sort_az: "Sort: A-Z",
    sort_price_asc: "Sort: Price Low",
    sort_price_desc: "Sort: Price High",
    all_brands: "All Brands",
    all_categories: "All Categories",
    shop_orders_hub: "Shop Orders Hub",
    fulfillment_management: "Global Fulfillment Management",
    export_view: "Export Current View",
    total_revenue: "Total Revenue",
    pending_payments: "Pending Payments",
    awaiting_delivery: "Awaiting Delivery"
  }
} as const;

export default function AdminDashboard() {
  const [liffState, setLiffState] = useState<'loading' | 'admin' | 'customer' | 'unauthorized'>('loading');
  const [activeTab, setActiveTab] = useState('orders');
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const [chatFontSize, setChatFontSize] = useState(14);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [krwRate, setKrwRate] = useState(0.026);
  const [customers, setCustomers] = useState<any[]>([]);
  const [globalPendingOrders, setGlobalPendingOrders] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingKRW, setIsSavingKRW] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load preferences
  useEffect(() => {
    const savedLang = localStorage.getItem('admin_lang') as 'th' | 'en';
    if (savedLang) setLang(savedLang);
    const savedFontSize = localStorage.getItem('chat_font_size');
    if (savedFontSize) setChatFontSize(parseInt(savedFontSize));
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('admin_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('chat_font_size', chatFontSize.toString());
  }, [chatFontSize]);

  const t = TRANSLATIONS[lang];

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
          const { type, customers: c, orders: o } = JSON.parse(event.data);
          if (type === 'init' || type === 'update') {
            if (Array.isArray(c)) setCustomers(c);
            if (Array.isArray(o)) setGlobalPendingOrders(o);
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
      if (data.branding?.theme) {
        setTheme(data.branding.theme);
      }
      
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
      <div className={cn("h-screen w-full flex items-center justify-center transition-colors", theme === 'dark' ? "bg-[#0f111a]" : "bg-[#f8f9fc]")}>
        <LoadingView 
          theme={theme} 
          message={lang === 'th' ? TRANSLATIONS.th.initializing : TRANSLATIONS.en.initializing} 
        />
      </div>
    );
  }

  if (liffState === 'admin') {
    return (
      <div className={cn(
        "flex flex-col h-screen overflow-hidden transition-colors duration-300",
        theme === 'dark' ? "bg-[#0f111a] text-white" : "bg-[#f4f6f9] text-[#1a1d2e]"
      )}>
        {/* Topbar */}
        <div className={cn(
          "h-16 border-b flex items-center justify-between px-4 shadow-sm z-50 flex-shrink-0 transition-colors",
          theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
        )}>
          <div className="flex items-center gap-2 md:gap-6">
            {activeTab === 'orders' && (
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-[#8b92ad] hover:bg-[#f4f6f9] rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}

            <div className="flex items-center gap-2 font-bold text-base md:text-lg">
               <span className="text-[#00b900]">✦</span> <span className="hidden sm:inline">{shopInfo?.name || "Loading..."}</span>
               <span className="sm:hidden">{shopInfo?.name?.split(' ')[0] || "POS"}</span>
            </div>
            
            <nav className="hidden md:flex gap-4">
              <TabButton icon={<Package size={18}/>} label={t.orders} active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} theme={theme} />
              <TabButton icon={<ShoppingCart size={18}/>} label={t.shop_orders} active={activeTab === 'shop-orders'} onClick={() => setActiveTab('shop-orders')} theme={theme} />
              <TabButton icon={<Package size={18}/>} label={t.products} active={activeTab === 'products'} onClick={() => setActiveTab('products')} theme={theme} />
              <TabButton icon={<BarChart3 size={18}/>} label={t.reports} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} theme={theme} />
              <TabButton icon={<SettingsIcon size={18}/>} label={t.settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} theme={theme} />
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className={cn(
              "px-2 md:px-4 py-1 md:py-1.5 rounded-full flex items-center gap-1 md:gap-3 text-[10px] md:text-sm font-bold border transition-colors",
              theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-[#fffbe6] border-[#ffe58f]"
            )}>
              <span className={cn("opacity-80 whitespace-nowrap hidden xs:inline", theme === 'dark' ? "text-[#8b92ad]" : "text-[#1a1d2e]")}>1 KRW =</span>
              <input 
                type="number" 
                step="0.0001" 
                value={krwRate} 
                onChange={(e) => setKrwRate(parseFloat(e.target.value))}
                className={cn(
                  "rounded-lg w-14 md:w-20 px-1 md:px-2 py-0.5 text-center outline-none focus:ring-2 focus:ring-[#00b900] transition-all",
                  theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white" : "bg-white border-[#d9d9d9] text-[#1a1d2e]"
                )}
              />
              <button
                onClick={async () => {
                  try {
                    setIsSavingKRW(true);
                    const secret = localStorage.getItem('admin_secret') || '';
                    await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
                      body: JSON.stringify({ krwRate })
                    });
                    setTimeout(() => setIsSavingKRW(false), 2000);
                  } catch (err) { 
                    console.error(err); 
                    setIsSavingKRW(false);
                  }
                }}
                className={cn(
                  "text-[9px] font-black px-2 py-1 rounded-lg hover:opacity-80 active:scale-95 transition-all whitespace-nowrap",
                  isSavingKRW ? "bg-emerald-500 text-white animate-pulse" : "bg-[#00b900] text-white"
                )}
              >
                {isSavingKRW ? "SAVED!" : "SAVE"}
              </button>
              <span className={cn("opacity-50 font-medium hidden md:inline", theme === 'dark' ? "text-[#8b92ad]" : "text-[#856404]")}>({liveRate.toFixed(4)})</span>
            </div>

            <div className={cn("flex border rounded-xl p-0.5 shadow-sm transition-colors", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
              <button 
                onClick={() => setLang('th')}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                  lang === 'th' ? "bg-[#00b900] text-white shadow-sm" : "text-[#8b92ad] hover:text-[#1a1d2e]"
                )}
              >TH</button>
              <button 
                onClick={() => setLang('en')}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                  lang === 'en' ? "bg-[#00b900] text-white shadow-sm" : "text-[#8b92ad] hover:text-[#1a1d2e]"
                )}
              >EN</button>
            </div>

            <button
              onClick={handleGlobalRefresh}
              className={cn(
                "w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-xl border text-[#8b92ad] hover:text-[#00b900] transition-all shadow-sm",
                theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
              )}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#00b900]' : ''} />
            </button>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className={cn(
          "md:hidden border-b flex gap-2 px-2 overflow-x-auto no-scrollbar py-2 flex-shrink-0 transition-colors",
          theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
        )}>
           <TabButton icon={<Package size={14}/>} label={t.orders} active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} theme={theme} />
           <TabButton icon={<ShoppingCart size={14}/>} label={t.shop_orders} active={activeTab === 'shop-orders'} onClick={() => setActiveTab('shop-orders')} theme={theme} />
           <TabButton icon={<Package size={14}/>} label={t.products} active={activeTab === 'products'} onClick={() => setActiveTab('products')} theme={theme} />
           <TabButton icon={<BarChart3 size={14}/>} label={t.reports} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} theme={theme} />
           <TabButton icon={<SettingsIcon size={14}/>} label={t.settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} theme={theme} />
        </div>

        <div className="flex flex-1 items-stretch overflow-hidden relative">
          {/* Sidebar (Responsive) */}
          {activeTab === 'orders' && (
            <div 
              className={cn(
                "flex flex-col transition-all duration-300 z-40 transition-colors border-r",
                "fixed inset-y-0 left-0 md:relative md:translate-x-0 shadow-2xl md:shadow-none",
                isMobileMenuOpen ? "translate-x-0 w-[280px]" : "-translate-x-full md:translate-x-0",
                isSidebarCollapsed ? "md:w-16" : "md:w-[300px]",
                theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
              )}
            >
              <div className={cn("p-3 border-b transition-colors", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
                {isSidebarCollapsed ? (
                  <button 
                    onClick={() => setIsSearchModalOpen(true)}
                    className={cn(
                      "w-full flex items-center justify-center p-2 rounded-lg transition-all",
                      theme === 'dark' ? "bg-[#1a1d2e] text-[#8b92ad] hover:text-white" : "bg-[#f4f6f9] text-[#8b92ad] hover:text-[#1a1d2e]"
                    )}
                    title={t.search_customers}
                  >
                    <Search size={16} />
                  </button>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={16} />
                    <input 
                      type="text" 
                      placeholder={t.search_customers}
                      className={cn(
                        "w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-[#00b900] transition-all outline-none",
                        theme === 'dark' ? "bg-[#1a1d2e] text-white placeholder-[#8b92ad]/50" : "bg-[#f4f6f9] text-[#1a1d2e]"
                      )}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                 {customers.filter((c: any) => c.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map((customer: any) => {
                   const hasPendingOrder = globalPendingOrders.some((o: any) => o.lineUserId === customer.userId);
                   return (
                     <CustomerItem 
                        key={customer.userId} 
                        customer={customer} 
                        active={selectedCustomer?.userId === customer.userId}
                        collapsed={isSidebarCollapsed}
                        unreadCount={customer.unreadCount || 0}
                        hasPendingOrder={hasPendingOrder}
                        lang={lang}
                        onClick={() => { 
                          if (selectedCustomer?.userId !== customer.userId) {
                            setSelectedCustomer(customer); 
                          }
                          setIsChatOpen(true); 
                          setIsSidebarCollapsed(true); // Auto-collapse sidebar when chat opens
                          setIsMobileMenuOpen(false); // Close menu on select
                        }}
                     />
                   );
                 })}
              </div>

              <button 
                onClick={() => {
                  const nextState = !isSidebarCollapsed;
                  setIsSidebarCollapsed(nextState);
                  if (!nextState) setIsChatOpen(false); // If expanding sidebar, close chat
                }}
                className={cn(
                  "hidden md:block absolute bottom-6 right-[-15px] border rounded-full p-1.5 shadow-md transition-colors z-10",
                  theme === 'dark' ? "bg-[#161925] border-[#1f2335] text-white hover:bg-[#1a1d2e]" : "bg-white border-[#e2e5ef] hover:bg-[#f9f9f9]"
                )}
              >
                {isSidebarCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
              </button>
            </div>
          )}

          {/* Overlay for mobile sidebar */}
          {isMobileMenuOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-30 animate-in fade-in duration-200" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {activeTab === 'orders' && (
             selectedCustomer 
               ? <OrdersView customerId={selectedCustomer.userId} customerName={selectedCustomer.displayName} krwRate={krwRate} t={t} theme={theme} />
               : (
                 <div className="flex flex-col items-center justify-center h-full text-[#8b92ad] animate-in fade-in zoom-in duration-300">
                    <div className={cn(
                      "w-20 h-20 rounded-[32px] flex items-center justify-center shadow-sm mb-6 transition-colors",
                      theme === 'dark' ? "bg-[#161925]" : "bg-white"
                    )}>
                      <MessageCircle size={32} className="opacity-20" />
                    </div>
                    <h2 className={cn("text-xl font-bold mb-2 transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{t.select_customer}</h2>
                    <p className="text-sm opacity-60">{t.select_customer_desc}</p>
                 </div>
               )
           )}
           {activeTab === 'shop-orders' && (
             <ShopOrdersView 
               theme={theme} 
               t={t}
               onViewCustomer={(uid) => {
                 const cust = (customers as any[]).find(c => c.userId === uid);
                 if (cust) setSelectedCustomer(cust);
                 else {
                   setSelectedCustomer({ userId: uid, displayName: 'Customer' });
                 }
                 setActiveTab('orders');
                 setIsChatOpen(true);
                 setIsSidebarCollapsed(true); // Exclusive OR
               }} 
             />
           )}
           {activeTab === 'products' && <ProductManagement theme={theme} t={t} />}
           {activeTab === 'reports' && <ReportsView theme={theme} />}
           {activeTab === 'settings' && <SettingsView theme={theme} onSave={() => setRefreshKey(prev => prev + 1)} />}
        </main>
           
        {selectedCustomer && isChatOpen && (
          <div 
            className={cn(
              "flex flex-row flex-shrink-0 z-[60] md:z-20",
              "fixed inset-0 md:relative md:inset-auto w-full"
            )} 
            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? chatSidebarWidth : '100%' }}
          >
            {/* Drag Handle (Desktop Only) */}
            <div
              className="hidden md:flex w-1 flex-shrink-0 cursor-col-resize bg-[#e2e5ef] hover:bg-[#00b900] active:bg-[#00b900] transition-colors relative"
              onMouseDown={startResizing}
            >
              {/* Collapse Toggle Button (Desktop) */}
              <button
                onClick={() => setIsChatOpen(false)}
                className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 bg-white border border-[#e2e5ef] rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-[#f0f0f0] z-50"
                title="Close Chat"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsChatOpen(false)}
              className="md:hidden absolute top-4 right-4 z-[70] bg-white/80 backdrop-blur-sm border border-[#e2e5ef] rounded-full p-2 shadow-lg"
            >
              <X size={20} />
            </button>

            {/* Chat Content */}
            <div ref={chatSidebarRef} className="flex flex-col flex-1 overflow-hidden bg-white shadow-xl md:border-l border-[#e2e5ef]">
              <ChatHistory 
                userId={selectedCustomer.userId} 
                customerName={selectedCustomer.displayName} 
                pictureUrl={selectedCustomer.pictureUrl}
                unreadCount={selectedCustomer.unreadCount || 0}
                fontSize={chatFontSize}
                onFontSizeChange={setChatFontSize}
                lang={lang}
                onMarkAsRead={() => {
                  setCustomers(prev => prev.map(c => c.userId === selectedCustomer.userId ? { ...c, unreadCount: 0 } : c));
                  const headers = { 'x-admin-secret': localStorage.getItem('admin_secret') || '' };
                  fetch(`/api/customers/${selectedCustomer.userId}/read`, { method: 'POST', headers }).catch(console.error);
                }}
              />
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
        
        {/* Search Modal for Collapsed Sidebar */}
        <ConfirmModal 
          isOpen={isSearchModalOpen}
          title={t.search_customers}
          onCancel={() => setIsSearchModalOpen(false)}
          theme={theme}
          type="alert"
          onConfirm={() => setIsSearchModalOpen(false)}
          message={
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={18} />
                <input 
                  autoFocus
                  type="text"
                  placeholder={t.search_customers}
                  className={cn(
                    "w-full rounded-2xl pl-12 pr-4 py-4 text-base outline-none focus:ring-2 focus:ring-[#00b900] shadow-inner transition-all",
                    theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f4f6f9] border-[#e2e5ef] text-[#1a1d2e]"
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="mt-4 max-h-[300px] overflow-y-auto no-scrollbar">
                {customers
                  .filter((c: any) => c.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 5)
                  .map((customer: any) => (
                    <div 
                      key={customer.userId}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setIsChatOpen(true);
                        setIsSearchModalOpen(false);
                      }}
                      className={cn(
                        "p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors mb-2",
                        theme === 'dark' ? "hover:bg-[#2d324d]" : "hover:bg-[#f4f6f9]"
                      )}
                    >
                      <img src={customer.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div className="text-left">
                        <div className={cn("font-bold text-sm", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{customer.displayName}</div>
                        <div className="text-[10px] text-[#8b92ad]">{t.last_seen}: {new Date(customer.lastSeen).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
  }
  return null;
}

function TabButton({ icon, label, active, onClick, theme }: { icon: any, label: string, active: boolean, onClick: any, theme?: 'light' | 'dark' }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-1 py-1 border-b-2 transition-all duration-200 font-bold text-xs uppercase tracking-wider",
        active 
          ? (theme === 'dark' ? "border-[#00b900] text-white" : "border-[#00b900] text-[#1a1d2e]") 
          : (theme === 'dark' ? "border-transparent text-[#8b92ad] hover:text-white" : "border-transparent text-[#8b92ad] hover:text-[#1a1d2e]")
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CustomerItem({ customer, active, collapsed, unreadCount, hasPendingOrder, onClick, lang = 'en', theme = 'light' }: { customer: any, active: boolean, collapsed: boolean, unreadCount: number, hasPendingOrder: boolean, onClick: any, lang?: 'th' | 'en', theme?: 'light' | 'dark' }) {
  if (collapsed) {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "p-3 flex justify-center cursor-pointer transition-colors relative",
          theme === 'dark' ? "hover:bg-[#1a1d2e]" : "hover:bg-[#f9f9f9]",
          active && (theme === 'dark' ? "bg-[#2d324d] border-l-4 border-[#00b900]" : "bg-[#e8f8e8] border-l-4 border-[#00b900]")
        )}
        title={customer.displayName}
      >
        <div className="relative">
          <img src={customer.pictureUrl} alt="" className="w-8 h-8 rounded-full bg-[#eee]" />
          {unreadCount > 0 && <div className={cn("absolute top-0 right-0 w-3 h-3 bg-[#00b900] border-2 rounded-full animate-pulse z-10", theme === 'dark' ? "border-[#1a1d2e]" : "border-white")} />}
          {hasPendingOrder && unreadCount === 0 && <div className={cn("absolute top-0 right-0 w-3 h-3 bg-[#ffb700] border-2 rounded-full animate-pulse z-10", theme === 'dark' ? "border-[#1a1d2e]" : "border-white")} />}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={cn(
        "px-4 py-3 flex items-center gap-3 cursor-pointer border-b transition-colors",
        theme === 'dark' ? "border-[#1f2335] hover:bg-[#1a1d2e]" : "border-[#e2e5ef] hover:bg-[#f9f9f9]",
        active && (theme === 'dark' ? "bg-[#2d324d] border-l-4 border-[#00b900]" : "bg-[#e8f8e8] border-l-4 border-[#00b900]")
      )}
    >
      <div className="relative">
        <img 
          src={customer.pictureUrl} 
          alt={customer.displayName} 
          className="w-10 h-10 rounded-full bg-[#eee] object-cover" 
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold', theme === 'dark' ? "bg-[#2d324d] text-white" : "bg-[#1a1d2e] text-white");
            fallback.textContent = customer.displayName.charAt(0).toUpperCase();
            target.parentElement?.insertBefore(fallback, target);
          }}
        />
        {unreadCount > 0 && <div className={cn("absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#00b900] border-2 rounded-full animate-pulse shadow-sm z-10", theme === 'dark' ? "border-[#161925]" : "border-white")} title="New Message" />}
        {hasPendingOrder && unreadCount === 0 && <div className={cn("absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ffb700] border-2 rounded-full animate-pulse shadow-sm z-10", theme === 'dark' ? "border-[#161925]" : "border-white")} title="Pending Order" />}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className={cn("font-bold text-sm truncate flex justify-between items-center transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
          {customer.displayName}
          {unreadCount > 0 && <span className="bg-[#00b900] text-white text-[9px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
        </div>
        <div className="text-[10px] text-[#8b92ad] truncate">{lang === 'th' ? TRANSLATIONS.th.last_seen : TRANSLATIONS.en.last_seen}: {new Date(customer.lastSeen).toLocaleDateString()}</div>
      </div>
    </div>
  );
}

const OrdersView = React.memo(({ customerId, customerName, krwRate, t, theme }: { customerId: string, customerName: string, krwRate: number, t: any, theme?: 'light' | 'dark' }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [newAddress, setNewAddress] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [toast, setToast] = useState<{message: string, icon: string} | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [modal, setModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: null, type: 'confirm' });
  const [parcels, setParcels] = useState<any[]>([]);
  const hasSeededParcels = useRef(false);
  const isLocked = useRef(false);

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

  const refreshData = async (isManual = false) => {
    if (!customerId || (isLocked.current && !isManual)) return;
    try {
      const r = await fetch('/api/customers/' + customerId, {
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
      if (!isManual) setIsInitialLoading(false);
    } catch (err) {
      console.error("Refresh data error:", err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    setIsInitialLoading(true);
    const headers = { 'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' };
    fetch('/api/settings', { headers }).then(r => r.json()).then(data => setSettings(data));
    fetch('/api/products', { headers }).then(r => r.json()).then(data => setProducts(data));

    // ONLY reset state and full-refresh if we switched to a DIFFERENT person
    if (prevUserId.current !== customerId) {
      setCustomerData(null);
      setOrders([]);
      setParcels([]);
      hasSeededParcels.current = false;
      prevUserId.current = customerId;
    }
    
    // Always fetch latest data in background
    refreshData();
  }, [customerId]);

  const handleAddAddress = async () => {
    if (!newAddress || !customerId) return;
    
    // Lock background refreshes
    isLocked.current = true;
    
    const currentAddresses = customerData?.addresses || [];
    const updatedAddresses = [...currentAddresses, newAddress];
    
    // Optimistic UI
    setCustomerData((prev: any) => ({ ...prev, addresses: updatedAddresses }));
    setNewAddress('');

    try {
      const secret = typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '';
      const res = await fetch(`/api/customers/${customerId}`, {
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
    if (!customerId) return;
    
    setModal({
      isOpen: true,
      title: 'Remove Address?',
      message: `Are you sure you want to remove this address?\n${addrToRemove}`,
      type: 'danger',
      onConfirm: async () => {
        const updatedAddresses = (customerData?.addresses || []).filter((a: string) => a !== addrToRemove);
        try {
          const res = await fetch(`/api/customers/${customerId}`, {
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
    
    setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'preparing', statusBeforeParcel: o.status } : o));

    await fetch(`/api/orders/${order._id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
      },
      body: JSON.stringify({ status: 'preparing', statusBeforeParcel: order.status })
    });

    const newItem = { id: Date.now(), name: order.product, quantity: order.quantity || 1, sold: order.soldTHB, cost: order.costKRW, orderId: order._id };
    
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
      message: 'Remove this item from the parcel and revert its status?',
      type: 'confirm',
      onConfirm: async () => {
        if (orderId) {
          const orderToRevert = orders.find(o => o._id === orderId);
          const targetStatus = orderToRevert?.statusBeforeParcel || 'pending';
          
          setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: targetStatus } : o));
          await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || ''
            },
            body: JSON.stringify({ status: targetStatus })
          });
        }
        setParcels(parcels.map(p => p.id === parcelId ? {
          ...p,
          items: p.items.filter((i: any) => i.id !== itemId)
        } : p));
        showToast('Item status reverted', '↩️');
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

  const handleSendQr = async (order: any) => {
    try {
      const res = await fetch(`/api/orders/${order._id}/send-qr`, {
        method: 'POST',
        headers: { 'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' }
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === order._id ? { ...o, paymentQrSent: true } : o));
        showToast('QR Sent via LINE', '📱');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to send QR', '❌');
      }
    } catch (e) {
      showToast('Error sending QR', '❌');
    }
  };

  const handleBatchSendQr = async () => {
    if (selectedOrderIds.size === 0) return;
    try {
      const res = await fetch(`/api/orders/batch/send-qr`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' 
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrderIds) })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => selectedOrderIds.has(o._id) ? { ...o, paymentQrSent: true } : o));
        setSelectedOrderIds(new Set());
        showToast('Batch QR Sent', '📱');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to send batch QR', '❌');
      }
    } catch (e) {
      showToast('Error sending batch QR', '❌');
    }
  };

  const handleBatchMarkPaid = async () => {
    if (selectedOrderIds.size === 0) return;
    if (!confirm(`Mark ${selectedOrderIds.size} orders as PAID and send Thank You message?`)) return;
    try {
      const res = await fetch(`/api/orders/batch/mark-paid`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' 
        },
        body: JSON.stringify({ orderIds: Array.from(selectedOrderIds) })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => selectedOrderIds.has(o._id) ? { ...o, status: 'paid' } : o));
        setSelectedOrderIds(new Set());
        showToast('Batch Marked Paid', '✅');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to mark batch paid', '❌');
      }
    } catch (e) {
      showToast('Error marking batch paid', '❌');
    }
  };

  const handleMarkPaid = async (order: any) => {
    if (!confirm('Mark order as PAID and send Thank You message via LINE?')) return;
    try {
      const res = await fetch(`/api/orders/${order._id}/mark-paid`, {
        method: 'POST',
        headers: { 'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' }
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'paid' } : o));
        showToast('Marked as Paid', '✅');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to mark paid', '❌');
      }
    } catch (e) {
      showToast('Error marking paid', '❌');
    }
  };

  const handleQuickOrder = async (product: any, finalPrice: number, quantity: number) => {
    if (!customerId) return;
    isLocked.current = true;
    try {
      const adminSecret = (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '';
      
      // Auto-catalog product if requested
      if (product.autoCatalog) {
        try {
          await fetch('/api/products', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-secret': adminSecret
            },
            body: JSON.stringify({
              name: product.name,
              brand: product.brand,
              categories: product.categories || [],
              modelLine: product.modelLine,
              imageUrl: product.imageUrl || '',
              description: product.description || '',
              price: finalPrice,
              cost: 0,
              variants: [{ 
                thickness: product.thickness || 'Standard', 
                colors: [product.color || 'Default'], 
                price: finalPrice, 
                cost: 0 
              }]
            })
          });
        } catch (catErr) {
          console.error("Auto-catalog failed, continuing with order only", catErr);
        }
      }

      const thickness = product.selectedThickness || product.thickness;
      const color = product.selectedColor || product.color;
      const fullProductName = `${product.brand ? `[${product.brand}] ` : ''}${product.modelLine ? `${product.modelLine} - ` : ''}${product.name}${thickness ? ` (${thickness})` : ''}${color ? ` - ${color}` : ''}`;

      const orderData = {
        lineUserId: customerId,
        displayName: customerName,
        product: fullProductName,
        quantity: quantity,
        soldTHB: finalPrice * quantity,
        costKRW: product.cost || 0,
        profit: (finalPrice * quantity) - ((product.cost || 0) * krwRate),
        rateUsed: krwRate,
        status: 'pending',
        tracking: '',
        courier: ''
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        setIsQuickOrderOpen(false);
        showToast('Chat Order Logged', '💬');
        isLocked.current = false;
        refreshData(true);
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
    if (!customerId || !settings || !selectedAddress) {
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
        lineUserId: customerId,
        displayName: customerName,
        product: item.name,
        quantity: item.quantity || 1,
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

      info.appendChild(createLine('To', customerName));
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

    // Send automated tracking message if template exists
    if (settings.trackingTemplate) {
      const productList = parcel.items.map((i: any) => i.name).join(', ');
      let message = settings.trackingTemplate
        .replace(/{tracking}/g, parcel.tracking || '')
        .replace(/{courier}/g, parcel.courier || '')
        .replace(/{product}/g, productList)
        .replace(/{name}/g, customerName);

      try {
        const secret = (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '';
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-secret': secret
          },
          body: JSON.stringify({ userId: customerId, text: message })
        });
      } catch (err) {
        console.error("Failed to send tracking message:", err);
      }
    }

    setParcels(prev => prev.filter(p => p.id !== parcel.id));
    showToast('Parcel Shipped', '📦');
    isLocked.current = false;
    refreshData(true);
  };

  if (!customerId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#8b92ad] opacity-60 font-sans">
        <div className="bg-white p-8 rounded-full mb-4 shadow-sm">
           <Search size={48} />
        </div>
        <h2 className="text-xl font-bold">{t.select_customer}</h2>
        <p className="text-sm">{t.select_customer_desc}</p>
      </div>
    );
  }

  if (isInitialLoading) {
    return <LoadingView theme={theme} message="Loading Customer Data..." />;
  }

  return (
    <div className="max-w-4xl mx-auto font-sans relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#1a1d2e] text-white px-6 py-3 rounded-full font-bold shadow-2xl z-[100] animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span>{toast.icon}</span> {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <h1 className={cn("text-xl md:text-2xl font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{customerName}</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsQuickOrderOpen(true)}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-white rounded-lg text-[10px] md:text-xs font-bold hover:opacity-90 shadow-lg active:scale-95 transition-all",
              theme === 'dark' ? "bg-[#2d324d] shadow-[#00000033]" : "bg-[#1a1d2e]"
            )}
          >
            <Bell size={16} className="hidden xs:block" /> {t.quick_order}
          </button>
          <button 
            onClick={addParcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-[#00b900] text-white rounded-lg text-[10px] md:text-xs font-bold hover:opacity-90 shadow-lg shadow-[#00b90033] active:scale-95 transition-all"
          >
            <Plus size={16} className="hidden xs:block" /> {t.add_parcel}
          </button>
        </div>
      </div>

      <div className="min-h-[calc(100vh-200px)]">
           {/* Pending & Preparing Orders (Active Orders from Store) */}
           {orders.filter(o => ['pending', 'paid', 'preparing'].includes(o.status)).length > 0 && (
             <div className="mb-8 animate-in fade-in slide-in-from-top-4">
               <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-4 block flex items-center gap-2">
                 <Clock size={12} className="text-orange-400" /> {t.active_orders}
               </label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {orders.filter(o => ['pending', 'paid', 'preparing'].includes(o.status)).map((order) => {
                   const isPreparing = order.status === 'preparing';
                   const isPaid = order.status === 'paid';
                   return (
                      <div 
                        key={order._id} 
                        className={cn(
                          "border rounded-3xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group transition-all",
                          isPreparing 
                            ? (theme === 'dark' ? "bg-yellow-400/10 border-yellow-400/30" : "bg-yellow-50 border-yellow-100") 
                            : isPaid 
                              ? (theme === 'dark' ? "bg-emerald-400/10 border-emerald-400/30" : "bg-emerald-50 border-emerald-100") 
                              : selectedOrderIds.has(order._id) 
                                ? (theme === 'dark' ? "bg-[#00b900]/10 border-[#00b900]" : "bg-[#00b90008] border-[#00b900]") 
                                : (theme === 'dark' ? "bg-[#161925] border-[#1f2335] hover:bg-[#1a1d2e]" : "bg-orange-50/50 border-orange-100 hover:bg-orange-50")
                        )}
                      >
                        <div className="flex items-start gap-3 md:gap-4 w-full">
                          {!isPreparing && !isPaid && (
                            <button 
                              onClick={() => {
                                setSelectedOrderIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(order._id)) next.delete(order._id);
                                  else next.add(order._id);
                                  return next;
                                });
                              }}
                              className={cn(
                                "mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                selectedOrderIds.has(order._id) ? "bg-[#00b900] border-[#00b900] text-white" : "border-[#b3b9c4] hover:border-[#00b900]"
                              )}
                            >
                              {selectedOrderIds.has(order._id) && <Check size={14} strokeWidth={3} />}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "text-[10px] font-bold uppercase mb-1",
                              isPreparing ? "text-yellow-600" : isPaid ? "text-emerald-500" : "text-orange-400"
                            )}>
                              {isPreparing ? `✓ ${t.in_parcel}` : isPaid ? `✓ ${t.paid}` : t.new_order_request}
                            </div>
                            <div className="font-bold flex items-center flex-wrap gap-2 leading-tight transition-colors">
                              <span className={theme === 'dark' ? "text-white" : "text-[#1a1d2e]"}>{order.product}</span>
                              {(order.quantity > 1 || order.product.match(/^\d+x\s/)) && (
                                <span className="bg-[#1a1d2e] text-white text-[10px] px-1.5 py-0.5 rounded-md font-black shrink-0">
                                  {order.product.match(/^\d+x\s/) ? order.product.match(/^(\d+)x\s/)?.[1] : order.quantity}x
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#8b92ad] mt-1">฿{order.soldTHB.toLocaleString()} • Korean Import</div>
                          </div>
                          
                          <button 
                            onClick={() => handleDeleteOrder(order)}
                            className={cn(
                              "md:hidden p-2 text-[#8b92ad] hover:text-red-500 rounded-xl transition-all",
                              theme === 'dark' ? "hover:bg-red-500/10" : "hover:bg-red-50"
                            )}
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                          <button 
                            onClick={() => {
                              if (isPreparing) {
                                const parcelWithItem = parcels.find(p => p.items.some((i: any) => i.orderId === order._id));
                                if (parcelWithItem) {
                                  const item = parcelWithItem.items.find((i: any) => i.orderId === order._id);
                                  if (item) removeItemFromParcel(parcelWithItem.id, item.id, order._id);
                                } else {
                                  const targetStatus = order.statusBeforeParcel || 'pending';
                                  setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: targetStatus } : o));
                                  fetch(`/api/orders/${order._id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', 'x-admin-secret': (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') : '') || '' },
                                    body: JSON.stringify({ status: targetStatus })
                                  });
                                  showToast('Orphaned item reverted', '↩️');
                                }
                              } else {
                                handleImportToParcel(order);
                              }
                            }}
                            className={cn(
                              "flex-1 md:flex-none px-4 py-2 rounded-2xl text-[10px] font-bold transition-all shadow-sm flex justify-center items-center gap-1 group/btn",
                              isPreparing 
                                ? "bg-yellow-400 text-white border border-yellow-400 hover:bg-red-500 hover:border-red-500 active:scale-95" 
                                : isPaid 
                                  ? (theme === 'dark' ? "bg-[#1a1d2e] text-emerald-500 border border-[#00b900]/20 hover:bg-[#00b900] hover:text-white active:scale-95" : "bg-white text-emerald-500 border border-emerald-200 hover:bg-emerald-500 hover:text-white active:scale-95")
                                  : (theme === 'dark' ? "bg-[#1a1d2e] text-orange-500 border border-orange-500/20 hover:bg-orange-500 hover:text-white active:scale-95" : "bg-white text-orange-500 border border-orange-200 hover:bg-orange-500 hover:text-white active:scale-95")
                            )}
                          >
                            {isPreparing ? (
                              <>
                                <span className="flex items-center gap-1 group-hover/btn:hidden"><CheckCircle2 size={14} /> ✓ In Parcel</span>
                                <span className="hidden items-center gap-1 group-hover/btn:flex"><Trash2 size={14} /> Remove</span>
                              </>
                            ) : t.move_to_parcel}
                          </button>

                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleSendQr(order)}
                                className={cn(
                                  "flex-1 md:flex-none px-3 py-2 rounded-2xl text-[10px] font-bold transition-all shadow-sm border flex items-center justify-center gap-1 active:scale-95",
                                  order.paymentQrSent 
                                    ? "bg-[#00b900] text-white border-[#00b900]" 
                                    : (theme === 'dark' ? "bg-[#1a1d2e] text-white border-[#1f2335] hover:bg-[#161925]" : "bg-white text-[#1a1d2e] border-[#e2e5ef] hover:bg-[#f8f9fc]")
                                )}
                              >
                                <QrCode size={14} /> {order.paymentQrSent ? 'QR Sent ✓' : t.send_qr}
                              </button>
                              <button
                                onClick={() => handleMarkPaid(order)}
                                className="flex-1 md:flex-none px-3 py-2 rounded-2xl text-[10px] font-bold bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                              >
                                <CheckCircle2 size={14} /> {t.mark_paid}
                              </button>
                            </>
                          )}

                          <button 
                            onClick={() => handleDeleteOrder(order)}
                            className={cn(
                              "hidden md:block p-2 text-[#8b92ad] hover:text-red-500 rounded-xl transition-all",
                              theme === 'dark' ? "hover:bg-red-500/10" : "hover:bg-red-50"
                            )}
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

           <div className={cn("rounded-3xl border p-6 mb-8 shadow-sm transition-colors", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
             <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-4 block">
               Select Delivery Address (SAVED ADDRESSES)
             </label>
             
             <div className="space-y-3">
               {customerData?.addresses?.map((addr: string, i: number) => (
                 <div key={i} className="flex items-center gap-3">
                   <label className={cn(
                      "flex-1 flex items-center gap-3 p-4 border rounded-2xl transition-all cursor-pointer group",
                      selectedAddress === addr 
                        ? "border-[#00b900] bg-[#00b90005]" 
                        : (theme === 'dark' ? "border-[#1f2335] bg-[#1a1d2e] hover:border-[#00b900]" : "border-[#e2e5ef] hover:border-[#00b900]")
                    )}>
                     <input 
                        type="radio" 
                        name="address" 
                        value={addr} 
                        checked={selectedAddress === addr}
                        onChange={() => setSelectedAddress(addr)}
                        className="w-4 h-4 accent-[#00b900]" 
                      />
                     <span className={cn("text-sm transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{addr}</span>
                   </label>
                   <button 
                     onClick={() => handleRemoveAddress(addr)}
                     className={cn(
                       "p-3 text-[#8b92ad] hover:text-red-500 rounded-xl transition-all",
                       theme === 'dark' ? "hover:bg-red-500/10" : "hover:bg-red-50"
                     )}
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
                   className={cn(
                     "flex-1 border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00b900] outline-none transition-colors",
                     theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                   )}
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
               <div key={parcel.id} className={cn(
                  "border-2 border-dashed rounded-3xl p-6 relative transition-colors",
                  theme === 'dark' ? "bg-[#161925]/50 border-[#1f2335]" : "bg-[#f8f9fc] border-[#e2e5ef]"
                )}>
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
                     <div key={item.id} className={cn(
                        "rounded-2xl border p-6 mb-4 shadow-sm relative overflow-hidden group transition-colors",
                        theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
                      )}>
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#00b900] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="flex justify-between items-start mb-6">
                           <div className={cn("text-[10px] font-black uppercase tracking-[0.2em] transition-colors", theme === 'dark' ? "text-white opacity-20" : "text-[#1a1d2e] opacity-20")}>Item Details</div>
                        </div>

                        <div className="flex justify-between items-center mb-4 gap-4">
                           <div className="flex-[3]">
                             <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Product Name</label>
                             <input 
                                type="text" 
                                value={item.name} 
                                onChange={(e) => updateItem(parcel.id, item.id, 'name', e.target.value)}
                                className={cn(
                                   "w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900] transition-colors",
                                   theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                                 )} 
                             />
                           </div>
                           <div className="flex-1">
                             <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Qty</label>
                             <input 
                                type="number" 
                                value={item.quantity || 1} 
                                onChange={(e) => updateItem(parcel.id, item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className={cn(
                                   "w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900] transition-colors",
                                   theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                                 )} 
                             />
                           </div>
                           <button 
                             onClick={() => removeItemFromParcel(parcel.id, item.id, item.orderId)}
                             className={cn(
                               "mt-6 p-3 text-[#8b92ad] hover:text-red-500 rounded-xl transition-all flex-shrink-0",
                               theme === 'dark' ? "hover:bg-red-500/10" : "hover:bg-red-50"
                             )}
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
                               className={cn(
                                   "w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900] transition-colors",
                                   theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                                 )} 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block">Cost (KRW)</label>
                            <input 
                               type="number" 
                               value={item.cost} 
                               onChange={(e) => updateItem(parcel.id, item.id, 'cost', parseFloat(e.target.value) || 0)}
                               className={cn(
                                   "w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00b900] transition-colors",
                                   theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                                 )} 
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
                        className={cn(
                          "w-full border rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00b900] transition-all appearance-none",
                          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                        )}
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
                        className={cn(
                          "w-full border rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00b900] transition-colors",
                          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-white border-[#e2e5ef] text-[#1a1d2e]"
                        )} 
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
                   <HistoryItem key={order._id} order={order} krwRate={krwRate} onUpdate={refreshData} theme={theme} />
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
        theme={theme}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel || (() => setModal({ ...modal, isOpen: false }))}
      />

      <QuickOrderModal 
        isOpen={isQuickOrderOpen}
        products={products}
        theme={theme}
        onConfirm={handleQuickOrder}
        onCancel={() => setIsQuickOrderOpen(false)}
      />

      {selectedOrderIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1d2e] text-white rounded-[32px] px-8 py-4 shadow-2xl flex items-center gap-6 z-[150] animate-in slide-in-from-bottom-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">{selectedOrderIds.size} ITEMS SELECTED</span>
            <span className="text-lg font-black text-[#00b900]">
              ฿{orders.filter(o => selectedOrderIds.has(o._id)).reduce((sum, o) => sum + (o.soldTHB || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="w-px h-8 bg-[#2a2d3e]"></div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBatchSendQr}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95",
                theme === 'dark' ? "bg-[#1a1d2e] text-white hover:bg-[#161925]" : "bg-white text-[#1a1d2e] hover:bg-[#f8f9fc]"
              )}
            >
              <QrCode size={16} /> Send Combined QR
            </button>
            <button 
              onClick={handleBatchMarkPaid}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 bg-[#00b900] text-white hover:opacity-90"
            >
              <CheckCircle2 size={16} /> Mark All Paid
            </button>
            <button 
              onClick={() => setSelectedOrderIds(new Set())}
              className="p-2 ml-2 text-[#8b92ad] hover:text-white transition-all rounded-full hover:bg-[#2a2d3e]"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
    );
  });

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ShoppingCart,
  FileSpreadsheet,
  Search,
  Calendar,
  Filter,
  ExternalLink,
  TrendingUp,
  Clock,
  Package,
  CheckCircle2,
  X,
  DollarSign,
  BarChart2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import LoadingView from './LoadingView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Order {
  _id: string;
  userId: string;
  platform?: 'line' | 'instagram' | 'telegram';
  displayName: string;
  address: string;
  product: string;
  quantity: number;
  items: any[];
  soldTHB: number;
  profit?: number;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  tracking?: string;
  courier?: string;
}

export default function ShopOrdersView({
  theme,
  onViewCustomer,
  t,
  onLimitHit,
}: {
  theme?: 'light' | 'dark',
  onViewCustomer?: (userId: string) => void,
  t: any,
  onLimitHit?: (feature: string, limit?: number, current?: number) => void,
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Fix 14: separate error state
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Define status lists before state so we can use allStatuses as default
  const allStatuses = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];
  const newOrderStatuses = ['pending', 'paid'];

  // Filters — default to ALL statuses including cancelled
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(allStatuses);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination & View
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Confirmation modals
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });

  // Sorting
  const [sortField, setSortField] = useState<'createdAt' | 'soldTHB' | 'status' | 'displayName' | null>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Date picker refs — lets the whole container trigger showPicker()
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Fix 13: Escape-key dismiss for Cancel modal
  useEffect(() => {
    if (!cancelConfirm.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCancelConfirm({ open: false, orderId: null });
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cancelConfirm.open]);

  // Fix 13: Escape-key dismiss for Delete modal
  useEffect(() => {
    if (!deleteConfirm.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteConfirm({ open: false, orderId: null });
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [deleteConfirm.open]);

  // Restore from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPageSize = localStorage.getItem('orderPageSize');
      if (savedPageSize && ['25', '50', '100', 'all'].includes(savedPageSize)) {
        setPageSize(savedPageSize === 'all' ? Infinity : parseInt(savedPageSize));
      }
    }
  }, []);

  // Status filter is purely client-side — never sent to API.
  // Only search text and date range trigger a re-fetch.
  // Fix 4: AbortController on fetch
  const fetchOrders = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    // Fix 14: clear error at start of each fetch
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/shop-orders?${params.toString()}`, { signal });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (error: any) {
      // Fix 4: ignore aborted requests
      if (error?.name === 'AbortError') return;
      console.error('Failed to fetch orders:', error);
      // Fix 14: surface error to UI
      setFetchError('Failed to load orders. Please check your connection and try again.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, startDate, endDate]);

  useEffect(() => {
    // Fix 4: create AbortController, pass signal, abort on cleanup
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchOrders(controller.signal);
    }, 300); // Debounce
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchOrders]);


  const handleExportCSV = () => {
    // Fix 5: export sortedOrders (filtered + sorted view) instead of raw orders
    if (!sortedOrders || sortedOrders.length === 0) return;

    // Fix 9: add Profit column to CSV headers
    const headers = ['Date', 'Customer', 'Products', 'Total (THB)', 'Profit (THB)', 'Status', 'Tracking', 'Address'];

    // Rows
    const rows = sortedOrders.map(o => [
      new Date(o.createdAt).toLocaleString('th-TH'),
      o.displayName,
      o.items?.map((i: any) => `${i.qty}x ${i.name}`).join(' + ') || `${o.quantity || 1}x ${o.product}`,
      o.soldTHB,
      // Fix 9: include profit in CSV row
      o.profit || 0,
      o.status,
      o.tracking || '-',
      `"${o.address?.replace(/"/g, '""') || ''}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Add BOM for Thai characters in Excel
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shop_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fix 6: memoize filteredOrders
  const filteredOrders = useMemo(
    () => orders?.filter(o => selectedStatuses.includes(o.status)) || [],
    [orders, selectedStatuses]
  );

  // Sort orders
  const sortedOrders = useMemo(() => {
    if (!sortField) return filteredOrders;
    return [...filteredOrders].sort((a, b) => {
      let av: any = a[sortField as keyof Order];
      let bv: any = b[sortField as keyof Order];
      // Fix 3: include 'cancelled' at the end so indexOf returns a valid position
      if (sortField === 'status') {
        const order = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];
        av = order.indexOf(av);
        bv = order.indexOf(bv);
      }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortDir]);

  // Pagination
  const totalPages = pageSize === Infinity ? 1 : Math.ceil(sortedOrders.length / pageSize);
  const paginatedOrders = pageSize === Infinity
    ? sortedOrders
    : sortedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats always computed from all loaded orders, not just the status-filtered view.
  const allOrders = orders || [];
  const confirmedOrders = allOrders.filter(o => ['paid', 'preparing', 'shipped', 'delivered'].includes(o.status));
  const pendingOnlyOrders = allOrders.filter(o => o.status === 'pending');
  const confirmedRevenue = confirmedOrders.reduce((s, o) => s + (o.soldTHB || 0), 0);
  const potentialRevenue = pendingOnlyOrders.reduce((s, o) => s + (o.soldTHB || 0), 0);
  const stats = {
    revenue:          confirmedRevenue,
    potentialRevenue,
    profit:           confirmedOrders.reduce((s, o) => s + (o.profit || 0), 0),
    count:            confirmedOrders.length,
    avg:              confirmedOrders.length ? Math.round(confirmedRevenue / confirmedOrders.length) : 0,
    pending:   allOrders.filter(o => o.status === 'pending').length,
    preparing: allOrders.filter(o => ['preparing', 'shipped'].includes(o.status)).length,
    delivered: allOrders.filter(o => o.status === 'delivered').length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
  };

  // Fix 1: cancelOrder with rollback on failure
  async function cancelOrder(id: string) {
    const previousOrders = orders;
    setOrders(prev => prev?.map(o => o._id === id ? { ...o, status: 'cancelled' as const } : o) ?? prev);
    setCancelConfirm({ open: false, orderId: null });
    try {
      await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
    } catch (err) {
      // Rollback optimistic update and surface error
      setOrders(previousOrders);
      setFetchError('Failed to cancel order. Please try again.');
    }
  }

  // Fix 7: extend nextStatusMap to cover full workflow
  const nextStatusMap: Partial<Record<Order['status'], Order['status']>> = {
    paid: 'preparing',
    preparing: 'shipped',
    shipped: 'delivered',
  };

  const nextStatusLabel: Partial<Record<Order['status'], string>> = {
    paid: 'Preparing',
    preparing: 'Shipped',
    shipped: 'Delivered',
  };

  // Fix 2: advanceOrder with rollback on failure
  async function advanceOrder(id: string, nextStatus: Order['status']) {
    const previousOrders = orders;
    setOrders(prev => prev?.map(o => o._id === id ? { ...o, status: nextStatus } : o) ?? prev);
    try {
      await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
    } catch (err) {
      // Rollback optimistic update and surface error
      setOrders(previousOrders);
      setFetchError('Failed to advance order status. Please try again.');
    }
  }

  async function deleteOrder(id: string) {
    setOrders(prev => prev?.filter(o => o._id !== id) ?? prev);
    setDeleteConfirm({ open: false, orderId: null });
    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    } catch { /* optimistic removal stays */ }
  }

  // Handler functions
  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const selectAllStatuses = () => {
    setSelectedStatuses(allStatuses);
  };

  const clearAllStatuses = () => {
    setSelectedStatuses([]);
  };

  const selectNewOrdersOnly = () => {
    setSelectedStatuses(newOrderStatuses);
  };

  const changePageSize = (size: number | string) => {
    const newSize = size === 'all' ? Infinity : Number(size);
    setPageSize(newSize);
    localStorage.setItem('orderPageSize', String(size));
    setCurrentPage(1);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ field, label, align = 'left' }: { field: typeof sortField, label: string, align?: 'left' | 'right' }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={cn(
          "px-6 py-5 cursor-pointer select-none hover:opacity-75 transition-opacity",
          align === 'right' ? 'text-right' : ''
        )}
      >
        <div className={cn("flex items-center gap-2", align === 'right' ? 'justify-end' : 'justify-start')}>
          <span>{label}</span>
          <span className="flex flex-col -space-y-1 leading-none">
            <ChevronUp
              size={9}
              className={active && sortDir === 'asc' ? 'text-accent' : 'opacity-30'}
            />
            <ChevronDown
              size={9}
              className={active && sortDir === 'desc' ? 'text-accent' : 'opacity-30'}
            />
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className={cn("text-2xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
            <div className="p-2 bg-accent/[7%] rounded-xl text-accent">
              <ShoppingCart size={24} />
            </div>
            {t.shop_orders_hub || 'Shop Orders Hub'}
          </h2>
          <p className="text-[#8b92ad] text-xs font-medium mt-1 uppercase tracking-widest">{t.fulfillment_management || 'Global Fulfillment Management'}</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="w-full md:w-auto text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
          style={{ background: 'var(--accent-gradient)' }}
        >
          <FileSpreadsheet size={18} /> {t.export_view || 'Export Current View'}
        </button>
      </div>

      {/* Fix 14: Error banner with Retry button */}
      {fetchError && (
        <div className={cn(
          "rounded-2xl border px-5 py-4 mb-6 flex items-center justify-between gap-4",
          theme === 'dark'
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : "bg-red-50 border-red-200 text-red-700"
        )}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span className="text-sm font-bold">{fetchError}</span>
          </div>
          <button
            onClick={() => fetchOrders()}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black border transition-all active:scale-95",
              theme === 'dark'
                ? "border-red-500/40 text-red-400 hover:bg-red-500/20"
                : "border-red-300 text-red-700 hover:bg-red-100"
            )}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Ribbon — click any card to filter orders below */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        <StatsCard icon={<TrendingUp size={16} />} label="Confirmed Revenue"
          value={`฿${stats.revenue.toLocaleString()}`}
          subLabel={stats.potentialRevenue > 0 ? `+฿${stats.potentialRevenue.toLocaleString()} potential` : `${stats.count} confirmed orders`}
          subLabelHighlight={stats.potentialRevenue > 0}
          color="emerald" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(allStatuses)}
          active={selectedStatuses.length === allStatuses.length}
        />
        <StatsCard icon={<DollarSign size={16} />} label="Total Profit"
          value={`฿${stats.profit.toLocaleString()}`} subLabel={`฿${stats.avg.toLocaleString()} avg / order`}
          color="indigo" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(['shipped', 'delivered'])}
          active={selectedStatuses.length === 2 && selectedStatuses.includes('delivered') && selectedStatuses.includes('shipped')}
        />
        <StatsCard icon={<Clock size={16} />} label="Pending Payments"
          value={stats.pending.toString()} subLabel="Awaiting payment"
          color="amber" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(['pending'])}
          active={selectedStatuses.length === 1 && selectedStatuses.includes('pending')}
        />
        <StatsCard icon={<Package size={16} />} label="In Fulfillment"
          value={stats.preparing.toString()} subLabel="Preparing + shipped"
          color="blue" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(['preparing', 'shipped'])}
          active={selectedStatuses.length === 2 && selectedStatuses.includes('preparing') && selectedStatuses.includes('shipped')}
        />
        <StatsCard icon={<CheckCircle2 size={16} />} label="Delivered"
          value={stats.delivered.toString()} subLabel="Successfully fulfilled"
          color="emerald" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(['delivered'])}
          active={selectedStatuses.length === 1 && selectedStatuses.includes('delivered')}
        />
        <StatsCard icon={<BarChart2 size={16} />} label="Avg Order Value"
          value={`฿${stats.avg.toLocaleString()}`} subLabel="Across all orders"
          color="indigo" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(allStatuses)}
          active={false}
        />
        <StatsCard icon={<X size={16} />} label="Cancelled"
          value={stats.cancelled.toString()} subLabel="Voided orders"
          color="rose" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(['cancelled'])}
          active={selectedStatuses.length === 1 && selectedStatuses.includes('cancelled')}
        />
      </div>

      {/* Filter Toolbar - Simplified */}
      <div className={cn(
        "rounded-3xl border mb-6 overflow-hidden transition-colors",
        theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
      )}>
        {/* Row 1: Search + New/All Toggle */}
        <div className="p-4 flex items-center gap-4 border-b transition-colors" style={{
          borderColor: theme === 'dark' ? '#2d324d' : '#e2e5ef'
        }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={16} />
            <input
              type="text"
              placeholder="Search customer, tracking, or products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-accent/20",
                theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white focus:border-accent" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e] focus:border-accent"
              )}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] hover:text-red-500">
                <X size={14} />
              </button>
            )}
          </div>

          {/* New / All / Clear + ViewMode toggle */}
          <div className="flex items-center gap-2">
            {(() => {
              const isNewSelected = selectedStatuses.length === newOrderStatuses.length && newOrderStatuses.every(s => selectedStatuses.includes(s));
              const isAllSelected = selectedStatuses.length === allStatuses.length && allStatuses.every(s => selectedStatuses.includes(s));
              const btnBase = "px-3 py-2.5 rounded-lg text-xs font-bold transition-all border";
              const inactive = theme === 'dark' ? "border-[#2d324d] text-[#8b92ad] hover:border-accent/50" : "border-[#d1d5e8] text-[#8b92ad] hover:border-accent/50";
              return (
                <>
                  <button onClick={() => setSelectedStatuses(newOrderStatuses)} className={cn(btnBase, isNewSelected ? "bg-accent text-white border-accent" : inactive)}>New</button>
                  <button onClick={() => setSelectedStatuses(allStatuses)} className={cn(btnBase, isAllSelected ? "bg-accent text-white border-accent" : inactive)}>All</button>
                  <button onClick={() => setSelectedStatuses([])} className={cn(btnBase, selectedStatuses.length === 0 ? "bg-red-500/10 text-red-500 border-red-300" : inactive)}>Clear</button>
                </>
              );
            })()}
          </div>
        </div>

        {/* Row 2: Status Pills + Date Range */}
        <div className="p-4 flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
          {/* Status Pills */}
          {/* Fix 12: increased padding to meet 44px minimum touch target */}
          <div className="flex flex-wrap items-center gap-2">
            {allStatuses.map(status => {
              const isSelected = selectedStatuses.includes(status);
              const labels: Record<string, string> = {
                pending: 'Pending', paid: 'Paid', preparing: 'Preparing',
                shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
              };
              const pillColors: Record<string, { off: string; on: string }> = {
                pending:   { off: 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30',   on: 'bg-amber-500 text-white border-amber-500' },
                paid:      { off: 'text-sky-600 border-sky-200 dark:text-sky-400 dark:border-sky-500/30',           on: 'bg-sky-500 text-white border-sky-500' },
                preparing: { off: 'text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-500/30', on: 'bg-indigo-500 text-white border-indigo-500' },
                shipped:   { off: 'text-violet-600 border-violet-200 dark:text-violet-400 dark:border-violet-500/30', on: 'bg-violet-500 text-white border-violet-500' },
                delivered: { off: 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30', on: 'bg-emerald-500 text-white border-emerald-500' },
                cancelled: { off: 'text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-500/30',       on: 'bg-rose-500 text-white border-rose-500' },
              };
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "py-2.5 px-4 rounded-full text-[10px] font-bold border transition-all active:scale-95",
                    isSelected ? pillColors[status].on : pillColors[status].off
                  )}
                >
                  {labels[status]}
                </button>
              );
            })}
          </div>

          {/* Date Range Section */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b92ad] whitespace-nowrap">Date</span>
            <div className="relative cursor-pointer" onClick={() => { try { (startDateRef.current as any)?.showPicker(); } catch {} }}>
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
              <input ref={startDateRef} type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className={cn("pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all cursor-pointer", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]")}
              />
            </div>
            <span className="text-[#8b92ad] font-bold">→</span>
            <div className="relative cursor-pointer" onClick={() => { try { (endDateRef.current as any)?.showPicker(); } catch {} }}>
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
              <input ref={endDateRef} type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className={cn("pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all cursor-pointer", theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]")}
              />
            </div>
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-[#8b92ad] hover:text-red-500 transition-colors"><X size={14} /></button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      {/* Fix 15: overflow-x-auto on outer wrapper (already present). Table container */}
      <div className={cn(
        "rounded-3xl border overflow-hidden shadow-xl transition-colors",
        theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn(
                "text-[10px] font-black uppercase tracking-widest border-b transition-colors",
                theme === 'dark' ? "bg-[#1f2335] text-[#8b92ad] border-[#2d324d]" : "bg-[#f8f9fc] text-[#8b92ad] border-[#e2e5ef]"
              )}>
                <SortHeader field="createdAt" label="Order Details" />
                <SortHeader field="displayName" label="Customer" />
                <th className="px-6 py-5">Items</th>
                <SortHeader field="soldTHB" label="Total" align="left" />
                <SortHeader field="status" label="Status" align="left" />
                {/* Fix 15: sticky Actions column */}
                <th className={cn(
                  "px-6 py-5 text-right sticky right-0",
                  theme === 'dark' ? "bg-[#1f2335]" : "bg-[#f8f9fc]"
                )}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f6f9] dark:divide-[#1f2335]">
              {!isLoading && selectedStatuses.length > 0 && paginatedOrders?.map((o) => (
                <tr key={o._id} className={cn(
                  "group transition-all",
                  theme === 'dark' ? "hover:bg-[#1a1d2e]" : "hover:bg-[#f8f9fc]"
                )}>
                  <td className="px-6 py-5">
                    <div className={cn("text-[11px] font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
                      #{o._id.slice(-6).toUpperCase()}
                    </div>
                    <div className="text-[10px] text-[#8b92ad] flex items-center gap-1.5 mt-1">
                      <Clock size={10} />
                      {new Date(o.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={cn("font-bold text-sm", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{o.displayName}</div>
                    {/* Fix 10: add title tooltip for full address on truncated element */}
                    <div
                      title={o.address}
                      className="text-[10px] text-[#8b92ad] max-w-[180px] truncate mt-0.5"
                    >
                      {o.address || 'No address provided'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      {o.items && o.items.length > 0 ? o.items.map((item: any, idx: number) => (
                        <div key={idx} className={cn("text-[11px] flex items-center gap-1.5", theme === 'dark' ? "text-[#8b92ad]" : "text-[#4b5563]")}>
                          <span className="font-bold text-accent bg-accent/[7%] px-1.5 py-0.5 rounded text-[9px]">{item.qty}x</span>
                          <span className="truncate max-w-[150px]">{item.name}</span>
                        </div>
                      )) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-accent bg-accent/[7%] px-1.5 py-0.5 rounded text-[9px]">{o.quantity || 1}x</span>
                          <div className="text-[11px] text-[#8b92ad] italic">{o.product}</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={cn("text-sm font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
                      ฿{(o.soldTHB || 0).toLocaleString()}
                    </div>
                    {(o.profit ?? 0) > 0 && (
                      <div className="text-[10px] font-bold text-accent mt-0.5">+฿{(o.profit!).toLocaleString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <StatusPill status={o.status} />
                    {/* Fix 11: show courier + tracking for shipped/delivered */}
                    {(o.status === 'shipped' || o.status === 'delivered') && (o.courier || o.tracking) && (
                      <div className="mt-1.5 space-y-0.5">
                        {o.courier && (
                          <div className="text-[10px] text-[#8b92ad] font-medium">{o.courier}</div>
                        )}
                        {o.tracking && (
                          /^https?:\/\//.test(o.tracking) ? (
                            <a
                              href={o.tracking}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-accent font-medium flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={9} />
                              {o.tracking}
                            </a>
                          ) : (
                            <div className="text-[10px] text-[#8b92ad] font-medium">{o.tracking}</div>
                          )
                        )}
                      </div>
                    )}
                  </td>
                  {/* Fix 15: sticky Actions cell with matching background */}
                  <td className={cn(
                    "px-6 py-5 sticky right-0",
                    theme === 'dark' ? "bg-[#161925] group-hover:bg-[#1a1d2e]" : "bg-white group-hover:bg-[#f8f9fc]"
                  )}>
                    {/* Fix 8: remove opacity-0/hover-only — always show action buttons */}
                    <div className="flex justify-end gap-2">
                      {/* Advance status button */}
                      {nextStatusMap[o.status] && (
                        <button
                          onClick={() => advanceOrder(o._id, nextStatusMap[o.status]!)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95",
                            theme === 'dark' ? "border-accent/30 text-accent hover:bg-accent/10" : "border-accent/40 text-accent hover:bg-accent/5"
                          )}
                        >
                          → {nextStatusLabel[o.status]}
                        </button>
                      )}
                      {o.status !== 'cancelled' && o.status !== 'delivered' && o.status !== 'shipped' && (
                        <button
                          onClick={() => setCancelConfirm({ open: true, orderId: o._id })}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95",
                            theme === 'dark' ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10" : "border-rose-200 text-rose-600 hover:bg-rose-50"
                          )}
                        >
                          <X size={12} /> Cancel
                        </button>
                      )}
                      <button
                        onClick={() => onViewCustomer?.(o.userId)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 shadow-sm",
                          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white hover:border-accent" : "bg-white border-[#e2e5ef] text-[#1a1d2e] hover:border-accent"
                        )}
                      >
                        <ExternalLink size={12} /> View in Chat
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, orderId: o._id })}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95",
                          theme === 'dark' ? "border-red-500/20 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40" : "border-red-100 text-red-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        )}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(isLoading) && (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
            <RefreshCw className="animate-spin" size={32} />
            <span className="text-sm font-bold uppercase tracking-widest">Searching Records...</span>
          </div>
        )}

        {!isLoading && selectedStatuses.length === 0 && (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
            <div className="w-16 h-16 bg-[#f8f9fc] dark:bg-[#1a1d2e] rounded-3xl flex items-center justify-center">
              <Filter size={32} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#1a1d2e] dark:text-white">Please select a status to view orders</p>
              <p className="text-xs mt-1">Click on a status pill above to get started</p>
            </div>
          </div>
        )}

        {!isLoading && selectedStatuses.length > 0 && paginatedOrders?.length === 0 && (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
            <div className="w-16 h-16 bg-[#f8f9fc] dark:bg-[#1a1d2e] rounded-3xl flex items-center justify-center">
              <Search size={32} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#1a1d2e] dark:text-white">No results found</p>
              <p className="text-xs mt-1">Try adjusting your filters or search terms</p>
            </div>
            <button
              onClick={() => { setSearchTerm(''); selectAllStatuses(); setStartDate(''); setEndDate(''); }}
              className="text-accent text-xs font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Pagination Footer - Redesigned */}
        {!isLoading && selectedStatuses.length > 0 && filteredOrders.length > 0 && (
          <div className={cn(
            "px-6 py-5 border-t transition-colors",
            theme === 'dark' ? "bg-[#1f2335] border-[#2d324d]" : "bg-[#f8f9fc] border-[#e2e5ef]"
          )}>
            {/* Order Count */}
            <div className="text-[11px] font-bold text-[#8b92ad] mb-3 text-center">
              {pageSize === Infinity
                ? `Showing all ${filteredOrders.length} orders`
                : `Showing ${Math.min((currentPage - 1) * pageSize + 1, filteredOrders.length)}–${Math.min(currentPage * pageSize, filteredOrders.length)} of ${filteredOrders.length} orders`
              }
            </div>

            {/* Pagination & Per-Page Controls */}
            <div className="flex items-center justify-between">
              {/* Centered Pagination Controls */}
              <div className="flex-1 flex items-center justify-center gap-4">
                {totalPages > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm"
                      style={{
                        borderColor: currentPage === 1 ? '#8b92ad' : 'var(--accent)',
                        color: currentPage === 1 ? '#8b92ad' : 'var(--accent)',
                        background: 'transparent'
                      }}
                    >
                      ← Prev
                    </button>

                    <span className={cn(
                      "text-xs font-bold px-3 py-2",
                      theme === 'dark' ? "text-white" : "text-[#1a1d2e]"
                    )}>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm"
                      style={{
                        borderColor: currentPage === totalPages ? '#8b92ad' : 'var(--accent)',
                        color: currentPage === totalPages ? '#8b92ad' : 'var(--accent)',
                        background: 'transparent'
                      }}
                    >
                      Next →
                    </button>
                  </>
                )}
              </div>

              {/* Per-Page Selector - Right Aligned */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b92ad] whitespace-nowrap">Per page</span>
                <div className="flex items-center gap-2">
                  {[25, 50, 100, 'all'].map(size => (
                    <button
                      key={size}
                      onClick={() => changePageSize(size)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                        pageSize === (size === 'all' ? Infinity : Number(size))
                          ? "bg-accent/10 border-accent text-accent"
                          : theme === 'dark' ? "border-[#2d324d] text-[#8b92ad] hover:border-accent/50" : "border-[#d1d5e8] text-[#8b92ad] hover:border-accent/50"
                      )}
                    >
                      {size === 'all' ? 'All' : size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelConfirm.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setCancelConfirm({ open: false, orderId: null }); }}
        >
          <div className={cn(
            "w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl",
            theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white"
          )}>
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-red-500/10 text-red-500">
                <AlertTriangle size={36} />
              </div>
              <h3 className={cn("text-2xl font-black mb-4", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Cancel Order?</h3>
              <p className="text-sm leading-relaxed mb-10 text-[#8b92ad]">The order will be marked as cancelled and kept in your records.</p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => cancelConfirm.orderId && cancelOrder(cancelConfirm.orderId)}
                  className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20"
                >
                  Yes, Cancel Order
                </button>
                <button
                  onClick={() => setCancelConfirm({ open: false, orderId: null })}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95",
                    theme === 'dark' ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  )}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm({ open: false, orderId: null }); }}
        >
          <div className={cn(
            "w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl",
            theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white"
          )}>
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-red-500/10 text-red-500">
                <Trash2 size={36} />
              </div>
              <h3 className={cn("text-2xl font-black mb-4", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Delete Order?</h3>
              <p className="text-sm leading-relaxed mb-10 text-[#8b92ad]">This order will be permanently removed and cannot be recovered.</p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => deleteConfirm.orderId && deleteOrder(deleteConfirm.orderId)}
                  className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20"
                >
                  Yes, Delete Permanently
                </button>
                <button
                  onClick={() => setDeleteConfirm({ open: false, orderId: null })}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95",
                    theme === 'dark' ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  )}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ icon, label, value, subLabel, subLabelHighlight, color, theme, isLoading, onClick, active }: any) {
  const colorMap: any = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber:   "text-amber-500 bg-amber-500/10",
    blue:    "text-blue-500 bg-blue-500/10",
    indigo:  "text-indigo-500 bg-indigo-500/10",
    rose:    "text-rose-500 bg-rose-500/10",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2.5 rounded-2xl border transition-all shadow-sm flex flex-col gap-1 text-left w-full",
        active ? "ring-2 ring-accent border-accent/40" : "",
        onClick ? "cursor-pointer hover:shadow-md active:scale-[0.98]" : "",
        theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
      )}
    >
      <div className="text-[#8b92ad] text-[10px] font-bold uppercase tracking-wider truncate">{label}</div>
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", colorMap[color])}>
          {icon}
        </div>
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-t-transparent border-accent rounded-full animate-spin" />
        ) : (
          <div className={cn("text-lg font-black leading-none truncate", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{value}</div>
        )}
      </div>
      {!isLoading && subLabel && (
        <div className={cn("text-[9px] truncate", subLabelHighlight ? "text-amber-500 font-bold" : "text-[#8b92ad]")}>
          {subLabel}
        </div>
      )}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const configs: any = {
    pending:   { label: 'PENDING',   bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30' },
    paid:      { label: 'PAID',      bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30' },
    preparing: { label: 'PREPARING', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30' },
    shipped:   { label: 'SHIPPED',   bg: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30' },
    delivered: { label: 'DELIVERED', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' },
    cancelled: { label: 'CANCELLED', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30' },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={cn("px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider", config.bg)}>
      {config.label}
    </span>
  );
}

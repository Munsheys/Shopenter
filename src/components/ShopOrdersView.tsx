import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';
import { currencySymbol } from '@/lib/currency';
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
  Check,
  X,
  Ban,
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
  status: 'pending' | 'paid' | 'preparing' | 'partially_fulfilled' | 'shipped' | 'delivered' | 'fulfilled' | 'cancelled';
  createdAt: string;
  tracking?: string;
  courier?: string;
  shippingCost?: number;
  notes?: string;
}

export default function ShopOrdersView({
  theme,
  onViewCustomer,
  t,
  onLimitHit,
  localCurrency,
}: {
  theme?: 'light' | 'dark',
  localCurrency?: string,
  onViewCustomer?: (userId: string, orderId?: string) => void,
  t: any,
  onLimitHit?: (feature: string, limit?: number, current?: number) => void,
}) {
  const sym = currencySymbol(localCurrency);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Fix 14: separate error state
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Define status lists before state so we can use allStatuses as default
  const allStatuses = ['pending', 'paid', 'preparing', 'partially_fulfilled', 'shipped', 'delivered', 'fulfilled', 'cancelled'];
  const newOrderStatuses = ['pending', 'paid'];

  // Filters — default to ALL statuses including cancelled
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(allStatuses);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination & View
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Single-order confirmation modals
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });

  // Batch selection
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const lastSelectedIdxRef = useRef<number | null>(null);
  const [batchActing, setBatchActing] = useState(false);
  const [batchCancelConfirm, setBatchCancelConfirm] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [stalledThreshold, setStalledThreshold] = useState(3);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<'createdAt' | 'soldTHB' | 'status' | 'displayName' | null>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Date picker refs — lets the whole container trigger showPicker()
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Modal animation states
  const { mounted: bcMounted, visible: bcVisible } = useDelayedUnmount(batchCancelConfirm);
  const { mounted: bdMounted, visible: bdVisible } = useDelayedUnmount(batchDeleteConfirm);
  const { mounted: ccMounted, visible: ccVisible } = useDelayedUnmount(cancelConfirm.open);
  const { mounted: dcMounted, visible: dcVisible } = useDelayedUnmount(deleteConfirm.open);

  // Escape-key dismiss for all modals
  useEffect(() => {
    if (!cancelConfirm.open && !deleteConfirm.open && !batchCancelConfirm && !batchDeleteConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (cancelConfirm.open) setCancelConfirm({ open: false, orderId: null });
      if (deleteConfirm.open) setDeleteConfirm({ open: false, orderId: null });
      if (batchCancelConfirm) setBatchCancelConfirm(false);
      if (batchDeleteConfirm) setBatchDeleteConfirm(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cancelConfirm.open, deleteConfirm.open, batchCancelConfirm, batchDeleteConfirm]);

  // Clear selection when filters change
  useEffect(() => { setSelectedOrderIds(new Set()); }, [selectedStatuses, searchTerm, startDate, endDate]);

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
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = sortedOrders.map(o => [
      escape(new Date(o.createdAt).toLocaleString('th-TH')),
      escape(o.displayName),
      escape(o.items?.map((i: any) => `${i.qty}x ${i.name}`).join(' + ') || `${o.quantity || 1}x ${o.product}`),
      escape(o.soldTHB),
      escape(o.profit || 0),
      escape(o.status),
      escape(o.tracking || '-'),
      escape(o.address || ''),
    ]);

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.join(',')),
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
        const order = ['pending', 'paid', 'preparing', 'partially_fulfilled', 'shipped', 'delivered', 'fulfilled', 'cancelled'];
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
  const totalPaidPreparing = allOrders.filter(o => ['paid', 'preparing', 'partially_fulfilled'].includes(o.status)).length;
  const stalledOrders = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - stalledThreshold);
    return allOrders.filter(o => ['paid', 'preparing', 'partially_fulfilled'].includes(o.status) && new Date(o.createdAt) < cutoff);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, stalledThreshold]);
  const confirmedOrders = allOrders.filter(o => ['paid', 'preparing', 'partially_fulfilled', 'shipped', 'delivered', 'fulfilled'].includes(o.status));
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
    preparing: allOrders.filter(o => ['preparing', 'partially_fulfilled', 'shipped'].includes(o.status)).length,
    delivered: allOrders.filter(o => ['delivered', 'fulfilled'].includes(o.status)).length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
  };

  // cancelOrder with rollback on failure
  async function cancelOrder(id: string) {
    const previousOrders = orders;
    setOrders(prev => prev?.map(o => o._id === id ? { ...o, status: 'cancelled' as const } : o) ?? prev);
    setCancelConfirm({ open: false, orderId: null });
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
      if (!res.ok) throw new Error(res.statusText);
    } catch {
      setOrders(previousOrders);
      setFetchError('Failed to cancel order. Please try again.');
    }
  }

  async function deleteOrder(id: string) {
    setOrders(prev => prev?.filter(o => o._id !== id) ?? prev);
    setDeleteConfirm({ open: false, orderId: null });
    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    } catch { /* optimistic removal stays */ }
  }

  // ── Batch operations ──────────────────────────────────────────────────────────
  function toggleRow(id: string) {
    setSelectedOrderIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function handleRowSelect(id: string, idx: number, shiftKey: boolean) {
    if (shiftKey && lastSelectedIdxRef.current !== null && paginatedOrders) {
      const from = Math.min(lastSelectedIdxRef.current, idx);
      const to = Math.max(lastSelectedIdxRef.current, idx);
      const rangeIds = paginatedOrders.slice(from, to + 1).map(o => o._id);
      setSelectedOrderIds(prev => { const s = new Set(prev); rangeIds.forEach(rid => s.add(rid)); return s; });
    } else {
      toggleRow(id);
      lastSelectedIdxRef.current = idx;
    }
  }

  async function batchDeliver() {
    const ids = [...selectedOrderIds].filter(id => orders?.find(o => o._id === id)?.status === 'shipped');
    if (!ids.length) return;
    setBatchActing(true);
    const prev = orders;
    setOrders(p => p?.map(o => ids.includes(o._id) ? { ...o, status: 'delivered' as const } : o) ?? p);
    try {
      await Promise.all(ids.map(id => fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'delivered' }) })));
      setSelectedOrderIds(new Set());
    } catch { setOrders(prev); }
    finally { setBatchActing(false); }
  }

  async function batchCancelOrders() {
    const ids = [...selectedOrderIds].filter(id => {
      const o = orders?.find(x => x._id === id);
      return o && !['cancelled', 'delivered'].includes(o.status);
    });
    if (!ids.length) return;
    setBatchActing(true);
    const prev = orders;
    setOrders(p => p?.map(o => ids.includes(o._id) ? { ...o, status: 'cancelled' as const } : o) ?? p);
    setBatchCancelConfirm(false);
    try {
      await Promise.all(ids.map(id => fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) })));
      setSelectedOrderIds(new Set());
    } catch { setOrders(prev); }
    finally { setBatchActing(false); }
  }

  async function batchDeleteOrders() {
    const ids = [...selectedOrderIds];
    setBatchActing(true);
    setOrders(p => p?.filter(o => !ids.includes(o._id)) ?? p);
    setBatchDeleteConfirm(false);
    setSelectedOrderIds(new Set());
    try {
      await Promise.all(ids.map(id => fetch(`/api/orders/${id}`, { method: 'DELETE' })));
    } catch { fetchOrders(); }
    finally { setBatchActing(false); }
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

  // Derived batch selection state
  const allFilteredSelected = sortedOrders.length > 0 && sortedOrders.every(o => selectedOrderIds.has(o._id));
  const someFilteredSelected = !allFilteredSelected && sortedOrders.some(o => selectedOrderIds.has(o._id));
  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelectedOrderIds(new Set());
    else setSelectedOrderIds(new Set(sortedOrders.map(o => o._id)));
  };
  const selectedOrders = orders?.filter(o => selectedOrderIds.has(o._id)) ?? [];
  const batchShippedCount = selectedOrders.filter(o => o.status === 'shipped').length;
  const batchCancellableCount = selectedOrders.filter(o => ['pending', 'paid', 'preparing'].includes(o.status)).length;

  const SortHeader = ({ field, label, align = 'left' }: { field: typeof sortField, label: string, align?: 'left' | 'right' }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(field); } }}
        tabIndex={0}
        role="columnheader"
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={cn(
          "px-6 py-5 cursor-pointer select-none hover:opacity-75 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent/40",
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
          value={`${sym}${stats.revenue.toLocaleString()}`}
          subLabel={stats.potentialRevenue > 0 ? `+${sym}${stats.potentialRevenue.toLocaleString()} potential` : `${stats.count} confirmed orders`}
          subLabelHighlight={stats.potentialRevenue > 0}
          color="emerald" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(allStatuses)}
          active={selectedStatuses.length === allStatuses.length}
        />
        <StatsCard icon={<DollarSign size={16} />} label="Total Profit"
          value={`${sym}${stats.profit.toLocaleString()}`} subLabel={`${sym}${stats.avg.toLocaleString()} avg / order`}
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
          value={stats.preparing.toString()} subLabel="Preparing + part. fulfilled + shipped"
          color="blue" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(['preparing', 'partially_fulfilled', 'shipped'])}
          active={selectedStatuses.length === 3 && selectedStatuses.includes('preparing') && selectedStatuses.includes('partially_fulfilled') && selectedStatuses.includes('shipped')}
        />
        <StatsCard icon={<CheckCircle2 size={16} />} label="Delivered"
          value={stats.delivered.toString()} subLabel="Successfully fulfilled"
          color="emerald" theme={theme} isLoading={isLoading || orders === null}
          onClick={() => setSelectedStatuses(['delivered', 'fulfilled'])}
          active={selectedStatuses.length === 2 && selectedStatuses.includes('delivered') && selectedStatuses.includes('fulfilled')}
        />
        <StatsCard icon={<BarChart2 size={16} />} label="Avg Order Value"
          value={`${sym}${stats.avg.toLocaleString()}`} subLabel="Across all orders"
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

      {/* ── Stalled orders warning ── */}
      {!isLoading && orders !== null && totalPaidPreparing > 0 && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 flex-wrap">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <span className={cn('text-xs font-bold', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}>
              {stalledOrders.length > 0
                ? <>{stalledOrders.length} order{stalledOrders.length !== 1 ? 's' : ''} in <span className="font-black">paid / preparing</span> over</>
                : <>0 orders stalled over</>
              }
            </span>
            <select
              value={stalledThreshold}
              onChange={e => setStalledThreshold(Number(e.target.value))}
              className={cn('text-xs font-black bg-transparent border-b border-amber-400 outline-none cursor-pointer', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}
            >
              {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} day{d !== 1 ? 's' : ''}</option>)}
            </select>
            <span className={cn('text-xs font-bold', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}>
              {stalledOrders.length > 0 ? '— check fulfillment' : '— all fulfillments up to date'}
            </span>
          </div>
          <span className={cn('text-xs font-bold flex-shrink-0', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}>
            {totalPaidPreparing} total in queue
          </span>
        </div>
      )}

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
                  <button onClick={() => setSelectedStatuses(allStatuses)} className={cn(btnBase, selectedStatuses.length === allStatuses.length ? "bg-accent/10 text-accent border-accent/30" : inactive)}>All</button>
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
                partially_fulfilled: 'Part. Fulfilled',
                shipped: 'Shipped', delivered: 'Delivered', fulfilled: 'Fulfilled', cancelled: 'Cancelled',
              };
              const pillColors: Record<string, { off: string; on: string }> = {
                pending:             { off: 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30',   on: 'bg-amber-500 text-white border-amber-500' },
                paid:                { off: 'text-sky-600 border-sky-200 dark:text-sky-400 dark:border-sky-500/30',           on: 'bg-sky-500 text-white border-sky-500' },
                preparing:           { off: 'text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-500/30', on: 'bg-indigo-500 text-white border-indigo-500' },
                partially_fulfilled: { off: 'text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/30', on: 'bg-orange-500 text-white border-orange-500' },
                shipped:             { off: 'text-violet-600 border-violet-200 dark:text-violet-400 dark:border-violet-500/30', on: 'bg-violet-500 text-white border-violet-500' },
                delivered:           { off: 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30', on: 'bg-emerald-500 text-white border-emerald-500' },
                fulfilled:           { off: 'text-green-600 border-green-200 dark:text-green-400 dark:border-green-500/30', on: 'bg-green-600 text-white border-green-600' },
                cancelled:           { off: 'text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-500/30',       on: 'bg-rose-500 text-white border-rose-500' },
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
                {/* Select-all checkbox */}
                <th className={cn("px-4 py-5 w-12 sticky left-0 z-10", theme === 'dark' ? "bg-[#1f2335]" : "bg-[#f8f9fc]")}>
                  <div
                    role="checkbox"
                    aria-checked={allFilteredSelected ? true : someFilteredSelected ? 'mixed' : false}
                    aria-label="Select all orders"
                    tabIndex={0}
                    onClick={toggleSelectAll}
                    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleSelectAll(); } }}
                    className="w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all mx-auto"
                    style={{
                      background: allFilteredSelected ? 'var(--accent)' : someFilteredSelected ? 'var(--accent)' : undefined,
                      borderColor: (allFilteredSelected || someFilteredSelected) ? 'var(--accent)' : undefined,
                    }}
                  >
                    {allFilteredSelected && <Check size={9} className="text-white" strokeWidth={3} />}
                    {someFilteredSelected && <div className="w-2 h-0.5 bg-white rounded-full" />}
                  </div>
                </th>
                <SortHeader field="createdAt" label="Order Details" />
                <SortHeader field="displayName" label="Customer" />
                <th className="px-6 py-5">Items</th>
                <SortHeader field="soldTHB" label="Total" align="left" />
                <SortHeader field="status" label="Status" align="left" />
                <th className={cn(
                  "px-6 py-5 text-right sticky right-0",
                  theme === 'dark' ? "bg-[#1f2335]" : "bg-[#f8f9fc]"
                )}>Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", theme === 'dark' ? "divide-[#1f2335]" : "divide-[#f4f6f9]")}>
              {!isLoading && selectedStatuses.length > 0 && paginatedOrders?.map((o, idx) => {
                const isSelected = selectedOrderIds.has(o._id);
                const isExpanded = expandedOrderId === o._id;
                return (
                <React.Fragment key={o._id}>
                <tr className={cn(
                  "group transition-all cursor-pointer",
                  isSelected
                    ? theme === 'dark' ? "bg-accent/5" : "bg-accent/[3%]"
                    : theme === 'dark' ? "hover:bg-[#1a1d2e]" : "hover:bg-[#f8f9fc]"
                )}
                  onMouseDown={e => { if (e.shiftKey) e.preventDefault(); }}
                  onClick={() => setExpandedOrderId(isExpanded ? null : o._id)}
                >
                  {/* Row checkbox */}
                  <td className={cn("px-4 py-5 sticky left-0 z-[1] transition-colors",
                    isSelected
                      ? theme === 'dark' ? "bg-accent/5" : "bg-accent/[3%]"
                      : theme === 'dark' ? "bg-[#161925] group-hover:bg-[#1a1d2e]" : "bg-white group-hover:bg-[#f8f9fc]"
                  )} onClick={e => e.stopPropagation()}>
                    <div
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Select order ${o._id.slice(-6)}`}
                      tabIndex={0}
                      onClick={e => { e.stopPropagation(); e.preventDefault(); handleRowSelect(o._id, idx, e.shiftKey); }}
                      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleRowSelect(o._id, idx, false); } }}
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all mx-auto",
                        isSelected
                          ? "border-accent bg-accent"
                          : theme === 'dark' ? "border-white/20 hover:border-accent/60" : "border-gray-300 hover:border-accent/60"
                      )}
                    >
                      {isSelected && <Check size={9} className="text-white" strokeWidth={3} />}
                    </div>
                  </td>
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
                      {sym}{(o.soldTHB || 0).toLocaleString()}
                    </div>
                    {(o.profit ?? 0) > 0 && (
                      <div className="text-[10px] font-bold text-accent mt-0.5">+{sym}{(o.profit!).toLocaleString()}</div>
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
                  {/* Sticky Actions cell */}
                  <td className={cn(
                    "px-6 py-5 sticky right-0 transition-colors",
                    isSelected
                      ? theme === 'dark' ? "bg-accent/5" : "bg-accent/[3%]"
                      : theme === 'dark' ? "bg-[#161925] group-hover:bg-[#1a1d2e]" : "bg-white group-hover:bg-[#f8f9fc]"
                  )} onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {/* Cancel — only for pre-shipped statuses; shipped/fulfilled orders use batch operations */}
                      {['pending', 'paid', 'preparing'].includes(o.status) && (
                        <button
                          onClick={() => setCancelConfirm({ open: true, orderId: o._id })}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95",
                            theme === 'dark' ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10" : "border-rose-200 text-rose-600 hover:bg-rose-50"
                          )}
                        >
                          <Ban size={12} /> Cancel
                        </button>
                      )}
                      <button
                        onClick={() => onViewCustomer?.(o.userId, o._id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 shadow-sm",
                          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white hover:border-accent" : "bg-white border-[#e2e5ef] text-[#1a1d2e] hover:border-accent"
                        )}
                      >
                        <ExternalLink size={12} /> View in Chat
                      </button>
                      {/* Delete — wipes the record entirely */}
                      <button
                        onClick={() => setDeleteConfirm({ open: true, orderId: o._id })}
                        title="Remove record entirely"
                        className={cn(
                          "p-2 rounded-xl border transition-all active:scale-95",
                          theme === 'dark' ? "border-red-500/20 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40" : "border-red-100 text-red-300 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                        )}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className={cn(theme === 'dark' ? "bg-[#11131e]" : "bg-[#f4f6fc]")}>
                    <td colSpan={7} className="px-8 pb-5 pt-0">
                      <div className={cn("rounded-2xl border p-5", theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]")}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[#8b92ad]">Order breakdown</p>
                        <div className="space-y-2">
                          {(o.items && o.items.length > 0 ? o.items : [{ name: o.product, qty: o.quantity || 1, price: o.soldTHB }]).map((item: any, idx: number) => {
                            const lineTotal  = (item.price || 0) * (item.qty || 1);
                            const lineCost   = (item.cost  || 0) * (item.qty || 1);
                            const lineProfit = lineTotal - lineCost;
                            return (
                              <div key={idx} className={cn("flex items-center gap-3 py-2 px-3 rounded-xl", theme === 'dark' ? "bg-[#1a1d2e]" : "bg-[#f8f9fc]")}>
                                <span className="font-bold text-accent bg-accent/[8%] px-2 py-0.5 rounded text-[10px] flex-shrink-0">{item.qty}×</span>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-xs font-semibold truncate", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{item.name}</p>
                                  {item.variantLabel && <p className="text-[10px] text-[#8b92ad]">{item.variantLabel}</p>}
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  {item.price != null && <span className={cn("text-xs font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{sym}{lineTotal.toLocaleString()}</span>}
                                  {lineCost > 0 && <span className="text-[10px] text-[#8b92ad]">cost {sym}{lineCost.toLocaleString()}</span>}
                                  {lineCost > 0 && item.price != null && (
                                    <span className={cn("text-[10px] font-bold", lineProfit >= 0 ? "text-accent" : "text-rose-500")}>
                                      {lineProfit >= 0 ? '+' : ''}{sym}{lineProfit.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className={cn("flex flex-wrap gap-6 mt-4 pt-4 border-t text-xs", theme === 'dark' ? "border-[#1f2335]" : "border-[#e2e5ef]")}>
                          <div>
                            <span className="text-[#8b92ad] font-medium">Total </span>
                            <span className={cn("font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{sym}{(o.soldTHB || 0).toLocaleString()}</span>
                          </div>
                          {(o.profit ?? 0) > 0 && (
                            <div>
                              <span className="text-[#8b92ad] font-medium">Profit </span>
                              <span className="font-black text-accent">+{sym}{(o.profit!).toLocaleString()}</span>
                            </div>
                          )}
                          {o.shippingCost != null && o.shippingCost > 0 && (
                            <div>
                              <span className="text-[#8b92ad] font-medium">Shipping </span>
                              <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{sym}{o.shippingCost.toLocaleString()}</span>
                            </div>
                          )}
                          {o.courier && (
                            <div>
                              <span className="text-[#8b92ad] font-medium">Courier </span>
                              <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{o.courier}</span>
                            </div>
                          )}
                          {o.tracking && (
                            <div>
                              <span className="text-[#8b92ad] font-medium">Tracking </span>
                              <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{o.tracking}</span>
                            </div>
                          )}
                          {o.notes && (
                            <div>
                              <span className="text-[#8b92ad] font-medium">Notes </span>
                              <span className={cn("font-medium italic", theme === 'dark' ? "text-white/80" : "text-[#4b5563]")}>{o.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
                );
              })}
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
            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center", theme === 'dark' ? "bg-[#1a1d2e]" : "bg-[#f8f9fc]")}>
              <Filter size={32} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Please select a status to view orders</p>
              <p className="text-xs mt-1">Click on a status pill above to get started</p>
            </div>
          </div>
        )}

        {!isLoading && selectedStatuses.length > 0 && paginatedOrders?.length === 0 && (allOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", theme === 'dark' ? "bg-[#1a1d2e]" : "bg-slate-100")}>
              <ShoppingCart size={28} className="text-[#8b92ad]" />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>No orders yet</p>
              <p className="text-xs mt-1 text-[#8b92ad]">Orders placed through your storefront will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center", theme === 'dark' ? "bg-[#1a1d2e]" : "bg-[#f8f9fc]")}>
              <Search size={32} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className={cn("text-sm font-bold", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>No orders match your filter</p>
              <p className="text-xs mt-1">Try adjusting your filters or search terms</p>
            </div>
            <button
              onClick={() => { setSearchTerm(''); selectAllStatuses(); setStartDate(''); setEndDate(''); }}
              className="text-accent text-xs font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ))}

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

      {/* ── Floating Batch Toolbar ── */}
      {selectedOrderIds.size > 0 && (
        <div className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-sm w-fit max-w-[92vw] flex-wrap justify-center",
          theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
        )}>
          <span className="text-xs font-black text-accent whitespace-nowrap">{selectedOrderIds.size} selected</span>
          <div className={cn("w-px h-4 flex-shrink-0", theme === 'dark' ? "bg-[#2d324d]" : "bg-[#e2e5ef]")} />
          <button
            onClick={toggleSelectAll}
            className="text-[11px] font-bold text-[#8b92ad] hover:text-accent transition-colors whitespace-nowrap"
          >
            {allFilteredSelected ? 'Deselect All' : `Select All ${sortedOrders.length}`}
          </button>
          <div className={cn("w-px h-4 flex-shrink-0", theme === 'dark' ? "bg-[#2d324d]" : "bg-[#e2e5ef]")} />
          {batchShippedCount > 0 && (
            <button
              onClick={batchDeliver}
              disabled={batchActing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCircle2 size={12} /> {batchActing ? 'Processing…' : `Delivered (${batchShippedCount})`}
            </button>
          )}
          {batchCancellableCount > 0 && (
            <button
              onClick={() => setBatchCancelConfirm(true)}
              disabled={batchActing}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap",
                theme === 'dark' ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10" : "border-rose-200 text-rose-600 hover:bg-rose-50"
              )}
            >
              <Ban size={12} /> Cancel ({batchCancellableCount})
            </button>
          )}
          <button
            onClick={() => setBatchDeleteConfirm(true)}
            disabled={batchActing}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap",
              theme === 'dark' ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-50"
            )}
          >
            <Trash2 size={12} /> Delete ({selectedOrderIds.size})
          </button>
          <button
            onClick={() => setSelectedOrderIds(new Set())}
            disabled={batchActing}
            className="p-1.5 rounded-lg text-[#8b92ad] hover:text-red-500 transition-colors disabled:opacity-40 flex-shrink-0"
            aria-label="Clear selection"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Batch Cancel Confirmation Modal */}
      {bcMounted && (
        <div
          className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={bcVisible ? 'open' : 'closed'}
          onClick={e => { if (e.target === e.currentTarget) setBatchCancelConfirm(false); }}
        >
          <div className={cn("modal-panel w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}
            data-state={bcVisible ? 'open' : 'closed'}>
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-rose-500/10 text-rose-500">
                <Ban size={36} />
              </div>
              <h3 className={cn("text-2xl font-black mb-4", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Cancel {batchCancellableCount} Orders?</h3>
              <p className="text-sm leading-relaxed mb-10 text-[#8b92ad]">
                All selected orders except those already delivered or cancelled will be marked as cancelled and kept in your records.
              </p>
              <div className="flex flex-col gap-4">
                <button onClick={batchCancelOrders} className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20">
                  Yes, Cancel {batchCancellableCount} Orders
                </button>
                <button onClick={() => setBatchCancelConfirm(false)} className={cn("w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95", theme === 'dark' ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600")}>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {bdMounted && (
        <div
          className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={bdVisible ? 'open' : 'closed'}
          onClick={e => { if (e.target === e.currentTarget) setBatchDeleteConfirm(false); }}
        >
          <div className={cn("modal-panel w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl", theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white")}
            data-state={bdVisible ? 'open' : 'closed'}>
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-red-500/10 text-red-500">
                <Trash2 size={36} />
              </div>
              <h3 className={cn("text-2xl font-black mb-4", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>Delete {selectedOrderIds.size} Orders?</h3>
              <p className="text-sm leading-relaxed mb-10 text-[#8b92ad]">All selected orders will be permanently removed. This cannot be undone.</p>
              <div className="flex flex-col gap-4">
                <button onClick={batchDeleteOrders} className="w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20">
                  Yes, Delete {selectedOrderIds.size} Orders
                </button>
                <button onClick={() => setBatchDeleteConfirm(false)} className={cn("w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95", theme === 'dark' ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600")}>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {ccMounted && (
        <div
          className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={ccVisible ? 'open' : 'closed'}
          onClick={(e) => { if (e.target === e.currentTarget) setCancelConfirm({ open: false, orderId: null }); }}
        >
          <div className={cn(
            "modal-panel w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl",
            theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white"
          )} data-state={ccVisible ? 'open' : 'closed'}>
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
      {dcMounted && (
        <div
          className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={dcVisible ? 'open' : 'closed'}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm({ open: false, orderId: null }); }}
        >
          <div className={cn(
            "modal-panel w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl",
            theme === 'dark' ? "bg-[#161925] border border-[#1f2335]" : "bg-white"
          )} data-state={dcVisible ? 'open' : 'closed'}>
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
    pending:             { label: 'PENDING',        bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30' },
    paid:                { label: 'PAID',            bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30' },
    preparing:           { label: 'PREPARING',       bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30' },
    partially_fulfilled: { label: 'PART. FULFILLED', bg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30' },
    shipped:             { label: 'SHIPPED',         bg: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30' },
    delivered:           { label: 'DELIVERED',       bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' },
    fulfilled:           { label: 'FULFILLED',       bg: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30' },
    cancelled:           { label: 'CANCELLED',       bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30' },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={cn("px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wide", config.bg)}>
      {config.label}
    </span>
  );
}

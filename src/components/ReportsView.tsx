"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  TrendingUp, DollarSign, ShoppingCart,
  ArrowUpRight, ArrowDownRight, Download, Tag,
  Truck, Users, BarChart2, Minus, Calendar, X,
  ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
);

interface ReportsViewProps {
  theme?: 'light' | 'dark';
  t: any;
  accentColor?: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, subHighlight, trend, color, theme, isLoading }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; subHighlight?: boolean;
  trend?: number | null; color: string; theme?: string; isLoading?: boolean;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    blue:    'text-blue-500 bg-blue-500/10',
    indigo:  'text-indigo-500 bg-indigo-500/10',
    amber:   'text-amber-500 bg-amber-500/10',
    rose:    'text-rose-500 bg-rose-500/10',
    violet:  'text-violet-500 bg-violet-500/10',
  };
  const isDark = theme === 'dark';
  if (isLoading) {
    return (
      <div className={cn('p-5 rounded-3xl border', isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]')}>
        <div className="space-y-3 animate-pulse">
          <div className={cn('w-10 h-10 rounded-2xl', isDark ? 'bg-[#1f2335]' : 'bg-slate-100')} />
          <div className="space-y-2">
            <div className={cn('h-2 w-20 rounded-full', isDark ? 'bg-[#1f2335]' : 'bg-slate-100')} />
            <div className={cn('h-5 w-28 rounded-full', isDark ? 'bg-[#1f2335]' : 'bg-slate-100')} />
            <div className={cn('h-2 w-16 rounded-full', isDark ? 'bg-[#1f2335]' : 'bg-slate-100')} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={cn(
      'p-5 rounded-3xl border flex flex-col gap-3 transition-all hover:shadow-lg hover:-translate-y-0.5',
      isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]',
    )}>
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0', colorMap[color])}>
          {icon}
        </div>
        {trend != null && (
          <div className={cn(
            'flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black',
            trend > 0 ? 'text-emerald-500 bg-emerald-500/10' : trend < 0 ? 'text-rose-500 bg-rose-500/10' : 'text-slate-400 bg-slate-500/10',
          )}>
            {trend > 0 ? <ArrowUpRight size={11} /> : trend < 0 ? <ArrowDownRight size={11} /> : <Minus size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-[#8b92ad] mb-0.5">{label}</div>
          <>
            <div className={cn('text-xl font-black', isDark ? 'text-white' : 'text-[#1a1d2e]')}>{value}</div>
            {sub && <div className={cn("text-[10px] mt-0.5", subHighlight ? "text-amber-500 font-bold" : "text-[#8b92ad]")}>{sub}</div>}
          </>
      </div>
    </div>
  );
}

function SectionCard({ title, sub, children, theme, className }: {
  title: string; sub?: string; children: React.ReactNode; theme?: string; className?: string;
}) {
  const isDark = theme === 'dark';
  return (
    <div className={cn(
      'p-6 rounded-[32px] border transition-all',
      isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]',
      className,
    )}>
      <div className="mb-5">
        <h3 className={cn('text-sm font-black', isDark ? 'text-white' : 'text-[#1a1d2e]')}>{title}</h3>
        {sub && <p className="text-[10px] font-bold uppercase tracking-widest text-[#8b92ad] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

function fmt(n: number, currency: string) {
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const STATUS_ORDER = ['pending', 'paid', 'preparing', 'shipped', 'delivered'] as const;
const STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', preparing: 'Preparing',
  shipped: 'Shipped', delivered: 'Delivered',
};
const STATUS_COLOR_MAP: Record<string, string> = {
  pending:   'bg-amber-500',
  paid:      'bg-emerald-500',
  preparing: 'bg-blue-500',
  shipped:   'bg-slate-400',
  delivered: 'bg-green-500',
};
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Main component ────────────────────────────────────────────────────────────

type DateRangePreset = 'today' | '7d' | 'week' | '30d' | 'month' | 'all' | 'custom';

export default function ReportsView({ theme, t, accentColor = '#00b900' }: ReportsViewProps) {
  const isDark = theme === 'dark';
  const [orders,   setOrders]   = useState<any[]>([]);
  const [coupons,  setCoupons]  = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currency, setCurrency] = useState('THB');

  // Period state
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const startRef = useRef<HTMLInputElement>(null);
  const endRef   = useRef<HTMLInputElement>(null);

  // UI pagination state
  const [productsPage, setProductsPage] = useState(0);
  const [customersPage, setCustomersPage] = useState(0);
  const [dowMode, setDowMode] = useState<'orders' | 'revenue'>('orders');
  const [topProductsSort, setTopProductsSort] = useState<'revenue' | 'units'>('revenue');
  const [stalledThreshold, setStalledThreshold] = useState(3); // days
  const [exportLoading, setExportLoading] = useState(false);
  const todayISO = new Date().toISOString().split('T')[0];

  const PAGE_SIZE = 10;

  useEffect(() => {
    (async () => {
      try {
        const [oRes, cRes, sRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/coupons'),
          fetch('/api/settings'),
        ]);
        if (oRes.ok) {
          const raw = await oRes.json();
          setOrders(raw.filter((o: any) => o._id && o.createdAt));
        }
        if (cRes.ok) setCoupons(await cRes.json());
        if (sRes.ok) {
          const s = await sRes.json();
          if (s.localCurrency) setCurrency(s.localCurrency);
        }
      } catch (e) {
        console.error('Reports fetch error', e);
        setFetchError('Failed to load reports. Check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Window calculation ──────────────────────────────────────────────────────

  const { windowDays, cutoff, prevFrom, prevTo } = useMemo(() => {
    const now = new Date();
    if (dateRange === 'today') {
      const c = new Date(now); c.setHours(0, 0, 0, 0);
      const yStart = new Date(c); yStart.setDate(yStart.getDate() - 1);
      return { windowDays: 1, cutoff: c, prevFrom: yStart, prevTo: new Date(c) };
    }
    if (dateRange === '7d') {
      const c = new Date(now); c.setDate(c.getDate() - 7);
      const p = new Date(c);  p.setDate(p.getDate() - 7);
      return { windowDays: 7, cutoff: c, prevFrom: p, prevTo: new Date(c) };
    }
    if (dateRange === 'week') {
      const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const c = new Date(now); c.setDate(now.getDate() + mondayOffset); c.setHours(0, 0, 0, 0);
      const pStart = new Date(c); pStart.setDate(pStart.getDate() - 7);
      const days = Math.max(1, Math.round((now.getTime() - c.getTime()) / 86400000));
      return { windowDays: days, cutoff: c, prevFrom: pStart, prevTo: new Date(c) };
    }
    if (dateRange === '30d') {
      const c = new Date(now); c.setDate(c.getDate() - 30);
      const p = new Date(c);  p.setDate(p.getDate() - 30);
      return { windowDays: 30, cutoff: c, prevFrom: p, prevTo: new Date(c) };
    }
    if (dateRange === 'month') {
      const c = new Date(now.getFullYear(), now.getMonth(), 1);
      const pEnd = new Date(c);
      const pStart = new Date(c.getFullYear(), c.getMonth() - 1, 1);
      const days = Math.round((now.getTime() - c.getTime()) / 86400000) || 1;
      return { windowDays: days, cutoff: c, prevFrom: pStart, prevTo: pEnd };
    }
    if (dateRange === 'custom' && customStart) {
      const c  = new Date(customStart);
      const to = customEnd ? new Date(customEnd) : now;
      to.setHours(23, 59, 59, 999);
      const days = Math.max(1, Math.round((to.getTime() - c.getTime()) / 86400000));
      const p = new Date(c); p.setDate(p.getDate() - days);
      return { windowDays: days, cutoff: c, prevFrom: p, prevTo: new Date(c) };
    }
    // 'all' or custom with no start date
    const oldest = orders.length
      ? new Date(orders.reduce((min, o) => Math.min(min, new Date(o.createdAt).getTime()), Infinity))
      : new Date();
    const days = Math.max(1, Math.round((Date.now() - oldest.getTime()) / 86400000));
    return { windowDays: days, cutoff: new Date(0), prevFrom: new Date(0), prevTo: new Date(0) };
  }, [dateRange, customStart, customEnd, orders]);

  const filteredOrders = useMemo(() => {
    if (dateRange === 'custom' && customEnd) {
      const to = new Date(customEnd); to.setHours(23, 59, 59, 999);
      return orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= cutoff && d <= to;
      });
    }
    return orders.filter(o => new Date(o.createdAt) >= cutoff);
  }, [orders, cutoff, dateRange, customEnd]);

  const prevOrders = useMemo(() => {
    if (dateRange === 'all') return [];
    if (dateRange === 'custom' && !customStart) return [];
    return orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= prevFrom && d < prevTo;
    });
  }, [orders, dateRange, customStart, prevFrom, prevTo]);

  // billableOrders = all non-cancelled (volume metrics)
  // confirmedOrders = paid money secured — excludes pending (financial metrics)
  const billableOrders = useMemo(
    () => filteredOrders.filter(o => o.status !== 'cancelled'),
    [filteredOrders],
  );

  const confirmedOrders = useMemo(
    () => filteredOrders.filter(o => ['paid', 'preparing', 'partially_fulfilled', 'shipped', 'delivered', 'fulfilled'].includes(o.status)),
    [filteredOrders],
  );

  const pendingRevenue = useMemo(
    () => filteredOrders
      .filter(o => o.status === 'pending')
      .reduce((s, o) => s + (o.soldTHB || 0), 0),
    [filteredOrders],
  );

  const pendingCount = useMemo(
    () => filteredOrders.filter(o => o.status === 'pending').length,
    [filteredOrders],
  );

  const billablePrevOrders = useMemo(
    () => prevOrders.filter(o => o.status !== 'cancelled'),
    [prevOrders],
  );

  const confirmedPrevOrders = useMemo(
    () => prevOrders.filter(o => ['paid', 'preparing', 'partially_fulfilled', 'shipped', 'delivered', 'fulfilled'].includes(o.status)),
    [prevOrders],
  );

  // Orders in paid/preparing that are older than stalledThreshold days — global warning regardless of filter
  const stalledOrders = useMemo(() => {
    const staleCutoff = new Date(); staleCutoff.setDate(staleCutoff.getDate() - stalledThreshold);
    return orders.filter(o =>
      ['paid', 'preparing'].includes(o.status) && new Date(o.createdAt) < staleCutoff,
    );
  }, [orders, stalledThreshold]);

  const totalPaidPreparing = useMemo(
    () => orders.filter(o => ['paid', 'preparing'].includes(o.status)).length,
    [orders],
  );

  // ── KPI stats ───────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const calc = (financialArr: any[], volumeCount: number) => {
      const revenue  = financialArr.reduce((s, o) => s + (o.soldTHB || 0), 0);
      const profit   = financialArr.reduce((s, o) => s + (o.profit || 0), 0);
      const shipCost = financialArr.reduce((s, o) => s + (o.shipCostTHB || 0), 0);
      const count    = volumeCount;
      const aov      = financialArr.length > 0 ? revenue / financialArr.length : 0;
      const margin   = revenue > 0 ? (profit / revenue) * 100 : 0;

      const customerMap = new Map<string, number>();
      financialArr.forEach(o => {
        const id = o.userId || o.displayName || 'anon';
        customerMap.set(id, (customerMap.get(id) || 0) + 1);
      });
      const uniqueCustomers = customerMap.size;
      const repeatCustomers = [...customerMap.values()].filter(v => v > 1).length;
      const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

      return { revenue, profit, shipCost, count, aov, margin, uniqueCustomers, repeatCustomers, repeatRate };
    };
    const curr = calc(confirmedOrders, billableOrders.length);
    const prev = calc(confirmedPrevOrders, billablePrevOrders.length);
    return { curr, prev };
  }, [confirmedOrders, confirmedPrevOrders, billableOrders, billablePrevOrders]);

  const isAllTime = dateRange === 'all' || (dateRange === 'custom' && !customStart);
  const trends = useMemo(() => {
    if (isAllTime) return {};
    const { curr, prev } = kpi;
    return {
      revenue:  pctChange(curr.revenue,  prev.revenue),
      profit:   pctChange(curr.profit,   prev.profit),
      count:    pctChange(curr.count,    prev.count),
      aov:      pctChange(curr.aov,      prev.aov),
      margin:   prev.margin > 0 ? Math.round(curr.margin - prev.margin) : null,
      shipCost: pctChange(curr.shipCost, prev.shipCost),
    };
  }, [kpi, isAllTime]);

  // ── Revenue trend chart ─────────────────────────────────────────────────────

  const trendChartData = useMemo(() => {
    const useWeeks = dateRange === 'all' && confirmedOrders.length > 90;
    const groups = new Map<string, { rev: number; profit: number; ship: number }>();

    const sorted = [...confirmedOrders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    sorted.forEach(o => {
      const d = new Date(o.createdAt);
      let key: string;
      if (useWeeks) {
        const wStart = new Date(d);
        wStart.setDate(d.getDate() - d.getDay());
        key = wStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else {
        key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
      const g = groups.get(key) || { rev: 0, profit: 0, ship: 0 };
      g.rev    += o.soldTHB    || 0;
      g.profit += o.profit     || 0;
      g.ship   += o.shipCostTHB || 0;
      groups.set(key, g);
    });

    const labels = [...groups.keys()];
    const vals   = [...groups.values()];
    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: vals.map(g => g.rev),
          borderColor: accentColor,
          backgroundColor: accentColor + '20',
          fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 6,
        },
        {
          label: 'Profit',
          data: vals.map(g => g.profit),
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4, pointRadius: 0,
        },
        {
          label: 'Shipping',
          data: vals.map(g => g.ship),
          borderColor: isDark ? '#3d4466' : '#cbd5e1',
          backgroundColor: 'transparent',
          borderDash: [2, 4],
          tension: 0.4, pointRadius: 0,
        },
      ],
    };
  }, [confirmedOrders, accentColor, isDark, dateRange]);

  const chartOptions = useMemo(() => ({
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1f2335' : '#ffffff',
        titleColor:  isDark ? '#ffffff' : '#1a1d2e',
        bodyColor:   isDark ? '#8b92ad' : '#4b5563',
        borderColor: isDark ? '#2d324d' : '#e2e5ef',
        borderWidth: 1, padding: 12, boxPadding: 4, usePointStyle: true,
        callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${currency} ${ctx.parsed.y.toLocaleString()}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#8b92ad', font: { size: 10, weight: 'bold' as const }, maxRotation: 0, maxTicksLimit: 10 },
      },
      y: {
        grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
        ticks: { color: '#8b92ad', font: { size: 10 }, callback: (v: any) => `${currency} ${v.toLocaleString()}` },
        border: { display: false },
      },
    },
  }), [isDark, currency]);

  // ── Status funnel ───────────────────────────────────────────────────────────

  const statusFunnel = useMemo(() => {
    // Use billableOrders as denominator — cancelled orders don't belong in the funnel
    const total = billableOrders.length || 1;
    const statusRank = (s: string) => STATUS_ORDER.indexOf(s as any);
    return STATUS_ORDER.map((status, i) => {
      const count = billableOrders.filter(o => statusRank(o.status) >= i).length;
      return { status, count, pct: (count / total) * 100 };
    });
  }, [billableOrders]);

  // ── Top products (full list, sliced in render) ──────────────────────────────

  const allTopProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    confirmedOrders.forEach(o => {
      o.items?.forEach((item: any) => {
        const key = item.productId || item.name || 'unknown';
        const e = map.get(key) || { name: item.name || 'Unknown', qty: 0, revenue: 0 };
        e.qty     += item.qty  || 1;
        e.revenue += (item.price || 0) * (item.qty || 1);
        map.set(key, e);
      });
    });
    const sorted = [...map.values()].sort((a, b) =>
      topProductsSort === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty,
    );
    const maxVal = topProductsSort === 'revenue' ? (sorted[0]?.revenue || 1) : (sorted[0]?.qty || 1);
    return sorted.map(p => ({
      ...p,
      pct: ((topProductsSort === 'revenue' ? p.revenue : p.qty) / maxVal) * 100,
    }));
  }, [confirmedOrders, topProductsSort]);

  // ── Top customers (full list, sliced in render) ─────────────────────────────

  const allTopCustomers = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; revenue: number }>();
    confirmedOrders.forEach(o => {
      const key = o.userId || o.displayName || 'anon';
      const e = map.get(key) || { name: o.displayName || 'Unknown', orders: 0, revenue: 0 };
      e.orders++;
      e.revenue += o.soldTHB || 0;
      map.set(key, e);
    });
    const sorted = [...map.values()].sort((a, b) => b.revenue - a.revenue);
    const maxRev = sorted[0]?.revenue || 1;
    return sorted.map(c => ({ ...c, pct: (c.revenue / maxRev) * 100, aov: c.orders > 0 ? c.revenue / c.orders : 0 }));
  }, [confirmedOrders]);

  // Reset pagination when underlying list changes (date range, sort, or data refresh)
  useEffect(() => { setProductsPage(0); }, [allTopProducts]);
  useEffect(() => { setCustomersPage(0); }, [allTopCustomers]);

  // ── Day-of-week pattern ─────────────────────────────────────────────────────

  const dowRaw = useMemo(() => {
    const counts  = new Array(7).fill(0);
    const revenue = new Array(7).fill(0);
    billableOrders.forEach(o => {
      const d = new Date(o.createdAt).getDay();
      counts[d]++;
      revenue[d] += o.soldTHB || 0;
    });
    return { counts, revenue };
  }, [billableOrders]);

  const dowData = useMemo(() => ({
    labels: DOW_LABELS,
    datasets: [{
      label: dowMode === 'orders' ? 'Orders' : 'Revenue',
      data: dowMode === 'orders' ? dowRaw.counts : dowRaw.revenue,
      backgroundColor: accentColor + '99',
      borderRadius: 6,
      borderSkipped: false,
    }],
  }), [dowRaw, dowMode, accentColor]);

  const dowOptions = useMemo(() => ({
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1f2335' : '#ffffff',
        titleColor:  isDark ? '#ffffff' : '#1a1d2e',
        bodyColor:   '#8b92ad',
        borderColor: isDark ? '#2d324d' : '#e2e5ef',
        borderWidth: 1, padding: 10,
        callbacks: {
          label: (ctx: any) => dowMode === 'revenue'
            ? ` ${currency} ${ctx.parsed.y.toLocaleString()}`
            : ` ${ctx.parsed.y} orders`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8b92ad', font: { size: 10, weight: 'bold' as const } } },
      y: { display: false, grid: { display: false } },
    },
  }), [isDark, dowMode, currency]);

  // ── Courier breakdown ───────────────────────────────────────────────────────

  const courierStats = useMemo(() => {
    const map = new Map<string, number>();
    billableOrders.forEach(o => {
      if (!o.courier) return;
      map.set(o.courier, (map.get(o.courier) || 0) + 1);
    });
    const total = [...map.values()].reduce((s, v) => s + v, 0) || 1;
    return [...map.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count, pct: (count / total) * 100 }));
  }, [billableOrders]);

  const ordersWithCourier    = billableOrders.filter(o => o.courier).length;
  const ordersWithoutCourier = billableOrders.length - ordersWithCourier;

  // ── Coupon & discount impact ────────────────────────────────────────────────

  const discountStats = useMemo(() => {
    const couponMap = new Map(coupons.map((c: any) => [c.code, c]));
    const withCoupon    = billableOrders.filter(o => o.couponCode);
    const totalDiscount = billableOrders.reduce((s, o) => s + (o.discountAmount || 0), 0);
    const totalPoints   = billableOrders.reduce((s, o) => s + (o.redeemedPoints  || 0), 0);
    const couponRate    = billableOrders.length > 0 ? (withCoupon.length / billableOrders.length) * 100 : 0;
    const avgDiscount   = withCoupon.length > 0 ? totalDiscount / withCoupon.length : 0;

    const perCode = new Map<string, { type: string; uses: number; totalDiscount: number }>();
    withCoupon.forEach(o => {
      const meta = couponMap.get(o.couponCode);
      const e = perCode.get(o.couponCode) || { type: meta?.type || 'unknown', uses: 0, totalDiscount: 0 };
      e.uses++;
      e.totalDiscount += o.discountAmount || 0;
      perCode.set(o.couponCode, e);
    });
    const topCodes = [...perCode.entries()]
      .sort(([, a], [, b]) => b.uses - a.uses)
      .slice(0, 4)
      .map(([code, d]) => ({ code, ...d }));

    return { withCoupon: withCoupon.length, couponRate, totalDiscount, totalPoints, avgDiscount, topCodes };
  }, [billableOrders, coupons]);

  // ── CSV export ──────────────────────────────────────────────────────────────

  const handleExport = () => {
    setExportLoading(true);
    const headers = [
      'Date', 'Order ID', 'Customer', 'Items', `Revenue (${currency})`,
      `Cost (${currency})`, `Profit (${currency})`, `Ship Cost (${currency})`,
      'Status', 'Courier', 'Tracking', 'Coupon', `Discount (${currency})`,
    ];
    const rows = filteredOrders.map(o => [
      new Date(o.createdAt).toLocaleDateString(),
      o._id,
      o.displayName || '',
      o.items?.map((i: any) => `${i.qty}x ${i.name}`).join(' + ') || '',
      o.soldTHB || 0, o.costTHB || 0, o.profit || 0, o.shipCostTHB || 0,
      o.status, o.courier || '', o.tracking || '', o.couponCode || '', o.discountAmount || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const label = dateRange === 'custom' && customStart
      ? `${customStart}_${customEnd || 'now'}`
      : dateRange;
    a.download = `report_${label}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setTimeout(() => setExportLoading(false), 600);
  };

  // ── JSX helpers ───────────────────────────────────────────────────────────

  const surface = isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]';
  const muted   = 'text-[#8b92ad]';
  const heading = isDark ? 'text-white' : 'text-[#1a1d2e]';

  const rangePresets = [
    { id: 'today',  label: 'Today' },
    { id: '7d',     label: '7d' },
    { id: 'week',   label: 'This week' },
    { id: '30d',    label: '30d' },
    { id: 'month',  label: 'Month' },
    { id: 'all',    label: 'All time' },
    { id: 'custom', label: 'Custom' },
  ] as const;

  const periodLabel = useMemo(() => {
    if (dateRange === 'custom' && customStart) {
      const end = customEnd || new Date().toISOString().split('T')[0];
      return `${customStart} → ${end}`;
    }
    return (
      dateRange === 'today'  ? 'Today vs yesterday' :
      dateRange === '7d'    ? 'Last 7 days' :
      dateRange === 'week'  ? 'This week (Mon–Sun)' :
      dateRange === '30d'   ? 'Last 30 days' :
      dateRange === 'month' ? 'This month' :
      dateRange === 'all'   ? 'All time' : 'Custom range'
    );
  }, [dateRange, customStart, customEnd]);

  const topProductsTotalPages  = Math.max(1, Math.ceil(allTopProducts.length  / PAGE_SIZE));
  const topCustomersTotalPages = Math.max(1, Math.ceil(allTopCustomers.length / PAGE_SIZE));
  const topProducts  = allTopProducts.slice(productsPage  * PAGE_SIZE, (productsPage  + 1) * PAGE_SIZE);
  const topCustomers = allTopCustomers.slice(customersPage * PAGE_SIZE, (customersPage + 1) * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">

      {/* ── Header (title only) ── */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <div className="p-2.5 bg-accent/[7%] rounded-2xl text-accent flex-shrink-0">
          <TrendingUp size={22} />
        </div>
        <div>
          <h2 className={cn('text-2xl font-black', heading)}>Analytics & Reports</h2>
          <p className={cn('text-xs mt-0.5', muted)}>
            {isLoading ? 'Loading…' : (
              <>
                {billableOrders.length} order{billableOrders.length !== 1 ? 's' : ''}
                {pendingCount > 0 && <span className="text-amber-500 font-bold"> · {pendingCount} pending</span>}
                {' '}· {isAllTime ? 'all time' : `${windowDays}d window`}
                {!isAllTime && billablePrevOrders.length > 0 && (
                  <span> · vs {billablePrevOrders.length} prior</span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Sticky period control bar ── */}
      <div className={cn(
        'sticky top-0 z-30 mb-6 rounded-2xl border shadow-sm backdrop-blur-md',
        isDark ? 'bg-[#0f1117]/90 border-[#1f2335]' : 'bg-white/90 border-[#e2e5ef]',
      )}>
        <div className="px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Preset pills */}
          <div className={cn('flex p-1 rounded-xl border gap-0.5', isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-[#f4f6f9] border-[#e2e5ef]')}>
            {rangePresets.map(r => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap',
                  dateRange === r.id ? 'text-white shadow-sm' : `${muted} hover:text-accent`,
                )}
                style={dateRange === r.id ? { background: 'var(--accent-gradient)' } : undefined}
              >{r.label}</button>
            ))}
          </div>

          {/* Custom date inputs — visible when Custom is selected */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative cursor-pointer" onClick={() => { try { (startRef.current as any)?.showPicker(); } catch {} }}>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={13} />
                <input
                  ref={startRef} type="date" value={customStart}
                  max={todayISO}
                  onChange={e => setCustomStart(e.target.value)}
                  className={cn(
                    'pl-8 pr-3 py-3 rounded-xl text-xs font-bold outline-none border cursor-pointer transition-all',
                    isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]',
                    customStart ? 'border-accent/50' : '',
                  )}
                />
              </div>
              <span className={cn('text-xs font-bold', muted)}>→</span>
              <div className="relative cursor-pointer" onClick={() => { try { (endRef.current as any)?.showPicker(); } catch {} }}>
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={13} />
                <input
                  ref={endRef} type="date" value={customEnd}
                  max={todayISO}
                  onChange={e => setCustomEnd(e.target.value)}
                  className={cn(
                    'pl-8 pr-3 py-3 rounded-xl text-xs font-bold outline-none border cursor-pointer transition-all',
                    isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white' : 'bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]',
                    customEnd ? 'border-accent/50' : '',
                  )}
                />
              </div>
              {(customStart || customEnd) && (
                <button onClick={() => { setCustomStart(''); setCustomEnd(''); }} className={cn('hover:text-red-400 transition-colors', muted)}>
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Active period label */}
          <div className={cn('text-[10px] font-bold ml-1 hidden md:block', muted)}>
            {periodLabel}
          </div>

          {/* Export — pushed to right */}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white hover:opacity-90 active:scale-95 transition-all flex-shrink-0 disabled:opacity-60 text-xs font-bold"
            title="Export CSV"
            aria-label="Export orders as CSV"
          >
            {exportLoading
              ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
              : <Download size={14} />
            }
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Stalled orders warning ── */}
      {!isLoading && totalPaidPreparing > 0 && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 flex-wrap">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <span className={cn('text-xs font-bold', isDark ? 'text-amber-400' : 'text-amber-600')}>
              {stalledOrders.length > 0
                ? <>{stalledOrders.length} order{stalledOrders.length !== 1 ? 's' : ''} <span className="font-black">stalled in fulfillment</span> over</>
                : <>0 orders stalled in fulfillment over</>
              }
            </span>
            <select
              value={stalledThreshold}
              onChange={e => setStalledThreshold(Number(e.target.value))}
              className={cn('text-xs font-black bg-transparent border-b border-amber-400 outline-none cursor-pointer', isDark ? 'text-amber-400' : 'text-amber-600')}
            >
              {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} day{d !== 1 ? 's' : ''}</option>)}
            </select>
            <span className={cn('text-xs font-bold', isDark ? 'text-amber-400' : 'text-amber-600')}>
              {stalledOrders.length > 0 ? '— check fulfillment' : '— all fulfillments up to date'}
            </span>
          </div>
          <span className={cn('text-xs font-bold flex-shrink-0', isDark ? 'text-amber-400' : 'text-amber-600')}>
            {totalPaidPreparing} total in queue
          </span>
        </div>
      )}

      {/* ── Fetch error ── */}
      {fetchError && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
          <span className={`text-xs font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{fetchError}</span>
          <button onClick={() => { setFetchError(null); setIsLoading(true); window.location.reload(); }} className="text-xs font-black text-rose-500 hover:underline flex-shrink-0">Retry</button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard
          theme={theme} color="emerald" isLoading={isLoading}
          icon={<DollarSign size={20} />}
          label="Confirmed Revenue"
          value={fmt(kpi.curr.revenue, currency)}
          sub={pendingRevenue > 0 ? `+${fmt(pendingRevenue, currency)} potential` : undefined}
          subHighlight={pendingRevenue > 0}
          trend={trends.revenue}
        />
        <KpiCard
          theme={theme} color="blue" isLoading={isLoading}
          icon={<TrendingUp size={20} />}
          label="Gross Profit"
          value={fmt(kpi.curr.profit, currency)}
          sub={`${kpi.curr.margin.toFixed(1)}% margin`}
          trend={trends.profit}
        />
        <KpiCard
          theme={theme} color="indigo" isLoading={isLoading}
          icon={<ShoppingCart size={20} />}
          label="Orders"
          value={kpi.curr.count.toString()}
          sub={`${(kpi.curr.count / windowDays).toFixed(1)}/day${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`}
          trend={trends.count}
        />
        <KpiCard
          theme={theme} color="violet" isLoading={isLoading}
          icon={<BarChart2 size={20} />}
          label="Avg Order Value"
          value={fmt(kpi.curr.aov, currency)}
          sub={confirmedOrders.length > 0 ? `across ${confirmedOrders.length} paid orders` : undefined}
          trend={trends.aov}
        />
        <KpiCard
          theme={theme} color="amber" isLoading={isLoading}
          icon={<Users size={20} />}
          label="Repeat Rate"
          value={`${kpi.curr.repeatRate.toFixed(0)}%`}
          sub={`${kpi.curr.repeatCustomers} of ${kpi.curr.uniqueCustomers} customers`}
          trend={null}
        />
        <KpiCard
          theme={theme} color="rose" isLoading={isLoading}
          icon={<Truck size={20} />}
          label="Shipping Cost"
          value={fmt(kpi.curr.shipCost, currency)}
          sub={kpi.curr.revenue > 0 ? `${((kpi.curr.shipCost / kpi.curr.revenue) * 100).toFixed(1)}% of revenue` : undefined}
          trend={trends.shipCost != null ? -trends.shipCost : null}
        />
      </div>

      {/* ── Row 2: Trend chart + Status funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        <SectionCard
          theme={theme} className="lg:col-span-2"
          title="Revenue, Profit & Shipping Trend"
          sub={dateRange === 'all' && confirmedOrders.length > 90 ? 'Grouped by week' : 'Grouped by day'}
        >
          <div className="flex gap-4 mb-4">
            {[
              { color: accentColor, label: 'Revenue' },
              { color: '#10b981',   label: 'Profit' },
              { color: isDark ? '#3d4466' : '#cbd5e1', label: 'Shipping' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] font-black text-[#8b92ad] uppercase">{l.label}</span>
              </div>
            ))}
          </div>
          <div className="h-[260px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
              </div>
            ) : confirmedOrders.length === 0 ? (
              <div className={cn('h-full flex items-center justify-center text-xs', muted)}>No confirmed orders in this period</div>
            ) : (
              <Line data={trendChartData} options={chartOptions as any} />
            )}
          </div>
        </SectionCard>

        {/* Status funnel — denominator fixed to billableOrders */}
        <SectionCard theme={theme} title="Order Pipeline" sub="Conversion funnel · excludes cancelled">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
            </div>
          ) : billableOrders.length === 0 ? (
            <div className={cn('py-8 text-center text-xs', muted)}>No orders</div>
          ) : (
            <div className="space-y-3">
              {statusFunnel.map((stage, i) => (
                <div key={stage.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-xs font-bold', heading)}>{STATUS_LABEL_MAP[stage.status]}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-black', heading)}>{stage.count}</span>
                      <span className={cn('text-[10px]', muted)}>{stage.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-[#1f2335]' : 'bg-slate-100')}>
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', STATUS_COLOR_MAP[stage.status])}
                      style={{ width: `${stage.pct}%` }}
                    />
                  </div>
                  {i < statusFunnel.length - 1 && statusFunnel[i].count > 0 && statusFunnel[i + 1].count < statusFunnel[i].count && (
                    <div className={cn('text-[10px] text-right mt-0.5 text-rose-400')}>
                      −{statusFunnel[i].count - statusFunnel[i + 1].count} dropped
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Row 3: Top products + Top customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Top products */}
        <SectionCard
          theme={theme}
          title="Top Products"
          sub={`${topProductsSort === 'revenue' ? 'By confirmed revenue' : 'By units sold'} · ${
            allTopProducts.length === 0 ? '0 products' :
            allTopProducts.length <= PAGE_SIZE ? `${allTopProducts.length} product${allTopProducts.length !== 1 ? 's' : ''}` :
            `Showing ${productsPage * PAGE_SIZE + 1}–${Math.min((productsPage + 1) * PAGE_SIZE, allTopProducts.length)} of ${allTopProducts.length}`
          }`}
        >
          {/* Sort toggle */}
          <div className={cn('flex p-0.5 rounded-xl border mb-4 w-fit', isDark ? 'bg-[#1a1d2e] border-[#1f2335]' : 'bg-[#f4f6f9] border-[#e2e5ef]')}>
            {(['revenue', 'units'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setTopProductsSort(s); setProductsPage(0); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black transition-all',
                  topProductsSort === s ? 'text-white shadow-sm' : `${muted} hover:text-accent`,
                )}
                style={topProductsSort === s ? { background: 'var(--accent-gradient)' } : undefined}
              >{s === 'revenue' ? 'Revenue' : 'Units'}</button>
            ))}
          </div>
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
            </div>
          ) : topProducts.length === 0 ? (
            <div className={cn('py-8 text-center text-xs', muted)}>No product data</div>
          ) : (
            <>
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          'w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center flex-shrink-0',
                          i === 0 ? 'bg-amber-400/20 text-amber-500' :
                          i === 1 ? 'bg-slate-400/20 text-slate-500' :
                          i === 2 ? 'bg-orange-400/20 text-orange-500' :
                                    isDark ? 'bg-white/5 text-[#8b92ad]' : 'bg-slate-100 text-slate-400',
                        )}>{i + 1}</span>
                        <span className={cn('text-xs font-bold truncate', heading)}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {topProductsSort === 'revenue'
                          ? <><span className={cn('text-[10px]', muted)}>{p.qty} units</span><span className="text-xs font-black text-accent">{fmt(p.revenue, currency)}</span></>
                          : <><span className="text-xs font-black text-accent">{p.qty} units</span><span className={cn('text-[10px]', muted)}>{fmt(p.revenue, currency)}</span></>
                        }
                      </div>
                    </div>
                    <div className={cn('h-1 rounded-full overflow-hidden', isDark ? 'bg-[#1f2335]' : 'bg-slate-100')}>
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-700 group-hover:opacity-80"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {allTopProducts.length > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setProductsPage(p => Math.max(0, p - 1))}
                    disabled={productsPage === 0}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black border transition-all active:scale-95 disabled:opacity-30',
                      isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e]' : 'border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-[#f4f6f9]',
                    )}
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <span className={cn('text-[10px] font-bold', muted)}>
                    Page {productsPage + 1} of {topProductsTotalPages}
                  </span>
                  <button
                    onClick={() => setProductsPage(p => Math.min(topProductsTotalPages - 1, p + 1))}
                    disabled={productsPage >= topProductsTotalPages - 1}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black border transition-all active:scale-95 disabled:opacity-30',
                      isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e]' : 'border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-[#f4f6f9]',
                    )}
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* Top customers */}
        <SectionCard
          theme={theme}
          title="Top Customers"
          sub={`By confirmed spend · ${
            allTopCustomers.length === 0 ? '0 customers' :
            allTopCustomers.length <= PAGE_SIZE ? `${allTopCustomers.length} customer${allTopCustomers.length !== 1 ? 's' : ''}` :
            `Showing ${customersPage * PAGE_SIZE + 1}–${Math.min((customersPage + 1) * PAGE_SIZE, allTopCustomers.length)} of ${allTopCustomers.length}`
          }`}
        >
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
            </div>
          ) : topCustomers.length === 0 ? (
            <div className={cn('py-8 text-center text-xs', muted)}>No customer data</div>
          ) : (
            <>
              <div className="space-y-3">
                {topCustomers.map((c, i) => (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          'w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center flex-shrink-0',
                          i === 0 ? 'bg-amber-400/20 text-amber-500' :
                          i === 1 ? 'bg-slate-400/20 text-slate-500' :
                          i === 2 ? 'bg-orange-400/20 text-orange-500' :
                                    isDark ? 'bg-white/5 text-[#8b92ad]' : 'bg-slate-100 text-slate-400',
                        )}>{i + 1}</span>
                        <span className={cn('text-xs font-bold truncate', heading)}>{c.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={cn('text-[10px]', muted)}>{c.orders} orders</span>
                        <span className="text-xs font-black text-accent">{fmt(c.revenue, currency)}</span>
                      </div>
                    </div>
                    <div className={cn('h-1 rounded-full overflow-hidden', isDark ? 'bg-[#1f2335]' : 'bg-slate-100')}>
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-700 group-hover:opacity-80"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {allTopCustomers.length > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setCustomersPage(p => Math.max(0, p - 1))}
                    disabled={customersPage === 0}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black border transition-all active:scale-95 disabled:opacity-30',
                      isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e]' : 'border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-[#f4f6f9]',
                    )}
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <span className={cn('text-[10px] font-bold', muted)}>
                    Page {customersPage + 1} of {topCustomersTotalPages}
                  </span>
                  <button
                    onClick={() => setCustomersPage(p => Math.min(topCustomersTotalPages - 1, p + 1))}
                    disabled={customersPage >= topCustomersTotalPages - 1}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black border transition-all active:scale-95 disabled:opacity-30',
                      isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e]' : 'border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e] hover:bg-[#f4f6f9]',
                    )}
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {/* ── Row 4: Day-of-week + Courier + Coupon ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Day of week */}
        <SectionCard theme={theme} title="Sales by Day of Week" sub={dowMode === 'orders' ? 'Order count per day' : 'Revenue per day'}>
          {/* Orders / Revenue toggle */}
          <div className={cn('flex p-0.5 rounded-xl border mb-4 w-fit', isDark ? 'bg-[#1a1d2e] border-[#1f2335]' : 'bg-[#f4f6f9] border-[#e2e5ef]')}>
            {(['orders', 'revenue'] as const).map(m => (
              <button
                key={m}
                onClick={() => setDowMode(m)}
                className={cn(
                  'px-3 py-2.5 rounded-lg text-[10px] font-black capitalize transition-all',
                  dowMode === m ? 'text-white shadow-sm' : `${muted} hover:text-accent`,
                )}
                style={dowMode === m ? { background: 'var(--accent-gradient)' } : undefined}
              >{m}</button>
            ))}
          </div>
          <div className="h-[160px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
              </div>
            ) : (
              <Bar data={dowData} options={dowOptions as any} />
            )}
          </div>
          {!isLoading && (() => {
            const data = dowMode === 'orders' ? dowRaw.counts : dowRaw.revenue;
            const peak = data.indexOf(Math.max(...data));
            const peakVal = data[peak];
            if (peakVal === 0) return null;
            return (
              <p className={cn('text-[10px] mt-3 text-center', muted)}>
                Peak: <span className={cn('font-bold', heading)}>{DOW_LABELS[peak]}</span>
                {' '}· {dowMode === 'orders' ? `${peakVal} orders` : fmt(peakVal, currency)}
                {billableOrders.length < 14 && (
                  <span className="text-amber-500"> · small sample</span>
                )}
              </p>
            );
          })()}
        </SectionCard>

        {/* Courier breakdown */}
        <SectionCard theme={theme} title="Courier Breakdown" sub={`${ordersWithCourier} of ${billableOrders.length} orders tracked`}>
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
            </div>
          ) : courierStats.length === 0 ? (
            <div className={cn('py-8 text-center text-xs', muted)}>No courier data yet</div>
          ) : (
            <div className="space-y-3">
              {courierStats.map((c, i) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-xs font-bold', heading)}>{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-black', heading)}>{c.count}</span>
                      <span className={cn('text-[10px]', muted)}>{c.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-[#1f2335]' : 'bg-slate-100')}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: [accentColor, '#10b981', '#3b82f6', '#f59e0b', '#a855f7'][i % 5],
                      }}
                    />
                  </div>
                </div>
              ))}
              {ordersWithoutCourier > 0 && (
                <p className={cn('text-[10px] pt-1', muted)}>
                  {ordersWithoutCourier} order{ordersWithoutCourier !== 1 ? 's' : ''} without courier assigned
                </p>
              )}
              <div className={cn('mt-4 pt-4 border-t', isDark ? 'border-[#1f2335]' : 'border-slate-100')}>
                <div className={cn('text-[10px] font-black uppercase tracking-widest mb-1', muted)}>Velocity</div>
                <div className={cn('text-lg font-black', heading)}>
                  {(ordersWithCourier / windowDays).toFixed(1)}
                  <span className={cn('text-xs font-medium ml-1', muted)}>shipments/day</span>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Coupon & discount */}
        <SectionCard theme={theme} title="Promotions & Discounts" sub="Coupon impact">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Coupons Used',   value: discountStats.withCoupon.toString() },
                  { label: 'Usage Rate',      value: `${discountStats.couponRate.toFixed(1)}%` },
                  { label: 'Total Discounts', value: fmt(discountStats.totalDiscount, currency) },
                  { label: 'Avg Discount',    value: discountStats.withCoupon > 0 ? fmt(discountStats.avgDiscount, currency) : '—' },
                ].map(s => (
                  <div key={s.label} className={cn('p-3 rounded-2xl', isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50')}>
                    <div className={cn('text-[9px] font-black uppercase tracking-widest mb-1', muted)}>{s.label}</div>
                    <div className={cn('text-sm font-black', heading)}>{s.value}</div>
                  </div>
                ))}
              </div>

              {discountStats.totalPoints > 0 && (
                <div className={cn('p-3 rounded-2xl mb-4', isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50')}>
                  <div className={cn('text-[9px] font-black uppercase tracking-widest mb-1', muted)}>Points Redeemed</div>
                  <div className={cn('text-sm font-black', heading)}>{discountStats.totalPoints.toLocaleString()} pts</div>
                </div>
              )}

              {discountStats.topCodes.length > 0 && (
                <div className="space-y-2">
                  <div className={cn('text-[9px] font-black uppercase tracking-widest', muted)}>Top Codes</div>
                  {discountStats.topCodes.map(code => (
                    <div key={code.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag size={11} className="text-accent flex-shrink-0" />
                        <span className={cn('text-xs font-mono font-bold', heading)}>{code.code}</span>
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded font-bold',
                          code.type === 'percent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500',
                        )}>
                          {code.type === 'percent' ? '%' : '฿'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px]', muted)}>{code.uses}×</span>
                        <span className={cn('text-xs font-black', heading)}>{fmt(code.totalDiscount, currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {discountStats.withCoupon === 0 && (
                <div className={cn('py-4 text-center text-xs', muted)}>No coupons used in this period</div>
              )}
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

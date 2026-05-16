import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, 
  FileSpreadsheet, 
  Check, 
  Search, 
  Calendar, 
  Filter, 
  ExternalLink, 
  TrendingUp, 
  Clock, 
  Package, 
  CheckCircle2,
  X
} from 'lucide-react';
import LoadingView from './LoadingView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Order {
  _id: string;
  lineUserId: string;
  displayName: string;
  address: string;
  product: string;
  quantity: number;
  items: any[];
  soldTHB: number;
  status: 'pending' | 'paid' | 'preparing' | 'shipped';
  createdAt: string;
  tracking?: string;
}

export default function ShopOrdersView({ 
  theme, 
  onViewCustomer,
  t
}: { 
  theme?: 'light' | 'dark',
  onViewCustomer?: (userId: string) => void,
  t: any
}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/shop-orders?${params.toString()}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300); // Debounce
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleExportCSV = () => {
    if (!orders || orders.length === 0) return;

    // Headers
    const headers = ['Date', 'Customer', 'Products', 'Total (THB)', 'Status', 'Tracking', 'Address'];
    
    // Rows
    const rows = orders.map(o => [
      new Date(o.createdAt).toLocaleString('th-TH'),
      o.displayName,
      o.items?.map(i => `${i.qty}x ${i.name}`).join(' + ') || `${o.quantity || 1}x ${o.product}`,
      o.soldTHB,
      o.status,
      o.tracking || '-',
      `"${o.address?.replace(/"/g, '""') || ''}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Add BOM for Thai characters in Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shop_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = {
    revenue: orders?.reduce((sum, o) => sum + (o.soldTHB || 0), 0) || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    preparing: orders?.filter(o => o.status === 'preparing').length || 0,
    totalItems: orders?.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (i.qty || 1), 0) || 1), 0) || 0
  };

  if (orders === null && isLoading) return <LoadingView theme={theme} message="Syncing Orders..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className={cn("text-2xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
            <div className="p-2 bg-[#00b90011] rounded-xl text-[#00b900]">
              <ShoppingCart size={24} />
            </div>
            {t.shop_orders_hub || 'Shop Orders Hub'}
          </h2>
          <p className="text-[#8b92ad] text-xs font-medium mt-1 uppercase tracking-widest">{t.fulfillment_management || 'Global Fulfillment Management'}</p>
        </div>
        
        <button 
          onClick={handleExportCSV}
          className="w-full md:w-auto bg-[#00b900] text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#00b90022] hover:opacity-90 active:scale-95 transition-all"
        >
          <FileSpreadsheet size={18} /> {t.export_view || 'Export Current View'}
        </button>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard 
          icon={<TrendingUp size={24} />} 
          label={t.total_revenue || "Total Revenue"} 
          value={`฿${stats.revenue.toLocaleString()}`} 
          color="emerald" 
          theme={theme} 
        />
        <StatsCard 
          icon={<Clock size={24} />} 
          label={t.pending_payments || "Pending Payments"} 
          value={stats.pending.toString()} 
          color="amber" 
          theme={theme} 
        />
        <StatsCard 
          icon={<Package size={24} />} 
          label={t.awaiting_delivery || "Awaiting Delivery"} 
          value={stats.preparing.toString()} 
          color="blue" 
          theme={theme} 
        />
        <StatsCard 
          icon={<CheckCircle2 size={24} />} 
          label="Items Volume" 
          value={stats.totalItems.toString()} 
          color="indigo" 
          theme={theme} 
        />
      </div>

      {/* Filter Toolbar */}
      <div className={cn(
        "p-6 rounded-[40px] border mb-10 flex flex-col lg:flex-row gap-6 transition-all duration-500",
        theme === 'dark' ? "glass-dark border-white/5" : "bg-white border-slate-100 shadow-2xl shadow-slate-200/40"
      )}>
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00b900] transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search catalog by customer, tracking, or products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full pl-14 pr-12 py-4 rounded-2xl text-sm font-bold outline-none border transition-all focus:ring-4 focus:ring-[#00b900]/10",
              theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-[#00b900]" : "bg-[#f8f9fc] border-slate-100 text-slate-900 focus:border-[#00b900]"
            )}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3">
          <div className="relative min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={14} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(
                "w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none outline-none border transition-all cursor-pointer",
                theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]"
              )}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="preparing">Preparing</option>
              <option value="shipped">Shipped</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad] pointer-events-none" size={14} />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={14} />
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(
                  "pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all",
                  theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]"
                )}
              />
            </div>
            <span className="text-[#8b92ad] font-bold">→</span>
            <div className="relative">
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={cn(
                  "pl-4 pr-3 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all",
                  theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#1a1d2e]"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
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
                <th className="px-6 py-5">Order Details</th>
                <th className="px-6 py-5">Customer</th>
                <th className="px-6 py-5">Items</th>
                <th className="px-6 py-5">Total</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f6f9] dark:divide-[#1f2335]">
              {!isLoading && orders?.map((o) => (
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
                    <div className="text-[10px] text-[#8b92ad] max-w-[180px] truncate mt-0.5">{o.address || 'No address provided'}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      {o.items && o.items.length > 0 ? o.items.map((item: any, idx: number) => (
                        <div key={idx} className={cn("text-[11px] flex items-center gap-1.5", theme === 'dark' ? "text-[#8b92ad]" : "text-[#4b5563]")}>
                          <span className="font-bold text-[#00b900] bg-[#00b90011] px-1.5 py-0.5 rounded text-[9px]">{item.qty}x</span>
                          <span className="truncate max-w-[150px]">{item.name}</span>
                        </div>
                      )) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#00b900] bg-[#00b90011] px-1.5 py-0.5 rounded text-[9px]">{o.quantity || 1}x</span>
                          <div className="text-[11px] text-[#8b92ad] italic">{o.product}</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={cn("text-sm font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
                      ฿{(o.soldTHB || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <StatusPill status={o.status} />
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onViewCustomer?.(o.lineUserId)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 shadow-sm",
                          theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-white hover:border-[#00b900]" : "bg-white border-[#e2e5ef] text-[#1a1d2e] hover:border-[#00b900]"
                        )}
                      >
                        <ExternalLink size={12} /> View in Chat
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

        {!isLoading && orders?.length === 0 && (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
            <div className="w-16 h-16 bg-[#f8f9fc] dark:bg-[#1a1d2e] rounded-3xl flex items-center justify-center">
              <Search size={32} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#1a1d2e] dark:text-white">No results found</p>
              <p className="text-xs mt-1">Try adjusting your filters or search terms</p>
            </div>
            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter(''); setStartDate(''); setEndDate(''); }}
              className="text-[#00b900] text-xs font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color, theme }: any) {
  const isDark = theme === 'dark';
  const colorMap: any = {
    emerald: "text-[#10b981] bg-[#10b981]/10 shadow-[#10b981]/10",
    amber: "text-[#f59e0b] bg-[#f59e0b]/10 shadow-[#f59e0b]/10",
    blue: "text-[#3b82f6] bg-[#3b82f6]/10 shadow-[#3b82f6]/10",
    indigo: "text-[#6366f1] bg-[#6366f1]/10 shadow-[#6366f1]/10",
  };

  return (
    <div className={cn(
      "p-8 rounded-[40px] border transition-all duration-500 relative overflow-hidden group",
      isDark ? "glass-dark border-white/5" : "bg-white border-slate-100 shadow-2xl shadow-slate-200/40"
    )}>
      {/* Decorative Glow */}
      <div className={cn("absolute -top-12 -right-12 w-24 h-24 blur-[60px] opacity-20 rounded-full", colorMap[color].split(' ')[1])} />
      
      <div className="flex items-center gap-6 relative z-10">
        <div className={cn("w-14 h-14 rounded-[22px] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500", colorMap[color])}>
          {icon}
        </div>
        <div>
          <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">{label}</div>
          <div className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-[#0f172a]")}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const configs: any = {
    pending: { label: 'PENDING', bg: 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/20' },
    paid: { label: 'PAID', bg: 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' },
    preparing: { label: 'IN PARCEL', bg: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20' },
    shipped: { label: 'SHIPPED', bg: 'bg-slate-400/10 text-slate-400 border-slate-400/20' },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black border uppercase tracking-[0.2em] shadow-sm", config.bg)}>
      {config.label}
    </span>
  );
}

function ChevronDown(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function RefreshCw(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
    </svg>
  );
}

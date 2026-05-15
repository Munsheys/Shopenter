"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Clock, 
  ChevronDown,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from 'lucide-react';
import LoadingView from './LoadingView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface ReportsViewProps {
  theme?: 'light' | 'dark';
  t: any;
}

function StatsCard({ icon, label, value, trend, color, theme }: any) {
  const colorMap: any = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
    rose: "text-rose-500 bg-rose-500/10",
  };

  return (
    <div className={cn(
      "p-6 rounded-[32px] border transition-all shadow-sm flex flex-col gap-4 group hover:shadow-xl hover:-translate-y-1 relative overflow-hidden",
      theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.02] rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
      
      <div className="flex justify-between items-start">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", colorMap[color])}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black",
            trend > 0 ? "text-[#00b900] bg-[#00b90011]" : "text-rose-500 bg-rose-500/11"
          )}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div>
        <div className="text-[#8b92ad] text-[10px] font-black uppercase tracking-widest mb-1">{label}</div>
        <div className={cn("text-2xl font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{value}</div>
      </div>
    </div>
  );
}

export default function ReportsView({ theme, t }: ReportsViewProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'month' | 'all'>('30d');
  const [localCurrency, setLocalCurrency] = useState('THB');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, productsRes, settingsRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/products'),
          fetch('/api/settings'),
        ]);
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (productsRes.ok) setProducts(await productsRes.json());
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          if (s.localCurrency) setLocalCurrency(s.localCurrency);
        }
      } catch (error) {
        console.error("Reports data fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];
    const now = new Date();
    let cutoff = new Date(0);

    if (dateRange === '7d') {
      cutoff = new Date(now.setDate(now.getDate() - 7));
    } else if (dateRange === '30d') {
      cutoff = new Date(now.setDate(now.getDate() - 30));
    } else if (dateRange === 'month') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return orders.filter(o => new Date(o.createdAt) >= cutoff);
  }, [orders, dateRange]);

  const stats = useMemo(() => {
    const revenue = filteredOrders.reduce((sum, o) => sum + (o.soldTHB || 0), 0);
    const profit = filteredOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const cost = filteredOrders.reduce((sum, o) => sum + (o.costTHB || 0), 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return {
      revenue,
      profit,
      cost,
      margin,
      count: filteredOrders.length
    };
  }, [filteredOrders]);

  const chartData = useMemo(() => {
    const groups: Record<string, { rev: number, profit: number }> = {};
    
    // Sort orders by date
    const sorted = [...filteredOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sorted.forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!groups[date]) groups[date] = { rev: 0, profit: 0 };
      groups[date].rev += (o.soldTHB || 0);
      groups[date].profit += (o.profit || 0);
    });

    return {
      labels: Object.keys(groups),
      datasets: [
        {
          label: t.revenue,
          data: Object.values(groups).map(g => g.rev),
          borderColor: '#00b900',
          backgroundColor: 'rgba(0, 185, 0, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: t.profit,
          data: Object.values(groups).map(g => g.profit),
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
        }
      ]
    };
  }, [filteredOrders, t]);

  const brandData = useMemo(() => {
    const brands: Record<string, number> = {};
    const productMap = new Map(products.map(p => [p._id, p.brand || 'Other']));

    filteredOrders.forEach(o => {
      o.items?.forEach((item: any) => {
        const brand = productMap.get(item.productId) || 'Other';
        brands[brand] = (brands[brand] || 0) + (item.price * item.qty);
      });
    });

    const sortedBrands = Object.entries(brands)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      labels: sortedBrands.map(([b]) => b),
      datasets: [{
        data: sortedBrands.map(([, v]) => v),
        backgroundColor: [
          '#00b900',
          '#10b981',
          '#34d399',
          '#6ee7b7',
          '#a7f3d0'
        ],
        borderRadius: 8,
        barThickness: 12
      }]
    };
  }, [filteredOrders, products]);

  const chartOptions = {
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#1f2335' : '#ffffff',
        titleColor: theme === 'dark' ? '#ffffff' : '#1a1d2e',
        bodyColor: theme === 'dark' ? '#8b92ad' : '#4b5563',
        borderColor: theme === 'dark' ? '#2d324d' : '#e2e5ef',
        borderWidth: 1,
        padding: 12,
        boxPadding: 4,
        usePointStyle: true,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#8b92ad', 
          font: { size: 10, weight: 'bold' as const },
          maxRotation: 0
        }
      },
      y: {
        grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        ticks: { 
          color: '#8b92ad', 
          font: { size: 10 },
          callback: (value: any) => localCurrency + ' ' + value.toLocaleString()
        },
        border: { display: false }
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Customer", "Items", `Revenue (${localCurrency})`, `Cost (${localCurrency})`, `Profit (${localCurrency})`, "Status"];
    const rows = filteredOrders.map(o => [
      new Date(o.createdAt).toLocaleDateString(),
      o.displayName || 'Unknown',
      o.items?.length || 0,
      o.soldTHB,
      o.costTHB,
      o.profit,
      o.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `financial_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <LoadingView theme={theme} message="Crunching Financial Data..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h2 className={cn("text-3xl font-black flex items-center gap-3", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
            <div className="p-3 bg-[#00b90011] rounded-2xl text-[#00b900]">
              <TrendingUp size={28} />
            </div>
            {t.report_hub}
          </h2>
          <p className="text-[#8b92ad] text-sm font-medium mt-1 tracking-wide">{t.analytics_desc}</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={cn(
            "flex p-1 rounded-2xl border shadow-sm flex-1 md:flex-none",
            theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
          )}>
            {[
              { id: '7d', label: t.last_7_days },
              { id: '30d', label: t.last_30_days },
              { id: 'month', label: t.this_month },
              { id: 'all', label: t.all_time }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black transition-all",
                  dateRange === range.id 
                    ? "bg-[#00b900] text-white shadow-lg shadow-[#00b90022]" 
                    : "text-[#8b92ad] hover:text-[#00b900]"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>

          <button 
            onClick={handleExportCSV}
            className="p-3 rounded-2xl bg-[#00b900] text-white shadow-lg shadow-[#00b90022] hover:opacity-90 active:scale-95 transition-all"
            title={t.export_report}
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatsCard 
          theme={theme}
          icon={<DollarSign size={24} />}
          label={t.revenue}
          value={`${localCurrency} ${stats.revenue.toLocaleString()}`}
          trend={12}
          color="emerald"
        />
        <StatsCard 
          theme={theme}
          icon={<Target size={24} />}
          label={t.profit}
          value={`${localCurrency} ${stats.profit.toLocaleString()}`}
          trend={8}
          color="blue"
        />
        <StatsCard 
          theme={theme}
          icon={<Package size={24} />}
          label={t.orders_count}
          value={stats.count.toLocaleString()}
          color="indigo"
        />
        <StatsCard 
          theme={theme}
          icon={<TrendingUp size={24} />}
          label={t.avg_margin || "Avg Margin"}
          value={`${stats.margin.toFixed(1)}%`}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Growth Chart */}
        <div className={cn(
          "lg:col-span-2 p-8 rounded-[40px] border shadow-sm transition-all",
          theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
        )}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className={cn("text-lg font-black transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{t.revenue_growth}</h3>
              <p className="text-[10px] text-[#8b92ad] font-bold uppercase tracking-widest">{t.profit_trend}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00b900]" />
                <span className="text-[10px] font-black text-[#8b92ad] uppercase">{t.revenue}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#00b900]" />
                <span className="text-[10px] font-black text-[#8b92ad] uppercase">{t.profit}</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <Line data={chartData} options={chartOptions as any} />
          </div>
        </div>

        {/* Side Brands Chart */}
        <div className={cn(
          "p-8 rounded-[40px] border shadow-sm transition-all",
          theme === 'dark' ? "bg-[#161925] border-[#1f2335]" : "bg-white border-[#e2e5ef]"
        )}>
          <div className="mb-8">
            <h3 className={cn("text-lg font-black transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{t.top_brands}</h3>
            <p className="text-[10px] text-[#8b92ad] font-bold uppercase tracking-widest">{t.brand_perf}</p>
          </div>
          
          <div className="space-y-6">
            {brandData.labels.map((label, idx) => {
              const value = brandData.datasets[0].data[idx];
              const percentage = (value / stats.revenue) * 100;
              return (
                <div key={label} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn("text-xs font-bold transition-colors", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>{label}</span>
                    <span className="text-[10px] font-black text-[#00b900]">{localCurrency} {value.toLocaleString()}</span>
                  </div>
                  <div className={cn("h-1.5 w-full rounded-full overflow-hidden transition-colors", theme === 'dark' ? "bg-[#1f2335]" : "bg-[#f4f6f9]")}>
                    <div 
                      className="h-full bg-[#00b900] rounded-full transition-all duration-1000 group-hover:opacity-80" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className={cn(
            "mt-10 p-4 rounded-2xl border border-dashed text-center",
            theme === 'dark' ? "border-[#1f2335] bg-[#1a1d2e]/50" : "border-[#e2e5ef] bg-[#f8f9fc]"
          )}>
            <Target className="mx-auto mb-2 text-[#00b900] opacity-40" size={20} />
            <p className="text-[10px] font-black text-[#8b92ad] uppercase">{t.sales_velocity}</p>
            <p className={cn("text-xl font-black", theme === 'dark' ? "text-white" : "text-[#1a1d2e]")}>
              {(stats.count / (dateRange === '7d' ? 7 : 30)).toFixed(1)} / day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

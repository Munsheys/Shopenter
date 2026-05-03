import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileSpreadsheet, Check } from 'lucide-react';
import LoadingView from './LoadingView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ShopOrdersView({ theme }: { theme?: 'light' | 'dark' }) {
  const [orders, setOrders] = useState<any[] | null>(null);

  useEffect(() => {
    const secret = typeof window !== 'undefined' ? localStorage.getItem('admin_secret') || '' : '';
    fetch('/api/shop-orders', {
      headers: { 'x-admin-secret': secret }
    })
    .then(r => r.json())
    .then(data => setOrders(Array.isArray(data) ? data : []));
  }, []);

  if (orders === null) return <LoadingView theme={theme} message="Loading Shop Orders..." />;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className={`text-2xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>
          <ShoppingCart className="text-[#8b92ad]" size={28} /> Shop Orders
        </h2>
        <button className="bg-[#00b900] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00b90022] hover:opacity-90 active:scale-95 transition-all">
          <FileSpreadsheet size={18} /> Export CSV for Sheets
        </button>
      </div>

      <div className={`${theme === 'dark' ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'} rounded-3xl border overflow-hidden shadow-sm transition-colors`}>
        <table className="w-full text-left">
          <thead>
            <tr className={`${theme === 'dark' ? 'bg-[#1f2335] text-[#8b92ad]' : 'bg-[#f8f9fc] text-[#8b92ad]'} border-b ${theme === 'dark' ? 'border-[#1f2335]' : 'border-[#e2e5ef]'} text-[10px] font-bold uppercase`}>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Customer / Address</th>
              <th className="px-6 py-4">Products</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {orders.map((o: any) => (
              <tr key={o._id} className={`${theme === 'dark' ? 'border-b border-[#1f2335] hover:bg-[#1a1d2e]' : 'border-b border-[#f4f6f9] hover:bg-[#fafbfc]'} transition-colors`}>
                <td className="px-6 py-4 text-xs text-[#8b92ad]">
                  {new Date(o.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>{o.displayName}</div>
                  <div className="text-[10px] text-[#8b92ad] max-w-[200px] truncate">{o.address}</div>
                </td>
                <td className="px-6 py-4">
                  {o.items?.map((item: any, idx: number) => (
                    <div key={idx} className={`text-[11px] ${theme === 'dark' ? 'text-[#8b92ad]' : 'text-[#1a1d2e]'}`}>
                      {item.name} ({item.variantLabel}) x{item.qty}
                    </div>
                  ))}
                </td>
                <td className={`px-6 py-4 font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>฿{o.totalTHB?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border transition-colors",
                    theme === 'dark' ? "bg-[#1a1d2e] border-[#1f2335] text-[#8b92ad]" : "bg-[#f8f9fc] border-[#e2e5ef] text-[#8b92ad]"
                  )}>
                    {o.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <button className={cn(
                     "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95",
                     theme === 'dark' ? "bg-[#00b90022] text-[#00b900] border-[#00b90044] hover:bg-[#00b90033]" : "bg-[#e8f8e8] text-[#00b900] border-[#00b90022] hover:bg-[#d8f0d8]"
                   )}>
                     <Check size={12} /> Confirm
                   </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className={`px-6 py-12 text-center text-[#8b92ad] ${theme === 'dark' ? 'bg-[#161925]' : 'bg-white'}`}>
                  No shop orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileSpreadsheet, Check } from 'lucide-react';

export default function ShopOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const secret = typeof window !== 'undefined' ? localStorage.getItem('admin_secret') || '' : '';
    fetch('/api/shop-orders', {
      headers: { 'x-admin-secret': secret }
    })
    .then(r => r.json())
    .then(data => setOrders(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <ShoppingCart className="text-[#8b92ad]" size={28} /> Shop Orders
        </h2>
        <button className="bg-[#00b900] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#00b90022]">
          <FileSpreadsheet size={18} /> Export CSV for Sheets
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-[#e2e5ef] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#f8f9fc] border-b border-[#e2e5ef] text-[10px] font-bold text-[#8b92ad] uppercase">
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
              <tr key={o._id} className="border-b border-[#f4f6f9] hover:bg-[#fafbfc] transition-colors">
                <td className="px-6 py-4 text-xs text-[#8b92ad]">
                  {new Date(o.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold">{o.displayName}</div>
                  <div className="text-[10px] text-[#8b92ad] max-w-[200px] truncate">{o.address}</div>
                </td>
                <td className="px-6 py-4">
                  {o.items?.map((item: any) => (
                    <div key={item.productId} className="text-[11px]">
                      {item.name} ({item.variantLabel}) x{item.qty}
                    </div>
                  ))}
                </td>
                <td className="px-6 py-4 font-bold">฿{o.totalTHB?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className="bg-[#f8f9fc] text-[#8b92ad] px-3 py-1 rounded-full text-[10px] font-bold border border-[#e2e5ef]">
                    {o.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                   <button className="flex items-center gap-1 bg-[#e8f8e8] text-[#00b900] px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[#00b90022] hover:bg-[#00b90011]">
                     <Check size={12} /> Confirm
                   </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#8b92ad]">
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

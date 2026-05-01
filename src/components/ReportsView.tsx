"use client";

import React, { useState, useEffect } from 'react';
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
  Filler 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { FileSpreadsheet } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ReportsView() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(data => setStats(data));
  }, []);

  if (!stats) return null;

  const barData = {
    labels: Object.keys(stats.monthly || {}),
    datasets: [{
      label: 'Revenue',
      data: Object.values(stats.monthly || {}).map((m: any) => m.rev),
      backgroundColor: '#00b900',
      borderRadius: 8,
    }]
  };

  const lineData = {
    labels: Object.keys(stats.monthly || {}),
    datasets: [{
      label: 'Profit',
      data: Object.values(stats.monthly || {}).map((m: any) => m.profit),
      borderColor: '#00b900',
      backgroundColor: 'rgba(0, 185, 0, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#00b900',
    }]
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Sales Report</h2>
        <div className="flex items-center gap-3">
           <div className="flex bg-white border border-[#e2e5ef] rounded-lg overflow-hidden h-10">
              <input type="date" className="px-3 border-r border-[#e2e5ef] text-sm" />
              <input type="date" className="px-3 text-sm" />
           </div>
           <button className="bg-[#00b900] text-white px-4 h-10 rounded-lg text-xs font-bold flex items-center gap-2">
             <FileSpreadsheet size={16} /> Export CSV
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-3xl border border-[#e2e5ef] p-8 shadow-sm">
           <div className="text-[10px] font-bold text-[#8b92ad] uppercase mb-4">Total Revenue</div>
           <div className="text-3xl font-bold mb-8">฿{(stats.totalRevTHB || 0).toLocaleString()}</div>
           <div className="h-[250px]">
             <Bar data={barData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
           </div>
        </div>
        <div className="bg-white rounded-3xl border border-[#e2e5ef] p-8 shadow-sm">
           <div className="text-[10px] font-bold text-[#8b92ad] uppercase mb-4">Total Profit</div>
           <div className="text-3xl font-bold text-[#00b900] mb-8">฿{(stats.totalProfit || 0).toLocaleString()}</div>
           <div className="h-[250px]">
             <Line data={lineData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
           </div>
        </div>
      </div>

      <div className="text-[10px] font-bold text-[#8b92ad] uppercase mb-4">Detailed Transactions</div>
      <div className="bg-white rounded-3xl border border-[#e2e5ef] overflow-hidden shadow-sm">
         <table className="w-full text-left">
           <thead>
             <tr className="bg-[#f8f9fc] border-b border-[#e2e5ef] text-[10px] font-bold text-[#8b92ad] uppercase">
               <th className="px-6 py-4">Date</th>
               <th className="px-6 py-4">Item</th>
               <th className="px-6 py-4">Sale</th>
               <th className="px-6 py-4">Profit</th>
             </tr>
           </thead>
           <tbody className="text-sm">
              {/* Add transaction rows here */}
              <tr className="border-b border-[#f4f6f9]">
                <td className="px-6 py-4 text-[#8b92ad]">2026-04-30</td>
                <td className="px-6 py-4 font-semibold">Samorga Card Holder</td>
                <td className="px-6 py-4">฿1,400</td>
                <td className="px-6 py-4 text-[#00b900] font-bold">฿800</td>
              </tr>
           </tbody>
         </table>
      </div>
    </div>
  );
}

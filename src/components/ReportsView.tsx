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
import LoadingView from './LoadingView';

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

export default function ReportsView({ theme }: { theme?: 'light' | 'dark' }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const secret = localStorage.getItem('admin_secret') || '';
    fetch('/api/stats', {
      headers: { 'x-admin-secret': secret }
    })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data) setStats(data);
    })
    .catch(console.error);
  }, []);

  if (!stats) return <LoadingView theme={theme} message="Generating Financial Reports..." />;

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
      backgroundColor: theme === 'dark' ? 'rgba(0, 185, 0, 0.05)' : 'rgba(0, 185, 0, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#00b900',
    }]
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#1f2335' : '#1a1d2e',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: theme === 'dark' ? '#2d324d' : '#e2e5ef',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#8b92ad', font: { size: 10, weight: 'bold' } }
      },
      y: {
        grid: { color: theme === 'dark' ? '#1f2335' : '#f4f6f9' },
        ticks: { color: '#8b92ad', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>Sales Report</h2>
        <div className="flex items-center gap-3">
           <div className={`flex ${theme === 'dark' ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'} rounded-lg overflow-hidden h-10 border transition-colors`}>
              <input type="date" className={`px-3 border-r ${theme === 'dark' ? 'border-[#1f2335] bg-transparent text-white' : 'border-[#e2e5ef] bg-transparent text-[#1a1d2e]'} text-sm outline-none`} />
              <input type="date" className={`px-3 ${theme === 'dark' ? 'bg-transparent text-white' : 'bg-transparent text-[#1a1d2e]'} text-sm outline-none`} />
           </div>
           <button className="bg-[#00b900] text-white px-4 h-10 rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all">
             <FileSpreadsheet size={16} /> Export CSV
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className={`${theme === 'dark' ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'} rounded-3xl border p-8 shadow-sm transition-colors`}>
           <div className="text-[10px] font-bold text-[#8b92ad] uppercase mb-4">Total Revenue</div>
           <div className={`text-3xl font-bold mb-8 ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>฿{(stats.totalRevTHB || 0).toLocaleString()}</div>
           <div className="h-[250px]">
             <Bar data={barData} options={chartOptions as any} />
           </div>
        </div>
        <div className={`${theme === 'dark' ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'} rounded-3xl border p-8 shadow-sm transition-colors`}>
           <div className="text-[10px] font-bold text-[#8b92ad] uppercase mb-4">Total Profit</div>
           <div className="text-3xl font-bold text-[#00b900] mb-8">฿{(stats.totalProfit || 0).toLocaleString()}</div>
           <div className="h-[250px]">
             <Line data={lineData} options={chartOptions as any} />
           </div>
        </div>
      </div>

      <div className="text-[10px] font-bold text-[#8b92ad] uppercase mb-4">Detailed Transactions</div>
      <div className={`${theme === 'dark' ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]'} rounded-3xl border overflow-hidden shadow-sm transition-colors`}>
         <table className="w-full text-left">
           <thead>
             <tr className={`${theme === 'dark' ? 'bg-[#1f2335] text-[#8b92ad]' : 'bg-[#f8f9fc] text-[#8b92ad]'} border-b ${theme === 'dark' ? 'border-[#1f2335]' : 'border-[#e2e5ef]'} text-[10px] font-bold uppercase`}>
               <th className="px-6 py-4">Date</th>
               <th className="px-6 py-4">Item</th>
               <th className="px-6 py-4">Sale</th>
               <th className="px-6 py-4">Profit</th>
             </tr>
           </thead>
            <tbody className="text-sm">
              {stats.recent?.map((o: any) => (
                <tr key={o._id} className={`${theme === 'dark' ? 'border-b border-[#1f2335] hover:bg-[#1a1d2e]' : 'border-b border-[#f4f6f9] hover:bg-[#fafbfc]'} transition-colors`}>
                  <td className="px-6 py-4 text-[#8b92ad]">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className={`px-6 py-4 font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>
                    {o.product}
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-white' : 'text-[#1a1d2e]'}`}>
                    ฿{(o.soldTHB || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-[#00b900] font-bold">
                    ฿{(o.profit || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(!stats.recent || stats.recent.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#8b92ad]">No recent transactions found.</td>
                </tr>
              )}
            </tbody>
         </table>
      </div>
    </div>
  );
}

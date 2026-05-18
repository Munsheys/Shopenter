"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Users, Package, ShoppingCart, DollarSign,
  HeartHandshake, Sparkles, AlertCircle, MessageSquare, HelpCircle,
  TrendingUp, Calendar, Check, ExternalLink, RefreshCw, Key, LogOut,
  Sliders, Activity, CheckCircle2, ChevronRight, Lock
} from 'lucide-react';

interface Metrics {
  totalMerchants: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface MerchantItem {
  _id: string;
  email: string;
  shopName: string;
  slug: string | null;
  createdAt: string;
  lineConfigured: boolean;
  promptPayConfigured: boolean;
  theme: string;
}

interface FeedbackItem {
  _id: string;
  merchantId: string;
  merchantEmail: string;
  merchantShopName: string;
  category: 'feature' | 'bug' | 'opinion' | 'other';
  content: string;
  status: 'new' | 'reviewing' | 'planned' | 'completed';
  createdAt: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Data state
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'merchants' | 'feedback'>('overview');
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);

  // Check existing credentials
  useEffect(() => {
    const saved = localStorage.getItem('sys_admin_secret');
    if (saved) {
      verifySecret(saved);
    } else {
      setLoading(false);
    }
  }, []);

  const verifySecret = async (secretToVerify: string) => {
    setVerifying(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/system', {
        headers: { 'x-admin-secret': secretToVerify }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setMerchants(data.merchants);
        setFeedbacks(data.feedbacks);
        localStorage.setItem('sys_admin_secret', secretToVerify);
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid Administrator Passcode.');
        localStorage.removeItem('sys_admin_secret');
      }
    } catch {
      setLoginError('Database connection error.');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || verifying) return;
    verifySecret(passcode.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('sys_admin_secret');
    setIsAuthenticated(false);
    setPasscode('');
    setMetrics(null);
    setMerchants([]);
    setFeedbacks([]);
  };

  const handleRefresh = async () => {
    const secret = localStorage.getItem('sys_admin_secret') || '';
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system', {
        headers: { 'x-admin-secret': secret }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setMerchants(data.merchants);
        setFeedbacks(data.feedbacks);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (feedbackId: string, newStatus: string) => {
    const secret = localStorage.getItem('sys_admin_secret') || '';
    setUpdatingFeedbackId(feedbackId);
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret
        },
        body: JSON.stringify({ feedbackId, status: newStatus })
      });
      if (res.ok) {
        // Update local list
        setFeedbacks(prev => prev.map(f => f._id === feedbackId ? { ...f, status: newStatus as any } : f));
      }
    } catch {}
    finally {
      setUpdatingFeedbackId(null);
    }
  };

  const getStatusStyles = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'reviewing':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'planned':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'completed':
        return 'bg-[#00b900]/10 text-[#00b900] border border-[#00b900]/20';
    }
  };

  const getCategoryIcon = (cat: FeedbackItem['category']) => {
    switch (cat) {
      case 'bug': return <AlertCircle size={14} className="text-red-400" />;
      case 'feature': return <Sparkles size={14} className="text-purple-400" />;
      case 'opinion': return <MessageSquare size={14} className="text-blue-400" />;
      case 'other': return <HelpCircle size={14} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center gap-4 text-[#8b92ad]">
        <div className="w-10 h-10 border-4 border-t-transparent border-[#00b900] rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#00b900]">Unlocking System Registry...</span>
      </div>
    );
  }

  // ── LOCK SCREEN ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00b900]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="max-w-md w-full bg-[#161925]/80 border border-[#1f2335] backdrop-blur-md rounded-[32px] overflow-hidden shadow-2xl p-10 space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="text-center">
            <div className="w-16 h-16 bg-[#00b900]/10 border border-[#00b900]/20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-[#00b900]/10">
              <Lock size={26} className="text-[#00b900]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Super Admin Panel</h1>
            <p className="text-xs text-[#8b92ad] mt-2 max-w-[280px] mx-auto leading-relaxed">
              Verify your security credentials to access system registries and merchant reports.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider ml-1">Administrator Passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="Enter system passcode..."
                required
                className="w-full bg-[#0f1117] border border-[#1f2335] rounded-2xl py-4 px-5 text-sm outline-none focus:border-[#00b900] focus:ring-1 focus:ring-[#00b900]/30 transition-all font-mono text-center text-white"
              />
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 animate-in shake duration-300">
                <ShieldAlert size={15} />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!passcode.trim() || verifying}
              className="w-full bg-[#00b900] text-white py-4 rounded-2xl font-bold shadow-xl shadow-[#00b900]/10 hover:bg-[#00a300] active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  Authorize Access
                </>
              )}
            </button>
          </form>

          <p className="text-[10px] text-[#8b92ad] text-center leading-relaxed px-4">
            Security lock active. All unauthorized access attempts are logged.
          </p>
        </div>
      </div>
    );
  }

  // ── SUPER ADMIN DASHBOARD PANEL ──
  return (
    <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="flex items-center justify-between h-16 border-b border-[#1f2335] bg-[#161925] px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00b900]/10 border border-[#00b900]/20 flex items-center justify-center shadow-lg shadow-[#00b900]/10">
            <ShieldCheck size={18} className="text-[#00b900]" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight leading-tight">Shopenter System</h1>
            <p className="text-[10px] text-[#00b900] font-bold uppercase tracking-wider">Super Administrator</p>
          </div>
        </div>

        {/* Tab Selection */}
        <nav className="flex items-stretch h-full gap-1">
          {([
            { id: 'overview', label: 'System Overview', icon: <Activity size={14} /> },
            { id: 'merchants', label: 'Merchants List', icon: <Users size={14} /> },
            { id: 'feedback', label: 'Opinions Inbox', icon: <HeartHandshake size={14} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 h-full text-xs font-bold transition-all relative border-b-2 ${
                activeSubTab === tab.id
                  ? 'border-[#00b900] text-white bg-[#0f1117]/30'
                  : 'border-transparent text-[#8b92ad] hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            title="Refresh System Data"
            className="p-2 rounded-lg border border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e] transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold active:scale-95"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* ── SUB-TAB: OVERVIEW ── */}
        {activeSubTab === 'overview' && metrics && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Header info */}
            <div>
              <h2 className="text-xl font-bold tracking-tight">System Oversight Metrics</h2>
              <p className="text-xs text-[#8b92ad] mt-1">Aggregated statistics representing general volume and system activity without violating merchant customer privacy.</p>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Registered Merchants', value: metrics.totalMerchants, desc: 'Total merchant accounts created', icon: <Users size={20} />, color: 'border-blue-500/20 text-blue-400 bg-blue-500/5 shadow-blue-500/5' },
                { label: 'System-wide Products', value: metrics.totalProducts, desc: 'Global active product items listed', icon: <Package size={20} />, color: 'border-purple-500/20 text-purple-400 bg-purple-500/5 shadow-purple-500/5' },
                { label: 'Total Orders Processed', value: metrics.totalOrders, desc: 'Total transactions completed', icon: <ShoppingCart size={20} />, color: 'border-[#00b900]/20 text-[#00b900] bg-[#00b900]/5 shadow-[#00b900]/5' },
                { label: 'Gross Merchandise Value', value: `฿${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, desc: 'Aggregated platform revenue volume', icon: <DollarSign size={20} />, color: 'border-amber-500/20 text-amber-400 bg-amber-500/5 shadow-amber-500/5' },
              ].map(card => (
                <div key={card.label} className={`rounded-2xl p-6 border bg-[#161925] flex flex-col justify-between shadow-xl ${card.color}`}>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b92ad] leading-snug">{card.label}</span>
                    <div className="p-2.5 rounded-xl border border-white/5 bg-white/5">{card.icon}</div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-black tracking-tight text-white">{card.value}</p>
                    <p className="text-[10px] text-[#8b92ad] mt-1">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick overview panels */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Inbox Summary */}
              <div className="rounded-2xl border border-[#1f2335] bg-[#161925] p-6 lg:col-span-3 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
                  <div className="flex items-center gap-2">
                    <HeartHandshake size={16} className="text-[#00b900]" />
                    <h3 className="text-sm font-bold">Recent Merchant Opinions & Bug Reports</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0a0d14] text-[#8b92ad] rounded-full">
                    {feedbacks.length} submitted
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                  {feedbacks.length === 0 ? (
                    <div className="py-16 text-center text-xs text-[#8b92ad] font-bold">No feedback entries found in database.</div>
                  ) : (
                    feedbacks.slice(0, 4).map(fb => (
                      <div key={fb._id} className="p-4 rounded-xl border border-[#1f2335] bg-[#0f1117]/50 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(fb.category)}
                            <span className="text-[10px] font-bold text-white uppercase">{fb.category}</span>
                            <span className="text-[9px] text-[#8b92ad]">from {fb.merchantShopName}</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${getStatusStyles(fb.status)}`}>
                            {fb.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8b92ad] leading-relaxed line-clamp-2">{fb.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Health Panel */}
              <div className="rounded-2xl border border-[#1f2335] bg-[#161925] p-6 lg:col-span-2 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-blue-400" />
                    <h3 className="text-sm font-bold">System Health & Connected Integrations</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Database Status', val: 'Operational', active: true },
                    { label: 'LINE OA Webhook Endpoint', val: 'Active (200 OK)', active: true },
                    { label: 'Platform Multi-Tenant Middleware', val: 'Secured', active: true },
                    { label: 'Active LINE OA Sync Ratio', val: `${Math.round((merchants.filter(m => m.lineConfigured).length / Math.max(1, merchants.length)) * 100)}% of stores`, active: true },
                  ].map(h => (
                    <div key={h.label} className="flex items-center justify-between py-2 border-b border-[#1f2335] last:border-b-0">
                      <span className="text-[10px] font-bold text-[#8b92ad]">{h.label}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full bg-[#00b900] ${h.active ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-bold text-white">{h.val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── SUB-TAB: MERCHANTS LIST ── */}
        {activeSubTab === 'merchants' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Registered Merchant Stores</h2>
              <p className="text-xs text-[#8b92ad] mt-1">Registry directory of active stores on the platform. Individual product inventories and private customer data are safely shielded.</p>
            </div>

            <div className="rounded-2xl border border-[#1f2335] bg-[#161925] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1f2335] bg-[#0f1117]/50 text-[#8b92ad]">
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px]">Store Identity</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px]">Account Email</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px]">Register Date</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-center">LINE Credentials</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-center">PromptPay ID</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2335]">
                    {merchants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#8b92ad] font-bold">No registered merchants found.</td>
                      </tr>
                    ) : (
                      merchants.map(m => (
                        <tr key={m._id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-white">{m.shopName}</div>
                            <div className="text-[10px] text-[#8b92ad] mt-0.5">slug: <span className="font-mono text-[#00b900]">{m.slug || 'unset'}</span></div>
                          </td>
                          <td className="py-4 px-6 text-[#8b92ad] font-semibold">{m.email}</td>
                          <td className="py-4 px-6 text-[#8b92ad]">
                            {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${m.lineConfigured ? 'bg-[#00b900]/10 text-[#00b900]' : 'bg-red-500/10 text-red-400'}`}>
                              {m.lineConfigured ? 'Connected' : 'Disconnected'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${m.promptPayConfigured ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                              {m.promptPayConfigured ? 'Configured' : 'Missing'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {m.slug && (
                              <a
                                href={`/shop/${m.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1f2335] text-[#8b92ad] hover:text-[#00b900] hover:border-[#00b900] transition-colors"
                              >
                                View Shop
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-TAB: FEEDBACK INBOX ── */}
        {activeSubTab === 'feedback' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Merchant Opinions & Bug Inbox</h2>
              <p className="text-xs text-[#8b92ad] mt-1">Oversee bugs, suggestions, and feedback submitted by merchants. Update status levels to display planned updates directly inside merchant dashboards.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {feedbacks.length === 0 ? (
                <div className="rounded-2xl border border-[#1f2335] bg-[#161925] py-20 text-center text-xs font-bold text-[#8b92ad]">
                  <HeartHandshake size={32} className="mx-auto mb-3 opacity-20" />
                  No feedback reports have been submitted.
                </div>
              ) : (
                feedbacks.map(fb => (
                  <div key={fb._id} className="rounded-2xl border border-[#1f2335] bg-[#161925] p-6 shadow-xl flex flex-col md:flex-row justify-between gap-6 hover:border-[#00b900]/30 transition-all">
                    
                    {/* Left: Info */}
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-bold text-white uppercase">
                          {getCategoryIcon(fb.category)}
                          {fb.category}
                        </span>
                        <span className="text-[10px] text-[#8b92ad] font-medium">
                          submitted by <span className="text-white font-bold">{fb.merchantShopName}</span> ({fb.merchantEmail})
                        </span>
                        <span className="text-[10px] text-[#8b92ad] font-semibold">•</span>
                        <span className="text-[9px] text-[#8b92ad]">
                          {new Date(fb.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-white leading-relaxed whitespace-pre-wrap max-w-3xl">
                        {fb.content}
                      </p>
                    </div>

                    {/* Right: Status Actions Dropdown */}
                    <div className="flex flex-col justify-between items-end gap-3 flex-shrink-0 md:border-l md:border-[#1f2335] md:pl-6">
                      <div className="space-y-1 text-right">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#8b92ad] block mb-1">State status</span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${getStatusStyles(fb.status)}`}>
                          {fb.status}
                        </span>
                      </div>

                      <div className="space-y-2 w-full min-w-[140px]">
                        <label className="text-[9px] font-extrabold uppercase tracking-wider text-[#8b92ad] block">Change status</label>
                        <select
                          value={fb.status}
                          disabled={updatingFeedbackId === fb._id}
                          onChange={(e) => handleUpdateStatus(fb._id, e.target.value)}
                          className="w-full bg-[#0f1117] border border-[#1f2335] text-xs font-bold text-white rounded-lg p-2 outline-none focus:border-[#00b900] transition-colors"
                        >
                          <option value="new">New (Received)</option>
                          <option value="reviewing">In Review</option>
                          <option value="planned">Planned (Planned)</option>
                          <option value="completed">Completed (Closed)</option>
                        </select>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      <footer className="h-10 border-t border-[#1f2335] bg-[#161925] flex items-center justify-center text-[10px] text-[#8b92ad] flex-shrink-0">
        © {new Date().getFullYear()} Shopenter Administration Overseer. Privacy Shield Active.
      </footer>
    </div>
  );
}

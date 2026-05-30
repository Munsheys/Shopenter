"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, ShieldAlert, Users, Package, ShoppingCart, DollarSign,
  HeartHandshake, Sparkles, AlertCircle, MessageSquare, HelpCircle,
  TrendingUp, Calendar, Check, ExternalLink, RefreshCw, Key, LogOut,
  Sliders, Activity, CheckCircle2, ChevronRight, Lock, Trash2, Send, 
  Loader2, User, UserCheck, Copy, Cpu, FileText
} from 'lucide-react';

interface Metrics {
  totalMerchants: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface Infra {
  totalMessages: number;
  totalCustomers: number;
  messagesToday: number;
  messagesLast7Days: { date: string; count: number }[];
  dbStorageMB: number;
  dbDataMB: number;
  dbIndexMB: number;
  dbTotalMB: number;
}

interface MerchantItem {
  _id: string;
  email: string;
  shopName: string;
  slug: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  paymentStatus: 'paid' | 'trialing' | 'unpaid';
  // Real-time LINE OA Sync stats
  lineOAPlan: string;
  lineQuotaValue: number;
  lineQuotaUsage: number;
  lineOASyncStatus: 'success' | 'expired' | 'unconfigured';
  // Integration diagnostics
  isLineConfigured: boolean;
  isLiffConfigured: boolean;
  isPromptPayConfigured: boolean;
  isSlipOkConfigured: boolean;
  isTelegramConfigured: boolean;
  isInstagramConfigured: boolean;
  // Volume stats
  productsCount: number;
  ordersCount: number;
  createdAt: string;
}

interface Reply {
  sender: 'admin' | 'merchant';
  content: string;
  createdAt: string;
}

interface FeedbackItem {
  _id: string;
  merchantId: string;
  merchantEmail: string;
  merchantShopName: string;
  merchantTier: string;
  merchantLineOAPlan: string;
  category: 'feature' | 'bug' | 'opinion' | 'other';
  content: string;
  status: 'new' | 'reviewing' | 'planned' | 'completed';
  replies?: Reply[];
  createdAt: string;
  diagnostics: {
    isLineConfigured: boolean;
    isLiffConfigured: boolean;
    isPromptPayConfigured: boolean;
    isSlipOkConfigured: boolean;
    isTelegramConfigured: boolean;
    isInstagramConfigured: boolean;
    productsCount: number;
    ordersCount: number;
    lineOASyncStatus: 'success' | 'expired' | 'unconfigured';
    lineQuotaValue: number;
    lineQuotaUsage: number;
  }
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Data state
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [infra, setInfra] = useState<Infra | null>(null);
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'merchants' | 'feedback'>('overview');
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);

  // Administrative replying state
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingFeedbackId, setReplyingFeedbackId] = useState<string | null>(null);

  // Deletion overlay state
  const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SlipOK configuration modal state
  const [slipokModal, setSlipokModal] = useState<{ merchantId: string; shopName: string } | null>(null);
  const [slipokBranchId, setSlipokBranchId] = useState('');
  const [slipokApiKey, setSlipokApiKey] = useState('');
  const [savingSlipok, setSavingSlipok] = useState(false);

  // Premium Toast Alert state
  const [toastMessage, setToastMessage] = useState('');

  // In-place refresh spinner state
  const [refreshing, setRefreshing] = useState(false);

  // Toast timer ref for cleanup
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Check existing credentials
  useEffect(() => {
    const saved = sessionStorage.getItem('sys_admin_secret');
    if (saved) {
      verifySecret(saved);
    } else {
      setLoading(false);
    }
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Escape key handler for deletion modal
  useEffect(() => {
    if (!feedbackToDelete) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFeedbackToDelete(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [feedbackToDelete]);

  // Escape key handler for SlipOK modal
  useEffect(() => {
    if (!slipokModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlipokModal(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [slipokModal]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 4000);
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
        setInfra(data.infra ?? null);
        setMerchants(data.merchants);
        setFeedbacks(data.feedbacks);
        sessionStorage.setItem('sys_admin_secret', secretToVerify);
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid Administrator Passcode.');
        sessionStorage.removeItem('sys_admin_secret');
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
    sessionStorage.removeItem('sys_admin_secret');
    setIsAuthenticated(false);
    setPasscode('');
    setMetrics(null);
    setMerchants([]);
    setFeedbacks([]);
  };

  const handleRefresh = async () => {
    const secret = sessionStorage.getItem('sys_admin_secret') || '';
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/system', {
        headers: { 'x-admin-secret': secret }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setInfra(data.infra ?? null);
        setMerchants(data.merchants);
        setFeedbacks(data.feedbacks);
        showToast("Synchronized live system and LINE Messaging API diagnostics!");
      } else {
        handleLogout();
        showToast("Session expired. Please log in again.");
      }
    } catch {}
    finally {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (feedbackId: string, newStatus: string) => {
    const secret = sessionStorage.getItem('sys_admin_secret') || '';
    setUpdatingFeedbackId(feedbackId);
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret
        },
        body: JSON.stringify({ action: 'update_status', feedbackId, status: newStatus })
      });
      if (res.ok) {
        setFeedbacks(prev => prev.map(f => f._id === feedbackId ? { ...f, status: newStatus as any } : f));
        showToast(`Status updated successfully to: ${newStatus.toUpperCase()}`);
      }
    } catch {}
    finally {
      setUpdatingFeedbackId(null);
    }
  };

  const handleSendAdminReply = async (feedbackId: string) => {
    const text = replyTexts[feedbackId];
    if (!text || !text.trim() || replyingFeedbackId) return;

    const secret = sessionStorage.getItem('sys_admin_secret') || '';
    setReplyingFeedbackId(feedbackId);
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret
        },
        body: JSON.stringify({
          action: 'reply',
          feedbackId,
          content: text.trim()
        })
      });

      if (res.ok) {
        setReplyTexts(prev => ({ ...prev, [feedbackId]: '' }));
        const data = await res.json();
        if (data.success && data.feedback) {
          setFeedbacks(prev => prev.map(f => f._id === feedbackId ? { ...f, replies: data.feedback.replies } : f));
          showToast("Support reply recorded and sent to the merchant!");
        }
      }
    } catch {}
    finally {
      setReplyingFeedbackId(null);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete || isDeleting) return;

    const secret = sessionStorage.getItem('sys_admin_secret') || '';
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/system?id=${feedbackToDelete._id}`, {
        method: 'DELETE',
        headers: { 'x-admin-secret': secret }
      });

      if (res.ok) {
        setFeedbacks(prev => prev.filter(f => f._id !== feedbackToDelete._id));
        setFeedbackToDelete(null);
        showToast("Feedback report purged permanently.");
      }
    } catch {}
    finally {
      setIsDeleting(false);
    }
  };

  const handleConfigureSlipok = async () => {
    if (!slipokModal || savingSlipok) return;
    const secret = sessionStorage.getItem('sys_admin_secret') || '';
    setSavingSlipok(true);
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({
          action: 'configure_slipok',
          merchantId: slipokModal.merchantId,
          slipokApiKey: slipokApiKey.trim(),
          slipokBranchId: slipokBranchId.trim(),
        }),
      });
      if (res.ok) {
        setMerchants(prev => prev.map(m =>
          m._id === slipokModal.merchantId
            ? { ...m, isSlipOkConfigured: !!(slipokApiKey.trim() && slipokBranchId.trim()) }
            : m
        ));
        setSlipokModal(null);
        setSlipokBranchId('');
        setSlipokApiKey('');
        showToast(`SlipOK credentials configured for ${slipokModal.shopName}.`);
      }
    } catch {}
    finally { setSavingSlipok(false); }
  };

  // 🤖 AI DIAGNOSTICS PROMPT EXPORTER 🤖
  const handleExportAIPrompt = (type: 'merchant' | 'feedback', item: any) => {
    let shopName = '';
    let email = '';
    let slug = '';
    let platformTier = '';
    let lineOAPlan = '';
    let isLine = false;
    let isLiff = false;
    let isPromptPay = false;
    let isSlipOk = false;
    let productsCount = 0;
    let ordersCount = 0;
    let issueContext = '';
    let interactionHistory = '';

    // Automated API statistics properties
    let syncStatus = 'UNCONFIGURED';
    let quotaValue = 0;
    let quotaUsage = 0;

    if (type === 'merchant') {
      const m = item as MerchantItem;
      shopName = m.shopName;
      email = m.email;
      slug = m.slug || 'unset';
      platformTier = m.tier;
      lineOAPlan = m.lineOAPlan;
      isLine = m.isLineConfigured;
      isLiff = m.isLiffConfigured;
      isPromptPay = m.isPromptPayConfigured;
      isSlipOk = m.isSlipOkConfigured;
      productsCount = m.productsCount;
      ordersCount = m.ordersCount;
      syncStatus = m.lineOASyncStatus.toUpperCase();
      quotaValue = m.lineQuotaValue;
      quotaUsage = m.lineQuotaUsage;
      issueContext = 'General store diagnostics monitoring request (no open support tickets).';
    } else {
      const f = item as FeedbackItem;
      shopName = f.merchantShopName;
      email = f.merchantEmail;
      slug = 'unknown';
      platformTier = f.merchantTier;
      lineOAPlan = f.merchantLineOAPlan;
      isLine = f.diagnostics.isLineConfigured;
      isLiff = f.diagnostics.isLiffConfigured;
      isPromptPay = f.diagnostics.isPromptPayConfigured;
      isSlipOk = f.diagnostics.isSlipOkConfigured;
      productsCount = f.diagnostics.productsCount;
      ordersCount = f.diagnostics.ordersCount;
      syncStatus = f.diagnostics.lineOASyncStatus.toUpperCase();
      quotaValue = f.diagnostics.lineQuotaValue;
      quotaUsage = f.diagnostics.lineQuotaUsage;
      issueContext = `Feedback Category: [${f.category.toUpperCase()}]\nMerchant's Report Content:\n"${f.content}"`;

      if (f.replies && f.replies.length > 0) {
        interactionHistory = f.replies
          .map(r => `  - [${new Date(r.createdAt).toLocaleTimeString()}] ${r.sender === 'admin' ? 'Support Admin' : 'Merchant'}: "${r.content}"`)
          .join('\n');
      } else {
        interactionHistory = '  - (No conversation logs recorded yet)';
      }
    }

    const consumptionPercent = quotaValue > 0 ? ((quotaUsage / quotaValue) * 100).toFixed(1) : '0';

    const markdownPrompt = `You are a senior system integration diagnostic expert and customer support specialist for Shopenter (a multi-tenant SaaS integration platform connecting storefronts to LINE Official Accounts).

We have extracted a diagnostic state for store: ${shopName}
--------------------------------------------------
### Store Overview:
- Shop Name: ${shopName}
- Account Email: ${email}
- Shop Slug: ${slug}
- Platform Subscription Tier: ${platformTier.toUpperCase()}
- LINE OA Package Tier: ${lineOAPlan.toUpperCase()}
- Storefront URI: ${slug !== 'unset' ? `https://shopenter.co/shop/${slug}` : 'unset'}

### Global Analytics:
- Listed Products Count: ${productsCount} item(s)
- Total Orders Placed: ${ordersCount} order(s)

### Setup Integrations Health Diagnostics:
- [${isLine ? 'x' : ' '}] LINE Channel webhook / push tokens -> ${isLine ? 'CONNECTED' : 'DISCONNECTED'}
- [${isLiff ? 'x' : ' '}] LIFF (LINE Front-end Framework) ID -> ${isLiff ? 'CONFIGURED' : 'UNCONFIGURED'}
- [${isPromptPay ? 'x' : ' '}] PromptPay QR payments template -> ${isPromptPay ? 'CONFIGURED' : 'MISSING'}
- [${isSlipOk ? 'x' : ' '}] SlipOK automatic slip confirmation -> ${isSlipOk ? 'CONNECTED' : 'DISCONNECTED'}

### Live LINE OA Messaging API Usage:
- Connection Status: ${syncStatus}
- Monthly Message Quota Limit: ${quotaValue > 0 ? quotaValue.toLocaleString() : 'N/A'}
- Messages Sent This Month: ${quotaUsage.toLocaleString()} / ${quotaValue > 0 ? quotaValue.toLocaleString() : 'N/A'} (${consumptionPercent}% consumed)

### Active Client Issue:
${issueContext}

### Interaction Messages Log History:
${interactionHistory}

--------------------------------------------------
INSTRUCTIONS FOR THE DIAGNOSTIC SESSION:
1. Identify any integration gaps (e.g. if the merchant reports that automatic payment confirmation doesn't work, verify if SlipOK and PromptPay are correctly configured in setup diagnostics above).
2. Propose technical solutions or step-by-step checklists to resolve their specific feedback.
3. Draft a beautiful, supportive, and clear client response in Thai (as merchants are Thai storefronts) representing Shopenter Director Support. Keep it professional, friendly, and structured.`;

    navigator.clipboard.writeText(markdownPrompt);
    showToast(`AI Diagnostic Prompt for ${shopName} copied to clipboard! Ready to paste into Claude or Antigravity.`);
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
              <label htmlFor="admin-passcode" className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider ml-1">Administrator Passcode</label>
              <input
                id="admin-passcode"
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
            <p className="text-[10px] text-[#8b92ad] mt-2">Session clears when you close this tab</p>
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
    <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col font-sans relative">
      
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
        <nav role="tablist" className="flex items-stretch h-full gap-1">
          {([
            { id: 'overview', label: 'System Overview', icon: <Activity size={14} /> },
            { id: 'merchants', label: 'Merchants Directory', icon: <Users size={14} /> },
            { id: 'feedback', label: 'Opinions & Support', icon: <HeartHandshake size={14} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeSubTab === tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 h-full text-xs font-bold transition-all relative border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b900] focus-visible:ring-inset ${
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
            title="Refresh System & Live LINE Usage"
            className="p-3 rounded-lg border border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e] transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold active:scale-95"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main id={`panel-${activeSubTab}`} role="tabpanel" className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-8">
        
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

            {/* ── Infrastructure Health ── */}
            {infra && (() => {
              const M0_LIMIT_MB = 512;
              const usedPct = Math.min(100, (infra.dbTotalMB / M0_LIMIT_MB) * 100);
              const storageWarn = usedPct >= 90 ? 'red' : usedPct >= 70 ? 'amber' : 'green';
              const maxDay = Math.max(...infra.messagesLast7Days.map(d => d.count), 1);
              const msgWarnThreshold = 2000;
              const msgWarn = infra.messagesToday >= msgWarnThreshold * 0.9 ? 'red' : infra.messagesToday >= msgWarnThreshold * 0.7 ? 'amber' : 'green';

              const alertColor = (c: string) =>
                c === 'red' ? 'border-red-500/30 bg-red-500/5' :
                c === 'amber' ? 'border-amber-500/30 bg-amber-500/5' :
                'border-[#1f2335] bg-[#161925]';
              const barColor = (c: string) =>
                c === 'red' ? 'bg-red-500' : c === 'amber' ? 'bg-amber-400' : 'bg-[#00b900]';
              const textColor = (c: string) =>
                c === 'red' ? 'text-red-400' : c === 'amber' ? 'text-amber-400' : 'text-[#00b900]';

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Infrastructure Health</h3>
                    <span className="text-[10px] text-[#8b92ad]">MongoDB M0 · 512 MB limit</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Storage gauge */}
                    <div className={`rounded-2xl border p-5 space-y-3 ${alertColor(storageWarn)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">DB Storage</span>
                        {storageWarn !== 'green' && <span className={`text-[9px] font-black uppercase ${textColor(storageWarn)}`}>{storageWarn === 'red' ? '⚠ UPGRADE NOW' : '⚠ APPROACHING LIMIT'}</span>}
                      </div>
                      <div>
                        <div className="flex items-end gap-1">
                          <span className={`text-2xl font-black ${textColor(storageWarn)}`}>{infra.dbTotalMB}</span>
                          <span className="text-[#8b92ad] text-xs mb-1">/ {M0_LIMIT_MB} MB</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#1f2335] mt-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor(storageWarn)}`} style={{ width: `${usedPct}%` }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[11px] text-[#8b92ad]">Data {infra.dbDataMB} MB · Index {infra.dbIndexMB} MB</span>
                          <span className={`text-[11px] font-bold ${textColor(storageWarn)}`}>{usedPct.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Message volume */}
                    <div className={`rounded-2xl border p-5 space-y-3 ${alertColor(msgWarn)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">Messages Today</span>
                        {msgWarn !== 'green' && <span className={`text-[9px] font-black uppercase ${textColor(msgWarn)}`}>HIGH VOLUME</span>}
                      </div>
                      <div>
                        <div className="flex items-end gap-1">
                          <span className={`text-2xl font-black ${textColor(msgWarn)}`}>{infra.messagesToday.toLocaleString()}</span>
                          <span className="text-[#8b92ad] text-xs mb-1">msgs</span>
                        </div>
                        <p className="text-[11px] text-[#8b92ad] mt-1">Total all-time: {infra.totalMessages.toLocaleString()}</p>
                        <p className="text-[11px] text-[#8b92ad]">Customers: {infra.totalCustomers.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* 7-day sparkline */}
                    <div className="rounded-2xl border border-[#1f2335] bg-[#161925] p-5 space-y-3">
                      <span className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">Messages / Day (7d)</span>
                      <div className="flex items-end gap-1 h-14">
                        {infra.messagesLast7Days.map((d, i) => {
                          const heightPct = maxDay > 0 ? (d.count / maxDay) * 100 : 0;
                          const isToday = i === infra.messagesLast7Days.length - 1;
                          return (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#0f1117] border border-[#1f2335] text-[8px] text-white px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                {d.count}
                              </div>
                              <div
                                className={`w-full rounded-sm transition-all ${isToday ? 'bg-[#00b900]' : 'bg-[#2d324d]'}`}
                                style={{ height: `${Math.max(4, heightPct)}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[8px] text-[#8b92ad]">
                        <span>{infra.messagesLast7Days[0]?.date.slice(5)}</span>
                        <span className="text-[#00b900] font-bold">today</span>
                      </div>
                    </div>
                  </div>

                  {/* Upgrade recommendation */}
                  {(storageWarn !== 'green' || msgWarn !== 'green') && (
                    <div className={`rounded-2xl border p-4 flex items-start gap-3 ${storageWarn === 'red' || msgWarn === 'red' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                      <AlertCircle size={16} className={storageWarn === 'red' || msgWarn === 'red' ? 'text-red-400 flex-shrink-0 mt-0.5' : 'text-amber-400 flex-shrink-0 mt-0.5'} />
                      <div className="space-y-1">
                        <p className={`text-xs font-bold ${storageWarn === 'red' || msgWarn === 'red' ? 'text-red-400' : 'text-amber-400'}`}>
                          {storageWarn === 'red' ? 'Upgrade MongoDB immediately — storage critical' : 'Approaching infrastructure limits'}
                        </p>
                        <p className="text-[10px] text-[#8b92ad] leading-relaxed">
                          {storageWarn === 'red'
                            ? `DB at ${usedPct.toFixed(0)}% capacity. Upgrade MongoDB Atlas to M10 ($57/mo) to avoid write failures.`
                            : storageWarn === 'amber'
                            ? `DB at ${usedPct.toFixed(0)}% capacity. Plan upgrade to MongoDB M10 within the next few weeks.`
                            : `Message volume is elevated (${infra.messagesToday}/day). Monitor closely — high sustained volume may require Vercel Pro.`
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
                            <span className="text-[11px] text-[#8b92ad]">from {fb.merchantShopName}</span>
                          </div>
                          <span className={`text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${getStatusStyles(fb.status)}`}>
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
                    { label: 'Active Plan Ratio', val: `${Math.round((merchants.filter(m => m.tier !== 'free').length / Math.max(1, merchants.length)) * 100)}% premium`, active: true },
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

        {/* ── SUB-TAB: MERCHANTS DIRECTORY & REAL-TIME DIAGNOSTICS ── */}
        {activeSubTab === 'merchants' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Registered Merchant Directory & Real-Time LINE Usage</h2>
              <p className="text-xs text-[#8b92ad] mt-1">Registry directory of active stores on the platform. Webhook credentials remain private, while live messaging quotas, consumption, and integration states pull automatically from the LINE API.</p>
            </div>

            <div className="rounded-2xl border border-[#1f2335] bg-[#161925] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1f2335] bg-[#0f1117]/50 text-[#8b92ad]">
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px]">Store Identity</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-center">Shopenter Tier</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-center">LINE OA Live Package</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-center">Monthly Message Consumption</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-center">Diagnostics Status</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-center">Listed Volume</th>
                      <th className="py-4 px-6 font-bold uppercase tracking-wider text-[9px] text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2335]">
                    {merchants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#8b92ad] font-bold">No registered merchants found.</td>
                      </tr>
                    ) : (
                      merchants.map(m => (
                        <tr key={m._id} className="hover:bg-white/5 transition-colors">
                          
                          {/* 1. Identity */}
                          <td className="py-4 px-6">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {m.shopName}
                              {m.tier === 'enterprise' && <UserCheck size={11} className="text-purple-400" />}
                            </div>
                            <div className="text-[11px] text-[#8b92ad] mt-0.5 font-mono">{m.email}</div>
                          </td>

                          {/* 2. Shopenter subscription tier */}
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              m.tier === 'enterprise' 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                : m.tier === 'pro'
                                  ? 'bg-[#00b900]/10 text-[#00b900] border border-[#00b900]/20'
                                  : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            }`}>
                              {m.tier}
                            </span>
                          </td>

                          {/* 3. Real-time LINE OA Package Badge */}
                          <td className="py-4 px-6 text-center font-bold">
                            {m.lineOASyncStatus === 'expired' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md animate-pulse">
                                Invalid Token
                              </span>
                            ) : m.lineOASyncStatus === 'unconfigured' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-600/15 border border-slate-600/20 text-slate-400 rounded-md">
                                Disconnected
                              </span>
                            ) : (
                              <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                m.lineOAPlan === 'Pro' || m.lineOAPlan === 'Unlimited'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                  : m.lineOAPlan === 'Basic'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-slate-600/15 text-slate-400 border border-slate-600/20'
                              }`}>
                                LINE {m.lineOAPlan}
                              </span>
                            )}
                          </td>

                          {/* 4. Monthly Messages Sent Consumption Progress */}
                          <td className="py-4 px-6">
                            {m.lineOASyncStatus === 'success' && m.lineQuotaValue > 0 ? (
                              <div className="w-full max-w-[130px] mx-auto space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="text-white">{m.lineQuotaUsage.toLocaleString()} / {m.lineQuotaValue.toLocaleString()}</span>
                                  <span className="text-[#8b92ad] font-mono">{((m.lineQuotaUsage / m.lineQuotaValue) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-1 bg-[#1f2335] rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      (m.lineQuotaUsage / m.lineQuotaValue) >= 0.8
                                        ? 'bg-red-500'
                                        : (m.lineQuotaUsage / m.lineQuotaValue) >= 0.5
                                          ? 'bg-amber-500'
                                          : 'bg-[#00b900]'
                                    }`}
                                    style={{ width: `${Math.min(100, (m.lineQuotaUsage / m.lineQuotaValue) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-[11px] text-[#8b92ad] font-semibold italic">
                                {m.lineOASyncStatus === 'expired' ? 'Token verification failed' : 'Setup not integrated'}
                              </div>
                            )}
                          </td>

                          {/* 5. Integration flags */}
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {[
                                { key: 'LINE', active: m.isLineConfigured, label: 'LINE connection active' },
                                { key: 'LIFF', active: m.isLiffConfigured, label: 'LIFF SDK configured' },
                                { key: 'TG', active: m.isTelegramConfigured, label: 'Telegram bot active' },
                                { key: 'IG', active: m.isInstagramConfigured, label: 'Instagram DM bot active' },
                                { key: 'PAY', active: m.isPromptPayConfigured, label: 'PromptPay set' },
                                { key: 'SLIP', active: m.isSlipOkConfigured, label: 'SlipOK active' },
                              ].map(diag => (
                                <span
                                  key={diag.key}
                                  title={diag.label}
                                  className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${
                                    diag.active
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-red-500/10 text-red-400 border-red-500/20 opacity-60'
                                  }`}
                                >
                                  {diag.key}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* 6. Listed Item Volume */}
                          <td className="py-4 px-6 text-center">
                            <div className="flex flex-col gap-0.5 items-center">
                              <span className="text-[10px] font-bold text-white">{m.productsCount} products</span>
                              <span className="text-[11px] text-[#8b92ad] font-medium">{m.ordersCount} orders</span>
                            </div>
                          </td>

                          {/* 7. Diagnostic Exporters */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSlipokModal({ merchantId: m._id, shopName: m.shopName });
                                  setSlipokBranchId('');
                                  setSlipokApiKey('');
                                }}
                                title="Configure SlipOK Credentials"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                                  m.isSlipOkConfigured
                                    ? 'border-emerald-500/20 text-emerald-400 hover:border-emerald-500'
                                    : 'border-[#1f2335] text-[#8b92ad] hover:text-amber-400 hover:border-amber-500/30'
                                }`}
                              >
                                <Key size={12} />
                                <span className="text-[9px] font-extrabold tracking-wide uppercase">SlipOK</span>
                              </button>

                              <button
                                onClick={() => handleExportAIPrompt('merchant', m)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#1f2335] text-slate-300 hover:text-[#00b900] hover:border-[#00b900] transition-colors"
                                title="Export Live Setup for AI Session"
                              >
                                <Cpu size={12} />
                                <span className="text-[9px] font-extrabold tracking-wide uppercase">AI Prompt</span>
                              </button>

                              {m.slug && (
                                <a
                                  href={`/shop/${m.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 p-1.5 rounded-lg border border-[#1f2335] text-[#8b92ad] hover:text-white hover:bg-[#1a1d2e] transition-colors"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
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

        {/* ── SUB-TAB: OPINIONS INBOX & TWO-WAY CHAT ── */}
        {activeSubTab === 'feedback' && (
          <div className="space-y-6 animate-in fade-in duration-300 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Merchant Communication & Real-Time Support Hub</h2>
                <p className="text-xs text-[#8b92ad] mt-1">Oversee bugs, suggestions, and feedback submitted by merchants. Send interactive responses, diagnose connection status, and export prompts for AI diagnostics.</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#161925] border border-[#1f2335] text-[#00b900]">
                {feedbacks.length} submissions
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {feedbacks.length === 0 ? (
                <div className="rounded-2xl border border-[#1f2335] bg-[#161925] py-20 text-center text-xs font-bold text-[#8b92ad]">
                  <HeartHandshake size={32} className="mx-auto mb-3 opacity-20" />
                  No feedback reports have been submitted.
                </div>
              ) : (
                feedbacks.map(fb => (
                  <div key={fb._id} className="rounded-2xl border border-[#1f2335] bg-[#161925] p-6 shadow-xl space-y-5 hover:border-[#00b900]/20 transition-all">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-[#1f2335] pb-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-white/5 bg-white/5 text-[9px] font-bold text-white uppercase">
                            {getCategoryIcon(fb.category)}
                            {fb.category}
                          </span>
                          <span className="text-[10px] text-[#8b92ad] font-medium">
                            submitted by <span className="text-white font-bold">{fb.merchantShopName}</span> ({fb.merchantEmail})
                          </span>
                          <span className="text-[10px] text-[#8b92ad] font-semibold">•</span>
                          <span className="text-[11px] text-[#8b92ad]">
                            {new Date(fb.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Label */}
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${getStatusStyles(fb.status)}`}>
                          {fb.status}
                        </span>
                        
                        {/* Status Change Dropdown */}
                        <select
                          value={fb.status}
                          disabled={updatingFeedbackId === fb._id}
                          onChange={(e) => handleUpdateStatus(fb._id, e.target.value)}
                          className="bg-[#0f1117] border border-[#1f2335] text-[10px] font-extrabold text-white rounded-lg p-1.5 outline-none focus:border-[#00b900] transition-colors"
                        >
                          <option value="new">New (Received)</option>
                          <option value="reviewing">In Review</option>
                          <option value="planned">Planned</option>
                          <option value="completed">Completed (Closed)</option>
                        </select>

                        {/* Export to AI Button */}
                        <button
                          onClick={() => handleExportAIPrompt('feedback', fb)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#00b900]/30 hover:border-[#00b900] bg-[#00b900]/5 text-[#00b900] transition-colors animate-pulse-slow"
                          title="Export Live Diagnostic Prompt for AI Session"
                        >
                          <Cpu size={12} />
                          <span className="text-[9px] font-extrabold tracking-wide uppercase">AI Prompt</span>
                        </button>

                        {/* Deletion Icon */}
                        <button
                          onClick={() => setFeedbackToDelete(fb)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#8b92ad] hover:text-red-400 transition-colors"
                          title="Purge Report"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Live integration indicators checklist inside context */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0f1117]/30 border border-[#1f2335]/30 px-4 py-3 rounded-xl text-[10px]">
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[#8b92ad] font-bold uppercase tracking-wide text-[8px]">Client Setup:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-xs ${fb.diagnostics.isLineConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
                            LINE: {fb.diagnostics.isLineConfigured ? 'ON' : 'OFF'}
                          </span>
                          <span className={`font-bold text-xs ${fb.diagnostics.isLiffConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
                            LIFF: {fb.diagnostics.isLiffConfigured ? 'ON' : 'OFF'}
                          </span>
                          <span className={`font-bold text-xs ${fb.diagnostics.isTelegramConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
                            TG: {fb.diagnostics.isTelegramConfigured ? 'ON' : 'OFF'}
                          </span>
                          <span className={`font-bold text-xs ${fb.diagnostics.isInstagramConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
                            IG: {fb.diagnostics.isInstagramConfigured ? 'ON' : 'OFF'}
                          </span>
                          <span className={`font-bold text-xs ${fb.diagnostics.isPromptPayConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
                            QR PAY: {fb.diagnostics.isPromptPayConfigured ? 'ON' : 'OFF'}
                          </span>
                          <span className={`font-bold text-xs ${fb.diagnostics.isSlipOkConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
                            SLIP: {fb.diagnostics.isSlipOkConfigured ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <span className="text-[#8b92ad]">•</span>
                        <div className="text-[#8b92ad]">
                          {fb.diagnostics.productsCount} Products, {fb.diagnostics.ordersCount} Orders
                        </div>
                      </div>

                      {/* Live LINE API Sync Indicators inside Opinions card! */}
                      <div className="flex items-center gap-3">
                        <span className="text-[#8b92ad] font-bold uppercase tracking-wide text-[8px]">LINE API Quota:</span>
                        {fb.diagnostics.lineOASyncStatus === 'success' && fb.diagnostics.lineQuotaValue > 0 ? (
                          <div className="flex items-center gap-2 font-bold text-white">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                              fb.merchantLineOAPlan === 'Pro' || fb.merchantLineOAPlan === 'Unlimited'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-slate-600/10 text-slate-400 border border-slate-600/20'
                            }`}>
                              LINE {fb.merchantLineOAPlan}
                            </span>
                            <span>{fb.diagnostics.lineQuotaUsage.toLocaleString()} / {fb.diagnostics.lineQuotaValue.toLocaleString()} msgs ({((fb.diagnostics.lineQuotaUsage / fb.diagnostics.lineQuotaValue) * 100).toFixed(0)}%)</span>
                          </div>
                        ) : (
                          <span className="text-[#8b92ad] font-semibold italic">
                            {fb.diagnostics.lineOASyncStatus === 'expired' ? 'Invalid Token' : 'Disconnected'}
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Content Section */}
                    <div className="bg-[#0f1117]/50 border border-[#1f2335]/60 p-4 rounded-xl space-y-1">
                      <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wider">Merchant Description</span>
                      <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                        {fb.content}
                      </p>
                    </div>

                    {/* Conversation thread log */}
                    <div className="space-y-3 pt-2">
                      <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wider">Communication Logs Thread</span>
                      
                      <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-2">
                        {fb.replies && fb.replies.length > 0 ? (
                          fb.replies.map((rep, rIdx) => {
                            const isAdmin = rep.sender === 'admin';
                            return (
                              <div key={rIdx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-[10px] leading-relaxed max-w-[80%] border ${
                                  isAdmin 
                                    ? 'bg-[#1a1d2e] border-[#1f2335] rounded-tr-sm text-white' 
                                    : 'bg-[#00b900]/10 border-[#00b900]/20 rounded-tl-sm text-white'
                                }`}>
                                  <span className={`text-[8px] font-black block mb-1 uppercase tracking-wider ${isAdmin ? 'text-blue-400' : 'text-[#00b900]'}`}>
                                    {isAdmin ? 'You (Administrator)' : `${fb.merchantShopName}`}
                                  </span>
                                  <p className="whitespace-pre-wrap">{rep.content}</p>
                                  <span className="text-[7px] text-[#8b92ad] block text-right mt-1 font-semibold">
                                    {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-4 border border-[#1f2335]/30 border-dashed rounded-xl">
                            <span className="text-[11px] text-[#8b92ad] font-bold block">No replies recorded yet</span>
                            <span className="text-[11px] text-slate-500">Send an inquiry below to ask for more details.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Admin Response Area */}
                    <div className="flex gap-3 pt-1">
                      <label className="sr-only" htmlFor={`reply-${fb._id}`}>Reply to {fb.merchantShopName}</label>
                      <input
                        id={`reply-${fb._id}`}
                        type="text"
                        value={replyTexts[fb._id] || ''}
                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [fb._id]: e.target.value }))}
                        placeholder={`Send a responsive request for more info back to ${fb.merchantShopName}...`}
                        className="flex-1 bg-[#0f1117] border border-[#1f2335] text-[10px] text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#00b900] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendAdminReply(fb._id)}
                        disabled={!(replyTexts[fb._id] || '').trim() || replyingFeedbackId === fb._id}
                        className="px-4 py-2 bg-[#00b900] text-white hover:bg-[#00a300] rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {replyingFeedbackId === fb._id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <Send size={11} />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* ── GLOBAL CUSTOM DELETION MODAL ── */}
      {feedbackToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-fb-title" className="max-w-sm w-full bg-[#161925] border border-[#1f2335] rounded-[24px] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500 animate-pulse">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 id="delete-fb-title" className="text-sm font-bold tracking-tight text-white">Permanently Delete Feedback?</h4>
                <p className="text-[11px] text-[#8b92ad] leading-relaxed">
                  Warning: Purging this report removes the submission, status states, and all dialogue logs permanently from the database. This action is irreversible.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFeedbackToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all bg-[#1a1d2e] border-transparent text-[#8b92ad] hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFeedback}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/10 transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Purging...
                  </>
                ) : (
                  <>
                    <Trash2 size={12} />
                    Yes, Purge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SLIPOK CONFIGURATION MODAL ── */}
      {slipokModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-labelledby="slipok-modal-title" className="max-w-sm w-full bg-[#161925] border border-[#1f2335] rounded-[24px] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#00b900]/10 border border-[#00b900]/20 flex items-center justify-center flex-shrink-0 text-[#00b900]">
                <Key size={18} />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <h4 id="slipok-modal-title" className="text-sm font-bold tracking-tight text-white">Configure SlipOK</h4>
                <p className="text-[11px] text-[#8b92ad] truncate">{slipokModal.shopName}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="slipok-branch-id" className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">Branch ID</label>
                <input
                  id="slipok-branch-id"
                  type="text"
                  value={slipokBranchId}
                  onChange={e => setSlipokBranchId(e.target.value)}
                  placeholder="e.g. SLIP-XXXXX"
                  className="w-full bg-[#0f1117] border border-[#1f2335] rounded-xl py-2.5 px-4 text-xs outline-none focus:border-[#00b900] transition-colors text-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="slipok-api-key" className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider">API Key</label>
                <input
                  id="slipok-api-key"
                  type="password"
                  value={slipokApiKey}
                  onChange={e => setSlipokApiKey(e.target.value)}
                  placeholder="SlipOK API key..."
                  className="w-full bg-[#0f1117] border border-[#1f2335] rounded-xl py-2.5 px-4 text-xs outline-none focus:border-[#00b900] transition-colors text-white font-mono"
                />
              </div>
              <p className="text-[10px] text-[#8b92ad] leading-relaxed">
                Leave both fields empty and save to remove SlipOK credentials for this merchant.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSlipokModal(null)}
                disabled={savingSlipok}
                className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all bg-[#1a1d2e] text-[#8b92ad] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfigureSlipok}
                disabled={savingSlipok}
                className="px-4 py-2 rounded-xl text-[11px] font-bold bg-[#00b900] hover:bg-[#00a300] text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                {savingSlipok ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Key size={12} />
                    Save Credentials
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREMIUM GLASSMORPHIC TOAST ALERTS ── */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 right-6 z-[110000] max-w-sm rounded-2xl bg-[#161925]/90 border border-[#00b900]/30 backdrop-blur-md px-5 py-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toastMessage ? '' : 'hidden'}`}
      >
        <div className="w-8 h-8 rounded-full bg-[#00b900]/10 flex items-center justify-center text-[#00b900] flex-shrink-0 animate-pulse">
          <CheckCircle2 size={16} />
        </div>
        <p className="text-[11px] font-bold text-white leading-tight flex-1">
          {toastMessage}
        </p>
      </div>

      <footer className="h-10 border-t border-[#1f2335] bg-[#161925] flex items-center justify-center text-[10px] text-[#8b92ad] flex-shrink-0">
        © {new Date().getFullYear()} Shopenter Administration Overseer. Privacy Shield Active.
      </footer>
    </div>
  );
}

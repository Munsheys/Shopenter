'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Trash2, X, ToggleLeft, ToggleRight, RefreshCw, Copy, Check } from 'lucide-react';

interface Coupon {
  _id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function CouponsView({ theme }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: generateCode(),
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    minOrderAmount: '',
    maxUses: '',
    expiresAt: '',
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/coupons');
      if (res.ok) setCoupons(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.code || !form.value) return;
    setSaving(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: parseFloat(form.value),
          minOrderAmount: parseFloat(form.minOrderAmount) || 0,
          maxUses: parseInt(form.maxUses) || 0,
          expiresAt: form.expiresAt || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ code: generateCode(), type: 'percent', value: '', minOrderAmount: '', maxUses: '', expiresAt: '' });
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to create coupon');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    await fetch(`/api/coupons/${coupon._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/coupons/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const surface = isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]';
  const inputCls = cn('w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent',
    isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white' : 'bg-white border-[#e2e5ef] text-[#1a1d2e]');
  const labelCls = 'text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-1.5 block';

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className={cn('text-2xl font-black flex items-center gap-3', isDark ? 'text-white' : 'text-[#1a1d2e]')}>
            <div className="p-2 bg-accent/10 rounded-xl text-accent"><Tag size={24} /></div>
            Discount Codes
          </h2>
          <p className="text-[#8b92ad] text-xs font-medium mt-1 uppercase tracking-widest">Coupons & Promotions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto bg-accent text-white px-6 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/[13%] hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={18} /> Create Coupon
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className={cn('border rounded-3xl p-6 mb-6', surface)}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-[#1a1d2e]')}>New Coupon</h3>
            <button onClick={() => setShowForm(false)} className="text-[#8b92ad] hover:text-red-400 transition-colors"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  maxLength={20}
                  className={cn(inputCls, 'flex-1 font-mono font-bold tracking-widest')}
                  placeholder="e.g. SAVE10"
                />
                <button
                  onClick={() => setForm(f => ({ ...f, code: generateCode() }))}
                  className={cn('px-3 py-2.5 border rounded-xl transition-colors', isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-[#e2e5ef] text-[#8b92ad] hover:text-[#1a1d2e]')}
                  title="Generate random code"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Discount Type</label>
              <div className="flex gap-2">
                {(['percent', 'fixed'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all',
                      form.type === t
                        ? 'bg-accent text-white border-accent'
                        : isDark ? 'border-[#1f2335] text-[#8b92ad]' : 'border-[#e2e5ef] text-[#8b92ad]'
                    )}
                  >
                    {t === 'percent' ? '% Percent' : '฿ Fixed'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>{form.type === 'percent' ? 'Discount %' : 'Discount Amount (฿)'}</label>
              <input
                type="number"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                className={cn(inputCls, 'font-bold text-accent')}
                placeholder={form.type === 'percent' ? '10' : '50'}
                min="1"
                max={form.type === 'percent' ? '100' : undefined}
              />
            </div>

            <div>
              <label className={labelCls}>Min. Order Amount (฿)</label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                className={inputCls}
                placeholder="0 = no minimum"
                min="0"
              />
            </div>

            <div>
              <label className={labelCls}>Max Uses (0 = unlimited)</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                className={inputCls}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className={labelCls}>Expires At (optional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowForm(false)}
              className={cn('flex-1 py-3 text-sm font-bold rounded-2xl', isDark ? 'bg-[#1a1d2e] text-[#8b92ad]' : 'bg-[#f4f6f9] text-[#8b92ad]')}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.code || !form.value}
              className="flex-1 py-3 text-sm font-bold text-white bg-accent rounded-2xl disabled:opacity-40 hover:opacity-90"
            >
              {saving ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </div>
      )}

      {/* Coupon List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent border-accent rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className={cn('border rounded-3xl p-12 text-center', surface)}>
          <div className="w-14 h-14 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-4"><Tag size={28} className="text-accent opacity-50" /></div>
          <p className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-[#1a1d2e]')}>No coupons yet</p>
          <p className="text-xs text-[#8b92ad] mt-1">Create your first discount code above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(coupon => {
            const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
            const isExhausted = coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses;

            return (
              <div key={coupon._id} className={cn('border rounded-3xl p-5 transition-all', surface, !coupon.isActive && 'opacity-60')}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('px-3 py-1.5 rounded-xl font-mono font-black text-sm tracking-widest flex items-center gap-2 cursor-pointer select-none',
                      isDark ? 'bg-[#1a1d2e] text-accent' : 'bg-[#f4f6f9] text-accent')}
                      onClick={() => copyCode(coupon.code)}
                    >
                      {coupon.code}
                      {copiedCode === coupon.code
                        ? <Check size={12} className="text-accent" />
                        : <Copy size={12} className="text-[#8b92ad]" />
                      }
                    </div>
                    <div>
                      <p className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-[#1a1d2e]')}>
                        {coupon.type === 'percent' ? `${coupon.value}% off` : `฿${coupon.value} off`}
                        {coupon.minOrderAmount > 0 && <span className="text-[#8b92ad] font-normal text-xs"> (min ฿{coupon.minOrderAmount})</span>}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-[10px] text-[#8b92ad]">
                          Used: {coupon.usedCount}{coupon.maxUses > 0 ? ` / ${coupon.maxUses}` : ''}
                        </span>
                        {coupon.expiresAt && (
                          <span className={cn('text-[10px]', isExpired ? 'text-red-400' : 'text-[#8b92ad]')}>
                            {isExpired ? 'Expired' : `Expires: ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                          </span>
                        )}
                        {isExhausted && <span className="text-[10px] text-amber-500">Limit reached</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(coupon)}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all',
                        coupon.isActive
                          ? 'border-accent/30 bg-accent/10 text-accent'
                          : isDark ? 'border-[#1f2335] text-[#8b92ad]' : 'border-[#e2e5ef] text-[#8b92ad]'
                      )}
                    >
                      {coupon.isActive ? <><ToggleRight size={14} /> Active</> : <><ToggleLeft size={14} /> Paused</>}
                    </button>
                    <button
                      onClick={() => setDeleteId(coupon._id)}
                      className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors dark:bg-red-500/10 dark:hover:bg-red-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[400] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className={cn('rounded-[28px] w-full max-w-sm p-8 text-center shadow-2xl', isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white')}>
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-5"><Trash2 size={28} /></div>
            <h3 className={cn('text-lg font-bold mb-2', isDark ? 'text-white' : 'text-[#1a1d2e]')}>Delete Coupon?</h3>
            <p className="text-sm text-[#8b92ad] mb-6">This will permanently delete the coupon code.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className={cn('flex-1 py-3 text-sm font-bold rounded-xl', isDark ? 'bg-[#1a1d2e] text-[#8b92ad]' : 'bg-[#f4f6f9] text-[#8b92ad]')}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 text-sm font-bold bg-red-500 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

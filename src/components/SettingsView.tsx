"use client";

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, X, Save, Eye, EyeOff, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import LoadingView from './LoadingView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] font-medium text-green-600 hover:text-green-700 flex-shrink-0"
    >
      {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
    </button>
  );
}

export default function SettingsView({ theme, onSave }: { theme?: 'light' | 'dark'; onSave?: () => void }) {
  const isDark = theme === 'dark';
  const [settings, setSettings] = useState<any>(null);
  const [newCompany, setNewCompany] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showLiff, setShowLiff] = useState(false);
  const [showSlipKey, setShowSlipKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [fetchingRate, setFetchingRate] = useState(false);
  const [liveRateError, setLiveRateError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setSettings(data))
      .catch(() => {});
    setWebhookUrl(`${window.location.origin}/api/webhook`);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        onSave?.();
      } else {
        setSaveError('Failed to save. Please try again.');
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchLiveRate = async () => {
    setFetchingRate(true);
    setLiveRateError('');
    const from = settings.importCurrency || 'KRW';
    const to = settings.localCurrency || 'THB';
    try {
      const res = await fetch(`/api/rate?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      set('krwRate', data.rate);
    } catch (e: any) {
      setLiveRateError(e.message || 'Could not fetch live rate');
    } finally {
      setFetchingRate(false);
    }
  };

  const set = (field: string, value: any) => setSettings((s: any) => ({ ...s, [field]: value }));
  const removeCompany = (c: string) => set('shippingCompanies', settings.shippingCompanies.filter((x: string) => x !== c));
  const addCompany = () => {
    if (!newCompany.trim()) return;
    set('shippingCompanies', [...(settings.shippingCompanies || []), newCompany.trim()]);
    setNewCompany('');
  };

  if (!settings) return <LoadingView theme={theme} message="Loading Settings..." />;

  const inp = cn(
    'w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-all',
    isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-gray-600' : 'bg-white border-[#e2e5ef] text-[#1a1d2e]'
  );
  const secInp = cn(inp, 'pr-12 font-mono text-xs');
  const divider = cn('pt-8 border-t mb-8 transition-colors', isDark ? 'border-[#1f2335]' : 'border-[#f4f6f9]');
  const sectionTitle = cn('text-sm font-bold mb-6', isDark ? 'text-white' : 'text-[#1a1d2e]');
  const label = 'text-[10px] font-bold text-[#8b92ad] uppercase tracking-wider mb-2 block';
  const hint = 'text-[10px] text-[#8b92ad] mt-1 ml-1';

  return (
    <div className="max-w-4xl mx-auto pb-20 p-6">
      <h2 className={cn('text-2xl font-bold mb-8 flex items-center gap-3', isDark ? 'text-white' : 'text-[#1a1d2e]')}>
        <SettingsIcon size={28} className="text-[#8b92ad]" /> Settings
      </h2>

      <div className={cn('rounded-3xl border p-8 shadow-sm transition-colors', isDark ? 'bg-[#161925] border-[#1f2335]' : 'bg-white border-[#e2e5ef]')}>

        {/* ── Shop identity ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className={label}>Shop Name</label>
            <input
              type="text"
              value={settings.shopName || ''}
              onChange={e => set('shopName', e.target.value)}
              placeholder="My Awesome Shop"
              className={inp}
              autoComplete="off"
            />
            <p className={hint}>Shown on your storefront header and dashboard</p>
          </div>
          <div>
            <label className={label}>Theme Preference</label>
            <div className={cn('p-1 rounded-xl w-fit', isDark ? 'bg-[#1a1d2e]' : 'bg-[#f4f6f9]')}>
              {(['light', 'dark'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => set('theme', t)}
                  className={cn(
                    'px-6 py-2 rounded-lg text-xs font-bold transition-all capitalize',
                    settings.theme === t
                      ? (isDark ? 'bg-[#2d324d] text-green-400 shadow-lg' : 'bg-white shadow-sm text-green-600')
                      : 'text-[#8b92ad]'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Currency & Exchange Rate ── */}
        <div className="mb-10">
          <h3 className={sectionTitle}>Currency & Exchange Rate</h3>
          <p className="text-[10px] text-[#8b92ad] mb-6 leading-relaxed">
            Set the default currencies for cost and selling price. You can override the cost currency per order.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className={label}>Cost Currency</label>
              <select
                value={settings.importCurrency || 'KRW'}
                onChange={e => set('importCurrency', e.target.value)}
                className={inp}
              >
                {['THB', 'KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'HKD', 'SGD', 'TWD'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className={hint}>Default currency you pay when sourcing products (can be changed per order)</p>
            </div>
            <div>
              <label className={label}>Selling Currency</label>
              <select
                value={settings.localCurrency || 'THB'}
                onChange={e => set('localCurrency', e.target.value)}
                className={inp}
              >
                {['THB', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'PHP', 'IDR', 'VND'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className={hint}>Currency your customers pay in (fixed per order)</p>
            </div>
          </div>

          <div className="mb-4">
            <label className={label}>Rate Source</label>
            <div className={cn('p-1 rounded-xl w-fit', isDark ? 'bg-[#1a1d2e]' : 'bg-[#f4f6f9]')}>
              {[false, true].map(isLive => (
                <button
                  key={String(isLive)}
                  type="button"
                  onClick={() => set('useAutoRate', isLive)}
                  className={cn(
                    'px-6 py-2 rounded-lg text-xs font-bold transition-all',
                    (settings.useAutoRate ?? false) === isLive
                      ? (isDark ? 'bg-[#2d324d] text-green-400 shadow-lg' : 'bg-white shadow-sm text-green-600')
                      : 'text-[#8b92ad]'
                  )}
                >
                  {isLive ? 'Live (auto)' : 'Manual'}
                </button>
              ))}
            </div>
            <p className={hint}>
              {settings.useAutoRate
                ? 'Live rate is fetched automatically on each profit calculation'
                : 'Use a fixed rate you set below'}
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 md:max-w-xs">
              <label className={label}>
                1 {settings.importCurrency || 'KRW'} = ? {settings.localCurrency || 'THB'}
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={settings.krwRate ?? 0.026}
                onChange={e => set('krwRate', parseFloat(e.target.value) || 0)}
                className={inp}
                autoComplete="off"
                disabled={settings.useAutoRate}
              />
            </div>
            <button
              type="button"
              onClick={handleFetchLiveRate}
              disabled={fetchingRate}
              className={cn(
                'px-4 py-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0',
                isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white hover:border-green-500' : 'bg-[#f4f6f9] border-[#e2e5ef] text-[#1a1d2e] hover:border-green-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw size={14} className={fetchingRate ? 'animate-spin' : ''} />
              {fetchingRate ? 'Fetching...' : 'Fetch live rate'}
            </button>
          </div>
          {liveRateError && <p className="text-xs text-red-500 mt-2">{liveRateError}</p>}
        </div>

        {/* ── Shipping ── */}
        <div className={divider}>
          <h3 className={sectionTitle}>Shipping</h3>
          <div className="mb-6">
            <label className={label}>Shipping Companies</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {settings.shippingCompanies?.map((c: string, i: number) => (
                <div key={i} className={cn(
                  'flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs font-semibold',
                  isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white' : 'bg-[#f4f6f9] border-[#e2e5ef] text-[#1a1d2e]'
                )}>
                  {c}
                  <button onClick={() => removeCompany(c)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add shipping company..."
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCompany(); }}
                className={cn(inp, 'flex-1')}
                autoComplete="off"
              />
              <button onClick={addCompany} className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-600 transition-all">
                <Plus size={18} /> Add
              </button>
            </div>
          </div>

          <div>
            <label className={label}>Sender Address</label>
            <textarea
              rows={3}
              value={settings.senderAddress || ''}
              onChange={e => set('senderAddress', e.target.value)}
              placeholder="Your shop's return / sender address"
              className={cn(inp, 'resize-none')}
              autoComplete="off"
            />
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className={divider}>
          <h3 className={sectionTitle}>Shipping Notification Message</h3>
          <textarea
            rows={6}
            value={settings.trackingTemplate || ''}
            onChange={e => set('trackingTemplate', e.target.value)}
            className={cn(inp, 'resize-none leading-relaxed')}
            autoComplete="off"
          />
          <p className="mt-2 text-[10px] text-[#8b92ad]">
            Placeholders: <code>{'{'+'tracking}'}</code> <code>{'{'+'courier}'}</code> <code>{'{'+'product}'}</code> <code>{'{'+'name}'}</code>
          </p>
        </div>

        {/* ── Payment ── */}
        <div className={divider}>
          <h3 className={sectionTitle}>Payment</h3>

          <div className="mb-6 md:w-1/2">
            <label className={label}>PromptPay ID (phone number or national ID)</label>
            <input
              type="text"
              value={settings.promptPayId || ''}
              onChange={e => set('promptPayId', e.target.value)}
              placeholder="e.g. 0812345678"
              className={inp}
              autoComplete="off"
            />
            <p className={hint}>Used to generate the payment QR code sent to customers</p>
          </div>

          <div className="mb-8">
            <label className={label}>Payment Confirmation Message</label>
            <textarea
              rows={5}
              value={settings.paymentTemplate || ''}
              onChange={e => set('paymentTemplate', e.target.value)}
              className={cn(inp, 'resize-none leading-relaxed')}
              autoComplete="off"
            />
            <p className="mt-2 text-[10px] text-[#8b92ad]">
              Placeholders: <code>{'{'+'product}'}</code> <code>{'{'+'amount}'}</code> <code>{'{'+'name}'}</code>
            </p>
          </div>

          {/* SlipOK */}
          <div className={cn('rounded-xl p-5', isDark ? 'bg-[#1a1d2e]' : 'bg-[#f8faff]')}>
            <label className={cn(label, 'flex items-center gap-2 mb-1')}>
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              SlipOK — Automatic Slip Verification
            </label>
            <p className="text-[10px] text-[#8b92ad] mb-4 leading-relaxed">
              Automatically verifies bank transfer slips uploaded by customers. Leave blank to skip verification.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={label}>Branch ID</label>
                <input
                  type="text"
                  value={settings.slipokBranchId || ''}
                  onChange={e => set('slipokBranchId', e.target.value)}
                  placeholder="e.g. 12345"
                  className={inp}
                  autoComplete="off"
                  name="slipok-branch"
                />
              </div>
              <div>
                <label className={label}>API Key</label>
                <div className="relative">
                  <input
                    type={showSlipKey ? 'text' : 'password'}
                    value={settings.slipokApiKey || ''}
                    onChange={e => set('slipokApiKey', e.target.value)}
                    placeholder="sk_live_..."
                    className={secInp}
                    autoComplete="new-password"
                    name="slipok-key"
                  />
                  <button type="button" onClick={() => setShowSlipKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad]">
                    {showSlipKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LINE Integration ── */}
        <div className={divider}>
          <h3 className={sectionTitle}>LINE Integration</h3>

          {/* Webhook URL helper */}
          <div className={cn('rounded-xl p-4 mb-6', isDark ? 'bg-[#1a1d2e]' : 'bg-[#f4f6f9]')}>
            <p className={cn(label, 'mb-2')}>Your Webhook URL</p>
            <div className="flex items-center gap-3">
              <code className={cn('flex-1 text-xs font-mono truncate', isDark ? 'text-green-400' : 'text-green-700')}>{webhookUrl}</code>
              <CopyButton value={webhookUrl} />
              <a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-[#8b92ad] hover:text-green-600">
                Console <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-[10px] text-[#8b92ad] mt-2">Paste this into Messaging API → Webhook settings in the LINE Developer Console.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className={label}>LIFF ID (from LINE Login channel)</label>
              <div className="relative">
                <input
                  type={showLiff ? 'text' : 'password'}
                  value={settings.liffId || ''}
                  onChange={e => set('liffId', e.target.value)}
                  placeholder="1234567890-AbCdEfGh"
                  className={secInp}
                  autoComplete="new-password"
                  name="liff-id"
                />
                <button type="button" onClick={() => setShowLiff(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad]">
                  {showLiff ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className={hint}>Lets customers log in with LINE on your storefront to place orders</p>
            </div>
            <div>
              <label className={label}>Admin LINE ID (optional)</label>
              <input
                type="text"
                value={settings.adminLineId || ''}
                onChange={e => set('adminLineId', e.target.value)}
                placeholder="U1234567890abcdef..."
                className={cn(inp, 'font-mono text-xs')}
                autoComplete="off"
                name="admin-line-id"
              />
              <p className={hint}>Your personal LINE user ID for receiving order notifications</p>
            </div>
          </div>

          <div className={cn('flex items-center gap-3 mb-4')}>
            <div className={cn('flex-1 h-px', isDark ? 'bg-[#1f2335]' : 'bg-[#e2e5ef]')} />
            <span className="text-[10px] font-bold text-[#8b92ad] uppercase tracking-widest whitespace-nowrap">Messaging API Channel</span>
            <div className={cn('flex-1 h-px', isDark ? 'bg-[#1f2335]' : 'bg-[#e2e5ef]')} />
          </div>

          <p className="text-[10px] text-[#8b92ad] mb-4 leading-relaxed">
            <span className="text-red-500 font-bold">Important:</span> Use credentials from your <strong>Messaging API</strong> channel only — not a LINE Login channel.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className={label}>Channel Secret (Basic Settings tab)</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={settings.lineChannelSecret || ''}
                  onChange={e => set('lineChannelSecret', e.target.value)}
                  placeholder="32-character hex string"
                  className={secInp}
                  autoComplete="new-password"
                  name="line-channel-secret"
                />
                <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad]">
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className={hint}>Verifies webhook requests are genuinely from LINE</p>
            </div>
            <div>
              <label className={label}>Channel Access Token (Messaging API tab)</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={settings.lineChannelAccessToken || ''}
                  onChange={e => set('lineChannelAccessToken', e.target.value)}
                  placeholder="Long-lived access token"
                  className={secInp}
                  autoComplete="new-password"
                  name="line-access-token"
                />
                <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92ad]">
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className={hint}>Authorises outgoing messages (QR codes, tracking, order confirmations)</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
            <strong>Note:</strong> Credential fields appear empty for security — your saved values are never sent back to the browser.
            Leave a field blank to keep your current saved value. Only type in a field to update it.
          </div>
        </div>

        {/* ── Save ── */}
        {saveError && <p className="text-sm text-red-500 mb-4">{saveError}</p>}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-green-500 disabled:opacity-50 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:bg-green-600 active:scale-[0.99] transition-all"
        >
          {isSaving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Check, ArrowRight, ExternalLink, ChevronUp, ChevronDown,
  Store, MessageSquare, Globe, Zap, Package, Hand, LayoutGrid, Megaphone, X,
} from 'lucide-react';

type DashTab = 'customers' | 'orders' | 'products' | 'reports' | 'broadcasts' | 'storefront' | 'settings';

type StepAction =
  | { kind: 'nav';  label: string; tab: DashTab; section?: string }
  | { kind: 'href'; label: string; href: string };

interface Step {
  n: number;
  done: boolean;
  icon: React.ReactNode;
  title: string;
  action: StepAction | null;
}

export default function FloatingGuide({
  theme,
  onNavigate,
  nudgeUp = false,
}: {
  theme?: 'light' | 'dark';
  onNavigate: (tab: DashTab, section?: string) => void;
  nudgeUp?: boolean;
}) {
  const isDark = theme === 'dark';

  const [open, setOpen]           = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [settings, setSettings]   = useState<any>(null);
  const [lineOk, setLineOk]       = useState(false);
  const [hasProducts, setHasProducts]     = useState(false);
  const [hasAutoReply, setHasAutoReply]   = useState(false);
  const [hasRichMenu, setHasRichMenu]     = useState(false);
  const [hasBroadcast, setHasBroadcast]   = useState(false);

  useEffect(() => {
    if (localStorage.getItem('sg-dismissed') === 'true') { setDismissed(true); return; }
    setOpen(localStorage.getItem('sg-open') === 'true');

    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
    fetch('/api/line-status')
      .then(r => r.json())
      .then(d => setLineOk(!!(d.configured && d.valid)))
      .catch(() => {});
    fetch('/api/products')
      .then(r => r.json())
      .then(d => setHasProducts(Array.isArray(d) && d.length > 0))
      .catch(() => {});
    fetch('/api/auto-reply')
      .then(r => r.json())
      .then(d => setHasAutoReply(Array.isArray(d) && d.some((r: any) => r.isActive)))
      .catch(() => {});
    fetch('/api/rich-menu')
      .then(r => r.json())
      .then(d => setHasRichMenu(Array.isArray(d.richmenus) && d.richmenus.length > 0))
      .catch(() => {});
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(d => setHasBroadcast(Array.isArray(d) && d.some((c: any) => c.deliveryMode === 'instant' && c.status === 'completed')))
      .catch(() => {});
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setOpen(false);
    localStorage.setItem('sg-dismissed', 'true');
  }, []);

  const toggle = useCallback(() => {
    setOpen(v => {
      localStorage.setItem('sg-open', String(!v));
      return !v;
    });
  }, []);

  if (!settings || dismissed) return null;

  const steps: Step[] = [
    {
      n: 1, done: true, icon: <Check size={12} />,
      title: 'Account created',
      action: null,
    },
    {
      n: 2, done: !!(settings.shopName && settings.shopName !== 'My Shop'),
      icon: <Store size={12} />,
      title: 'Set your shop name',
      action: { kind: 'nav', label: 'General', tab: 'settings', section: 'general' },
    },
    {
      n: 3, done: lineOk,
      icon: <MessageSquare size={12} />,
      title: 'Connect LINE OA',
      action: { kind: 'nav', label: 'LINE Settings', tab: 'settings', section: 'line' },
    },
    {
      n: 4, done: false,
      icon: <Globe size={12} />,
      title: 'Set webhook URL in LINE Console',
      action: { kind: 'href', label: 'LINE Console', href: 'https://developers.line.biz/' },
    },
    {
      n: 5, done: !!settings.promptPayId,
      icon: <Zap size={12} />,
      title: 'Add PromptPay ID',
      action: { kind: 'nav', label: 'Payment Settings', tab: 'settings', section: 'payment' },
    },
    {
      n: 6, done: hasProducts,
      icon: <Package size={12} />,
      title: 'Add your first product',
      action: { kind: 'nav', label: 'Products', tab: 'products' },
    },
    {
      n: 7, done: false,
      icon: <Store size={12} />,
      title: 'Customize your storefront',
      action: { kind: 'nav', label: 'Storefront', tab: 'storefront' },
    },
    {
      n: 8, done: !!settings.greetingEnabled,
      icon: <Hand size={12} />,
      title: 'Set greeting message',
      action: { kind: 'nav', label: 'Broadcasts', tab: 'broadcasts' },
    },
    {
      n: 9, done: hasAutoReply,
      icon: <MessageSquare size={12} />,
      title: 'Create auto-reply rules',
      action: { kind: 'nav', label: 'Broadcasts', tab: 'broadcasts' },
    },
    {
      n: 10, done: hasRichMenu,
      icon: <LayoutGrid size={12} />,
      title: 'Design a Rich Menu',
      action: { kind: 'nav', label: 'Broadcasts', tab: 'broadcasts' },
    },
    {
      n: 11, done: hasBroadcast,
      icon: <Megaphone size={12} />,
      title: 'Send first broadcast',
      action: { kind: 'nav', label: 'Broadcasts', tab: 'broadcasts' },
    },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  if (doneCount === steps.length) return null;

  const bg     = isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200';
  const text   = isDark ? 'text-white' : 'text-slate-900';
  const muted  = isDark ? 'text-[#8b92ad]' : 'text-slate-500';
  const deep   = isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100';
  const border = isDark ? 'border-[#1f2335]' : 'border-slate-200';

  return (
    <div className={`fixed right-5 z-50 flex flex-col items-end gap-2 pointer-events-none transition-all duration-300 ${nudgeUp ? 'bottom-20' : 'bottom-5'}`}>

      {/* ── Expanded panel ── */}
      {open && (
        <div className={`rounded-2xl shadow-2xl w-72 overflow-hidden pointer-events-auto ${bg}`}>

          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${border}`}>
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-[#00b900]" />
              <p className={`text-sm font-semibold ${text}`}>Getting Started</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${deep} ${muted}`}>
                {doneCount}/{steps.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggle} className={`p-1 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                <ChevronDown size={14} />
              </button>
              <button onClick={dismiss} title="Dismiss" className={`p-1 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-red-400' : 'text-slate-300 hover:text-red-400'}`}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-4 pt-3 pb-1">
            <div className={`h-1 rounded-full ${deep}`}>
              <div
                className="h-1 rounded-full bg-[#00b900] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="overflow-y-auto max-h-[340px] px-2 py-2">
            {steps.map(step => (
              <div
                key={step.n}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  step.done
                    ? 'opacity-40'
                    : isDark ? 'hover:bg-[#1a1d2e]' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                  step.done
                    ? 'bg-[#00b900]/15 text-[#00b900]'
                    : isDark ? 'bg-[#1a1d2e] text-[#8b92ad]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {step.done ? <Check size={10} /> : step.n}
                </div>

                <p className={`flex-1 text-xs font-medium truncate ${text} ${step.done ? 'line-through' : ''}`}>
                  {step.title}
                </p>

                {!step.done && step.action && (() => {
                  const a = step.action!;
                  const cls = `text-[10px] font-semibold text-[#00b900] hover:text-[#00a000] transition-colors flex-shrink-0 flex items-center gap-0.5 whitespace-nowrap`;
                  if (a.kind === 'href') return (
                    <a href={a.href} target="_blank" rel="noopener noreferrer" className={cls}>
                      {a.label} <ExternalLink size={8} />
                    </a>
                  );
                  return (
                    <button
                      onClick={() => {
                        onNavigate(a.tab, a.section);
                        setOpen(false);
                        localStorage.setItem('sg-open', 'false');
                      }}
                      className={cls}
                    >
                      {a.label} <ArrowRight size={8} />
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Collapsed pill ── */}
      <button
        onClick={toggle}
        className={`flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl shadow-xl transition-all pointer-events-auto ${bg} hover:shadow-2xl active:scale-[0.98]`}
      >
        <div className="w-7 h-7 rounded-full bg-[#00b900]/10 flex items-center justify-center flex-shrink-0">
          <BookOpen size={13} className="text-[#00b900]" />
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <p className={`text-xs font-semibold leading-none ${text}`}>Getting Started</p>
          <div className="flex items-center gap-2">
            <div className={`w-14 h-1 rounded-full ${deep}`}>
              <div
                className="h-1 rounded-full bg-[#00b900] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-[10px] leading-none ${muted}`}>{doneCount}/{steps.length}</span>
          </div>
        </div>
        {open
          ? <ChevronDown size={12} className={muted} />
          : <ChevronUp   size={12} className={muted} />
        }
      </button>
    </div>
  );
}

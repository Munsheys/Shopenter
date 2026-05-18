'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Check, ArrowRight, ExternalLink, ChevronUp, ChevronDown,
  Store, MessageSquare, Globe, Zap, Package, Hand, LayoutGrid, Megaphone, X,
  AlertCircle
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
  
  type Corner = 'tl' | 'tr' | 'bl' | 'br';
  const [corner, setCorner] = useState<Corner>('br');
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState<{ x: number, y: number } | null>(null);
  const dragRef = useRef<{ startX: number, startY: number, initX: number, initY: number, moved: boolean } | null>(null);
  const [lineOk, setLineOk]       = useState(false);
  const [hasProducts, setHasProducts]     = useState(false);
  const [hasAutoReply, setHasAutoReply]   = useState(false);
  const [hasRichMenu, setHasRichMenu]     = useState(false);
  const [hasBroadcast, setHasBroadcast]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  useEffect(() => {
    const syncDismissed = () => {
      setDismissed(localStorage.getItem('sg-dismissed') === 'true');
    };
    syncDismissed();
    window.addEventListener('sg-dismissed-changed', syncDismissed);
    return () => window.removeEventListener('sg-dismissed-changed', syncDismissed);
  }, []);

  useEffect(() => {
    setOpen(localStorage.getItem('sg-open') === 'true');
    const c = localStorage.getItem('sg-corner') as Corner;
    if (c) setCorner(c);

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
    setShowConfirm(true);
  }, []);

  const confirmDismiss = useCallback(() => {
    setDismissed(true);
    setOpen(false);
    setShowConfirm(false);
    localStorage.setItem('sg-dismissed', 'true');
    window.dispatchEvent(new Event('sg-dismissed-changed'));
  }, []);

  const toggle = useCallback(() => {
    setOpen(v => {
      localStorage.setItem('sg-open', String(!v));
      return !v;
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent, isHeader?: boolean) => {
    if (e.button !== 0) return; // only left click
    const target = e.target as HTMLElement;
    if (open && !isHeader) return; // if expanded, only drag from header
    if (target.closest('button') && !isHeader) return; // ignore clicks on buttons when collapsed
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
      moved: false,
    };
    setPos({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, [open]);

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
      
      const targetY = dragRef.current.initY + dy;
      setPos({
        x: dragRef.current.initX + dx,
        y: Math.max(76, targetY),
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      if (dragRef.current.moved) {
        const cx = e.clientX;
        const cy = e.clientY;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isLeft = cx < w / 2;
        const isTop = cy < h / 2;
        const c = `${isTop ? 't' : 'b'}${isLeft ? 'l' : 'r'}` as Corner;
        setCorner(c);
        localStorage.setItem('sg-corner', c);
      } else {
        // it was just a click
        if (!open) toggle();
      }
      setIsDragging(false);
      setPos(null);
      dragRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, open, toggle]);

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
      action: { kind: 'nav', label: 'General', tab: 'settings', section: 'general-shopname' },
    },
    {
      n: 3, done: lineOk,
      icon: <MessageSquare size={12} />,
      title: 'Connect LINE OA',
      action: { kind: 'nav', label: 'LINE Settings', tab: 'settings', section: 'line-credentials' },
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
      action: { kind: 'nav', label: 'Payment Settings', tab: 'settings', section: 'payment-promptpay' },
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

  const bgOpen = isDark 
    ? 'bg-[#161925] border border-[#00b900]/30 shadow-[0_12px_40px_rgba(0,185,0,0.22)]' 
    : 'bg-white border-2 border-[#00b900]/50 shadow-[0_12px_40px_rgba(0,185,0,0.35)]';

  const bgCollapsed = isDark
    ? 'bg-[#161925] border border-[#00b900]/35 shadow-[0_8px_32px_rgba(0,185,0,0.2)] hover:shadow-[0_8px_32px_rgba(0,185,0,0.35)] hover:scale-[1.02]'
    : 'bg-white border-2 border-[#00b900]/50 shadow-[0_8px_32px_rgba(0,185,0,0.30)] hover:shadow-[0_8px_40px_rgba(0,185,0,0.50)] hover:scale-[1.02]';

  const text   = isDark ? 'text-white' : 'text-slate-900';
  const muted  = isDark ? 'text-[#8b92ad]' : 'text-slate-500';
  const deep   = isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100';
  const border = isDark ? 'border-[#1f2335]' : 'border-slate-200';

  const getStyle = (): React.CSSProperties => {
    if (pos) {
      return {
        position: 'fixed', left: pos.x, top: pos.y,
        transition: 'none', zIndex: 9999,
        pointerEvents: 'none',
        alignItems: corner.includes('l') ? 'flex-start' : 'flex-end',
      };
    }
    const s: React.CSSProperties = { position: 'fixed', zIndex: 50, transition: 'all 0.3s ease-out' };
    const margin = 20;
    if (corner.includes('t')) s.top = 76; // Offset top coordinates by 76px to stay cleanly below the top navbar
    else s.bottom = nudgeUp ? margin + 70 : margin;
    if (corner.includes('l')) { s.left = margin; s.alignItems = 'flex-start'; }
    else { s.right = margin; s.alignItems = 'flex-end'; }
    return s;
  };

  return (
    <div
      className={`flex flex-col gap-2 pointer-events-none ${isDragging ? 'opacity-80' : ''}`}
      style={getStyle()}
    >

      {/* ── Expanded panel ── */}
      {open && (
        <div className={`rounded-2xl w-72 overflow-hidden pointer-events-auto ${bgOpen}`}>

          {/* Header */}
          <div 
            className={`flex items-center justify-between px-4 py-3 border-b ${border} cursor-move`}
            onPointerDown={(e) => onPointerDown(e, true)}
          >
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
      {!open && (
        <div
          onPointerDown={(e) => onPointerDown(e, false)}
          className={`flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl transition-all pointer-events-auto ${bgCollapsed} active:scale-[0.98] cursor-pointer`}
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
        </div>
      )}
      {/* ── Custom Dismiss Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200 pointer-events-auto">
          <div 
            className={`max-w-xl w-full rounded-[36px] p-9 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200 ${
              isDark ? 'bg-[#161925] border border-[#1f2335] text-white' : 'bg-white border border-slate-100 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <h4 className="text-xl font-bold tracking-tight">Dismiss Setup Guide?</h4>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-[#8b92ad]' : 'text-slate-500'}`}>
                  Caution: Dismissing this setup guide will hide the helpful checklist widget. You can re-enable it anytime in your Settings page. Do you want to hide it now?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all ${
                  isDark 
                    ? 'bg-[#1a1d2e] text-[#8b92ad] hover:bg-white/5 hover:text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDismiss}
                className="px-6 py-3 rounded-2xl text-xs font-bold bg-[#00b900] text-white hover:bg-[#00a300] shadow-md shadow-[#00b900]/10 transition-all active:scale-95"
              >
                Yes, Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

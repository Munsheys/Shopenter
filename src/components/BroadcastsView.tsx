'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Megaphone, Zap, Clock, MessageSquare, Hand, LayoutGrid,
  Plus, Trash2, Edit2, Check, X, AlertTriangle,
  RefreshCw, Send, Pause, Play, Ban, Loader2, ExternalLink,
  Image as ImageIcon, Video, Music, Smile, Type, Info, Upload, Link,
} from 'lucide-react';

interface BroadcastsViewProps {
  theme?: 'light' | 'dark';
  t: any;
  accentColor?: string;
  onLimitHit?: (feature: string, limit?: number, current?: number) => void;
}

interface LineBlock {
  type: 'text' | 'image' | 'video' | 'audio' | 'sticker';
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  duration?: number;
  packageId?: string;
  stickerId?: string;
}

interface Campaign {
  _id: string;
  name: string;
  deliveryMode: 'instant' | 'queued';
  messages: LineBlock[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  audience?: string;
  recipientCount?: number;
  sentAt?: string;
  validUntil?: string;
  deliveredTo?: string[];
  totalTargeted?: number;
  attributedOrders?: number;
  attributedRevenue?: number;
  createdAt: string;
}

interface AutoReplyRule {
  _id: string;
  keyword: string;
  matchType: 'exact' | 'contains' | 'starts_with' | 'default';
  messages: LineBlock[];
  isActive: boolean;
  priority: number;
  lastTriggeredAt?: string;
}

interface LineStatus {
  configured: boolean;
  valid?: boolean;
  error?: string;
  bot?: { displayName: string; basicId: string; pictureUrl?: string; chatMode: string };
  tier?: 'unverified' | 'verified' | 'premium';
  quota?: { type: string; value?: number };
  consumption?: { totalUsage: number };
  capabilities?: { followerSync: boolean; narrowcastAdvanced: boolean; unlimitedMessages: boolean };
}

interface RichMenu {
  richMenuId: string;
  name: string;
  chatBarText: string;
  size: { width: number; height: number };
}

const DK = {
  bg: 'bg-[#0f1117]',
  surface: 'bg-[#161925] border border-[#1f2335]',
  surfaceDeep: 'bg-[#1a1d2e]',
  border: 'border-[#1f2335]',
  text: 'text-white',
  muted: 'text-[#8b92ad]',
  input: 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad] focus:border-accent focus:outline-none',
};
const LK = {
  bg: 'bg-slate-50',
  surface: 'bg-white border border-slate-200',
  surfaceDeep: 'bg-slate-50',
  border: 'border-slate-200',
  text: 'text-slate-900',
  muted: 'text-slate-500',
  input: 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-accent focus:outline-none',
};

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  unverified: { label: 'Unverified OA', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  verified:   { label: 'Verified OA',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  premium:    { label: 'Premium OA',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

function getLinePlanLabel(tier: string | undefined, quota: LineStatus['quota']): string {
  if (tier === 'premium' || quota?.type === 'none') return 'Unlimited';
  const v = quota?.value;
  if (!v || v <= 500)   return 'Free';
  if (v <= 15000) return 'Light';
  return 'Standard';
}

function getLinePlanColor(plan: string): string {
  if (plan === 'Unlimited') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (plan === 'Light')     return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (plan === 'Standard')  return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

const AUDIENCE_LABELS: Record<string, string> = {
  all:           'All customers',
  active_30d:    'Active last 30 days',
  active_60d:    'Active last 60 days',
  ordered:       'Ordered at least once',
  never_ordered: 'Never ordered',
  high_value:    'High value (฿5,000+ spent)',
};

// ── Upload zone (drag-and-drop + click) ──────────────────────────────────────

function UploadZone({
  accept, maxMB, value, onUploaded, isDark, previewType = 'image',
}: {
  accept: string; maxMB: number; value?: string;
  onUploaded: (url: string, duration?: number) => void;
  isDark: boolean; previewType?: 'image' | 'audio' | 'video';
}) {
  const k = isDark ? DK : LK;
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > maxMB * 1024 * 1024) { setErr(`Max ${maxMB} MB allowed.`); return; }
    setUploading(true); setErr('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        // For audio, estimate duration from file size (rough: ~128kbps)
        const duration = previewType === 'audio' ? Math.round((file.size / 16000) * 1000) : undefined;
        onUploaded(data.url, duration);
      } else {
        setErr(data.error ?? 'Upload failed');
      }
    } catch { setErr('Upload failed. Check your connection.'); }
    setUploading(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  if (value) {
    return (
      <div className="space-y-2">
        {previewType === 'image' && (
          <img src={value} alt="" className="w-full max-h-48 object-cover rounded-xl border border-white/10" onError={e => (e.currentTarget.style.display = 'none')} />
        )}
        {previewType === 'audio' && (
          <audio src={value} controls className="w-full h-10" />
        )}
        {previewType === 'video' && (
          <video src={value} controls className="w-full max-h-48 rounded-xl border border-white/10" />
        )}
        <button
          onClick={() => onUploaded('')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}
        >
          <Upload size={11} /> Replace file
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none ${
          dragging
            ? 'border-accent bg-accent/5'
            : isDark ? 'border-[#1f2335] hover:border-accent/50 hover:bg-accent/5' : 'border-slate-200 hover:border-accent/50 hover:bg-accent/5'
        }`}
      >
        {uploading ? (
          <Loader2 size={24} className="animate-spin text-accent" />
        ) : (
          <>
            <Upload size={22} className={isDark ? 'text-[#8b92ad]' : 'text-slate-400'} />
            <div className="text-center">
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>Drop file here or <span className="text-accent">browse</span></p>
              <p className={`text-xs mt-0.5 ${k.muted}`}>Max {maxMB} MB</p>
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </div>
      {err && <p className="text-xs text-red-400 mt-1.5">{err}</p>}
    </div>
  );
}

// ── Message block composer ────────────────────────────────────────────────────

function BlockComposer({ blocks, onChange, isDark }: { blocks: LineBlock[]; onChange: (b: LineBlock[]) => void; isDark: boolean }) {
  const k = isDark ? DK : LK;
  // Per-block: track whether user wants to paste a URL instead of uploading
  const [urlMode, setUrlMode] = useState<Record<number, boolean>>({});

  function update(i: number, patch: Partial<LineBlock>) {
    onChange(blocks.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  }
  function remove(i: number) {
    onChange(blocks.filter((_, idx) => idx !== i));
    setUrlMode(m => { const n = { ...m }; delete n[i]; return n; });
  }
  function add(type: LineBlock['type']) {
    if (blocks.length >= 5) return;
    onChange([...blocks, { type }]);
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className={`rounded-xl p-4 ${isDark ? 'bg-[#1a1d2e] border border-[#1f2335]' : 'bg-slate-50 border border-slate-200'}`}>
          {/* Block header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-widest ${k.muted}`}>{block.type}</span>
              {(block.type === 'image' || block.type === 'audio' || block.type === 'video') && (
                <button
                  onClick={() => setUrlMode(m => ({ ...m, [i]: !m[i] }))}
                  className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${urlMode[i] ? 'border-accent/40 text-accent' : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-400 hover:text-slate-700'}`}
                >
                  <Link size={9} /> {urlMode[i] ? 'Using URL' : 'Paste URL instead'}
                </button>
              )}
            </div>
            <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300 transition-colors p-0.5"><X size={14} /></button>
          </div>

          {/* Text */}
          {block.type === 'text' && (
            <textarea
              value={block.text ?? ''}
              onChange={e => update(i, { text: e.target.value })}
              placeholder="Type your message here…"
              rows={3}
              className={`w-full rounded-lg px-3 py-2 text-sm border resize-none ${k.input}`}
            />
          )}

          {/* Image */}
          {block.type === 'image' && (
            urlMode[i] ? (
              <div className="space-y-2">
                <input type="url" value={block.originalContentUrl ?? ''} onChange={e => update(i, { originalContentUrl: e.target.value, previewImageUrl: e.target.value })} placeholder="https://example.com/image.jpg" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
                {block.originalContentUrl && <img src={block.originalContentUrl} alt="" className="w-full max-h-40 object-cover rounded-xl" onError={e => (e.currentTarget.style.display = 'none')} />}
              </div>
            ) : (
              <UploadZone accept="image/jpeg,image/png,image/gif,image/webp" maxMB={1} value={block.originalContentUrl} onUploaded={url => update(i, { originalContentUrl: url, previewImageUrl: url })} isDark={isDark} previewType="image" />
            )
          )}

          {/* Video — drag-and-drop or URL */}
          {block.type === 'video' && (
            urlMode[i] ? (
              <div className="space-y-2">
                <input type="url" value={block.originalContentUrl ?? ''} onChange={e => update(i, { originalContentUrl: e.target.value })} placeholder="https://example.com/video.mp4" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
                <input type="url" value={block.previewImageUrl ?? ''} onChange={e => update(i, { previewImageUrl: e.target.value })} placeholder="Thumbnail image URL (required by LINE)" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
              </div>
            ) : (
              <div className="space-y-3">
                <UploadZone accept="video/mp4,video/quicktime" maxMB={200} value={block.originalContentUrl} onUploaded={url => update(i, { originalContentUrl: url })} isDark={isDark} previewType="video" />
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-widest mb-1.5 ${k.muted}`}>Thumbnail (required by LINE)</p>
                  <UploadZone accept="image/jpeg,image/png,image/webp" maxMB={1} value={block.previewImageUrl} onUploaded={url => update(i, { previewImageUrl: url })} isDark={isDark} previewType="image" />
                </div>
              </div>
            )
          )}

          {/* Audio */}
          {block.type === 'audio' && (
            urlMode[i] ? (
              <div className="space-y-2">
                <input type="url" value={block.originalContentUrl ?? ''} onChange={e => update(i, { originalContentUrl: e.target.value })} placeholder="https://example.com/audio.m4a" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
              </div>
            ) : (
              <UploadZone accept="audio/mpeg,audio/mp4,audio/m4a,audio/aac,audio/wav,audio/ogg" maxMB={1} value={block.originalContentUrl} onUploaded={(url, dur) => update(i, { originalContentUrl: url, duration: dur })} isDark={isDark} previewType="audio" />
            )
          )}

          {/* Sticker */}
          {block.type === 'sticker' && (
            <div className="space-y-2">
              <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-[#0f1117]' : 'bg-slate-100'}`}>
                <Info size={12} className={`${k.muted} mt-0.5 flex-shrink-0`} />
                <p className={`text-xs ${k.muted}`}>Find Package ID and Sticker ID at <a href="https://developers.line.biz/en/docs/messaging-api/sticker-list/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">LINE sticker list ↗</a></p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={block.packageId ?? ''} onChange={e => update(i, { packageId: e.target.value })} placeholder="Package ID e.g. 1" className={`rounded-lg px-3 py-2 text-sm border ${k.input}`} />
                <input type="text" value={block.stickerId ?? ''} onChange={e => update(i, { stickerId: e.target.value })} placeholder="Sticker ID e.g. 1" className={`rounded-lg px-3 py-2 text-sm border ${k.input}`} />
              </div>
            </div>
          )}
        </div>
      ))}

      {blocks.length < 5 && (
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { type: 'text' as const, icon: <Type size={12} />, label: 'Text' },
            { type: 'image' as const, icon: <ImageIcon size={12} />, label: 'Image' },
            { type: 'video' as const, icon: <Video size={12} />, label: 'Video' },
            { type: 'audio' as const, icon: <Music size={12} />, label: 'Audio' },
            { type: 'sticker' as const, icon: <Smile size={12} />, label: 'Sticker' },
          ].map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => add(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-accent/50' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:border-accent/50'}`}
            >
              {icon} + {label}
            </button>
          ))}
          <span className={`text-xs ${isDark ? 'text-[#8b92ad]' : 'text-slate-400'}`}>{blocks.length}/5 blocks</span>
        </div>
      )}
    </div>
  );
}

// ── Capability chip ───────────────────────────────────────────────────────────

function CapChip({ label, ok, lockedReason }: { label: string; ok: boolean; lockedReason?: string }) {
  return (
    <span title={ok ? undefined : lockedReason} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
      {ok ? <Check size={10} /> : <X size={10} />} {label}
    </span>
  );
}

// ── Status bar ────────────────────────────────────────────────────────────────

function StatusBar({ status, onSync, isDark }: { status: LineStatus | null; onSync: () => void; isDark: boolean }) {
  const k = isDark ? DK : LK;

  if (!status) return (
    <div className={`rounded-2xl p-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'} flex items-center gap-3`}>
      <Loader2 size={18} className="animate-spin text-accent" />
      <span className={`text-sm ${k.muted}`}>Checking LINE account status…</span>
    </div>
  );

  if (!status.configured) return (
    <div className={`rounded-2xl p-5 ${isDark ? 'bg-[#161925] border border-amber-500/20' : 'bg-amber-50 border border-amber-200'} flex items-start gap-3`}>
      <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>LINE channel not configured</p>
        <p className={`text-xs mt-0.5 ${k.muted}`}>Add your LINE Channel Access Token in Settings to enable all broadcast features.</p>
      </div>
    </div>
  );

  if (!status.valid) return (
    <div className={`rounded-2xl p-5 ${isDark ? 'bg-[#161925] border border-red-500/20' : 'bg-red-50 border border-red-200'} flex items-start gap-3`}>
      <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Invalid LINE access token</p>
        <p className={`text-xs mt-0.5 ${k.muted}`}>{status.error}</p>
      </div>
    </div>
  );

  const tier = status.tier ?? 'unverified';
  const badge = TIER_BADGE[tier];
  const used = status.consumption?.totalUsage ?? 0;
  const limit = status.quota?.value ?? 0;
  const unlimited = status.quota?.type === 'none';
  const pct = unlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = unlimited ? Infinity : limit - used;
  const caps = status.capabilities;

  return (
    <div className={`rounded-2xl p-5 space-y-4 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {status.bot?.pictureUrl && <img src={status.bot.pictureUrl} className="w-9 h-9 rounded-full ring-2 ring-accent/30" alt="" />}
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{status.bot?.displayName}</p>
            <p className={`text-xs ${k.muted}`}>{status.bot?.basicId}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
          {(() => { const pl = getLinePlanLabel(status.tier, status.quota); return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getLinePlanColor(pl)}`}>{pl}</span>; })()}
          {status.bot?.chatMode === 'chat' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Chat mode — auto-reply paused</span>
          )}
        </div>
        {caps?.followerSync && (
          <button onClick={onSync} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors">
            <RefreshCw size={12} /> Sync Followers
          </button>
        )}
      </div>

      {!unlimited && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-medium ${k.muted}`}>Monthly messages</span>
            <span className={`text-xs font-semibold ${pct > 85 ? 'text-red-400' : pct > 60 ? 'text-amber-400' : 'text-accent'}`}>
              {used.toLocaleString()} / {limit.toLocaleString()} used · {remaining.toLocaleString()} remaining
            </span>
          </div>
          <div className={`h-2 rounded-full ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100'}`}>
            <div
              className={`h-2 rounded-full transition-all ${pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-accent'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      {unlimited && (
        <p className="text-xs text-emerald-400 font-medium">✦ Unlimited messages — Premium OA</p>
      )}

      <div className="flex flex-wrap gap-2">
        <CapChip label="Broadcast" ok={true} />
        <CapChip label="Queued Campaign" ok={true} />
        <CapChip label="Auto-Reply" ok={true} />
        <CapChip label="Rich Menu" ok={true} />
        <CapChip label="Follower Sync" ok={caps?.followerSync ?? false} lockedReason="Requires Verified OA or above" />
        <CapChip label="Unlimited Messages" ok={caps?.unlimitedMessages ?? false} lockedReason="Requires Premium OA" />
      </div>

      {tier === 'unverified' && (
        <div className={`flex items-start gap-2 pt-2 border-t ${k.border}`}>
          <Info size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className={`text-xs ${k.muted}`}>
            Some features are locked because your LINE OA is unverified. Apply for verification in the{' '}
            <a href="https://manager.line.biz" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">LINE Official Account Manager <ExternalLink size={10} /></a>.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Rich Menu helpers ─────────────────────────────────────────────────────────

interface RmButton {
  label: string;
  action: {
    type: string;
    uri?: string;
    text?: string;
    data?: string;
    displayText?: string;
    mode?: string;
    richMenuAliasId?: string;
    clipboardText?: string;
  };
}

const RM_TEMPLATES: Record<'large' | 'compact', { id: string; label: string; count: number }[]> = {
  large: [
    { id: '2col', label: '2 Wide', count: 2 },
    { id: '3col', label: '3 Wide', count: 3 },
    { id: '6grid', label: '6 Grid', count: 6 },
    { id: '1big+2', label: '1 + 2', count: 3 },
    { id: '2row', label: '2 Tall', count: 2 },
  ],
  compact: [
    { id: '2col', label: '2 Wide', count: 2 },
    { id: '3col', label: '3 Wide', count: 3 },
    { id: '6grid', label: '6 Grid', count: 6 },
  ],
};

const ACTION_LABELS: Record<string, string> = {
  uri: 'Open URL',
  message: 'Send Text',
  postback: 'Postback',
  datetimepicker: 'Date/Time Picker',
  richmenuswitch: 'Switch Tab',
  clipboard: 'Copy Text',
  location: 'Open Location',
  camera: 'Open Camera',
  cameraRoll: 'Camera Roll',
};

function defaultRmButtons(count: number): RmButton[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `Button ${i + 1}`,
    action: { type: 'uri', uri: 'https://' },
  }));
}

function LayoutPreview({ template, size, active, isDark, accentColor = '#00b900' }: { template: string; size: 'large' | 'compact'; active: boolean; isDark: boolean; accentColor?: string }) {
  const W = 60, H = size === 'large' ? 36 : 22;
  const cellFill = active ? accentColor + '2e' : isDark ? 'rgba(26,29,46,0.9)' : 'rgba(241,245,249,1)';
  const strokeCol = active ? accentColor : isDark ? '#2d3555' : '#cbd5e1';
  const hw2 = Math.floor(W / 2), tw = Math.floor(W / 3), hh = Math.floor(H / 2);

  let rects: [number, number, number, number][] = [];
  switch (template) {
    case '2col':   rects = [[0,0,hw2-1,H],[hw2,0,W-hw2,H]]; break;
    case '3col':   rects = [[0,0,tw-1,H],[tw,0,tw-1,H],[tw*2,0,W-tw*2,H]]; break;
    case '6grid':  rects = [[0,0,tw-1,hh-1],[tw,0,tw-1,hh-1],[tw*2,0,W-tw*2,hh-1],[0,hh,tw-1,H-hh],[tw,hh,tw-1,H-hh],[tw*2,hh,W-tw*2,H-hh]]; break;
    case '1big+2': rects = [[0,0,hw2-1,H],[hw2,0,W-hw2,hh-1],[hw2,hh,W-hw2,H-hh]]; break;
    case '2row':   rects = [[0,0,W,hh-1],[0,hh,W,H-hh]]; break;
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={cellFill} stroke={strokeCol} strokeWidth="1.5" rx="2" />
      ))}
    </svg>
  );
}

function RmButtonEditor({ index, btn, onChange, isDark, k }: {
  index: number; btn: RmButton;
  onChange: (b: RmButton) => void;
  isDark: boolean; k: typeof DK;
}) {
  function setAction(patch: Partial<RmButton['action']>) {
    onChange({ ...btn, action: { ...btn.action, ...patch } });
  }
  function setType(type: string) {
    onChange({ ...btn, action: { type } });
  }
  return (
    <div className={`rounded-xl p-3 space-y-2 ${isDark ? 'bg-[#1a1d2e] border border-[#1f2335]' : 'bg-slate-50 border border-slate-200'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-widest ${k.muted}`}>Button {index + 1}</p>
      <select value={btn.action.type} onChange={e => setType(e.target.value)} className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`}>
        {Object.entries(ACTION_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
      {btn.action.type === 'uri' && (
        <input type="url" value={btn.action.uri ?? ''} onChange={e => setAction({ uri: e.target.value })} placeholder="https://your-url.com" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
      )}
      {btn.action.type === 'message' && (
        <input type="text" value={btn.action.text ?? ''} onChange={e => setAction({ text: e.target.value })} placeholder="Message text" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
      )}
      {btn.action.type === 'postback' && (
        <div className="space-y-2">
          <input type="text" value={btn.action.data ?? ''} onChange={e => setAction({ data: e.target.value })} placeholder="Postback data (e.g. action=order)" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
          <input type="text" value={btn.action.displayText ?? ''} onChange={e => setAction({ displayText: e.target.value })} placeholder="Display text in chat (optional)" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
        </div>
      )}
      {btn.action.type === 'datetimepicker' && (
        <div className="space-y-2">
          <input type="text" value={btn.action.data ?? ''} onChange={e => setAction({ data: e.target.value })} placeholder="Postback data" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
          <select value={btn.action.mode ?? 'date'} onChange={e => setAction({ mode: e.target.value })} className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`}>
            <option value="date">Date only</option>
            <option value="time">Time only</option>
            <option value="datetime">Date &amp; Time</option>
          </select>
        </div>
      )}
      {btn.action.type === 'richmenuswitch' && (
        <input type="text" value={btn.action.richMenuAliasId ?? ''} onChange={e => setAction({ richMenuAliasId: e.target.value })} placeholder="Rich menu alias ID" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
      )}
      {btn.action.type === 'clipboard' && (
        <input type="text" value={btn.action.clipboardText ?? ''} onChange={e => setAction({ clipboardText: e.target.value })} placeholder="Text to copy to clipboard" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
      )}
      {['location', 'camera', 'cameraRoll'].includes(btn.action.type) && (
        <p className={`text-xs px-2 py-1.5 rounded-lg ${isDark ? 'bg-[#0f1117]' : 'bg-slate-100'} ${k.muted}`}>No additional setup needed.</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BroadcastsView({ theme, accentColor = '#00b900', onLimitHit }: BroadcastsViewProps) {
  const isDark = theme === 'dark';
  const k = isDark ? DK : LK;

  const [section, setSection] = useState<'campaigns' | 'auto-reply' | 'greeting' | 'rich-menu'>('campaigns');
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [greeting, setGreeting] = useState<{ greetingEnabled: boolean; greetingMessages: LineBlock[] }>({ greetingEnabled: false, greetingMessages: [] });
  const [richMenus, setRichMenus] = useState<RichMenu[]>([]);
  const [defaultRichMenuId, setDefaultRichMenuId] = useState<string | null>(null);

  // Broadcast form
  const [bAudience, setBAudience] = useState('all');
  const [bMessages, setBMessages] = useState<LineBlock[]>([{ type: 'text', text: '' }]);
  const [bName, setBName] = useState('');
  const [bSending, setBSending] = useState(false);
  const [bResult, setBResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  // Queued campaign form
  const [qMessages, setQMessages] = useState<LineBlock[]>([{ type: 'text', text: '' }]);
  const [qName, setQName] = useState('');
  const [qDays, setQDays] = useState(7);
  const [qCreating, setQCreating] = useState(false);
  const [showQueuedForm, setShowQueuedForm] = useState(false);

  // Auto-reply form
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const [rKeyword, setRKeyword] = useState('');
  const [rMatchType, setRMatchType] = useState<AutoReplyRule['matchType']>('contains');
  const [rMessages, setRMessages] = useState<LineBlock[]>([{ type: 'text', text: '' }]);
  const [rSaving, setRSaving] = useState(false);

  // Rich menu form
  const [rmSize, setRmSize] = useState<'large' | 'compact'>('large');
  const [rmTemplate, setRmTemplate] = useState('3col');
  const [rmChatBarText, setRmChatBarText] = useState('Menu');
  const [rmShowChatBar, setRmShowChatBar] = useState(true);
  const [rmSelected, setRmSelected] = useState(false);
  const [rmImageUrl, setRmImageUrl] = useState('');
  const [rmButtons, setRmButtons] = useState<RmButton[]>(defaultRmButtons(3));
  const [rmSaving, setRmSaving] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total: number; synced: number } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/line-status');
      if (res.ok) setLineStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) setCampaigns(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/auto-reply');
      if (res.ok) setRules(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadGreeting = useCallback(async () => {
    try {
      const res = await fetch('/api/greeting');
      if (res.ok) setGreeting(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadRichMenus = useCallback(async () => {
    try {
      const res = await fetch('/api/rich-menu');
      if (res.ok) {
        const data = await res.json();
        setRichMenus(data.richmenus ?? []);
        setDefaultRichMenuId(data.defaultRichMenuId ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadStatus();
    loadCampaigns();
    loadRules();
    loadGreeting();
    loadRichMenus();
  }, [loadStatus, loadCampaigns, loadRules, loadGreeting, loadRichMenus]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync/followers', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setSyncResult(data);
    } catch { /* ignore */ }
    finally { setSyncing(false); }
  }

  async function handleInstantSend() {
    if (bMessages.every(b => !b.text && !b.originalContentUrl && !b.packageId)) return;
    setBSending(true);
    setBResult(null);
    try {
      const res = await fetch('/api/broadcasts/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: bMessages, audience: bAudience, name: bName }),
      });
      const data = await res.json();
      if (res.ok) {
        setBResult(data);
        await loadCampaigns();
      }
    } catch { /* ignore */ }
    finally { setBSending(false); }
  }

  async function handleCreateQueued() {
    if (qMessages.every(b => !b.text && !b.originalContentUrl)) return;
    setQCreating(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: qMessages, name: qName, durationDays: qDays }),
      });
      if (res.ok) {
        setShowQueuedForm(false);
        setQMessages([{ type: 'text', text: '' }]);
        setQName('');
        await loadCampaigns();
      } else {
        const err = await res.json().catch(() => ({}));
        if (err?.error === 'TIER_LIMIT_REACHED') onLimitHit?.(err.feature, err.limit, err.current);
      }
    } catch { /* ignore */ }
    finally { setQCreating(false); }
  }

  async function handleCampaignStatus(id: string, status: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadCampaigns();
  }

  function openNewRule() {
    setEditingRule(null);
    setRKeyword('');
    setRMatchType('contains');
    setRMessages([{ type: 'text', text: '' }]);
    setShowRuleModal(true);
  }

  function openEditRule(rule: AutoReplyRule) {
    setEditingRule(rule);
    setRKeyword(rule.keyword);
    setRMatchType(rule.matchType);
    setRMessages(rule.messages.length > 0 ? rule.messages : [{ type: 'text', text: '' }]);
    setShowRuleModal(true);
  }

  async function handleSaveRule() {
    if (!rKeyword.trim() || rMessages.every(b => !b.text && !b.originalContentUrl)) return;
    setRSaving(true);
    try {
      if (editingRule) {
        await fetch(`/api/auto-reply/${editingRule._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: rKeyword, matchType: rMatchType, messages: rMessages }),
        });
      } else {
        const res = await fetch('/api/auto-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: rKeyword, matchType: rMatchType, messages: rMessages }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (err?.error === 'TIER_LIMIT_REACHED') { onLimitHit?.(err.feature, err.limit, err.current); return; }
        }
      }
      setShowRuleModal(false);
      await loadRules();
    } catch { /* ignore */ }
    finally { setRSaving(false); }
  }

  async function handleToggleRule(rule: AutoReplyRule) {
    await fetch(`/api/auto-reply/${rule._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    await loadRules();
  }

  async function handleDeleteRule(id: string) {
    await fetch(`/api/auto-reply/${id}`, { method: 'DELETE' });
    await loadRules();
  }

  async function handleSaveGreeting() {
    await fetch('/api/greeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(greeting),
    });
  }

  async function handlePublishRichMenu() {
    setRmSaving(true);
    try {
      await fetch('/api/rich-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: rmSize,
          template: rmTemplate,
          chatBarText: rmShowChatBar ? rmChatBarText : '',
          imageUrl: rmImageUrl,
          buttons: rmButtons,
          selected: rmSelected,
          setAsDefault: true,
        }),
      });
      await loadRichMenus();
    } catch { /* ignore */ }
    finally { setRmSaving(false); }
  }

  async function handleDeleteRichMenu(id: string) {
    await fetch(`/api/rich-menu?id=${id}`, { method: 'DELETE' });
    await loadRichMenus();
  }

  const activeCampaign = campaigns.find(c => c.deliveryMode === 'queued' && (c.status === 'active' || c.status === 'paused'));
  const instantHistory = campaigns.filter(c => c.deliveryMode === 'instant');
  const queuedHistory = campaigns.filter(c => c.deliveryMode === 'queued' && c.status !== 'active' && c.status !== 'paused');

  const remaining = lineStatus?.quota?.type === 'none' ? Infinity : (lineStatus?.quota?.value ?? 0) - (lineStatus?.consumption?.totalUsage ?? 0);

  const SECTIONS = [
    { id: 'campaigns', label: 'Campaigns', icon: <Megaphone size={14} /> },
    { id: 'auto-reply', label: 'Auto-Reply', icon: <MessageSquare size={14} /> },
    { id: 'greeting', label: 'Greeting', icon: <Hand size={14} /> },
    { id: 'rich-menu', label: 'Rich Menu', icon: <LayoutGrid size={14} /> },
  ] as const;

  return (
    <div className={`flex-1 overflow-y-auto ${k.bg} p-6 space-y-6`}>
      {/* Status bar */}
      <StatusBar
        status={lineStatus}
        onSync={syncing ? () => {} : handleSync}
        isDark={isDark}
      />

      {syncing && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
          <Loader2 size={14} className="animate-spin text-accent" />
          <span className={`text-sm ${k.muted}`}>Syncing followers from LINE…</span>
        </div>
      )}
      {syncResult && (
        <div className="rounded-xl px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span className="text-sm text-emerald-400">Synced {syncResult.synced} of {syncResult.total} followers into your customer list.</span>
        </div>
      )}

      {/* Section tabs */}
      <div className={`flex items-center gap-1 p-1 rounded-xl ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-slate-100'}`}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              section === s.id
                ? 'bg-accent text-white shadow-sm'
                : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {s.icon}{s.label}
          </button>
        ))}
      </div>

      {/* ── Campaigns ── */}
      {section === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Instant broadcast */}
          <div className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-accent" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${k.text}`}>Instant Broadcast</p>
                <p className={`text-xs ${k.muted}`}>Sends immediately via multicast — uses your monthly quota</p>
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Audience</label>
              <div className="space-y-1.5">
                {Object.entries(AUDIENCE_LABELS).map(([val, label]) => (
                  <label key={val} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${bAudience === val ? 'bg-accent/10 border border-accent/30' : isDark ? 'border border-[#1f2335] hover:border-[#2d3555]' : 'border border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="audience" value={val} checked={bAudience === val} onChange={() => setBAudience(val)} className="accent-accent" />
                    <span className={`text-sm ${k.text}`}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {remaining !== Infinity && remaining < 100 && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-400">Only {remaining} messages remaining this month. Consider using a Queued Campaign instead.</p>
              </div>
            )}

            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Campaign Name (optional)</label>
              <input type="text" value={bName} onChange={e => setBName(e.target.value)} placeholder="e.g. May Flash Sale" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
            </div>

            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Message Content</label>
              <BlockComposer blocks={bMessages} onChange={setBMessages} isDark={isDark} />
            </div>

            {bResult && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Check size={13} className="text-emerald-400" />
                <span className="text-xs text-emerald-400">Sent to {bResult.sent} customers{bResult.failed > 0 ? `, ${bResult.failed} failed` : ''}.</span>
              </div>
            )}

            <button
              onClick={handleInstantSend}
              disabled={bSending || bMessages.every(b => !b.text && !b.originalContentUrl && !b.packageId)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {bSending ? 'Sending…' : 'Send Now'}
            </button>
          </div>

          {/* Queued campaign */}
          <div className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-blue-400" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${k.text}`}>Queued Campaign</p>
                <p className={`text-xs ${k.muted}`}>Delivered free via reply tokens as customers message your bot</p>
              </div>
            </div>

            {activeCampaign ? (
              <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e] border border-[#1f2335]' : 'bg-slate-50 border border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-semibold ${k.text}`}>{activeCampaign.name || 'Untitled Campaign'}</p>
                    <p className={`text-xs ${k.muted}`}>
                      Expires {activeCampaign.validUntil ? new Date(activeCampaign.validUntil).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${activeCampaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {activeCampaign.status}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={k.muted}>Delivered</span>
                    <span className={`font-medium ${k.text}`}>{activeCampaign.deliveredTo?.length ?? 0} / {activeCampaign.totalTargeted ?? '—'}</span>
                  </div>
                  <div className={`h-2 rounded-full ${isDark ? 'bg-[#0f1117]' : 'bg-slate-200'}`}>
                    <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${activeCampaign.totalTargeted ? Math.min(((activeCampaign.deliveredTo?.length ?? 0) / activeCampaign.totalTargeted) * 100, 100) : 0}%` }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCampaignStatus(activeCampaign._id, activeCampaign.status === 'active' ? 'paused' : 'active')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}
                  >
                    {activeCampaign.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                    {activeCampaign.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleCampaignStatus(activeCampaign._id, 'cancelled')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Ban size={12} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              !showQueuedForm && (
                <button
                  onClick={() => setShowQueuedForm(true)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:border-accent/40 hover:text-white' : 'border-slate-200 text-slate-500 hover:border-accent/40 hover:text-slate-900'}`}
                >
                  <Plus size={15} /> New Campaign
                </button>
              )
            )}

            {showQueuedForm && !activeCampaign && (
              <div className="space-y-4">
                <input type="text" value={qName} onChange={e => setQName(e.target.value)} placeholder="Campaign name (optional)" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
                <BlockComposer blocks={qMessages} onChange={setQMessages} isDark={isDark} />
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Valid for</label>
                  <div className="flex gap-2 flex-wrap">
                    {[3, 7, 14, 30].map(d => (
                      <button key={d} onClick={() => setQDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${qDays === d ? 'bg-accent text-white border-accent' : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}>{d} days</button>
                    ))}
                  </div>
                </div>
                <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                  <Info size={12} className={`${k.muted} mt-0.5 flex-shrink-0`} />
                  <p className={`text-xs ${k.muted}`}>Delivery is gradual — customers receive this message the next time they message your bot (free via reply token). Not suitable for time-sensitive campaigns.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateQueued} disabled={qCreating} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50">
                    {qCreating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Launch
                  </button>
                  <button onClick={() => setShowQueuedForm(false)} className={`px-4 py-2 rounded-xl text-sm border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500'}`}>Cancel</button>
                </div>
              </div>
            )}

            {/* History */}
            {[...instantHistory, ...queuedHistory].length > 0 && (
              <div className={`pt-4 border-t ${k.border}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${k.muted}`}>History</p>
                <div className="space-y-2">
                  {[...instantHistory, ...queuedHistory].slice(0, 5).map(c => (
                    <div key={c._id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${k.text}`}>{c.name || 'Untitled'}</p>
                        <p className={`text-[10px] ${k.muted}`}>
                          {c.deliveryMode === 'instant' ? `Sent to ${c.recipientCount ?? 0}` : `${c.deliveredTo?.length ?? 0}/${c.totalTargeted ?? 0} delivered`}
                          {c.deliveryMode === 'instant' && (c.attributedOrders ?? 0) > 0 && (
                            <span className="text-emerald-400"> · {c.attributedOrders} orders · ฿{(c.attributedRevenue ?? 0).toLocaleString()}</span>
                          )}
                          {' '}· {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${c.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : c.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Auto-Reply ── */}
      {section === 'auto-reply' && (
        <div className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${k.text}`}>Auto-Reply Rules</p>
              <p className={`text-xs ${k.muted}`}>Keyword-triggered replies sent free via reply token. Checked in priority order.</p>
            </div>
            <button onClick={openNewRule} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent transition-colors">
              <Plus size={14} /> Add Rule
            </button>
          </div>

          {lineStatus?.bot?.chatMode === 'chat' && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-400">Your LINE OA is in <strong>Chat mode</strong>. Auto-replies are suppressed while a human operator is responding. Switch to Bot mode in LINE OA Manager to enable them.</p>
            </div>
          )}

          {rules.length === 0 ? (
            <div className={`text-center py-12 ${k.muted}`}>
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No rules yet. Add your first keyword rule.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => (
                <div key={rule._id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e] border border-[#1f2335]' : 'bg-slate-50 border border-slate-200'}`}>
                  <button onClick={() => handleToggleRule(rule)} className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${rule.isActive ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${rule.isActive ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${k.text}`}>{rule.matchType === 'default' ? '⚡ Default reply' : `"${rule.keyword}"`}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDark ? 'border-[#1f2335] text-[#8b92ad]' : 'border-slate-200 text-slate-400'}`}>{rule.matchType}</span>
                      {rule.lastTriggeredAt && <span className={`text-[10px] ${k.muted}`}>Last triggered {new Date(rule.lastTriggeredAt).toLocaleDateString()}</span>}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${k.muted}`}>{rule.messages[0]?.text || rule.messages[0]?.type || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEditRule(rule)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteRule(rule._id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Greeting ── */}
      {section === 'greeting' && (
        <div className={`rounded-2xl p-6 space-y-5 max-w-2xl ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${k.text}`}>Greeting Message</p>
              <p className={`text-xs ${k.muted}`}>Sent automatically when a new customer follows your LINE OA. Uses the reply token — free.</p>
            </div>
            <button
              onClick={() => setGreeting(g => ({ ...g, greetingEnabled: !g.greetingEnabled }))}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${greeting.greetingEnabled ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${greeting.greetingEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {greeting.greetingEnabled && (
            <BlockComposer blocks={greeting.greetingMessages.length > 0 ? greeting.greetingMessages : [{ type: 'text', text: '' }]} onChange={msgs => setGreeting(g => ({ ...g, greetingMessages: msgs }))} isDark={isDark} />
          )}

          <button onClick={handleSaveGreeting} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent transition-colors">
            <Check size={14} /> Save Greeting
          </button>
        </div>
      )}

      {/* ── Rich Menu ── */}
      {section === 'rich-menu' && (
        <div className="space-y-6">
          {/* Published menus */}
          {richMenus.length > 0 && (
            <div className={`rounded-2xl p-6 space-y-4 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
              <p className={`text-sm font-semibold ${k.text}`}>Published Menus</p>
              {richMenus.map(menu => (
                <div key={menu.richMenuId} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e] border border-[#1f2335]' : 'bg-slate-50 border border-slate-200'}`}>
                  <div>
                    <p className={`text-sm font-medium ${k.text}`}>{menu.chatBarText || menu.name}</p>
                    <p className={`text-xs ${k.muted}`}>{menu.richMenuId}{menu.richMenuId === defaultRichMenuId && <span className="text-emerald-400 ml-1"> · Default</span>}</p>
                  </div>
                  <button onClick={() => handleDeleteRichMenu(menu.richMenuId)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Create new — 2-col layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: configuration */}
            <div className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
              <p className={`text-sm font-semibold ${k.text}`}>Create Rich Menu</p>

              {/* Size */}
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Menu Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['large', 'Large', '2500 × 1686 px'], ['compact', 'Compact', '2500 × 843 px']] as const).map(([val, label, sub]) => (
                    <button key={val}
                      onClick={() => { setRmSize(val); setRmTemplate('3col'); setRmButtons(defaultRmButtons(3)); }}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors text-left ${rmSize === val ? 'bg-accent text-white border-accent' : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}>
                      <p>{label}</p>
                      <p className={`text-[10px] mt-0.5 ${rmSize === val ? 'text-white/70' : k.muted}`}>{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout template gallery */}
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Layout Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {RM_TEMPLATES[rmSize].map(tpl => (
                    <button key={tpl.id}
                      onClick={() => { setRmTemplate(tpl.id); setRmButtons(defaultRmButtons(tpl.count)); }}
                      className={`py-2 px-2 rounded-xl text-[11px] font-medium border transition-colors flex flex-col items-center gap-2 ${rmTemplate === tpl.id ? 'border-accent bg-accent/10 text-accent' : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-[#2d3555]' : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                      <LayoutPreview template={tpl.id} size={rmSize} active={rmTemplate === tpl.id} isDark={isDark} accentColor={accentColor} />
                      <span>{tpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat bar text */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-[11px] font-semibold uppercase tracking-widest ${k.muted}`}>Chat Bar Text</label>
                  <button
                    onClick={() => setRmShowChatBar(v => !v)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${rmShowChatBar ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${rmShowChatBar ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
                {rmShowChatBar && (
                  <div className="relative">
                    <input type="text" value={rmChatBarText} onChange={e => setRmChatBarText(e.target.value.slice(0, 14))} placeholder="Open Menu" className={`w-full rounded-lg px-3 py-2 text-sm border pr-14 ${k.input}`} />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${rmChatBarText.length >= 14 ? 'text-red-400' : k.muted}`}>{rmChatBarText.length}/14</span>
                  </div>
                )}
              </div>

              {/* Auto-open */}
              <div className={`flex items-center justify-between py-3 border-t ${k.border}`}>
                <div>
                  <p className={`text-sm font-medium ${k.text}`}>Auto-open menu</p>
                  <p className={`text-xs ${k.muted}`}>Menu expands when user opens chat</p>
                </div>
                <button
                  onClick={() => setRmSelected(v => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${rmSelected ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${rmSelected ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Right: image + buttons + publish */}
            <div className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>

              {/* Background image */}
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-1 ${k.muted}`}>Background Image</label>
                <p className={`text-xs ${k.muted} mb-3`}>JPEG or PNG · max 1 MB · {rmSize === 'large' ? '2500×1686' : '2500×843'} px recommended</p>
                <UploadZone accept="image/jpeg,image/png" maxMB={1} value={rmImageUrl} onUploaded={url => setRmImageUrl(url)} isDark={isDark} previewType="image" />
              </div>

              {/* Button action editors */}
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-3 ${k.muted}`}>Button Actions · {rmButtons.length} area{rmButtons.length !== 1 ? 's' : ''}</label>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {rmButtons.map((btn, i) => (
                    <RmButtonEditor key={i} index={i} btn={btn} onChange={updated => setRmButtons(bs => bs.map((b, idx) => idx === i ? updated : b))} isDark={isDark} k={isDark ? DK : LK} />
                  ))}
                </div>
              </div>

              <button
                onClick={handlePublishRichMenu}
                disabled={rmSaving || !rmImageUrl}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {rmSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {rmSaving ? 'Publishing…' : 'Publish Rich Menu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-reply modal ── */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border}`}>
              <p className={`text-sm font-semibold ${k.text}`}>{editingRule ? 'Edit Rule' : 'New Auto-Reply Rule'}</p>
              <button onClick={() => setShowRuleModal(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-1.5 ${k.muted}`}>Match Type</label>
                  <select value={rMatchType} onChange={e => setRMatchType(e.target.value as any)} className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`}>
                    <option value="exact">Exact match</option>
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts with</option>
                    <option value="default">Default (fallback)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-1.5 ${k.muted}`}>Keyword</label>
                  <input type="text" value={rKeyword} onChange={e => setRKeyword(e.target.value)} disabled={rMatchType === 'default'} placeholder={rMatchType === 'default' ? '(matches anything)' : 'e.g. price, hello, order'} className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input} disabled:opacity-50`} />
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Reply Messages</label>
                <BlockComposer blocks={rMessages} onChange={setRMessages} isDark={isDark} />
              </div>
            </div>
            <div className={`flex gap-2 px-6 py-4 border-t ${k.border}`}>
              <button onClick={handleSaveRule} disabled={rSaving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50">
                {rSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Rule
              </button>
              <button onClick={() => setShowRuleModal(false)} className={`px-4 py-2 rounded-xl text-sm border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';
import { uploadMedia } from '@/lib/uploadMedia';
import {
  Megaphone, Zap, Clock, MessageSquare, Hand, LayoutGrid,
  Plus, Trash2, Edit2, Check, X, AlertTriangle,
  RefreshCw, Send, Pause, Play, Ban, Loader2, ExternalLink,
  Image as ImageIcon, Video, Smile, Type, Info, Upload, Link,
  Camera, Settings as SettingsIcon, Search, Wand2, Terminal,
  Keyboard, Globe, Bot, Command, PanelTop, MessageCircle,
  ChevronDown, ChevronRight,
} from 'lucide-react';

interface BroadcastsViewProps {
  theme?: 'light' | 'lite' | 'dark';
  t: any;
  accentColor?: string;
  onLimitHit?: (feature: string, limit?: number, current?: number) => void;
  onGoToSettings?: (section: string) => void;
}

interface LineBlock {
  type: 'text' | 'image' | 'video' | 'sticker';
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  duration?: number;
  packageId?: string;
  stickerId?: string;
}

interface PlatformStatus {
  line: boolean;
  telegram: boolean;
  instagram: boolean;
}

interface BroadcastResult {
  campaignId?: string;
  results: Record<string, { sent?: number; failed?: number; queued?: boolean; postId?: string; postType?: string; error?: string }>;
  total: number;
  platforms: string[];
  message?: string;
}

interface Campaign {
  _id: string;
  name: string;
  deliveryMode: 'instant' | 'queued';
  messages: LineBlock[];
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'sending' | 'failed';
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

// Uploads go straight from the browser to R2 (see uploadMedia()), so the only
// ceiling left is LINE's own limit on the media type.
const UPLOAD_LIMITS = {
  image: 10,
  video: 200,
};

const DK = {
  bg: 'bg-[#0f1117]',
  surface: 'bg-[#161925] border border-[#1f2335]',
  surfaceDeep: 'bg-[#1a1d2e]',
  border: 'border-[#1f2335]',
  text: 'text-white',
  muted: 'text-[#8b92ad]',
  input: 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad] focus:border-accent focus:outline-none',
};
const LITK = {
  bg: 'bg-[#d9dfe8]',
  surface: 'bg-[#e7ecf3] border border-[#cdd3dd]',
  surfaceDeep: 'bg-[#dce1ea]',
  border: 'border-[#cdd3dd]',
  text: 'text-[#2f3744]',
  muted: 'text-[#6d7a8c]',
  input: 'bg-[#f0f3f8] border-[#cdd3dd] text-[#2f3744] placeholder-[#7a8598] focus:border-accent focus:outline-none',
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
  accept, maxMB, value, onUploaded, isDark, isLite, previewType = 'image',
}: {
  accept: string; maxMB: number; value?: string;
  onUploaded: (url: string, duration?: number) => void;
  isDark: boolean; isLite?: boolean; previewType?: 'image' | 'video';
}) {
  const k = isDark ? DK : isLite ? LITK : LK;
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > maxMB * 1024 * 1024) { setErr(`Max ${maxMB} MB allowed.`); return; }
    setUploading(true); setErr('');
    try {
      const url = await uploadMedia(file);
      if (url) {
        onUploaded(url);
      } else {
        setErr('Upload failed');
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
        className={`relative flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 select-none ${
          dragging
            ? 'border-accent bg-accent/5 scale-[1.02] ring-2 ring-accent/40'
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

function BlockComposer({ blocks, onChange, isDark, isLite }: { blocks: LineBlock[]; onChange: (b: LineBlock[]) => void; isDark: boolean; isLite?: boolean }) {
  const k = isDark ? DK : isLite ? LITK : LK;
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
              {(block.type === 'image' || block.type === 'video') && (
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
              <UploadZone accept="image/jpeg,image/png,image/gif,image/webp" maxMB={UPLOAD_LIMITS.image} value={block.originalContentUrl} onUploaded={url => update(i, { originalContentUrl: url, previewImageUrl: url })} isDark={isDark} isLite={isLite} previewType="image" />
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
                <UploadZone accept="video/mp4,video/quicktime" maxMB={UPLOAD_LIMITS.video} value={block.originalContentUrl} onUploaded={url => update(i, { originalContentUrl: url })} isDark={isDark} isLite={isLite} previewType="video" />
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-widest mb-1.5 ${k.muted}`}>Thumbnail (required by LINE)</p>
                  <UploadZone accept="image/jpeg,image/png,image/webp" maxMB={UPLOAD_LIMITS.image} value={block.previewImageUrl} onUploaded={url => update(i, { previewImageUrl: url })} isDark={isDark} isLite={isLite} previewType="image" />
                </div>
              </div>
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
            { type: 'sticker' as const, icon: <Smile size={12} />, label: 'Sticker' },
          ].map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => add(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors active:scale-95 ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-accent/50' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:border-accent/50'}`}
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

export default function BroadcastsView({ theme, accentColor = '#00b900', onLimitHit, onGoToSettings }: BroadcastsViewProps) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';
  const k = isDark ? DK : isLite ? LITK : LK;

  const [section, setSection] = useState<'broadcast' | 'automation' | 'line' | 'instagram' | 'telegram'>('broadcast');
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [greeting, setGreeting] = useState<{ greetingEnabled: boolean; greetingMessages: LineBlock[] }>({ greetingEnabled: false, greetingMessages: [] });
  const [richMenus, setRichMenus] = useState<RichMenu[]>([]);
  const [defaultRichMenuId, setDefaultRichMenuId] = useState<string | null>(null);
  const [previousDefaultRichMenuId, setPreviousDefaultRichMenuId] = useState<string | null>(null);
  const [showRmPublishConfirm, setShowRmPublishConfirm] = useState(false);
  const [rmRestoring, setRmRestoring] = useState(false);

  // LINE's Messaging API can't tell us whether a merchant already has a native Greeting
  // message / Auto-response message configured in their LINE Official Account Manager, so we
  // can't detect a conflict — just make sure they've been told once, the first time they turn
  // on the Shopenter-side equivalent.
  const [nativeAckPrompt, setNativeAckPrompt] = useState<'greeting' | 'autoreply' | null>(null);
  const pendingAckActionRef = useRef<(() => void) | null>(null);

  // Mirrors the server-side BROADCAST_ENABLED gate in /api/broadcasts/instant — surfaces the
  // restriction proactively instead of only after a failed send. Requires NEXT_PUBLIC_BROADCAST_ENABLED
  // to match the server's BROADCAST_ENABLED (no client-only bypass; the server still enforces this).
  const broadcastEnabled = process.env.NEXT_PUBLIC_BROADCAST_ENABLED === 'true';

  // Broadcast form
  const [bCaption, setBCaption] = useState('');
  const [bImageUrl, setBImageUrl] = useState('');
  const [bPlatforms, setBPlatforms] = useState<string[]>(['line']);
  const [bIgPostType, setBIgPostType] = useState<'feed' | 'story'>('feed');
  const [bLineExtras, setBLineExtras] = useState<LineBlock[]>([]);
  const [bAudience, setBAudience] = useState('all');
  const [bName, setBName] = useState('');
  const [bSending, setBSending] = useState(false);
  const [bResult, setBResult] = useState<BroadcastResult | null>(null);
  const [bError, setBError] = useState('');
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({ line: false, telegram: false, instagram: false });

  // Page structure state
  const [lineSubSection, setLineSubSection] = useState<'auto-reply' | 'rich-menu'>('auto-reply');

  // Settings data (for smart search toggles + welcome config)
  const [settingsData, setSettingsData] = useState<any>(null);
  const [defaultWelcome, setDefaultWelcome] = useState({ message: '', storefrontLink: true });
  const [defaultReEngage, setDefaultReEngage] = useState({ message: '', storefrontLink: true });
  // Per-platform override: true = show the override card, false = use global defaults
  const [lineOverrideActive, setLineOverrideActive] = useState(false);
  const [tgOverrideActive, setTgOverrideActive] = useState(false);
  const [igOverrideActive, setIgOverrideActive] = useState(false);
  const [tgWelcome, setTgWelcome] = useState({ enabled: true, message: '', storefrontLink: true });
  const [igWelcome, setIgWelcome] = useState({ enabled: true, message: '', storefrontLink: true });
  const [tgReEngage, setTgReEngage] = useState({ enabled: false, message: '', storefrontLink: true });
  const [igReEngage, setIgReEngage] = useState({ enabled: false, message: '', storefrontLink: true });
  const [lineReEngage, setLineReEngage] = useState({ enabled: false, messages: [] as any[], storefrontLink: true });
  const [welcomeSaving, setWelcomeSaving] = useState<string | null>(null); // platform key or null
  const [welcomeSaved, setWelcomeSaved] = useState<string | null>(null);
  const [defaultSaving, setDefaultSaving] = useState(false);
  const [defaultSaved, setDefaultSaved] = useState(false);

  // Greeting / re-engage test-send
  const [testSending, setTestSending] = useState<'greeting' | 'reengage' | null>(null);
  const [testResult, setTestResult] = useState<{ kind: 'greeting' | 'reengage'; ok: boolean; message: string } | null>(null);

  async function sendTestMessage(kind: 'greeting' | 'reengage') {
    setTestSending(kind);
    setTestResult(null);
    try {
      const res = await fetch('/api/greeting/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      setTestResult({ kind, ok: res.ok, message: res.ok ? 'Test message sent to your Admin LINE ID' : (data.error || 'Failed to send test message') });
    } catch {
      setTestResult({ kind, ok: false, message: 'Network error' });
    } finally {
      setTestSending(null);
      setTimeout(() => setTestResult(null), 4000);
    }
  }

  // Smart search test
  const [searchTestQuery, setSearchTestQuery] = useState('');
  const [searchTestResult, setSearchTestResult] = useState<{ tokens: string[]; products: any[] } | null>(null);
  const [searchTestLoading, setSearchTestLoading] = useState(false);

  // Queued campaign form
  const [qMessages, setQMessages] = useState<LineBlock[]>([{ type: 'text', text: '' }]);
  const [qName, setQName] = useState('');
  const [qDays, setQDays] = useState(7);
  const [qCreating, setQCreating] = useState(false);
  const [qError, setQError] = useState('');
  const [showQueuedForm, setShowQueuedForm] = useState(false);

  const [showSendConfirm, setShowSendConfirm] = useState(false);

  // Auto-reply form
  const [showRuleModal, setShowRuleModal] = useState(false);

  const { mounted: scMounted, visible: scVisible } = useDelayedUnmount(showSendConfirm);
  const { mounted: rmpMounted, visible: rmpVisible } = useDelayedUnmount(showRmPublishConfirm);
  const { mounted: nativeAckMounted, visible: nativeAckVisible } = useDelayedUnmount(nativeAckPrompt !== null);
  const { mounted: rmMounted, visible: rmVisible } = useDelayedUnmount(showRuleModal);
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
      if (res.ok) {
        const data = await res.json();
        setGreeting(data);
        // Only set lineOverrideActive from greeting if not already set by loadSettingsData
        setLineOverrideActive(prev => prev ||
          data.greetingCustom === true ||
          (data.greetingCustom == null && (data.greetingMessages?.length ?? 0) > 0) ||
          !!data.greetingEnabled
        );
      }
    } catch { /* ignore */ }
  }, []);

  const loadRichMenus = useCallback(async () => {
    try {
      const res = await fetch('/api/rich-menu');
      if (res.ok) {
        const data = await res.json();
        setRichMenus(data.richmenus ?? []);
        setDefaultRichMenuId(data.defaultRichMenuId ?? null);
        setPreviousDefaultRichMenuId(data.previousDefaultRichMenuId ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  const loadPlatformStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/broadcasts/platform-status');
      if (res.ok) setPlatformStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadSettingsData = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      setSettingsData(data);
      setDefaultWelcome({
        message: data.defaultWelcomeMessage || '',
        storefrontLink: data.defaultWelcomeStorefrontLink !== false,
      });
      setDefaultReEngage({
        message: data.defaultReEngageMessage || '',
        storefrontLink: data.defaultReEngageStorefrontLink !== false,
      });
      setTgWelcome({
        enabled: data.telegram?.welcomeEnabled !== false,
        message: data.telegram?.welcomeMessage || '',
        storefrontLink: data.telegram?.welcomeStorefrontLink !== false,
      });
      setIgWelcome({
        enabled: data.instagram?.welcomeEnabled !== false,
        message: data.instagram?.welcomeMessage || '',
        storefrontLink: data.instagram?.welcomeStorefrontLink !== false,
      });
      setTgReEngage({
        enabled: !!data.telegram?.reEngageEnabled,
        message: data.telegram?.reEngageMessage || '',
        storefrontLink: data.telegram?.reEngageStorefrontLink !== false,
      });
      setIgReEngage({
        enabled: !!data.instagram?.reEngageEnabled,
        message: data.instagram?.reEngageMessage || '',
        storefrontLink: data.instagram?.reEngageStorefrontLink !== false,
      });
      setLineReEngage({
        enabled: !!data.reEngageEnabled,
        messages: data.reEngageMessages || [],
        storefrontLink: data.reEngageStorefrontLink !== false,
      });
      // Derive override-active from explicit flags or infer from non-empty existing messages
      const lineActive =
        data.greetingCustom === true || data.reEngageCustom === true ||
        (data.greetingCustom == null && ((data.greetingMessages?.length ?? 0) > 0 || !!data.greetingEnabled)) ||
        (data.reEngageCustom == null && (data.reEngageMessages?.length ?? 0) > 0);
      setLineOverrideActive(lineActive);
      const tgActive =
        data.telegram?.welcomeCustom === true || data.telegram?.reEngageCustom === true ||
        (data.telegram?.welcomeCustom == null && !!data.telegram?.welcomeMessage?.trim()) ||
        (data.telegram?.reEngageCustom == null && !!data.telegram?.reEngageMessage?.trim());
      setTgOverrideActive(tgActive);
      const igActive =
        data.instagram?.welcomeCustom === true || data.instagram?.reEngageCustom === true ||
        (data.instagram?.welcomeCustom == null && !!data.instagram?.welcomeMessage?.trim()) ||
        (data.instagram?.reEngageCustom == null && !!data.instagram?.reEngageMessage?.trim());
      setIgOverrideActive(igActive);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadStatus();
    loadCampaigns();
    loadRules();
    loadGreeting();
    loadRichMenus();
    loadPlatformStatus();
    loadSettingsData();
  }, [loadStatus, loadCampaigns, loadRules, loadGreeting, loadRichMenus, loadPlatformStatus, loadSettingsData]);

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
    setShowSendConfirm(false);
    if (!bCaption.trim() && !bImageUrl) return;
    setBSending(true);
    setBResult(null);
    setBError('');
    try {
      const res = await fetch('/api/broadcasts/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: bCaption,
          imageUrl: bImageUrl || undefined,
          platforms: bPlatforms,
          audience: bAudience,
          name: bName,
          igPostType: bIgPostType,
          lineExtraBlocks: bLineExtras,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBResult(data);
        await loadCampaigns();
      } else {
        setBError(data?.error ?? 'Broadcast failed. Please try again.');
      }
    } catch {
      setBError('Could not reach the server. Check your connection and try again.');
    } finally { setBSending(false); }
  }

  async function handleCreateQueued() {
    if (qMessages.every(b => !b.text && !b.originalContentUrl)) return;
    setQCreating(true);
    setQError('');
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
        if (err?.error === 'TIER_LIMIT_REACHED') {
          onLimitHit?.(err.feature, err.limit, err.current);
        } else {
          setQError(err?.error ?? 'Failed to create campaign. Please try again.');
        }
      }
    } catch {
      setQError('Could not reach the server. Check your connection and try again.');
    } finally { setQCreating(false); }
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

  async function doSaveRule() {
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

  async function handleSaveRule() {
    if (!rKeyword.trim() || rMessages.every(b => !b.text && !b.originalContentUrl)) return;
    const willBeFirstActiveRule = !editingRule && rules.every(r => !r.isActive);
    if (willBeFirstActiveRule && !settingsData?.autoReplyNativeAckAt) {
      requireNativeAck('autoreply', () => { doSaveRule(); });
      return;
    }
    await doSaveRule();
  }

  async function handleToggleRule(rule: AutoReplyRule) {
    const activating = !rule.isActive;
    const willBeFirstActiveRule = activating && rules.every(r => !r.isActive || r._id === rule._id);
    const proceed = async () => {
      await fetch(`/api/auto-reply/${rule._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      await loadRules();
    };
    if (willBeFirstActiveRule && !settingsData?.autoReplyNativeAckAt) {
      requireNativeAck('autoreply', proceed);
      return;
    }
    await proceed();
  }

  async function handleDeleteRule(id: string) {
    await fetch(`/api/auto-reply/${id}`, { method: 'DELETE' });
    await loadRules();
  }

  function requireNativeAck(kind: 'greeting' | 'autoreply', action: () => void) {
    pendingAckActionRef.current = action;
    setNativeAckPrompt(kind);
  }

  async function confirmNativeAck() {
    const kind = nativeAckPrompt;
    if (!kind) return;
    const field = kind === 'greeting' ? 'greetingNativeAckAt' : 'autoReplyNativeAckAt';
    const now = new Date().toISOString();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: now }),
    });
    setSettingsData((d: any) => ({ ...(d ?? {}), [field]: now }));
    setNativeAckPrompt(null);
    pendingAckActionRef.current?.();
    pendingAckActionRef.current = null;
  }

  async function handleSaveGreeting() {
    await fetch('/api/greeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...greeting, greetingCustom: true }),
    });
  }

  async function handlePublishRichMenu() {
    setShowRmPublishConfirm(false);
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

  async function handleRestoreRichMenu() {
    setRmRestoring(true);
    try {
      await fetch('/api/rich-menu/restore', { method: 'POST' });
      await loadRichMenus();
    } catch { /* ignore */ }
    finally { setRmRestoring(false); }
  }

  async function handleSearchTest() {
    if (!searchTestQuery.trim()) return;
    setSearchTestLoading(true);
    setSearchTestResult(null);
    try {
      const res = await fetch(`/api/broadcasts/search-test?q=${encodeURIComponent(searchTestQuery)}`);
      if (res.ok) setSearchTestResult(await res.json());
    } catch { /* ignore */ }
    finally { setSearchTestLoading(false); }
  }

  const activeCampaign = campaigns.find(c => c.deliveryMode === 'queued' && (c.status === 'active' || c.status === 'paused'));
  const instantHistory = campaigns.filter(c => c.deliveryMode === 'instant');
  const queuedHistory = campaigns.filter(c => c.deliveryMode === 'queued' && c.status !== 'active' && c.status !== 'paused');

  const remaining = lineStatus?.quota?.type === 'none' ? Infinity : (lineStatus?.quota?.value ?? 0) - (lineStatus?.consumption?.totalUsage ?? 0);

  const SECTIONS = [
    { id: 'broadcast',   label: 'Broadcast',   icon: <Zap size={14} />,        comingSoon: false },
    { id: 'automation',  label: 'Automation',  icon: <Wand2 size={14} />,      comingSoon: false },
    { id: 'line',        label: 'LINE',        icon: <LayoutGrid size={14} />, comingSoon: false },
    { id: 'instagram',   label: 'Instagram',   icon: <Camera size={14} />,     comingSoon: true },
    { id: 'telegram',    label: 'Telegram',    icon: <Send size={14} />,       comingSoon: true },
  ] as const;

  return (
    <div className={`flex-1 overflow-y-auto ${k.bg} p-6 space-y-6`}>
      {/* Multi-platform status row */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            id: 'line', label: 'LINE',
            configured: platformStatus.line,
            extra: lineStatus?.valid
              ? (lineStatus.quota?.type === 'none' ? 'Unlimited' : `${lineStatus.consumption?.totalUsage ?? 0}/${lineStatus.quota?.value ?? 0} msgs`)
              : lineStatus?.configured ? 'Invalid token' : '',
          },
          { id: 'telegram',  label: 'Telegram',  configured: platformStatus.telegram },
          { id: 'instagram', label: 'Instagram', configured: platformStatus.instagram },
        ].map(p => (
          <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
            p.configured
              ? isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : isDark ? 'bg-[#161925] border-[#1f2335] text-[#4a5068]'            : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.configured ? 'bg-emerald-400' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`} />
            <span>{p.label}</span>
            <span className="opacity-60">{p.configured ? 'Active' : 'Not configured'}</span>
            {(p as any).extra && <span className="opacity-80">· {(p as any).extra}</span>}
          </div>
        ))}
      </div>

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
            onClick={() => { if (!s.comingSoon) setSection(s.id); }}
            disabled={s.comingSoon}
            title={s.comingSoon ? `${s.label} is coming soon` : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 flex-1 justify-center ${
              s.comingSoon
                ? 'opacity-40 cursor-not-allowed ' + (isDark ? 'text-[#4a5068]' : 'text-slate-300')
                : section === s.id
                ? 'text-white shadow-sm'
                : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
            style={!s.comingSoon && section === s.id ? { background: 'var(--accent-gradient)' } : undefined}
          >
            {s.icon}{s.label}
            {s.comingSoon && <span className="text-[9px] font-black uppercase">Soon</span>}
          </button>
        ))}
      </div>

      {/* ── Broadcast ── */}
      {section === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Unified Instant Broadcast ── */}
          <div className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-accent" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${k.text}`}>Broadcast</p>
                <p className={`text-xs ${k.muted}`}>Send to all customers across platforms instantly</p>
              </div>
            </div>

            {!broadcastEnabled && (
              <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>Broadcasting is temporarily unavailable while delivery infrastructure is upgraded. You can still draft a message below, but sending is disabled for now.</span>
              </div>
            )}

            {/* Platform selector */}
            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Platforms</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'line', label: 'LINE', configured: platformStatus.line, comingSoon: false, dot: 'bg-emerald-400', ring: 'ring-emerald-500/30', activeBg: isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-700' },
                  { id: 'telegram', label: 'Telegram', configured: platformStatus.telegram, comingSoon: true, dot: 'bg-blue-400', ring: 'ring-blue-500/30', activeBg: isDark ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-700' },
                  { id: 'instagram', label: 'Instagram', configured: platformStatus.instagram, comingSoon: true, dot: 'bg-pink-400', ring: 'ring-pink-500/30', activeBg: isDark ? 'bg-pink-500/15 border-pink-500/30 text-pink-300' : 'bg-pink-50 border-pink-300 text-pink-700' },
                ] as const).map(p => {
                  const selected = bPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!p.configured || p.comingSoon}
                      title={p.comingSoon ? `${p.label} is coming soon` : !p.configured ? `${p.label} not configured — go to Settings` : undefined}
                      onClick={() => setBPlatforms(prev =>
                        selected ? prev.filter(x => x !== p.id) : [...prev, p.id]
                      )}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                        !p.configured || p.comingSoon
                          ? isDark ? 'border-[#1f2335] text-[#4a5068] cursor-not-allowed' : 'border-slate-200 text-slate-300 cursor-not-allowed'
                          : selected
                          ? `${p.activeBg} ring-1 ${p.ring}`
                          : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:border-[#2d3555] hover:text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${p.configured ? p.dot : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`} />
                      {p.label}
                      {!p.configured && <span className="text-[9px] opacity-60">not configured</span>}
                      {selected && p.configured && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
              {bPlatforms.length === 0 && (
                <p className="text-xs text-amber-400 mt-1.5">Select at least one platform.</p>
              )}
            </div>

            {/* Caption */}
            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Caption / Message</label>
              <textarea
                value={bCaption}
                onChange={e => setBCaption(e.target.value)}
                placeholder="Write your broadcast message here…"
                rows={3}
                className={`w-full rounded-lg px-3 py-2 text-sm border resize-none ${k.input}`}
              />
            </div>

            {/* Image */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className={`text-[11px] font-semibold uppercase tracking-widest ${k.muted}`}>Image</label>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDark ? 'border-[#1f2335] text-[#8b92ad]' : 'border-slate-200 text-slate-400'}`}>optional for LINE &amp; Telegram · required for Instagram</span>
              </div>
              <UploadZone
                accept="image/jpeg,image/png,image/gif,image/webp"
                maxMB={UPLOAD_LIMITS.image}
                value={bImageUrl}
                onUploaded={url => setBImageUrl(url)}
                isDark={isDark}
                isLite={isLite}
                previewType="image"
              />
            </div>

            {/* Instagram-exclusive: post type */}
            {bPlatforms.includes('instagram') && (
              <div className={`rounded-xl p-4 space-y-3 border ${isDark ? 'bg-[#1a1d2e] border-pink-500/20' : 'bg-pink-50/50 border-pink-200'}`}>
                <div className="flex items-center gap-2">
                  <Camera size={13} className="text-pink-400" />
                  <span className={`text-xs font-semibold ${isDark ? 'text-pink-300' : 'text-pink-700'}`}>Instagram</span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/25">IG Exclusive</span>
                </div>
                <div>
                  <p className={`text-[11px] font-semibold mb-2 ${k.muted}`}>Post type</p>
                  <div className="flex gap-2">
                    {(['feed', 'story'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBIgPostType(t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all capitalize ${
                          bIgPostType === t
                            ? isDark ? 'bg-pink-500/15 border-pink-500/30 text-pink-300' : 'bg-pink-50 border-pink-300 text-pink-700'
                            : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {t === 'feed' ? '🖼 Feed Post' : '⭕ Story'}
                      </button>
                    ))}
                  </div>
                  {!bImageUrl && (
                    <p className={`text-[10px] mt-2 text-amber-400`}>⚠ Upload an image above — Instagram posts require an image.</p>
                  )}
                </div>
              </div>
            )}

            {/* LINE-exclusive extras */}
            <div className={`rounded-xl p-4 space-y-3 border ${isDark ? 'bg-[#1a1d2e] border-emerald-500/15' : 'bg-emerald-50/30 border-emerald-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">LINE Exclusive</span>
                <span className={`text-xs ${k.muted}`}>Extra blocks sent only to LINE customers</span>
              </div>
              {bLineExtras.length > 0 && (
                <div className="space-y-2">
                  {bLineExtras.map((block, i) => (
                    <div key={i} className={`rounded-lg p-3 space-y-2 ${isDark ? 'bg-[#0f1117] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${k.muted}`}>{block.type}</span>
                        <button onClick={() => setBLineExtras(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 p-0.5"><X size={12} /></button>
                      </div>
                      {block.type === 'video' && (
                        <div className="space-y-2">
                          <input type="url" value={block.originalContentUrl ?? ''} onChange={e => setBLineExtras(prev => prev.map((b, idx) => idx === i ? { ...b, originalContentUrl: e.target.value } : b))} placeholder="Video URL (.mp4)" className={`w-full rounded-lg px-3 py-2 text-xs border ${k.input}`} />
                          <input type="url" value={block.previewImageUrl ?? ''} onChange={e => setBLineExtras(prev => prev.map((b, idx) => idx === i ? { ...b, previewImageUrl: e.target.value } : b))} placeholder="Thumbnail URL (required by LINE)" className={`w-full rounded-lg px-3 py-2 text-xs border ${k.input}`} />
                        </div>
                      )}
                      {block.type === 'sticker' && (
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={block.packageId ?? ''} onChange={e => setBLineExtras(prev => prev.map((b, idx) => idx === i ? { ...b, packageId: e.target.value } : b))} placeholder="Package ID" className={`rounded-lg px-3 py-2 text-xs border ${k.input}`} />
                          <input type="text" value={block.stickerId ?? ''} onChange={e => setBLineExtras(prev => prev.map((b, idx) => idx === i ? { ...b, stickerId: e.target.value } : b))} placeholder="Sticker ID" className={`rounded-lg px-3 py-2 text-xs border ${k.input}`} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBLineExtras(prev => [...prev, { type: 'video' }])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors active:scale-95 ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-accent/50' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:border-accent/50'}`}
                >
                  <Video size={11} /> + Video
                </button>
                <button
                  type="button"
                  onClick={() => setBLineExtras(prev => [...prev, { type: 'sticker' }])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors active:scale-95 ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-accent/50' : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:border-accent/50'}`}
                >
                  <Smile size={11} /> + Sticker
                </button>
              </div>
            </div>

            {/* Audience — LINE + Telegram only */}
            {(bPlatforms.includes('line') || bPlatforms.includes('telegram')) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className={`text-[11px] font-semibold uppercase tracking-widest ${k.muted}`}>Audience</label>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDark ? 'border-[#1f2335] text-[#8b92ad]' : 'border-slate-200 text-slate-400'}`}>LINE &amp; Telegram</span>
                  {bPlatforms.includes('instagram') && (
                    <span className={`text-[10px] ${k.muted}`}>· Instagram posts go to all followers</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {Object.entries(AUDIENCE_LABELS).map(([val, label]) => (
                    <label key={val} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${bAudience === val ? 'bg-accent/10 border border-accent/30' : isDark ? 'border border-[#1f2335] hover:border-[#2d3555]' : 'border border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="audience" value={val} checked={bAudience === val} onChange={() => setBAudience(val)} className="accent-accent" />
                      <span className={`text-sm ${k.text}`}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {remaining !== Infinity && remaining < 100 && bPlatforms.includes('line') && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-400">Only {remaining} messages remaining this month. Consider using a Queued Campaign instead.</p>
              </div>
            )}

            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Campaign Name (optional)</label>
              <input type="text" value={bName} onChange={e => setBName(e.target.value)} placeholder="e.g. May Flash Sale" className={`w-full rounded-lg px-3 py-2 text-sm border ${k.input}`} />
            </div>

            {/* Results */}
            {bResult && (
              <div className="space-y-1.5">
                {bResult.platforms.map(p => {
                  const r = bResult.results[p];
                  const isIg = p === 'instagram';
                  const ok = !r.error && (isIg ? r.sent === 1 : (r.queued || r.failed === 0));
                  return (
                    <div key={p} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ok ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                      {ok ? <Check size={13} className="text-emerald-400 flex-shrink-0" /> : <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />}
                      <span className={`text-xs font-semibold uppercase tracking-wider ${ok ? 'text-emerald-400' : 'text-amber-400'} flex-shrink-0`}>{p}</span>
                      <span className={`text-xs ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isIg
                          ? (ok ? `Post published (${r.postType ?? bIgPostType})` : r.error ?? 'Failed to publish')
                          : r.queued
                          ? 'Queued — sending in the background'
                          : (ok ? `Sent to ${r.sent} customers` : `${r.sent ?? 0} sent · ${r.failed ?? 0} failed`)
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {bError && (
              <div className={`rounded-xl p-4 ${isDark ? 'bg-[#161925] border border-red-500/20' : 'bg-red-50 border border-red-200'} flex items-start gap-3`}>
                <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>{bError}</p>
              </div>
            )}

            <button
              onClick={() => setShowSendConfirm(true)}
              disabled={bSending || bPlatforms.length === 0 || (!bCaption.trim() && !bImageUrl)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent-gradient)' }}
            >
              {bSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {bSending ? 'Sending…' : `Broadcast${bPlatforms.length > 0 ? ` · ${bPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ')}` : ''}`}
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
                <BlockComposer blocks={qMessages} onChange={setQMessages} isDark={isDark} isLite={isLite} />
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Valid for</label>
                  <div className="flex gap-2 flex-wrap">
                    {[3, 7, 14, 30].map(d => (
                      <button key={d} onClick={() => setQDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${qDays === d ? 'text-white border-transparent' : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}
                        style={qDays === d ? { background: 'var(--accent-gradient)' } : undefined}>{d} days</button>
                    ))}
                  </div>
                </div>
                <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                  <Info size={12} className={`${k.muted} mt-0.5 flex-shrink-0`} />
                  <p className={`text-xs ${k.muted}`}>Delivery is gradual — customers receive this message the next time they message your bot (free via reply token). Not suitable for time-sensitive campaigns.</p>
                </div>
                {qError && (
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-[#161925] border border-red-500/20' : 'bg-red-50 border border-red-200'} flex items-start gap-3`}>
                    <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className={`text-xs ${isDark ? 'text-red-300' : 'text-red-700'}`}>{qError}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleCreateQueued} disabled={qCreating} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50" style={{ background: 'var(--accent-gradient)' }}>
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
                  {[...instantHistory, ...queuedHistory].slice(0, 5).map((c, idx) => (
                    <div key={c._id} className={`flex items-center justify-between px-3 py-2 rounded-lg animate-slide-up ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`} style={{ animationDelay: `${idx * 50}ms` }}>
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

      {/* ── Automation ── */}
      {section === 'automation' && (
        <div className="space-y-6">
          {/* Overview + toggles */}
          <div className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
            <div>
              <p className={`text-sm font-semibold ${k.text}`}>Smart Product Search</p>
              <p className={`text-xs mt-1 ${k.muted}`}>When a customer messages your bot, Shopenter tokenises the text, removes stop words, and searches your product catalog. Matching products are sent as rich cards. If nothing matches, the storefront link is sent instead.</p>
            </div>

            {/* How it works */}
            <div className={`rounded-xl px-4 py-3 space-y-1.5 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-widest ${k.muted}`}>Pipeline</p>
              {[
                '1  Customer message → tokenised, stop words removed',
                '2  Remaining tokens matched against name · brand · description · categories',
                '3  Products scored by number of matching tokens',
                '4  Top 5 sent as photo cards with a "View Product" button',
                '5  No match → storefront link sent as fallback',
              ].map(s => <p key={s} className={`text-[11px] font-mono ${k.muted}`}>{s}</p>)}
            </div>

            {/* Per-platform toggles */}
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${k.muted}`}>Enable per platform</p>
              <div className="space-y-2">
                {([
                  { id: 'line',      label: 'LINE',      badge: 'emerald', configured: platformStatus.line },
                  { id: 'telegram',  label: 'Telegram',  badge: 'blue',    configured: platformStatus.telegram },
                  { id: 'instagram', label: 'Instagram', badge: 'pink',    configured: platformStatus.instagram },
                ] as const).map(p => {
                  const enabled = p.id === 'line'
                    ? settingsData?.lineIntentSearch !== false
                    : settingsData?.[p.id]?.intentSearch !== false;
                  return (
                    <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e] border border-[#1f2335]' : 'bg-slate-50 border border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${k.text}`}>{p.label}</span>
                        {!p.configured && <span className={`text-[10px] ${k.muted}`}>· not configured</span>}
                      </div>
                      <button
                        disabled={!p.configured}
                        onClick={async () => {
                          const newVal = !enabled;
                          const patch = p.id === 'line'
                            ? { lineIntentSearch: newVal }
                            : { [p.id]: { intentSearch: newVal } };
                          await fetch('/api/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(patch),
                          });
                          setSettingsData((s: any) => p.id === 'line'
                            ? { ...s, lineIntentSearch: newVal }
                            : { ...s, [p.id]: { ...(s?.[p.id] || {}), intentSearch: newVal } });
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 disabled:opacity-30 ${enabled && p.configured ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled && p.configured ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Test panel */}
          <div className={`rounded-2xl p-6 space-y-4 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
            <div>
              <p className={`text-sm font-semibold ${k.text}`}>Test Search</p>
              <p className={`text-xs mt-1 ${k.muted}`}>Type any customer message to see exactly which products the bot would return — and why</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTestQuery}
                onChange={e => setSearchTestQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearchTest(); }}
                placeholder="e.g. do you have nike sneakers?"
                className={`flex-1 rounded-lg px-3 py-2 text-sm border ${k.input}`}
              />
              <button
                onClick={handleSearchTest}
                disabled={searchTestLoading || !searchTestQuery.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ background: 'var(--accent-gradient)' }}
              >
                {searchTestLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Test
              </button>
            </div>

            {searchTestResult && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 text-xs flex-wrap ${k.muted}`}>
                  <span>Tokens:</span>
                  {searchTestResult.tokens.length === 0
                    ? <span>none — message contained only stop words</span>
                    : searchTestResult.tokens.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono">{t}</span>
                      ))
                  }
                </div>
                {searchTestResult.tokens.length > 0 && (
                  searchTestResult.products.length === 0 ? (
                    <div className={`py-8 text-center rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                      <p className={`text-sm ${k.muted}`}>No products matched — bot would send the storefront link</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchTestResult.products.map((p: any, i: number) => (
                        <div key={String(p._id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e] border border-[#1f2335]' : 'bg-slate-50 border border-slate-200'}`}>
                          <span className={`text-sm font-bold w-5 text-center flex-shrink-0 ${k.muted}`}>{i + 1}</span>
                          {p.imageUrl && <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${k.text}`}>{p.name}</p>
                            <p className={`text-xs ${k.muted}`}>{p.brand ? `${p.brand} · ` : ''}฿{Number(p.price).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                            {p.matchedTokens.map((t: string) => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono">{t}</span>
                            ))}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isDark ? 'border-[#1f2335] text-[#8b92ad]' : 'border-slate-200 text-slate-400'}`}>
                              {p.score}/{searchTestResult.tokens.length}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* ── Welcome Messages ── */}
          <div className="space-y-5">
            <p className={`text-xs font-semibold uppercase tracking-widest ${k.muted}`}>Welcome Messages</p>

            {/* ── Default messages ── */}
            <div className={`rounded-2xl p-5 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
              <div>
                <p className={`text-sm font-semibold ${k.text}`}>Default messages</p>
                <p className={`text-xs mt-0.5 ${k.muted}`}>Sent by all platforms unless a platform has a custom override enabled.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>First visit</label>
                  <textarea value={defaultWelcome.message} onChange={e => setDefaultWelcome(d => ({ ...d, message: e.target.value }))} placeholder={`Welcome to ${settingsData?.shopName || 'Your Shop'}! 🛍️`} rows={2} className={`w-full rounded-lg px-3 py-2 text-sm border resize-none ${k.input}`} />
                  <p className={`text-[10px] mt-1 ${k.muted}`}>Leave blank to use the built-in fallback.</p>
                </div>
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                  <div>
                    <p className={`text-xs font-semibold ${k.text}`}>Include storefront link</p>
                    <p className={`text-[10px] mt-0.5 ${k.muted}`}>Appends your store URL — customer identity auto-embedded</p>
                  </div>
                  <button onClick={() => setDefaultWelcome(d => ({ ...d, storefrontLink: !d.storefrontLink }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${defaultWelcome.storefrontLink ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${defaultWelcome.storefrontLink ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold uppercase tracking-widest mb-2 ${k.muted}`}>Re-engagement (24h gap)</label>
                  <textarea value={defaultReEngage.message} onChange={e => setDefaultReEngage(d => ({ ...d, message: e.target.value }))} placeholder={`Welcome back to ${settingsData?.shopName || 'Your Shop'}! 👋 We've missed you.`} rows={2} className={`w-full rounded-lg px-3 py-2 text-sm border resize-none ${k.input}`} />
                  <p className={`text-[10px] mt-1 ${k.muted}`}>Leave blank to use the built-in fallback.</p>
                </div>
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                  <div>
                    <p className={`text-xs font-semibold ${k.text}`}>Include storefront link</p>
                    <p className={`text-[10px] mt-0.5 ${k.muted}`}>Appends your store URL — customer identity auto-embedded</p>
                  </div>
                  <button onClick={() => setDefaultReEngage(d => ({ ...d, storefrontLink: !d.storefrontLink }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${defaultReEngage.storefrontLink ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${defaultReEngage.storefrontLink ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  disabled={defaultSaving}
                  onClick={async () => {
                    setDefaultSaving(true);
                    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultWelcomeMessage: defaultWelcome.message, defaultWelcomeStorefrontLink: defaultWelcome.storefrontLink, defaultReEngageMessage: defaultReEngage.message, defaultReEngageStorefrontLink: defaultReEngage.storefrontLink }) });
                    setDefaultSaving(false); setDefaultSaved(true); setTimeout(() => setDefaultSaved(false), 2000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ background: 'var(--accent-gradient)' }}
                >
                  {defaultSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{defaultSaved ? 'Saved!' : 'Save Defaults'}
                </button>
                <button
                  disabled={testSending === 'greeting'}
                  onClick={() => sendTestMessage('greeting')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors disabled:opacity-50 ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-accent' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-accent'}`}
                >
                  {testSending === 'greeting' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Test welcome
                </button>
                <button
                  disabled={testSending === 'reengage'}
                  onClick={() => sendTestMessage('reengage')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors disabled:opacity-50 ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-accent' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-accent'}`}
                >
                  {testSending === 'reengage' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Test re-engagement
                </button>
                {(testResult?.kind === 'greeting' || testResult?.kind === 'reengage') && (
                  <span className={`text-xs ${testResult.ok ? 'text-emerald-500' : 'text-red-500'}`}>{testResult.message}</span>
                )}
              </div>
              <p className={`text-[10px] ${k.muted}`}>Test messages are sent to your Admin LINE ID (set in Settings) using whichever message is currently active — default or, if a LINE override is enabled, the custom one.</p>
            </div>

            {/* ── Per-platform overrides ── */}
            <div className="space-y-3">
              <p className={`text-[11px] font-semibold uppercase tracking-widest ${k.muted}`}>Per-platform overrides</p>
              <p className={`text-[11px] ${k.muted}`}>Add an override to use a different message — or to disable welcome messages — on a specific platform. Platforms without an override use the defaults above.</p>

              {/* Active override cards */}
              <div className="space-y-4">

                {/* ─ LINE ─ */}
                {lineOverrideActive && (
                <div className={`rounded-2xl p-5 space-y-4 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${k.text}`}>LINE</span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">LINE</span>
                      {!platformStatus.line && <span className={`text-[10px] ${k.muted}`}>· not connected</span>}
                    </div>
                    <button
                      onClick={async () => {
                        setLineOverrideActive(false);
                        await fetch('/api/greeting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...greeting, greetingCustom: false }) });
                        await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reEngageCustom: false }) });
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-red-400 hover:border-red-500/30' : 'border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300'}`}
                    >
                      Remove
                    </button>
                  </div>

                  {/* First visit */}
                  <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-semibold ${k.text}`}>First visit</p>
                        <p className={`text-[10px] mt-0.5 ${k.muted}`}>Sent when a customer follows your LINE OA.</p>
                      </div>
                      <button
                        onClick={() => {
                          if (!greeting.greetingEnabled && !settingsData?.greetingNativeAckAt) {
                            requireNativeAck('greeting', () => setGreeting(g => ({ ...g, greetingEnabled: true })));
                          } else {
                            setGreeting(g => ({ ...g, greetingEnabled: !g.greetingEnabled }));
                          }
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${greeting.greetingEnabled ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${greeting.greetingEnabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {greeting.greetingEnabled && (
                      <>
                        <BlockComposer
                          blocks={greeting.greetingMessages.length > 0 ? greeting.greetingMessages : [{ type: 'text', text: '' }]}
                          onChange={msgs => setGreeting(g => ({ ...g, greetingMessages: msgs }))}
                          isDark={isDark}
                          isLite={isLite}
                        />
                        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-[#161925]' : 'bg-white'}`}>
                          <Info size={11} className={`${k.muted} mt-0.5 flex-shrink-0`} />
                          <p className={`text-[11px] ${k.muted}`}>To include a storefront link, add an Image block with a URI action or embed the URL in a Text block.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={testSending === 'greeting'}
                            onClick={() => sendTestMessage('greeting')}
                            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-accent' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-accent'}`}
                          >
                            {testSending === 'greeting' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                            Send test to my Admin LINE ID
                          </button>
                          {testResult?.kind === 'greeting' && (
                            <span className={`text-[11px] ${testResult.ok ? 'text-emerald-500' : 'text-red-500'}`}>{testResult.message}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Re-engagement */}
                  <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-semibold ${k.text}`}>Re-engagement — 24h gap</p>
                        <p className={`text-[10px] mt-0.5 ${k.muted}`}>Sent when a LINE customer messages after 24+ hours away.</p>
                      </div>
                      <button onClick={() => setLineReEngage(r => ({ ...r, enabled: !r.enabled }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${lineReEngage.enabled ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${lineReEngage.enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {lineReEngage.enabled && (
                      <>
                        <BlockComposer
                          blocks={lineReEngage.messages.length > 0 ? lineReEngage.messages : [{ type: 'text', text: '' }]}
                          onChange={msgs => setLineReEngage(r => ({ ...r, messages: msgs }))}
                          isDark={isDark}
                          isLite={isLite}
                        />
                        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-[#161925]' : 'bg-white'}`}>
                          <Info size={11} className={`${k.muted} mt-0.5 flex-shrink-0`} />
                          <p className={`text-[11px] ${k.muted}`}>To include a storefront link, add an Image block with a URI action or embed the URL in a Text block.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={testSending === 'reengage'}
                            onClick={() => sendTestMessage('reengage')}
                            className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white hover:border-accent' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-accent'}`}
                          >
                            {testSending === 'reengage' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                            Send test to my Admin LINE ID
                          </button>
                          {testResult?.kind === 'reengage' && (
                            <span className={`text-[11px] ${testResult.ok ? 'text-emerald-500' : 'text-red-500'}`}>{testResult.message}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    disabled={welcomeSaving === 'line'}
                    onClick={async () => {
                      setWelcomeSaving('line');
                      await handleSaveGreeting();
                      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reEngageEnabled: lineReEngage.enabled, reEngageMessages: lineReEngage.messages, reEngageCustom: true }) });
                      setWelcomeSaving(null); setWelcomeSaved('line'); setTimeout(() => setWelcomeSaved(null), 2000);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                    style={{ background: 'var(--accent-gradient)' }}
                  >
                    {welcomeSaving === 'line' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{welcomeSaved === 'line' ? 'Saved!' : 'Save LINE'}
                  </button>
                </div>
                )}

                {/* ─ Instagram ─ */}
                {igOverrideActive && (
                <div className={`rounded-2xl p-5 space-y-4 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${k.text}`}>Instagram</span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/25">Instagram</span>
                      {!platformStatus.instagram && <span className={`text-[10px] ${k.muted}`}>· not connected</span>}
                    </div>
                    <button
                      onClick={async () => {
                        setIgOverrideActive(false);
                        await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instagram: { welcomeCustom: false, reEngageCustom: false } }) });
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-red-400 hover:border-red-500/30' : 'border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300'}`}
                    >
                      Remove
                    </button>
                  </div>

                  {/* First visit */}
                  <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-semibold ${k.text}`}>First visit</p>
                        <p className={`text-[10px] mt-0.5 ${k.muted}`}>Sent the first time a customer DMs your Instagram account.</p>
                      </div>
                      <button onClick={() => setIgWelcome(w => ({ ...w, enabled: !w.enabled }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${igWelcome.enabled ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${igWelcome.enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {igWelcome.enabled && (
                      <div className="space-y-3">
                        <textarea value={igWelcome.message} onChange={e => setIgWelcome(w => ({ ...w, message: e.target.value }))} placeholder="Welcome! 🛍️ Browse our collection below." rows={2} className={`w-full rounded-lg px-3 py-2 text-sm border resize-none ${k.input}`} />
                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                          <p className={`text-xs ${k.muted}`}>Include storefront link</p>
                          <button onClick={() => setIgWelcome(w => ({ ...w, storefrontLink: !w.storefrontLink }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${igWelcome.storefrontLink ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${igWelcome.storefrontLink ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Re-engagement */}
                  <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-semibold ${k.text}`}>Re-engagement — 24h gap</p>
                        <p className={`text-[10px] mt-0.5 ${k.muted}`}>Sent when an existing customer DMs after 24+ hours away.</p>
                      </div>
                      <button onClick={() => setIgReEngage(r => ({ ...r, enabled: !r.enabled }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${igReEngage.enabled ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${igReEngage.enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {igReEngage.enabled && (
                      <div className="space-y-3">
                        <textarea value={igReEngage.message} onChange={e => setIgReEngage(r => ({ ...r, message: e.target.value }))} placeholder="Welcome back! 👋 Check out what's new." rows={2} className={`w-full rounded-lg px-3 py-2 text-sm border resize-none ${k.input}`} />
                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                          <p className={`text-xs ${k.muted}`}>Include storefront link</p>
                          <button onClick={() => setIgReEngage(r => ({ ...r, storefrontLink: !r.storefrontLink }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${igReEngage.storefrontLink ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${igReEngage.storefrontLink ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    disabled={welcomeSaving === 'instagram'}
                    onClick={async () => {
                      setWelcomeSaving('instagram');
                      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instagram: { welcomeEnabled: igWelcome.enabled, welcomeMessage: igWelcome.message, welcomeStorefrontLink: igWelcome.storefrontLink, welcomeCustom: true, reEngageEnabled: igReEngage.enabled, reEngageMessage: igReEngage.message, reEngageStorefrontLink: igReEngage.storefrontLink, reEngageCustom: true } }) });
                      setWelcomeSaving(null); setWelcomeSaved('instagram'); setTimeout(() => setWelcomeSaved(null), 2000);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                    style={{ background: 'var(--accent-gradient)' }}
                  >
                    {welcomeSaving === 'instagram' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{welcomeSaved === 'instagram' ? 'Saved!' : 'Save Instagram'}
                  </button>
                </div>
                )}

                {/* ─ Telegram ─ */}
                {tgOverrideActive && (
                <div className={`rounded-2xl p-5 space-y-4 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${k.text}`}>Telegram</span>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">Telegram</span>
                      {!platformStatus.telegram && <span className={`text-[10px] ${k.muted}`}>· not connected</span>}
                    </div>
                    <button
                      onClick={async () => {
                        setTgOverrideActive(false);
                        await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegram: { welcomeCustom: false, reEngageCustom: false } }) });
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-red-400 hover:border-red-500/30' : 'border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300'}`}
                    >
                      Remove
                    </button>
                  </div>

                  {/* First visit */}
                  <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-semibold ${k.text}`}>First visit</p>
                        <p className={`text-[10px] mt-0.5 ${k.muted}`}>Sent the first time a customer messages your Telegram bot.</p>
                      </div>
                      <button onClick={() => setTgWelcome(w => ({ ...w, enabled: !w.enabled }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${tgWelcome.enabled ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${tgWelcome.enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {tgWelcome.enabled && (
                      <div className="space-y-3">
                        <textarea value={tgWelcome.message} onChange={e => setTgWelcome(w => ({ ...w, message: e.target.value }))} placeholder="Welcome! 🎉 Browse our products directly from chat." rows={2} className={`w-full rounded-lg px-3 py-2 text-sm border resize-none ${k.input}`} />
                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                          <p className={`text-xs ${k.muted}`}>Include storefront link</p>
                          <button onClick={() => setTgWelcome(w => ({ ...w, storefrontLink: !w.storefrontLink }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${tgWelcome.storefrontLink ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${tgWelcome.storefrontLink ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Re-engagement */}
                  <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-semibold ${k.text}`}>Re-engagement — 24h gap</p>
                        <p className={`text-[10px] mt-0.5 ${k.muted}`}>Sent when an existing customer messages after 24+ hours away.</p>
                      </div>
                      <button onClick={() => setTgReEngage(r => ({ ...r, enabled: !r.enabled }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${tgReEngage.enabled ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${tgReEngage.enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    {tgReEngage.enabled && (
                      <div className="space-y-3">
                        <textarea value={tgReEngage.message} onChange={e => setTgReEngage(r => ({ ...r, message: e.target.value }))} placeholder="Welcome back! 👋 Here's what's new." rows={2} className={`w-full rounded-lg px-3 py-2 text-sm border resize-none ${k.input}`} />
                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-[#1a1d2e]' : 'bg-slate-50'}`}>
                          <p className={`text-xs ${k.muted}`}>Include storefront link</p>
                          <button onClick={() => setTgReEngage(r => ({ ...r, storefrontLink: !r.storefrontLink }))} className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${tgReEngage.storefrontLink ? 'bg-accent' : isDark ? 'bg-[#2d3555]' : 'bg-slate-300'}`}>
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${tgReEngage.storefrontLink ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    disabled={welcomeSaving === 'telegram'}
                    onClick={async () => {
                      setWelcomeSaving('telegram');
                      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telegram: { welcomeEnabled: tgWelcome.enabled, welcomeMessage: tgWelcome.message, welcomeStorefrontLink: tgWelcome.storefrontLink, welcomeCustom: true, reEngageEnabled: tgReEngage.enabled, reEngageMessage: tgReEngage.message, reEngageStorefrontLink: tgReEngage.storefrontLink, reEngageCustom: true } }) });
                      setWelcomeSaving(null); setWelcomeSaved('telegram'); setTimeout(() => setWelcomeSaved(null), 2000);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                    style={{ background: 'var(--accent-gradient)' }}
                  >
                    {welcomeSaving === 'telegram' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{welcomeSaved === 'telegram' ? 'Saved!' : 'Save Telegram'}
                  </button>
                </div>
                )}

              </div>

              {/* Add override buttons */}
              {(!lineOverrideActive || !igOverrideActive || !tgOverrideActive) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {!lineOverrideActive && (
                    <button
                      onClick={() => setLineOverrideActive(true)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-emerald-400 hover:border-emerald-500/30' : 'border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300'}`}
                    >
                      + Add override for LINE
                    </button>
                  )}
                  {!igOverrideActive && (
                    <button
                      onClick={() => setIgOverrideActive(true)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-pink-400 hover:border-pink-500/30' : 'border-slate-200 text-slate-500 hover:text-pink-600 hover:border-pink-300'}`}
                    >
                      + Add override for Instagram
                    </button>
                  )}
                  {!tgOverrideActive && (
                    <button
                      onClick={() => setTgOverrideActive(true)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-blue-400 hover:border-blue-500/30' : 'border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300'}`}
                    >
                      + Add override for Telegram
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Instagram ── */}
      {section === 'instagram' && (
        <div className="space-y-5">
          {!platformStatus.instagram && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-400 flex-1">Instagram not connected. Add your credentials to enable these features.</p>
              {onGoToSettings && (
                <button onClick={() => onGoToSettings('instagram')} className="text-xs font-bold text-amber-400 border border-amber-500/40 rounded-lg px-2.5 py-1 hover:bg-amber-500/10 transition-colors whitespace-nowrap flex-shrink-0">
                  Set up →
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${k.text}`}>Instagram Tools</p>
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/25">Instagram Exclusive</span>
          </div>
          <p className={`text-xs ${k.muted}`}>Platform-native Instagram features that go beyond standard messaging — conversation menus, quick reply shortcuts, and story interaction handling.</p>

          <div className="grid gap-4">
            {([
              {
                icon: <PanelTop size={18} className="text-pink-400" />,
                title: 'Persistent Menu',
                desc: 'A persistent menu button users can tap any time inside the DM thread. Great for surfacing your store, FAQ, or order tracking without any message.',
                detail: 'Configured via Meta Graph API ice_breakers or persistent_menu endpoint.',
              },
              {
                icon: <MessageCircle size={18} className="text-pink-400" />,
                title: 'Quick Reply Buttons',
                desc: 'Show up to 13 tappable reply buttons after any automated message — ideal for guiding customers to common actions like "Browse" or "My Orders".',
                detail: 'Sent as quick_replies array in the Send API message payload.',
              },
              {
                icon: <Camera size={18} className="text-pink-400" />,
                title: 'Story Reply Handling',
                desc: "Automatically respond when a user replies to one of your Instagram stories — a high-intent touchpoint for discovery and re-engagement.",
                detail: 'Triggered by messaging events where referral.source is "STORY_REPLY".',
              },
            ] as const).map(feat => (
              <div key={feat.title} className={`rounded-2xl p-5 space-y-3 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#1a1d2e]' : 'bg-pink-50'}`}>{feat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${k.text}`}>{feat.title}</p>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${isDark ? 'bg-[#1a1d2e] text-[#8b92ad] border-[#1f2335]' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>Coming Soon</span>
                    </div>
                    <p className={`text-xs mt-1 ${k.muted}`}>{feat.desc}</p>
                    <p className={`text-[10px] mt-2 font-mono ${k.muted} opacity-70`}>{feat.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Telegram ── */}
      {section === 'telegram' && (
        <div className="space-y-5">
          {!platformStatus.telegram && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-400 flex-1">Telegram not connected. Add your Bot Token to enable these features.</p>
              {onGoToSettings && (
                <button onClick={() => onGoToSettings('telegram')} className="text-xs font-bold text-amber-400 border border-amber-500/40 rounded-lg px-2.5 py-1 hover:bg-amber-500/10 transition-colors whitespace-nowrap flex-shrink-0">
                  Set up →
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${k.text}`}>Telegram Tools</p>
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">Telegram Exclusive</span>
          </div>
          <p className={`text-xs ${k.muted}`}>Telegram bot-native features — slash commands, persistent keyboards, and Mini Apps for a richer in-chat experience.</p>

          <div className="grid gap-4">
            {([
              {
                icon: <Terminal size={18} className="text-blue-400" />,
                title: 'Bot Commands',
                desc: 'Register slash commands (/start, /orders, /help) that appear in the Telegram command picker. A tap runs the command instantly — no typing required.',
                detail: 'Registered via setMyCommands Bot API method. Supports scope targeting (private, group, channel).',
              },
              {
                icon: <Keyboard size={18} className="text-blue-400" />,
                title: 'Persistent Keyboard',
                desc: 'A custom reply keyboard that stays visible below the message input — ideal for surfacing "Browse", "My Orders", and other frequent actions without commands.',
                detail: 'Sent as ReplyKeyboardMarkup in any message. Use resize_keyboard and one_time_keyboard flags.',
              },
              {
                icon: <Globe size={18} className="text-blue-400" />,
                title: 'Mini App (Web App)',
                desc: 'Launch a full storefront inside Telegram using the Web App platform — customers browse, add to cart, and checkout without ever leaving the chat.',
                detail: 'Opened via WebApp button in InlineKeyboardMarkup or Menu Button. Supports seamless data transfer with initData.',
              },
            ] as const).map(feat => (
              <div key={feat.title} className={`rounded-2xl p-5 space-y-3 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#1a1d2e]' : 'bg-blue-50'}`}>{feat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${k.text}`}>{feat.title}</p>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${isDark ? 'bg-[#1a1d2e] text-[#8b92ad] border-[#1f2335]' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>Coming Soon</span>
                    </div>
                    <p className={`text-xs mt-1 ${k.muted}`}>{feat.desc}</p>
                    <p className={`text-[10px] mt-2 font-mono ${k.muted} opacity-70`}>{feat.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LINE Tools ── */}
      {section === 'line' && (
        <div className="space-y-5">
          {/* LINE status bar */}
          <StatusBar status={lineStatus} onSync={syncing ? () => {} : handleSync} isDark={isDark} />

          {/* LINE Exclusive header */}
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold ${k.text}`}>LINE Tools</p>
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">LINE Exclusive</span>
          </div>

          {/* Sub-tabs */}
          <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-slate-100'}`}>
            {[
              { id: 'auto-reply' as const, label: 'Auto-Reply', icon: <MessageSquare size={13} /> },
              { id: 'rich-menu'  as const, label: 'Rich Menu',  icon: <LayoutGrid size={13} /> },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setLineSubSection(s.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 ${
                  lineSubSection === s.id
                    ? 'text-white shadow-sm'
                    : isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
                style={lineSubSection === s.id ? { background: 'var(--accent-gradient)' } : undefined}
              >
                {s.icon}{s.label}
              </button>
            ))}
          </div>

          {/* Auto-Reply content */}
          {lineSubSection === 'auto-reply' && (
            <div className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${k.text}`}>Auto-Reply Rules</p>
                  <p className={`text-xs ${k.muted}`}>Keyword-triggered replies sent free via reply token. Checked in priority order.</p>
                </div>
                <button onClick={openNewRule} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-all" style={{ background: 'var(--accent-gradient)' }}>
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

          {/* Rich Menu content */}
          {lineSubSection === 'rich-menu' && (
            <div className="space-y-6">
              {/* Published menus */}
              {richMenus.length > 0 && (
                <div className={`rounded-2xl p-6 space-y-4 ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200'}`}>
                  <p className={`text-sm font-semibold ${k.text}`}>Published Menus</p>
                  {richMenus.map(menu => {
                    const madeByShopenter = menu.name?.startsWith('shopenter-');
                    return (
                      <div key={menu.richMenuId} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-[#1a1d2e] border border-[#1f2335]' : 'bg-slate-50 border border-slate-200'}`}>
                        <div>
                          <p className={`text-sm font-medium ${k.text}`}>{menu.chatBarText || menu.name}</p>
                          <p className={`text-xs ${k.muted}`}>
                            {menu.richMenuId}
                            {menu.richMenuId === defaultRichMenuId && <span className="text-emerald-400 ml-1"> · Default</span>}
                            {!madeByShopenter && <span className="text-amber-400 ml-1"> · Made in LINE Console</span>}
                          </p>
                        </div>
                        {madeByShopenter ? (
                          <button onClick={() => handleDeleteRichMenu(menu.richMenuId)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"><Trash2 size={14} /></button>
                        ) : (
                          <span className={`text-[10px] px-2 py-1 rounded-lg flex-shrink-0 ${isDark ? 'text-[#8b92ad]' : 'text-slate-400'}`} title="Manage this in the LINE Official Account Manager instead">Not Shopenter's</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {previousDefaultRichMenuId && (
                <div className={`rounded-2xl p-4 flex items-center justify-between gap-3 ${isDark ? 'bg-blue-500/5 border border-blue-500/15' : 'bg-blue-50 border border-blue-100'}`}>
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Your original rich menu is safely stored</p>
                    <p className={`text-xs mt-0.5 ${k.muted}`}>The menu that was live before Shopenter took over as default wasn't deleted — you can switch back to it anytime.</p>
                  </div>
                  <button
                    onClick={handleRestoreRichMenu}
                    disabled={rmRestoring}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 border transition-colors disabled:opacity-50 ${isDark ? 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10' : 'border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                  >
                    {rmRestoring ? 'Restoring…' : "Disable Shopenter's menu"}
                  </button>
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
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors text-left ${rmSize === val ? 'text-white border-transparent' : isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}
                          style={rmSize === val ? { background: 'var(--accent-gradient)' } : undefined}>
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
                    <UploadZone accept="image/jpeg,image/png" maxMB={UPLOAD_LIMITS.image} value={rmImageUrl} onUploaded={url => setRmImageUrl(url)} isDark={isDark} isLite={isLite} previewType="image" />
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
                    onClick={() => setShowRmPublishConfirm(true)}
                    disabled={rmSaving || !rmImageUrl}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--accent-gradient)' }}>
                    {rmSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    {rmSaving ? 'Publishing…' : 'Publish Rich Menu'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Send confirmation ── */}
      {scMounted && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={scVisible ? 'open' : 'closed'}>
          <div className={`modal-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}
            data-state={scVisible ? 'open' : 'closed'}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border}`}>
              <p className={`text-sm font-semibold ${k.text}`}>Confirm Broadcast</p>
              <button onClick={() => setShowSendConfirm(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-[#0f1117] border border-amber-500/20' : 'bg-amber-50 border border-amber-200'} flex items-start gap-3`}>
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>This cannot be undone</p>
                  <p className={`text-xs ${k.muted}`}>Messages will be sent immediately to every customer in the selected audience. LINE does not support recall.</p>
                </div>
              </div>
              <div className={`rounded-xl px-4 py-3 space-y-2 ${isDark ? 'bg-[#0f1117]' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-widest ${k.muted}`}>Audience</span>
                  <span className={`text-sm font-medium ${k.text}`}>{AUDIENCE_LABELS[bAudience] ?? bAudience}</span>
                </div>
                {bName && (
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold uppercase tracking-widest ${k.muted}`}>Campaign</span>
                    <span className={`text-sm font-medium ${k.text}`}>{bName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-widest ${k.muted}`}>Platforms</span>
                  <span className={`text-sm font-medium ${k.text}`}>{bPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}</span>
                </div>
              </div>
            </div>
            <div className={`flex gap-2 px-6 py-4 border-t ${k.border}`}>
              <button
                onClick={handleInstantSend}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
                style={{ background: 'var(--accent-gradient)' }}
              >
                <Send size={14} /> Send Now
              </button>
              <button onClick={() => setShowSendConfirm(false)} className={`px-4 py-2 rounded-xl text-sm border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rich menu publish confirmation ── */}
      {rmpMounted && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={rmpVisible ? 'open' : 'closed'}>
          <div className={`modal-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}
            data-state={rmpVisible ? 'open' : 'closed'}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border}`}>
              <p className={`text-sm font-semibold ${k.text}`}>Publish this rich menu?</p>
              <button onClick={() => setShowRmPublishConfirm(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}><X size={16} /></button>
            </div>
            <div className="p-6">
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-[#0f1117] border border-amber-500/20' : 'bg-amber-50 border border-amber-200'} flex items-start gap-3`}>
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>This replaces your current default menu</p>
                  <p className={`text-xs ${k.muted}`}>Every customer will immediately see this menu instead — including if your current default was one you built directly in the LINE Official Account Manager. It won&apos;t be deleted; you&apos;ll be able to switch back to it from this page afterward.</p>
                </div>
              </div>
            </div>
            <div className={`flex gap-2 px-6 py-4 border-t ${k.border}`}>
              <button
                onClick={handlePublishRichMenu}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
                style={{ background: 'var(--accent-gradient)' }}
              >
                Publish anyway
              </button>
              <button onClick={() => setShowRmPublishConfirm(false)} className={`px-4 py-2 rounded-xl text-sm border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Native LINE feature conflict acknowledgment ── */}
      {nativeAckMounted && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={nativeAckVisible ? 'open' : 'closed'}>
          <div className={`modal-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}
            data-state={nativeAckVisible ? 'open' : 'closed'}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${k.border}`}>
              <p className={`text-sm font-semibold ${k.text}`}>Before you turn this on</p>
              <button onClick={() => setNativeAckPrompt(null)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-[#8b92ad] hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}><X size={16} /></button>
            </div>
            <div className="p-6">
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-[#0f1117] border border-amber-500/20' : 'bg-amber-50 border border-amber-200'} flex items-start gap-3`}>
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {nativeAckPrompt === 'greeting' ? 'Check your LINE OA’s own Greeting message' : 'Check your LINE OA’s own Auto-response messages'}
                  </p>
                  <p className={`text-xs ${k.muted}`}>
                    Shopenter can&apos;t see whether {nativeAckPrompt === 'greeting' ? "LINE's native Greeting message" : "LINE's native Auto-response messages"} are already turned on in your LINE Official Account Manager (Settings → Response settings) — that&apos;s configured entirely on LINE&apos;s side. If it&apos;s on, customers may get two messages: LINE&apos;s and Shopenter&apos;s. Go turn it off there first if you haven&apos;t already.
                  </p>
                </div>
              </div>
            </div>
            <div className={`flex gap-2 px-6 py-4 border-t ${k.border}`}>
              <button
                onClick={confirmNativeAck}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
                style={{ background: 'var(--accent-gradient)' }}
              >
                I&apos;ve checked — turn this on
              </button>
              <button onClick={() => setNativeAckPrompt(null)} className={`px-4 py-2 rounded-xl text-sm border transition-colors ${isDark ? 'border-[#1f2335] text-[#8b92ad] hover:text-white' : 'border-slate-200 text-slate-500'}`}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-reply modal ── */}
      {rmMounted && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          data-state={rmVisible ? 'open' : 'closed'}>
          <div className={`modal-panel w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white'}`}
            data-state={rmVisible ? 'open' : 'closed'}>
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
                <BlockComposer blocks={rMessages} onChange={setRMessages} isDark={isDark} isLite={isLite} />
              </div>
            </div>
            <div className={`flex gap-2 px-6 py-4 border-t ${k.border}`}>
              <button onClick={handleSaveRule} disabled={rSaving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50" style={{ background: 'var(--accent-gradient)' }}>
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

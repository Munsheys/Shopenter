'use client';

import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface FieldWithHintProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint: string;
  formatHint?: string;
  example?: string;
  link?: string;
  linkLabel?: string;
  isDark?: boolean;
  isLite?: boolean;
  validation?: {
    status: 'valid' | 'invalid' | 'checking' | 'empty';
    message: string;
  };
  placeholder?: string;
  type?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export default function FieldWithHint({
  label,
  value,
  onChange,
  hint,
  formatHint,
  example,
  link,
  linkLabel,
  isDark = false,
  isLite = false,
  validation,
  placeholder,
  type = 'text',
  showPassword = false,
  onTogglePassword
}: FieldWithHintProps) {
  const [showHint, setShowHint] = useState(false);

  const inputCls = `w-full rounded-xl px-4 py-3 text-sm border transition-colors focus:outline-none ${
    isDark
      ? 'bg-[#1a1d2e] border-[#1f2335] text-white placeholder-[#8b92ad] focus:border-accent'
      : isLite
      ? 'bg-[#f0f3f8] border-[#cdd3dd] text-[#2f3744] placeholder-[#7a8598] focus:border-accent'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-accent'
  }`;

  const hintColor = validation?.status === 'valid' ? 'text-green-500' : validation?.status === 'invalid' ? 'text-red-500' : isDark ? 'text-[#8b92ad]' : 'text-slate-500';
  const muted = isDark ? 'text-[#8b92ad]' : isLite ? 'text-[#6d7a8c]' : 'text-slate-500';

  return (
    <div className="space-y-2">
      <label className={`block text-xs font-bold uppercase tracking-widest ${muted}`}>
        {label}
        {validation?.status === 'valid' && <CheckCircle2 size={14} className="inline ml-2 text-green-500" />}
        {validation?.status === 'invalid' && <AlertCircle size={14} className="inline ml-2 text-red-500" />}
      </label>

      <div className="relative">
        <input
          type={type === 'password' && !showPassword ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
        {type === 'password' && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium ${muted} hover:opacity-70`}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {/* Validation Message */}
      {validation && (
        <div className={`text-[10px] font-medium ${hintColor}`}>
          {validation.status === 'checking' && '⏳ Validating...'}
          {validation.status === 'valid' && '✅ ' + validation.message}
          {validation.status === 'invalid' && '❌ ' + validation.message}
        </div>
      )}

      {/* Format Hint */}
      {formatHint && (
        <div className={`text-[10px] ${muted}`}>
          📋 {formatHint}
        </div>
      )}

      {/* Example */}
      {example && (
        <div className={`text-[10px] ${muted} bg-white/3 rounded px-2 py-1 font-mono`}>
          Example: {example}
        </div>
      )}

      {/* Collapsible Hint */}
      {hint && (
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className={`text-[10px] font-medium ${muted} hover:opacity-70 transition-opacity`}
        >
          {showHint ? '▼' : '▶'} {hint}
        </button>
      )}

      {/* Link */}
      {link && linkLabel && showHint && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-accent hover:underline flex items-center gap-1 mt-1"
        >
          → {linkLabel}
          <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

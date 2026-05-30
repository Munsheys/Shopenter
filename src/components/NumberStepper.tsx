'use client';

export default function NumberStepper({
  value, onChange, min, max, step = 1, isDark, disabled = false, size = 'md', label,
}: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
  isDark?: boolean; disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const clamp = (v: number) => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v));
  const h = size === 'sm' ? 'h-9' : 'h-11';
  const px = size === 'sm' ? 'w-10' : 'w-11';
  const txtSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const divider = `w-px self-stretch ${isDark ? 'bg-[#2a2f45]' : 'bg-slate-200'}`;
  const btnCls = `${px} ${h} flex items-center justify-center text-base font-bold flex-shrink-0 transition-colors disabled:opacity-25
    ${isDark ? 'text-[#8b92ad] hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`;
  return (
    <div className={`flex items-center ${h} rounded-xl border overflow-hidden ${isDark ? 'bg-[#0f1117] border-[#2a2f45]' : 'bg-white border-slate-200'}`}>
      <button
        type="button"
        aria-label={`Decrease ${label ?? 'value'}`}
        disabled={disabled || (min !== undefined && value <= min)}
        onClick={() => onChange(clamp(value - step))}
        className={btnCls}
      >−</button>
      <div className={divider} />
      <input
        type="number"
        value={value}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        aria-label={label ?? 'quantity'}
        onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(clamp(n)); }}
        className={`flex-1 min-w-0 text-center ${txtSize} font-semibold bg-transparent outline-none py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDark ? 'text-white' : 'text-slate-800'}`}
      />
      <div className={divider} />
      <button
        type="button"
        aria-label={`Increase ${label ?? 'value'}`}
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(clamp(value + step))}
        className={btnCls}
      >+</button>
    </div>
  );
}

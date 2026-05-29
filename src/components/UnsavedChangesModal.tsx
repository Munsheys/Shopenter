import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UnsavedChangesModalProps {
  isOpen: boolean;
  theme?: 'light' | 'lite' | 'dark';
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export default function UnsavedChangesModal({
  isOpen,
  theme = 'dark',
  onSave,
  onDiscard,
  onCancel,
  isSaving = false,
}: UnsavedChangesModalProps) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';

  // Fix 12: dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    // Fix 12: role="dialog", aria-modal, aria-labelledby
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        className={cn(
          "rounded-2xl border shadow-2xl p-6 max-w-md w-full mx-4 space-y-4",
          isDark ? "bg-[#161925] border-[#1f2335]" : isLite ? "bg-[#e7ecf3] border-[#cdd3dd]" : "bg-white border-[#e2e5ef]"
        )}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            isDark ? "bg-amber-500/20 text-amber-500" : isLite ? "bg-amber-200 text-amber-700" : "bg-amber-100 text-amber-600"
          )}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            {/* Fix 12: id for aria-labelledby */}
            <h3
              id="unsaved-title"
              className={cn(
                "text-base font-bold",
                isDark ? "text-white" : isLite ? "text-[#2f3744]" : "text-[#1a1d2e]"
              )}
            >
              Unsaved Changes
            </h3>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-[#8b92ad]" : isLite ? "text-[#6d7a8c]" : "text-[#8b92ad]"
            )}>
              Do you want to save your changes before leaving?
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            autoFocus
            onClick={onCancel}
            disabled={isSaving}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border",
              isDark
                ? "border-[#1f2335] text-[#8b92ad] hover:bg-white/5 disabled:opacity-50"
                : isLite
                ? "border-[#cdd3dd] text-[#6d7a8c] hover:bg-[#d9dfe8] disabled:opacity-50"
                : "border-[#e2e5ef] text-[#8b92ad] hover:bg-[#f4f6f9] disabled:opacity-50"
            )}
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border",
              isDark
                ? "border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                : isLite
                ? "border-red-400 text-red-700 hover:bg-red-100 disabled:opacity-50"
                : "border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            )}
          >
            Discard
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            // Fix 13: visually distinct muted state while saving (opacity-60 on save button)
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all text-white flex items-center justify-center gap-2",
              isSaving ? "opacity-60" : "hover:opacity-90"
            )}
            style={{ background: 'var(--accent)' }}
          >
            {/* Fix 13: aria-live so screen readers announce saving state */}
            <span aria-live="polite">
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin inline-block" />
                  Saving...
                </span>
              ) : (
                'Save & Continue'
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}


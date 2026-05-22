import React from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={cn(
        "rounded-2xl border shadow-2xl p-6 max-w-md w-full mx-4 space-y-4",
        isDark ? "bg-[#161925] border-[#1f2335]" : isLite ? "bg-[#e7ecf3] border-[#cdd3dd]" : "bg-white border-gray-200"
      )}>
        {/* Icon + Title */}
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            isDark ? "bg-amber-500/20 text-amber-500" : isLite ? "bg-amber-200 text-amber-700" : "bg-amber-100 text-amber-600"
          )}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-base font-bold",
              isDark ? "text-white" : isLite ? "text-[#2f3744]" : "text-gray-900"
            )}>
              Unsaved Changes
            </h3>
            <p className={cn(
              "text-sm mt-1",
              isDark ? "text-[#8b92ad]" : isLite ? "text-[#6d7a8c]" : "text-gray-500"
            )}>
              Do you want to save your changes before leaving?
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all border",
              isDark
                ? "border-[#1f2335] text-[#8b92ad] hover:bg-white/5 disabled:opacity-50"
                : isLite
                ? "border-[#cdd3dd] text-[#6d7a8c] hover:bg-[#d9dfe8] disabled:opacity-50"
                : "border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: isSaving ? 'var(--accent)' : 'var(--accent)', opacity: isSaving ? 0.8 : 1 }}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

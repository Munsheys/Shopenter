"use client";

import React, { useState, useEffect } from 'react';
import { HelpCircle, Send, CheckCircle2, MessageSquare, AlertCircle, Sparkles, Loader2, MessageSquareCode } from 'lucide-react';
import LoadingView from './LoadingView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FeedbackItem {
  _id: string;
  category: 'feature' | 'bug' | 'opinion' | 'other';
  content: string;
  status: 'new' | 'reviewing' | 'planned' | 'completed';
  createdAt: string;
}

export default function FeedbackView({ theme }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';

  const [category, setCategory] = useState<'feature' | 'bug' | 'opinion' | 'other'>('opinion');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch {}
    finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content: content.trim() })
      });

      if (res.ok) {
        setContent('');
        setSuccess(true);
        fetchHistory();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to submit feedback');
      }
    } catch {
      setError('A connection error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStyles = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'new':
        return isDark 
          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
          : 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'reviewing':
        return isDark 
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
          : 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'planned':
        return isDark 
          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
          : 'bg-purple-50 text-purple-600 border border-purple-100';
      case 'completed':
        return isDark 
          ? 'bg-[#00b900]/10 text-[#00b900] border border-[#00b900]/20' 
          : 'bg-green-50 text-[#00b900] border border-green-100';
    }
  };

  const getCategoryLabel = (cat: FeedbackItem['category']) => {
    switch (cat) {
      case 'feature': return 'Feature Request';
      case 'bug': return 'Bug Report';
      case 'opinion': return 'Opinion / Feedback';
      case 'other': return 'Other Inquiry';
    }
  };

  const categories = [
    { id: 'opinion', label: 'Opinion & Feedback', icon: <MessageSquare size={14} />, desc: 'General thoughts or overall design opinions' },
    { id: 'feature', label: 'Feature Request', icon: <Sparkles size={14} />, desc: 'Suggest new abilities, enhancements or workflows' },
    { id: 'bug', label: 'Bug Report', icon: <AlertCircle size={14} />, desc: 'Report errors, performance glitches or weird UI lag' },
    { id: 'other', label: 'Other', icon: <HelpCircle size={14} />, desc: 'Any other topics or operational questions' },
  ] as const;

  const K = {
    bg: isDark ? 'bg-[#0f1117]' : 'bg-slate-50',
    surface: isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-900',
    muted: isDark ? 'text-[#8b92ad]' : 'text-slate-500',
    input: isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white focus:border-[#00b900]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#00b900]',
    card: isDark ? 'bg-[#1a1d2e]/50 border border-[#1f2335]' : 'bg-slate-50 border border-slate-100',
  };

  return (
    <div className={cn("flex-1 overflow-y-auto p-6 space-y-8", K.bg)}>
      
      {/* Title Header */}
      <div className="max-w-4xl mx-auto">
        <h2 className={cn("text-xl font-bold", K.text)}>Feedback & Opinions</h2>
        <p className={cn("text-xs mt-1", K.muted)}>Help us improve Shopenter. Share your opinions, submit feature requests, or report system bugs.</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Left: Input Form */}
        <div className={cn("rounded-2xl p-6 space-y-6 lg:col-span-3", K.surface)}>
          <p className={cn("text-sm font-semibold", K.text)}>Tell Us Your Mind</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Category Select Buttons */}
            <div className="space-y-2">
              <label className={cn("text-[10px] font-bold uppercase tracking-wider", K.muted)}>Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all active:scale-98 flex flex-col gap-1.5",
                      category === cat.id
                        ? "border-[#00b900] bg-[#00b900]/5 text-[#00b900] shadow-sm shadow-[#00b900]/5"
                        : isDark
                          ? "border-[#1f2335] bg-[#1a1d2e]/50 text-[#8b92ad] hover:border-[#00b900]/30"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#00b900]/30"
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      {cat.icon}
                      {cat.label}
                    </span>
                    <span className="text-[9px] leading-tight opacity-75">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <label className={cn("text-[10px] font-bold uppercase tracking-wider", K.muted)}>Details</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Please describe what is on your mind, what improvements you would like to see, or any issues you encountered..."
                rows={6}
                required
                className={cn(
                  "w-full rounded-2xl p-4 text-xs outline-none border focus:ring-1 focus:ring-[#00b900] transition-all resize-none leading-relaxed",
                  K.input
                )}
              />
            </div>

            {/* Success and Error Indicators */}
            {success && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl text-xs font-bold text-[#00b900] bg-[#00b900]/10 border border-[#00b900]/20 animate-in fade-in zoom-in-95">
                <CheckCircle2 size={16} />
                <span>Thank you! Your feedback has been received and sent directly to the project director.</span>
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 animate-in fade-in zoom-in-95">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className={cn(
                "w-full py-3.5 rounded-xl text-xs font-bold shadow-lg shadow-[#00b900]/10 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50",
                "bg-[#00b900] text-white hover:bg-[#00a300]"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Submitting Opinion...
                </>
              ) : (
                <>
                  <Send size={13} />
                  Submit Feedback
                </>
              )}
            </button>

          </form>
        </div>

        {/* Right: Submission History */}
        <div className={cn("rounded-2xl p-6 space-y-6 lg:col-span-2 flex flex-col min-h-[400px]", K.surface)}>
          <div className="flex items-center justify-between border-b pb-4 border-[#1f2335]/10 dark:border-[#1f2335]">
            <p className={cn("text-sm font-semibold", K.text)}>Feedback History</p>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1a1d2e]", K.muted)}>
              {history.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: '420px' }}>
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#8b92ad]">
                <Loader2 size={24} className="animate-spin text-[#00b900]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Syncing opinions history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <MessageSquareCode size={36} className="opacity-20 text-[#8b92ad]" />
                <p className={cn("text-xs font-bold", K.text)}>No Feedback Submitted Yet</p>
                <p className={cn("text-[10px] max-w-[200px] leading-relaxed mx-auto", K.muted)}>Your opinion matters. Submit your thoughts on the left and see them here!</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item._id} className={cn("p-4 rounded-xl space-y-3 animate-in fade-in duration-300", K.card)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md", getStatusStyles(item.status))}>
                      {item.status}
                    </span>
                    <span className={cn("text-[9px] font-medium", K.muted)}>
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className={cn("text-[10px] font-extrabold block mb-1", K.text)}>
                      {getCategoryLabel(item.category)}
                    </span>
                    <p className={cn("text-[10px] leading-relaxed whitespace-pre-wrap", K.muted)}>
                      {item.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

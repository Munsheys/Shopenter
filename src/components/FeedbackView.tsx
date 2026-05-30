"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle, Send, CheckCircle2, MessageSquare, AlertCircle, Sparkles,
  Loader2, MessageSquareCode, Trash2, ArrowLeft, User, ShieldAlert
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Reply {
  sender: 'admin' | 'merchant';
  content: string;
  createdAt: string;
}

interface FeedbackItem {
  _id: string;
  category: 'feature' | 'bug' | 'opinion' | 'other';
  content: string;
  status: 'new' | 'reviewing' | 'planned' | 'completed';
  replies?: Reply[];
  createdAt: string;
}

export default function FeedbackView({ theme }: { theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';

  const [category, setCategory] = useState<'feature' | 'bug' | 'opinion' | 'other'>('opinion');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState('');

  const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async (autoSelectId?: string) => {
    setHistoryError('');
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        if (autoSelectId) {
          const fresh = data.find((x: FeedbackItem) => x._id === autoSelectId);
          if (fresh) setSelectedFeedback(fresh);
        } else if (selectedFeedback) {
          const fresh = data.find((x: FeedbackItem) => x._id === selectedFeedback._id);
          if (fresh) setSelectedFeedback(fresh);
        }
      } else {
        setHistoryError('Could not load feedback history.');
      }
    } catch {
      setHistoryError('Network error loading history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape handler for delete modal
  useEffect(() => {
    if (!feedbackToDelete) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFeedbackToDelete(null);
    };
    window.addEventListener('keydown', handler);
    // Focus Cancel button
    deleteModalRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [feedbackToDelete]);

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
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setSuccess(false), 4000);
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedFeedback || isReplying) return;

    setIsReplying(true);
    setReplyError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          feedbackId: selectedFeedback._id,
          content: replyText.trim()
        })
      });

      if (res.ok) {
        setReplyText('');
        await fetchHistory(selectedFeedback._id);
      } else {
        setReplyError('Failed to send reply. Please try again.');
      }
    } catch {
      setReplyError('Network error. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/feedback?id=${feedbackToDelete._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        if (selectedFeedback?._id === feedbackToDelete._id) {
          setSelectedFeedback(null);
        }
        setFeedbackToDelete(null);
        await fetchHistory();
      } else {
        setFeedbackToDelete(null);
        setHistoryError('Failed to delete feedback.');
      }
    } catch {
      setFeedbackToDelete(null);
      setHistoryError('Network error. Could not delete feedback.');
    } finally {
      setIsDeleting(false);
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
          ? 'bg-accent/10 text-accent border border-accent/20'
          : 'bg-accent/5 text-accent border border-green-100';
    }
  };

  const getCategoryLabel = (cat: FeedbackItem['category']) => {
    switch (cat) {
      case 'feature': return 'Feature Request';
      case 'bug':     return 'Bug Report';
      case 'opinion': return 'Opinion / Feedback';
      case 'other':   return 'Other Inquiry';
    }
  };

  const categories = [
    { id: 'opinion', label: 'Opinion & Feedback', icon: <MessageSquare size={14} />, desc: 'General thoughts or overall design opinions' },
    { id: 'feature', label: 'Feature Request',    icon: <Sparkles size={14} />,       desc: 'Suggest new abilities, enhancements or workflows' },
    { id: 'bug',     label: 'Bug Report',          icon: <AlertCircle size={14} />,    desc: 'Report errors, performance glitches or weird UI lag' },
    { id: 'other',   label: 'Other',               icon: <HelpCircle size={14} />,     desc: 'Any other topics or operational questions' },
  ] as const;

  const K = {
    bg:      isDark ? 'bg-[#0f1117]' : 'bg-slate-50',
    surface: isDark ? 'bg-[#161925] border border-[#1f2335]' : 'bg-white border border-slate-200',
    text:    isDark ? 'text-white' : 'text-slate-900',
    muted:   isDark ? 'text-[#8b92ad]' : 'text-slate-500',
    input:   isDark ? 'bg-[#1a1d2e] border-[#1f2335] text-white focus:border-accent' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-accent',
    card:    isDark ? 'bg-[#1a1d2e]/50 border border-[#1f2335]' : 'bg-slate-50 border border-slate-100',
  };

  return (
    <div className={cn("flex-1 overflow-y-auto p-6 space-y-8 relative", K.bg)}>

      <div className="max-w-4xl mx-auto">
        <h2 className={cn("text-xl font-bold", K.text)}>Feedback & Opinions</h2>
        <p className={cn("text-xs mt-1", K.muted)}>Help us improve Shopenter. Share your opinions, submit feature requests, or report system bugs.</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        {/* Left: Input Form */}
        <div className={cn("rounded-2xl p-6 space-y-6 lg:col-span-3", K.surface)}>
          <p className={cn("text-sm font-semibold", K.text)}>Tell Us Your Mind</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Category Select — radio group */}
            <div className="space-y-2">
              <span id="category-label" className={cn("text-[11px] font-bold uppercase tracking-wider block", K.muted)}>Category</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="category-label">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    role="radio"
                    aria-checked={category === cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all active:scale-98 flex flex-col gap-1.5",
                      category === cat.id
                        ? "border-accent bg-accent/5 text-accent shadow-sm shadow-accent/5"
                        : isDark
                          ? "border-[#1f2335] bg-[#1a1d2e]/50 text-[#8b92ad] hover:border-accent/30"
                          : "border-slate-200 bg-white text-slate-600 hover:border-accent/30"
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      {cat.icon}
                      {cat.label}
                    </span>
                    <span className="text-[11px] leading-tight opacity-75">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <label htmlFor="feedback-details" className={cn("text-[11px] font-bold uppercase tracking-wider", K.muted)}>Details</label>
              <textarea
                id="feedback-details"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Please describe what is on your mind, what improvements you would like to see, or any issues you encountered..."
                rows={6}
                required
                className={cn(
                  "w-full rounded-2xl p-4 text-xs outline-none border focus:ring-1 focus:ring-accent transition-all resize-none leading-relaxed",
                  K.input
                )}
              />
            </div>

            {success && (
              <div role="alert" className="flex items-center gap-2 p-3.5 rounded-xl text-xs font-bold text-accent bg-accent/10 border border-accent/20 animate-in fade-in zoom-in-95">
                <CheckCircle2 size={16} />
                <span>Thank you! Your feedback has been received and sent directly to the project director.</span>
              </div>
            )}

            {error && (
              <div role="alert" className="flex items-center gap-2 p-3.5 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 animate-in fade-in zoom-in-95">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className={cn(
                "w-full py-3.5 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50",
                "text-white hover:opacity-90"
              )}
              style={{ background: 'var(--accent-gradient)' }}
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

        {/* Right: Submission History / Conversation Console */}
        <div className={cn("rounded-2xl p-6 space-y-6 lg:col-span-2 flex flex-col min-h-[460px] relative overflow-hidden", K.surface)}>

          {selectedFeedback ? (
            <div className="flex flex-col h-full flex-1 animate-in slide-in-from-right duration-200">

              {/* Thread Header */}
              <div className={cn("flex items-center justify-between border-b pb-4", isDark ? 'border-[#1f2335]' : 'border-slate-100')}>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  aria-label="Back to feedback list"
                  className={cn("flex items-center gap-1 text-[11px] font-extrabold hover:text-accent transition-colors p-2 -ml-2 rounded-lg", K.muted)}
                >
                  <ArrowLeft size={12} />
                  Back
                </button>

                <span className={cn("text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md", getStatusStyles(selectedFeedback.status))}>
                  {selectedFeedback.status}
                </span>

                <button
                  onClick={() => setFeedbackToDelete(selectedFeedback)}
                  aria-label="Delete this feedback"
                  className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Thread Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 max-h-[300px]" style={{ minHeight: '260px' }}>

                <div className="flex flex-col gap-1 items-end">
                  <div className={cn("px-4 py-3 rounded-2xl rounded-tr-sm text-[11px] leading-relaxed max-w-[85%] border shadow-sm",
                    isDark ? 'bg-accent/10 border-accent/20 text-white' : 'bg-accent/5 border-green-100 text-slate-800'
                  )}>
                    <span className="text-[11px] font-extrabold text-accent block mb-1 uppercase tracking-wide">
                      {getCategoryLabel(selectedFeedback.category)} (Submission)
                    </span>
                    <p className="whitespace-pre-wrap">{selectedFeedback.content}</p>
                    <span className={cn("text-[11px] mt-1.5 block text-right font-medium opacity-60")}>
                      {new Date(selectedFeedback.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {selectedFeedback.replies && selectedFeedback.replies.length > 0 ? (
                  selectedFeedback.replies.map((rep, idx) => {
                    const isAdmin = rep.sender === 'admin';
                    return (
                      <div
                        key={`${rep.createdAt}-${rep.sender}-${idx}`}
                        className={cn("flex flex-col gap-1", isAdmin ? "items-start" : "items-end")}
                      >
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-[11px] leading-relaxed max-w-[85%] border shadow-sm",
                          isAdmin
                            ? isDark
                              ? 'bg-[#1a1d2e] border-[#1f2335] rounded-tl-sm text-white'
                              : 'bg-slate-100 border-slate-200 rounded-tl-sm text-slate-800'
                            : isDark
                              ? 'bg-accent/10 border-accent/20 rounded-tr-sm text-white'
                              : 'bg-accent/5 border-green-100 rounded-tr-sm text-slate-800'
                        )}>
                          <span className={cn("text-[11px] font-black block mb-1 uppercase tracking-wider",
                            isAdmin ? "text-blue-400" : "text-accent"
                          )}>
                            {isAdmin ? 'System Administrator' : 'You (Merchant)'}
                          </span>
                          <p className="whitespace-pre-wrap">{rep.content}</p>
                          <span className="text-[11px] mt-1.5 block text-right font-medium opacity-65">
                            {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center">
                    <p className={cn("text-[11px] font-bold uppercase tracking-wider", K.muted)}>Awaiting Admin Review</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[180px] mx-auto leading-relaxed">
                      We have notified the project director. Administrative responses will appear directly here.
                    </p>
                  </div>
                )}
              </div>

              {/* Reply Input Bar */}
              <div className={cn("border-t pt-4", isDark ? 'border-[#1f2335]' : 'border-slate-100')}>
                {replyError && (
                  <p role="alert" className="text-[11px] text-red-500 mb-2">{replyError}</p>
                )}
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Reply to admin"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a response to the admin..."
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2 text-[11px] outline-none border focus:border-accent transition-colors",
                      K.input
                    )}
                    required
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isReplying}
                    aria-label="Send reply"
                    className="px-4 rounded-xl text-white hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
                    style={{ background: 'var(--accent-gradient)' }}
                  >
                    {isReplying ? <Loader2 size={12} className="animate-spin" /> : <Send size={11} />}
                  </button>
                </form>
              </div>

            </div>
          ) : (

            /* Feedback History List */
            <div className="flex flex-col h-full flex-1">
              <div className={cn("flex items-center justify-between border-b pb-4", isDark ? 'border-[#1f2335]' : 'border-slate-100')}>
                <p className={cn("text-sm font-semibold", K.text)}>Feedback History</p>
                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", isDark ? 'bg-[#1a1d2e]' : 'bg-slate-100', K.muted)}>
                  {history.length}
                </span>
              </div>

              {historyError && (
                <p role="alert" className="text-[11px] text-red-500 mt-2">{historyError}</p>
              )}

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-4 max-h-[380px]" style={{ minHeight: '320px' }}>
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#8b92ad]" role="status" aria-live="polite">
                    <Loader2 size={24} className="animate-spin text-accent" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Syncing opinions history...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <MessageSquareCode size={36} className="opacity-20 text-[#8b92ad]" aria-hidden="true" />
                    <p className={cn("text-xs font-bold", K.text)}>No Feedback Submitted Yet</p>
                    <p className={cn("text-[11px] max-w-[200px] leading-relaxed mx-auto", K.muted)}>Your opinion matters. Submit your thoughts on the left and track conversations here!</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedFeedback(item)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedFeedback(item); }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open feedback: ${getCategoryLabel(item.category)}`}
                      className={cn("p-4 rounded-xl space-y-3 cursor-pointer hover:border-accent/30 transition-all active:scale-99 animate-in fade-in duration-300 focus-visible:outline-2 focus-visible:outline-accent", K.card)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md", getStatusStyles(item.status))}>
                          {item.status}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.replies && item.replies.length > 0 && (
                            <span className="text-[11px] font-bold bg-accent text-white px-1.5 py-0.5 rounded-full">
                              {item.replies.length} replies
                            </span>
                          )}
                          <span className={cn("text-[11px] font-medium", K.muted)}>
                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className={cn("text-[11px] font-extrabold block mb-1", K.text)}>
                            {getCategoryLabel(item.category)}
                          </span>
                          <p className={cn("text-[11px] leading-relaxed whitespace-pre-wrap truncate", K.muted)}>
                            {item.content}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Delete feedback: ${getCategoryLabel(item.category)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFeedbackToDelete(item);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 mt-0.5 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {feedbackToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setFeedbackToDelete(null); }}
        >
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-feedback-title"
            className={cn("max-w-sm w-full rounded-[24px] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200",
              isDark ? 'bg-[#161925] border border-[#1f2335] text-white' : 'bg-white border border-slate-100 text-slate-900'
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500 animate-pulse" aria-hidden="true">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 id="delete-feedback-title" className="text-sm font-bold tracking-tight">Delete Feedback Report?</h4>
                <p className={cn("text-[11px] leading-relaxed", K.muted)}>
                  Warning: Deleting this report is permanent. It will instantly remove all messages and response threads from both your history and the Super Admin control desk.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFeedbackToDelete(null)}
                disabled={isDeleting}
                className={cn("px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all border",
                  isDark
                    ? 'bg-[#1a1d2e] border-transparent text-[#8b92ad] hover:bg-white/5 hover:text-white'
                    : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFeedback}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/10 transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={12} />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import AuthShell from '@/components/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/merchant/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show the same success state — the endpoint deliberately never reveals
      // whether the email is registered.
      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      heading={<>Reset your <span className="text-green-400">password</span>.</>}
      description="We'll send a reset link to your registered email, or via LINE if you've linked your account."
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot your password?</h1>
      <p className="text-gray-600 mb-8 text-sm">Enter your account email and we&apos;ll send you a reset link.</p>

      {sent ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-4 flex items-start gap-3">
          <MailCheck size={18} className="flex-shrink-0 mt-0.5" />
          <span>If that email is registered, we&apos;ve sent a password reset link — check your email or LINE, whichever your account uses.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}
          <div>
            <label htmlFor="fp-email" className="block text-sm font-semibold text-gray-800 mb-1">Email</label>
            <input
              id="fp-email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 text-sm transition flex items-center justify-center gap-2 min-h-[44px]"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" />Sending...</> : 'Send reset link'}
          </button>
        </form>
      )}

      <Link href="/login" className="mt-8 flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-green-600">
        <ArrowLeft size={14} /> Back to sign in
      </Link>
    </AuthShell>
  );
}

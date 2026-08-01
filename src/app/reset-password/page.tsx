'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthShell from '@/components/AuthShell';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/merchant/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password'); return; }
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell heading={<>Reset your <span className="text-green-400">password</span>.</>} description="Set a new password for your Shopenter account.">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          This reset link is missing its token. Please use the link from your email or LINE message,
          or <Link href="/forgot-password" className="underline font-medium">request a new one</Link>.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heading={<>Reset your <span className="text-green-400">password</span>.</>}
      description="Set a new password for your Shopenter account."
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Choose a new password</h1>
      <p className="text-gray-600 mb-8 text-sm">This link expires 1 hour after it was sent.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}
        <div>
          <label htmlFor="rp-password" className="block text-sm font-semibold text-gray-800 mb-1">New password</label>
          <div className="relative">
            <input
              id="rp-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 text-sm transition flex items-center justify-center gap-2 min-h-[44px]"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" />Resetting...</> : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7faf8]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

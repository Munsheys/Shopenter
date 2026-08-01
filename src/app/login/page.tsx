'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ChevronDown } from 'lucide-react';
import LineLoginButton from '@/components/LineLoginButton';
import AuthShell from '@/components/AuthShell';

const LINE_ERROR_MESSAGES: Record<string, string> = {
  email_exists: 'An account with this email already exists — sign in with your password instead.',
  line_auth_failed: 'LINE sign-in failed. Please try again or use your email and password.',
  access_denied: 'LINE sign-in was cancelled.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get('from') || '/dashboard';
  // Prevent open-redirect: only allow relative paths
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode) {
      setError(LINE_ERROR_MESSAGES[errorCode] || 'Something went wrong signing in with LINE. Please try again.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/merchant/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      router.push(from);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      heading={<>Welcome back to <span className="text-green-400">your store</span>.</>}
      description="Sign in to manage orders, products, and customers for your LINE OA store."
    >
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in to your store</h1>
        <p className="text-gray-600 mb-8 text-sm">Manage orders, products, and customers</p>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        <LineLoginButton variant="primary" size="lg" className="w-full mb-3" label="Sign in with LINE" />
        <p className="text-xs text-gray-500 text-center mb-7">
          By continuing with LINE you agree to our{' '}
          <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Privacy Policy</a>
        </p>

        <button
          type="button"
          onClick={() => setShowEmailForm(v => !v)}
          aria-expanded={showEmailForm}
          aria-controls="login-email-form"
          className="w-full flex items-center gap-3 mb-2 group"
        >
          <span className="flex-1 h-px bg-gray-200" />
          <span className="flex items-center gap-1 text-xs text-gray-500 font-medium group-hover:text-gray-700">
            or continue with email
            <ChevronDown size={14} className={`transition-transform ${showEmailForm ? 'rotate-180' : ''}`} />
          </span>
          <span className="flex-1 h-px bg-gray-200" />
        </button>

        {showEmailForm && (
          <form id="login-email-form" onSubmit={handleSubmit} className="space-y-4 mt-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-gray-800 mb-1">Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-sm font-semibold text-gray-800">Password</label>
                <Link href="/forgot-password" className="text-xs text-green-600 hover:underline font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
                  placeholder="Your password"
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
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-8">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-green-600 hover:underline font-medium">Create a store</Link>
        </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7faf8]" />}>
      <LoginForm />
    </Suspense>
  );
}

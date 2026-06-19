'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Gift } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');

  const [form, setForm] = useState({ email: '', password: '', shopName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    if (referralCode) {
      const validateCode = async () => {
        try {
          const res = await fetch(`/api/affiliate/validate?ref=${encodeURIComponent(referralCode)}`);
          if (res.ok) {
            const data = await res.json();
            setReferrerName(data.shopName);
          }
        } catch (err) {
          // Silently fail, user can still signup without referral
        }
      };
      validateCode();
    }
  }, [referralCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const body = referralCode ? { ...form, referralCode } : form;
      const res = await fetch('/api/merchant/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed'); return; }
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your store</h1>
        <p className="text-gray-600 mb-6 text-sm">Start selling on LINE OA in minutes</p>

        {referrerName && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
            <Gift size={18} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-accent">Get 2 weeks free!</p>
              <p className="text-xs text-slate-600 mt-0.5">{referrerName} invited you to Shopenter. You'll get a 2-week free trial when you sign up.</p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-shopname" className="block text-sm font-semibold text-gray-800 mb-1">Shop name</label>
            <input
              id="signup-shopname"
              type="text"
              required
              autoComplete="organization"
              value={form.shopName}
              onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))}
              className="w-full border border-gray-400 rounded-lg px-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
              placeholder="My Awesome Shop"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-800 mb-1">Email</label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-400 rounded-lg px-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-800 mb-1">Password</label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-400 rounded-lg px-3 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
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
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 text-sm transition flex items-center justify-center gap-2 min-h-[44px]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating store...
              </>
            ) : 'Create store'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

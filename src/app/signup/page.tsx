"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/merchant/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, shopName }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center p-4">
      {/* Navigation */}
      <div className="absolute top-0 left-0 right-0 border-b border-[#1f2335] bg-[#0a0d14]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-10 h-10 bg-[#00b900]/10 text-[#00b900] rounded-lg flex items-center justify-center font-bold text-sm">
              OA
            </div>
            <span className="text-lg font-bold">LineOA SaaS</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-md bg-[#161925] border border-[#1f2335] rounded-[32px] p-8 shadow-2xl mt-20">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#00b900]/10 text-[#00b900] rounded-3xl mx-auto mb-6 flex items-center justify-center">
            <Store size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Shop</h1>
          <p className="text-[#8b92ad]">Start selling on LINE today</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest px-2">Shop Name</label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={18} />
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="My Awesome Shop"
                className="w-full bg-[#1a1d2e] border border-[#1f2335] text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#00b900] transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest px-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full bg-[#1a1d2e] border border-[#1f2335] text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#00b900] transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#8b92ad] uppercase tracking-widest px-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b92ad]" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1a1d2e] border border-[#1f2335] text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#00b900] transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00b900] hover:bg-[#009900] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span>Create Shop Account</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-[#8b92ad] text-sm">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-[#00b900] font-bold hover:underline"
          >
            Login here
          </button>
        </div>
      </div>
    </div>
  );
}

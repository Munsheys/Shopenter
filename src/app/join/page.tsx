'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, AlertCircle } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');

  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!referralCode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!referralCode) {
      // No referral code, just redirect to signup
      router.push('/auth/signup');
      return;
    }

    // Validate referral code exists (optional — could also be done at signup time)
    const validateCode = async () => {
      try {
        const res = await fetch(`/api/affiliate/validate?ref=${encodeURIComponent(referralCode)}`);
        if (res.ok) {
          const data = await res.json();
          setReferrerName(data.shopName);
        } else if (res.status === 404) {
          setError('This referral link is no longer valid.');
        } else {
          setError('Invalid referral code.');
        }
      } catch (err) {
        setError('Could not validate referral link.');
      } finally {
        setLoading(false);
      }
    };

    validateCode();
  }, [referralCode, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-[#005500] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Join Shopenter</h1>
            {referralCode ? (
              <p className="text-slate-600">
                {loading ? (
                  'Validating invite...'
                ) : error ? (
                  error
                ) : (
                  <>
                    Get <span className="font-bold text-accent">2 weeks free</span> from{' '}
                    <span className="font-bold">{referrerName}</span>'s invitation
                  </>
                )}
              </p>
            ) : (
              <p className="text-slate-600">
                Manage your LINE store in one place
              </p>
            )}
          </div>

          {error ? (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">{error}</p>
                <p className="text-xs text-red-600 mt-1">You can still sign up for your own 2-week trial.</p>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => {
              const signupUrl = referralCode && !error
                ? `/auth/signup?ref=${encodeURIComponent(referralCode)}`
                : '/auth/signup';
              router.push(signupUrl);
            }}
            disabled={loading}
            className="w-full py-3 px-4 bg-accent text-white font-bold rounded-xl hover:bg-[#009900] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Validating...' : 'Get Started'}
            <ArrowRight size={18} />
          </button>

          <p className="text-center text-xs text-slate-500 mt-6">
            By signing up, you agree to our <a href="/terms" className="text-accent hover:underline">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
}

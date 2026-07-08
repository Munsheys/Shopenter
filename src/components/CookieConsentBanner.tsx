'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(CONSENT_KEY);
    if (!existing) setVisible(true);
  }, []);

  const choose = (value: 'accepted' | 'rejected') => {
    localStorage.setItem(CONSENT_KEY, value);
    document.cookie = `${CONSENT_KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-gray-200 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm flex-1">
          We use necessary cookies to keep you logged in and secure your session. We don&apos;t use analytics or
          marketing cookies today — if that changes, we&apos;ll ask again before setting any. See our{' '}
          <Link href="/legal/privacy" className="text-green-400 hover:underline">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => choose('rejected')}
            className="px-4 py-2 text-sm rounded-md border border-gray-600 hover:bg-gray-800 transition"
          >
            Reject non-essential
          </button>
          <button
            onClick={() => choose('accepted')}
            className="px-4 py-2 text-sm rounded-md bg-green-600 hover:bg-green-500 text-white transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

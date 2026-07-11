'use client';

import Link from 'next/link';
import { PUBLIC_CONTACT_TEXT } from '@/lib/contact';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-white font-semibold mb-4">Shopenter</h3>
            <p className="text-sm">Manage your LINE OA store easily.</p>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/legal/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/aup" className="hover:text-white transition">
                  Acceptable Use Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/merchant-agreement" className="hover:text-white transition">
                  Merchant Agreement
                </Link>
              </li>
              <li>
                <Link href="/legal/dpa" className="hover:text-white transition">
                  Data Processing Agreement
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>Merchants: use the Feedback tab in your dashboard</li>
              <li>Everyone else: {PUBLIC_CONTACT_TEXT}</li>
            </ul>
          </div>

          {/* Security */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Security</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/.well-known/security.txt" className="hover:text-white transition">
                  Security Policy
                </a>
              </li>
              <li>Report a vulnerability: {PUBLIC_CONTACT_TEXT}</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <p className="text-sm text-gray-400 text-center">
            © {new Date().getFullYear()} Shopenter Limited (company registration pending). All rights reserved. |
            <a href="/.well-known/security.txt" className="text-gray-300 hover:text-white ml-2">
              Security
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

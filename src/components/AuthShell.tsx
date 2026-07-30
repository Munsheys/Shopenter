import { ReactNode } from 'react';
import Link from 'next/link';
import { MessageCircle, Package, BarChart3, Users, Check } from 'lucide-react';

const FEATURES = [
  { icon: <Package size={16} />, label: 'Products, variants & stock in one place' },
  { icon: <MessageCircle size={16} />, label: 'Chat and broadcast to LINE customers' },
  { icon: <BarChart3 size={16} />, label: 'Revenue and profit analytics' },
  { icon: <Users size={16} />, label: 'Customer history & CRM' },
];

export default function AuthShell({
  eyebrow,
  heading,
  description,
  children,
}: {
  eyebrow: string;
  heading: ReactNode;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Brand panel — hidden below lg, shown as the left half on larger screens */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-[#0a0d14] text-white flex-col justify-between px-12 py-12 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00b900, transparent 70%)' }}
        />

        <Link href="/" className="flex items-center gap-2 relative">
          <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Shopenter</span>
        </Link>

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-green-500/20">
            {eyebrow}
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight mb-4">
            {heading}
          </h2>
          <p className="text-gray-400 leading-relaxed mb-10 max-w-sm">{description}</p>

          <ul className="space-y-3">
            {FEATURES.map(f => (
              <li key={f.label} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-green-400 flex-shrink-0">
                  {f.icon}
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-gray-500">
          <Check size={14} className="text-green-500" />
          Built for merchants running their own store on LINE
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Compact brand mark, mobile/tablet only */}
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-6 justify-center">
            <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">Shopenter</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

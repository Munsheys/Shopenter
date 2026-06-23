'use client';

import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

interface ChecklistProps {
  settings: any;
  products: any[];
  orders: any[];
  onNavigate: (tab: string, section?: string) => void;
  theme?: 'light' | 'lite' | 'dark';
}

export default function OnboardingChecklist({
  settings,
  products,
  orders,
  onNavigate,
  theme = 'light'
}: ChecklistProps) {
  const isDark = theme === 'dark';
  const isLite = theme === 'lite';

  const steps = [
    {
      id: 'platform',
      title: 'Connect a messaging platform',
      description: 'Choose LINE, Telegram, or Instagram to receive messages from customers.',
      completed: !!(
        (settings?.lineChannelAccessToken && settings?.lineChannelSecret) ||
        settings?.telegram?.botToken ||
        settings?.instagram?.pageAccessToken
      ),
      action: () => onNavigate('settings', 'line'),
      icon: '📱'
    },
    {
      id: 'product',
      title: 'Add your first product',
      description: 'Create a product so customers can see what you\'re selling.',
      completed: products.length > 0,
      action: () => onNavigate('products'),
      icon: '📦'
    },
    {
      id: 'storefront',
      title: 'Customize your storefront',
      description: 'Add your logo, colors, and brand to make it uniquely yours.',
      completed: !!settings?.storefront?.logoUrl || !!settings?.dashboardAccent,
      action: () => onNavigate('storefront'),
      icon: '🎨'
    },
    {
      id: 'test',
      title: 'Receive your first order',
      description: 'Share your storefront link and wait for your first customer!',
      completed: orders.length > 0,
      action: null,
      icon: '🎉'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const completionPercent = Math.round((completedCount / steps.length) * 100);

  const bgClasses = isDark
    ? 'bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20'
    : isLite
    ? 'bg-gradient-to-r from-green-500/5 to-blue-500/5 border-green-500/10'
    : 'bg-gradient-to-r from-green-500/5 to-blue-500/5 border-green-500/10';

  const textClasses = isDark ? 'text-white' : 'text-gray-900';
  const mutedClasses = isDark ? 'text-gray-400' : 'text-gray-600';
  const stepBgClasses = isDark
    ? 'bg-white/3 hover:bg-white/5'
    : isLite
    ? 'bg-white/5 hover:bg-white/10'
    : 'bg-white/5 hover:bg-white/10';

  return (
    <div className={`rounded-2xl border p-6 space-y-4 ${bgClasses}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className={`text-lg font-bold ${textClasses} flex items-center gap-2`}>
            🚀 Get Started in 4 Steps
          </h2>
          <p className={`text-sm mt-1 ${mutedClasses}`}>
            You're {completionPercent}% ready to receive your first customer!
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => step.action?.()}
            disabled={!step.action}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left ${
              step.action ? 'cursor-pointer' : 'cursor-default'
            } ${step.completed ? 'opacity-60' : stepBgClasses}`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {step.completed ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <Circle size={20} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base">{step.icon}</span>
                <p className={`font-semibold text-sm ${textClasses}`}>{step.title}</p>
                {step.action && !step.completed && (
                  <ArrowRight size={14} className={mutedClasses} />
                )}
              </div>
              <p className={`text-xs mt-0.5 ${mutedClasses}`}>{step.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className={`rounded-lg px-4 py-3 text-xs font-medium ${
        isDark
          ? 'bg-white/5 border border-white/10 text-gray-300'
          : 'bg-white/10 border border-white/20 text-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span>Progress</span>
          <span>{completionPercent}%</span>
        </div>
        <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-white/20'}`}>
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

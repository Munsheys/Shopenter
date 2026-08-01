'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MessageCircle, Loader2, Check, ArrowRight, Copy, ExternalLink, Package, Zap,
} from 'lucide-react';

type Step = 'loading' | 'welcome' | 'line' | 'product' | 'payment' | 'done';

interface MerchantMe {
  shopName: string;
  hasLine: boolean;
  onboardingCompletedAt: string | null;
}

function StepDots({ current }: { current: number }) {
  const labels = ['Welcome', 'LINE OA', 'Product', 'Payment'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= current ? 'bg-green-500' : 'bg-gray-200'}`} />
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [merchant, setMerchant] = useState<MerchantMe | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    fetch('/api/merchant/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: MerchantMe) => {
        if (d.onboardingCompletedAt) { router.replace('/dashboard'); return; }
        setMerchant(d);
        setStep('welcome');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function finishOnboarding() {
    setFinishing(true);
    try {
      await fetch('/api/merchant/onboarding-complete', { method: 'POST' });
    } catch { /* ignore — dashboard will just show it again next time */ }
    router.push('/dashboard');
  }

  const stepIndex = { welcome: 0, line: 1, product: 2, payment: 3, done: 4, loading: 0 }[step];

  if (step === 'loading' || !merchant) {
    return <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center"><Loader2 className="animate-spin text-green-600" size={28} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">Shopenter</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <StepDots current={stepIndex} />

          {step === 'welcome' && <WelcomeStep merchant={merchant} onNext={() => setStep('line')} />}
          {step === 'line' && <LineStep onNext={() => setStep('product')} onBack={() => setStep('welcome')} />}
          {step === 'product' && <ProductStep onNext={() => setStep('payment')} onBack={() => setStep('line')} />}
          {step === 'payment' && <PaymentStep onFinish={finishOnboarding} onBack={() => setStep('product')} finishing={finishing} />}
        </div>

        <button onClick={finishOnboarding} disabled={finishing} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4 disabled:opacity-50">
          Skip setup — I&apos;ll do this later
        </button>
      </div>
    </div>
  );
}

function WelcomeStep({ merchant, onNext }: { merchant: MerchantMe; onNext: () => void }) {
  const [shopName, setShopName] = useState(merchant.shopName);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [useAsLogo, setUseAsLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!merchant.hasLine) return;
    fetch('/api/merchant/line-profile-picture')
      .then(r => r.ok ? r.json() : { pictureUrl: null })
      .then(d => setPictureUrl(d.pictureUrl ?? null))
      .catch(() => {});
  }, [merchant.hasLine]);

  async function handleNext() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (shopName.trim() && shopName.trim() !== merchant.shopName) body.shopName = shopName.trim();
      if (useAsLogo && pictureUrl) body.shopLogoUrl = pictureUrl;
      if (Object.keys(body).length > 0) {
        await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
    } catch { /* ignore, not critical */ }
    finally { setSaving(false); onNext(); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Shopenter</h1>
      <p className="text-gray-600 mb-6 text-sm">Let&apos;s get your store ready — takes about 2 minutes, and you can skip anything.</p>

      <div className="mb-4">
        <label htmlFor="ob-shopname" className="block text-sm font-semibold text-gray-800 mb-1">Shop name</label>
        <input
          id="ob-shopname"
          type="text"
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
        />
      </div>

      {pictureUrl && (
        <button
          type="button"
          onClick={() => setUseAsLogo(v => !v)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 transition-colors text-left ${useAsLogo ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <img src={pictureUrl} alt="Your LINE profile" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-gray-900">Use my LINE photo as shop logo</span>
            <span className="block text-xs text-gray-500">You can change this anytime in Storefront settings</span>
          </span>
          <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${useAsLogo ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
            {useAsLogo && <Check size={12} className="text-white" />}
          </span>
        </button>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleNext}
          disabled={saving || !shopName.trim()}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 text-sm transition flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={15} /></>}
        </button>
      </div>
    </div>
  );
}

function LineStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'ok' | 'fail' | null>(null);
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook` : '';

  async function handleSave() {
    if (!secret.trim() || !token.trim()) { onNext(); return; }
    setSaving(true);
    setResult(null);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineChannelSecret: secret.trim(), lineChannelAccessToken: token.trim() }),
      });
      const check = await fetch('/api/line-status').then(r => r.json()).catch(() => null);
      setResult(check?.configured && check?.valid ? 'ok' : 'fail');
    } catch {
      setResult('fail');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Connect your LINE OA</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Create a LINE Official Account and a Messaging API channel at{' '}
        <a href="https://developers.line.biz" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline inline-flex items-center gap-0.5">
          developers.line.biz <ExternalLink size={11} />
        </a>{' '}
        if you haven&apos;t already, then paste its credentials here.
      </p>

      <div className="space-y-4 mb-4">
        <div>
          <label htmlFor="ob-secret" className="block text-sm font-semibold text-gray-800 mb-1">Channel Secret</label>
          <input id="ob-secret" type="password" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="off" className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]" placeholder="Messaging API tab → Basic Settings" />
        </div>
        <div>
          <label htmlFor="ob-token" className="block text-sm font-semibold text-gray-800 mb-1">Channel Access Token</label>
          <input id="ob-token" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]" placeholder="Messaging API tab → Issue token" />
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs font-semibold text-gray-700 mb-1">Webhook URL — paste this into the LINE console too</p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-gray-600 truncate flex-1">{webhookUrl}</code>
          <button type="button" onClick={() => navigator.clipboard.writeText(webhookUrl)} className="text-gray-400 hover:text-gray-700 flex-shrink-0"><Copy size={13} /></button>
        </div>
      </div>

      {result === 'ok' && (
        <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold mb-4"><Check size={14} /> Connected — a LIFF app was set up for your storefront automatically.</div>
      )}
      {result === 'fail' && (
        <div className="text-red-600 text-xs mb-4">Couldn&apos;t verify that — double check the values, or skip and try again later from Settings.</div>
      )}

      <div className="flex gap-2">
        <button onClick={onBack} className="px-4 py-3 rounded-xl text-sm border border-gray-200 text-gray-500 hover:text-gray-800">Back</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 text-sm transition flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <>{secret.trim() && token.trim() ? 'Save & Continue' : 'Skip for now'} <ArrowRight size={15} /></>}
        </button>
      </div>
    </div>
  );
}

function ProductStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim() || !price.trim()) { onNext(); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), price: Number(price), imageUrl: imageUrl.trim() || undefined, isActive: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Could not save that product — you can add it later from Products.');
        return;
      }
      onNext();
    } catch {
      setError('Network error — you can add this later from Products.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add your first product</h1>
      <p className="text-gray-600 mb-6 text-sm">Just the basics for now — you can add variants, categories, and more photos later.</p>

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="ob-pname" className="block text-sm font-semibold text-gray-800 mb-1">Product name</label>
          <input id="ob-pname" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]" placeholder="e.g. Classic T-Shirt" />
        </div>
        <div>
          <label htmlFor="ob-pprice" className="block text-sm font-semibold text-gray-800 mb-1">Price (฿)</label>
          <input id="ob-pprice" type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]" placeholder="299" />
        </div>
        <div>
          <label htmlFor="ob-pimage" className="block text-sm font-semibold text-gray-800 mb-1">Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
          <input id="ob-pimage" type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]" placeholder="https://…" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="px-4 py-3 rounded-xl text-sm border border-gray-200 text-gray-500 hover:text-gray-800">Back</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 text-sm transition flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Package size={15} />{name.trim() && price.trim() ? 'Save & Continue' : 'Skip for now'}</>}
        </button>
      </div>
    </div>
  );
}

function PaymentStep({ onFinish, onBack, finishing }: { onFinish: () => void; onBack: () => void; finishing: boolean }) {
  const [promptPayId, setPromptPayId] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (promptPayId.trim()) {
      setSaving(true);
      try {
        await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promptPayId: promptPayId.trim(), paymentMethods: { promptpay: true } }) });
      } catch { /* ignore, not critical */ }
      finally { setSaving(false); }
    }
    onFinish();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">How will customers pay?</h1>
      <p className="text-gray-600 mb-6 text-sm">Add a PromptPay ID for instant QR payments, or skip — bank transfer and cash on delivery are already available, and you confirm those manually in Orders.</p>

      <div className="mb-6">
        <label htmlFor="ob-promptpay" className="block text-sm font-semibold text-gray-800 mb-1">PromptPay ID <span className="text-gray-400 font-normal">(phone or national ID)</span></label>
        <input id="ob-promptpay" type="text" value={promptPayId} onChange={e => setPromptPayId(e.target.value)} className="w-full bg-white border border-gray-300 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]" placeholder="0812345678" />
      </div>

      <div className="flex gap-2">
        <button onClick={onBack} className="px-4 py-3 rounded-xl text-sm border border-gray-200 text-gray-500 hover:text-gray-800">Back</button>
        <button
          onClick={handleFinish}
          disabled={saving || finishing}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 text-sm transition flex items-center justify-center gap-2"
        >
          {saving || finishing ? <Loader2 size={16} className="animate-spin" /> : <><Zap size={15} />Finish setup</>}
        </button>
      </div>
    </div>
  );
}

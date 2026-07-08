import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - Shopenter',
  description: 'Terms of Service for Shopenter merchants',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/" className="text-green-600 hover:underline text-sm font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-600 text-sm mb-8">Effective Date: July 1, 2026 • Last Updated: June 28, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Account Registration & Eligibility</h2>
          <p>To use Shopenter, you must be at least 18 years old and operate a legal business. You represent that all information you provide is true, complete, and accurate. We reserve the right to verify your business and request documentation.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Service Description</h2>
          <p>Shopenter provides a platform for merchants to manage their LINE Official Account store, including product listings, order management, customer communication, and payment processing. We do not store payment card data—all payments use PromptPay exclusively.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Acceptable Use Policy</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Sell prohibited items (weapons, drugs, stolen goods, counterfeits)</li>
            <li>Engage in fraud, harassment, or IP violations</li>
            <li>Violate customer privacy or data protection laws</li>
            <li>Manipulate platform mechanics or engage in technical abuse</li>
            <li>File chargebacks for items you received</li>
          </ul>
          <p>See our complete <Link href="/legal/aup" className="text-green-600 hover:underline">Acceptable Use Policy</Link> for details.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Pricing & Billing</h2>
          <p><strong>Free Tier:</strong> 7-day trial, expires automatically</p>
          <p><strong>Pro Tier:</strong> ฿299/month, auto-renews (cancel anytime)</p>
          <p><strong>Enterprise:</strong> Custom pricing, 12-month minimum</p>
          <p>All prices in Thai Baht. We notify you 30 days before price increases. Your current price locks in for 12 months.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Payments & Failed Transactions</h2>
          <p>If your payment fails:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>3 days: Update payment method or account restricted</li>
            <li>7 days: Services suspended</li>
            <li>14 days: Account data deleted</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Refunds</h2>
          <p>Shopenter subscriptions are <strong>non-refundable</strong> once paid. Exceptions (14-day window):</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Billing errors</li>
            <li>Major service outages ({'>'}72 hours)</li>
            <li>Fraud (unauthorized charges)</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Your Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Fulfilling customer orders as promised</li>
            <li>Handling customer refunds to your customers</li>
            <li>Responding to payment disputes with your bank</li>
            <li>Complying with all applicable laws</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Liability Limitations</h2>
          <p>Shopenter's maximum liability equals the amount you paid in the prior 12 months. We are not liable for:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Lost profits or business opportunities</li>
            <li>Customer disputes or chargebacks</li>
            <li>Payment fraud</li>
            <li>Third-party service failures (LINE, payment processors)</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Service Level Agreement (SLA)</h2>
          <p>We target 99.9% uptime. If we fall below this monthly, Pro tier merchants receive a 10% credit, Enterprise receives custom remediation.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Chargeback Fraud</h2>
          <p>If you file a chargeback for items you received:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Your account is immediately terminated</li>
            <li>We refer you to law enforcement</li>
            <li>Chargeback fees (฿500) are deducted from you</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Termination</h2>
          <p><strong>By You:</strong> Anytime via support@shopenter.app. 30-day grace period to export data.</p>
          <p><strong>By Us:</strong> For policy violations, payment failure, or illegal activity. 30-day data export window applies (except immediate termination for child exploitation, trafficking, or fraud).</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Data Ownership & Deletion</h2>
          <p>You own your product listings, customer data, and order history. You can export anytime for free. After account deletion, we permanently delete your data after 30 days. Audit logs are kept 7 years for legal compliance.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Privacy & Data Protection</h2>
          <p>See our <Link href="/legal/privacy" className="text-green-600 hover:underline">Privacy Policy</Link> and <Link href="/legal/dpa" className="text-green-600 hover:underline">Data Processing Agreement</Link> for details on how we collect, use, and protect your data under GDPR, Thai PDPA, and CCPA.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Dispute Resolution</h2>
          <p>Disputes are resolved through binding arbitration in Bangkok (Thailand Arbitration Center), not in court. You waive the right to pursue class actions.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">15. Changes to Terms</h2>
          <p>We may update these terms with 30 days notice. Continued use means acceptance. You can terminate instead if material changes occur.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">16. Governing Law</h2>
          <p>These terms are governed by Thai law. The Thai Arbitration Center in Bangkok has jurisdiction.</p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-12">
            <p className="text-sm text-gray-600">
              <strong>Questions?</strong> Email <a href="mailto:legal@shopenter.app" className="text-green-600 hover:underline">legal@shopenter.app</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export const metadata = {
  title: 'Merchant Agreement - Shopenter',
  description: 'Merchant Agreement for Shopenter merchants',
};

export default function MerchantAgreementPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/" className="text-green-600 hover:underline text-sm font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Merchant Agreement</h1>
        <p className="text-gray-600 text-sm mb-8">Effective Date: July 1, 2026 • Last Updated: June 28, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Registration Requirements</h2>
          <p>To register as a merchant, you must:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Be 18+ years old</li>
            <li>Operate a legal business</li>
            <li>Have authority to bind your business</li>
            <li>Not be barred from commerce or under sanctions</li>
            <li>Not be bankrupt or insolvent</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Service Tiers</h2>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Free Tier</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Duration: 7-day trial (expires automatically)</li>
            <li>Products: Up to 10</li>
            <li>Customers: Up to 100</li>
            <li>Orders: Up to 50/month</li>
            <li>Features: Basic dashboard, LINE integration</li>
            <li>Support: Help center only</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Pro Tier</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Price: ฿299/month</li>
            <li>Products: Unlimited</li>
            <li>Orders: Unlimited</li>
            <li>Features: Advanced dashboard, analytics, API access</li>
            <li>Support: Email (24-hour response)</li>
            <li>Billing: Month-to-month (cancel anytime)</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Enterprise Tier</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Price: Custom (typically ฿5,000+/month)</li>
            <li>Features: All Pro features + custom integrations</li>
            <li>Support: Priority email + phone (4-hour response)</li>
            <li>Billing: Annual prepayment</li>
            <li>Commitment: 12-month minimum</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Pricing & Payment</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Billing Cycle:</strong> Pro monthly (in advance), Enterprise annual</li>
            <li><strong>Payment Methods:</strong> Credit card, bank transfer, other (upon request)</li>
            <li><strong>Invoices:</strong> Emailed monthly, 7-year retention</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Payment Failure</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Day 1-3: Email reminder + 3-day grace period</li>
            <li>Day 4-7: Account restricted (can't add products)</li>
            <li>Day 8-14: Services suspended</li>
            <li>Day 15+: Account data deleted</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Late Payment</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Interest: 1.5% per month on unpaid balance</li>
            <li>Collection fees: ฿500-2,000</li>
            <li>Action: Legal collection, credit reporting, account suspension</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Price Increases</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Notice: 30 days advance written notice</li>
            <li>Your price locked in for 12 months from increase date</li>
            <li>Right to cancel before new price takes effect</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Refunds</h2>
          <p><strong>Our policy:</strong> Shopenter subscriptions are NON-REFUNDABLE once paid.</p>
          <p className="mt-4"><strong>Exceptions (14-day window):</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Billing errors (double charge, wrong amount)</li>
            <li>Major service failure (platform down >72 hours)</li>
            <li>Fraud (unauthorized charges)</li>
          </ul>
          <p className="mt-4"><strong>Your customer refunds:</strong> YOU manage refunds to your customers. We don't process them. You're liable for refund promises.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Data Ownership & Export</h2>
          <p><strong>You own:</strong> Your product listings, customer data, order history, images</p>
          <p className="mt-4"><strong>You can:</strong> Export your data anytime (free, JSON/CSV format, 5 business days)</p>
          <p className="mt-4"><strong>Upon deletion:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>30 days to export your data</li>
            <li>After 30 days: All data permanently deleted</li>
            <li>Audit logs kept 7 years (legal requirement)</li>
            <li>Recovery impossible after deletion</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Data Security</h2>
          <p>We protect your data with:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>HTTPS encryption in transit</li>
            <li>AES-256 encryption at rest</li>
            <li>Regular security audits</li>
            <li>Redundant backups</li>
            <li>24/7 monitoring</li>
          </ul>
          <p className="mt-4">See our <Link href="/legal/privacy" className="text-green-600 hover:underline">Privacy Policy</Link> for details.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
          <p><strong>You own:</strong> All content you create (product descriptions, images, marketing)</p>
          <p className="mt-4"><strong>You warrant:</strong> You own or have a license to all content you upload</p>
          <p className="mt-4"><strong>We own:</strong> Shopenter platform code (you can't reverse-engineer or copy)</p>
          <p className="mt-4"><strong>DMCA Claims:</strong> If your copyright is infringed, email legal@shopenter.app. We investigate within 48 hours and remove if confirmed.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Liability Limitations</h2>
          <p><strong>Our maximum liability:</strong> Amount you paid in the prior 12 months</p>
          <p className="mt-4"><strong>We're NOT liable for:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Lost profits or business opportunities</li>
            <li>Customer disputes or chargebacks</li>
            <li>Payment fraud</li>
            <li>Third-party failures (LINE, payment processors)</li>
            <li>Data you don't back up</li>
          </ul>
          <p className="mt-4"><strong>Exception:</strong> We ARE liable for gross negligence, fraud, data breaches due to our failure, or death/injury.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Customer Disputes & Chargebacks</h2>
          <p><strong>Your responsibility:</strong> You handle customer disputes and chargebacks with your bank</p>
          <p className="mt-4"><strong>We provide:</strong> Transaction records to help you respond</p>
          <p className="mt-4"><strong>Chargeback fraud:</strong> If you file a chargeback for items you received = immediate termination + law enforcement referral</p>
          <p className="mt-4"><strong>Excessive chargebacks:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>&gt;5% rate: Account review</li>
            <li>&gt;10% rate: Account suspension</li>
            <li>Fees: ฿500 deducted per chargeback</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Termination</h2>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">By You</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Anytime by emailing support@shopenter.app</li>
            <li>Effective immediately</li>
            <li>30 days to export data</li>
            <li>No refund for partial month</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">By Shopenter</h3>
          <p><strong>Immediate (no notice):</strong> Illegal activity, severe fraud, data breach by you, child exploitation</p>
          <p className="mt-4"><strong>With notice:</strong> Policy violations, payment failure, 12+ months inactivity</p>
          <p className="mt-4"><strong>Grace period:</strong> 30 days to export data (except immediate terminations)</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Your Obligations</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Comply with all applicable laws</li>
            <li>Maintain accurate account information</li>
            <li>Pay invoices on time</li>
            <li>Not engage in fraudulent activity</li>
            <li>Respond to support inquiries</li>
            <li>Fulfill orders as promised</li>
            <li>Comply with our Acceptable Use Policy</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Dispute Resolution</h2>
          <p><strong>Process:</strong></p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Contact us in writing with dispute</li>
            <li>We respond within 7 days</li>
            <li>Attempt resolution within 30 days</li>
            <li>If unresolved: Binding arbitration in Bangkok (Thailand Arbitration Center)</li>
          </ol>
          <p className="mt-4"><strong>You waive:</strong> Right to sue in court, participate in class actions</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Governing Law</h2>
          <p>These terms governed by Thai law. Arbitration in Bangkok per Thai rules.</p>

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

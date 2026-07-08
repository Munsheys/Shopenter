import Link from 'next/link';

export const metadata = {
  title: 'Data Processing Agreement - Shopenter',
  description: 'Data Processing Agreement for GDPR, PDPA, and CCPA compliance',
};

export default function DpaPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/" className="text-green-600 hover:underline text-sm font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Processing Agreement</h1>
        <p className="text-gray-600 text-sm mb-8">Effective Date: July 1, 2026 • Applies to: GDPR, Thai PDPA, CCPA</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
          <p>This DPA is entered into between you and <strong>Shopenter Limited (company registration pending)</strong> ("Shopenter", "we", "us"), a company organized in Thailand.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Overview</h2>
          <p>This Data Processing Agreement (DPA) governs how Shopenter processes personal data on behalf of merchants under GDPR, Thai PDPA, CCPA, and other data protection laws.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Parties & Roles</h2>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">You are the Data Controller</h3>
          <p>As a merchant, you decide:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>What customer data to collect</li>
            <li>Why you collect it (purposes)</li>
            <li>How long to keep it</li>
            <li>Who has access to it</li>
            <li>Legal basis for processing</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Shopenter is the Data Processor</h3>
          <p>We:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Process data only as you instruct</li>
            <li>Cannot use data for our own purposes</li>
            <li>Must protect data security</li>
            <li>Comply with your data protection requests</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. What Data We Process</h2>
          <p><strong>Included:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Customer names, emails, phone numbers</li>
            <li>Delivery addresses</li>
            <li>Order history</li>
            <li>Payment confirmations (not full card data)</li>
            <li>Customer preferences</li>
            <li>IP addresses and device identifiers</li>
          </ul>

          <p className="mt-4"><strong>Not Included:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Your internal business data</li>
            <li>Anonymized/aggregated data</li>
            <li>Public data</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. How We Process Data</h2>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Permitted Uses</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Store customer information</li>
            <li>Manage orders and fulfillment</li>
            <li>Send order notifications</li>
            <li>Display customer info in your dashboard</li>
            <li>Provide analytics and reporting</li>
            <li>Prevent fraud and abuse</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Prohibited Uses</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Use customer data for Shopenter marketing</li>
            <li>Build profiles about customers</li>
            <li>Sell or share customer data</li>
            <li>Use for credit scoring</li>
            <li>Discriminatory profiling</li>
            <li>Automated decision-making without consent</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Security Measures</h2>
          <p>We protect data with:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>HTTPS/TLS encryption in transit</li>
            <li>AES-256 encryption at rest</li>
            <li>Access controls and authentication</li>
            <li>Regular security audits (annually)</li>
            <li>Penetration testing (semi-annually)</li>
            <li>24/7 monitoring</li>
            <li>Staff confidentiality agreements</li>
            <li>Background checks for sensitive roles</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Sub-Processors (Third Parties)</h2>
          <p><strong>We use these sub-processors:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Vercel (hosting) — US/EU</li>
            <li>MongoDB Atlas (database) — US/Singapore/EU</li>
            <li>Cloudflare R2 (file storage) — Global</li>
            <li>Omise (subscription payment processing) — Thailand</li>
            <li>LINE (login and messaging) — Global</li>
          </ul>
          <p className="mt-4">We only list sub-processors that are actually integrated. As we add error monitoring, email delivery, or analytics providers, this list will be updated at least 30 days before they go live, per the notice process below.</p>

          <p className="mt-4"><strong>Sub-processor changes:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>We notify you 30 days before adding a sub-processor</li>
            <li>You can object within 10 days</li>
            <li>If unresolved, you may terminate</li>
            <li>All sub-processors sign data processing agreements</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Your Rights & Our Support</h2>
          <p>We help you respond to customer data subject rights:</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Right to Access</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Customers can request their data</li>
            <li>We export on request (within 14 days)</li>
            <li>CSV/JSON format</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Right to Rectification</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Correct inaccurate data</li>
            <li>We provide tools to update</li>
            <li>Audit trail maintained</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Right to Erasure</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Request deletion ("right to be forgotten")</li>
            <li>We delete within 30 days (unless legal hold)</li>
            <li>Audit logs kept separately (7 years)</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Right to Data Portability</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Export data in structured format</li>
            <li>We provide CSV/JSON (within 30 days)</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Right to Object</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Opt-out of certain processing</li>
            <li>We unsubscribe from marketing</li>
            <li>We implement restrictions</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. International Data Transfers</h2>
          <p><strong>Where data is stored:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Primary: Thailand</li>
            <li>Backup: US, Singapore, EU</li>
          </ul>

          <p className="mt-4"><strong>Legal basis for transfers:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>EU→non-EU:</strong> Standard Contractual Clauses (SCCs)</li>
            <li><strong>Thai transfers:</strong> Thai PDPA compliance</li>
            <li><strong>US transfers:</strong> Privacy Shield standards</li>
          </ul>

          <p className="mt-4"><strong>Your options:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>You can restrict certain transfers</li>
            <li>You can request EU-only storage (additional cost may apply)</li>
            <li>Data subject rights apply everywhere</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Breach Notification</h2>
          <p><strong>If we discover a breach:</strong></p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>We notify you within 24 hours</li>
            <li>Include nature, data affected, likely consequences</li>
            <li>Provide updates as investigation proceeds</li>
          </ol>

          <p className="mt-4"><strong>Your notification to customers:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>You notify customers (we provide evidence)</li>
            <li>GDPR: Within 72 hours of our notification</li>
            <li>Thai PDPA: Without undue delay</li>
            <li>US laws: As required by law</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Data Retention & Deletion</h2>
          <p><strong>Active account:</strong> Data retained as long as needed</p>
          <p className="mt-4"><strong>Deleted account:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>30-day export window</li>
            <li>After 30 days: Automatic permanent deletion</li>
            <li>Audit logs: 7 years (legal requirement)</li>
            <li>Backups: 30 days (disaster recovery)</li>
          </ul>

          <p className="mt-4"><strong>Legal holds:</strong> We retain if court order, fraud investigation, dispute, payment obligations, or legal obligation applies</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Audit Rights</h2>
          <p><strong>You may:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Request a summary of our security practices</li>
            <li>Request to conduct a security assessment — scope, timing, and any associated cost are agreed in writing before the assessment begins</li>
          </ul>

          <p className="mt-4"><strong>Audit timing:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Announced audits: 30 days notice</li>
            <li>Audits: During business hours</li>
            <li>Frequency: Up to 2 per year maximum</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Compliance & Certifications</h2>
          <p>We do not currently hold SOC 2 or ISO 27001 certification. We design our data handling to align with GDPR, Thai PDPA, and CCPA principles as described throughout this DPA; this is a good-faith alignment, not a third-party certification. If we obtain formal certification in the future, this section will be updated.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Term & Termination</h2>
          <p><strong>Duration:</strong> Effective immediately, continues while platform is used</p>
          <p className="mt-4"><strong>Termination obligations survive:</strong> DPA survives account termination for data protection obligations (7 years for audit logs)</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Amendments</h2>
          <p><strong>By Shopenter:</strong> Material changes require 30 days notice</p>
          <p className="mt-4"><strong>By Law:</strong> New laws may require updates (no choice if law-mandated)</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">15. Governing Law</h2>
          <p>This DPA governed by Thai law. Disputes in Bangkok arbitration. GDPR standards incorporated for EU users.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">16. Contact</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Privacy inquiries:</strong> <a href="mailto:privacy@shopenter.app" className="text-green-600 hover:underline">privacy@shopenter.app</a></li>
            <li><strong>GDPR/PDPA requests:</strong> <a href="mailto:dpo@shopenter.app" className="text-green-600 hover:underline">dpo@shopenter.app</a></li>
            <li><strong>Breach notification:</strong> <a href="mailto:security@shopenter.app" className="text-green-600 hover:underline">security@shopenter.app</a></li>
          </ul>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-12">
            <p className="text-sm text-gray-600">
              This DPA complies with GDPR, Thai PDPA, and CCPA requirements. For questions, see our <Link href="/legal/privacy" className="text-green-600 hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

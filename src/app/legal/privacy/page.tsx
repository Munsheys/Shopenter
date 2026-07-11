import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - Shopenter',
  description: 'Privacy Policy for Shopenter merchants',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/" className="text-green-600 hover:underline text-sm font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-600 text-sm mb-8">Effective Date: July 1, 2026 • Last Updated: June 28, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
          <p>This Privacy Policy is issued by <strong>Shopenter Limited (company registration pending)</strong> ("Shopenter", "we", "us"), a company organized in Thailand.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Overview</h2>
          <p>Shopenter takes your privacy seriously. This policy explains what data we collect, how we use it, who we share it with, and your rights.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. What Data We Collect</h2>
          <p><strong>Data You Provide:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Account info (name, email, shop name, phone)</li>
            <li>Payment methods (processed by our payment provider, Omise — we do not store your full card number)</li>
            <li>Product listings and descriptions</li>
            <li>Customer data (names, emails, delivery addresses, order history)</li>
          </ul>

          <p className="mt-4"><strong>Data Automatically Collected:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>IP address and device info</li>
            <li>Cookies and usage analytics</li>
            <li>Login activity and audit logs</li>
            <li>API usage patterns</li>
          </ul>

          <p className="mt-4"><strong>Data from Third Parties:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>LINE (when you use LINE OAuth login)</li>
            <li>Payment processors (for payment confirmation)</li>
            <li>Fraud detection services</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Use Your Data</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Provide services:</strong> Manage your store, process orders, send emails</li>
            <li><strong>Improve platform:</strong> Analytics, feature development, bug fixes</li>
            <li><strong>Legal compliance:</strong> Meet tax, GDPR, PDPA, CCPA requirements</li>
            <li><strong>Fraud prevention:</strong> Detect and prevent illegal activity</li>
            <li><strong>Marketing:</strong> (Only with your opt-in consent)</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Who We Share Data With</h2>
          <p><strong>Shared With (for service delivery):</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Vercel (hosting)</li>
            <li>MongoDB Atlas (database)</li>
            <li>Cloudflare R2 (file storage)</li>
            <li>Omise (subscription payment processing)</li>
            <li>LINE (login and messaging)</li>
          </ul>
          <p className="mt-4">We only list providers we actually use. This list will be updated as we add others (e.g. error monitoring, analytics), with notice per our <Link href="/legal/dpa" className="text-green-600 hover:underline">Data Processing Agreement</Link>.</p>
          <p className="mt-4"><strong>NOT Shared With:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Third-party advertisers</li>
            <li>Marketing companies</li>
            <li>Data brokers</li>
            <li>Competitors</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Data Retention</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Active Account:</strong> Data kept as long as you use Shopenter</li>
            <li><strong>Inactivity:</strong> no login for 3 months schedules deletion on the same 30-day timeline as a self-requested deletion (below), with a LINE notification from Shopenter&apos;s own official account before it happens. Logging in cancels it automatically.</li>
            <li><strong>After Deletion:</strong> 30 days to export, then permanent deletion</li>
            <li><strong>Audit Logs:</strong> 7 years (legal requirement)</li>
            <li><strong>Backups:</strong> not currently automated on our database infrastructure — this section will be updated once in place</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Security</h2>
          <p>We protect your data with:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>TLS encryption in transit</li>
            <li>Encryption at rest for sensitive stored credentials</li>
            <li>bcrypt password hashing</li>
            <li>Regular internal security review</li>
          </ul>
          <p className="mt-4">We do not currently hold SOC 2 or ISO 27001 certification. See our <Link href="/legal/dpa" className="text-green-600 hover:underline">Data Processing Agreement</Link> §12 for details.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Your Privacy Rights</h2>
          <p><strong>You have the right to:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Access:</strong> Get a copy of your data (14 days)</li>
            <li><strong>Rectify:</strong> Correct inaccurate data</li>
            <li><strong>Erase:</strong> Request deletion ("right to be forgotten")</li>
            <li><strong>Restrict:</strong> Limit how your data is used</li>
            <li><strong>Portability:</strong> Export your data in standard format</li>
            <li><strong>Object:</strong> Opt out of marketing or processing</li>
          </ul>
          <p className="mt-4">To exercise these rights, email <a href="mailto:privacy@shopenter.app" className="text-green-600 hover:underline">privacy@shopenter.app</a></p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Cookies</h2>
          <p>We currently use only <strong>necessary cookies</strong> — for login sessions and security — which don't require consent under GDPR/PDPA. We do not currently use analytics or marketing cookies. If we add any in the future, our cookie banner will ask for your opt-in consent before they're set, and this section will be updated to describe them.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. International Data Transfers</h2>
          <p><strong>Where Data is Stored:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Primary: Thailand</li>
            <li>Backup: US, Singapore, EU</li>
          </ul>
          <p className="mt-4">For EU users, we use Standard Contractual Clauses (SCCs) to ensure data protection. For Thai users, we comply with Thai PDPA. For California users, we honor CCPA rights.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Data Breach Notification</h2>
          <p>If we discover a breach:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>We notify you within 24 hours</li>
            <li>We notify customers within 72 hours (GDPR requirement)</li>
            <li>We provide breach details and steps to protect yourself</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. GDPR (EU Users)</h2>
          <p>If you're in the EU, you have additional rights under GDPR:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Data portability in machine-readable format</li>
            <li>Right to lodge a complaint with your Data Protection Authority</li>
            <li>Right not to be subject to automated profiling</li>
            <li>Contact: <a href="mailto:dpo@shopenter.app" className="text-green-600 hover:underline">dpo@shopenter.app</a></li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Thai PDPA (Thailand Users)</h2>
          <p>We comply with Thailand's Personal Data Protection Act:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>You have rights to access, correct, and delete your data</li>
            <li>We obtain consent before processing personal data</li>
            <li>We notify you within 72 hours of a breach</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. CCPA (California Users)</h2>
          <p>If you're in California, you have rights under CCPA/CPRA:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Right to know what data we collect</li>
            <li>Right to delete your data</li>
            <li>Right to opt-out of data sales (we don't sell data)</li>
            <li>Right to non-discrimination for exercising your rights</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Children's Privacy</h2>
          <p>Shopenter is not for children under 18. If you're under 18, you cannot use our platform. If we discover a child's account, we delete it immediately.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">15. Contact Us</h2>
          <p>For privacy questions or to exercise your rights:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Email: <a href="mailto:privacy@shopenter.app" className="text-green-600 hover:underline">privacy@shopenter.app</a></li>
            <li>GDPR/PDPA Data Protection Officer: <a href="mailto:dpo@shopenter.app" className="text-green-600 hover:underline">dpo@shopenter.app</a></li>
          </ul>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-12">
            <p className="text-sm text-gray-600">
              We comply with GDPR, Thai PDPA, and CCPA. See our <Link href="/legal/dpa" className="text-green-600 hover:underline">Data Processing Agreement</Link> for technical details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

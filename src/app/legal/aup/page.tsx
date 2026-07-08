import Link from 'next/link';

export const metadata = {
  title: 'Acceptable Use Policy - Shopenter',
  description: 'Acceptable Use Policy for Shopenter merchants',
};

export default function AupPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/" className="text-green-600 hover:underline text-sm font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Acceptable Use Policy</h1>
        <p className="text-gray-600 text-sm mb-8">Effective Date: July 1, 2026 • Last Updated: June 28, 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Purpose</h2>
          <p>This policy defines prohibited conduct on Shopenter. Violations may result in account suspension or termination without refund.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Absolutely Prohibited (Zero Tolerance)</h2>
          <p><strong>You may NOT sell or promote:</strong></p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Illegal goods:</strong> Weapons, explosives, controlled drugs, stolen goods, counterfeits, forged documents</li>
            <li><strong>Health & safety hazards:</strong> Unlicensed medications, false medical claims, hazardous materials</li>
            <li><strong>Exploitation:</strong> Child exploitation, human trafficking, sexual services</li>
            <li><strong>IP violations:</strong> Counterfeit branded goods, pirated software, unauthorized trademarks</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. High-Risk Categories (Allowed with Verification)</h2>
          <p>These require proper licensing and verification:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Alcohol & tobacco:</strong> Age verification + proper licensing required</li>
            <li><strong>Prescription medications:</strong> Licensed pharmacist + government registration required</li>
            <li><strong>Gambling/lotteries:</strong> Licensed operations only (illegal in some jurisdictions)</li>
            <li><strong>Financial products:</strong> Financial services license required</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Prohibited Behaviors</h2>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Fraud & Deception</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Fake accounts or shell companies</li>
            <li>False identity information</li>
            <li>Payment fraud or stolen payment methods</li>
            <li>Chargeback fraud (claiming non-delivery when you received items)</li>
          </ul>
          <p className="text-sm text-red-600 font-semibold mt-2">Consequence: Permanent ban + law enforcement referral</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Abuse & Harassment</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Threatening or harassing customers</li>
            <li>Hate speech or discriminatory language</li>
            <li>Doxxing or revealing private information</li>
            <li>Spam or unwanted messaging</li>
            <li>Extortion</li>
          </ul>
          <p className="text-sm text-orange-600 font-semibold mt-2">Consequence: Account suspension or termination</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Intellectual Property Abuse</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Using trademarked names without permission</li>
            <li>Selling counterfeit goods</li>
            <li>Copying product descriptions without attribution</li>
            <li>Using protected images without license</li>
          </ul>
          <p className="text-sm text-orange-600 font-semibold mt-2">Consequence: DMCA takedown + account termination</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Platform Manipulation</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Fake reviews (paying for 5-star ratings)</li>
            <li>Bot-created fake accounts</li>
            <li>Gaming algorithm or ranking systems</li>
            <li>Exploiting platform bugs</li>
          </ul>
          <p className="text-sm text-red-600 font-semibold mt-2">Consequence: Permanent ban</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Data Abuse</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Scraping or harvesting customer emails</li>
            <li>Selling customer data to third parties</li>
            <li>Tracking customers off-platform without consent</li>
            <li>Using customer data beyond order fulfillment</li>
          </ul>
          <p className="text-sm text-red-600 font-semibold mt-2">Consequence: Account termination + legal action</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Account Abuse</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Multiple accounts to evade suspensions</li>
            <li>Using trial period repeatedly (one per person)</li>
            <li>Transferring account to another person</li>
          </ul>
          <p className="text-sm text-red-600 font-semibold mt-2">Consequence: All related accounts terminated</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Prohibited Content</h2>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Illegal Content</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Instructions for weapons, drugs, or crimes</li>
            <li>Malware or hacking tools</li>
            <li>Phishing materials</li>
          </ul>
          <p className="text-sm text-red-600 font-semibold mt-2">Consequence: Immediate termination + law enforcement referral</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Violent, Adult & Hate Content</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Graphic violence or gore</li>
            <li>Sexually explicit images or services</li>
            <li>Hate speech, slurs, discriminatory content</li>
            <li>Disinformation or conspiracy theories</li>
          </ul>
          <p className="text-sm text-orange-600 font-semibold mt-2">Consequence: Content removal + account suspension</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Payment Abuse</h2>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Chargeback Fraud</h3>
          <p><strong>You may NOT:</strong> File chargebacks for items you received, claim non-delivery when you accepted delivery, dispute legitimate transactions</p>
          <p className="text-sm text-red-600 font-semibold mt-2">Consequence: Account termination + law enforcement referral</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Payment Method Abuse</h3>
          <p><strong>You may NOT:</strong> Use stolen payment methods, make unauthorized charges, add hidden fees, use false pricing</p>
          <p className="text-sm text-red-600 font-semibold mt-2">Consequence: Account termination + legal action</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Technical Abuse</h2>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Hacking, Malware, Phishing</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Attempting to hack the platform or accounts</li>
            <li>Distributing malware or viruses</li>
            <li>Phishing for customer credentials</li>
          </ul>
          <p className="text-sm text-red-600 font-semibold mt-2">Consequence: Permanent ban + law enforcement referral</p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">API Abuse</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Making excessive requests (DoS attack)</li>
            <li>Bypassing rate limits</li>
            <li>Accessing unauthorized data</li>
          </ul>
          <p className="text-sm text-orange-600 font-semibold mt-2">Consequence: API access revoked + account termination</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Enforcement Levels</h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Level 1: Warning</h3>
            <p className="text-blue-800 text-sm">First-time, minor, or unintentional violations. You receive an email explaining the violation and how to fix it.</p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">Level 2: Suspension</h3>
            <p className="text-yellow-800 text-sm">Repeated violations or moderate breaches. Your account is suspended for 7-30 days. You can appeal within 7 days. Data remains accessible during suspension.</p>
          </div>

          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <h3 className="font-semibold text-red-900 mb-2">Level 3: Termination</h3>
            <p className="text-red-800 text-sm">Severe violations, repeated suspensions, or illegal activity. Your account is permanently deleted. You have 7 days to appeal. After appeal denial, you get 30 days to export data before permanent deletion.</p>
          </div>

          <div className="bg-red-100 border-l-4 border-red-600 p-4">
            <h3 className="font-semibold text-red-900 mb-2">Immediate Termination (No Appeal)</h3>
            <p className="text-red-800 text-sm"><strong>Zero tolerance violations:</strong> Child exploitation, human trafficking, hacking/malware distribution, organized fraud</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Appeal Process</h2>
          <p>If your account is suspended or terminated:</p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>You have 7 days to appeal to abuse@shopenter.app</li>
            <li>Include new evidence or explanation</li>
            <li>Management reviews within 14 days</li>
            <li>Final decision issued in writing</li>
          </ol>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Reporting Violations</h2>
          <p><strong>To report a violation:</strong> Email <a href="mailto:abuse@shopenter.app" className="text-green-600 hover:underline">abuse@shopenter.app</a> with:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Violator's account name</li>
            <li>Specific violation description</li>
            <li>Evidence (links, screenshots, dates)</li>
            <li>Your contact information</li>
          </ul>
          <p className="mt-4">We investigate within 48 hours. Do NOT file false reports—we take misuse of the reporting system seriously.</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Mandatory Reporting</h2>
          <p>We report criminal activity to law enforcement:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Child exploitation or trafficking</li>
            <li>Weapons or drug distribution</li>
            <li>Organized fraud rings</li>
            <li>Money laundering indicators</li>
            <li>Hacking or malware distribution</li>
          </ul>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-12">
            <p className="text-sm text-gray-600">
              <strong>Questions?</strong> Email <a href="mailto:abuse@shopenter.app" className="text-green-600 hover:underline">abuse@shopenter.app</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Voxco Number Ordering Portal',
  description: 'Privacy policy and data protection information for the Voxco Number Ordering Portal.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-8">
          <Link
            href="/sign-in"
            className="text-[#215F9A] hover:text-[#2c78c0] font-medium text-sm"
          >
            ← Back to Sign in
          </Link>
        </div>

        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: March 2025</p>
        </header>

        <article className="prose prose-gray max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Voxco (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Voxco Number Ordering Portal (the &quot;Service&quot;).
              We are committed to protecting your personal data in accordance with the EU General Data Protection Regulation (GDPR),
              the UK GDPR, and other applicable privacy laws.
            </p>
            <p>
              This policy explains what personal data we collect, why we collect it, how we use it, and your rights regarding your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Data Controller</h2>
            <p>
              The data controller responsible for your personal data is Voxco. For any questions about this policy or your data,
              please contact your account manager or the domain and web manager.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Personal Data We Collect</h2>
            <p>We collect and process the following categories of personal data:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Account data:</strong> name, email address, company name (if provided), and password (stored in hashed form).</li>
              <li><strong>Authentication data:</strong> session identifiers and login timestamps to operate the Service securely.</li>
              <li><strong>Order and usage data:</strong> phone number orders, uploaded documents related to orders, and activity necessary to provide the Service.</li>
              <li><strong>Communications:</strong> any optional message you provide when signing up or when contacting us.</li>
            </ul>
            <p className="mt-3">
              We do not use your data for automated decision-making or profiling that significantly affects you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Legal Basis and Purposes</h2>
            <p>We process your personal data on the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Contract:</strong> to create and manage your account, process orders, and deliver the number ordering and management services you request.</li>
              <li><strong>Consent:</strong> where you have given clear consent (e.g. when signing up, you agree to this Privacy Policy and our use of cookies as described below).</li>
              <li><strong>Legitimate interests:</strong> to improve the Service, ensure security, and communicate important service-related information, where such interests are not overridden by your rights.</li>
              <li><strong>Legal obligation:</strong> where we must retain or disclose data to comply with applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your personal data only for as long as necessary to fulfil the purposes set out in this policy, including to satisfy legal, accounting, or reporting requirements. Account and order data are retained while your account is active and for a reasonable period after closure or as required by law. You may request erasure of your data subject to our legal retention obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights (GDPR and UK GDPR)</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification:</strong> request correction of inaccurate or incomplete data.</li>
              <li><strong>Erasure:</strong> request deletion of your personal data (&quot;right to be forgotten&quot;), subject to legal exceptions.</li>
              <li><strong>Restriction:</strong> request that we limit how we use your data in certain circumstances.</li>
              <li><strong>Data portability:</strong> receive your data in a structured, machine-readable format where applicable.</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interests or for direct marketing.</li>
              <li><strong>Withdraw consent:</strong> where processing is based on consent, you may withdraw it at any time.</li>
              <li><strong>Complaint:</strong> lodge a complaint with a supervisory authority (e.g. in the EU/EEA or UK).</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact your account manager or the domain and web manager. We will respond within the timeframe required by applicable law (e.g. one month under GDPR).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. International Transfers</h2>
            <p>
              Your data may be processed in countries outside the European Economic Area (EEA) or the UK, including by our service providers (e.g. hosting and authentication). Where we transfer data to such countries, we ensure appropriate safeguards are in place, such as adequacy decisions, Standard Contractual Clauses, or other mechanisms recognised by GDPR/UK GDPR.
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies and Similar Technologies</h2>
            <p>
              We use cookies and similar technologies that are strictly necessary to operate the Service (e.g. session and authentication cookies). These are essential for the website to function and do not require your consent under applicable cookie laws.
            </p>
            <p className="mt-2">
              We may use optional cookies (e.g. for analytics or preferences) only with your consent. You can manage your cookie preferences via the cookie banner when you first visit the site. For more detail on the cookies we use, see the cookie banner and the table below.
            </p>
            <div className="overflow-x-auto mt-4 border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">Purpose</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">Type</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-900">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2">Session / authentication</td>
                    <td className="px-4 py-2">Strictly necessary</td>
                    <td className="px-4 py-2">Session or as set by provider</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Cookie consent preference</td>
                    <td className="px-4 py-2">Strictly necessary</td>
                    <td className="px-4 py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Third-Party Processors and Hosting</h2>
            <p>
              We use the following types of service providers to run the Service. They act as data processors and are bound by contract to protect your data:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Hosting:</strong> The site is hosted on Vercel. Vercel is GDPR compliant and processes data in accordance with applicable data protection laws. See Vercel&apos;s privacy and compliance information for details.</li>
              <li><strong>Authentication and database:</strong> We use Supabase for authentication and database services. Supabase processes data in line with its DPA and privacy commitments.</li>
              <li><strong>Fonts:</strong> We may load fonts from Google Fonts; relevant requests are made to Google&apos;s servers. Google&apos;s privacy policy applies to such requests.</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. This includes secure connections (HTTPS), access controls, and secure handling of credentials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will post the updated version on this page and update the &quot;Last updated&quot; date. If changes are material, we may notify you by email or through the Service. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact</h2>
            <p>
              For any questions about this Privacy Policy, your personal data, or to exercise your rights, please contact the domain and web manager or your Voxco account manager.
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/sign-in"
            className="text-[#215F9A] hover:text-[#2c78c0] font-medium"
          >
            ← Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

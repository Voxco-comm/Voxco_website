import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | Voxco Number Ordering Portal',
  description: 'Privacy policy and data protection information for the Voxco Number Ordering Portal.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <Link
          href="/sign-in"
          className="group mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#215F9A] transition-colors hover:text-[#1b4e80]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Sign in
        </Link>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F97316]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#215F9A]">
                Voxco Number Portal
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Privacy Policy</h1>
            <p className="mt-2 text-sm text-slate-500">Last updated: March 2025</p>
          </header>

          <article className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="space-y-9">
              <section>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">1. Introduction</h2>
                <div className="space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>
                    Voxco (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Voxco Number Ordering Portal (the &quot;Service&quot;).
                    We are committed to protecting your personal data in accordance with the EU General Data Protection Regulation (GDPR),
                    the UK GDPR, and other applicable privacy laws.
                  </p>
                  <p>
                    This policy explains what personal data we collect, why we collect it, how we use it, and your rights regarding your data.
                  </p>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">2. Data Controller</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  The data controller responsible for your personal data is Voxco. For any questions about this policy or your data,
                  please contact your account manager or the domain and web manager.
                </p>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">3. Personal Data We Collect</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">We collect and process the following categories of personal data:</p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
                  <li><strong className="font-medium text-slate-900">Account data:</strong> name, email address, company name (if provided), and password (stored in hashed form).</li>
                  <li><strong className="font-medium text-slate-900">Authentication data:</strong> session identifiers and login timestamps to operate the Service securely.</li>
                  <li><strong className="font-medium text-slate-900">Order and usage data:</strong> phone number orders, uploaded documents related to orders, and activity necessary to provide the Service.</li>
                  <li><strong className="font-medium text-slate-900">Communications:</strong> any optional message you provide when signing up or when contacting us.</li>
                </ul>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                  We do not use your data for automated decision-making or profiling that significantly affects you.
                </p>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">4. Legal Basis and Purposes</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">We process your personal data on the following legal bases:</p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
                  <li><strong className="font-medium text-slate-900">Contract:</strong> to create and manage your account, process orders, and deliver the number ordering and management services you request.</li>
                  <li><strong className="font-medium text-slate-900">Consent:</strong> where you have given clear consent (e.g. when signing up, you agree to this Privacy Policy and our use of cookies as described below).</li>
                  <li><strong className="font-medium text-slate-900">Legitimate interests:</strong> to improve the Service, ensure security, and communicate important service-related information, where such interests are not overridden by your rights.</li>
                  <li><strong className="font-medium text-slate-900">Legal obligation:</strong> where we must retain or disclose data to comply with applicable law.</li>
                </ul>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">5. Data Retention</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  We retain your personal data only for as long as necessary to fulfil the purposes set out in this policy, including to satisfy legal, accounting, or reporting requirements. Account and order data are retained while your account is active and for a reasonable period after closure or as required by law. You may request erasure of your data subject to our legal retention obligations.
                </p>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">6. Your Rights (GDPR and UK GDPR)</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">Depending on your location, you may have the following rights:</p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
                  <li><strong className="font-medium text-slate-900">Access:</strong> request a copy of the personal data we hold about you.</li>
                  <li><strong className="font-medium text-slate-900">Rectification:</strong> request correction of inaccurate or incomplete data.</li>
                  <li><strong className="font-medium text-slate-900">Erasure:</strong> request deletion of your personal data (&quot;right to be forgotten&quot;), subject to legal exceptions.</li>
                  <li><strong className="font-medium text-slate-900">Restriction:</strong> request that we limit how we use your data in certain circumstances.</li>
                  <li><strong className="font-medium text-slate-900">Data portability:</strong> receive your data in a structured, machine-readable format where applicable.</li>
                  <li><strong className="font-medium text-slate-900">Objection:</strong> object to processing based on legitimate interests or for direct marketing.</li>
                  <li><strong className="font-medium text-slate-900">Withdraw consent:</strong> where processing is based on consent, you may withdraw it at any time.</li>
                  <li><strong className="font-medium text-slate-900">Complaint:</strong> lodge a complaint with a supervisory authority (e.g. in the EU/EEA or UK).</li>
                </ul>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                  To exercise these rights, please contact your account manager or the domain and web manager. We will respond within the timeframe required by applicable law (e.g. one month under GDPR).
                </p>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">7. International Transfers</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  Your data may be processed in countries outside the European Economic Area (EEA) or the UK, including by our service providers (e.g. hosting and authentication). Where we transfer data to such countries, we ensure appropriate safeguards are in place, such as adequacy decisions, Standard Contractual Clauses, or other mechanisms recognised by GDPR/UK GDPR.
                </p>
              </section>

              <section id="cookies" className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">8. Cookies and Similar Technologies</h2>
                <div className="space-y-2 text-[15px] leading-relaxed text-slate-600">
                  <p>
                    We use cookies and similar technologies that are strictly necessary to operate the Service (e.g. session and authentication cookies). These are essential for the website to function and do not require your consent under applicable cookie laws.
                  </p>
                  <p>
                    We may use optional cookies (e.g. for analytics or preferences) only with your consent. You can manage your cookie preferences via the cookie banner when you first visit the site. For more detail on the cookies we use, see the cookie banner and the table below.
                  </p>
                </div>
                <div className="mt-4 overflow-hidden overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Purpose</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-2.5 text-slate-700">Session / authentication</td>
                        <td className="px-4 py-2.5 text-slate-500">Strictly necessary</td>
                        <td className="px-4 py-2.5 text-slate-500">Session or as set by provider</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-slate-700">Cookie consent preference</td>
                        <td className="px-4 py-2.5 text-slate-500">Strictly necessary</td>
                        <td className="px-4 py-2.5 text-slate-500">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">9. Third-Party Processors and Hosting</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  We use the following types of service providers to run the Service. They act as data processors and are bound by contract to protect your data:
                </p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-600">
                  <li><strong className="font-medium text-slate-900">Hosting:</strong> The site is hosted on Vercel. Vercel is GDPR compliant and processes data in accordance with applicable data protection laws. See Vercel&apos;s privacy and compliance information for details.</li>
                  <li><strong className="font-medium text-slate-900">Authentication and database:</strong> We use Supabase for authentication and database services. Supabase processes data in line with its DPA and privacy commitments.</li>
                  <li><strong className="font-medium text-slate-900">Fonts:</strong> We may load fonts from Google Fonts; relevant requests are made to Google&apos;s servers. Google&apos;s privacy policy applies to such requests.</li>
                </ul>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                  We do not sell your personal data to third parties.
                </p>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">10. Security</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. This includes secure connections (HTTPS), access controls, and secure handling of credentials.
                </p>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">11. Changes to This Policy</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  We may update this Privacy Policy from time to time. We will post the updated version on this page and update the &quot;Last updated&quot; date. If changes are material, we may notify you by email or through the Service. We encourage you to review this policy periodically.
                </p>
              </section>

              <section className="border-t border-slate-100 pt-9">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">12. Contact</h2>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  For any questions about this Privacy Policy, your personal data, or to exercise your rights, please contact the domain and web manager or your Voxco account manager.
                </p>
              </section>
            </div>
          </article>

          <div className="border-t border-slate-100 px-6 py-6 sm:px-10">
            <Link
              href="/sign-in"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-[#215F9A] transition-colors hover:text-[#1b4e80]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from "next/link"

export const metadata = {
  title: "Privacy Policy - Calendar",
  description: "Privacy policy for Calendar application",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Calendar
          </Link>
        </div>

        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground">Last updated: January 2026</p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p>
              Calendar ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            <p>We collect information you provide directly:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (email, name, password)</li>
              <li>Calendar events and schedule data</li>
              <li>University affiliation information</li>
              <li>Google account information (if using Google Sign-In)</li>
              <li>Usage data and interactions with the app</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our service</li>
              <li>Store and organize your calendar events</li>
              <li>Authenticate your account</li>
              <li>Improve and personalize your experience</li>
              <li>Send important service updates</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely on Supabase servers with encryption in transit and at rest. We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Sharing and Third-Party Disclosures</h2>
            <h3 className="text-lg font-semibold mt-6 mb-3">Google User Data</h3>
            <p className="mb-4">
              When you connect your Google Calendar account to CalendarAI, we access and store your Google user data (email, calendar events, and profile information) to provide the core functionality of our service. We do not share, sell, or transfer your Google user data to any third parties except as disclosed below:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Supabase:</strong> Your Google user data and calendar information is stored on Supabase servers. Supabase is bound by our data processing agreement and uses this data solely to store and retrieve your information at your request.
              </li>
              <li>
                <strong>No Commercial Use:</strong> We do not use your Google data for marketing, advertising, or any commercial purposes outside of providing the CalendarAI service.
              </li>
              <li>
                <strong>No Third-Party Marketing:</strong> We do not disclose your Google user data to third parties for their marketing purposes.
              </li>
              <li>
                <strong>Legal Compliance:</strong> We may disclose your data if required by law or legal process, such as court orders or government requests.
              </li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-3">Data Transfer and Disconnection</h3>
            <p>
              You can disconnect your Google Calendar at any time from your settings. Once disconnected, we will no longer access your Google data. Your previously stored calendar data remains in your CalendarAI account but will no longer sync with Google Calendar.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Third-Party Services</h2>
            <p>We use third-party services that may collect information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google:</strong> For authentication and calendar integration
              </li>
              <li>
                <strong>Supabase:</strong> For data storage and authentication
              </li>
              <li>
                <strong>Vercel:</strong> For hosting and analytics
              </li>
            </ul>
            <p>
              These services have their own privacy policies governing their use of your data. We encourage you to review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Children's Privacy</h2>
            <p>
              Calendar is not intended for users under 13 years of age. We do not knowingly collect information from children under 13. If we become aware that we have collected data from a child under 13, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our privacy practices, please contact us at{" "}
              <a href="mailto:alcacounih@gmail.com" className="text-primary hover:underline">
                alcacounih@gmail.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}

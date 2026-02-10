import Link from "next/link"

export const metadata = {
  title: "Terms of Service - Calendar",
  description: "Terms of service for Calendar application",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Calendar
          </Link>
        </div>

        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-lg text-muted-foreground">Last updated: January 2026</p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Calendar ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials (information or software) on Calendar for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on Calendar</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Violating any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Disclaimer</h2>
            <p>
              The materials on Calendar are provided on an 'as is' basis. Calendar makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Limitations of Liability</h2>
            <p>
              In no event shall Calendar or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Calendar, even if Calendar or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Accuracy of Materials</h2>
            <p>
              The materials appearing on Calendar could include technical, typographical, or photographic errors. Calendar does not warrant that any of the materials on Calendar are accurate, complete, or current. Calendar may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Materials and Content</h2>
            <p>
              Calendar has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Calendar of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Modifications</h2>
            <p>
              Calendar may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of Canada and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. User Accounts</h2>
            <p>
              When you create an account on Calendar, you are responsible for maintaining the confidentiality of your account information and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any other breach of security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. User Content</h2>
            <p>
              You are solely responsible for any content (including calendar events, notes, and other information) that you create, upload, or transmit through the Service. Calendar does not endorse any user-generated content and is not responsible for the accuracy, legality, or appropriateness of such content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Prohibited Activities</h2>
            <p>You agree not to engage in any of the following activities:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attempting to gain unauthorized access to the Service or its systems</li>
              <li>Engaging in any form of harassment or abuse of other users</li>
              <li>Transmitting spam, malware, or any harmful code</li>
              <li>Violating any applicable laws or regulations</li>
              <li>Interfering with the operation of the Service</li>
              <li>Using the Service for any illegal purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Termination</h2>
            <p>
              Calendar reserves the right to terminate your account and access to the Service at any time, for any reason, with or without notice. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{" "}
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

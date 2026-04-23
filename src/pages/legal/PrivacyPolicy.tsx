import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-[#6366f1] text-sm hover:underline">
            &larr; Back to ProgressionX
          </Link>
          <h1 className="text-3xl font-bold mt-4">Privacy Policy</h1>
          <p className="text-[#94a3b8] text-sm mt-2">Last updated: April 24, 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-[#cbd5e1]">
          <section>
            <p>
              This Privacy Policy explains how ProgressionX ("we", "us", "the Service")
              collects, uses, and protects information when you use the ProgressionX
              web application and progressive web app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              1. Information We Collect
            </h2>
            <p className="mb-2">When you use ProgressionX we collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account information:</strong> first name, last name, email
                address, and (for Google sign-in) your Google account identifier.
              </li>
              <li>
                <strong>Profile and fitness data:</strong> age, gender, height, body
                weight, goal (bulking / cutting / maintenance), training type,
                experience level, activity level, and optional mobile number.
              </li>
              <li>
                <strong>Workout data:</strong> workout splits, exercises, sets (weight,
                reps, RIR, warm-up / drop-set flags, notes), and session timestamps.
              </li>
              <li>
                <strong>Body weight logs</strong> you record over time.
              </li>
              <li>
                <strong>Diet and nutrition data</strong> you enter for tracking.
              </li>
              <li>
                <strong>AI prompts and responses</strong> generated when you use the
                AI analysis, coaching, or ask features.
              </li>
              <li>
                <strong>Technical data:</strong> authentication tokens, basic request
                logs, and error reports used to operate and secure the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and manage your account.</li>
              <li>To store and display your workout, weight, and diet history.</li>
              <li>
                To generate personalized AI analysis, progress reports, training plans,
                and answers to questions you ask.
              </li>
              <li>To authenticate you and keep your account secure.</li>
              <li>To operate, maintain, and improve the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              3. Third-Party Processors
            </h2>
            <p className="mb-2">
              ProgressionX shares limited data with the following third-party services
              that are necessary to operate the Service:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Google (Sign in with Google):</strong> we receive your Google
                account identifier, email, and name when you sign in.
              </li>
              <li>
                <strong>Anthropic (Claude API):</strong> when you use AI analysis or
                the Ask feature, relevant workout and profile data is sent to
                Anthropic's Claude model to generate responses.
              </li>
              <li>
                <strong>Google (Gemini API):</strong> certain AI features may route
                prompts through Google's Gemini model.
              </li>
            </ul>
            <p className="mt-2">
              We do not sell your personal data, and we do not share it with advertising
              networks.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              4. Data Storage and Security
            </h2>
            <p>
              Your data is stored in a PostgreSQL database on our servers. Passwords
              are hashed with Argon2. Authentication uses signed JWT tokens. We take
              reasonable measures to protect your data, but no Internet service can
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              5. Data Retention
            </h2>
            <p>
              We retain your data for as long as your account is active. When you
              delete your account, your profile and associated workout, weight, diet,
              and AI history are deleted from our primary database. Backups may retain
              the data for a limited period until they are rotated out.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              6. Your Rights
            </h2>
            <p className="mb-2">You may at any time:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access and download your data using the in-app Export feature.</li>
              <li>Correct your profile information from the Profile page.</li>
              <li>
                Request deletion of your account and associated data by contacting us
                at the address below.
              </li>
              <li>
                Revoke Google's access to ProgressionX via your Google Account
                permissions page.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              7. Children's Privacy
            </h2>
            <p>
              ProgressionX is not intended for children under the age of 13. We do not
              knowingly collect data from children under 13. Users between 13 and 18
              should use the Service only with the consent of a parent or guardian.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will
              update the "Last updated" date at the top of this page. Material changes
              will be communicated through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              9. Contact
            </h2>
            <p>
              If you have any questions about this Privacy Policy or want to exercise
              any of your rights, contact us at{' '}
              <a
                href="mailto:progressionx.app@gmail.com"
                className="text-[#6366f1] hover:underline"
              >
                progressionx.app@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="pt-4 border-t border-[#334155]">
            <p className="text-xs text-[#94a3b8]">
              See also our{' '}
              <Link to="/terms" className="text-[#6366f1] hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

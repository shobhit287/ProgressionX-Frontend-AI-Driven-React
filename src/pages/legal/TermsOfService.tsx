import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-[#6366f1] text-sm hover:underline">
            &larr; Back to ProgressionX
          </Link>
          <h1 className="text-3xl font-bold mt-4">Terms of Service</h1>
          <p className="text-[#94a3b8] text-sm mt-2">Last updated: April 24, 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-[#cbd5e1]">
          <section>
            <p>
              These Terms of Service ("Terms") govern your use of ProgressionX ("we",
              "us", "the Service"). By creating an account or using the Service, you
              agree to be bound by these Terms. If you do not agree, do not use the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              1. The Service
            </h2>
            <p>
              ProgressionX is a personal fitness and gym-performance tracking
              application. It allows you to log workouts, body weight, and diet, and
              provides AI-generated analysis, coaching, and suggestions based on the
              data you enter.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              2. Accounts
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                You must provide accurate information when creating your account.
              </li>
              <li>
                You are responsible for keeping your credentials secure and for all
                activity under your account.
              </li>
              <li>
                You must be at least 13 years old to use the Service. Users under 18
                must have parental or guardian consent.
              </li>
              <li>
                You may close your account at any time by contacting us.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              3. Acceptable Use
            </h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful or harmful purpose.</li>
              <li>
                Attempt to access, probe, or test the vulnerability of the Service or
                its infrastructure without authorization.
              </li>
              <li>Reverse-engineer, scrape, or automate abusive traffic against the Service.</li>
              <li>
                Upload content that is illegal, infringing, abusive, or otherwise
                violates the rights of others.
              </li>
              <li>
                Share your account credentials with others or impersonate another
                person.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              4. Health and Fitness Disclaimer
            </h2>
            <p className="mb-2">
              ProgressionX is not a medical or healthcare service. The Service, and
              any AI-generated analysis, training plans, coaching, diet suggestions,
              or recommendations provided through it, are for informational and
              educational purposes only and are <strong>not</strong> medical advice,
              diagnosis, or treatment.
            </p>
            <p>
              Consult a qualified physician or healthcare professional before starting
              any new exercise program, changing your diet, or acting on any suggestion
              provided by the Service. You use the Service, and any information it
              provides, at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              5. AI-Generated Content
            </h2>
            <p>
              AI features in the Service use large language models (including those
              provided by Anthropic and Google) to generate output based on the data
              you provide. AI output may be incorrect, incomplete, or inappropriate.
              You are responsible for evaluating the suitability of any AI output
              before relying on it. We do not guarantee the accuracy, completeness, or
              reliability of AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              6. Your Data
            </h2>
            <p>
              You retain all rights to the data you enter into the Service. By using
              the Service you grant us a limited, non-exclusive license to store,
              process, and display that data solely to operate the Service and provide
              features to you, including passing relevant portions to third-party AI
              providers as described in our{' '}
              <Link to="/privacy" className="text-[#6366f1] hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              7. Service Availability
            </h2>
            <p>
              We aim to keep the Service available but do not guarantee uninterrupted
              or error-free operation. We may modify, suspend, or discontinue the
              Service or any feature at any time, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              8. Termination
            </h2>
            <p>
              We may suspend or terminate your access to the Service if you violate
              these Terms or use the Service in a way that may cause harm to us or
              other users. Upon termination, your right to use the Service ends
              immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              9. Disclaimer of Warranties
            </h2>
            <p>
              The Service is provided "AS IS" and "AS AVAILABLE" without warranties
              of any kind, whether express or implied, including but not limited to
              merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              10. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, ProgressionX and its operators
              will not be liable for any indirect, incidental, special, consequential,
              or punitive damages, or any loss of profits, revenue, data, or
              health-related outcomes, arising out of or related to your use of the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              11. Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. When we do, we will update
              the "Last updated" date at the top. Continued use of the Service after
              changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#f1f5f9] mb-2">
              12. Contact
            </h2>
            <p>
              Questions about these Terms? Contact us at{' '}
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
              <Link to="/privacy" className="text-[#6366f1] hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

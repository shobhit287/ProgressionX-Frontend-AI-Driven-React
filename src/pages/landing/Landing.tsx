import { Link } from 'react-router-dom';
import { Dumbbell, LineChart, Brain, Utensils, Calendar, Trophy } from 'lucide-react';

/**
 * Public landing page shown at `/` when the visitor is not signed in.
 * Google's OAuth-consent-screen reviewer crawls this page, so it must:
 *  - describe the app without requiring login,
 *  - link to the privacy policy and terms.
 */
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9]">
      {/* Header */}
      <header className="border-b border-[#334155] px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <Dumbbell className="w-6 h-6 text-[#6366f1] flex-shrink-0" />
            <span className="text-lg sm:text-xl font-bold truncate">ProgressionX</span>
          </div>
          <nav className="flex items-center gap-2 text-sm flex-shrink-0">
            <Link
              to="/login"
              className="px-3 sm:px-4 py-2 rounded-lg text-[#cbd5e1] hover:text-white hover:bg-[#1e293b] transition-colors whitespace-nowrap"
            >
              Sign In
            </Link>
            {/* Full-text CTA only fits on >=sm screens; mobile users still get
                the big "Get Started" button in the hero just below. */}
            <Link
              to="/signup"
              className="hidden sm:inline-block px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold transition-colors whitespace-nowrap"
            >
              Create Account
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Track every set. Train with data.
          </h1>
          <p className="mt-6 text-lg text-[#cbd5e1]">
            ProgressionX is an AI-powered gym performance tracker. Log your
            workouts, body weight, and diet — then get personalised analysis,
            training plans, and coaching tailored to your progress.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/signup"
              className="px-6 py-3 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold"
            >
              Get Started — Free
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#f1f5f9] font-semibold border border-[#334155]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            What you can do with ProgressionX
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Dumbbell className="w-6 h-6 text-[#6366f1]" />}
              title="Log workouts in real time"
              body="Split-based training, exercise-level set tracking, warm-ups, drop sets, and RIR — built for mobile, built for the gym floor."
            />
            <FeatureCard
              icon={<LineChart className="w-6 h-6 text-[#6366f1]" />}
              title="See your progression"
              body="Automatic charts for volume, one-rep-max estimates, body weight, and personal records across every exercise."
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6 text-[#6366f1]" />}
              title="AI analysis and coaching"
              body="Get data-driven feedback on your training, recovery, and goals. Ask questions about your progress in plain English."
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6 text-[#6366f1]" />}
              title="Weekly splits"
              body="Build your own split or let the app generate one based on your goal, experience level, and training type."
            />
            <FeatureCard
              icon={<Utensils className="w-6 h-6 text-[#6366f1]" />}
              title="Diet logging"
              body="Track your nutrition alongside your lifting so your training and eating stay in sync with your goal."
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6 text-[#6366f1]" />}
              title="PR tracking"
              body="Automatic detection of personal records — weight, reps, and volume — so every breakthrough gets captured."
            />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 pb-16">
        <div className="max-w-3xl mx-auto text-center bg-[#1e293b] border border-[#334155] rounded-2xl p-8">
          <h2 className="text-2xl font-bold">Ready to start tracking?</h2>
          <p className="mt-2 text-[#cbd5e1]">
            Create an account in under a minute. Sign in with Google or email.
          </p>
          <div className="mt-6">
            <Link
              to="/signup"
              className="inline-block px-6 py-3 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — legal links (required for Google's OAuth review) */}
      <footer className="border-t border-[#334155] px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#94a3b8]">
          <div>
            &copy; {new Date().getFullYear()} ProgressionX. All rights reserved.
          </div>
          <nav className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-[#f1f5f9] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#f1f5f9] transition-colors">
              Terms of Service
            </Link>
            <a
              href="mailto:progessionx.app@gmail.com"
              className="hover:text-[#f1f5f9] transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

function FeatureCard({ icon, title, body }: FeatureCardProps) {
  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
      <div className="w-10 h-10 rounded-lg bg-[#6366f1]/15 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-[#f1f5f9]">{title}</h3>
      <p className="text-sm text-[#cbd5e1] mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

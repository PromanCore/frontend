/**
 * CTA section — strong closing call-to-action before footer.
 * Theme-aware: background glow adapts, buttons use gradient tokens.
 */

import { Link } from 'react-router';
import { ArrowRight, Brain } from 'lucide-react';

export function CTASection() {
  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Background gradient — subtle in light, deeper in dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] dark:via-primary/[0.06] to-background pointer-events-none" />
      {/* Glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/4 dark:bg-primary/10 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-8 shadow-2xl shadow-primary/20">
          <Brain className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
          Start Analyzing Your Projects{' '}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            with AI Today
          </span>
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
          Join project managers and team leads who use ProMan to predict risks,
          optimize their teams, and deliver projects with confidence.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            id="cta-get-started"
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white text-base font-semibold shadow-2xl shadow-primary/20 hover:shadow-primary/35 transition-all hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            id="cta-sign-in"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-muted-foreground text-base font-medium border border-border hover:border-foreground/20 hover:bg-muted/50 hover:text-foreground transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Features section — 6 professional feature cards.
 * Each card has an icon, title, and short explanation.
 * Theme-aware: uses bg-card with shadows in light, glass in dark.
 */

import {
  Users,
  ShieldAlert,
  TrendingUp,
  FileText,
  History,
  Download,
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Team Optimization',
    description:
      'AI-powered team composition analysis identifies skill gaps, evaluates role-fit alignment, and provides actionable recommendations for optimal member assignments.',
    gradient: 'from-primary to-secondary',
  },
  {
    icon: ShieldAlert,
    title: 'Risk Analysis',
    description:
      'Intelligent risk detection evaluates project constraints, predicts hidden risks, and generates AI-driven mitigation strategies before issues impact delivery.',
    gradient: 'from-destructive to-warning',
  },
  {
    icon: TrendingUp,
    title: 'Success Prediction',
    description:
      'Multi-factor AI analysis of planning quality, execution readiness, and historical patterns to predict project success probability with confidence scoring.',
    gradient: 'from-secondary to-info',
  },
  {
    icon: FileText,
    title: 'AI Reports',
    description:
      'Generate comprehensive, AI-synthesized reports covering individual members, team dynamics, risk assessments, and full project summaries in one click.',
    gradient: 'from-info to-primary',
  },
  {
    icon: History,
    title: 'Version History',
    description:
      'Track every analysis version with full history. Compare results across iterations, monitor improvements, and maintain a complete audit trail.',
    gradient: 'from-warning to-secondary',
  },
  {
    icon: Download,
    title: 'PDF Export',
    description:
      'Export professional, ready-to-share PDF reports for stakeholders. Beautifully formatted with charts, scores, and actionable recommendations.',
    gradient: 'from-primary to-info',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32 px-4 sm:px-6">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-secondary tracking-widest uppercase mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Lead Smarter
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Six powerful capabilities working in concert to give you
            complete intelligence over your project portfolio.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl bg-card border border-border p-7 hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 shadow-sm dark:shadow-none hover:shadow-lg dark:hover:shadow-xl dark:hover:shadow-black/20 backdrop-blur-sm"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl transition-shadow`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Bottom hover accent line */}
                <div
                  className={`absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r ${feature.gradient} rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

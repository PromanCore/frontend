/**
 * AI Intelligence section — explains cross-module AI capabilities.
 * Theme-aware: background glow is subtle in light, prominent in dark.
 */

import { Brain, Zap, GitMerge, Lightbulb } from 'lucide-react';

const capabilities = [
  {
    icon: GitMerge,
    title: 'Shared AI Context',
    description:
      'Every module feeds into a unified AI engine. Team data enriches risk analysis, risk insights improve success predictions, and everything flows into comprehensive reports.',
  },
  {
    icon: Lightbulb,
    title: 'Predictive Insights',
    description:
      'Go beyond reactive reporting. ProMan anticipates problems before they surface — from team bottlenecks to schedule risks — so you can act proactively.',
  },
  {
    icon: Brain,
    title: 'Cross-Module Analysis',
    description:
      'AI correlates findings across team composition, risk factors, and planning quality to deliver holistic intelligence no single analysis could provide.',
  },
  {
    icon: Zap,
    title: 'Decision Intelligence',
    description:
      'Get actionable, prioritized recommendations backed by multi-factor AI analysis. Every suggestion includes expected impact and implementation guidance.',
  },
];

export function AIIntelligenceSection() {
  return (
    <section id="ai-intelligence" className="relative py-24 sm:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Background glow — very subtle in light, visible in dark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/3 dark:bg-primary/8 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Description */}
          <div>
            <p className="text-sm font-semibold text-secondary tracking-widest uppercase mb-3">
              AI Intelligence
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              One AI Engine.{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Complete Understanding.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Traditional tools analyze projects in isolation. ProMan's AI engine
              understands the <em>relationships</em> between your team, risks,
              and goals — delivering intelligence that gets smarter with every
              analysis you run.
            </p>

            {/* Visual: AI flow diagram */}
            <div className="flex items-center gap-3 flex-wrap">
              {['Team Data', 'Risk Factors', 'Success Metrics', 'Reports'].map(
                (label, i) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-lg bg-card dark:bg-muted border border-border text-sm text-muted-foreground font-medium shadow-sm dark:shadow-none">
                      {label}
                    </span>
                    {i < 3 && (
                      <span className="text-secondary/50">→</span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Right — Capability cards */}
          <div className="grid sm:grid-cols-2 gap-5">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="group rounded-2xl bg-card border border-border p-6 hover:border-primary/25 transition-all duration-300 hover:-translate-y-0.5 shadow-sm dark:shadow-none"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Product preview section — shows mock dashboard cards
 * representing the four core modules in a "browser frame" style.
 * Theme-aware: cards use bg-card with shadows in light, glass in dark.
 */

import {
  Users,
  ShieldAlert,
  TrendingUp,
  FileText,
  Activity,
  BarChart3,
  Target,
  Brain,
} from 'lucide-react';

const previews = [
  {
    title: 'Team Optimization',
    description: 'AI-driven team composition analysis with skill gap detection and role-fit scoring.',
    icon: Users,
    color: 'primary',
    colorHex: '#0F6B4A',
    metrics: [
      { label: 'Team Readiness', value: '87%', icon: Target },
      { label: 'Skill Coverage', value: '92%', icon: Activity },
    ],
    tags: ['Skill Analysis', 'Role Fit', 'Recommendations'],
  },
  {
    title: 'Risk Analysis',
    description: 'Predictive risk identification with AI-powered mitigation strategies and severity scoring.',
    icon: ShieldAlert,
    color: 'destructive',
    colorHex: '#E74C3C',
    metrics: [
      { label: 'Risk Score', value: '72', icon: BarChart3 },
      { label: 'Risks Found', value: '8', icon: ShieldAlert },
    ],
    tags: ['Predictive', 'Mitigation', 'Scoring'],
  },
  {
    title: 'Success Prediction',
    description: 'Forecast project outcomes using multi-factor AI analysis across planning and execution.',
    icon: TrendingUp,
    color: 'secondary',
    colorHex: '#3FAE8F',
    metrics: [
      { label: 'Success Rate', value: '78%', icon: TrendingUp },
      { label: 'Confidence', value: 'High', icon: Brain },
    ],
    tags: ['Forecasting', 'Confidence', 'KPIs'],
  },
  {
    title: 'AI Reports',
    description: 'Generate comprehensive PDF reports with cross-module insights and version history.',
    icon: FileText,
    color: 'info',
    colorHex: '#2BA6A6',
    metrics: [
      { label: 'Report Types', value: '5', icon: FileText },
      { label: 'Export', value: 'PDF', icon: BarChart3 },
    ],
    tags: ['PDF Export', 'Version History', 'Cross-Module'],
  },
];

export function ProductPreview() {
  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-secondary tracking-widest uppercase mb-3">
            Product Overview
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Powerful AI Modules,{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              One Platform
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every module works together — sharing context and delivering cross-functional insights
            that standalone tools simply cannot provide.
          </p>
        </div>

        {/* Preview cards grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {previews.map((preview) => {
            const Icon = preview.icon;
            return (
              <div
                key={preview.title}
                className="group relative rounded-2xl bg-card border border-border p-6 sm:p-8 hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 shadow-sm dark:shadow-none hover:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-black/20 backdrop-blur-sm overflow-hidden"
              >
                {/* Hover glow — subtle in light, visible in dark */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-5 dark:group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                  style={{ backgroundColor: preview.colorHex }}
                />

                {/* Header */}
                <div className="flex items-start gap-4 mb-6 relative">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${preview.colorHex}15`, border: `1px solid ${preview.colorHex}25` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: preview.colorHex }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-1">{preview.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{preview.description}</p>
                  </div>
                </div>

                {/* Mock metrics */}
                <div className="flex gap-4 mb-5 relative">
                  {preview.metrics.map((m) => {
                    const MetricIcon = m.icon;
                    return (
                      <div
                        key={m.label}
                        className="flex-1 rounded-xl bg-muted dark:bg-background/60 border border-border p-4"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <MetricIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
                          <span className="text-xs text-muted-foreground/80 font-medium">{m.label}</span>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{m.value}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 relative">
                  {preview.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium px-3 py-1 rounded-full bg-muted/60 dark:bg-muted/40 text-muted-foreground/80 border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

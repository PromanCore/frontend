/**
 * Workflow / How It Works section — 4-step visual flow.
 * Theme-aware: step badges and connecting line adapt to theme.
 */

import { FolderPlus, UserPlus, Cpu, FileBarChart } from 'lucide-react';

const steps = [
  {
    step: 1,
    icon: FolderPlus,
    title: 'Create Project',
    description: 'Set up your project with key details — type, industry, timeline, and goals.',
  },
  {
    step: 2,
    icon: UserPlus,
    title: 'Add Team & Data',
    description: 'Add team members with skills and roles. Input project constraints and risk factors.',
  },
  {
    step: 3,
    icon: Cpu,
    title: 'Run AI Analysis',
    description: "Let ProMan's AI engine analyze your team, identify risks, and predict outcomes.",
  },
  {
    step: 4,
    icon: FileBarChart,
    title: 'Generate Reports',
    description: 'Export professional PDF reports with actionable insights and recommendations.',
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="relative py-24 sm:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-secondary tracking-widest uppercase mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            From Project Setup to{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Insights
            </span>{' '}
            in Minutes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to transform how you manage projects.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/30" />

          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="relative text-center group">
                {/* Step number circle */}
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/15 group-hover:shadow-primary/30 transition-shadow relative z-10">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  {/* Step number badge */}
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-secondary flex items-center justify-center text-xs font-bold text-secondary z-20">
                    {s.step}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

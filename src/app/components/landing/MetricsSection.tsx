/**
 * Metrics / Trust section — animated stat counters.
 * Theme-aware: cards use bg-card with subtle shadows in light.
 */

import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 6, suffix: '', label: 'AI Modules', description: 'Integrated analysis engines' },
  { value: 5, suffix: '', label: 'Report Types', description: 'Comprehensive export options' },
  { value: 3, suffix: '', label: 'Analysis Engines', description: 'Team, Risk & Success' },
  { value: 95, suffix: '%', label: 'Prediction Accuracy', description: 'AI-driven forecasting' },
  { value: 100, suffix: '%', label: 'Data Privacy', description: 'Your data stays yours' },
];

function useCountUp(target: number, duration = 2000, trigger = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;

    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      setCount(current);
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [target, duration, trigger]);

  return count;
}

export function MetricsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 sm:py-32 px-4 sm:px-6">
      {/* Subtle background shift */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-secondary tracking-widest uppercase mb-3">
            Platform at a Glance
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Built for{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Professional
            </span>{' '}
            Project Intelligence
          </h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  stat,
  visible,
}: {
  stat: (typeof stats)[number];
  visible: boolean;
}) {
  const count = useCountUp(stat.value, 2000, visible);

  return (
    <div className="text-center rounded-2xl bg-card border border-border p-6 hover:border-primary/20 transition-all duration-300 group shadow-sm dark:shadow-none">
      <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1 tracking-tight">
        {count}
        <span className="text-secondary">{stat.suffix}</span>
      </div>
      <div className="text-sm font-semibold text-foreground/80 mb-1">{stat.label}</div>
      <div className="text-xs text-muted-foreground/70">{stat.description}</div>
    </div>
  );
}

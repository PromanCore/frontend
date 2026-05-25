/**
 * Hero section — large headline, value proposition, dual CTA.
 * Theme-aware: animated gradient orbs are subtle in light, vibrant in dark.
 */

import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    // Fade-in on mount
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated background orbs — subtle in light, vibrant in dark */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 dark:bg-primary/15 blur-[120px] animate-pulse" />
        {/* Secondary glow */}
        <div
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-secondary/4 dark:bg-secondary/10 blur-[100px]"
          style={{ animation: 'pulse 4s ease-in-out infinite alternate' }}
        />
        {/* Accent glow */}
        <div
          className="absolute top-1/3 left-1/6 w-[400px] h-[400px] rounded-full bg-info/3 dark:bg-info/8 blur-[80px]"
          style={{ animation: 'pulse 6s ease-in-out infinite alternate-reverse' }}
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div
        ref={heroRef}
        className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto transition-all duration-1000 ease-out"
        style={{ opacity: 0, transform: 'translateY(30px)' }}
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-secondary dark:text-secondary text-sm font-medium mb-8 backdrop-blur-sm">
          <Sparkles className="w-4 h-4" />
          AI-Powered Project Intelligence
        </div>

        <h1 className="flex flex-col gap-1 sm:gap-2 md:gap-3 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight">
          <span className="block">Predict Risks</span>
          <span className="block bg-gradient-to-r from-primary via-secondary to-info bg-clip-text text-transparent pb-1">
            Optimize Teams
          </span>
          <span className="block">Forecast Success</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed font-light">
          ProMan transforms project management from task tracking into strategic
          intelligence — empowering leaders with AI-driven insights to make
          data-backed decisions before problems happen.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            id="hero-get-started"
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white text-base font-semibold shadow-2xl shadow-primary/20 hover:shadow-primary/35 transition-all hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            id="hero-explore"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-muted-foreground text-base font-medium border border-border hover:border-foreground/20 hover:bg-muted/50 hover:text-foreground transition-all"
          >
            Explore Features
          </a>
        </div>

        {/* Trust line */}
        <p className="mt-12 text-sm text-muted-foreground/60 font-medium">
          Built for project managers, team leads, and executives
        </p>
      </div>

      {/* Bottom fade — uses bg-background which adapts to theme */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}

/**
 * AuthLayout — Unified fullscreen auth experience.
 *
 * Architecture:
 *   • Single immersive fullscreen background (gradient + grid + glow orbs)
 *   • Centered floating auth card
 *   • Small logo/branding above the card
 *   • Optional floating feature insight in the background
 *   • Fully theme-aware (light + dark)
 *   • Fully responsive (mobile-first)
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Brain, TrendingUp, Shield, Users, BarChart3, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';

/* ─── Feature highlights that float in the background ──────────────────────── */

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Success Prediction',
    description: 'AI-driven project success forecasting',
  },
  {
    icon: Shield,
    title: 'Risk Analysis',
    description: 'Predictive risk identification',
  },
  {
    icon: Users,
    title: 'Team Optimization',
    description: 'Intelligent resource allocation',
  },
  {
    icon: BarChart3,
    title: 'Smart Reporting',
    description: 'Automated analytics reports',
  },
];

/* ─── Floating feature card (subtle background element) ────────────────────── */

function FloatingFeature() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((p) => (p + 1) % FEATURES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const feat = FEATURES[active];
  const Icon = feat.icon;

  return (
    <div className="hidden lg:block absolute bottom-12 left-12 z-10 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4 }}
          className="auth-floating-card"
        >
          <div className="auth-floating-icon">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/80">{feat.title}</p>
            <p className="text-[11px] text-muted-foreground/70">{feat.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Tiny progress dots */}
      <div className="flex gap-1.5 mt-3 ml-1">
        {FEATURES.map((_, i) => (
          <div
            key={i}
            className={`w-1 h-1 rounded-full transition-all duration-300 ${
              i === active
                ? 'bg-secondary w-3'
                : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Layout ─────────────────────────────────────────────────────────── */

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-layout-root">
      {/* === Background layers === */}
      <div className="absolute inset-0 auth-bg-gradient" />
      <div className="absolute inset-0 auth-bg-pattern" />

      {/* Glow orbs */}
      <div className="absolute top-[15%] left-[20%] w-[500px] h-[500px] rounded-full auth-glow-primary blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full auth-glow-secondary blur-[100px] pointer-events-none" />
      <div className="absolute top-[60%] left-[60%] w-[300px] h-[300px] rounded-full auth-glow-accent blur-[80px] pointer-events-none" />

      {/* Floating feature (desktop only) */}
      <FloatingFeature />

      {/* === Centered content === */}
      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        {/* Logo + branding */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          <Link to="/" className="flex items-center gap-2.5 group mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/35 transition-shadow">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">ProMan</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Sparkles className="w-3 h-3" />
            <span>AI-Powered Project Intelligence</span>
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="w-full max-w-[440px]"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

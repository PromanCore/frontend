/**
 * ProMan Landing Page
 *
 * Production-quality SaaS landing page for the ProMan AI-powered
 * Project Management Intelligence platform.
 *
 * Fully theme-aware: adapts seamlessly to both Light and Dark themes
 * using ProMan's semantic design tokens.
 *
 * Sections:
 *   1. LandingNavbar   — sticky top navigation
 *   2. HeroSection     — headline + CTA
 *   3. ProductPreview  — mock dashboard previews
 *   4. FeaturesSection — 6 feature cards
 *   5. AIIntelligence  — AI capabilities explained
 *   6. MetricsSection  — animated stat counters
 *   7. WorkflowSection — 4-step "How It Works"
 *   8. CTASection      — closing call-to-action
 *   9. LandingFooter   — links / socials / copyright
 */

import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { ProductPreview } from './ProductPreview';
import { FeaturesSection } from './FeaturesSection';
import { AIIntelligenceSection } from './AIIntelligenceSection';
import { MetricsSection } from './MetricsSection';
import { WorkflowSection } from './WorkflowSection';
import { CTASection } from './CTASection';
import { LandingFooter } from './LandingFooter';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />
      <ProductPreview />
      <FeaturesSection />
      <AIIntelligenceSection />
      <MetricsSection />
      <WorkflowSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}

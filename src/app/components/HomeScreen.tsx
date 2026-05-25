import { Brain, Users, TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';
import { Button } from './ui/button';

type HomeScreenProps = {
  onGetStarted: () => void;
  onLogin: () => void;
};

export function HomeScreen({ onGetStarted, onLogin }: HomeScreenProps) {
  return (
    <div className="min-h-screen">
      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo and Name */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0F6B4A] rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-[#042033]">
                ProMan
              </span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={onLogin}
                variant="ghost"
                className="text-sm sm:text-base text-[#042033] hover:text-[#0F6B4A] hover:bg-[#0F6B4A]/10 px-3 sm:px-4 py-2 border border-[#042033]/30"
              >
                Log in
              </Button>
              <Button
                onClick={onGetStarted}
                className="text-sm sm:text-base bg-[#092D46] hover:bg-[#0B3A5C] text-white px-4 sm:px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Get Started!
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Animated Gradient */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 sm:pt-20">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#88B4A6] from-0% via-[#88B4A6] via-49% to-[#042033] to-100% animate-gradient-flow"></div>
        
        {/* Content */}
        <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
            ProMan
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
            AI-powered project intelligence platform that helps project managers optimize performance, predict outcomes and make their jobs easier and faster
          </p>
          <Button
            onClick={onGetStarted}
            className="bg-[#092D46] hover:bg-[#0B3A5C] text-white px-8 sm:px-10 py-5 sm:py-7 text-base sm:text-lg rounded-xl shadow-2xl hover:shadow-3xl transition-all hover:scale-105 font-semibold"
          >
            Get Started!
          </Button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-32 bg-gradient-to-t from-[#EEF3F6] to-transparent"></div>
      </section>

      {/* About Us Section */}
      <section className="bg-[#EEF3F6] py-12 sm:py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 shadow-xl">
            <div className="text-center mb-10 sm:mb-12 md:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#042033] mb-4 sm:mb-6 px-2">
                Intelligence-Driven Project Management
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-[#042033]/70 max-w-3xl mx-auto leading-relaxed px-2">
                ProMan transforms project management from task tracking into strategic intelligence, 
                empowering leaders with AI-powered insights for team optimization, risk mitigation, 
                and success prediction.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
              {/* Team Optimization */}
              <div className="text-center group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0F6B4A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-[#0F6B4A]/20 transition-colors">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[#0F6B4A]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#042033] mb-3 sm:mb-4">
                  Team Optimization
                </h3>
                <p className="text-sm sm:text-base text-[#042033]/70 leading-relaxed px-2">
                  Analyze team composition, identify skill gaps, and receive intelligent recommendations 
                  for optimal member assignments and capability development.
                </p>
              </div>

              {/* Risk Intelligence */}
              <div className="text-center group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#D97706]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-[#D97706]/20 transition-colors">
                  <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-[#D97706]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#042033] mb-3 sm:mb-4">
                  Risk Intelligence
                </h3>
                <p className="text-sm sm:text-base text-[#042033]/70 leading-relaxed px-2">
                  Evaluate project constraints, detect hidden risks early, and implement 
                  AI-powered mitigation strategies before issues impact delivery.
                </p>
              </div>

              {/* Success Forecasting */}
              <div className="text-center group sm:col-span-2 md:col-span-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0F6B4A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-[#0F6B4A]/20 transition-colors">
                  <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-[#0F6B4A]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-[#042033] mb-3 sm:mb-4">
                  Success Forecasting
                </h3>
                <p className="text-sm sm:text-base text-[#042033]/70 leading-relaxed px-2">
                  Predict project success probability using AI analysis of planning quality, 
                  execution readiness, and historical performance patterns.
                </p>
              </div>
            </div>

            {/* Why ProMan */}
            <div className="bg-[#EEF3F6] rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 mt-8 sm:mt-12">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="flex-shrink-0">
                  <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-[#0F6B4A]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-[#042033] mb-3 sm:mb-4">
                    Why ProMan?
                  </h3>
                  <p className="text-sm sm:text-base text-[#042033]/70 leading-relaxed mb-4 sm:mb-6">
                    Traditional project management tools focus on task tracking and timelines. 
                    ProMan elevates your approach with strategic intelligence that helps executives 
                    and project leaders make data-driven decisions, optimize resources, and predict 
                    outcomes before they happen.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F6B4A] flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-[#042033] mb-1 sm:mb-2 text-sm sm:text-base">Strategic Focus</h4>
                    <p className="text-xs sm:text-sm text-[#042033]/70">
                      Move beyond task management to strategic project intelligence and team excellence
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#0F6B4A] flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-[#042033] mb-1 sm:mb-2 text-sm sm:text-base">AI-Powered Insights</h4>
                    <p className="text-xs sm:text-sm text-[#042033]/70">
                      Leverage artificial intelligence to uncover patterns and predict success probability
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-8 sm:mt-12">
              <p className="text-base sm:text-lg text-[#042033]/70 mb-4 sm:mb-6 px-2">
                Ready to transform your project management approach?
              </p>
              <Button
                onClick={onGetStarted}
                className="bg-[#0F6B4A] hover:bg-[#0D5A3E] text-white px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 font-semibold"
              >
                Start Your Journey
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
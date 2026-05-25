import { useState } from 'react';
import { ArrowLeft, Search, HelpCircle } from 'lucide-react';
import type { User } from '../App';
import { Input } from './ui/input';

type HelpScreenProps = {
  user?: User;
  onNavigate?: (screen: 'profile' | 'projects-board' | 'settings' | 'help') => void;
  onLogout?: () => void;
  onBack: () => void;
};

const faqs = [
  {
    question: "How do I create a new project?",
    answer: "Click on the '+ New Project' button from the Projects Board or the '+' circle button next to existing projects. Fill in the project details including name, description, type, and industry."
  },
  {
    question: "What is Team Optimization?",
    answer: "Team Optimization analyzes your team composition, identifies skill gaps, and provides AI-powered recommendations for optimal member assignments and capability development."
  },
  {
    question: "How does Risk Analysis work?",
    answer: "Risk Analysis evaluates project constraints (budget, timeline, resources) and provides insights about potential risks and mitigation strategies using AI intelligence."
  },
  {
    question: "What is Success Forecasting?",
    answer: "Success Forecasting predicts your project's success probability based on planning quality and execution readiness, helping you make informed decisions early."
  },
  {
    question: "How do I add team members?",
    answer: "Navigate to the Team Optimization screen for your project and click 'Add Team Member'. Enter their details including name, role, experience level, and skills."
  },
  {
    question: "Can I switch between Light and Dark themes?",
    answer: "Yes! Click the theme toggle button (sun/moon icon) in the header of any screen to switch between Light and Dark themes."
  },
  {
    question: "How do I edit my profile information?",
    answer: "Click on your user icon in the header, select 'Profile' from the dropdown menu, and update your name, email, or password as needed."
  },
  {
    question: "What if I forget my password?",
    answer: "Currently, password reset is handled through the profile settings. You need to know your current password to change it. For account recovery, contact support."
  },
  {
    question: "How is my data stored?",
    answer: "Your project data and account information are stored locally in your browser's localStorage. Make sure to backup important data regularly."
  },
  {
    question: "Can I delete a project?",
    answer: "Project deletion features are coming soon. Currently, you can create and manage multiple projects from the Projects Board."
  }
];

export function HelpScreen({ onBack }: HelpScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = faqs.filter(
    faq =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-2xl font-semibold text-foreground">Help & Support</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-input text-foreground"
            />
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground mb-6">Frequently Asked Questions</h2>
          
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-card-foreground mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for "{searchTerm}"</p>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-2">Still need help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            Contact Support
          </button>
        </div>
      </main>
    </div>
  );
}
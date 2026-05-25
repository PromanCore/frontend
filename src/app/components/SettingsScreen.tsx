import { ArrowLeft } from 'lucide-react';
import type { User } from '../App';
import { ThemeToggle } from './ThemeToggle';

type SettingsScreenProps = {
  user: User;
  onNavigate: (screen: 'profile' | 'projects-board' | 'settings' | 'help') => void;
  onLogout: () => void;
  onBack: () => void;
};

export function SettingsScreen({ onBack }: SettingsScreenProps) {
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
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <h2 className="text-xl text-card-foreground mb-6">Application Settings</h2>

          <div className="space-y-6">
            {/* Theme Setting */}
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <h3 className="text-base font-medium text-card-foreground">Theme</h3>
                <p className="text-sm text-muted-foreground">Choose light or dark theme</p>
              </div>
              <ThemeToggle />
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <h3 className="text-base font-medium text-card-foreground">Notifications</h3>
                <p className="text-sm text-muted-foreground">Manage notification preferences</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <h3 className="text-base font-medium text-card-foreground">Language</h3>
                <p className="text-sm text-muted-foreground">Choose your preferred language</p>
              </div>
              <select className="px-3 py-2 bg-input-background border border-input rounded-lg text-foreground text-sm">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>

            {/* Data Management */}
            <div className="pt-4">
              <h3 className="text-base font-medium text-card-foreground mb-2">Data Management</h3>
              <p className="text-sm text-muted-foreground mb-4">Manage your application data and cache.</p>
              <button className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors text-sm">
                Clear All Local Data
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

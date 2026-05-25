import { Brain } from 'lucide-react';

/**
 * Full-page loading spinner shown while the app verifies authentication
 * on initial load (token refresh attempt).
 * Per spec: must NOT flash the login page before redirecting.
 */
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      {/* Logo */}
      <div className="relative">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-2xl">
          <Brain className="w-10 h-10 text-white" />
        </div>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-2xl animate-ping bg-primary/30 pointer-events-none" />
      </div>

      {/* Brand */}
      <div className="text-center">
        <h1 className="text-2xl text-foreground font-semibold mb-1">ProMan</h1>
        <p className="text-sm text-muted-foreground">Project Management Intelligence</p>
      </div>

      {/* Spinner */}
      <div className="flex items-center gap-2 mt-2">
        <div
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-2 h-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-1">Restoring your session…</p>
    </div>
  );
}

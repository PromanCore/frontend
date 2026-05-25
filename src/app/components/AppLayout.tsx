/**
 * Layout wrapper for all authenticated (protected) routes.
 * Renders: TopNavigation + <Outlet> + Toaster
 */

import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { TopNavigation } from './TopNavigation';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavigation />
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

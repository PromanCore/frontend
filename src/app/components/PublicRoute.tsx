import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

/**
 * Wraps public-only routes (/login, /register, /forgot-password, /reset-password).
 *
 * Behaviour:
 * - While loading: show loading screen (prevents flash)
 * - If authenticated: redirect to /projects
 * - If NOT authenticated: render children
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
}

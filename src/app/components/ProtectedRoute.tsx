import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

/**
 * Wraps any route that requires authentication.
 *
 * Behaviour:
 * - While auth is loading (boot token refresh): show full-page loading spinner
 * - If NOT authenticated: redirect to /login, preserving the original URL in
 *   location state so the login page can redirect back after success
 * - If authenticated: render children
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}

/**
 * Global Authentication Context
 *
 * Token storage rules (per spec):
 *   accessToken       → memory ONLY (React state + ref)
 *   refreshToken      → localStorage
 *   user              → memory + localStorage cache (re-validated on load)
 *
 * On mount: if a refreshToken exists in localStorage, attempt POST /api/auth/refresh.
 *   Success → restore full auth state, let the user proceed
 *   Failure → clear everything, redirect to /login
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { setApiClientAuthFunctions } from '../lib/apiClient';
import { authApi, type AuthUser } from '../lib/authApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  /** In-memory ONLY — never serialised to storage */
  accessToken: string | null;
  /** Stored in localStorage */
  refreshToken: string | null;
  accessTokenExpiry: Date | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True while the app is verifying the refresh token on initial load */
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  /**
   * Called after a successful login API response.
   * Stores accessToken in memory, refreshToken in localStorage.
   */
  login: (
    accessToken: string,
    refreshToken: string,
    accessTokenExpiry: Date,
    user: AuthUser
  ) => void;
  /** Clears ALL auth data and cached project data, then redirects to /login */
  logout: () => void;
  /** Updates the in-memory user object after a profile edit */
  updateUser: (user: AuthUser) => void;
  /** Updates tokens after a successful refresh — called by the API client */
  updateTokens: (
    accessToken: string,
    refreshToken: string,
    accessTokenExpiry: Date
  ) => void;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────
const REFRESH_TOKEN_KEY = 'proman-refresh-token';
const USER_CACHE_KEY = 'proman-user-cache';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // accessToken lives ONLY in memory
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem(REFRESH_TOKEN_KEY)
  );
  const [accessTokenExpiry, setAccessTokenExpiry] = useState<Date | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for values the API client interceptor reads (avoids stale closures)
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(
    localStorage.getItem(REFRESH_TOKEN_KEY)
  );
  const tokenExpiryRef = useRef<Date | null>(null);

  // ─── updateTokens ───────────────────────────────────────────────────────────
  const updateTokens = useCallback(
    (newAccess: string, newRefresh: string, newExpiry: Date) => {
      accessTokenRef.current = newAccess;
      refreshTokenRef.current = newRefresh;
      tokenExpiryRef.current = newExpiry;

      setAccessToken(newAccess);
      setRefreshToken(newRefresh);
      setAccessTokenExpiry(newExpiry);

      localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
    },
    []
  );

  // ─── login ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    (
      newAccessToken: string,
      newRefreshToken: string,
      newExpiry: Date,
      newUser: AuthUser
    ) => {
      updateTokens(newAccessToken, newRefreshToken, newExpiry);
      setUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(newUser));
    },
    [updateTokens]
  );

  // ─── logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    // Clear all in-memory state
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    tokenExpiryRef.current = null;

    setAccessToken(null);
    setRefreshToken(null);
    setAccessTokenExpiry(null);
    setUser(null);
    setIsAuthenticated(false);

    // Clear storage
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    // Note: navigation to /login is handled by ProtectedRoute / callers
  }, []);

  // ─── updateUser ─────────────────────────────────────────────────────────────
  const updateUser = useCallback((newUser: AuthUser) => {
    setUser(newUser);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(newUser));
  }, []);

  // ─── Wire API client ────────────────────────────────────────────────────────
  useEffect(() => {
    setApiClientAuthFunctions({
      getAccessToken: () => accessTokenRef.current,
      getRefreshToken: () => refreshTokenRef.current,
      getTokenExpiry: () => tokenExpiryRef.current,
      onTokenRefreshed: updateTokens,
      onAuthFailure: logout,
    });
  }, [updateTokens, logout]);

  // ─── Boot: attempt token refresh ────────────────────────────────────────────
  useEffect(() => {
    const attemptRestore = async () => {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Step 1: exchange the stored refresh token for a new token pair.
        // NOTE: API-03 does NOT return a user object, so we cannot rely on
        // data.user here — that field is absent from the real API response.
        const tokenData = await authApi.refreshToken(storedRefreshToken);

        // Step 2: commit the new tokens into memory *first* so that the
        // apiClient's Authorization header is populated before the next call.
        updateTokens(
          tokenData.accessToken,
          tokenData.refreshToken,
          new Date(tokenData.accessTokenExpiresAt) // fixed: was accessTokenExpiration
        );

        // Step 3: fetch the user's profile using the freshly set access token.
        // This is required because API-03 does not return user data.
        const profile = await authApi.getProfile();
        const authUser: AuthUser = {
          id: profile.id,           // fixed: UserProfile now uses "id" not "userId"
          fullName: profile.fullName,
          email: profile.email,
        };

        // Step 4: set user in state and mark as authenticated.
        setUser(authUser);
        setIsAuthenticated(true);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(authUser));
      } catch {
        // Refresh or profile fetch failed — clear everything and go to login.
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    attemptRestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        accessTokenExpiry,
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateUser,
        updateTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
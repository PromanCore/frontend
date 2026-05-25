/**
 * Centralized HTTP client with:
 * - Automatic Bearer token injection
 * - Proactive token refresh (60-second window)
 * - Concurrency-safe refresh (single refresh, queue all waiting requests)
 * - 401 fallback logout
 * - 500 toast notifications
 * - X-Request-ID console logging in development
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// ─── Concurrency control ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// ─── Auth function bindings (injected from AuthContext) ───────────────────────
type AuthFunctions = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  getTokenExpiry: () => Date | null;
  onTokenRefreshed: (accessToken: string, refreshToken: string, expiry: Date) => void;
  onAuthFailure: () => void;
};

let authFns: AuthFunctions = {
  getAccessToken: () => null,
  getRefreshToken: () => localStorage.getItem('proman-refresh-token'),
  getTokenExpiry: () => null,
  onTokenRefreshed: () => {},
  onAuthFailure: () => {},
};

export function setApiClientAuthFunctions(fns: AuthFunctions) {
  authFns = fns;
}

// ─── Public endpoints that must NOT include an auth header ───────────────────
const PUBLIC_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
];

const isPublicEndpoint = (url?: string) =>
  PUBLIC_ENDPOINTS.some((ep) => url?.includes(ep));

// ─── Axios instance ───────────────────────────────────────────────────────────
// In development VITE_API_URL is empty → requests hit same-origin → Vite proxy
// In production  VITE_API_URL is the full Azure backend origin
export const BASE_URL: string = import.meta.env.VITE_API_URL || '';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // increased to 30s for AI analysis endpoints
});

// ─── Request interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicEndpoint(config.url)) return config;

    const token = authFns.getAccessToken();
    const expiry = authFns.getTokenExpiry();
    const refreshToken = authFns.getRefreshToken();

    // Check if token is expired or expiring within 60 seconds
    const secondsUntilExpiry = expiry
      ? (expiry.getTime() - Date.now()) / 1000
      : null;
    const isExpiring =
      secondsUntilExpiry !== null && secondsUntilExpiry < 60;

    if ((isExpiring || !token) && refreshToken) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken: string) => {
              config.headers['Authorization'] = `Bearer ${newToken}`;
              resolve(config);
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });
        const {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          accessTokenExpiresAt, // fixed: was accessTokenExpiration (API-03 field name)
        } = response.data.data;
        const newExpiry = new Date(accessTokenExpiresAt); // fixed

        authFns.onTokenRefreshed(newAccessToken, newRefreshToken, newExpiry);
        processQueue(null, newAccessToken);

        config.headers['Authorization'] = `Bearer ${newAccessToken}`;
      } catch (err) {
        processQueue(err, null);
        authFns.onAuthFailure();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    } else if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    // Log X-Request-ID in development
    if (import.meta.env.DEV) {
      const requestId = response.headers['x-request-id'];
      if (requestId) {
        console.debug(`[ProMan API] X-Request-ID: ${requestId}`);
      }
    }
    return response;
  },
  (error) => {
    if (!error.response) return Promise.reject(error);

    const { status, config, data } = error.response;
    const url: string = config?.url || '';

    // 401 on protected endpoints → logout
    if (
      status === 401 &&
      !isPublicEndpoint(url) &&
      !url.includes('/api/auth/refresh')
    ) {
      authFns.onAuthFailure();
    }

    // 5xx → toast
    if (status >= 500) {
      const message =
        data?.error?.message || 'An unexpected server error occurred.';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
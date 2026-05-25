/**
 * Auth API — real backend implementation only.
 * All calls go through apiClient which injects the Bearer token,
 * handles proactive refresh, and surfaces 5xx errors via toast.
 */

import apiClient from './apiClient';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string; // ISO-8601 — matches API-02 field name
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string; // ISO-8601 — matches API-03 field name
  // NOTE: API-03 does NOT return a user object.
  // After a successful refresh, callers must fetch /api/auth/profile separately.
}

export interface UserProfile {
  id: string;        // matches API-05/06 response field
  fullName: string;
  email: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ─── Real API implementation ──────────────────────────────────────────────────

export const authApi = {
  async register(payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    await apiClient.post('/api/auth/register', payload);
  },

  async login(payload: { email: string; password: string }): Promise<LoginResponse> {
    const res = await apiClient.post('/api/auth/login', payload);
    return res.data.data;
  },

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const res = await apiClient.post('/api/auth/refresh', { refreshToken });
    return res.data.data;
  },

  async forgotPassword(payload: { email: string }): Promise<void> {
    await apiClient.post('/api/auth/forgot-password', payload);
  },

  async resetPassword(payload: {
    resetToken: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<void> {
    await apiClient.post('/api/auth/reset-password', payload);
  },

  /** POST /api/auth/logout — idempotent per spec; always resolves. */
  async logout(payload: { refreshToken: string }): Promise<void> {
    await apiClient.post('/api/auth/logout', payload);
  },

  async getProfile(): Promise<UserProfile> {
    const res = await apiClient.get('/api/auth/profile');
    return res.data.data;
  },

  async updateProfile(payload: { fullName?: string; email?: string }): Promise<UserProfile> {
    const res = await apiClient.put('/api/auth/profile', payload);
    return res.data.data;
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<void> {
    await apiClient.put('/api/auth/change-password', payload);
  },

  async deleteAccount(payload: {
    password: string;
    confirmationPhrase: string;
  }): Promise<void> {
    await apiClient.delete('/api/auth/account', { data: payload });
  },

  /** GET /api/auth/verify-email?userId=...&token=... */
  async verifyEmail(params: { userId: string; token: string }): Promise<{ message: string }> {
    const res = await apiClient.get('/api/auth/verify-email', { params });
    return res.data.data;
  },

  /** POST /api/auth/resend-verification-email */
  async resendVerificationEmail(payload: { email: string }): Promise<{ message: string }> {
    const res = await apiClient.post('/api/auth/resend-verification-email', payload);
    return res.data.data;
  },
};

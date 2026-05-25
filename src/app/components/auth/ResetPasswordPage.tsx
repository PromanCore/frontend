import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '../../lib/authApi';
import { PasswordChecklist, isPasswordValid } from './PasswordChecklist';
import { parseApiErrors, getApiMessage } from '../../lib/apiErrorUtils';
import { AuthLayout } from './AuthLayout';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';

type PageState = 'form' | 'success' | 'invalid-token';

/* ─── Password Strength Meter ──────────────────────────────────────────────── */

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()\-_=+\[\]{}|;':",./<>?~`\\]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#E74C3C' };
  if (score <= 2) return { score: 2, label: 'Fair', color: '#F4B400' };
  if (score <= 3) return { score: 3, label: 'Good', color: '#3FAE8F' };
  if (score <= 4) return { score: 4, label: 'Strong', color: '#2ECC71' };
  return { score: 5, label: 'Excellent', color: '#2ECC71' };
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="auth-password-strength">
      <div className="auth-strength-bar-track">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`auth-strength-bar-segment ${level <= strength.score ? 'auth-strength-bar-segment--filled' : ''}`}
            style={level <= strength.score ? { backgroundColor: strength.color } : undefined}
          />
        ))}
      </div>
      <span className="auth-strength-label" style={{ color: strength.color }}>
        {strength.label}
      </span>
    </div>
  );
}

/* ─── Reset Password Page ──────────────────────────────────────────────────── */

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageState, setPageState] = useState<PageState>(
    resetToken ? 'form' : 'invalid-token'
  );
  const [errors, setErrors] = useState<{
    confirmNewPassword?: string;
    password?: string;
    general?: string;
  }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const errs: typeof errors = {};

    if (!newPassword) {
      errs.password = 'New password is required';
    } else if (!isPasswordValid(newPassword)) {
      errs.password = 'Password does not meet strength requirements';
    }

    if (!confirmNewPassword) {
      errs.confirmNewPassword = 'Please confirm your new password';
    } else if (confirmNewPassword !== newPassword) {
      errs.confirmNewPassword = 'Password and confirmation do not match';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword({
        resetToken,
        newPassword,
        confirmNewPassword,
      });
      setPageState('success');
    } catch (err: any) {
      const status = err?.response?.status;
      const message = getApiMessage(err);
      const fieldErrors = parseApiErrors(err);

      if (status === 400) {
        // Invalid/expired token takes priority — no field details present in this case
        if (
          message.toLowerCase().includes('invalid') ||
          message.toLowerCase().includes('expired')
        ) {
          setPageState('invalid-token');
        } else if (Object.keys(fieldErrors).length > 0) {
          // Map details[] directly: confirmNewPassword, newPassword
          setErrors(fieldErrors);
        } else {
          setErrors({ general: message });
        }
      }
      // 5xx handled by API interceptor
    } finally {
      setIsSubmitting(false);
    }
  }

  const allFilled = newPassword && confirmNewPassword;

  // ── Invalid / Expired Token State ──────────────────────────────────────────
  if (pageState === 'invalid-token') {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="auth-card auth-card--centered"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="auth-status-icon auth-status-icon--error"
          >
            <AlertTriangle className="w-6 h-6" />
          </motion.div>
          <h1 className="auth-title">Invalid reset link</h1>
          <p className="auth-status-description mb-6">
            This password reset link is invalid or has expired.
            It may have already been used. Please request a new one.
          </p>

          <div className="auth-status-actions">
            <AuthButton onClick={() => navigate('/forgot-password')}>
              Request New Reset Link
            </AuthButton>
            <Link to="/login" className="auth-footer-link mt-2">
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </span>
            </Link>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Success State ──────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="auth-card auth-card--centered"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
            className="auth-status-icon auth-status-icon--success"
          >
            <CheckCircle2 className="w-6 h-6" />
          </motion.div>
          <h1 className="auth-title">Password reset successful</h1>
          <p className="auth-status-description mb-6">
            Your password has been updated successfully. You can now sign in
            with your new password.
          </p>

          <div className="auth-status-actions">
            <AuthButton onClick={() => navigate('/login')}>
              Sign In to ProMan
            </AuthButton>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Form State ─────────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      {/* Auth card */}
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Set new password</h1>
          <p className="auth-subtitle">
            Choose a strong password for your account
          </p>
        </div>

        {/* General error */}
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-alert auth-alert--error"
          >
            <AlertTriangle className="w-4 h-4 auth-alert-icon" />
            <span>{errors.general}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <AuthInput
              fieldId="reset-new-password"
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {/* Password strength meter */}
            <PasswordStrengthMeter password={newPassword} />
            {/* Real-time checklist */}
            <PasswordChecklist password={newPassword} />
          </div>

          <AuthInput
            fieldId="reset-confirm-password"
            label="Confirm New Password"
            type="password"
            placeholder="Confirm new password"
            value={confirmNewPassword}
            onChange={(e) => {
              setConfirmNewPassword(e.target.value);
              if (errors.confirmNewPassword)
                setErrors((prev) => ({ ...prev, confirmNewPassword: undefined }));
            }}
            error={errors.confirmNewPassword}
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          {/* Submit */}
          <div className="pt-1">
            <AuthButton
              type="submit"
              disabled={!allFilled || isSubmitting}
              isLoading={isSubmitting}
              loadingText="Resetting…"
            >
              Reset Password
            </AuthButton>
          </div>
        </form>
      </div>

      {/* Footer */}
      <p className="auth-footer-link mt-6">
        <Link to="/login" className="inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
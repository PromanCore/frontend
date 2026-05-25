import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authApi } from '../../lib/authApi';
import { parseApiErrors, getApiMessage } from '../../lib/apiErrorUtils';
import { AuthLayout } from './AuthLayout';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';

type PageState = 'form' | 'success';

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [pageState, setPageState] = useState<PageState>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [rateLimitError, setRateLimitError] = useState('');

  // Countdown for 429 rate-limit
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCountdown(seconds: number) {
    setCountdown(seconds);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRateLimitError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError('');
    setRateLimitError('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setFieldError('Email address is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError('Please provide a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.forgotPassword({ email: trimmed });
      // CRITICAL: show success state regardless of whether the email exists
      // This prevents user enumeration.
      setPageState('success');
    } catch (err: any) {
      const status = err?.response?.status;
      const message = getApiMessage(err);
      const fieldErrors = parseApiErrors(err);

      if (status === 400) {
        // details[] has { field: "email", message: "..." } when email is invalid
        setFieldError(fieldErrors.email || message || 'Please provide a valid email address');
      } else if (status === 429) {
        setRateLimitError(message || 'Please wait before requesting another password reset');
        startCountdown(120);
      }
      // 5xx handled by API interceptor
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="auth-card auth-card--centered"
        >
          {/* Mail icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: 'easeOut' }}
            className="auth-status-icon auth-status-icon--mail auth-pulse"
          >
            <Mail className="w-6 h-6" />
          </motion.div>

          <h1 className="auth-title">Check your inbox</h1>
          <p className="auth-status-description">
            If an account with this email exists, we've sent a secure
            password reset link. Please check your inbox and spam folder.
          </p>
          <p className="auth-status-hint mb-6">
            The link will expire in 15 minutes for security reasons.
          </p>

          <div className="auth-status-actions">
            <AuthButton onClick={() => navigate('/login')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </AuthButton>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  // ── Form state ──────────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      {/* Auth card */}
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-subtitle">
            Enter your email and we'll send you a secure reset link
          </p>
        </div>

        {/* Rate-limit warning with countdown */}
        <AnimatePresence>
          {rateLimitError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="auth-alert auth-alert--warning"
            >
              <Clock className="w-4 h-4 auth-alert-icon" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{rateLimitError}</p>
                {countdown > 0 && (
                  <p className="text-xs mt-1 opacity-80">
                    Please wait{' '}
                    <span className="auth-countdown">
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </span>{' '}
                    before trying again.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthInput
            fieldId="forgot-email"
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError('');
            }}
            error={fieldError}
            autoComplete="email"
            disabled={isSubmitting || countdown > 0}
          />

          {/* Submit */}
          <div className="pt-1">
            <AuthButton
              type="submit"
              disabled={!email.trim() || isSubmitting || countdown > 0}
              isLoading={isSubmitting}
              loadingText="Sending…"
            >
              {countdown > 0 ? (
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Retry in{' '}
                  <span className="auth-countdown">
                    {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                  </span>
                </span>
              ) : (
                'Send Reset Link'
              )}
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
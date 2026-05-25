import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { authApi } from '../../lib/authApi';
import { AuthLayout } from './AuthLayout';
import { AuthButton } from './AuthButton';

/** Cooldown between resend requests (seconds) */
const RESEND_COOLDOWN = 60;

export function CheckEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    setResendSuccess(false);
    try {
      await authApi.resendVerificationEmail({ email });
      setResendSuccess(true);
      toast.success('Verification email sent. Check your inbox.');
      startCooldown();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ||
          'Failed to resend verification email. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthLayout>
      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="auth-card auth-card--centered"
      >
        {/* Mail icon with pulse animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
          className="auth-status-icon auth-status-icon--mail auth-pulse"
        >
          <Mail className="w-6 h-6" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h1 className="auth-title">Verify your email</h1>
          <p className="auth-status-description">
            Your account has been created successfully.
            We sent a secure verification link to activate your account.
          </p>

          {email && (
            <p className="auth-status-description" style={{ marginBottom: '1.5rem' }}>
              Check your inbox at{' '}
              <span className="auth-email-highlight">{email}</span>
            </p>
          )}
        </motion.div>

        {/* Success confirmation */}
        {resendSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-alert auth-alert--success mb-4"
          >
            <CheckCircle2 className="w-4 h-4 auth-alert-icon" />
            <span className="text-sm">Verification email sent successfully</span>
          </motion.div>
        )}

        {/* Actions */}
        <div className="auth-status-actions">
          <AuthButton
            variant="secondary"
            onClick={handleResend}
            disabled={isResending || !email || cooldown > 0}
            isLoading={isResending}
            loadingText="Sending…"
          >
            {cooldown > 0 ? (
              <span className="flex items-center gap-2">
                Resend in{' '}
                <span className="auth-countdown">{cooldown}s</span>
              </span>
            ) : (
              'Resend Verification Email'
            )}
          </AuthButton>
        </div>

        {/* Help text */}
        <p className="auth-status-hint mt-4">
          Didn't receive it? Check your spam folder, or use the button above to resend.
        </p>
      </motion.div>

      {/* Footer */}
      <p className="auth-footer-link mt-6">
        Already verified?{' '}
        <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '../../lib/authApi';
import { AuthLayout } from './AuthLayout';
import { AuthButton } from './AuthButton';

type VerifyState = 'loading' | 'success' | 'error' | 'missing-params';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const token = searchParams.get('token') || '';

  const [state, setState] = useState<VerifyState>(
    userId && token ? 'loading' : 'missing-params'
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!userId || !token) return;

    let cancelled = false;
    authApi
      .verifyEmail({ userId, token })
      .then(() => {
        if (!cancelled) setState('success');
      })
      .catch((err: any) => {
        if (cancelled) return;
        setErrorMessage(
          err?.response?.data?.error?.message ||
            'Verification link is invalid or expired.'
        );
        setState('error');
      });

    return () => { cancelled = true; };
  }, [userId, token]);

  return (
    <AuthLayout>
      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="auth-card auth-card--centered"
      >
        {/* ── Loading State ──────────────────────────────────────────────── */}
        {state === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="auth-status-icon auth-status-icon--info">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h1 className="auth-title">Verifying your email</h1>
            <p className="auth-status-description">
              Please wait while we verify your email address…
            </p>
          </motion.div>
        )}

        {/* ── Success State ──────────────────────────────────────────────── */}
        {state === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
              className="auth-status-icon auth-status-icon--success"
            >
              <CheckCircle2 className="w-6 h-6" />
            </motion.div>
            <h1 className="auth-title">Email verified!</h1>
            <p className="auth-status-description mb-6">
              Your email has been verified successfully. You can now sign in
              to your project intelligence dashboard.
            </p>

            <div className="auth-status-actions">
              <Link to="/login">
                <AuthButton type="button">
                  Sign In to ProMan
                </AuthButton>
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── Error State ────────────────────────────────────────────────── */}
        {state === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="auth-status-icon auth-status-icon--error"
            >
              <XCircle className="w-6 h-6" />
            </motion.div>
            <h1 className="auth-title">Verification failed</h1>
            <p className="auth-status-description">
              {errorMessage || 'Verification link is invalid or expired.'}
            </p>
            <p className="auth-status-hint mb-6">
              The link may have expired. You can request a new verification
              email from the sign-in page.
            </p>

            <div className="auth-status-actions">
              <Link to="/login">
                <AuthButton variant="secondary" type="button">
                  Back to Sign In
                </AuthButton>
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── Missing Params State ───────────────────────────────────────── */}
        {state === 'missing-params' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="auth-status-icon auth-status-icon--error"
            >
              <XCircle className="w-6 h-6" />
            </motion.div>
            <h1 className="auth-title">Invalid verification link</h1>
            <p className="auth-status-description mb-6">
              This verification link is missing required parameters.
              Please use the link sent to your email, or request a
              new one from the sign-in page.
            </p>

            <div className="auth-status-actions">
              <Link to="/login">
                <AuthButton variant="secondary" type="button">
                  Back to Sign In
                </AuthButton>
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AuthLayout>
  );
}

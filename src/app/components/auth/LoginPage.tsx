import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { AlertTriangle, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { authApi } from '../../lib/authApi';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLayout } from './AuthLayout';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';

interface FormErrors {
  email?: string;
  password?: string;
  /** Shown ABOVE the form — intentionally generic (security: no user enumeration) */
  general?: string;
  /** Account locked warning */
  locked?: string;
  /** Email not yet verified — carries the email address for the resend flow */
  unverifiedEmail?: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect back to originally requested URL after login, default → /projects
  const from = (location.state as any)?.from?.pathname || '/projects';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Basic client-side check
    const newErrors: FormErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await authApi.login({
        email: email.trim().toLowerCase(),
        password, // raw value
      });

      login(
        data.accessToken,
        data.refreshToken,
        new Date(data.accessTokenExpiresAt), // fixed: was data.accessTokenExpiration
        data.user
      );

      navigate(from, { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      const message: string =
        err?.response?.data?.error?.message || err?.message || '';

      if (status === 401) {
        if (message.toLowerCase().includes('verify your email')) {
          setErrors({ unverifiedEmail: email.trim().toLowerCase() });
        } else {
          // CRITICAL: same message for wrong email AND wrong password (no user enumeration)
          setErrors({ general: 'Invalid email or password.' });
        }
      } else if (status === 423) {
        setErrors({ locked: message });
      } else if (status === 400) {
        setErrors({ email: '', password: '' }); // highlight both with red border
        setErrors({ general: 'Email and password are required.' });
      }
      // 5xx handled by API interceptor (toast)
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendFromLogin() {
    if (!errors.unverifiedEmail) return;
    setIsResendingVerification(true);
    try {
      await authApi.resendVerificationEmail({ email: errors.unverifiedEmail });
      toast.success('Verification email sent. Please check your inbox.');
    } catch {
      toast.error('Failed to resend verification email. Please try again.');
    } finally {
      setIsResendingVerification(false);
    }
  }

  const allFilled = email.trim() && password;

  return (
    <AuthLayout>
      {/* Auth card */}
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">
            Sign in to your project intelligence dashboard
          </p>
        </div>

        {/* Account locked banner */}
        {errors.locked && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-alert auth-alert--error"
          >
            <AlertTriangle className="w-4 h-4 auth-alert-icon" />
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">
                {errors.locked.replace('reset your password', '')}{' '}
                <Link
                  to="/forgot-password"
                  className="underline font-medium hover:opacity-80 transition-opacity"
                >
                  reset your password
                </Link>
              </p>
            </div>
          </motion.div>
        )}

        {/* Unverified email banner */}
        {errors.unverifiedEmail && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-alert auth-alert--warning"
          >
            <Mail className="w-4 h-4 auth-alert-icon" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm mb-0.5">Email not verified</p>
              <p className="text-xs opacity-80 leading-relaxed mb-2">
                Please verify your email address before signing in. Check your inbox for a verification link.
              </p>
              <button
                type="button"
                onClick={handleResendFromLogin}
                disabled={isResendingVerification}
                className="inline-flex items-center gap-1.5 text-xs font-medium underline transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {isResendingVerification ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Sending…</>
                ) : (
                  'Resend verification email'
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* General error */}
        {errors.general && !errors.locked && (
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
          <AuthInput
            fieldId="login-email"
            label="Email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            autoComplete="email"
            disabled={isSubmitting}
          />

          <AuthInput
            fieldId="login-password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            autoComplete="current-password"
            disabled={isSubmitting}
          />

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="auth-checkbox-wrapper">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="auth-checkbox"
              />
              <span className="auth-checkbox-label">Remember me</span>
            </label>

            <Link to="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <div className="pt-1">
            <AuthButton
              type="submit"
              disabled={!allFilled || isSubmitting}
              isLoading={isSubmitting}
              loadingText="Signing in…"
            >
              Sign In
            </AuthButton>
          </div>
        </form>
      </div>

      {/* Footer */}
      <p className="auth-footer-link mt-6">
        Don't have an account?{' '}
        <Link to="/register">Create account</Link>
      </p>
    </AuthLayout>
  );
}
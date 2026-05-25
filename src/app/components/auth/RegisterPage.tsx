import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { authApi } from '../../lib/authApi';
import { AuthLayout } from './AuthLayout';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import { PasswordChecklist, isPasswordValid } from './PasswordChecklist';
import { parseApiErrors, getApiMessage } from '../../lib/apiErrorUtils';

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

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

/* ─── Register Page ────────────────────────────────────────────────────────── */

export function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // ─── Client-side validation ─────────────────────────────────────────────────
  function validate(): FieldErrors {
    const errs: FieldErrors = {};

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      errs.fullName = 'Full name is required';
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      errs.fullName = 'Full name must be between 2 and 100 characters';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Please provide a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (!isPasswordValid(password)) {
      errs.password = 'Password does not meet strength requirements';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      errs.confirmPassword = 'Password and confirmation do not match';
    }

    return errs;
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password, // raw — do NOT trim
        confirmPassword,
      });

      navigate(`/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      const status = err?.response?.status;
      const message = getApiMessage(err);
      const fieldErrors = parseApiErrors(err);

      if (status === 409) {
        // Email conflict — details[] always has { field: "email", message: "..." }
        setErrors({ email: fieldErrors.email || 'An account with this email already exists' });
      } else if (status === 400) {
        if (Object.keys(fieldErrors).length > 0) {
          // Map details[] directly to form fields: fullName, email, password, confirmPassword
          setErrors(fieldErrors);
        } else {
          // Generic 400 with no field details (e.g. "All fields are required")
          setErrors({ general: message || 'Registration failed. Please check your inputs.' });
        }
      } else if (status >= 500) {
        // The API interceptor fires a toast for 5xx; do not double-toast
      } else {
        toast.error('Service temporarily unavailable. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const allFilled = fullName && email && password && confirmPassword;

  return (
    <AuthLayout>
      {/* Auth card */}
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">
            Start managing your projects with AI-powered intelligence
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
          <AuthInput
            fieldId="register-name"
            label="Full Name"
            type="text"
            placeholder="John Smith"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            error={errors.fullName}
            autoComplete="name"
            disabled={isSubmitting}
          />

          <AuthInput
            fieldId="register-email"
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

          <div>
            <AuthInput
              fieldId="register-password"
              label="Password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {/* Password strength meter */}
            <PasswordStrengthMeter password={password} />
            {/* Real-time password checklist */}
            <PasswordChecklist password={password} />
          </div>

          <AuthInput
            fieldId="register-confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          {/* Terms agreement */}
          <label className="auth-checkbox-wrapper pt-1">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="auth-checkbox"
            />
            <span className="auth-checkbox-label">
              I agree to the{' '}
              <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>
                Privacy Policy
              </a>
            </span>
          </label>

          {/* Submit */}
          <div className="pt-1">
            <AuthButton
              type="submit"
              disabled={!allFilled || !agreedToTerms || isSubmitting}
              isLoading={isSubmitting}
              loadingText="Creating account…"
            >
              Create Account
            </AuthButton>
          </div>
        </form>
      </div>

      {/* Footer */}
      <p className="auth-footer-link mt-6">
        Already have an account?{' '}
        <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
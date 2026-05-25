import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  type?: 'text' | 'email' | 'password';
  error?: string;
  /** Unique identifier (also used as htmlFor) */
  fieldId: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, type = 'text', error, fieldId, className, disabled, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="auth-field-group">
        <label
          htmlFor={fieldId}
          className={`auth-field-label ${error ? 'auth-field-label--error' : ''}`}
        >
          {label}
        </label>

        <div className={`auth-input-wrapper ${isFocused ? 'auth-input-wrapper--focused' : ''} ${error ? 'auth-input-wrapper--error' : ''} ${disabled ? 'auth-input-wrapper--disabled' : ''}`}>
          <input
            ref={ref}
            id={fieldId}
            type={inputType}
            disabled={disabled}
            className={`auth-input ${isPassword ? 'pr-11' : ''} ${className || ''}`}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="auth-password-toggle"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="auth-field-error"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';

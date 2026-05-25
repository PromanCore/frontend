import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
}

export function AuthButton({
  children,
  isLoading,
  loadingText,
  variant = 'primary',
  disabled,
  className,
  ...props
}: AuthButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.1 }}
      disabled={isDisabled}
      className={`auth-button ${variant === 'primary' ? 'auth-button--primary' : 'auth-button--secondary'} ${className || ''}`}
      {...(props as any)}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText || 'Please wait…'}</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}

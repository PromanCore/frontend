import { Check, X, Minus } from 'lucide-react';
import { motion } from 'motion/react';

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'minLength',
    label: 'At least 8 characters',
    test: (p) => p.length >= 8,
  },
  {
    id: 'maxLength',
    label: 'No more than 128 characters',
    test: (p) => p.length <= 128,
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter (A–Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter (a–z)',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'number',
    label: 'At least one number (0–9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'At least one special character (!@#$%^&*…)',
    test: (p) => /[!@#$%^&*()\-_=+\[\]{}|;':",./<>?~`\\]/.test(p),
  },
  {
    id: 'noSpaces',
    label: 'No leading or trailing spaces',
    test: (p) => p.length > 0 && p[0] !== ' ' && p[p.length - 1] !== ' ',
  },
];

/** Returns true only when ALL rules pass. */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

interface PasswordChecklistProps {
  password: string;
  /** IDs of rules to force-highlight as failing (e.g. from API error response) */
  forceFailIds?: string[];
}

export function PasswordChecklist({
  password,
  forceFailIds = [],
}: PasswordChecklistProps) {
  if (!password && forceFailIds.length === 0) {
    // Don't show until the user starts typing
    return null;
  }

  return (
    <motion.ul
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="auth-checklist"
    >
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        const forceFail = forceFailIds.includes(rule.id);
        const isGood = passed && !forceFail;
        const isNeutral = !password && !forceFail;

        return (
          <li key={rule.id} className="auth-checklist-item">
            <span
              className={`auth-checklist-icon ${
                isNeutral
                  ? 'auth-checklist-icon--neutral'
                  : isGood
                  ? 'auth-checklist-icon--pass'
                  : 'auth-checklist-icon--fail'
              }`}
            >
              {isNeutral ? (
                <Minus className="w-2 h-2" strokeWidth={3} />
              ) : isGood ? (
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              ) : (
                <X className="w-2.5 h-2.5" strokeWidth={3} />
              )}
            </span>
            <span
              className={
                isNeutral
                  ? 'auth-checklist-text--neutral'
                  : isGood
                  ? 'auth-checklist-text--pass'
                  : 'auth-checklist-text--fail'
              }
            >
              {rule.label}
            </span>
          </li>
        );
      })}
    </motion.ul>
  );
}

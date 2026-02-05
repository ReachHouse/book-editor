/**
 * =============================================================================
 * PASSWORD STRENGTH INDICATOR COMPONENT
 * =============================================================================
 *
 * Visual indicator showing password strength requirements and their status.
 * Used in RegisterPage and SetupWizard for consistent password validation UX.
 *
 * PROPS:
 * ------
 * @param {string} password - Current password value to evaluate
 *
 * =============================================================================
 */

import React from 'react';
import { CheckCircle, X } from 'lucide-react';

/**
 * Visual password strength indicator showing which requirements are met.
 */
function PasswordStrength({ password }) {
  if (!password) {
    return (
      <p id="password-requirements" className="text-xs text-surface-500 mt-1">
        At least 8 characters with uppercase, lowercase, and a number.
      </p>
    );
  }

  const requirements = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) }
  ];

  const metCount = requirements.filter(r => r.met).length;
  const strengthPercent = (metCount / requirements.length) * 100;
  const strengthColor = metCount <= 1 ? 'bg-red-500' : metCount <= 2 ? 'bg-amber-500' : metCount <= 3 ? 'bg-blue-500' : 'bg-green-500';
  const strengthLabel = metCount <= 1 ? 'Weak' : metCount <= 2 ? 'Fair' : metCount <= 3 ? 'Good' : 'Strong';

  return (
    <div id="password-requirements" className="mt-2 space-y-2">
      {/* Strength bar */}
      <div
        className="h-1 rounded-full bg-surface-800/60 overflow-hidden"
        role="progressbar"
        aria-valuenow={metCount}
        aria-valuemin={0}
        aria-valuemax={requirements.length}
        aria-label={`Password strength: ${strengthLabel} (${metCount} of ${requirements.length} requirements met)`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
          style={{ width: `${strengthPercent}%` }}
          aria-hidden="true"
        />
      </div>
      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {req.met ? (
              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" aria-hidden="true" />
            ) : (
              <X className="w-3 h-3 text-surface-600 flex-shrink-0" aria-hidden="true" />
            )}
            <span className={`text-xs ${req.met ? 'text-green-400' : 'text-surface-500'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordStrength;

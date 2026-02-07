/**
 * =============================================================================
 * ADMIN DASHBOARD HELPER FUNCTIONS
 * =============================================================================
 *
 * Shared utility functions used across admin dashboard tab components.
 * Extracted from AdminDashboard.jsx for modularity.
 *
 * =============================================================================
 */

/**
 * Format a token count for display.
 * Token limit semantics:
 *   <0 = Unlimited (no restrictions) - any negative value is treated as unlimited
 *    0 = Restricted (cannot use API)
 *   >0 = Specific limit
 */
export function formatTokenCount(count, isLimit = false) {
  if (isLimit) {
    // Any negative value is treated as unlimited (handles edge cases/corruption)
    if (count < 0) return '\u221e';
    if (count === 0) return 'Restricted';
  }
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return count.toString();
}

/**
 * Check if a user has unlimited access (any negative value is unlimited)
 */
export function isUserUnlimited(user) {
  return user.dailyTokenLimit < 0 && user.monthlyTokenLimit < 0;
}

/**
 * Check if a user has restricted access (both limits are 0)
 */
export function isUserRestricted(user) {
  return user.dailyTokenLimit === 0 && user.monthlyTokenLimit === 0;
}

/**
 * Get the limit status tag for a user.
 * Returns { label, className } for the appropriate limit status.
 */
export function getLimitStatusTag(user) {
  if (isUserUnlimited(user)) {
    return {
      label: 'Unlimited',
      className: 'bg-amber-500/15 text-amber-200'
    };
  }
  if (isUserRestricted(user)) {
    return {
      label: 'Restricted',
      className: 'bg-rose-500/15 text-rose-200'
    };
  }
  // Limited (specific limits > 0)
  return {
    label: 'Limited',
    className: 'bg-teal-500/15 text-teal-200'
  };
}

/**
 * Get the color class for a limit value.
 * Any negative value is treated as unlimited.
 */
export function getLimitColorClass(limit) {
  if (limit < 0) return 'text-amber-200 font-medium';
  if (limit === 0) return 'text-rose-200 font-medium';
  return '';
}

/**
 * Dispatch event to notify other components (like UsageDisplay) to refresh
 */
export function dispatchUsageUpdatedEvent() {
  window.dispatchEvent(new CustomEvent('usage-updated'));
}

export function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

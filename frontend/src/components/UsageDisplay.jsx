/**
 * =============================================================================
 * USAGE DISPLAY COMPONENT
 * =============================================================================
 *
 * Shows the user's daily and monthly token usage with progress bars.
 * Compact display designed to fit in the header area.
 *
 * PROPS:
 * ------
 * (none - fetches its own data)
 *
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { getUsage } from '../services/api';

/**
 * Format a token count for display (e.g., 500000 -> "500K").
 *
 * @param {number} count - Token count
 * @returns {string} Formatted string
 */
function formatTokenCount(count) {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`;
  }
  return count.toString();
}

/**
 * Get the color class based on usage percentage.
 *
 * @param {number} percentage - Usage percentage (0-100)
 * @returns {string} Tailwind color class
 */
function getBarColor(percentage) {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 75) return 'bg-amber-500';
  return 'bg-brand-500';
}

function UsageDisplay() {
  const [usage, setUsage] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const fetchUsage = useCallback(async () => {
    try {
      const data = await getUsage();
      setUsage(data);
    } catch {
      // Silently fail — usage display is non-critical
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    // Refresh usage data every 2 minutes
    const interval = setInterval(fetchUsage, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  if (!usage) return null;

  return (
    <div className="mt-4 mb-2 animate-fade-in">
      {/* Compact toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mx-auto text-xs text-surface-500 hover:text-surface-300 transition-colors py-1 px-3 rounded-lg hover:bg-surface-800/30"
        aria-expanded={expanded}
        aria-label="Toggle usage details"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        <span>
          Today: {formatTokenCount(usage.daily.total)} / {formatTokenCount(usage.daily.limit)}
        </span>
        <span className="text-surface-600">|</span>
        <span>
          Month: {formatTokenCount(usage.monthly.total)} / {formatTokenCount(usage.monthly.limit)}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 mx-auto max-w-sm glass-card p-4 space-y-3">
          {/* Daily usage */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-surface-400">Daily Usage</span>
              <span className="text-surface-500">
                {formatTokenCount(usage.daily.total)} / {formatTokenCount(usage.daily.limit)} tokens
              </span>
            </div>
            <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(usage.daily.percentage)}`}
                style={{ width: `${usage.daily.percentage}%` }}
              />
            </div>
            {usage.daily.percentage >= 90 && (
              <p className="text-xs text-amber-400 mt-1">
                Approaching daily limit. Resets at midnight UTC.
              </p>
            )}
          </div>

          {/* Monthly usage */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-surface-400">Monthly Usage</span>
              <span className="text-surface-500">
                {formatTokenCount(usage.monthly.total)} / {formatTokenCount(usage.monthly.limit)} tokens
              </span>
            </div>
            <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(usage.monthly.percentage)}`}
                style={{ width: `${usage.monthly.percentage}%` }}
              />
            </div>
            {usage.monthly.percentage >= 90 && (
              <p className="text-xs text-amber-400 mt-1">
                Approaching monthly limit. Resets on the 1st.
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div className="text-xs text-surface-600 pt-1 border-t border-surface-800">
            Today: {formatTokenCount(usage.daily.input)} in / {formatTokenCount(usage.daily.output)} out
          </div>
        </div>
      )}
    </div>
  );
}

export default UsageDisplay;

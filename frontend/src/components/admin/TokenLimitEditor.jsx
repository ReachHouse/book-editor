/** TokenLimitEditor — Inline editor for daily/monthly token limits. */

import React, { useState } from 'react';

function TokenLimitEditor({ dailyLimit, monthlyLimit, onSave, onCancel, idPrefix = 'limit' }) {
  const [daily, setDaily] = useState(dailyLimit.toString());
  const [monthly, setMonthly] = useState(monthlyLimit.toString());

  // Validate that value is a valid limit: -1 (unlimited), 0 (restricted), or positive integer
  const isValidLimit = (val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num >= -1 && String(num) === val.trim();
  };

  const isDailyValid = isValidLimit(daily);
  const isMonthlyValid = isValidLimit(monthly);
  const canSave = isDailyValid && isMonthlyValid;

  // Generate unique ids for form fields
  const dailyId = `${idPrefix}-daily-${React.useId ? React.useId() : Math.random().toString(36).slice(2)}`;
  const monthlyId = `${idPrefix}-monthly-${React.useId ? React.useId() : Math.random().toString(36).slice(2)}`;

  return (
    <div className="mt-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor={dailyId} className="text-xs text-surface-400 block mb-1">Daily Token Limit</label>
          <input
            id={dailyId}
            type="number"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            className={`w-full px-2 py-1.5 text-sm bg-surface-900 border rounded text-surface-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
              isDailyValid ? 'border-surface-700 focus:border-brand-500' : 'border-rose-500/50'
            }`}
            min="-1"
            aria-invalid={!isDailyValid}
          />
        </div>
        <div>
          <label htmlFor={monthlyId} className="text-xs text-surface-400 block mb-1">Monthly Token Limit</label>
          <input
            id={monthlyId}
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className={`w-full px-2 py-1.5 text-sm bg-surface-900 border rounded text-surface-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
              isMonthlyValid ? 'border-surface-700 focus:border-brand-500' : 'border-rose-500/50'
            }`}
            min="-1"
            aria-invalid={!isMonthlyValid}
          />
        </div>
      </div>
      <p className="text-xs text-surface-500 mb-3">
        Use <span className="text-amber-200 font-medium">-1</span> for unlimited, <span className="text-rose-200 font-medium">0</span> for restricted, or enter a specific limit.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(daily, monthly)}
          disabled={!canSave}
          className="text-xs px-3 py-1.5 rounded bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded bg-surface-800 text-surface-400 hover:bg-surface-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default TokenLimitEditor;

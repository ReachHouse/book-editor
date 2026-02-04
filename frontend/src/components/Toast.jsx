import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const CONFIG = {
  success: { Icon: CheckCircle, color: 'text-brand-400', border: 'border-brand-500/15' },
  error: { Icon: AlertCircle, color: 'text-red-400', border: 'border-red-500/15' },
  info: { Icon: Info, color: 'text-blue-400', border: 'border-blue-500/15' },
};

/**
 * Individual toast notification.
 */
function Toast({ toast, onDismiss }) {
  const { Icon, color, border } = CONFIG[toast.type] || CONFIG.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        glass-card border ${border} px-4 py-3 flex items-center gap-3
        min-w-[260px] max-w-sm pointer-events-auto
        ${toast.exiting ? 'animate-toast-out' : 'animate-toast-in'}
      `}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
      <p className="text-sm text-surface-200 flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="w-6 h-6 flex items-center justify-center rounded text-surface-500 hover:text-surface-300 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/**
 * Toast container — renders toast stack in fixed position.
 */
function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export { Toast, ToastContainer };
export default ToastContainer;

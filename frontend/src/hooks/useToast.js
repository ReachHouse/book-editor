import { useState, useCallback, useEffect, useRef } from 'react';

let nextId = 0;

/**
 * Lightweight toast notification hook.
 * Manages a queue of auto-dismissing toast messages.
 *
 * @param {number} maxVisible - Maximum visible toasts (oldest removed first)
 * @returns {{ toasts, addToast, dismissToast }}
 */
export function useToast(maxVisible = 3) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  // Clear all timers on unmount to prevent stale state updates
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const dismissToast = useCallback((id) => {
    // Mark as exiting for animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    // Remove after exit animation completes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++nextId;
    setToasts(prev => [...prev.slice(-(maxVisible - 1)), { id, message, type, exiting: false }]);

    timersRef.current[id] = setTimeout(() => {
      dismissToast(id);
    }, duration);

    return id;
  }, [maxVisible, dismissToast]);

  return { toasts, addToast, dismissToast };
}

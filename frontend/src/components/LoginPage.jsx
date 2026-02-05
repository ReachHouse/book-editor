/**
 * =============================================================================
 * LOGIN PAGE COMPONENT
 * =============================================================================
 *
 * Full-page login form displayed when the user is not authenticated.
 * Provides email/username + password login and a link to switch to registration.
 *
 * PROPS:
 * ------
 * @param {function} onSwitchToRegister - Callback to show RegisterPage instead
 *
 * =============================================================================
 */

import React, { useState } from 'react';
import { FileText, LogIn, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function LoginPage({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please enter your email/username and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      // Clear sensitive data from component state on success
      setPassword('');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 text-surface-200 relative overflow-hidden flex items-center justify-center">
      {/* Ambient background layers */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/50 to-surface-950" />
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-[0.035] ambient-glow-green" />
        <div className="absolute -bottom-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full opacity-[0.02] ambient-glow-blue" />
        <div className="absolute inset-0 opacity-[0.015] noise-texture" />
      </div>

      <div className="relative w-full max-w-md px-4">
        {/* Logo and title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass-icon mb-5">
            <FileText className="w-7 h-7 text-brand-400" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2 text-white tracking-tight">
            Book Editor
          </h1>
          <p className="text-surface-400 text-sm font-light tracking-wide">
            Sign in to your account
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} noValidate className="glass-card p-6 sm:p-8 animate-fade-in">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20" role="alert">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Email/Username field */}
          <div className="mb-4">
            <label htmlFor="login-identifier" className="block text-sm font-medium text-surface-300 mb-1.5">
              Email or Username
            </label>
            <input
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="you@example.com"
              autoComplete="username"
              disabled={submitting}
            />
          </div>

          {/* Password field */}
          <div className="mb-6">
            <label htmlFor="login-password" className="block text-sm font-medium text-surface-300 mb-1.5">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-sm font-medium focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>

          {/* Register link */}
          <div className="mt-5 text-center">
            <p className="text-sm text-surface-400">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                Register with invite code
              </button>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-surface-600">&copy; {new Date().getFullYear()} Reach Publishers</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

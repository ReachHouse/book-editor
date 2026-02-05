/**
 * =============================================================================
 * REGISTER PAGE COMPONENT
 * =============================================================================
 *
 * Full-page registration form. New users must provide a valid invite code
 * (issued by an admin) to create an account.
 *
 * PROPS:
 * ------
 * @param {function} onSwitchToLogin - Callback to show LoginPage instead
 *
 * =============================================================================
 */

import React, { useState } from 'react';
import { FileText, UserPlus, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function RegisterPage({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!username.trim() || !email.trim() || !password || !inviteCode.trim()) {
      setError('All fields are required.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setError('Username may only contain letters, numbers, hyphens, and underscores.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register(username.trim(), email.trim(), password, inviteCode.trim());
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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

      <div className="relative w-full max-w-md px-4 py-8">
        {/* Logo and title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass-icon mb-5">
            <FileText className="w-7 h-7 text-brand-400" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2 text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-surface-400 text-sm font-light tracking-wide">
            Register with your invite code
          </p>
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} noValidate className="glass-card p-6 sm:p-8 animate-fade-in">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20" role="alert">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Invite Code field - first because it's the barrier to entry */}
          <div className="mb-4">
            <label htmlFor="register-invite" className="block text-sm font-medium text-surface-300 mb-1.5">
              Invite Code
            </label>
            <input
              id="register-invite"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors font-mono tracking-wider"
              placeholder="XXXX-XXXX-XXXX"
              autoComplete="off"
              disabled={submitting}
            />
            <p className="text-xs text-surface-500 mt-1">
              Contact your admin to receive an invite code.
            </p>
          </div>

          {/* Username field */}
          <div className="mb-4">
            <label htmlFor="register-username" className="block text-sm font-medium text-surface-300 mb-1.5">
              Username
            </label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="johndoe"
              autoComplete="username"
              disabled={submitting}
            />
          </div>

          {/* Email field */}
          <div className="mb-4">
            <label htmlFor="register-email" className="block text-sm font-medium text-surface-300 mb-1.5">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          {/* Password field */}
          <div className="mb-4">
            <label htmlFor="register-password" className="block text-sm font-medium text-surface-300 mb-1.5">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          {/* Confirm password field */}
          <div className="mb-6">
            <label htmlFor="register-confirm" className="block text-sm font-medium text-surface-300 mb-1.5">
              Confirm Password
            </label>
            <input
              id="register-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={submitting}
            />
            {password && confirmPassword && password === confirmPassword && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <p className="text-xs text-green-400">Passwords match</p>
              </div>
            )}
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
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account
              </>
            )}
          </button>

          {/* Login link */}
          <div className="mt-5 text-center">
            <p className="text-sm text-surface-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                Sign in
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

export default RegisterPage;

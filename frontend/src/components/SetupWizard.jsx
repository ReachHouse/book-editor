/** SetupWizard — First-time admin account creation wizard. */

import React, { useState, useRef, useEffect } from 'react';
import { FileText, Shield, AlertCircle, Loader, CheckCircle, ArrowRight, Key, Lock } from 'lucide-react';
import { completeSetup } from '../services/api';
import PasswordStrength from './PasswordStrength';

function SetupWizard({ onSetupComplete, setupEnabled = true }) {
  const [setupSecret, setSetupSecret] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Refs to handle browser autofill (autofill may not trigger onChange)
  const setupSecretRef = useRef(null);
  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Ref for success redirect timeout (to clean up on unmount)
  const redirectTimeoutRef = useRef(null);

  // Clean up timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Read values from refs to handle browser autofill (autofill may not trigger onChange)
    // Fall back to state values if refs are not available
    const secretValue = (setupSecretRef.current?.value || setupSecret).trim();
    const usernameValue = (usernameRef.current?.value || username).trim();
    const emailValue = (emailRef.current?.value || email).trim();
    const passwordValue = passwordRef.current?.value || password;
    const confirmValue = confirmPasswordRef.current?.value || confirmPassword;

    // Sync state with ref values (in case autofill populated them)
    if (secretValue !== setupSecret) setSetupSecret(secretValue);
    if (usernameValue !== username) setUsername(usernameValue);
    if (emailValue !== email) setEmail(emailValue);
    if (passwordValue !== password) setPassword(passwordValue);
    if (confirmValue !== confirmPassword) setConfirmPassword(confirmValue);

    // Client-side validation (mirrors backend validation)
    if (!secretValue) {
      setError('Setup secret is required. Check your deployment environment variables.');
      return;
    }

    if (!usernameValue || !emailValue || !passwordValue) {
      setError('All fields are required.');
      return;
    }

    if (usernameValue.length < 3 || usernameValue.length > 30) {
      setError('Username must be 3-30 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(usernameValue)) {
      setError('Username may only contain letters, numbers, hyphens, and underscores.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (passwordValue.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(passwordValue)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }

    if (!/[a-z]/.test(passwordValue)) {
      setError('Password must contain at least one lowercase letter.');
      return;
    }

    if (!/[0-9]/.test(passwordValue)) {
      setError('Password must contain at least one number.');
      return;
    }

    if (passwordValue !== confirmValue) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await completeSetup({
        setup_secret: secretValue,
        username: usernameValue,
        email: emailValue,
        password: passwordValue
      });

      // Clear sensitive data
      setSetupSecret('');
      setPassword('');
      setConfirmPassword('');
      setSuccess(true);

      // Notify parent after brief delay to show success message
      redirectTimeoutRef.current = setTimeout(() => {
        onSetupComplete();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-surface-950 text-surface-200 relative overflow-hidden flex items-center justify-center">
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/50 to-surface-950" />
          <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-[0.035] ambient-glow-green" />
          <div className="absolute inset-0 opacity-[0.015] noise-texture" />
        </div>

        <div className="relative w-full max-w-md px-4 py-8 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/15 border border-brand-500/20 mb-6">
            <CheckCircle className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-3 text-white">
            Setup Complete!
          </h1>
          <p className="text-surface-400 mb-6">
            Your admin account has been created. Redirecting to login...
          </p>
          <Loader className="w-5 h-5 text-brand-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-200 relative overflow-hidden flex items-center justify-center">
      {/* Ambient background layers */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/50 to-surface-950" />
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full opacity-[0.035] ambient-glow-green" />
        <div className="absolute -bottom-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full opacity-[0.02] ambient-glow-teal" />
        <div className="absolute inset-0 opacity-[0.015] noise-texture" />
      </div>

      <div className="relative w-full max-w-md px-4 py-8">
        {/* Logo and title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass-icon mb-5">
            <FileText className="w-7 h-7 text-brand-400" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2 text-white tracking-tight">
            Welcome
          </h1>
          <p className="text-sm text-surface-400 tracking-wide">
            Set up your admin account
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-brand-500/10 border border-brand-500/20 animate-fade-in">
          <Shield className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-brand-300 font-medium mb-1">First-Time Setup</p>
            <p className="text-xs text-surface-400">
              This wizard only appears once. You're creating the primary administrator account
              that will manage all users and settings.
            </p>
          </div>
        </div>

        {/* Warning if setup is not enabled */}
        {!setupEnabled && (
          <div className="flex items-start gap-3 mb-6 p-4 rounded-lg bg-rose-500/15 border border-rose-500/20 animate-fade-in" role="alert">
            <Lock className="w-5 h-5 text-rose-200 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-rose-200 font-medium mb-1">Setup Not Configured</p>
              <p className="text-xs text-surface-400">
                The <code className="bg-surface-800 px-1 rounded">SETUP_SECRET</code> environment variable is not set.
                Setup cannot proceed until this is configured in your deployment.
              </p>
            </div>
          </div>
        )}

        {/* Setup form */}
        <form onSubmit={handleSubmit} noValidate className="glass-card p-6 sm:p-8 animate-fade-in">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/20" role="alert">
              <AlertCircle className="w-4 h-4 text-rose-200 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          )}

          {/* Setup Secret field */}
          <div className="mb-4">
            <label htmlFor="setup-secret" className="block text-sm font-medium text-surface-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-200" />
                Setup Secret
              </span>
            </label>
            <input
              ref={setupSecretRef}
              id="setup-secret"
              type="password"
              value={setupSecret}
              onChange={(e) => setSetupSecret(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-amber-500/30 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-colors"
              placeholder="Enter your deployment setup secret"
              autoComplete="off"
              autoFocus
              disabled={submitting || !setupEnabled}
            />
            <p className="text-xs text-surface-500 mt-1">
              This is the SETUP_SECRET from your server environment. Only you should know this.
            </p>
          </div>

          <hr className="border-surface-700/30 my-5" />

          {/* Username field */}
          <div className="mb-4">
            <label htmlFor="setup-username" className="block text-sm font-medium text-surface-300 mb-1.5">
              Admin Username
            </label>
            <input
              ref={usernameRef}
              id="setup-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="admin"
              autoComplete="username"
              disabled={submitting || !setupEnabled}
            />
            <p className="text-xs text-surface-500 mt-1">
              3-30 characters: letters, numbers, hyphens, underscores
            </p>
          </div>

          {/* Email field */}
          <div className="mb-4">
            <label htmlFor="setup-email" className="block text-sm font-medium text-surface-300 mb-1.5">
              Admin Email
            </label>
            <input
              ref={emailRef}
              id="setup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="admin@yourcompany.com"
              autoComplete="email"
              disabled={submitting || !setupEnabled}
            />
          </div>

          {/* Password field with strength indicator */}
          <div className="mb-4">
            <label htmlFor="setup-password" className="block text-sm font-medium text-surface-300 mb-1.5">
              Password
            </label>
            <input
              ref={passwordRef}
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="Create a strong password"
              autoComplete="new-password"
              disabled={submitting || !setupEnabled}
              aria-describedby="password-requirements"
            />
            <PasswordStrength password={password} />
          </div>

          {/* Confirm password field */}
          <div className="mb-6">
            <label htmlFor="setup-confirm" className="block text-sm font-medium text-surface-300 mb-1.5">
              Confirm Password
            </label>
            <input
              ref={confirmPasswordRef}
              id="setup-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50 text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-colors"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={submitting || !setupEnabled}
              aria-describedby="setup-confirm-password-status"
            />
            {password && confirmPassword && password === confirmPassword && (
              <div id="setup-confirm-password-status" className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3 text-brand-400" aria-hidden="true" />
                <p className="text-xs text-brand-400">Passwords match</p>
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || !setupEnabled}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-sm font-medium focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Creating admin account...
              </>
            ) : (
              <>
                Create Admin Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-xs text-surface-500 text-center mt-6 animate-fade-in">
          After setup, you can create invite codes in the Admin Dashboard to allow other users to register.
        </p>
      </div>
    </div>
  );
}

export default SetupWizard;

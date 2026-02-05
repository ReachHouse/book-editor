/**
 * =============================================================================
 * ADMIN DASHBOARD COMPONENT
 * =============================================================================
 *
 * Admin panel with tabs for managing users and invite codes.
 * Only accessible to users with admin role.
 *
 * TABS:
 * -----
 * - Users: View all users, update roles/limits, activate/deactivate, delete
 * - Invite Codes: View all codes, generate new codes
 *
 * PROPS:
 * ------
 * @param {function} onClose - Callback to close the admin dashboard
 *
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, KeyRound, ArrowLeft, RefreshCw, Plus, Shield, ShieldOff,
  Trash2, Copy, Check, AlertTriangle, Loader
} from 'lucide-react';
import {
  adminListUsers, adminUpdateUser, adminDeleteUser,
  adminListInviteCodes, adminCreateInviteCode
} from '../services/api';

// =============================================================================
// HELPERS
// =============================================================================

function formatTokenCount(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return count.toString();
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// =============================================================================
// USER MANAGEMENT TAB
// =============================================================================

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleToggleActive = async (user) => {
    try {
      await adminUpdateUser(user.id, { isActive: !user.isActive });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleRole = async (user) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await adminUpdateUser(user.id, { role: newRole });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await adminDeleteUser(userId);
      setConfirmDelete(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveLimits = async (userId, dailyLimit, monthlyLimit) => {
    try {
      await adminUpdateUser(userId, {
        dailyTokenLimit: parseInt(dailyLimit, 10),
        monthlyTokenLimit: parseInt(monthlyLimit, 10)
      });
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center">
        <Loader className="w-6 h-6 mx-auto mb-2 text-brand-400 animate-spin" />
        <p className="text-surface-400 text-sm">Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-surface-400">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <button
          onClick={loadUsers}
          className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors py-1 px-2 rounded hover:bg-surface-800/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="glass-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-surface-200 text-sm truncate">{user.username}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    user.role === 'admin'
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'bg-surface-700/50 text-surface-400'
                  }`}>
                    {user.role}
                  </span>
                  {!user.isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-500 truncate">{user.email}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-surface-500">
                  <span>{user.projectCount} project{user.projectCount !== 1 ? 's' : ''}</span>
                  <span>Daily: {formatTokenCount(user.daily.total)}/{formatTokenCount(user.daily.limit)}</span>
                  <span>Monthly: {formatTokenCount(user.monthly.total)}/{formatTokenCount(user.monthly.limit)}</span>
                  <span>Last login: {formatDate(user.lastLoginAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleRole(user)}
                  className="p-1.5 rounded text-surface-500 hover:text-brand-400 hover:bg-surface-800/50 transition-colors"
                  title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                >
                  {user.role === 'admin' ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleToggleActive(user)}
                  className={`p-1.5 rounded transition-colors ${
                    user.isActive
                      ? 'text-surface-500 hover:text-amber-400 hover:bg-surface-800/50'
                      : 'text-amber-400 hover:text-green-400 hover:bg-surface-800/50'
                  }`}
                  title={user.isActive ? 'Deactivate' : 'Reactivate'}
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                  className="p-1.5 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 transition-colors text-xs"
                  title="Edit limits"
                >
                  Limits
                </button>
                <button
                  onClick={() => setConfirmDelete(user.id)}
                  className="p-1.5 rounded text-surface-500 hover:text-red-400 hover:bg-surface-800/50 transition-colors"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Edit Limits Panel */}
            {editingUser === user.id && (
              <LimitEditor
                dailyLimit={user.dailyTokenLimit}
                monthlyLimit={user.monthlyTokenLimit}
                onSave={(daily, monthly) => handleSaveLimits(user.id, daily, monthly)}
                onCancel={() => setEditingUser(null)}
              />
            )}

            {/* Delete Confirmation */}
            {confirmDelete === user.id && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400 mb-2">
                  Delete <strong>{user.username}</strong>? This removes all their projects and data.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs px-3 py-1.5 rounded bg-surface-800 text-surface-400 hover:bg-surface-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LimitEditor({ dailyLimit, monthlyLimit, onSave, onCancel }) {
  const [daily, setDaily] = useState(dailyLimit.toString());
  const [monthly, setMonthly] = useState(monthlyLimit.toString());

  // Validate that value is a non-negative integer
  const isValidLimit = (val) => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num >= 0 && String(num) === val.trim();
  };

  const isDailyValid = isValidLimit(daily);
  const isMonthlyValid = isValidLimit(monthly);
  const canSave = isDailyValid && isMonthlyValid;

  return (
    <div className="mt-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-surface-400 block mb-1">Daily Token Limit</label>
          <input
            type="number"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            className={`w-full px-2 py-1.5 text-sm bg-surface-900 border rounded text-surface-200 focus:outline-none ${
              isDailyValid ? 'border-surface-700 focus:border-brand-500' : 'border-red-500/50'
            }`}
            min="0"
          />
        </div>
        <div>
          <label className="text-xs text-surface-400 block mb-1">Monthly Token Limit</label>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className={`w-full px-2 py-1.5 text-sm bg-surface-900 border rounded text-surface-200 focus:outline-none ${
              isMonthlyValid ? 'border-surface-700 focus:border-brand-500' : 'border-red-500/50'
            }`}
            min="0"
          />
        </div>
      </div>
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

// =============================================================================
// INVITE CODES TAB
// =============================================================================

function InviteCodesTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListInviteCodes();
      setCodes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await adminCreateInviteCode();
      await loadCodes();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center">
        <Loader className="w-6 h-6 mx-auto mb-2 text-brand-400 animate-spin" />
        <p className="text-surface-400 text-sm">Loading invite codes...</p>
      </div>
    );
  }

  const unusedCodes = codes.filter(c => !c.isUsed);
  const usedCodes = codes.filter(c => c.isUsed);

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-surface-400">
          {unusedCodes.length} available, {usedCodes.length} used
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors py-1.5 px-3 rounded bg-brand-500/10 hover:bg-brand-500/20 disabled:opacity-50"
        >
          {generating ? (
            <Loader className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Generate Code
        </button>
      </div>

      {/* Unused codes */}
      {unusedCodes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-surface-500 uppercase tracking-wider mb-2">Available</h4>
          <div className="space-y-2">
            {unusedCodes.map(code => (
              <div key={code.id} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <code className="text-sm font-mono text-brand-400">{code.code}</code>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Created by {code.createdBy || 'system'} on {formatDate(code.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(code.code, code.id)}
                  className="p-1.5 rounded text-surface-500 hover:text-brand-400 hover:bg-surface-800/50 transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedId === code.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used codes */}
      {usedCodes.length > 0 && (
        <div>
          <h4 className="text-xs text-surface-500 uppercase tracking-wider mb-2">Used</h4>
          <div className="space-y-2">
            {usedCodes.map(code => (
              <div key={code.id} className="glass-card p-3 opacity-60">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-surface-500 line-through">{code.code}</code>
                  <span className="text-xs text-surface-600">Used by {code.usedBy || 'unknown'}</span>
                </div>
                <p className="text-xs text-surface-600 mt-0.5">
                  Created {formatDate(code.createdAt)} | Used {formatDate(code.usedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN ADMIN DASHBOARD
// =============================================================================

function AdminDashboard({ onClose }) {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'codes', label: 'Invite Codes', icon: KeyRound }
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors"
            aria-label="Back to editor"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-display font-semibold text-surface-200">Admin Dashboard</h2>
            <p className="text-xs text-surface-500">Manage users and invite codes</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-surface-800/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-surface-800 text-surface-200 shadow-sm'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'codes' && <InviteCodesTab />}
    </div>
  );
}

export default AdminDashboard;

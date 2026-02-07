/**
 * =============================================================================
 * USERS TAB COMPONENT
 * =============================================================================
 *
 * Admin tab for managing users: view all users, update roles/limits,
 * activate/deactivate, and delete users.
 *
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Trash2, AlertTriangle, Loader, Infinity
} from 'lucide-react';
import {
  adminListUsers, adminUpdateUser, adminDeleteUser
} from '../../services/api';
import { USER_ROLES, TOKEN_LIMITS } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import TokenLimitEditor from './TokenLimitEditor';
import {
  formatTokenCount, isUserUnlimited, isUserRestricted,
  getLimitStatusTag, getLimitColorClass, dispatchUsageUpdatedEvent, formatDate
} from './helpers';

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null); // Prevent concurrent operations

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
    if (pendingUserId) return; // Prevent concurrent operations
    setPendingUserId(user.id);
    try {
      await adminUpdateUser(user.id, { isActive: !user.isActive });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (pendingUserId) return; // Prevent concurrent operations
    // Prevent changing own role
    if (currentUser && userId === currentUser.userId) {
      setError('Cannot change your own role');
      return;
    }
    setPendingUserId(userId);
    try {
      await adminUpdateUser(userId, { role: newRole });
      await loadUsers();
      // Notify other components (like UsageDisplay) to refresh
      dispatchUsageUpdatedEvent();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDelete = async (userId) => {
    if (pendingUserId) return; // Prevent concurrent operations
    setPendingUserId(userId);
    try {
      await adminDeleteUser(userId);
      setConfirmDelete(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingUserId(null);
    }
  };

  const handleSaveLimits = async (userId, dailyLimit, monthlyLimit) => {
    if (pendingUserId) return; // Prevent concurrent operations
    setPendingUserId(userId);
    try {
      await adminUpdateUser(userId, {
        dailyTokenLimit: parseInt(dailyLimit, 10),
        monthlyTokenLimit: parseInt(monthlyLimit, 10)
      });
      setEditingUser(null);
      await loadUsers();
      // Notify other components (like UsageDisplay) to refresh
      dispatchUsageUpdatedEvent();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingUserId(null);
    }
  };

  const handleToggleUnlimited = async (user) => {
    if (pendingUserId) return; // Prevent concurrent operations
    setPendingUserId(user.id);
    try {
      const isCurrentlyUnlimited = isUserUnlimited(user);
      // Toggle: if unlimited (-1), restore defaults; if limited, set to unlimited (-1)
      const newLimits = isCurrentlyUnlimited
        ? { dailyTokenLimit: TOKEN_LIMITS.DEFAULT_DAILY, monthlyTokenLimit: TOKEN_LIMITS.DEFAULT_MONTHLY }
        : { dailyTokenLimit: TOKEN_LIMITS.UNLIMITED, monthlyTokenLimit: TOKEN_LIMITS.UNLIMITED };
      await adminUpdateUser(user.id, newLimits);
      await loadUsers();
      // Notify other components (like UsageDisplay) to refresh
      dispatchUsageUpdatedEvent();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingUserId(null);
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
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
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
                  {/* Role badge with proper color */}
                  {USER_ROLES[user.role] && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${USER_ROLES[user.role].badgeClass}`}>
                      {USER_ROLES[user.role].label}
                    </span>
                  )}
                  {/* Limit status badge (Unlimited/Limited/Restricted) */}
                  {(() => {
                    const tag = getLimitStatusTag(user);
                    return (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tag.className}`}>
                        {tag.label}
                      </span>
                    );
                  })()}
                  {/* Inactive badge */}
                  {!user.isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-surface-500 truncate">{user.email}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-surface-500">
                  <span>{user.projectCount} project{user.projectCount !== 1 ? 's' : ''}</span>
                  <span>
                    Daily: {formatTokenCount(user.daily.total)}/
                    <span className={getLimitColorClass(user.daily.limit)}>
                      {formatTokenCount(user.daily.limit, true)}
                    </span>
                  </span>
                  <span>
                    Monthly: {formatTokenCount(user.monthly.total)}/
                    <span className={getLimitColorClass(user.monthly.limit)}>
                      {formatTokenCount(user.monthly.limit, true)}
                    </span>
                  </span>
                  <span>Last login: {formatDate(user.lastLoginAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Role dropdown */}
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={pendingUserId === user.id || (currentUser && user.id === currentUser.userId)}
                  className={`text-xs px-2 py-1 rounded bg-surface-800 border border-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                    currentUser && user.id === currentUser.userId
                      ? 'text-surface-500 cursor-not-allowed'
                      : 'text-surface-300 cursor-pointer hover:border-surface-600'
                  }`}
                  title={currentUser && user.id === currentUser.userId ? 'Cannot change your own role' : 'Change user role'}
                >
                  {Object.entries(USER_ROLES).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleToggleActive(user)}
                  className={`p-1.5 rounded transition-colors ${
                    user.isActive
                      ? 'text-surface-500 hover:text-amber-400 hover:bg-surface-800/50'
                      : 'text-amber-400 hover:text-green-400 hover:bg-surface-800/50'
                  }`}
                  title={user.isActive ? 'Deactivate' : 'Reactivate'}
                  aria-label={user.isActive ? `Deactivate ${user.username}` : `Reactivate ${user.username}`}
                >
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleToggleUnlimited(user)}
                  className={`p-1.5 rounded transition-colors ${
                    isUserUnlimited(user)
                      ? 'text-amber-400 hover:text-surface-400 hover:bg-surface-800/50'
                      : 'text-surface-500 hover:text-amber-400 hover:bg-surface-800/50'
                  }`}
                  title={isUserUnlimited(user) ? 'Remove unlimited' : 'Set unlimited'}
                  aria-label={isUserUnlimited(user) ? `Remove unlimited from ${user.username}` : `Set ${user.username} to unlimited`}
                >
                  <Infinity className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => !isUserUnlimited(user) && !isUserRestricted(user) && setEditingUser(editingUser === user.id ? null : user.id)}
                  disabled={isUserUnlimited(user) || isUserRestricted(user)}
                  className={`p-1.5 rounded transition-colors text-xs ${
                    isUserUnlimited(user) || isUserRestricted(user)
                      ? 'text-surface-600 cursor-not-allowed'
                      : 'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50'
                  }`}
                  title={isUserUnlimited(user) ? 'User has unlimited access' : isUserRestricted(user) ? 'User is restricted' : 'Edit limits'}
                  aria-label={isUserUnlimited(user) ? `${user.username} has unlimited access` : isUserRestricted(user) ? `${user.username} is restricted` : `Edit token limits for ${user.username}`}
                  aria-expanded={editingUser === user.id}
                >
                  Limits
                </button>
                <button
                  onClick={() => setConfirmDelete(user.id)}
                  className="p-1.5 rounded text-surface-500 hover:text-red-400 hover:bg-surface-800/50 transition-colors"
                  title="Delete user"
                  aria-label={`Delete ${user.username}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Edit Limits Panel - only show if not unlimited and not restricted */}
            {editingUser === user.id && !isUserUnlimited(user) && !isUserRestricted(user) && (
              <TokenLimitEditor
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

export default UsersTab;

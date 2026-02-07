/**
 * =============================================================================
 * ROLE DEFAULTS TAB COMPONENT
 * =============================================================================
 *
 * Admin tab for managing default token limits per role.
 * These defaults are applied when new users are created.
 *
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Loader } from 'lucide-react';
import { adminGetRoleDefaults, adminUpdateRoleDefaults } from '../../services/api';
import { USER_ROLES } from '../../constants';
import TokenLimitEditor from './TokenLimitEditor';
import { formatTokenCount, getLimitColorClass } from './helpers';

function RoleDefaultsTab() {
  const [roleDefaults, setRoleDefaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [pendingRole, setPendingRole] = useState(null);

  const loadDefaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetRoleDefaults();
      setRoleDefaults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDefaults(); }, [loadDefaults]);

  const handleSaveDefaults = async (role, dailyLimit, monthlyLimit) => {
    if (pendingRole) return;
    setPendingRole(role);
    try {
      await adminUpdateRoleDefaults(role, {
        dailyTokenLimit: parseInt(dailyLimit, 10),
        monthlyTokenLimit: parseInt(monthlyLimit, 10)
      });
      setEditingRole(null);
      await loadDefaults();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center">
        <Loader className="w-6 h-6 mx-auto mb-2 text-brand-400 animate-spin" />
        <p className="text-surface-400 text-sm">Loading role defaults...</p>
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
        <p className="text-sm text-surface-400">
          Default token limits for new users with each role
        </p>
        <button
          onClick={loadDefaults}
          className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors py-1 px-2 rounded hover:bg-surface-800/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {roleDefaults.map(rd => (
          <div key={rd.role} className="glass-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {USER_ROLES[rd.role] && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${USER_ROLES[rd.role].badgeClass}`}>
                      {USER_ROLES[rd.role].label}
                    </span>
                  )}
                  {/* Limit status badge (Unlimited/Limited/Restricted) */}
                  {rd.dailyTokenLimit < 0 ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
                      Unlimited
                    </span>
                  ) : rd.dailyTokenLimit === 0 ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                      Restricted
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                      Limited
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-500">
                  <span>
                    Daily:{' '}
                    <span className={getLimitColorClass(rd.dailyTokenLimit)}>
                      {formatTokenCount(rd.dailyTokenLimit, true)}
                    </span>
                  </span>
                  <span>
                    Monthly:{' '}
                    <span className={getLimitColorClass(rd.monthlyTokenLimit)}>
                      {formatTokenCount(rd.monthlyTokenLimit, true)}
                    </span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEditingRole(editingRole === rd.role ? null : rd.role)}
                className="p-1.5 rounded transition-colors text-xs text-surface-500 hover:text-surface-300 hover:bg-surface-800/50"
                title="Edit defaults"
                aria-label={`Edit default limits for ${rd.role}`}
                aria-expanded={editingRole === rd.role}
              >
                Edit
              </button>
            </div>

            {/* Edit Defaults Panel */}
            {editingRole === rd.role && (
              <TokenLimitEditor
                dailyLimit={rd.dailyTokenLimit}
                monthlyLimit={rd.monthlyTokenLimit}
                onSave={(daily, monthly) => handleSaveDefaults(rd.role, daily, monthly)}
                onCancel={() => setEditingRole(null)}
                idPrefix="role"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoleDefaultsTab;

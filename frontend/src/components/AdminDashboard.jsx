/**
 * =============================================================================
 * ADMIN DASHBOARD COMPONENT
 * =============================================================================
 *
 * Admin panel with tabs for managing users, invite codes, and role defaults.
 * Only accessible to users with admin role.
 *
 * This is the slim shell that renders tab navigation and delegates to
 * individual tab components in ./admin/.
 *
 * TABS:
 * -----
 * - Users: View all users, update roles/limits, activate/deactivate, delete
 * - Invite Codes: View all codes, generate new codes
 * - Role Defaults: Configure default token limits per role
 *
 * PROPS:
 * ------
 * @param {function} onClose - Callback to close the admin dashboard
 *
 * =============================================================================
 */

import React, { useState } from 'react';
import { Users, KeyRound, ArrowLeft, Settings } from 'lucide-react';
import UsersTab from './admin/UsersTab';
import InviteCodesTab from './admin/InviteCodesTab';
import RoleDefaultsTab from './admin/RoleDefaultsTab';

function AdminDashboard({ onClose }) {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'codes', label: 'Invite Codes', icon: KeyRound },
    { id: 'roles', label: 'Role Defaults', icon: Settings }
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

      {/* Tabs with proper ARIA roles */}
      <div role="tablist" aria-label="Admin sections" className="flex gap-1 mb-6 p-1 rounded-lg bg-surface-800/30">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm transition-colors ${
                isSelected
                  ? 'bg-surface-800 text-surface-200 shadow-sm'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content panels */}
      <div role="tabpanel" id="tabpanel-users" aria-labelledby="tab-users" hidden={activeTab !== 'users'}>
        {activeTab === 'users' && <UsersTab />}
      </div>
      <div role="tabpanel" id="tabpanel-codes" aria-labelledby="tab-codes" hidden={activeTab !== 'codes'}>
        {activeTab === 'codes' && <InviteCodesTab />}
      </div>
      <div role="tabpanel" id="tabpanel-roles" aria-labelledby="tab-roles" hidden={activeTab !== 'roles'}>
        {activeTab === 'roles' && <RoleDefaultsTab />}
      </div>
    </div>
  );
}

export default AdminDashboard;

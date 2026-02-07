/** InviteCodesTab — Admin tab for generating, copying, and deleting invite codes. */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  KeyRound, Plus, Trash2, Copy, Check, AlertTriangle, Loader
} from 'lucide-react';
import {
  adminListInviteCodes, adminCreateInviteCode, adminDeleteInviteCode
} from '../../services/api';
import { formatDate } from './helpers';

function InviteCodesTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState(null);
  const copyTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

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

  const handleDeleteCode = async (codeId) => {
    setError(null);
    try {
      await adminDeleteInviteCode(codeId);
      setConfirmDeleteCode(null);
      await loadCodes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopy = async (code, id) => {
    // Clear any existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API requires HTTPS - show error instead of using deprecated fallback
      setError('Copy failed. Please use HTTPS or copy manually.');
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
        <div role="alert" className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
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

      {/* Empty State */}
      {codes.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-surface-800/50 border border-surface-700/30 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-surface-500" aria-hidden="true" />
          </div>
          <p className="text-surface-400 text-sm mb-1">No invite codes yet</p>
          <p className="text-surface-500 text-xs mb-4">
            Generate invite codes for new users to register with.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors py-2 px-4 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 disabled:opacity-50"
          >
            {generating ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Generate First Code
          </button>
        </div>
      )}

      {/* Unused codes */}
      {unusedCodes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-surface-500 uppercase tracking-wider mb-2">Available</h4>
          <div className="space-y-2">
            {unusedCodes.map(code => (
              <div key={code.id} className="glass-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <code className="text-sm font-mono text-brand-400">{code.code}</code>
                    <p className="text-xs text-surface-500 mt-0.5">
                      Created by {code.createdBy || 'system'} on {formatDate(code.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(code.code, code.id)}
                      className="p-1.5 rounded text-surface-500 hover:text-brand-400 hover:bg-surface-800/50 transition-colors"
                      title="Copy to clipboard"
                      aria-label={copiedId === code.id ? 'Copied!' : `Copy invite code ${code.code}`}
                    >
                      {copiedId === code.id ? (
                        <Check className="w-4 h-4 text-brand-400" aria-hidden="true" />
                      ) : (
                        <Copy className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteCode(code.id)}
                      className="p-1.5 rounded text-surface-500 hover:text-rose-200 hover:bg-surface-800/50 transition-colors"
                      title="Delete invite code"
                      aria-label={`Delete invite code ${code.code}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {confirmDeleteCode === code.id && (
                  <div className="mt-3 p-3 rounded-lg bg-rose-500/15 border border-rose-500/20">
                    <p className="text-sm text-rose-200 mb-2">
                      Delete this invite code? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteCode(code.id)}
                        className="text-xs px-3 py-1.5 rounded bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteCode(null)}
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
      )}

      {/* Used codes */}
      {usedCodes.length > 0 && (
        <div>
          <h4 className="text-xs text-surface-500 uppercase tracking-wider mb-2">Used</h4>
          <div className="space-y-2">
            {usedCodes.map(code => (
              <div key={code.id} className="glass-card p-3 opacity-75">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-surface-400 line-through">{code.code}</code>
                  <span className="text-xs text-surface-500">Used by {code.usedBy || 'unknown'}</span>
                </div>
                <p className="text-xs text-surface-500 mt-0.5">
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

export default InviteCodesTab;

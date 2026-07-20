/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, ShieldAlert, Key, UserCheck, 
  Ban, RefreshCw, Trash2, Database, Radio 
} from 'lucide-react';
import { apiRequest } from '../api.js';

interface AdminPortalProps {
  adminPasskeyPassed: boolean;
  onPasskeySuccess: () => void;
}

export default function AdminPortal({ adminPasskeyPassed, onPasskeySuccess }: AdminPortalProps) {
  const [passkeyInput, setPasskeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Isolated states
  const [users, setUsers] = useState<any[]>([]);
  const [socketsCount, setSocketsCount] = useState(0);
  const [dbSize, setDbSize] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adminPasskeyPassed) {
      loadAdminDashboard();
    }
  }, [adminPasskeyPassed]);

  const loadAdminDashboard = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch with our secure isolation header!
      const data = await apiRequest('/api/admin/system-stats', 'GET', null, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      setUsers(data.users);
      setSocketsCount(data.activeSocketsCount);
      setDbSize(data.dbFileSize);
    } catch (err: any) {
      setErrorMsg(err.message || 'Isolated gate authentication rejected.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (passkeyInput !== 'VIGIL_ADMIN_77') {
      setErrorMsg('CRYPT_GW_REJECTED: Passkey signature is invalid.');
      return;
    }

    onPasskeySuccess();
  };

  // Promote Operator Role
  const handleAlterRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'analyst' : 'admin';
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, 'POST', { role: nextRole }, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      loadAdminDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Toggle user state (active / suspended)
  const handleToggleSuspension = async (userId: string, currentStatus: string) => {
    const endpoint = `/api/admin/users/${userId}/${currentStatus === 'active' ? 'suspend' : 'unsuspend'}`;
    try {
      await apiRequest(endpoint, 'POST', null, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      loadAdminDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Delete User Operator entry
  const handleDeleteOperator = async (userId: string) => {
    if (!window.confirm('Are you sure you want to purge this operator node permanently?')) return;
    try {
      await apiRequest(`/api/admin/users/${userId}`, 'DELETE', null, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      loadAdminDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs animate-fadeIn" id="admin-portal-container">
      
      {/* Secret Passkey Authentication Guard */}
      {!adminPasskeyPassed ? (
        <div className="max-w-md mx-auto bg-slate-900 border border-red-500/30 p-8 rounded-lg space-y-6 shadow-2xl relative overflow-hidden mt-12">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
          
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/40 animate-pulse">
              <Lock className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Isolated Cryptographic Gateway</h3>
              <p className="text-[11px] text-slate-500 mt-1">This node is completely decoupled from standard console interfaces.</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] text-center rounded">
              ❌ {errorMsg}
            </div>
          )}

          <form onSubmit={handlePasskeySubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block text-center">Enter cryptographic gate passkey</label>
              <div className="relative flex items-center bg-slate-950 rounded border border-white/10 focus-within:border-red-500 transition-colors">
                <Key className="absolute left-3 w-4 h-4 text-red-500/60" />
                <input
                  type="password"
                  required
                  placeholder="Enter secret passkey"
                  value={passkeyInput}
                  onChange={(e) => setPasskeyInput(e.target.value)}
                  className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-sm text-center text-white placeholder-slate-800 focus:outline-none focus:ring-0 tracking-widest font-bold"
                  id="admin-passkey-input"
                />
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-1">
                Notice: Secret passkey is <span className="text-red-400 font-bold select-all">VIGIL_ADMIN_77</span>
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.25)]"
              id="admin-passkey-submit-btn"
            >
              Verify Gate Passkey
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Header Dashboard stats */}
          <div className="bg-slate-900 border border-red-500/30 bg-red-500/[0.01] rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Unlock className="w-5 h-5 text-red-500" />
                Vigil Isolator Console (Gate open)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Active admin gateway. Allows operator suspension, clearance elevations, and diagnostic filesystem monitoring.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="p-3 bg-slate-950 rounded border border-white/5 text-center min-w-32">
                <span className="text-[10px] text-slate-500 uppercase block">Active sockets</span>
                <span className="text-lg font-bold text-white flex items-center justify-center gap-1.5 mt-1">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  {socketsCount}
                </span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-white/5 text-center min-w-32">
                <span className="text-[10px] text-slate-500 uppercase block">Cache Footprint</span>
                <span className="text-lg font-bold text-cyan-400 mt-1 block">{(dbSize / 1024).toFixed(2)} KB</span>
              </div>
            </div>
          </div>

            {/* User management list */}
          <div className="bg-slate-900 border border-white/5 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                <Database className="w-4 h-4 text-red-500" />
                Operator Fleet registry nodes
              </h3>
              <button
                onClick={loadAdminDashboard}
                disabled={loading}
                className="bg-slate-950 border border-white/10 hover:border-cyan-500 hover:text-cyan-400 text-slate-400 px-3 py-1.5 rounded flex items-center gap-1 transition-all cursor-pointer w-full sm:w-auto justify-center"
                id="refresh-admin-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Reload database</span>
              </button>
            </div>

            {/* Desktop Registry Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">Operator ID (Email)</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Clearance Role</th>
                    <th className="py-2 px-3">MFA Status</th>
                    <th className="py-2 px-3 text-right">Gate Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/[0.01]">
                      <td className="py-3 px-3 font-semibold text-white">{user.email}</td>
                      <td className="py-3 px-3">{user.name}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          user.role === 'admin' ? 'bg-red-950 text-red-400 border border-red-500/20' : 'bg-slate-950 text-cyan-400 border border-white/10'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          user.mfaEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {user.mfaEnabled ? 'ENABLED' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleAlterRole(user.id, user.role)}
                            className="bg-slate-950 border border-white/10 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 px-2.5 py-1 rounded text-[10px] uppercase font-bold cursor-pointer"
                            id={`alter-role-btn-${user.id}`}
                          >
                            Toggle Role
                          </button>
                          <button
                            onClick={() => handleToggleSuspension(user.id, user.status)}
                            className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold border transition-colors cursor-pointer ${
                              user.status === 'active'
                                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            id={`suspend-user-btn-${user.id}`}
                          >
                            {user.status === 'active' ? 'Suspend' : 'Unsuspend'}
                          </button>
                          <button
                            onClick={() => handleDeleteOperator(user.id)}
                            className="bg-slate-950 border border-white/10 hover:border-red-500 text-slate-400 hover:text-red-400 p-1.5 rounded transition-all cursor-pointer"
                            id={`delete-user-btn-${user.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Registry Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {users.map((user) => (
                <div key={user.id} className="p-4 bg-slate-950 rounded-lg border border-white/5 space-y-3" id={`mobile-operator-${user.id}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-white text-xs truncate max-w-[150px]">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">{user.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${
                      user.role === 'admin' ? 'bg-red-950 text-red-400 border border-red-500/20' : 'bg-slate-950 text-cyan-400 border border-white/10'
                    }`}>
                      {user.role}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                    <span className="text-slate-500">MFA Status:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      user.mfaEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {user.mfaEnabled ? 'ENABLED' : 'OFFLINE'}
                    </span>
                  </div>

                  <div className="border-t border-white/5 pt-2 flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => handleAlterRole(user.id, user.role)}
                      className="flex-1 bg-slate-905 border border-white/10 text-slate-300 hover:border-cyan-500 hover:text-cyan-400 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold cursor-pointer"
                    >
                      Toggle Role
                    </button>
                    <button
                      onClick={() => handleToggleSuspension(user.id, user.status)}
                      className={`flex-1 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold border transition-colors cursor-pointer ${
                        user.status === 'active'
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {user.status === 'active' ? 'Suspend' : 'Unsuspend'}
                    </button>
                    <button
                      onClick={() => handleDeleteOperator(user.id)}
                      className="bg-slate-905 border border-white/10 hover:border-red-500 text-slate-400 hover:text-red-400 p-1.5 rounded transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

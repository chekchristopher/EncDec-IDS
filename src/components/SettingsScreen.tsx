/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, ShieldCheck, KeyRound, Eye, EyeOff, 
  Trash2, Plus, RefreshCw, Clipboard, Check, UserPen 
} from 'lucide-react';
import { apiRequest } from '../api.js';
import { APIKey } from '../types.js';

interface SettingsScreenProps {
  currentUser: { id: string; email: string; name: string; mfaEnabled: boolean; avatarUrl?: string; lastNameChangeDate?: string } | null;
  onProfileUpdate: () => void;
  onOpenProfileModal?: () => void;
}

export default function SettingsScreen({ currentUser, onProfileUpdate, onOpenProfileModal }: SettingsScreenProps) {
  const [mfaEnabled, setMfaEnabled] = useState(currentUser?.mfaEnabled || false);
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // API Keys lists state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  
  // Custom API key generator states
  const [keyName, setKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  // Password reset state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const data = await apiRequest('/api/apikeys');
      setApiKeys(data);
    } catch (err) {
      console.warn('Failed to get API keys', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleMfaToggle = async () => {
    setLoadingMfa(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const nextState = !mfaEnabled;
      const response = await apiRequest('/api/profile/mfa', 'POST', { enabled: nextState });
      setMfaEnabled(response.mfaEnabled);
      setSuccessMsg(`Multi-factor authentication (MFA) successfully ${response.mfaEnabled ? 'ENABLED' : 'DISABLED'} for this operator profile.`);
      onProfileUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to modify MFA profile.');
    } finally {
      setLoadingMfa(false);
    }
  };

  const handleCreateAPIKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;

    setErrorMsg(null);
    try {
      const response = await apiRequest('/api/apikeys', 'POST', { name: keyName });
      setNewlyCreatedKey(response.plainTextKey);
      setKeyName('');
      
      // Update key list
      setApiKeys(prev => [...prev, response]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Key compilation failed.');
    }
  };

  const handleRevokeKey = async (id: string) => {
    setErrorMsg(null);
    try {
      await apiRequest(`/api/apikeys/${id}`, 'DELETE');
      setApiKeys(prev => prev.filter(k => k.id !== id));
      setSuccessMsg('API credential key successfully revoked.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Revocation request failed.');
    }
  };

  const handleRotatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;

    setRotating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest('/api/auth/reset-password', 'POST', { email: currentUser?.email, newPassword });
      setSuccessMsg('Operator credentials rotated successfully.');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Credential rotate failed.');
    } finally {
      setRotating(false);
    }
  };

  const copyToClipboard = () => {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs" id="settings-container">
      
      {/* MFA & Credential rotating column */}
      <div className="space-y-6 lg:col-span-1">
        
        {/* Profile Card */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Operator Profile</h3>
            </div>
            {onOpenProfileModal && (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                id="settings-edit-profile-btn"
              >
                <UserPen className="w-3 h-3" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-500/30 overflow-hidden flex items-center justify-center text-sm font-bold text-cyan-400 shrink-0">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'OP'
              )}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Profile node</p>
                <p className="text-sm font-bold text-white truncate">{currentUser?.name || 'Vigil Operator'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Operator ID</p>
                <p className="text-slate-300 truncate">{currentUser?.email}</p>
              </div>
            </div>
          </div>

          {/* MFA Toggle */}
          <div className="p-4 bg-slate-950 rounded border border-white/5 space-y-3 mt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-white uppercase">Multi-factor Key (MFA)</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Enforces 6-digit challenge on console logins.</p>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                mfaEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-slate-800 text-slate-500'
              }`}>
                {mfaEnabled ? 'Enforced' : 'Offline'}
              </span>
            </div>

            <button
              onClick={handleMfaToggle}
              disabled={loadingMfa}
              className={`w-full py-2.5 rounded font-bold uppercase transition-all ${
                mfaEnabled 
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' 
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.25)]'
              }`}
              id="mfa-toggle-btn"
            >
              {loadingMfa ? 'Configuring Node...' : mfaEnabled ? 'Disable MFA Key' : 'Enforce MFA Key'}
            </button>
          </div>
        </div>

        {/* Password rotation card */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Rotate Access Token</h3>
          </div>

          <form onSubmit={handleRotatePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase">Current Access Token</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase">New Access Token</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={rotating || !newPassword}
              className="w-full bg-slate-950 hover:bg-slate-800 disabled:bg-slate-950 border border-white/15 text-slate-300 py-2.5 rounded font-bold uppercase transition-all"
              id="rotate-password-btn"
            >
              {rotating ? 'Re-keying...' : 'Rotate Credentials'}
            </button>
          </form>
        </div>

      </div>

      {/* API Key management & Newly generated keys column */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Status Notifications inside settings */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded" id="settings-error-banner">
            ❌ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded" id="settings-success-banner">
            ℹ️ {successMsg}
          </div>
        )}

        <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Secure Agent API credentials
            </h3>
            <span className="text-slate-500">{apiKeys.length} Active keys</span>
          </div>

          {/* New API Key generator */}
          <form onSubmit={handleCreateAPIKey} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. SOC Linux Router Daemon"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1 bg-slate-950 border border-white/10 rounded px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500"
              id="key-descriptor-input"
            />
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2.5 rounded font-bold uppercase flex items-center gap-1"
              id="generate-api-key-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Compile Key</span>
            </button>
          </form>

          {/* Newly compiled API Key warning container */}
          {newlyCreatedKey && (
            <div className="p-4 bg-red-500/[0.03] border border-red-500/20 rounded space-y-2 animate-fadeIn" id="newly-compiled-key-card">
              <p className="text-xs font-bold text-red-400 uppercase">⚠️ Critical security warning: Compiled Key generated</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Save this token string immediately. This key is stored as an irreversible secure cryptographic hash and will **never** be displayed to you again.
              </p>
              
              <div className="flex items-center gap-2 bg-slate-950 p-3 rounded border border-white/10 mt-2">
                <span className="flex-1 select-all font-mono font-bold text-white text-xs break-all">{newlyCreatedKey}</span>
                <button
                  onClick={copyToClipboard}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-2 rounded border border-white/10 flex items-center gap-1 transition-all"
                  id="copy-key-btn"
                >
                  {copying ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                  <span>{copying ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* List of active keys */}
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Active Keys Registered</p>
            {loadingKeys && apiKeys.length === 0 ? (
              <p className="text-slate-500 font-mono text-center py-6">Checking registry database...</p>
            ) : apiKeys.length === 0 ? (
              <p className="text-slate-500 font-mono text-center py-6">No API credentials registered. Create one to hook an agent.</p>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="p-4 bg-slate-950 border border-white/5 rounded flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white leading-tight">{key.name}</p>
                    <p className="text-[10px] text-slate-400">Prefix: <code className="text-cyan-400 font-bold">{key.keyPrefix}</code></p>
                    <p className="text-[9px] text-slate-500">
                      Generated: {new Date(key.createdAt).toLocaleDateString()} • Role: <span className="uppercase">{key.role}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleRevokeKey(key.id)}
                    className="bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 p-2.5 rounded border border-white/10 hover:border-red-500/20 transition-all"
                    title="Revoke and Purge Key"
                    id={`revoke-key-${key.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

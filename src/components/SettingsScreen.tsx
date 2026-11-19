/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, ShieldCheck, KeyRound, Eye, EyeOff, 
  Trash2, Plus, RefreshCw, Clipboard, Check, UserPen,
  MapPin, CreditCard, ExternalLink, Globe, CheckCircle2,
  AlertTriangle, Sparkles, Server, Lock, Unlock
} from 'lucide-react';
import { apiRequest } from '../api.js';
import { APIKey } from '../types.js';
import ThemeToggle from './ThemeToggle.jsx';
import { validateSafeBoxPasskey } from '../utils/safeBoxToken.js';

interface SettingsScreenProps {
  currentUser: { 
    id: string; 
    email: string; 
    name: string; 
    mfaEnabled: boolean;
    safeBoxEnabled?: boolean;
    hasSafeBoxPasskey?: boolean;
    safeBoxUpdatedAt?: string;
    avatarUrl?: string; 
    lastNameChangeDate?: string;
    customMapsApiKey?: string;
    customMapsApiKeyAddedAt?: string;
  } | null;
  onProfileUpdate: () => void;
  onOpenProfileModal?: () => void;
}

export default function SettingsScreen({ currentUser, onProfileUpdate, onOpenProfileModal }: SettingsScreenProps) {
  const [mfaEnabled, setMfaEnabled] = useState(currentUser?.mfaEnabled || false);
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [safeBoxEnabled, setSafeBoxEnabled] = useState(Boolean(currentUser?.safeBoxEnabled));
  const [safeBoxPasskeyInput, setSafeBoxPasskeyInput] = useState('');
  const [showSafeBoxPasskey, setShowSafeBoxPasskey] = useState(false);
  const [loadingSafeBoxToggle, setLoadingSafeBoxToggle] = useState(false);
  const [savingSafeBoxPasskey, setSavingSafeBoxPasskey] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // BYOK Google Maps Platform Key State
  const [mapsApiKeyInput, setMapsApiKeyInput] = useState(currentUser?.customMapsApiKey || '');
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [isSavingMapsKey, setIsSavingMapsKey] = useState(false);
  const [isTestingMapsKey, setIsTestingMapsKey] = useState(false);
  const [mapsKeyTestResult, setMapsKeyTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Synchronize input and security flags when currentUser updates
  useEffect(() => {
    if (currentUser?.customMapsApiKey !== undefined) {
      setMapsApiKeyInput(currentUser.customMapsApiKey || '');
    }
    if (currentUser) {
      setMfaEnabled(Boolean(currentUser.mfaEnabled));
      setSafeBoxEnabled(Boolean(currentUser.safeBoxEnabled));
    }
  }, [currentUser]);

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
      const response = await apiRequest('/api/profile/mfa', 'POST', { mfaEnabled: nextState });
      setMfaEnabled(response.mfaEnabled);
      setSuccessMsg(`Multi-factor authentication (MFA) successfully ${response.mfaEnabled ? 'ENABLED' : 'DISABLED'} for this operator profile.`);
      onProfileUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to modify MFA profile.');
    } finally {
      setLoadingMfa(false);
    }
  };

  const safeBoxValidation = validateSafeBoxPasskey(safeBoxPasskeyInput);
  const quickSigns = ['!', '@', '#', '$', '%', '*'];
  const quickEmojis = ['🔐', '🛡️', '🔥', '⚡', '💎', '🚀'];

  const handleSafeBoxToggle = async () => {
    setLoadingSafeBoxToggle(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const nextState = !safeBoxEnabled;
      const response = await apiRequest('/api/profile/safebox/toggle', 'POST', { enabled: nextState });
      setSafeBoxEnabled(Boolean(response.safeBoxEnabled));
      if (currentUser?.email) {
        localStorage.setItem('encdec_last_email', currentUser.email);
      }
      setSuccessMsg(`Admin Safe Box successfully turned ${response.safeBoxEnabled ? 'ON' : 'OFF'} (independent of MFA).`);
      onProfileUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle Admin Safe Box.');
    } finally {
      setLoadingSafeBoxToggle(false);
    }
  };

  const handleSaveSafeBoxPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!safeBoxValidation.valid) {
      setErrorMsg(safeBoxValidation.errors.join(' '));
      return;
    }

    setSavingSafeBoxPasskey(true);
    try {
      const response = await apiRequest('/api/profile/safebox/passkey', 'POST', { passkey: safeBoxPasskeyInput });
      if (currentUser?.email) {
        localStorage.setItem('encdec_last_email', currentUser.email);
      }
      setSafeBoxPasskeyInput('');
      setSuccessMsg(response.message || 'Admin Safe Box 6-token mixed passkey updated successfully.');
      onProfileUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Admin Safe Box passkey.');
    } finally {
      setSavingSafeBoxPasskey(false);
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
      await apiRequest('/api/auth/change-password', 'POST', {
        currentPassword: oldPassword,
        newPassword
      });
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

  const handleSaveMapsKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mapsApiKeyInput.trim()) {
      setErrorMsg('Please paste a valid Google Cloud API key (e.g. AIzaSy...) or click Remove.');
      return;
    }
    setIsSavingMapsKey(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setMapsKeyTestResult(null);

    try {
      const res = await apiRequest('/api/profile/maps-key', 'POST', { apiKey: mapsApiKeyInput.trim() });
      setSuccessMsg(res.message || 'Personal Google Maps API key linked successfully!');
      onProfileUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to link Google Maps API key.');
    } finally {
      setIsSavingMapsKey(false);
    }
  };

  const handleTestMapsKey = async () => {
    if (!mapsApiKeyInput.trim()) {
      setErrorMsg('Enter an API key first to test the Google Maps Platform handshake.');
      return;
    }
    setIsTestingMapsKey(true);
    setMapsKeyTestResult(null);
    setErrorMsg(null);

    try {
      const res = await apiRequest('/api/profile/maps-key/test', 'POST', { apiKey: mapsApiKeyInput.trim() });
      setMapsKeyTestResult({
        valid: true,
        message: res.message || 'Handshake successful! Google Maps Platform verified.'
      });
    } catch (err: any) {
      setMapsKeyTestResult({
        valid: false,
        message: err.message || 'Handshake failed. Check your API key restrictions and billing in Google Cloud Console.'
      });
    } finally {
      setIsTestingMapsKey(false);
    }
  };

  const handleUnlinkMapsKey = async () => {
    setIsSavingMapsKey(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setMapsKeyTestResult(null);

    try {
      const res = await apiRequest('/api/profile/maps-key', 'DELETE');
      setMapsApiKeyInput('');
      setSuccessMsg(res.message || 'Personal Google Maps key unlinked. Reverted to system shared tier.');
      onProfileUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unlink Google Maps API key.');
    } finally {
      setIsSavingMapsKey(false);
    }
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

        {/* Admin Safe Box Card (Separate from MFA) */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-4" id="settings-safebox-card">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              {safeBoxEnabled ? (
                <Unlock className="w-4 h-4 text-amber-400" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400" />
              )}
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Admin Safe Box</h3>
            </div>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                safeBoxEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                  : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
              id="safebox-status-badge"
            >
              {safeBoxEnabled ? 'ON' : 'OFF'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Separate credential vault on the login screen with its own 6-token mixed passkey—completely independent from your login MFA code.
          </p>

          <div className="flex items-center justify-between text-[10px] bg-slate-950 px-3 py-2 rounded border border-white/5">
            <span className="text-slate-400 uppercase">Vault Passkey Status</span>
            <span className={currentUser?.hasSafeBoxPasskey ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {currentUser?.hasSafeBoxPasskey ? 'Passkey Configured' : 'Not Configured'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSafeBoxToggle}
            disabled={loadingSafeBoxToggle}
            className={`w-full py-2.5 rounded font-bold uppercase transition-all cursor-pointer ${
              safeBoxEnabled
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
            }`}
            id="safebox-toggle-btn"
          >
            {loadingSafeBoxToggle
              ? 'Updating Vault...'
              : safeBoxEnabled
              ? 'Turn OFF Admin Safe Box'
              : 'Turn ON Admin Safe Box'}
          </button>

          <form onSubmit={handleSaveSafeBoxPasskey} className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-400 uppercase" htmlFor="safebox-passkey-settings-input">
                Set 6-Token Mixed Passkey
              </label>
              <span
                className={`text-[10px] font-bold ${
                  safeBoxValidation.tokenCount === 6 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {safeBoxValidation.tokenCount} / 6 tokens
              </span>
            </div>

            <div className="relative">
              <input
                id="safebox-passkey-settings-input"
                type={showSafeBoxPasskey ? 'text' : 'password'}
                placeholder="Any 6 tokens: number + letter + sign + emoji"
                value={safeBoxPasskeyInput}
                onChange={(e) => setSafeBoxPasskeyInput(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded p-2.5 pr-10 text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowSafeBoxPasskey(!showSafeBoxPasskey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                title={showSafeBoxPasskey ? 'Hide passkey' : 'Reveal passkey'}
              >
                {showSafeBoxPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Requirement Checklist */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className={`px-2 py-1 rounded border ${safeBoxValidation.tokenCount === 6 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                {safeBoxValidation.tokenCount === 6 ? '✓' : '○'} Exact 6 Tokens
              </div>
              <div className={`px-2 py-1 rounded border ${safeBoxValidation.hasNumber ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                {safeBoxValidation.hasNumber ? '✓' : '○'} Number (0-9)
              </div>
              <div className={`px-2 py-1 rounded border ${safeBoxValidation.hasAlphabet ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                {safeBoxValidation.hasAlphabet ? '✓' : '○'} Alphabet (A-z)
              </div>
              <div className={`px-2 py-1 rounded border ${safeBoxValidation.hasSign ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                {safeBoxValidation.hasSign ? '✓' : '○'} Sign (!@#...)
              </div>
              <div className={`col-span-2 px-2 py-1 rounded border ${safeBoxValidation.hasEmoji ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                {safeBoxValidation.hasEmoji ? '✓' : '○'} Emoji (any emoji, e.g. 🔐 🛡️ 🔥)
              </div>
            </div>

            {/* Optional quick-insert helper */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-500 uppercase">Quick-Insert Signs & Emojis (or type any character freely)</p>
              <div className="flex flex-wrap gap-1">
                {quickSigns.map((sign) => (
                  <button
                    key={sign}
                    type="button"
                    onClick={() => setSafeBoxPasskeyInput((prev) => prev + sign)}
                    className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs cursor-pointer"
                  >
                    {sign}
                  </button>
                ))}
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSafeBoxPasskeyInput((prev) => prev + emoji)}
                    className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-white/10 text-xs cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {currentUser?.safeBoxUpdatedAt && (
              <p className="text-[9px] text-slate-500">
                Last updated: {new Date(currentUser.safeBoxUpdatedAt).toLocaleString()}
              </p>
            )}

            <button
              type="submit"
              disabled={savingSafeBoxPasskey || !safeBoxValidation.valid}
              className="w-full bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 text-amber-300 border border-amber-500/40 py-2.5 rounded font-bold uppercase transition-all cursor-pointer disabled:cursor-not-allowed"
              id="safebox-save-passkey-btn"
            >
              {savingSafeBoxPasskey ? 'Saving Passkey...' : 'Save Safe Box Passkey'}
            </button>
          </form>
        </div>

        {/* Theme & Visual Display Card */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Interface Appearance</h3>
          </div>

          <p className="text-[11px] text-slate-400">
            Customize the security console display theme. Choose Dark Mode for high-contrast SOC monitoring or Light Mode for bright environments.
          </p>

          <div className="pt-2">
            <ThemeToggle variant="button" />
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

        {/* Google Maps Platform Bring Your Own Key (BYOK) Card */}
        <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-5" id="byok-maps-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Google Maps Platform & Tactical Recon (BYOK)
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Link your personal Google Cloud API key to bill deep-seek reconnaissance to your own account
              </p>
            </div>

            {/* Active Billing Tier Badge */}
            <div className="shrink-0">
              {currentUser?.customMapsApiKey ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Personal Google Maps Key Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Google Maps Billing Required for Deep Seek
                </span>
              )}
            </div>
          </div>

          {/* Paid Google Maps Subscription Notice */}
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 flex items-start gap-2.5" id="settings-google-maps-billing-notice">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-300 uppercase text-[11px]">
                Google Maps Subscription Notice (Required for Deep Seek)
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                To view <strong className="text-white">Google Maps Satellite Aerial &amp; 360° Street View inside Deep Seek</strong>, you must have a paid <strong className="text-white">Google Cloud Billing account / Google Maps Platform subscription</strong> (Google&apos;s Pay-As-You-Go or monthly Google Maps Starter/Essentials/Pro plans; free monthly SKU caps are limited and overages or billed features require paying Google directly). Your EncDec IDS license does <strong className="text-white">not</strong> include Google Maps API billing.
              </p>
            </div>
          </div>

          {/* Educational / Setup Guide */}
          <div className="p-4 bg-slate-950/80 rounded border border-white/5 space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">How Bring Your Own Key (BYOK) Works</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Link your personal Google Cloud API key with Google Maps billing enabled. Dynamic Maps &amp; Street View requests in Deep Seek are billed directly to your Google Cloud account under Google Maps Platform&apos;s Pay-As-You-Go or Subscription tiers (after Google&apos;s limited monthly per-SKU free caps).
                </p>
              </div>
            </div>

            {/* 3 Step Instruction Accordion / Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/5">
              <div className="p-2.5 bg-slate-900/60 rounded border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400">STEP 1</span>
                <p className="text-[11px] font-semibold text-slate-200">Enable Google Billing</p>
                <p className="text-[10px] text-slate-400">Attach a payment method &amp; Google Maps plan in Google Cloud Billing.</p>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400">STEP 2</span>
                <p className="text-[11px] font-semibold text-slate-200">Generate API Key</p>
                <p className="text-[10px] text-slate-400">Click <strong>+ Create Credentials</strong> ➔ <strong>API key</strong> and restrict it.</p>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400">STEP 3</span>
                <p className="text-[11px] font-semibold text-slate-200">Enable APIs &amp; Link</p>
                <p className="text-[10px] text-slate-400">Enable Maps JS &amp; Street View APIs, then paste your <code className="text-cyan-300">AIzaSy...</code> key.</p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                  id="open-gcp-console-link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Google Cloud Credentials Console</span>
                </a>
                <a
                  href="https://mapsplatform.google.com/pricing/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                  id="open-gmp-pricing-link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps Pricing &amp; Plans</span>
                </a>
              </div>

              <span className="text-[10px] text-slate-500">
                Encrypted in DB • Masked in client
              </span>
            </div>
          </div>

          {/* Key Input & Actions Form */}
          <form onSubmit={handleSaveMapsKey} className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Your Personal Google Maps Platform API Key
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showMapsKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={mapsApiKeyInput}
                  onChange={(e) => setMapsApiKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 pr-10"
                  id="byok-maps-api-key-input"
                />
                <button
                  type="button"
                  onClick={() => setShowMapsKey(!showMapsKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  title={showMapsKey ? 'Hide key string' : 'Reveal key string'}
                >
                  {showMapsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestMapsKey}
                disabled={isTestingMapsKey || !mapsApiKeyInput.trim()}
                className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-slate-300 border border-white/10 rounded font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                id="byok-test-handshake-btn"
                title="Verify key with Google Maps Geocoding handshake"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingMapsKey ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isTestingMapsKey ? 'Testing...' : 'Test Handshake'}</span>
              </button>

              <button
                type="submit"
                disabled={isSavingMapsKey || !mapsApiKeyInput.trim()}
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold uppercase rounded flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                id="byok-save-key-btn"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingMapsKey ? 'Saving...' : 'Save & Link Key'}</span>
              </button>

              {currentUser?.customMapsApiKey && (
                <button
                  type="button"
                  onClick={handleUnlinkMapsKey}
                  disabled={isSavingMapsKey}
                  className="p-2.5 bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 rounded transition-all cursor-pointer shrink-0"
                  title="Unlink key and revert to system demo tier"
                  id="byok-remove-key-btn"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Test result status banner */}
            {mapsKeyTestResult && (
              <div 
                className={`p-3 rounded border text-xs flex items-start gap-2 animate-fadeIn ${
                  mapsKeyTestResult.valid 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
                id="byok-test-result-banner"
              >
                {mapsKeyTestResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold">
                    {mapsKeyTestResult.valid ? 'Google Maps Handshake Verified' : 'Google Maps Verification Failed'}
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-90">{mapsKeyTestResult.message}</p>
                </div>
              </div>
            )}

            {currentUser?.customMapsApiKeyAddedAt && (
              <p className="text-[10px] text-slate-500 pt-1">
                Active key linked on: {new Date(currentUser.customMapsApiKeyAddedAt).toLocaleString()}
              </p>
            )}
          </form>
        </div>

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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, ShieldCheck, KeyRound, Eye, EyeOff, 
  Trash2, Plus, RefreshCw, Clipboard, Check, UserPen,
  MapPin, CreditCard, ExternalLink, Globe, CheckCircle2,
  AlertTriangle, Sparkles, Server
} from 'lucide-react';
import { apiRequest } from '../api.js';
import { APIKey } from '../types.js';
import ThemeToggle from './ThemeToggle.jsx';

interface SettingsScreenProps {
  currentUser: { 
    id: string; 
    email: string; 
    name: string; 
    mfaEnabled: boolean; 
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // BYOK Google Maps Platform Key State
  const [mapsApiKeyInput, setMapsApiKeyInput] = useState(currentUser?.customMapsApiKey || '');
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [isSavingMapsKey, setIsSavingMapsKey] = useState(false);
  const [isTestingMapsKey, setIsTestingMapsKey] = useState(false);
  const [mapsKeyTestResult, setMapsKeyTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Synchronize input when currentUser updates
  useEffect(() => {
    if (currentUser?.customMapsApiKey) {
      setMapsApiKeyInput(currentUser.customMapsApiKey);
    }
  }, [currentUser?.customMapsApiKey]);

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
                  BYOK Active ($200/mo Free Tier)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  System Shared Tier (Demo Key)
                </span>
              )}
            </div>
          </div>

          {/* Educational / Setup Guide */}
          <div className="p-4 bg-slate-950/80 rounded border border-white/5 space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">How Bring Your Own Key (BYOK) Works</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Google gives every Google Cloud account a recurring <strong className="text-cyan-300">$200.00 free credit every month</strong> (~28,000 dynamic satellite & 360° Street View requests). By linking your personal key, your physical threat recon queries are billed directly against your personal free credit with zero cost, ensuring unlimited dedicated quota for your investigations.
                </p>
              </div>
            </div>

            {/* 3 Step Instruction Accordion / Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/5">
              <div className="p-2.5 bg-slate-900/60 rounded border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400">STEP 1</span>
                <p className="text-[11px] font-semibold text-slate-200">Open GCP Console</p>
                <p className="text-[10px] text-slate-400">Click the button below to navigate to your Google Cloud credentials.</p>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400">STEP 2</span>
                <p className="text-[11px] font-semibold text-slate-200">Generate Key</p>
                <p className="text-[10px] text-slate-400">Click <strong>+ Create Credentials</strong> ➔ <strong>API key</strong>.</p>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400">STEP 3</span>
                <p className="text-[11px] font-semibold text-slate-200">Enable APIs & Paste</p>
                <p className="text-[10px] text-slate-400">Enable Maps JS & Street View APIs, then paste your <code className="text-cyan-300">AIzaSy...</code> key.</p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
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

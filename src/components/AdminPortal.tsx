/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, ShieldAlert, Key, UserCheck, 
  Ban, RefreshCw, Trash2, Database, Radio,
  Search, Award, CheckCircle2, AlertCircle, ExternalLink,
  QrCode, FileCheck, Copy, Check, CreditCard, Clock, Power,
  Mail, GraduationCap
} from 'lucide-react';
import { apiRequest } from '../api.js';
import { BillingConfig, PaymentRecord } from '../types.js';
import { NOWPAYMENTS_PAYMENT_URL, SUBSCRIPTION_PRICE_USD, SUBSCRIPTION_CYCLE_MONTHS } from '../utils/subscription.js';

interface AdminPortalProps {
  adminPasskeyPassed: boolean;
  onPasskeySuccess: () => void;
  onBillingConfigUpdated?: (cfg: BillingConfig) => void;
}

export default function AdminPortal({ adminPasskeyPassed, onPasskeySuccess, onBillingConfigUpdated }: AdminPortalProps) {
  const [passkeyInput, setPasskeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Isolated states
  const [users, setUsers] = useState<any[]>([]);
  const [socketsCount, setSocketsCount] = useState(0);
  const [dbSize, setDbSize] = useState(0);
  const [loading, setLoading] = useState(false);

  // Certificate Search Module States
  const [searchCertId, setSearchCertId] = useState('CERT-ENCDEC-2026-X892A');
  const [certSearchResult, setCertSearchResult] = useState<any | null>(null);
  const [certSearchLoading, setCertSearchLoading] = useState(false);
  const [certSearchError, setCertSearchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'CERT-ENCDEC-2026-X892A', 
    'CERT-ENCDEC-2026-W194E',
    'CERT-ENCDEC-2026-K491B'
  ]);
  const [copiedResultHash, setCopiedResultHash] = useState(false);
  const [registeredCertificates, setRegisteredCertificates] = useState<any[]>([]);

  // Billing & Subscription Governance States
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [freeDurationValue, setFreeDurationValue] = useState<number>(24);
  const [freeDurationUnit, setFreeDurationUnit] = useState<'minutes' | 'hours' | 'days' | 'months'>('hours');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (adminPasskeyPassed) {
      loadAdminDashboard();
      // Auto perform initial lookup with sample ID for immediate display
      handleSearchCertificate('CERT-ENCDEC-2026-X892A');
    }
  }, [adminPasskeyPassed]);

  const handleSearchCertificate = async (idToSearch?: string) => {
    const query = (idToSearch !== undefined ? idToSearch : searchCertId).trim();
    if (!query) {
      setCertSearchError('Please enter a Certificate ID or validation query.');
      return;
    }

    setCertSearchLoading(true);
    setCertSearchError(null);

    try {
      const res = await apiRequest(`/api/certificates/verify/${encodeURIComponent(query)}`);
      if (res && res.success && res.certificate) {
        setCertSearchResult(res.certificate);
        setSearchCertId(query);
        setRecentSearches(prev => prev.includes(query) ? prev : [query, ...prev.slice(0, 4)]);
      } else {
        setCertSearchResult(null);
        setCertSearchError(res?.error || `Certificate ID "${query}" not found in database.`);
      }
    } catch (err: any) {
      setCertSearchResult(null);
      setCertSearchError(err.message || `No certificate located matching "${query}".`);
    } finally {
      setCertSearchLoading(false);
    }
  };

  const loadAdminDashboard = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch stats and all certificates in parallel
      const [data, certsRes] = await Promise.all([
        apiRequest('/api/admin/system-stats', 'GET', null, {
          'x-secret-passkey': 'VIGIL_ADMIN_77'
        }),
        apiRequest('/api/certificates').catch(() => null)
      ]);
      setUsers(data.users);
      setSocketsCount(data.activeSocketsCount);
      setDbSize(data.dbFileSize);
      if (data.billingConfig) {
        setBillingConfig(data.billingConfig);
      }
      if (Array.isArray(data.payments)) {
        setPayments(data.payments);
      }
      if (certsRes && certsRes.certificates) {
        setRegisteredCertificates(certsRes.certificates);
      }
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

  // Send live in-app + email notification to uncertified operators
  const handleNotifyUncertifiedUsers = async (userId?: string) => {
    setNotifyBusy(true);
    setNotifyMessage(null);
    setErrorMsg(null);
    try {
      const res = await apiRequest(
        '/api/admin/users/notify-uncertified',
        'POST',
        userId ? { userId } : {},
        { 'x-secret-passkey': 'VIGIL_ADMIN_77' }
      );
      setNotifyMessage(res?.message || 'Uncertified operators notified to complete the EncDec Workbook.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to notify uncertified operators.');
    } finally {
      setNotifyBusy(false);
    }
  };

  // Toggle global subscription paywall ON / OFF
  const handleTogglePaywall = async () => {
    const nextRequired = !(billingConfig?.subscriptionRequired ?? true);
    setBillingBusy(true);
    setBillingNotice(null);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/api/admin/billing/toggle-paywall', 'POST', {
        subscriptionRequired: nextRequired,
      }, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      if (res?.billingConfig) {
        setBillingConfig(res.billingConfig);
        onBillingConfigUpdated?.(res.billingConfig);
      }
      setBillingNotice(
        nextRequired
          ? 'Subscription paywall ENABLED ($500 / 3 months required for non-admin users).'
          : 'Subscription paywall DISABLED (all users can access the platform without paying).'
      );
      await loadAdminDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBillingBusy(false);
    }
  };

  // Activate or end global free access for all users for a chosen duration
  const handleFreeAccess = async (enabled: boolean, customVal?: number, customUnit?: 'minutes' | 'hours' | 'days' | 'months', customLabel?: string) => {
    setBillingBusy(true);
    setBillingNotice(null);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/api/admin/billing/free-access', 'POST', {
        enabled,
        durationValue: customVal ?? freeDurationValue,
        durationUnit: customUnit ?? freeDurationUnit,
        durationLabel: customLabel,
      }, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      if (res?.billingConfig) {
        setBillingConfig(res.billingConfig);
        onBillingConfigUpdated?.(res.billingConfig);
      }
      setBillingNotice(
        enabled
          ? `Global free access ACTIVATED for all users (${customLabel || `${customVal ?? freeDurationValue} ${customUnit ?? freeDurationUnit}`}).`
          : 'Global free access window ended. Standard subscription rules apply.'
      );
      await loadAdminDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBillingBusy(false);
    }
  };

  // Grant 3-month subscription to a specific user
  const handleGrantSubscription = async (userId: string, months = 3) => {
    setBillingBusy(true);
    setBillingNotice(null);
    setErrorMsg(null);
    try {
      await apiRequest(`/api/admin/users/${userId}/subscription/grant`, 'POST', { months }, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      setBillingNotice(`Granted ${months}-month subscription access.`);
      await loadAdminDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBillingBusy(false);
    }
  };

  // Revoke subscription from a specific user
  const handleRevokeSubscription = async (userId: string) => {
    setBillingBusy(true);
    setBillingNotice(null);
    setErrorMsg(null);
    try {
      await apiRequest(`/api/admin/users/${userId}/subscription/revoke`, 'POST', {}, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      setBillingNotice('User subscription revoked and dashboard access locked.');
      await loadAdminDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBillingBusy(false);
    }
  };

  // Approve or Reject pending NOWPayments submission
  const handlePaymentDecision = async (paymentId: string, approve: boolean) => {
    setBillingBusy(true);
    setBillingNotice(null);
    setErrorMsg(null);
    try {
      await apiRequest(`/api/admin/payments/${paymentId}/${approve ? 'approve' : 'reject'}`, 'POST', {}, {
        'x-secret-passkey': 'VIGIL_ADMIN_77'
      });
      setBillingNotice(approve ? 'NOWPayments submission approved & 3-month subscription activated.' : 'NOWPayments submission rejected.');
      await loadAdminDashboard();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBillingBusy(false);
    }
  };

  const pendingPayments = payments.filter((p) => p.status === 'pending_verification');
  const isPaywallEnabled = billingConfig?.subscriptionRequired ?? true;
  const isFreeAccessLive = Boolean(
    billingConfig?.freeAccessActive &&
      billingConfig?.freeAccessExpiresAt &&
      Date.parse(billingConfig.freeAccessExpiresAt) > Date.now()
  );

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

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.25)] cursor-pointer"
                id="admin-passkey-submit-btn"
              >
                Verify Gate Passkey
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasskeyInput('VIGIL_ADMIN_77');
                  onPasskeySuccess();
                }}
                className="px-4 py-3 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold border border-white/10 cursor-pointer"
                title="1-Click Unlock for Authorized Admin"
                id="btn-quick-unlock-gateway"
              >
                1-Click Unlock
              </button>
            </div>
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

            <div className="flex flex-wrap gap-3">
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
              <button
                type="button"
                disabled={billingBusy}
                onClick={handleTogglePaywall}
                className={`p-3 rounded border text-center min-w-44 cursor-pointer transition-colors ${
                  isPaywallEnabled
                    ? 'bg-amber-950/30 border-amber-500/40 hover:bg-amber-950/50 text-amber-300'
                    : 'bg-emerald-950/30 border-emerald-500/40 hover:bg-emerald-950/50 text-emerald-300'
                }`}
                title="Click to turn EncDec IDS subscription ON or OFF for all users"
                id="admin-portal-telemetry-sub-toggle"
              >
                <span className="text-[10px] text-slate-400 uppercase block">EncDec Subscription</span>
                <span className="text-sm font-bold flex items-center justify-center gap-1.5 mt-1">
                  <Power className="w-3.5 h-3.5" />
                  {isPaywallEnabled ? 'ON (Licensed Only)' : 'OFF (Free For All)'}
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* NOWPAYMENTS SUBSCRIPTION PAYWALL & FREE ACCESS CONTROL CENTER             */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-6 space-y-5 shadow-xl" id="admin-billing-governance">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>NOWPayments Subscription & Paywall Governance</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      isPaywallEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isPaywallEnabled ? 'Paywall ON ($500 / 3 Mo)' : 'Paywall OFF (Open Access)'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Control subscription enforcement, timed free access for all users, and NOWPayments verification approvals.
                </p>
              </div>

              <a
                href={billingConfig?.nowPaymentsUrl || NOWPAYMENTS_PAYMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0"
              >
                <span>NOWPayments Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {billingNotice && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{billingNotice}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Master Paywall ON / OFF Switch */}
              <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Master Payment Switch
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      Subscription Enforcement ({isPaywallEnabled ? 'Enabled' : 'Disabled'})
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      When ON, non-admin users must hold an active ${SUBSCRIPTION_PRICE_USD} / {SUBSCRIPTION_CYCLE_MONTHS}-month subscription unless free access is active. Turn OFF to let everyone use the platform without subscribing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={billingBusy}
                  onClick={handleTogglePaywall}
                  className={`w-full py-2.5 px-4 rounded-lg font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 border cursor-pointer transition-colors ${
                    isPaywallEnabled
                      ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                  }`}
                  id="admin-toggle-paywall-btn"
                >
                  <Power className="w-4 h-4" />
                  <span>
                    {isPaywallEnabled
                      ? 'Turn Subscription Payment OFF'
                      : 'Turn Subscription Payment ON'}
                  </span>
                </button>
              </div>

              {/* Global Timed Free Access for All Users */}
              <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Timed Free Access Window
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Let All Users Use Platform For Free</span>
                    </h4>
                  </div>
                  {isFreeAccessLive && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase">
                      LIVE
                    </span>
                  )}
                </div>

                {isFreeAccessLive && billingConfig?.freeAccessExpiresAt && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-emerald-200">
                      <span className="font-bold block">
                        Free Access Active ({billingConfig.freeAccessDurationLabel || 'Custom Window'})
                      </span>
                      <span className="text-emerald-400/80 text-[10px]">
                        Expires: {new Date(billingConfig.freeAccessExpiresAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={billingBusy}
                      onClick={() => handleFreeAccess(false)}
                      className="px-3 py-1.5 rounded bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase cursor-pointer shrink-0"
                      id="admin-end-free-access-btn"
                    >
                      End Free Access
                    </button>
                  </div>
                )}

                {/* Preset Quick Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '1 Hour', val: 1, unit: 'hours' as const },
                    { label: '24 Hours', val: 24, unit: 'hours' as const },
                    { label: '7 Days', val: 7, unit: 'days' as const },
                    { label: '30 Days', val: 30, unit: 'days' as const },
                    { label: '3 Months', val: 3, unit: 'months' as const },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={billingBusy}
                      onClick={() => handleFreeAccess(true, preset.val, preset.unit, preset.label)}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Duration Selector */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    min={1}
                    max={8760}
                    value={freeDurationValue}
                    onChange={(e) => setFreeDurationValue(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full sm:w-24 bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    id="admin-free-duration-input"
                  />
                  <select
                    value={freeDurationUnit}
                    onChange={(e) => setFreeDurationUnit(e.target.value as any)}
                    className="bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    id="admin-free-unit-select"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                  </select>
                  <button
                    type="button"
                    disabled={billingBusy}
                    onClick={() => handleFreeAccess(true)}
                    className="flex-1 py-2 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase text-xs cursor-pointer transition-colors"
                    id="admin-activate-free-access-btn"
                  >
                    Activate Free Access
                  </button>
                </div>
              </div>
            </div>

            {/* Pending NOWPayments Verification Queue */}
            {pendingPayments.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Pending NOWPayments Submissions ({pendingPayments.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {pendingPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg bg-slate-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {p.userName} ({p.userEmail})
                        </p>
                        <p className="text-[11px] text-cyan-300 truncate">
                          Ref: <span className="select-all">{p.paymentReference || p.id}</span> • ${p.amountUsd} / {p.billingCycleMonths} Mo
                        </p>
                        {p.notes && <p className="text-[10px] text-slate-400 truncate">{p.notes}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={billingBusy}
                          onClick={() => handlePaymentDecision(p.id, true)}
                          className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase text-[10px] cursor-pointer"
                        >
                          Approve & Grant 3 Mo
                        </button>
                        <button
                          type="button"
                          disabled={billingBusy}
                          onClick={() => handlePaymentDecision(p.id, false)}
                          className="px-3 py-1.5 rounded bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold uppercase text-[10px] cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* CERTIFICATE SEARCH & REGISTRY VALIDATION MODULE FOR ADMINS                */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 border-2 border-cyan-500/30 rounded-xl p-6 space-y-5 shadow-2xl relative overflow-hidden" id="admin-certificate-search-module">
            <div className="absolute top-0 right-0 w-64 h-full bg-cyan-500/5 blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Certificate Search & Registry Validation</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[9px]">
                      Database Live Query
                    </span>
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Enter a Certificate ID to instantly view validation records, candidate full name, and capstone quiz score directly from the database.
                </p>
              </div>

              {/* Sample Shortcuts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500">Quick Test:</span>
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSearchCertificate(s)}
                    className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 text-[10px] cursor-pointer transition-colors"
                  >
                    {s.split('-').slice(-1)[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearchCertificate(); }} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchCertId}
                  onChange={(e) => setSearchCertId(e.target.value)}
                  placeholder="Enter Certificate ID (e.g. CERT-ENCDEC-2026-X892A)"
                  className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
                  id="admin-cert-search-input"
                />
              </div>

              <button
                type="submit"
                disabled={certSearchLoading || !searchCertId.trim()}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                id="admin-cert-search-btn"
              >
                {certSearchLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying DB...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Certificate</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Message */}
            {certSearchError && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{certSearchError}</span>
              </div>
            )}

            {/* Search Result Card */}
            {certSearchResult && (
              <div className="bg-slate-950 border border-emerald-500/50 rounded-xl p-5 space-y-4 shadow-xl animate-fadeIn" id="admin-cert-validation-card">
                
                {/* Result Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                        ✓ Database Record Located & Verified
                      </span>
                      <span className="text-white font-bold text-sm">
                        {certSearchResult.certificateId}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/verify/${encodeURIComponent(certSearchResult.certificateId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Employer QR Portal ↗</span>
                    </a>
                  </div>
                </div>

                {/* Candidate Information as Requested: Name, Quiz Score, etc. */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Last Name */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-white/5 space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Last Name (Surname)</span>
                    <span className="text-sm font-bold text-white tracking-wide">
                      {certSearchResult.lastName || '—'}
                    </span>
                  </div>

                  {/* First Name */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-white/5 space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">First Name (Given)</span>
                    <span className="text-sm font-bold text-white tracking-wide">
                      {certSearchResult.firstName || '—'}
                    </span>
                  </div>

                  {/* Middle Name */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-white/5 space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Middle Name</span>
                    <span className="text-sm font-bold text-white tracking-wide">
                      {certSearchResult.middleName || <span className="text-slate-600 italic">None</span>}
                    </span>
                  </div>
                </div>

                {/* Full Name & Quiz Score Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-900 rounded-lg border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Conferred Full Name</span>
                    <span className="text-sm font-bold text-cyan-300">
                      {certSearchResult.fullName}
                    </span>
                    <p className="text-[10px] text-slate-400">Recipient Email: {certSearchResult.recipientEmail}</p>
                  </div>

                  {/* Quiz Score Gotten to Attain Certificate */}
                  <div className="p-3.5 bg-emerald-950/40 rounded-lg border border-emerald-500/40 space-y-1 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                        Capstone Knowledge Check Score
                      </span>
                      <span className="text-xl font-bold font-sans text-white">
                        {certSearchResult.quizScore}% <span className="text-xs text-emerald-400 font-mono font-normal">(Verified Mastery)</span>
                      </span>
                      <p className="text-[10px] text-slate-400">Minimum passing standard: 80%</p>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                      ★
                    </div>
                  </div>
                </div>

                {/* Course Title & Credential Statement */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-1.5 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-slate-400">
                    <span>Course: <strong className="text-white">{certSearchResult.courseTitle}</strong></span>
                    <span>Issued: <strong className="text-white">{certSearchResult.issueDate}</strong></span>
                  </div>
                  <p className="text-[11px] text-slate-300 italic border-l-2 border-cyan-400 pl-2.5 mt-1 leading-relaxed">
                    "{certSearchResult.attestationStatement}"
                  </p>
                </div>

                {/* Hash & Copy Action */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-2 border-t border-white/5">
                  <span className="truncate max-w-md font-mono">
                    {certSearchResult.verificationCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(certSearchResult.verificationCode || certSearchResult.certificateId);
                      setCopiedResultHash(true);
                      setTimeout(() => setCopiedResultHash(false), 2000);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1 font-bold"
                  >
                    {copiedResultHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedResultHash ? 'Copied to Clipboard' : 'Copy Hash'}</span>
                  </button>
                </div>

              </div>
            )}

            {/* Quick Directory Table of Registered Certificates in Database */}
            {registeredCertificates.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Database Certificate Registry ({registeredCertificates.length} Records)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Click any record to inspect instantly
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {registeredCertificates.map((cert) => {
                    const isSelected = certSearchResult?.certificateId === cert.certificateId;
                    return (
                      <button
                        key={cert.certificateId}
                        type="button"
                        onClick={() => handleSearchCertificate(cert.certificateId)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400'
                            : 'bg-slate-950/80 border-white/5 hover:border-white/20 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-cyan-400 font-mono">{cert.certificateId}</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Score: {cert.quizScore}%
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white mt-1 truncate">
                          {cert.fullName || `${cert.firstName} ${cert.lastName}`}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          Issued: {cert.issueDate}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* User management list */}
          <div className="bg-slate-900 border border-white/5 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                <Database className="w-4 h-4 text-red-500" />
                Operator Fleet registry nodes
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const uncertifiedCount = users.filter(
                    (u) => u.status !== 'suspended' && !u.certificationStatus?.isCertified
                  ).length;
                  return (
                    <button
                      type="button"
                      onClick={() => handleNotifyUncertifiedUsers()}
                      disabled={notifyBusy || uncertifiedCount === 0}
                      className="bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 disabled:opacity-50 text-amber-300 px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
                      id="admin-notify-uncertified-btn"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>
                        {notifyBusy ? 'Notifying...' : `Notify Uncertified (${uncertifiedCount})`}
                      </span>
                    </button>
                  );
                })()}
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
            </div>

            {notifyMessage && (
              <div
                className="mb-4 px-3 py-2 rounded-lg bg-emerald-950/50 border border-emerald-500/35 text-emerald-300 font-mono text-xs flex items-center gap-2"
                id="admin-notify-uncertified-feedback"
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>{notifyMessage}</span>
              </div>
            )}

            {/* Desktop Registry Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">Operator ID (Email)</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Clearance Role</th>
                    <th className="py-2 px-3">Certification</th>
                    <th className="py-2 px-3">MFA Status</th>
                    <th className="py-2 px-3">Subscription ($500 / 3 Mo)</th>
                    <th className="py-2 px-3 text-right">Gate & Billing Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {users.map((user) => {
                    const isSubActive =
                      user.role === 'admin' ||
                      (user.subscriptionStatus === 'active' &&
                        user.subscriptionExpiresAt &&
                        Date.parse(user.subscriptionExpiresAt) > Date.now());
                    const certInfo = user.certificationStatus;
                    const isUserCertified = Boolean(certInfo?.isCertified);
                    return (
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
                        <td className="py-3 px-3 tabular-nums">
                          {isUserCertified ? (
                            <span className="text-emerald-400 text-[11px] font-semibold">
                              CE-SOC Certified
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-amber-300 text-[11px]">
                                Uncertified · {certInfo?.chaptersCompleted ?? 0}/{certInfo?.totalChapters ?? 10}
                              </span>
                              <button
                                type="button"
                                disabled={notifyBusy}
                                onClick={() => handleNotifyUncertifiedUsers(user.id)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                                title="Send workbook certification reminder"
                                id={`remind-cert-btn-${user.id}`}
                              >
                                Remind
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            user.mfaEnabled ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {user.mfaEnabled ? 'ENABLED' : 'OFFLINE'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase inline-block ${
                              user.role === 'admin'
                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                : isSubActive
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : user.subscriptionStatus === 'revoked'
                                ? 'bg-red-950 text-red-400 border border-red-500/30'
                                : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                            }`}>
                              {user.role === 'admin' ? 'ADMIN OVERRIDE' : isSubActive ? 'ACTIVE' : (user.subscriptionStatus || 'INACTIVE')}
                            </span>
                            {user.role !== 'admin' && user.subscriptionExpiresAt && isSubActive && (
                              <span className="block text-[9px] text-slate-400">
                                Until {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {user.role !== 'admin' && (
                              <>
                                <button
                                  type="button"
                                  disabled={billingBusy}
                                  onClick={() => handleGrantSubscription(user.id, 3)}
                                  className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer"
                                  id={`grant-sub-btn-${user.id}`}
                                >
                                  Grant 3 Mo
                                </button>
                                <button
                                  type="button"
                                  disabled={billingBusy}
                                  onClick={() => handleRevokeSubscription(user.id)}
                                  className="bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 px-2 py-1 rounded text-[10px] uppercase font-bold cursor-pointer"
                                  id={`revoke-sub-btn-${user.id}`}
                                >
                                  Revoke Sub
                                </button>
                              </>
                            )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Registry Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {users.map((user) => {
                const isSubActive =
                  user.role === 'admin' ||
                  (user.subscriptionStatus === 'active' &&
                    user.subscriptionExpiresAt &&
                    Date.parse(user.subscriptionExpiresAt) > Date.now());
                return (
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

                    <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                      <span className="text-slate-500">Subscription:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        user.role === 'admin'
                          ? 'bg-cyan-500/15 text-cyan-300'
                          : isSubActive
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-amber-950 text-amber-400'
                      }`}>
                        {user.role === 'admin' ? 'ADMIN OVERRIDE' : isSubActive ? 'ACTIVE' : (user.subscriptionStatus || 'INACTIVE')}
                      </span>
                    </div>

                    {user.role !== 'admin' && (
                      <div className="flex gap-2 border-t border-white/5 pt-2">
                        <button
                          type="button"
                          disabled={billingBusy}
                          onClick={() => handleGrantSubscription(user.id, 3)}
                          className="flex-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold cursor-pointer"
                        >
                          Grant 3 Mo
                        </button>
                        <button
                          type="button"
                          disabled={billingBusy}
                          onClick={() => handleRevokeSubscription(user.id)}
                          className="flex-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 px-2.5 py-1.5 rounded text-[10px] uppercase font-bold cursor-pointer"
                        >
                          Revoke Sub
                        </button>
                      </div>
                    )}

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
                );
              })}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

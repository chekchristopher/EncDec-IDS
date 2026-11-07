/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, ShieldAlert, Key, UserCheck, 
  Ban, RefreshCw, Trash2, Database, Radio,
  Search, Award, CheckCircle2, AlertCircle, ExternalLink,
  QrCode, FileCheck, Copy, Check
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

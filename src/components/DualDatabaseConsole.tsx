/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, Server, ShieldCheck, RefreshCw, CheckCircle2, 
  AlertTriangle, Play, Terminal, Lock, Globe, HardDrive, 
  ArrowRightLeft, Settings2, Check, Key, Eye, EyeOff, Layers, Info
} from 'lucide-react';
import { DualDatabaseStatus, MssqlConfig } from '../types.js';
import { getAuthToken } from '../api.js';

interface DualDatabaseConsoleProps {
  currentUserRole?: string;
  onShowAlert?: (msg: string) => void;
}

export default function DualDatabaseConsole({ 
  currentUserRole = 'analyst',
  onShowAlert 
}: DualDatabaseConsoleProps) {
  const [dbStatus, setDbStatus] = useState<DualDatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; serverInfo?: any; hint?: string } | null>(null);

  // Config modal state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState<MssqlConfig>({
    server: 'sqlserver.corp.local',
    port: 1433,
    database: 'EncDec_SOC_DB',
    authType: 'windows',
    domain: 'CORP',
    user: 'Administrator',
    password: '',
    encrypt: false,
    trustServerCertificate: true,
    enabled: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // SQL Query & Table Explorer state
  const [selectedTable, setSelectedTable] = useState('EncDec_SecurityAlerts');
  const [customSql, setCustomSql] = useState('SELECT TOP 50 * FROM dbo.EncDec_SecurityAlerts ORDER BY timestamp DESC');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<{ source: string; rows: any[]; count: number; columns: string[]; notice?: string } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');

  const getToken = () => {
    return getAuthToken() || localStorage.getItem('encdec_ids_token') || localStorage.getItem('encdec_token') || '';
  };

  const fetchStatus = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/database/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data.status);
        if (data.config) {
          setConfigForm(prev => ({
            ...prev,
            ...data.config,
            password: ''
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch database status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuery = async (overrideQuery?: string, overrideTable?: string) => {
    setQueryLoading(true);
    setQueryError(null);
    try {
      const token = getToken();
      const q = overrideQuery !== undefined ? overrideQuery : customSql;
      const t = overrideTable !== undefined ? overrideTable : selectedTable;
      
      const res = await fetch('/api/database/mssql/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: q, table: t })
      });
      const data = await res.json();
      if (!res.ok) {
        setQueryError(data.error || 'Failed to execute query');
        setQueryResult(null);
      } else {
        setQueryResult(data);
      }
    } catch (err: any) {
      setQueryError(err.message || 'Network error executing SQL query');
      setQueryResult(null);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const token = getToken();
      const res = await fetch('/api/database/mssql/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configForm)
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success && onShowAlert) {
        onShowAlert('SQL Server Connection Test Passed!');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
        hint: 'Verify server IP/hostname, port 1433, and domain credentials.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const token = getToken();
      const res = await fetch('/api/database/mssql/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configForm)
      });
      const data = await res.json();
      if (res.ok) {
        setIsConfigOpen(false);
        fetchStatus();
        if (onShowAlert) onShowAlert('SQL Server configuration updated and dual-sync initiated.');
      } else {
        alert(data.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update SQL Server configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleForceDualSync = async () => {
    setSyncing(true);
    try {
      const token = getToken();
      const res = await fetch('/api/database/mssql/sync-now', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (onShowAlert) onShowAlert('Dual Database synchronization completed across Firebase & SQL Server.');
        fetchStatus();
        handleRunQuery();
      } else {
        alert(data.error || 'Dual sync failed.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to trigger dual sync.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    handleRunQuery();
  }, []);

  const handleSelectTable = (tbl: string) => {
    setSelectedTable(tbl);
    const newQuery = `SELECT TOP 50 * FROM dbo.${tbl} ORDER BY timestamp DESC`;
    setCustomSql(newQuery);
    handleRunQuery(newQuery, tbl);
  };

  const filteredRows = (queryResult?.rows || []).filter(row => {
    if (!tableSearch) return true;
    return JSON.stringify(row).toLowerCase().includes(tableSearch.toLowerCase());
  });

  return (
    <div className="space-y-6" id="dual-database-console">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-white/5 p-6 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
                Dual Database Architecture
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-mono">
                  Firebase + MS SQL Server
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Redundant dual-sync storage engine supporting Firebase Cloud Firestore and Microsoft SQL Server with Windows Authentication.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={handleForceDualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
            id="dual-sync-force-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchronizing Databases...' : 'Force Dual Sync'}</span>
          </button>

          {currentUserRole === 'admin' && (
            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-white/10 text-white rounded-lg text-xs font-mono transition-colors cursor-pointer"
              id="mssql-config-open-btn"
            >
              <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configure SQL Server</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Database Primary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firebase Firestore Card */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Firebase Cloud Firestore</h3>
                <p className="text-[11px] text-slate-400">Google Cloud NoSQL Managed Document Store</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE & SYNCED
            </span>
          </div>

          <div className="mt-5 space-y-2.5 text-xs font-mono bg-slate-950/70 p-3.5 rounded-lg border border-white/5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Project ID:</span>
              <span className="text-cyan-400 font-semibold truncate max-w-[200px]" title={dbStatus?.firebase.projectId}>
                {dbStatus?.firebase.projectId || 'ai-studio-encdecids-...'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Database Instance:</span>
              <span>{dbStatus?.firebase.databaseId || '(default)'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Collections Managed:</span>
              <span className="text-emerald-400 font-bold">12 Cloud Collections</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Sync Pipeline:</span>
              <span className="text-slate-400">Real-time WebSocket & REST</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Primary Cloud Replica: <strong className="text-white">Active</strong></span>
            <span className="text-slate-500">Auto-Commits on Event</span>
          </div>
        </div>

        {/* Microsoft SQL Server Card */}
        <div className="bg-slate-900 border border-white/5 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">Microsoft SQL Server</h3>
                <p className="text-[11px] text-slate-400">Relational Database with Windows Domain Auth</p>
              </div>
            </div>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
              dbStatus?.mssql.connected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dbStatus?.mssql.connected ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
              {dbStatus?.mssql.connected ? 'LIVE CONNECTED' : 'STANDBY & DUAL BUFFERED'}
            </span>
          </div>

          <div className="mt-5 space-y-2.5 text-xs font-mono bg-slate-950/70 p-3.5 rounded-lg border border-white/5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Server Host:</span>
              <span className="text-blue-400 font-semibold">{configForm.server}:{configForm.port}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Database Name:</span>
              <span className="text-white">{configForm.database}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Authentication:</span>
              <span className="text-amber-400 font-bold">
                {configForm.authType === 'windows' ? `Windows Domain (${configForm.domain || 'WORKGROUP'}\\${configForm.user})` : `SQL User (${configForm.user})`}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Dual Sync Tables:</span>
              <span className="text-cyan-400 font-bold">6 Relational dbo.* Tables</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>TDS Protocol: <strong className="text-white">Port {configForm.port}</strong></span>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer disabled:opacity-50"
            >
              {testingConnection ? 'Testing...' : 'Test Windows Auth'}
            </button>
          </div>
        </div>
      </div>

      {/* Test Connection Banner (if tested) */}
      {testResult && (
        <div className={`p-4 rounded-xl border font-mono text-xs ${
          testResult.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-start gap-3">
            {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />}
            <div>
              <p className="font-bold">{testResult.message}</p>
              {testResult.serverInfo && (
                <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                  <p>• Connected DB: <span className="text-white font-semibold">{testResult.serverInfo.currentDb}</span></p>
                  <p>• Authenticated Principal: <span className="text-cyan-400 font-semibold">{testResult.serverInfo.currentUser}</span></p>
                </div>
              )}
              {testResult.hint && (
                <p className="mt-2 text-[11px] text-slate-400">💡 Hint: {testResult.hint}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Schema & Row Count Comparison */}
      <div className="bg-slate-900 border border-white/5 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Dual Database Mapping Matrix (Firestore $\leftrightarrow$ MS SQL Server)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'Security Alerts', firestore: 'alerts', sql: 'dbo.EncDec_SecurityAlerts', count: dbStatus?.mssql.tableCounts.alerts ?? 0 },
            { name: 'Audit Logs', firestore: 'auditLogs', sql: 'dbo.EncDec_AuditLogs', count: dbStatus?.mssql.tableCounts.auditLogs ?? 0 },
            { name: 'Email Dispatches', firestore: 'emailLogs', sql: 'dbo.EncDec_EmailLogs', count: dbStatus?.mssql.tableCounts.emailLogs ?? 0 },
            { name: 'Operator Profiles', firestore: 'users', sql: 'dbo.EncDec_Users', count: dbStatus?.mssql.tableCounts.users ?? 0 },
            { name: 'Detection Rules', firestore: 'rules', sql: 'dbo.EncDec_Rules', count: dbStatus?.mssql.tableCounts.rules ?? 0 },
            { name: 'Monitored Hosts', firestore: 'hosts', sql: 'dbo.EncDec_Hosts', count: dbStatus?.mssql.tableCounts.hosts ?? 0 }
          ].map((item, idx) => (
            <div 
              key={idx}
              onClick={() => handleSelectTable(item.sql.replace('dbo.', ''))}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedTable === item.sql.replace('dbo.', '')
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-mono font-semibold">{item.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-bold text-white font-mono">{item.count}</span>
              </div>
              <p className="text-[9px] font-mono text-amber-400/80 truncate">🔥 {item.firestore}</p>
              <p className="text-[9px] font-mono text-blue-400/90 truncate mt-0.5">🗄️ {item.sql}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive SQL Query & Inspector Console */}
      <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              SQL Server Table Explorer & Query Console
            </h3>
            <p className="text-xs text-slate-400">
              Query and inspect records stored in SQL Server and verify synchronization with Firebase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Target:</span>
            <select
              value={selectedTable}
              onChange={(e) => handleSelectTable(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="EncDec_SecurityAlerts">dbo.EncDec_SecurityAlerts</option>
              <option value="EncDec_AuditLogs">dbo.EncDec_AuditLogs</option>
              <option value="EncDec_EmailLogs">dbo.EncDec_EmailLogs</option>
              <option value="EncDec_Users">dbo.EncDec_Users</option>
              <option value="EncDec_Rules">dbo.EncDec_Rules</option>
              <option value="EncDec_Hosts">dbo.EncDec_Hosts</option>
            </select>
          </div>
        </div>

        {/* Query Input Box */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              placeholder="e.g. SELECT TOP 50 * FROM dbo.EncDec_SecurityAlerts WHERE severity = 'CRITICAL'"
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              id="custom-sql-input"
            />
          </div>
          <button
            onClick={() => handleRunQuery()}
            disabled={queryLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
            id="run-sql-query-btn"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${queryLoading ? 'animate-spin' : ''}`} />
            <span>{queryLoading ? 'Executing...' : 'Run Query'}</span>
          </button>
        </div>

        {/* Source Badge & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Active Source:</span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px]">
              {queryResult?.source || 'Dual-Sync Store'}
            </span>
            <span className="text-slate-500">| Total Rows:</span>
            <span className="text-white font-bold">{queryResult?.count ?? 0}</span>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Filter result rows..."
              className="w-full bg-slate-950 border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {queryError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs">
            ⚠️ {queryError}
          </div>
        )}

        {/* Table Results View */}
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border border-white/5 bg-slate-950/70">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 sticky top-0 z-10">
              <tr className="border-b border-white/10 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                {(queryResult?.columns || []).map((col, idx) => (
                  <th key={idx} className="py-2.5 px-4 bg-slate-900 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={queryResult?.columns?.length || 4} className="py-8 text-center text-slate-500 font-mono">
                    No matching rows found in {selectedTable}.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    {(queryResult?.columns || []).map((col, cIdx) => {
                      const val = row[col];
                      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
                      return (
                        <td key={cIdx} className="py-2.5 px-4 text-slate-300 max-w-xs truncate" title={valStr}>
                          {col === 'severity' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] uppercase border bg-amber-500/10 border-amber-500/30 text-amber-400">
                              {valStr}
                            </span>
                          ) : col === 'status' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] uppercase border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                              {valStr}
                            </span>
                          ) : (
                            valStr
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SQL Server & Windows Authentication Settings Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl p-6 relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">Microsoft SQL Server Configuration</h3>
                  <p className="text-xs text-slate-400">Configure Windows Authentication and TDS parameters</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 font-mono text-xs">
              {/* Enabled Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-white/5">
                <div>
                  <p className="font-bold text-white">Enable Dual SQL Server Sync</p>
                  <p className="text-[11px] text-slate-400">Automatically replicate all Firebase records to Microsoft SQL Server</p>
                </div>
                <input
                  type="checkbox"
                  checked={configForm.enabled}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Authentication Type */}
              <div>
                <label className="block text-slate-400 mb-1.5">Authentication Mechanism</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfigForm(prev => ({ ...prev, authType: 'windows' }))}
                    className={`py-2 px-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      configForm.authType === 'windows'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="font-bold">Windows Authentication</p>
                    <p className="text-[10px] text-slate-500">Active Directory / NTLM Domain</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfigForm(prev => ({ ...prev, authType: 'sql' }))}
                    className={`py-2 px-3 rounded-lg border text-left cursor-pointer transition-colors ${
                      configForm.authType === 'sql'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="font-bold">SQL Authentication</p>
                    <p className="text-[10px] text-slate-500">Standard SQL User & Password</p>
                  </button>
                </div>
              </div>

              {/* Server & Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">SQL Server Host / IP</label>
                  <input
                    type="text"
                    value={configForm.server}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, server: e.target.value }))}
                    placeholder="e.g. sqlserver.corp.local or 10.0.0.45"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Port</label>
                  <input
                    type="number"
                    value={configForm.port}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, port: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* Database Name */}
              <div>
                <label className="block text-slate-400 mb-1">Database Name</label>
                <input
                  type="text"
                  value={configForm.database}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, database: e.target.value }))}
                  placeholder="e.g. EncDec_SOC_DB"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Domain (Windows Auth Only) */}
              {configForm.authType === 'windows' && (
                <div>
                  <label className="block text-slate-400 mb-1">Windows Domain / NetBIOS Workgroup</label>
                  <input
                    type="text"
                    value={configForm.domain || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="e.g. CORP or AD_DOMAIN"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {/* Username & Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    {configForm.authType === 'windows' ? 'Windows Account User' : 'SQL Username'}
                  </label>
                  <input
                    type="text"
                    value={configForm.user}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, user: e.target.value }))}
                    placeholder={configForm.authType === 'windows' ? 'Administrator or svc_ids' : 'sa'}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={configForm.password || ''}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Account password"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* SSL / Encrypt Options */}
              <div className="flex items-center gap-6 p-3 rounded-lg bg-slate-950 border border-white/5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={configForm.encrypt}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, encrypt: e.target.checked }))}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span>Encrypt Connection (TLS)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={configForm.trustServerCertificate}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, trustServerCertificate: e.target.checked }))}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span>Trust Self-Signed Cert</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {testingConnection ? 'Testing Handshake...' : 'Test Connection'}
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving...' : 'Save & Initiate Sync'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

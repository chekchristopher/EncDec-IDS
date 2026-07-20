/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Search, ShieldCheck, Filter } from 'lucide-react';
import { AuditLog } from '../types.js';

interface AuditConsoleProps {
  auditLogs: AuditLog[];
}

export default function AuditConsole({ auditLogs }: AuditConsoleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter(log => {
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus.toLowerCase();
    const matchesSearch = log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.resource.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-6 font-mono text-xs" id="audit-console-container">
      
      {/* Header bar */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          Operator Audit trail Logs
        </h3>
        <span className="text-slate-500">{filteredLogs.length} Records matched</span>
      </div>

      {/* Filter and search controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 bg-slate-950 border border-white/10 rounded flex items-center px-2 focus-within:border-cyan-500 transition-colors">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input
            type="text"
            placeholder="Search by operator email, action, resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-0"
            id="audit-search-input"
          />
        </div>

        <div className="flex gap-2">
          {['ALL', 'SUCCESS', 'FAILURE'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded font-bold uppercase transition-all ${
                filterStatus === status 
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.2)]' 
                  : 'bg-slate-950 text-slate-400 border border-white/5 hover:text-white'
              }`}
              id={`audit-filter-${status}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Logs stream table */}
      <div className="overflow-x-auto max-h-[440px] overflow-y-auto pr-1 hidden md:block">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase sticky top-0 z-10">
            <tr className="border-b border-white/5">
              <th className="py-2 px-3">Timestamp</th>
              <th className="py-2 px-3">Operator</th>
              <th className="py-2 px-3">Sec Activity Action</th>
              <th className="py-2 px-3">Resource Node</th>
              <th className="py-2 px-3">Source IP</th>
              <th className="py-2 px-3 text-right">Gateway Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300 font-mono text-[11px]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  🛸 No audit trail records found for this query filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.01]">
                  <td className="py-2.5 px-3 text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {log.userEmail}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {log.resource}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {log.ipAddress}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      log.status === 'success' 
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/25' 
                        : 'bg-red-950/40 text-red-400 border border-red-500/25 animate-pulse'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Audit Cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden max-h-[440px] overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <p className="text-center py-8 text-slate-500 font-mono text-xs">
            🛸 No audit trail records found for this query filter.
          </p>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-3 bg-slate-950 border border-white/5 rounded space-y-2 text-xs font-mono">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-0.5">
                  <p className="text-white font-semibold truncate max-w-[150px]">{log.userEmail}</p>
                  <p className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                  log.status === 'success' 
                    ? 'bg-emerald-950/40 text-emerald-400' 
                    : 'bg-red-950/40 text-red-400'
                }`}>
                  {log.status}
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <p className="text-cyan-400"><span className="text-slate-500">Action:</span> {log.action}</p>
                <p className="text-slate-400 truncate"><span className="text-slate-500">Node:</span> {log.resource}</p>
                <p className="text-slate-500"><span className="text-slate-500">IP:</span> {log.ipAddress}</p>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

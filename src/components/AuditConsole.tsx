/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, Search, ShieldCheck, Filter, FileText, Mail, Send, CheckCircle, ChevronDown, ChevronUp, UserCheck, ShieldAlert, Lock, ArrowUpRight, Inbox, RefreshCw } from 'lucide-react';
import { AuditLog, EmailLog, User } from '../types.js';
import { jsPDF } from 'jspdf';
import { apiRequest } from '../api.js';

interface AuditConsoleProps {
  auditLogs: AuditLog[];
  emailLogs?: EmailLog[];
  currentUser?: User | null;
}

export default function AuditConsole({ auditLogs: propAuditLogs, emailLogs: propEmailLogs, currentUser }: AuditConsoleProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'emails'>('audit');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Logs State
  const [localAuditLogs, setLocalAuditLogs] = useState<AuditLog[]>(propAuditLogs || []);
  const [localEmailLogs, setLocalEmailLogs] = useState<EmailLog[]>(propEmailLogs || []);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Test Email Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testRole, setTestRole] = useState<'admin' | 'analyst'>('analyst');
  const [testType, setTestType] = useState<'registration' | 'login'>('login');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const currentEmail = (currentUser?.email || '').toLowerCase();
  const currentUserId = currentUser?.id || '';

  // Synchronize incoming props
  useEffect(() => {
    if (propAuditLogs && propAuditLogs.length > 0) {
      setLocalAuditLogs(propAuditLogs);
    }
  }, [propAuditLogs]);

  useEffect(() => {
    if (propEmailLogs && propEmailLogs.length > 0) {
      setLocalEmailLogs(propEmailLogs);
    }
  }, [propEmailLogs]);

  // Initial fetch on mount & tab switch
  useEffect(() => {
    fetchLogs();
  }, [activeTab, currentUser]);

  const fetchLogs = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'audit') {
        const logs = await apiRequest('/api/audit-logs');
        if (Array.isArray(logs)) {
          setLocalAuditLogs(logs);
        }
      } else {
        const emails = await apiRequest('/api/email-logs');
        if (Array.isArray(emails)) {
          setLocalEmailLogs(emails);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch scoped logs', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setTestSuccessMsg('');
    try {
      const res = await apiRequest('/api/email-logs/test', 'POST', {
        recipient: testRecipient,
        role: testRole,
        type: testType
      });
      setTestSuccessMsg(`✅ ${res.message}`);
      fetchLogs();
      setTimeout(() => {
        setShowTestModal(false);
        setTestSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch test email.');
    } finally {
      setSendingTest(false);
    }
  };

  // 1. Role-Based Scoped Audit Logs Filter:
  // Non-admins (analysts) must NEVER see admin audit trails.
  // Admins see all logs across the entire platform.
  const rawLogs = localAuditLogs.length > 0 ? localAuditLogs : propAuditLogs;
  const accessibleAuditLogs = rawLogs.filter(log => {
    if (isAdmin) return true;

    // Non-admin filter:
    const logRole = (log.userRole || '').toLowerCase();
    if (logRole === 'admin') return false;

    const logEmail = (log.userEmail || '').toLowerCase();
    if (logEmail.startsWith('admin') || logEmail.includes('admin@') || logEmail === 'admin') {
      return false;
    }

    // Exclude privileged admin actions
    const adminActions = [
      'altered clearance',
      'purged operator',
      'suspended user',
      'activated suspended',
      'updated sql server',
      'forced dual-database',
      'isolated admin portal',
      'unauthorized gate entry'
    ];
    if (adminActions.some(act => (log.action || '').toLowerCase().includes(act))) {
      return false;
    }

    return true;
  });

  const filteredLogs = accessibleAuditLogs.filter(log => {
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus.toLowerCase();
    const matchesSearch = log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.resource.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // 2. Role-Based Scoped Email Dispatches Filter:
  // Non-admins (analysts) only see emails they sent out OR received.
  // Admins see all emails across the entire system.
  const rawEmails = localEmailLogs.length > 0 ? localEmailLogs : (propEmailLogs || []);
  const accessibleEmailLogs = rawEmails.filter(email => {
    if (isAdmin) return true;

    const recipientMatch = (email.recipient || '').toLowerCase() === currentEmail;
    const senderMatch = (email.senderEmail || '').toLowerCase() === currentEmail || (email.senderUserId && email.senderUserId === currentUserId);

    return recipientMatch || senderMatch;
  });

  const filteredEmailLogs = accessibleEmailLogs.filter(email => {
    return email.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
           email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
           email.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
           email.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (email.senderEmail && email.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('Helvetica');

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(15, 12, 180, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text('ENCDEC IDS - SECURITY AUDIT REPORT', 20, 21);

    doc.setTextColor(34, 211, 238); // Cyan-400
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text(`GENERATED: ${new Date().toLocaleString()}  |  RECORDS: ${filteredLogs.length}  |  CLEARANCE: ${isAdmin ? 'ADMINISTRATOR (FULL)' : 'ANALYST (SCOPED)'}`, 20, 29);

    let y = 42;
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(15, y, 180, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Timestamp', 17, y + 5);
    doc.text('Operator', 52, y + 5);
    doc.text('Action', 87, y + 5);
    doc.text('Resource Node', 127, y + 5);
    doc.text('IP Address', 157, y + 5);
    doc.text('Status', 182, y + 5);

    y += 8;

    filteredLogs.forEach((log, index) => {
      if (y > 275) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(15, 12, 180, 15, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.text('ENCDEC IDS - SECURITY AUDIT REPORT (CONTINUED)', 20, 19);
        
        doc.setTextColor(34, 211, 238);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.text(`RECORDS SUMMARY CONT.`, 20, 24);

        y = 35;
        doc.setFillColor(30, 41, 59);
        doc.rect(15, y, 180, 8, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.text('Timestamp', 17, y + 5);
        doc.text('Operator', 52, y + 5);
        doc.text('Action', 87, y + 5);
        doc.text('Resource Node', 127, y + 5);
        doc.text('IP Address', 157, y + 5);
        doc.text('Status', 182, y + 5);

        y += 8;
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(15, y, 180, 8, 'F');

      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 8, 195, y + 8);

      doc.setTextColor(71, 85, 105);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);

      const dateStr = new Date(log.timestamp).toLocaleString();
      const emailStr = log.userEmail.length > 22 ? log.userEmail.substring(0, 20) + '...' : log.userEmail;
      const actionStr = log.action.length > 25 ? log.action.substring(0, 23) + '...' : log.action;
      const resourceStr = log.resource.length > 18 ? log.resource.substring(0, 16) + '...' : log.resource;
      const ipStr = log.ipAddress;
      const statusStr = log.status.toUpperCase();

      doc.text(dateStr, 17, y + 5);
      doc.text(emailStr, 52, y + 5);
      doc.text(actionStr, 87, y + 5);
      doc.text(resourceStr, 127, y + 5);
      doc.text(ipStr, 157, y + 5);

      if (log.status === 'success') {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.setFont('Helvetica', 'bold');
      doc.text(statusStr, 182, y + 5);

      y += 8;
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, 175, 287);
      doc.text(`Confidential - EncDec IDS System Report (${isAdmin ? 'Admin' : 'Analyst'} Access)`, 15, 287);
    }

    doc.save(`EncDec_Audit_Logs_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="bg-slate-900 border border-white/5 rounded-lg p-6 space-y-6 font-mono text-xs" id="audit-console-container">
      
      {/* Role Clearance Notification Banner */}
      {isAdmin ? (
        <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Administrator Clearance:</strong> You have full visibility into all operator audit trails, admin activities, and system email dispatches.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shrink-0 text-[10px]">
            UNRESTRICTED ACCESS
          </span>
        </div>
      ) : (
        <div className="p-3 bg-sky-950/30 border border-sky-500/30 rounded text-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Analyst Clearance:</strong> Admin audit trails are strictly restricted. You can only inspect your authorized operator trails and emails you sent or received.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 shrink-0 text-[10px]">
            ADMIN TRAILS REDACTED
          </span>
        </div>
      )}

      {/* Tab Selector Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                : 'bg-slate-950 text-slate-400 border border-white/5 hover:text-white'
            }`}
            id="tab-audit-logs"
          >
            <Database className="w-4 h-4" />
            <span>Operator Audit Logs ({accessibleAuditLogs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('emails');
            }}
            className={`px-3.5 py-2 rounded text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'emails'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                : 'bg-slate-950 text-slate-400 border border-white/5 hover:text-white'
            }`}
            id="tab-email-logs"
          >
            <Mail className="w-4 h-4" />
            <span>{isAdmin ? 'System Email Dispatches' : 'My Email Dispatches'} ({accessibleEmailLogs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 font-mono text-[11px] cursor-pointer transition-all"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync</span>
          </button>

          {activeTab === 'audit' && (
            <button
              onClick={exportToPDF}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-transparent text-slate-950 font-bold font-mono text-[11px] cursor-pointer active:scale-95 transition-all shadow-[0_0_12px_rgba(34,211,238,0.15)] disabled:shadow-none"
              id="btn-export-audit-pdf"
              title="Download formatted PDF document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF ({filteredLogs.length})</span>
            </button>
          )}

          {activeTab === 'emails' && (
            <button
              onClick={() => {
                setTestRecipient(currentUser?.email || '');
                setTestRole(isAdmin ? 'admin' : 'analyst');
                setShowTestModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-[11px] cursor-pointer active:scale-95 transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              id="btn-test-email-dispatch"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Email</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and search controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 bg-slate-950 border border-white/10 rounded flex items-center px-2 focus-within:border-cyan-500 transition-colors">
          <Search className="w-4 h-4 text-slate-500 mr-2" />
          <input
            type="text"
            placeholder={activeTab === 'audit' ? "Search by operator email, action, resource..." : "Search emails by recipient, sender, subject, role..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-0"
            id="audit-search-input"
          />
        </div>

        {activeTab === 'audit' && (
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
        )}
      </div>

      {/* AUDIT LOGS VIEW */}
      {activeTab === 'audit' && (
        <>
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto pr-1 hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950 text-[10px] text-slate-500 uppercase sticky top-0 z-10">
                <tr className="border-b border-white/5">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Operator</th>
                  <th className="py-2 px-3">Clearance</th>
                  <th className="py-2 px-3">Sec Activity Action</th>
                  <th className="py-2 px-3">Resource Node</th>
                  <th className="py-2 px-3">Source IP</th>
                  <th className="py-2 px-3 text-right">Gateway Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-mono text-[11px]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      🛸 No audit trail records found for this query filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const logRole = log.userRole || 'analyst';
                    const isSelf = log.userEmail.toLowerCase() === currentEmail;
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.01]">
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{log.userEmail}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            logRole === 'admin' 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}>
                            {logRole}
                          </span>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 md:hidden max-h-[440px] overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <p className="text-center py-8 text-slate-500 font-mono text-xs">
                🛸 No audit trail records found for this query filter.
              </p>
            ) : (
              filteredLogs.map((log) => {
                const logRole = log.userRole || 'analyst';
                const isSelf = log.userEmail.toLowerCase() === currentEmail;
                return (
                  <div key={log.id} className="p-3 bg-slate-950 border border-white/5 rounded space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-semibold truncate max-w-[140px]">{log.userEmail}</p>
                          {isSelf && (
                            <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-bold">
                              YOU
                            </span>
                          )}
                        </div>
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
                      <p className="text-slate-500"><span className="text-slate-500">Role:</span> {logRole.toUpperCase()} • <span className="text-slate-500">IP:</span> {log.ipAddress}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* AUTOMATED EMAIL DISPATCH LOGS VIEW */}
      {activeTab === 'emails' && (
        <div className="space-y-4">
          <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Automated email triggers active upon <strong>Registration</strong> and <strong>Login</strong>.
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase">
              <span className="text-amber-400 font-bold">Admin → "Dear Admin,"</span>
              <span className="text-cyan-400 font-bold">Analyst → "Dear Analyst,"</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredEmailLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No email dispatches found for your account.</p>
                <p className="text-[10px] text-slate-600">
                  {isAdmin 
                    ? 'No automated email records logged in system yet.' 
                    : 'Analysts only see emails they have sent out or received. Send a test email to verify!'}
                </p>
              </div>
            ) : (
              filteredEmailLogs.map((email) => {
                const isExpanded = expandedEmailId === email.id;
                const isRegistration = email.type === 'registration';
                const isTargetAdmin = email.role?.toLowerCase() === 'admin';
                const isRecipientMe = (email.recipient || '').toLowerCase() === currentEmail;
                const isSenderMe = (email.senderEmail || '').toLowerCase() === currentEmail || email.senderUserId === currentUserId;

                return (
                  <div 
                    key={email.id} 
                    className="p-4 bg-slate-950 border border-white/10 rounded-lg hover:border-cyan-500/40 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Direction Badge */}
                        {isRecipientMe && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-1">
                            <Inbox className="w-3 h-3" />
                            <span>Received (Inbound)</span>
                          </span>
                        )}
                        {isSenderMe && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Sent By You (Outbound)</span>
                          </span>
                        )}

                        {/* Event type badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          isRegistration
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                            : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        }`}>
                          {isRegistration ? 'Registration Email' : 'Login Alert Email'}
                        </span>

                        {/* Target Role badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase flex items-center gap-1 ${
                          isTargetAdmin 
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                            : 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                        }`}>
                          <UserCheck className="w-3 h-3" />
                          <span>{isTargetAdmin ? 'Salutation: Dear Admin' : 'Salutation: Dear Analyst'}</span>
                        </span>

                        <span className="text-[10px] text-slate-500">
                          {new Date(email.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => setExpandedEmailId(isExpanded ? null : email.id)}
                        className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Message Body' : 'Inspect Message Body'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-500">Recipient: </span>
                        <strong className="text-white font-mono">{email.recipient}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Sender / Origin: </span>
                        <strong className="text-slate-300 font-mono">{email.senderEmail || 'system@coou.edu.ng'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Subject: </span>
                        <strong className="text-cyan-300 font-mono">{email.subject}</strong>
                      </div>
                    </div>

                    {/* Expandable Body Text */}
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-slate-900 rounded border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-white/5 pb-1">
                          <span className="font-bold uppercase text-slate-300">Verified Salutation Header:</span>
                          <span className={`font-bold font-mono px-1.5 py-0.5 rounded ${
                            isTargetAdmin ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                          }`}>
                            {isTargetAdmin ? 'Dear Admin,' : 'Dear Analyst,'}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded border border-white/5">
                          {email.bodyText}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TEST EMAIL DISPATCH MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-md w-full space-y-4 font-mono shadow-2xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Send Test Notification Email</span>
            </h3>
            
            <p className="text-[11px] text-slate-400">
              Trigger a live automated email dispatch with role-specific salutations (<strong>Dear Admin</strong> vs <strong>Dear Analyst</strong>).
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Recipient Email:</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. operator@coou.edu.ng"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Target Salutation Role:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestRole('admin')}
                    className={`py-2 px-3 rounded font-bold uppercase transition-all border cursor-pointer ${
                      testRole === 'admin'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    Admin ("Dear Admin,")
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestRole('analyst')}
                    className={`py-2 px-3 rounded font-bold uppercase transition-all border cursor-pointer ${
                      testRole === 'analyst'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    Analyst ("Dear Analyst,")
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Event Type:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestType('registration')}
                    className={`py-2 px-3 rounded font-bold uppercase transition-all border cursor-pointer ${
                      testType === 'registration'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    Registration
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestType('login')}
                    className={`py-2 px-3 rounded font-bold uppercase transition-all border cursor-pointer ${
                      testType === 'login'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-white/10 text-slate-400'
                    }`}
                  >
                    Login Alert
                  </button>
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded border border-white/5 text-[10px] text-slate-400 space-y-1">
                <p><span className="text-slate-500">Dispatch Sender:</span> <strong className="text-white">{currentUser?.email || 'Your account'}</strong></p>
                {!isAdmin && (
                  <p className="text-cyan-400">ℹ️ As an Analyst, this dispatch will be automatically logged to your authorized email outbox.</p>
                )}
              </div>

              {testSuccessMsg && (
                <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/30 rounded text-emerald-400 text-[11px] font-mono">
                  {testSuccessMsg}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest || !testRecipient}
                  className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
                >
                  {sendingTest ? 'Dispatching...' : 'Dispatch Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


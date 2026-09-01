/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, Search, ShieldCheck, Filter, FileText, Mail, Send, CheckCircle, 
  ChevronDown, ChevronUp, UserCheck, ShieldAlert, Lock, ArrowUpRight, Inbox, 
  RefreshCw, Check, Globe, Sparkles, PenTool, Eye, Cpu, Wand2, AlertTriangle, 
  Layers, Bot, Shield, UserPlus, KeyRound, Radio, Edit3
} from 'lucide-react';
import { AuditLog, EmailLog, User } from '../types.js';
import { jsPDF } from 'jspdf';
import { apiRequest } from '../api.js';
import { 
  getGoogleAccessToken, 
  getCachedGoogleUser, 
  signInWithGoogle, 
  subscribeToGoogleAuth 
} from '../services/googleAuth.js';
import { sendGmailMessage } from '../services/gmailApi.js';

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
  
  // Email Dispatch Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalTab, setModalTab] = useState<'compose' | 'ai' | 'preview'>('compose');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailRole, setEmailRole] = useState<'admin' | 'analyst'>('analyst');
  const [emailType, setEmailType] = useState<'registration' | 'login' | 'create' | 'incident'>('create');
  const [emailSubject, setEmailSubject] = useState('[EncDec IDS Operations] Security Intelligence Bulletin');
  const [emailBody, setEmailBody] = useState('This is a custom operational dispatch from the EncDec SOC Console.\n\nPlease review system activity and maintain operational vigilance.');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');
  const [emailSendError, setEmailSendError] = useState('');

  // AI Email Generator State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'urgent' | 'technical'>('professional');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState('');

  // Google Auth / Gmail Integration State
  const [googleUser, setGoogleUser] = useState<any>(getCachedGoogleUser());
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState('');
  const [deliverViaGmail, setDeliverViaGmail] = useState(true);
  const [configStatus, setConfigStatus] = useState<{ gmailAppConfigured: boolean; gmailAppUser: string | null; smtpConfigured: boolean } | null>(null);
  const [verifyingGmail, setVerifyingGmail] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

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

  // Subscribe to Google Auth for direct Gmail delivery
  useEffect(() => {
    const unsub = subscribeToGoogleAuth((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token);
    });
    return () => unsub();
  }, []);

  // Initial fetch on mount & tab switch
  useEffect(() => {
    fetchLogs();
    apiRequest('/api/email-logs/config-status', 'GET')
      .then((data) => setConfigStatus(data))
      .catch(() => {});
  }, [activeTab, currentUser]);

  const handleTestGmailConnection = async () => {
    setVerifyingGmail(true);
    setVerifyResult(null);
    try {
      const res = await apiRequest('/api/email-logs/verify-gmail', 'POST');
      if (res.ok) {
        setVerifyResult(`✅ ${res.message}`);
      } else {
        setVerifyResult(`⚠️ ${res.message}${res.hint ? ` (${res.hint})` : ''}`);
      }
    } catch (err: any) {
      setVerifyResult(`❌ Connection test failed: ${err?.message || err}`);
    } finally {
      setVerifyingGmail(false);
    }
  };

  // Update default subject and body template when switching email types
  const handleSelectEmailType = (type: 'registration' | 'login' | 'create' | 'incident') => {
    setEmailType(type);
    const targetRole = emailRole.toUpperCase();
    if (type === 'registration') {
      setEmailSubject('[EncDec IDS Security] New Operator Account Confirmation');
      setEmailBody(
        `Welcome to EncDec Intrusion Detection & Threat Intelligence Platform.\n\nYour account has been enrolled under clearance role: ${targetRole}.\nRegistration Timestamp: ${new Date().toLocaleString()}\n\nPlease enforce Multi-Factor Authentication (MFA) upon initial gateway login.\n\nRegards,\nEncDec Security Operations Team`
      );
    } else if (type === 'login') {
      setEmailSubject('[EncDec IDS Alert] Security Gateway Dispatch Notification');
      setEmailBody(
        `A security gateway notification has been dispatched for your operator identity.\n\nNotification Timestamp: ${new Date().toLocaleString()}\nAssigned Clearance: ${targetRole}\nStatus: ACTIVE\n\nRegards,\nEncDec Security Operations Team`
      );
    } else if (type === 'incident') {
      setEmailSubject('[EncDec IDS Alert] High Severity Incident Triage Notification');
      setEmailBody(
        `ATTENTION: A high-priority intrusion or anomaly was detected in the SOC monitor stream.\n\nEvent Timestamp: ${new Date().toLocaleString()}\nTarget Node: Cluster Alpha Gateway\n\nPlease log into the EncDec SOC console immediately to inspect network telemetry.\n\nRegards,\nEncDec Security Operations Team`
      );
    } else if (type === 'create') {
      if (!emailSubject || emailSubject.startsWith('[EncDec IDS')) {
        setEmailSubject('[EncDec IDS Operations] Security Intelligence Bulletin');
      }
      if (!emailBody) {
        setEmailBody(
          `This is a custom operational dispatch from the EncDec SOC Console.\n\nPlease review system activity and maintain operational vigilance.`
        );
      }
    }
  };

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

  const handleConnectGoogle = async () => {
    setIsSigningInGoogle(true);
    setGoogleAuthError('');
    try {
      const res = await signInWithGoogle();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        setGoogleAuthError('Popup blocked by browser/iframe. Please allow popups for this site, or open this app in a new tab.');
      } else if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('auth/unauthorized-domain')) {
        setGoogleAuthError(`Domain Notice: "${window.location.hostname}" is not yet whitelisted in Firebase Auth Authorized Domains. Direct server dispatch (Gmail App Password / SMTP) is currently active.`);
      } else {
        setGoogleAuthError(err?.message || 'Google authentication was cancelled.');
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  // AI Email Generator Handler
  const handleGenerateAiEmail = async (promptOverride?: string) => {
    const promptToUse = promptOverride || aiPrompt;
    if (!promptToUse.trim()) {
      setAiErrorMsg('Please describe what you want to email in the prompt box.');
      return;
    }

    setIsGeneratingAi(true);
    setAiErrorMsg('');
    try {
      const res = await apiRequest('/api/email-logs/generate-ai', 'POST', {
        prompt: promptToUse.trim(),
        recipient: emailRecipient.trim() || currentUser?.email || 'operator@coou.edu.ng',
        role: emailRole,
        type: emailType,
        tone: aiTone
      });

      if (res.subject) setEmailSubject(res.subject);
      if (res.body) setEmailBody(res.body);
      setEmailType('create'); // Switch to custom create draft so user can edit freely
      setModalTab('compose'); // Switch back to editor to review and customize
    } catch (err: any) {
      setAiErrorMsg(err?.message || 'Failed to generate AI email draft.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient.trim()) return;

    setSendingEmail(true);
    setEmailSuccessMsg('');
    setEmailSendError('');
    try {
      const res = await apiRequest('/api/email-logs/send', 'POST', {
        recipient: emailRecipient.trim(),
        role: emailRole,
        type: emailType,
        subject: emailSubject.trim() || undefined,
        bodyText: emailBody.trim() || undefined,
        body: emailBody.trim() || undefined,
        googleAccessToken: googleToken || undefined
      });

      let deliveredToGmail = false;
      // Direct Gmail API client-side fallback if server didn't already send via App Password/OAuth
      if (googleToken && deliverViaGmail && res.channel !== 'gmail_app_password' && res.channel !== 'gmail_oauth_api') {
        try {
          await sendGmailMessage({
            to: emailRecipient.trim(),
            subject: res.subject || emailSubject || '[EncDec IDS Security Alert] System Dispatch Notification',
            body: res.bodyHtml || res.bodyText || emailBody || 'EncDec IDS Security Notification',
            isHtml: true
          });
          deliveredToGmail = true;
        } catch (gmailErr: any) {
          console.warn('Gmail direct transmission note:', gmailErr);
        }
      }

      if (deliveredToGmail || res.channel === 'gmail_app_password' || res.channel === 'gmail_oauth_api') {
        setEmailSuccessMsg(res.deliveryDetails || `✅ Dispatched & delivered directly to ${emailRecipient.trim()}'s Gmail inbox!`);
      } else {
        setEmailSuccessMsg(`✅ ${res.message || 'System email dispatched successfully!'}`);
      }

      fetchLogs();
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSuccessMsg('');
        setEmailSendError('');
      }, 2500);
    } catch (err: any) {
      setEmailSendError(err?.message || 'Failed to dispatch email.');
    } finally {
      setSendingEmail(false);
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
                setEmailRecipient(currentUser?.email || '');
                setEmailRole(isAdmin ? 'admin' : 'analyst');
                setShowEmailModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-[11px] cursor-pointer active:scale-95 transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              id="btn-email-dispatch"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Email</span>
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
                    : 'Analysts only see emails they have sent out or received. Send an email to verify!'}
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

      {/* SYSTEM EMAIL DISPATCH MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-xl p-5 sm:p-6 max-w-2xl w-full space-y-4 font-mono shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    System Email Dispatcher
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Dispatch security notifications with role salutations & Gmail inbox delivery
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/5 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Direct Gmail Delivery Status Banner */}
            <div className="flex-shrink-0 space-y-2">
              {configStatus?.gmailAppConfigured ? (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Direct Gmail Dispatch: <strong className="text-emerald-200">Active ({configStatus.gmailAppUser})</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestGmailConnection}
                    disabled={verifyingGmail}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${verifyingGmail ? 'animate-spin' : ''}`} />
                    <span>{verifyingGmail ? 'Testing...' : 'Test Gmail Connection'}</span>
                  </button>
                </div>
              ) : googleToken ? (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Direct Gmail Inbox Delivery: <strong className="text-emerald-200">Connected ({googleUser?.email})</strong></span>
                  </div>
                  <span className="text-[9px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40 font-bold tracking-wider">
                    GMAIL API ACTIVE
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-950 border border-white/10 rounded-lg flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    <span>Direct Gmail dispatch active (via Gmail App Password or OAuth). Connect Google account for direct client session:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isSigningInGoogle}
                    className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[10px] font-bold cursor-pointer whitespace-nowrap transition-all flex items-center gap-1.5"
                  >
                    <Mail className="w-3 h-3" />
                    <span>{isSigningInGoogle ? 'Connecting...' : 'Connect Gmail'}</span>
                  </button>
                </div>
              )}

              {verifyResult && (
                <div className="p-2 bg-slate-950 border border-cyan-500/30 rounded text-[11px] text-cyan-300 flex items-center justify-between">
                  <span>{verifyResult}</span>
                  <button
                    type="button"
                    onClick={() => setVerifyResult(null)}
                    className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {googleAuthError && (
                <div className="p-2.5 bg-amber-950/50 border border-amber-500/30 rounded-lg text-amber-200 text-xs flex items-start justify-between gap-2 animate-fade-in">
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <span>⚠️ Google Sign-In Notice:</span>
                    </p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      {googleAuthError}
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 underline font-bold"
                      >
                        <span>Open app in new tab</span> ↗
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoogleAuthError('')}
                    className="text-amber-400 hover:text-white text-xs cursor-pointer p-0.5"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Modal Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-white/5 flex-shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setModalTab('compose')}
                className={`py-1.5 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalTab === 'compose'
                    ? 'bg-slate-800 text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>1. Compose & Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('ai')}
                className={`py-1.5 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  modalTab === 'ai'
                    ? 'bg-purple-900/50 text-purple-200 shadow-sm border border-purple-500/40'
                    : 'text-purple-300/80 hover:text-purple-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>2. AI Generator</span>
                <span className="text-[9px] px-1 py-0.2 bg-purple-500/30 text-purple-300 rounded border border-purple-500/40">AI</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`py-1.5 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalTab === 'preview'
                    ? 'bg-slate-800 text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Live Preview</span>
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
              
              {/* TAB 1: COMPOSE & MANUAL EDIT */}
              {modalTab === 'compose' && (
                <form id="email-dispatch-form" onSubmit={handleSendEmail} className="space-y-3.5">
                  {/* Recipient & Salutation Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                        Recipient Email Address: <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. user@gmail.com, chekchris85@gmail.com"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                        Target Salutation Header:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEmailRole('admin')}
                          className={`py-2 px-2.5 rounded-lg font-bold text-center transition-all border cursor-pointer ${
                            emailRole === 'admin'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                          }`}
                        >
                          "Dear Admin,"
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailRole('analyst')}
                          className={`py-2 px-2.5 rounded-lg font-bold text-center transition-all border cursor-pointer ${
                            emailRole === 'analyst'
                              ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                              : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                          }`}
                        >
                          "Dear Analyst,"
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Email Kinds / Types: Registration, Login, Create, Incident */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-bold">
                        Email Type / Template Category:
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {emailType === 'create' ? '✨ Custom Body with standard EncDec header' : 'Pre-built template'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectEmailType('registration')}
                        className={`p-2 rounded-lg font-bold text-[11px] uppercase transition-all border cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          emailType === 'registration'
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Registration</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectEmailType('login')}
                        className={`p-2 rounded-lg font-bold text-[11px] uppercase transition-all border cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          emailType === 'login'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Login</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectEmailType('create')}
                        className={`p-2 rounded-lg font-bold text-[11px] uppercase transition-all border cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
                          emailType === 'create'
                            ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200 shadow-sm ring-1 ring-indigo-400/50'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Create</span>
                        <span className="text-[8px] tracking-tight text-indigo-300/80 font-normal">Custom Body</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectEmailType('incident')}
                        className={`p-2 rounded-lg font-bold text-[11px] uppercase transition-all border cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          emailType === 'incident'
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                            : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>Incident</span>
                      </button>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                      Email Subject Line:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. [EncDec IDS Operations] Security Intelligence Bulletin"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                    />
                  </div>

                  {/* Body Text Area */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                        <span>Email Message Body:</span>
                        {emailType === 'create' && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                            MANUAL DRAFT
                          </span>
                        )}
                      </label>

                      <button
                        type="button"
                        onClick={() => setModalTab('ai')}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Draft with AI</span>
                      </button>
                    </div>

                    <textarea
                      rows={5}
                      required
                      placeholder="Write your email body here... The official EncDec header, Dear Admin/Analyst salutation, and university security footer will be automatically attached."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs leading-relaxed"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Standard EncDec header & footer are automatically attached around your body.</span>
                      <span>{emailBody.length} characters</span>
                    </div>
                  </div>

                  {/* Sender Context Banner */}
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500">Sender Identity:</span>{' '}
                      <strong className="text-white">{currentUser?.email || 'operator@coou.edu.ng'}</strong>{' '}
                      <span className="text-[10px] text-emerald-400">({(currentUser?.role || 'operator').toUpperCase()})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalTab('preview')}
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview Email</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: AI EMAIL GENERATOR */}
              {modalTab === 'ai' && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-purple-300 font-bold">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Gemini AI SOC Email Drafter</span>
                    </div>
                    <p className="text-[11px] text-purple-300/80 leading-relaxed">
                      Describe what you want to communicate to the recipient (e.g. incident alerts, password resets, containment instructions). Gemini will craft a structured SOC email subject and body for you.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">
                      Tell AI what to email the person:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Tell the analyst that host Node-B generated suspicious SMB outbound traffic on port 445 and instruct them to isolate the host and rotate administrator keys."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-500/30 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs leading-relaxed"
                    />
                  </div>

                  {/* AI Tone selector */}
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">
                      Tone & Urgency:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAiTone('professional')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-[10px] uppercase transition-all border cursor-pointer ${
                          aiTone === 'professional'
                            ? 'bg-purple-500/30 border-purple-500 text-purple-200'
                            : 'bg-slate-950 border-white/10 text-slate-400'
                        }`}
                      >
                        Professional
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiTone('urgent')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-[10px] uppercase transition-all border cursor-pointer ${
                          aiTone === 'urgent'
                            ? 'bg-rose-500/30 border-rose-500 text-rose-200'
                            : 'bg-slate-950 border-white/10 text-slate-400'
                        }`}
                      >
                        Urgent SOC
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiTone('technical')}
                        className={`py-1.5 px-2 rounded-lg font-bold text-[10px] uppercase transition-all border cursor-pointer ${
                          aiTone === 'technical'
                            ? 'bg-cyan-500/30 border-cyan-500 text-cyan-200'
                            : 'bg-slate-950 border-white/10 text-slate-400'
                        }`}
                      >
                        Technical
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Prompts */}
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5">
                      Or Choose a Quick Template Prompt:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAiPrompt('Alert operator of suspicious port 445 SMB scan and instruct host perimeter isolation');
                          handleGenerateAiEmail('Alert operator of suspicious port 445 SMB scan and instruct host perimeter isolation');
                        }}
                        className="text-left p-2 bg-slate-950 hover:bg-purple-950/30 border border-white/10 hover:border-purple-500/40 rounded-lg text-[10px] text-slate-300 transition-all cursor-pointer"
                      >
                        🚨 <strong>Threat Containment:</strong> Isolate node with SMB scan
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiPrompt('Send directive for mandatory TOTP/Hardware MFA token rotation within 24 hours');
                          handleGenerateAiEmail('Send directive for mandatory TOTP/Hardware MFA token rotation within 24 hours');
                        }}
                        className="text-left p-2 bg-slate-950 hover:bg-purple-950/30 border border-white/10 hover:border-purple-500/40 rounded-lg text-[10px] text-slate-300 transition-all cursor-pointer"
                      >
                        🔐 <strong>Security Policy:</strong> Enforce MFA token rotation
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiPrompt('Welcome new SOC operator with analyst clearance, providing orientation instructions and login requirements');
                          handleGenerateAiEmail('Welcome new SOC operator with analyst clearance, providing orientation instructions and login requirements');
                        }}
                        className="text-left p-2 bg-slate-950 hover:bg-purple-950/30 border border-white/10 hover:border-purple-500/40 rounded-lg text-[10px] text-slate-300 transition-all cursor-pointer"
                      >
                        👋 <strong>Onboarding:</strong> New Analyst Clearance Welcome
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiPrompt('Notify SOC team that dual-database MSSQL and Firestore replication synchronization has passed audit check');
                          handleGenerateAiEmail('Notify SOC team that dual-database MSSQL and Firestore replication synchronization has passed audit check');
                        }}
                        className="text-left p-2 bg-slate-950 hover:bg-purple-950/30 border border-white/10 hover:border-purple-500/40 rounded-lg text-[10px] text-slate-300 transition-all cursor-pointer"
                      >
                        📊 <strong>Audit Notice:</strong> Dual-DB Synchronization Passed
                      </button>
                    </div>
                  </div>

                  {aiErrorMsg && (
                    <div className="p-2.5 bg-rose-950/50 border border-rose-500/30 rounded-lg text-rose-300 text-[11px]">
                      {aiErrorMsg}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isGeneratingAi || !aiPrompt.trim()}
                      onClick={() => handleGenerateAiEmail()}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-900/30"
                    >
                      <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingAi ? 'Generating Draft with AI...' : 'Generate Email Body with AI'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE FORMATTED PREVIEW */}
              {modalTab === 'preview' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>This is the exact email rendering the recipient will receive:</span>
                    <button
                      type="button"
                      onClick={() => setModalTab('compose')}
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Content</span>
                    </button>
                  </div>

                  {/* Rendered Email Card (Exact HTML match) */}
                  <div className="bg-[#0f172a] text-[#e2e8f0] p-5 rounded-lg border border-[#1e293b] font-sans space-y-4 shadow-inner">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                      <div>
                        <h4 className="text-cyan-400 font-bold text-base m-0">EncDec IDS Security Operations</h4>
                        <p className="text-[11px] text-slate-400 m-0">Automated Cyber Threat & Intelligence Gateway</p>
                      </div>
                      <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono uppercase font-bold">
                        {emailType.toUpperCase()}
                      </span>
                    </div>

                    {/* Salutation */}
                    <p className="text-sm font-bold text-sky-400 m-0">
                      {emailRole === 'admin' ? 'Dear Admin,' : 'Dear Analyst,'}
                    </p>

                    {/* Subject in preview */}
                    <div className="bg-slate-900/70 p-2 rounded border border-white/5 text-xs text-white font-semibold">
                      <span className="text-slate-400 font-normal">Subject:</span> {emailSubject || '[EncDec IDS Security] Operational Dispatch'}
                    </div>

                    {/* Body */}
                    <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap py-1">
                      {emailBody || 'No custom body entered yet.'}
                    </div>

                    {/* Metadata Box */}
                    <div className="bg-[#1e293b] p-3 rounded border-l-4 border-cyan-500 space-y-1 text-xs font-mono">
                      <p className="m-0 text-slate-300"><strong>Recipient:</strong> {emailRecipient || 'recipient@example.com'}</p>
                      <p className="m-0 text-slate-300"><strong>Assigned Role:</strong> <span className="text-sky-400">{emailRole.toUpperCase()}</span></p>
                      <p className="m-0 text-slate-300"><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
                      <p className="m-0 text-slate-300"><strong>Origin Node:</strong> 127.0.0.1</p>
                      <p className="m-0 text-slate-300"><strong>Sender Clearance:</strong> <span className="text-emerald-400">{(currentUser?.role || 'OPERATOR').toUpperCase()}</span></p>
                    </div>

                    {/* Footer */}
                    <hr className="border-t border-slate-700 m-0" />
                    <p className="text-[10px] text-slate-500 m-0 text-center">
                      Chukwuemeka Odumegwu Ojukwu University • EncDec Cybersecurity Platform
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Success Message Banner */}
            {emailSuccessMsg && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-mono flex items-center gap-2 flex-shrink-0 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{emailSuccessMsg}</span>
              </div>
            )}

            {/* Error Message Banner */}
            {emailSendError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-300 text-xs font-mono flex items-center justify-between gap-2 flex-shrink-0 animate-fade-in">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{emailSendError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailSendError('')}
                  className="text-rose-400 hover:text-white text-xs cursor-pointer p-0.5"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 flex-shrink-0">
              <div className="text-[11px] text-slate-400">
                {modalTab !== 'compose' && (
                  <button
                    type="button"
                    onClick={() => setModalTab('compose')}
                    className="text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    ← Back to Editor
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer font-bold"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  disabled={sendingEmail || !emailRecipient.trim()}
                  onClick={(e) => handleSendEmail(e)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md shadow-emerald-900/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingEmail ? 'Dispatching...' : 'Send Email'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


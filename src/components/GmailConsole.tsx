/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Mail, Inbox, Send, Trash2, RefreshCw, Search, ShieldAlert, 
  CheckCircle, AlertTriangle, User, ExternalLink, Plus, 
  ArrowLeft, Eye, Star, Archive, Shield, Filter, Copy, Check, Info, Lock
} from 'lucide-react';
import { 
  signInWithGoogle, 
  googleSignOut, 
  subscribeToGoogleAuth, 
  getGoogleAccessToken,
  GMAIL_SCOPES
} from '../services/googleAuth.js';
import { 
  listGmailMessages, 
  getGmailMessageDetail, 
  sendGmailMessage, 
  trashGmailMessage, 
  modifyGmailMessage, 
  getGmailProfile,
  GmailMessageSummary, 
  GmailMessageDetail,
  GmailProfile 
} from '../services/gmailApi.js';
import { apiRequest } from '../api.js';

interface GmailConsoleProps {
  currentUser?: any;
  initialIncidentAlert?: any;
  onDispatchAlertToSoc?: (msg: string) => void;
}

export default function GmailConsole({ 
  currentUser, 
  initialIncidentAlert,
  onDispatchAlertToSoc 
}: GmailConsoleProps) {
  // Auth State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Mail Data State
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [currentFolder, setCurrentFolder] = useState<'INBOX' | 'SENT' | 'TRASH' | 'SECURITY'>('INBOX');
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  // Selected Message State
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messageDetail, setMessageDetail] = useState<GmailMessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Compose / Security Dispatch Modal
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [composeStatus, setComposeStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Destructive Action Confirmation Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    variant: 'danger',
    action: async () => {}
  });

  const [copiedId, setCopiedId] = useState(false);

  // Subscribe to Google Auth changes
  useEffect(() => {
    const unsubscribe = subscribeToGoogleAuth((user, token) => {
      setGoogleUser(user);
      setAccessToken(token);
    });
    return () => unsubscribe();
  }, []);

  // Fetch profile and messages when authenticated
  useEffect(() => {
    if (accessToken) {
      loadProfileAndMail();
    }
  }, [accessToken, currentFolder, activeQuery]);

  // Load alert template if passed into console
  useEffect(() => {
    if (initialIncidentAlert) {
      openIncidentTemplate(initialIncidentAlert);
    }
  }, [initialIncidentAlert]);

  const loadProfileAndMail = async () => {
    setLoadingMessages(true);
    setAuthError(null);
    try {
      // Profile
      getGmailProfile().then(setProfile).catch(() => {});

      // Messages
      let labelFilter: string[] = [];
      let customQuery = activeQuery;

      if (currentFolder === 'INBOX') {
        labelFilter = ['INBOX'];
      } else if (currentFolder === 'SENT') {
        labelFilter = ['SENT'];
      } else if (currentFolder === 'TRASH') {
        labelFilter = ['TRASH'];
      } else if (currentFolder === 'SECURITY') {
        customQuery = customQuery ? `${customQuery} (EncDec OR IDS OR Alert OR Threat OR Security)` : 'EncDec OR IDS OR Alert OR Threat OR Security';
      }

      const res = await listGmailMessages(customQuery, labelFilter, 25);
      setMessages(res.messages);
    } catch (err: any) {
      console.error('Failed to load Gmail data:', err);
      setAuthError(err.message || 'Failed to fetch Gmail data.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Disconnect Google Workspace Session',
      description: 'Are you sure you want to disconnect your Google Workspace account? You will need to sign in again to access Gmail dispatch features.',
      confirmText: 'Disconnect',
      variant: 'warning',
      action: async () => {
        await googleSignOut();
        setProfile(null);
        setMessages([]);
        setMessageDetail(null);
        setSelectedMessageId(null);
      }
    });
  };

  const handleSelectMessage = async (msgId: string) => {
    setSelectedMessageId(msgId);
    setLoadingDetail(true);
    try {
      const detail = await getGmailMessageDetail(msgId);
      setMessageDetail(detail);

      // If unread, mark as read
      if (detail.isUnread) {
        modifyGmailMessage(msgId, [], ['UNREAD']).catch(() => {});
        setMessages((prev) => 
          prev.map((m) => m.id === msgId ? { ...m, isUnread: false } : m)
        );
      }
    } catch (err: any) {
      console.error('Failed to fetch message detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveQuery('');
  };

  // Explicit confirmation for moving message to trash (MANDATORY per SKILL.md)
  const handleTrashMessage = (msgId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Move Email to Trash',
      description: 'Are you sure you want to move this email message to the Gmail Trash folder? You can restore it from the Trash if needed.',
      confirmText: 'Move to Trash',
      variant: 'danger',
      action: async () => {
        try {
          await trashGmailMessage(msgId);
          setMessages((prev) => prev.filter((m) => m.id !== msgId));
          if (selectedMessageId === msgId) {
            setSelectedMessageId(null);
            setMessageDetail(null);
          }
        } catch (err: any) {
          alert(`Failed to move message to trash: ${err.message}`);
        }
      }
    });
  };

  // Dispatch Email Send with Confirmation (MANDATORY per SKILL.md)
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setComposeStatus({ type: 'error', text: 'Recipient, Subject, and Body are all required.' });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Authorize Sending Email',
      description: `You are about to dispatch an email from your authorized Gmail account (${googleUser?.email || profile?.emailAddress}) to "${composeTo}" with subject "${composeSubject}". Do you want to proceed?`,
      confirmText: 'Send Email',
      variant: 'primary',
      action: async () => {
        setSending(true);
        setComposeStatus(null);
        try {
          await sendGmailMessage({
            to: composeTo.trim(),
            subject: composeSubject.trim(),
            body: composeBody.trim()
          });

          // Log action to SOC audit logs
          try {
            await apiRequest('/api/audit-log', 'POST', {
              action: 'GMAIL_DISPATCH_SENT',
              resource: `Gmail Message: ${composeSubject.trim()}`,
              details: `Sent to ${composeTo.trim()}`
            });
          } catch (e) {}

          setComposeStatus({ type: 'success', text: 'Email successfully transmitted via Gmail API!' });
          setTimeout(() => {
            setShowComposeModal(false);
            setComposeTo('');
            setComposeSubject('');
            setComposeBody('');
            setComposeStatus(null);
            if (currentFolder === 'SENT') {
              loadProfileAndMail();
            }
          }, 1500);
        } catch (err: any) {
          setComposeStatus({ type: 'error', text: `Failed to transmit email: ${err.message}` });
        } finally {
          setSending(false);
        }
      }
    });
  };

  // Pre-fill Incident Alert Template
  const openIncidentTemplate = (alertData?: any) => {
    const alertTitle = alertData?.title || 'Critical Intrusion Detection Alert';
    const alertCategory = alertData?.category || 'Host Intrusion / Brute Force';
    const alertSource = alertData?.source || '104.24.12.83 (portal.coou.edu.ng)';
    const alertSeverity = (alertData?.severity || 'critical').toUpperCase();
    const mitre = alertData?.mitreMapping || 'T1110.001 (Credential Stuffing)';
    const timestamp = new Date().toUTCString();

    setComposeSubject(`[ENCDEC-IDS ALERT] [${alertSeverity}] ${alertTitle}`);
    setComposeBody(
`SEC-OPS SECURITY DISPATCH NOTICE
--------------------------------------------------
CLASSIFICATION: CONFIDENTIAL / INTERNAL SOC USE
ORIGIN: EncDec Hybrid IDS Security Engine
TIMESTAMP: ${timestamp}

INCIDENT SUMMARY:
• Severity: ${alertSeverity}
• Threat Category: ${alertCategory}
• Targeted Node / Origin: ${alertSource}
• MITRE ATT&CK: ${mitre}

TECHNICAL DESCRIPTION:
${alertData?.description || 'Automated behavioral anomaly detected exceeding the defined baseline rate. Multiple unauthorized authentication attempts observed within 60-second window.'}

RECOMMENDED SOC MITIGATION ACTIONS:
1. Isolate the affected node or block origin IP via Network IDS rules.
2. Review process memory hashes and verify endpoint service states.
3. Notify the designated incident response team and systems administrator.

Automated telemetry generated by EncDec IDS (Vigilant Command Console).
`
    );
    setComposeTo(currentUser?.email || 'security-team@enterprise.sec');
    setShowComposeModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn" id="gmail-console-view">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-white/5 p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 via-amber-500/10 to-cyan-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Gmail Security Dispatch & Inbox</h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold uppercase">
                Google Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Read security notifications, manage alert communications, and dispatch official SOC incident reports via connected Gmail.
            </p>
          </div>
        </div>

        {/* Auth controls */}
        <div className="flex items-center gap-2 shrink-0">
          {accessToken && googleUser ? (
            <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-white/10">
              <div className="flex items-center gap-2">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt="Google Avatar" className="w-7 h-7 rounded-full border border-cyan-400/40" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xs font-bold font-mono">
                    G
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-white font-mono leading-none">{googleUser.displayName || 'Google User'}</div>
                  <div className="text-[10px] text-slate-400 font-mono leading-tight">{googleUser.email}</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[10px] border border-white/5 transition-colors cursor-pointer"
                title="Disconnect Google Account"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={authLoading}
              className="gsi-material-button inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-sans font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              id="btn-google-signin"
            >
              <div className="w-4 h-4 shrink-0">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <span>{authLoading ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}

          {accessToken && (
            <button
              onClick={() => {
                setComposeTo('');
                setComposeSubject('');
                setComposeBody('');
                setShowComposeModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-mono font-bold text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
              id="btn-compose-email"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Dispatch</span>
            </button>
          )}
        </div>
      </div>

      {authError && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <div>
            <div className="font-bold">Authentication Notice:</div>
            <div>{authError}</div>
          </div>
        </div>
      )}

      {/* Main Mailbox Interface or Connect State */}
      {!accessToken ? (
        <div className="bg-slate-900 border border-white/5 rounded-xl p-8 text-center max-w-2xl mx-auto space-y-6 my-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Connect Google Workspace Account</h3>
            <p className="text-xs text-slate-400 font-mono mt-2 leading-relaxed max-w-md mx-auto">
              Authenticate with Google to read enterprise security bulletins, monitor incoming threat reports, and dispatch official SOC notifications directly to team members with your verified email address.
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-lg border border-white/5 text-left text-xs font-mono space-y-2 max-w-md mx-auto text-slate-300">
            <div className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Requested Google Permissions:</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
              <li>Read incoming security messages & alerts</li>
              <li>Compose & send official SOC incident emails</li>
              <li>Organize messages with security labels & archive</li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSignIn}
              disabled={authLoading}
              className="gsi-material-button inline-flex items-center gap-3 px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-sans font-semibold text-sm rounded-lg shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <div className="w-5 h-5 shrink-0">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <span>{authLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Authenticated Gmail Console Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Folder Navigation */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-3 space-y-1 font-mono text-xs">
              <button
                onClick={() => { setCurrentFolder('INBOX'); setSelectedMessageId(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentFolder === 'INBOX' 
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                {profile?.messagesTotal !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 font-mono">
                    {profile.messagesTotal}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setCurrentFolder('SECURITY'); setSelectedMessageId(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentFolder === 'SECURITY' 
                    ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Security Alerts</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">
                  IDS
                </span>
              </button>

              <button
                onClick={() => { setCurrentFolder('SENT'); setSelectedMessageId(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentFolder === 'SENT' 
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4" />
                  <span>Sent Dispatches</span>
                </div>
              </button>

              <button
                onClick={() => { setCurrentFolder('TRASH'); setSelectedMessageId(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentFolder === 'TRASH' 
                    ? 'bg-slate-800 text-slate-200 font-bold border border-white/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4" />
                  <span>Trash</span>
                </div>
              </button>
            </div>

            {/* Incident Dispatch Templates Quick Action */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-4 space-y-3 font-mono">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>Quick Dispatch Templates</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Instantly populate RFC-compliant incident alerts and email them to the security operations center:
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => openIncidentTemplate({
                    title: 'CRITICAL: Multi-vector Port Scan & DDoS Anomaly',
                    severity: 'critical',
                    category: 'DDoS & Volumetric Attack',
                    source: '198.51.100.44 (External Attacker)',
                    mitreMapping: 'T1498 (Network Denial of Service)'
                  })}
                  className="w-full text-left p-2 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-[11px] border border-white/5 transition-colors cursor-pointer"
                >
                  ⚡ <span className="font-bold">DDoS / Port Scan Escalation</span>
                </button>

                <button
                  onClick={() => openIncidentTemplate({
                    title: 'Brute Force Alert on Student Portal Login',
                    severity: 'high',
                    category: 'Host Intrusion',
                    source: '104.24.12.83 (portal.coou.edu.ng)',
                    mitreMapping: 'T1110.001 (Credential Stuffing)'
                  })}
                  className="w-full text-left p-2 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-[11px] border border-white/5 transition-colors cursor-pointer"
                >
                  🛡️ <span className="font-bold">Portal Credential Attack</span>
                </button>

                <button
                  onClick={() => openIncidentTemplate({
                    title: 'Malicious Ransomware/Trojan Hash Isolated',
                    severity: 'critical',
                    category: 'Malware / Hash Threat',
                    source: 'Workstation-FIN-09 (Windows Host)',
                    mitreMapping: 'T1204 (User Execution: Malicious File)'
                  })}
                  className="w-full text-left p-2 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-[11px] border border-white/5 transition-colors cursor-pointer"
                >
                  ☣️ <span className="font-bold">Malware Containment Notice</span>
                </button>
              </div>
            </div>

          </div>

          {/* Center / Right Content Panel */}
          <div className="lg:col-span-9 space-y-4">
            
            {/* Search & Actions Bar */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Gmail messages (e.g. from:sec, subject:alert, is:unread)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </form>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={loadProfileAndMail}
                  disabled={loadingMessages}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono border border-white/5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh Gmail Feed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Sync</span>
                </button>
              </div>
            </div>

            {/* Main Message Split View / List */}
            {selectedMessageId && messageDetail ? (
              /* Message Detail Reader */
              <div className="bg-slate-900 border border-white/5 rounded-xl p-5 space-y-4 animate-fadeIn font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <button
                    onClick={() => { setSelectedMessageId(null); setMessageDetail(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Messages</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrashMessage(messageDetail.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors cursor-pointer"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Trash</span>
                    </button>
                    <button
                      onClick={() => {
                        setComposeTo(messageDetail.from);
                        setComposeSubject(`Re: ${messageDetail.subject}`);
                        setComposeBody(`\n\n--- In reply to message from ${messageDetail.from} ---\n${messageDetail.bodyText}`);
                        setShowComposeModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>

                {/* Email Metadata Header */}
                <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-white/5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-base font-bold text-white font-sans">{messageDetail.subject}</h3>
                    <span className="text-slate-500 text-[11px]">{messageDetail.date}</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">From:</span> <span className="text-cyan-300 font-semibold">{messageDetail.from}</span>
                  </div>
                  {messageDetail.to && (
                    <div className="text-slate-400 text-[11px]">
                      <span className="text-slate-500">To:</span> {messageDetail.to}
                    </div>
                  )}
                  {messageDetail.labelIds && messageDetail.labelIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {messageDetail.labelIds.map((lbl) => (
                        <span key={lbl} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-white/5">
                          {lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Email Body */}
                <div className="p-4 bg-slate-950/60 rounded-lg border border-white/5 text-slate-200 text-xs leading-relaxed font-sans whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {messageDetail.bodyText}
                </div>

              </div>
            ) : (
              /* Message List Table */
              <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden font-mono">
                {loadingMessages ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                    <p className="text-xs">Fetching messages from Gmail...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-3">
                    <Inbox className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs">No messages found matching this folder or filter.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg.id)}
                        className={`p-3.5 hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                          msg.isUnread ? 'bg-cyan-500/5 font-semibold text-white' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="mt-1 shrink-0">
                            {msg.isUnread ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" title="Unread" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-cyan-300 truncate max-w-[200px]">
                                {msg.from.replace(/<.*>/, '').trim() || msg.from}
                              </span>
                              {msg.subject.toLowerCase().includes('alert') || msg.subject.toLowerCase().includes('threat') ? (
                                <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 text-[9px] uppercase border border-red-500/30">
                                  Alert
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-white truncate font-sans mt-0.5">
                              {msg.subject}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate font-sans mt-0.5">
                              {msg.snippet}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 shrink-0 text-right">
                          <div>{msg.date.split(',')[0]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}

      {/* Compose / Security Dispatch Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="compose-modal">
          <div className="bg-slate-900 border border-white/10 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>Dispatch Gmail Message</span>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleInitiateSend} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">To Recipient(s):</label>
                <input
                  type="email"
                  required
                  placeholder="analyst@enterprise.sec, soc-alerts@company.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Subject:</label>
                <input
                  type="text"
                  required
                  placeholder="[ENCDEC-IDS ALERT] Incident Title"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] text-slate-400">Message Body / Incident Content:</label>
                  <span className="text-[10px] text-slate-500">RFC 2822 UTF-8</span>
                </div>
                <textarea
                  required
                  rows={9}
                  placeholder="Type your security notification or incident details..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed resize-none"
                />
              </div>

              {composeStatus && (
                <div className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                  composeStatus.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}>
                  {composeStatus.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{composeStatus.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer disabled:opacity-50"
                  id="btn-confirm-send-email"
                >
                  {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{sending ? 'Sending...' : 'Authorize & Send Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explicit User Confirmation Modal (MANDATORY per Workspace Integration Skill) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn" id="workspace-confirm-modal">
          <div className="bg-slate-900 border border-white/10 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-left">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                confirmDialog.variant === 'danger' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : confirmDialog.variant === 'warning'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">{confirmDialog.title}</h4>
                <span className="text-[10px] text-slate-400 uppercase">Google Workspace Action Confirmation</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-white/5">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  await confirmDialog.action();
                }}
                className={`px-4 py-2 rounded-lg font-bold text-xs font-mono transition-all cursor-pointer ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                }`}
                id="btn-confirm-dialog-action"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

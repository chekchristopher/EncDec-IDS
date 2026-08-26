/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, ShieldAlert, Wifi, WifiOff, Bell, 
  HelpCircle, Command, Settings as SettingsIcon, AlertOctagon, Menu 
} from 'lucide-react';

// API and utilities
import { apiRequest, WS_BASE, getAuthToken, setAuthToken } from './api.js';

// Types
import { 
  User, Host, Packet, Rule, Alert, Threat, APIKey, 
  AuditLog, LiveActivity, ThreatIntelFeed, MLModel, QuarantineItem, EmailLog 
} from './types.js';

// Components
import LandingPage from './components/LandingPage.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import Overview from './components/Overview.jsx';
import NetworkIDS from './components/NetworkIDS.jsx';
import HostIDS from './components/HostIDS.jsx';
import ThreatIntel from './components/ThreatIntel.jsx';
import ReportsGenerator from './components/ReportsGenerator.jsx';
import AuditConsole from './components/AuditConsole.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import AdminPortal from './components/AdminPortal.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import DualDatabaseConsole from './components/DualDatabaseConsole.jsx';
import GmailConsole from './components/GmailConsole.jsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [savedProfile, setSavedProfile] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [wsConnected, setWsConnected] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedIncidentForEmail, setSelectedIncidentForEmail] = useState<Alert | null>(null);

  // Core Data States
  const [metrics, setMetrics] = useState({
    hostsOnline: 0,
    hostsTotal: 0,
    criticalAlerts: 0,
    highAlerts: 0,
    globalThreatScore: 12,
    totalPacketsSec: 0,
  });

  const [hosts, setHosts] = useState<Host[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelFeed[]>([]);
  const [mlModels, setMlModels] = useState<MLModel[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantineItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  
  // Realtime Live Stream Paclets
  const [livePackets, setLivePackets] = useState<Packet[]>([]);
  const [totalPacketsCount, setTotalPacketsCount] = useState(14201042);

  // Administrative Passkey Verification gate state
  const [adminPasskeyPassed, setAdminPasskeyPassed] = useState(false);

  // Notifications Queue
  const [liveNotification, setLiveNotification] = useState<string | null>(null);

  // Ref for WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);

  // Verify auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const profile = await apiRequest('/api/profile');
          setSavedProfile(profile);
        } catch (err) {
          console.warn('Session expired, clearing credentials.');
          setAuthToken(null);
        }
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  // Sync metrics on data update
  useEffect(() => {
    if (!currentUser) return;
    const updateMetrics = async () => {
      try {
        const met = await apiRequest('/api/metrics');
        setMetrics(met);
      } catch (err) {
        console.warn('Failed to update live metrics', err);
      }
    };
    updateMetrics();
  }, [hosts, alerts, threats, currentUser]);

  // Handle WebSocket Connection
  useEffect(() => {
    if (!currentUser) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      return;
    }

    const dedup = <T extends { id: any }>(arr: T[]): T[] => {
      const seen = new Set();
      return arr.filter(item => {
        if (!item || !item.id) return true;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };

    const connectWebSocket = () => {
      const ws = new WebSocket(WS_BASE);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'INIT':
            setHosts(dedup(msg.payload.hosts));
            setAlerts(dedup(msg.payload.alerts));
            setThreats(dedup(msg.payload.threats));
            setRules(dedup(msg.payload.rules));
            setThreatIntel(dedup(msg.payload.threatIntel));
            setMlModels(dedup(msg.payload.mlModels));
            setQuarantine(dedup(msg.payload.quarantine));
            setAuditLogs(dedup(msg.payload.auditLogs));
            if (msg.payload.emailLogs) {
              setEmailLogs(dedup(msg.payload.emailLogs));
            }
            break;

          case 'LIVE_PACKET':
            setLivePackets(prev => dedup([msg.payload.packet, ...prev.slice(0, 49)]));
            setTotalPacketsCount(msg.payload.totalPackets);
            break;

          case 'HOSTS_UPDATE':
            setHosts(dedup(msg.payload));
            break;

          case 'ALERTS_UPDATE':
            setAlerts(dedup(msg.payload));
            break;

          case 'RULES_UPDATE':
            setRules(dedup(msg.payload));
            break;

          case 'THREATS_UPDATE':
            setThreats(dedup(msg.payload));
            break;

          case 'QUARANTINE_UPDATE':
            setQuarantine(dedup(msg.payload));
            break;

          case 'AUDIT_LOG':
            setAuditLogs(prev => dedup([msg.payload, ...prev.slice(0, 99)]));
            break;

          case 'EMAIL_DISPATCHED':
            setEmailLogs(prev => dedup([msg.payload, ...prev.slice(0, 99)]));
            if (
              currentUser?.role === 'admin' || 
              (msg.payload.recipient && msg.payload.recipient.toLowerCase() === currentUser?.email?.toLowerCase()) ||
              (msg.payload.senderEmail && msg.payload.senderEmail.toLowerCase() === currentUser?.email?.toLowerCase())
            ) {
              triggerUIWarning(`Automated Email Dispatched to ${msg.payload.recipient} (${msg.payload.role.toUpperCase()})`);
            }
            break;

          case 'ALERT_TRIGGERED':
            setAlerts(prev => dedup([msg.payload, ...prev]));
            triggerUIWarning(`Security Alert Triggered: ${msg.payload.title}`);
            break;

          default:
            break;
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // attempt auto reconnect after 3 seconds
        setTimeout(() => {
          if (getAuthToken()) {
            connectWebSocket();
          }
        }, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentUser]);

  // Utility to dispatch notification popups
  const triggerUIWarning = (msg: string) => {
    setLiveNotification(msg);
    setTimeout(() => {
      setLiveNotification(null);
    }, 4500);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setSavedProfile(null);
    setCurrentUser(null);
    setAdminPasskeyPassed(false);
    setActiveView('dashboard');
  };

  // REST state actions
  const handleEscalateAlert = async (id: string) => {
    try {
      await apiRequest(`/api/alerts/${id}/escalate`, 'POST');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleIgnoreAlert = async (id: string) => {
    try {
      await apiRequest(`/api/alerts/${id}/ignore`, 'POST');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await apiRequest(`/api/alerts/${id}/resolve`, 'POST');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleCreateRule = async (rulePayload: Partial<Rule>) => {
    try {
      await apiRequest('/api/rules', 'POST', rulePayload);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleToggleRule = async (id: string) => {
    try {
      await apiRequest(`/api/rules/${id}/toggle`, 'POST');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await apiRequest(`/api/rules/${id}`, 'DELETE');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleRegisterHost = async (hostPayload: Partial<Host>) => {
    try {
      await apiRequest('/api/hosts/register', 'POST', hostPayload);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDeregisterHost = async (id: string) => {
    try {
      await apiRequest(`/api/hosts/${id}`, 'DELETE');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleQuarantine = async (payload: { hostId: string; type: 'file' | 'process' | 'ip'; targetValue: string; reason: string }) => {
    try {
      await apiRequest('/api/quarantine', 'POST', payload);
      triggerUIWarning(`Quarantine enforced on node ${payload.hostId} targeting ${payload.targetValue}`);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleTrainModel = async (id: string) => {
    // Retrain classifier simulation trigger. Backend handles logging
    try {
      // Simulate quick ML trigger
      setMlModels(prev => prev.map(m => m.id === id ? { ...m, status: 'training' } : m));
      await apiRequest(`/api/quarantine`, 'POST', {
        hostId: 'ml_engine',
        type: 'process',
        targetValue: id,
        reason: 'Recalculating weights and centroids for Isolation Forest'
      });
      setTimeout(() => {
        setMlModels(prev => prev.map(m => m.id === id ? { ...m, status: 'active', accuracy: +(m.accuracy + 0.1).toFixed(1) } : m));
      }, 3000);
    } catch (err) {
      console.warn(err);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-xs text-slate-500">
        <div className="w-8 h-8 rounded border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mb-4" />
        <span>BOOTING VIGIL CONSOLE KERNEL...</span>
      </div>
    );
  }

  if (!currentUser) {
    if (showLogin) {
      return (
        <div className="relative">
          {/* Back to Home Button on top of the Login Screen */}
          <div className="absolute top-6 left-6 z-50">
            <button
              onClick={() => setShowLogin(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white font-mono text-xs cursor-pointer transition-all hover:bg-slate-800"
              id="back-to-home-btn"
            >
              ← Back to Homepage
            </button>
          </div>
          <LoginScreen onLoginSuccess={(usr) => {
            setSavedProfile(usr);
            setCurrentUser(usr);
            setShowLogin(false);
          }} />
        </div>
      );
    }
    return (
      <LandingPage 
        onEnterConsole={() => {
          if (savedProfile) {
            setCurrentUser(savedProfile);
          } else {
            setShowLogin(true);
          }
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-950 text-slate-300 flex overflow-x-hidden" id="main-scaffold">
      
      {/* Sidebar navigation */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={(v) => {
          // If moving away from admin, let's lock passcode if they didn't finish
          setActiveView(v);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        adminPasskeyPassed={adminPasskeyPassed}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* Primary content hub */}
      <main className="flex-1 min-h-screen w-full max-w-full lg:pl-64 pl-0 flex flex-col relative overflow-x-hidden">
        
        {/* Real-time Toast warnings floating banner */}
        {liveNotification && (
          <div className="fixed top-6 right-6 z-50 p-4 bg-red-500 text-white rounded border border-red-600 shadow-xl flex items-center gap-3 animate-slideIn max-w-sm font-mono text-xs" id="threat-alert-toast">
            <AlertOctagon className="w-5 h-5 animate-bounce shrink-0" />
            <div>
              <p className="font-bold">INTRUSION WARNING DETECTED</p>
              <p className="opacity-90">{liveNotification}</p>
            </div>
          </div>
        )}

        {/* Global command Header */}
        <header className="h-16 border-b border-white/5 px-4 lg:px-8 flex justify-between items-center bg-slate-900/40 backdrop-blur-md sticky top-0 z-30">
          
          <div className="flex items-center gap-3">
            {/* Hamburger menu button for mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 rounded bg-slate-950 text-slate-400 hover:text-white border border-white/5 lg:hidden mr-1"
              id="open-sidebar-btn"
            >
              <Menu className="w-4 h-4" />
            </button>

            <span className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-white/5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 animate-pulse'}`} />
              {wsConnected ? 'Gateway Link Online' : 'Gateway Link Disconnected'}
            </span>
            <span className="hidden sm:inline h-4 w-px bg-white/10" />
            <span className="font-mono text-xs text-slate-500 truncate max-w-[150px] xs:max-w-none">
              Scope: <strong className="text-slate-300">COOU Portal Infrastructure</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Status overview metrics in header */}
            <div className="flex gap-4 md:gap-6 text-[11px] font-mono">
              <span className="text-slate-500">
                Threat index: <strong className={metrics.globalThreatScore > 75 ? 'text-red-500' : 'text-emerald-400'}>{metrics.globalThreatScore}/100</strong>
              </span>
              <span className="text-slate-500 hidden xs:inline">
                Active alerts: <strong className="text-red-400">{alerts.filter(a => a.status === 'unhandled').length}</strong>
              </span>
            </div>

            {/* Clickable Header Profile Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 min-h-[40px] rounded-full bg-slate-950 border border-white/10 hover:border-cyan-500/40 hover:bg-slate-900 text-xs font-mono transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
              title="Click to view and edit profile"
              aria-label="Edit operator profile"
              id="header-profile-btn"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/30 overflow-hidden flex items-center justify-center text-[10px] font-bold text-cyan-400">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('') : 'OP'
                )}
              </div>
              <span className="text-slate-300 font-semibold group-hover:text-cyan-300 transition-colors hidden sm:inline">{currentUser?.name}</span>
            </button>
          </div>

        </header>

        {/* Dynamic Inner body renders */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full max-w-full mx-auto overflow-x-hidden">
          {activeView === 'dashboard' && (
            <Overview 
              metrics={metrics}
              hosts={hosts}
              alerts={alerts}
              threats={threats}
              onEscalate={handleEscalateAlert}
              onIgnore={handleIgnoreAlert}
              onResolve={handleResolveAlert}
              onEmailAlert={(alert) => {
                setSelectedIncidentForEmail(alert);
                setActiveView('gmail');
              }}
              packetCount={totalPacketsCount}
            />
          )}

          {activeView === 'network' && (
            <NetworkIDS 
              packets={livePackets}
              rules={rules}
              onCreateRule={handleCreateRule}
              onDeleteRule={handleDeleteRule}
              onToggleRule={handleToggleRule}
            />
          )}

          {activeView === 'host' && (
            <HostIDS 
              hosts={hosts}
              onRegisterHost={handleRegisterHost}
              onDeregisterHost={handleDeregisterHost}
              onQuarantine={handleQuarantine}
            />
          )}

          {activeView === 'threatIntel' && (
            <ThreatIntel 
              threatIntel={threatIntel}
              mlModels={mlModels}
              onTrainModel={handleTrainModel}
            />
          )}

          {activeView === 'gmail' && (
            <GmailConsole 
              currentUser={currentUser} 
              initialIncidentAlert={selectedIncidentForEmail}
              onDispatchAlertToSoc={(msg) => triggerUIWarning(msg)}
            />
          )}

          {activeView === 'reports' && (
            <ReportsGenerator />
          )}

          {activeView === 'logs' && (
            <AuditConsole auditLogs={auditLogs} emailLogs={emailLogs} currentUser={currentUser} />
          )}

          {activeView === 'dualDatabase' && (
            currentUser?.role === 'admin' ? (
              <DualDatabaseConsole 
                currentUserRole={currentUser?.role} 
                onShowAlert={(msg) => triggerUIWarning(msg)} 
              />
            ) : (
              <div className="p-8 text-center bg-slate-900 border border-red-500/20 rounded-xl max-w-lg mx-auto my-12 font-mono">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Restricted Administrator Area</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Dual Database Architecture configuration and SQL Server telemetry are restricted to Administrator accounts.
                </p>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Return to SOC Dashboard
                </button>
              </div>
            )
          )}

          {activeView === 'settings' && (
            <SettingsScreen 
              currentUser={currentUser} 
              onProfileUpdate={async () => {
                const profile = await apiRequest('/api/profile');
                setCurrentUser(profile);
              }}
              onOpenProfileModal={() => setShowProfileModal(true)}
            />
          )}

          {activeView === 'adminPortal' && (
            <AdminPortal 
              adminPasskeyPassed={adminPasskeyPassed}
              onPasskeySuccess={() => setAdminPasskeyPassed(true)}
            />
          )}
        </div>

        {/* Interactive Profile Editor Modal */}
        <ProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUser}
          onProfileUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            setSavedProfile(updatedUser);
          }}
        />

      </main>

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, Activity, Terminal, ShieldAlert, FileText, 
  Settings, LogOut, Lock, Database, X 
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  currentUser: { email: string; name: string; role: string } | null;
  onLogout: () => void;
  adminPasskeyPassed: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ 
  activeView, 
  onViewChange, 
  currentUser, 
  onLogout,
  adminPasskeyPassed,
  isOpen,
  onClose
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'network', label: 'Network IDS', icon: Activity },
    { id: 'host', label: 'Host IDS', icon: Terminal },
    { id: 'threatIntel', label: 'Threat Intel', icon: ShieldAlert },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'logs', label: 'Audit Trail', icon: Database },
    { id: 'settings', label: 'Security Settings', icon: Settings },
  ];

  const isAdmin = currentUser?.role === 'admin';

  const handleNavItemClick = (id: string) => {
    onViewChange(id);
    onClose();
  };

  return (
    <>
      {/* Mobile background overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          id="sidebar-overlay"
        />
      )}

      <aside 
        className={`w-64 h-screen fixed left-0 top-0 z-50 bg-slate-900 border-r border-white/5 flex flex-col py-6 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`} 
        id="app-sidebar"
      >
        
        {/* Brand Header */}
        <div className="px-6 mb-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-md font-bold text-cyan-400 leading-tight tracking-wide">EncDec IDS</h1>
              <p className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">Vigilant Command</p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="p-1 rounded bg-slate-950 text-slate-400 hover:text-white border border-white/5 lg:hidden"
            id="close-sidebar-mobile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-xs font-mono tracking-wide transition-all ${
                isActive 
                  ? 'bg-cyan-500/10 border-l-4 border-cyan-400 text-cyan-400' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              id={`nav-item-${item.id}`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Secret Admin Portal Link (Only visible to authenticated admins with cryptpass OR when they trigger the gateway) */}
        {isAdmin && (
          <button
            onClick={() => handleNavItemClick('adminPortal')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded text-xs font-mono tracking-wide transition-all ${
              activeView === 'adminPortal'
                ? 'bg-red-500/10 border-l-4 border-red-500 text-red-400'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
            }`}
            id="nav-item-admin"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-red-500" />
              <span>Admin Gateway</span>
            </div>
            {adminPasskeyPassed ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        )}
      </nav>

      {/* Operator profile card at bottom */}
      <div className="px-4 mt-auto">
        <div className="p-4 bg-slate-950/50 rounded border border-white/5 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-500/20 text-xs font-bold text-cyan-400">
              {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'OP'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.name || 'Operator'}</p>
              <p className="text-[10px] font-mono text-cyan-400/80 truncate uppercase">{currentUser?.role || 'analyst'}</p>
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-500 truncate">{currentUser?.email}</p>
        </div>

        {/* Sign Out Action */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-xs font-mono text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          id="logout-btn"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
    </>
  );
}

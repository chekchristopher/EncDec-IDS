/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, Activity, Terminal, ShieldAlert, FileText, 
  Settings, LogOut, Lock, Database, X, UserPen, ArrowRightLeft, Mail 
} from 'lucide-react';
import EncDecLogo from './EncDecLogo.js';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  currentUser: { email: string; name: string; role: string; avatarUrl?: string } | null;
  onLogout: () => void;
  adminPasskeyPassed: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export default function Sidebar({ 
  activeView, 
  onViewChange, 
  currentUser, 
  onLogout,
  adminPasskeyPassed,
  isOpen,
  onClose,
  onOpenProfile
}: SidebarProps) {
  
  const isAdmin = currentUser?.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'network', label: 'Network IDS', icon: Activity },
    { id: 'host', label: 'Host IDS', icon: Terminal },
    { id: 'threatIntel', label: 'Threat Intel', icon: ShieldAlert },
    { id: 'gmail', label: 'Gmail Dispatch', icon: Mail },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'logs', label: 'Audit Trail', icon: Database },
    ...(isAdmin ? [{ id: 'dualDatabase', label: 'Dual DB (SQL + Firebase)', icon: ArrowRightLeft }] : []),
    { id: 'settings', label: 'Security Settings', icon: Settings },
  ];

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
        <div className="px-6 mb-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <EncDecLogo size="md" />
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
      <nav className="flex-1 overflow-y-auto min-h-0 space-y-1 px-3 py-1 my-1">
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
      <div className="px-4 mt-auto shrink-0">
        <button
          onClick={onOpenProfile}
          type="button"
          className="w-full text-left p-3.5 bg-slate-950/70 hover:bg-slate-950 border border-white/5 hover:border-cyan-500/30 rounded-lg mb-4 transition-all duration-200 group cursor-pointer shadow-sm relative overflow-hidden focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          title="Click to view and edit profile"
          aria-label="View and edit operator profile"
          id="sidebar-profile-card"
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-500/30 text-xs font-bold text-cyan-400 overflow-hidden shadow-inner">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'OP'
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-slate-900 border border-cyan-500/40 text-cyan-400 opacity-80 group-hover:opacity-100">
                <UserPen className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">{currentUser?.name || 'Operator'}</p>
              </div>
              <p className="text-[9px] font-mono text-cyan-400/80 truncate uppercase tracking-wider">{currentUser?.role || 'analyst'}</p>
              <p className="text-[9px] font-mono text-slate-500 truncate mt-0.5">{currentUser?.email}</p>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400 group-hover:text-cyan-400 transition-colors">
            <span>Edit Profile & Avatar</span>
            <span>→</span>
          </div>
        </button>

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

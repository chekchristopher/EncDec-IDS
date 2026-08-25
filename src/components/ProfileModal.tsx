/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, User as UserIcon, Shield, AlertTriangle, 
  Check, Upload, Trash2, Clock, Info 
} from 'lucide-react';
import { apiRequest } from '../api.js';
import { User } from '../types.js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onProfileUpdated: (updatedUser: User) => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated
}: ProfileModalProps) {
  const [name, setName] = useState(currentUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setAvatarUrl(currentUser.avatarUrl || '');
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [currentUser, isOpen]);

  // Handle ESC key press to close modal for keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser) return null;

  // Calculate 6-month name lock logic
  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000; // ~180 days
  const lastChangeTime = currentUser.lastNameChangeDate 
    ? new Date(currentUser.lastNameChangeDate).getTime() 
    : null;
  const timeSinceChange = lastChangeTime ? Date.now() - lastChangeTime : null;
  const isNameLocked = timeSinceChange !== null && timeSinceChange < SIX_MONTHS_MS;
  const nextAvailableDate = lastChangeTime 
    ? new Date(lastChangeTime + SIX_MONTHS_MS).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setErrorMsg(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to process image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: { name?: string; avatarUrl?: string } = { avatarUrl };
      
      // Only send name if changed
      if (name.trim() !== currentUser.name) {
        payload.name = name.trim();
      }

      const updatedUser = await apiRequest('/api/profile/update', 'POST', payload);
      setSuccessMsg('Operator profile successfully updated.');
      onProfileUpdated(updatedUser);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn" 
      id="profile-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border border-white/10 rounded-xl shadow-2xl font-mono text-xs overflow-hidden">
        
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/90 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 id="profile-modal-title" className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Edit Operator Profile</h3>
              <p className="text-[10px] text-slate-400">Update identity metrics & avatar picture</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            id="close-profile-modal-btn"
            aria-label="Close profile modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - Scrollable on small viewports */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Status Banners */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-start gap-2 leading-relaxed" id="profile-error-alert">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 flex items-center gap-2" id="profile-success-alert">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Profile Picture Attachment Section */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Profile Picture / Avatar
            </label>
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-950 rounded-lg border border-white/5">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cyan-950 border-2 border-cyan-500/30 overflow-hidden flex items-center justify-center text-xl sm:text-2xl font-bold text-cyan-400 shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'OP'
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-slate-950/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold text-white transition-opacity cursor-pointer focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
                  title="Upload picture"
                  aria-label="Upload profile picture"
                >
                  <Camera className="w-5 h-5 mb-1 text-cyan-400" />
                  <span>Change</span>
                </button>
              </div>

              <div className="space-y-2.5 flex-1 text-center sm:text-left w-full">
                <p className="text-[11px] text-slate-300">Attach or update your avatar picture.</p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[42px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-lg text-[11px] font-bold uppercase flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                    id="upload-avatar-btn"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Upload Image</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="min-h-[42px] px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                      id="remove-avatar-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-slate-500">Supports PNG, JPG, WebP up to 5MB.</p>
              </div>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden" 
                id="avatar-file-input"
              />
            </div>
          </div>

          {/* Name Field Section */}
          <div className="space-y-2">
            <div className="flex flex-wrap justify-between items-center gap-1">
              <label htmlFor="profile-name-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Operator Full Name
              </label>
              {isNameLocked && (
                <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Name Locked</span>
                </span>
              )}
            </div>

            <input
              type="text"
              required
              disabled={isNameLocked}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Inspector Alex Mercer"
              className={`w-full min-h-[44px] bg-slate-950 border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all ${
                isNameLocked 
                  ? 'border-amber-500/20 bg-slate-950/50 text-slate-500 cursor-not-allowed' 
                  : 'border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
              }`}
              id="profile-name-input"
            />

            {/* 6-Month Policy Warning Banner */}
            <div className="p-3 sm:p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Security Policy: 6-Month Name Restriction</span>
              </div>
              <p className="text-[10px] text-amber-200/90 leading-relaxed">
                To preserve audit integrity across SOC event streams, operator names can only be changed <strong>once every 6 months</strong>.
              </p>

              {currentUser.lastNameChangeDate ? (
                <p className="text-[9px] font-mono text-slate-400 pt-1.5 border-t border-amber-500/20 leading-relaxed">
                  Last updated on: <span className="text-white font-bold">{new Date(currentUser.lastNameChangeDate).toLocaleDateString()}</span>
                  {isNameLocked && (
                    <> • Next change available on: <span className="text-amber-400 font-bold">{nextAvailableDate}</span></>
                  )}
                </p>
              ) : (
                <p className="text-[9px] font-mono text-emerald-400/90 pt-1.5 border-t border-amber-500/20">
                  ✓ You have not changed your name recently. Your next change will trigger a 6-month lock window.
                </p>
              )}
            </div>
          </div>

          {/* User Metadata / Readonly Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-slate-950/60 rounded-lg border border-white/5 text-[10px]">
            <div>
              <span className="text-slate-500 block uppercase">Operator ID / Email</span>
              <span className="text-slate-300 truncate font-mono block">{currentUser.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">Clearance Role</span>
              <span className="text-cyan-400 font-bold uppercase">{currentUser.role}</span>
            </div>
          </div>

          {/* Actions - Sticky at bottom of form */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-lg font-bold uppercase transition-all flex items-center justify-center focus-visible:ring-2 focus-visible:ring-slate-400"
              id="cancel-profile-modal-btn"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || (isNameLocked && avatarUrl === (currentUser.avatarUrl || ''))}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-lg uppercase shadow-[0_0_12px_rgba(34,211,238,0.2)] transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-cyan-300"
              id="save-profile-modal-btn"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Updating Profile...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

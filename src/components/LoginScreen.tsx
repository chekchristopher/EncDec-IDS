/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Key, Mail, User, Eye, EyeOff, Radio, Lock, HelpCircle } from 'lucide-react';
import { apiRequest, setAuthToken } from '../api.js';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // MFA simulation
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const resetFormState = () => {
    setError(null);
    setMessage(null);
    setPassword('');
    setMfaCode('');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isForgotPassword) {
        const response = await apiRequest('/api/auth/forgot-password', 'POST', { email });
        setMessage(response.message);
        setLoading(false);
        return;
      }

      if (isSignUp) {
        const response = await apiRequest('/api/auth/signup', 'POST', { email, password, name });
        setAuthToken(response.token);
        onLoginSuccess(response.user);
      } else {
        const payload: any = { email, password };
        if (mfaRequired) {
          payload.mfaCode = mfaCode;
        }

        const response = await apiRequest('/api/auth/login', 'POST', payload);
        
        if (response.mfaRequired) {
          setMfaRequired(true);
          setLoading(false);
          setMessage('Multi-factor authentication (MFA) required. Please enter your simulated 6-digit hardware key.');
          return;
        }

        setAuthToken(response.token);
        onLoginSuccess(response.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication sequence failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden" id="login-container">
      {/* Background neon blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(rgba(138, 235, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(138, 235, 255, 0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-8 shadow-2xl shadow-black/80 transition-all duration-300 hover:border-cyan-500/30">
        
        {/* Brand identity */}
        <div className="flex flex-col items-center mb-8 gap-3 text-center">
          <div className="relative w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 animate-pulse">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-[0_0_8px_#22d3ee]" />
          </div>
          <div>
            <h1 className="font-sans text-2xl font-bold text-white tracking-tight">EncDec IDS</h1>
            <p className="font-mono text-xs text-slate-400 uppercase tracking-widest mt-1">Vigilant Command Access</p>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">
            {isForgotPassword ? 'Reset Security Key' : mfaRequired ? 'Security Challenge' : isSignUp ? 'Enlist Operator' : 'Operator Credentials'}
          </h2>
          <p className="text-sm text-slate-400">
            {isForgotPassword 
              ? 'Enter your operator identification to begin credential rotation.' 
              : mfaRequired 
              ? 'Verification required for secure console node entry.' 
              : 'Identity verification required for secure node entry.'}
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono" id="auth-error-banner">
            ❌ {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono" id="auth-message-banner">
            ℹ️ {message}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          
          {/* Email / Username field */}
          {!mfaRequired && (
            <div className="space-y-1">
              <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="email-input">
                OPERATOR_ID
              </label>
              <div className="relative flex items-center bg-slate-950 rounded border border-white/10 focus-within:border-cyan-500 transition-colors">
                <Mail className="absolute left-3 w-4 h-4 text-cyan-400/60" />
                <input
                  id="email-input"
                  type="email"
                  required
                  placeholder="operator@enterprise.sec"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
          )}

          {/* Operator Name Field for Signup */}
          {isSignUp && !mfaRequired && (
            <div className="space-y-1">
              <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="name-input">
                OPERATOR_FULLNAME
              </label>
              <div className="relative flex items-center bg-slate-950 rounded border border-white/10 focus-within:border-cyan-500 transition-colors">
                <User className="absolute left-3 w-4 h-4 text-cyan-400/60" />
                <input
                  id="name-input"
                  type="text"
                  required
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0"
                />
              </div>
            </div>
          )}

          {/* Password field */}
          {!isForgotPassword && !mfaRequired && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="password-input">
                  ACCESS_TOKEN
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { resetFormState(); setIsForgotPassword(true); }}
                    className="text-xs text-cyan-400 hover:underline hover:text-cyan-300"
                    id="recover-password-btn"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative flex items-center bg-slate-950 rounded border border-white/10 focus-within:border-cyan-500 transition-colors">
                <Key className="absolute left-3 w-4 h-4 text-cyan-400/60" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-none py-3 pl-10 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-500 hover:text-white"
                  id="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* MFA Challenge Input */}
          {mfaRequired && (
            <div className="space-y-1 animate-fadeIn">
              <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="mfa-input">
                MFA_KEY_DIGITS
              </label>
              <div className="relative flex items-center bg-slate-950 rounded border border-white/10 focus-within:border-cyan-500 transition-colors">
                <Lock className="absolute left-3 w-4 h-4 text-cyan-400/60" />
                <input
                  id="mfa-input"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter any 6 digit simulated code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0 tracking-widest font-mono text-center"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-mono text-center">
                Simulator notice: Enter any 6-digit digits to pass security.
              </p>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-slate-950 py-3.5 rounded font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(34,211,238,0.2)] active:scale-95 transition-all mt-6"
            id="auth-submit-btn"
          >
            {loading ? 'Authenticating...' : isForgotPassword ? 'Initiate Password Recovery' : mfaRequired ? 'Verify & Enter console' : isSignUp ? 'Initiate Operator Roll' : 'Initiate Authentication'}
          </button>
        </form>

        {/* Alternate auth triggers */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col items-center gap-2">
          {isForgotPassword ? (
            <button
              onClick={() => { resetFormState(); setIsForgotPassword(false); }}
              className="text-xs text-cyan-400 hover:underline"
              id="back-to-login-btn"
            >
              Back to Authentication login
            </button>
          ) : mfaRequired ? (
            <button
              onClick={() => { resetFormState(); setMfaRequired(false); }}
              className="text-xs text-red-400 hover:underline"
              id="abort-mfa-btn"
            >
              Abort security verification
            </button>
          ) : (
            <button
              onClick={() => { resetFormState(); setIsSignUp(!isSignUp); }}
              className="text-xs text-cyan-400 hover:underline"
              id="toggle-signup-login-btn"
            >
              {isSignUp ? 'Already registered operator? Identify here' : 'New operator? Enroll profile here'}
            </button>
          )}
        </div>

        {/* Demo credentials helper for previewers */}
        <div className="mt-6 p-3 bg-slate-950/80 rounded border border-white/5 text-[11px] text-slate-400 font-mono space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>SECURE DEMO SIMULATION KEYS</span>
          </div>
          <div>Operator ID: <span className="text-white font-bold select-all">chekchris85@gmail.com</span></div>
          <div>Access Token: <span className="text-white font-bold select-all">admin123</span></div>
          <div className="text-[10px] text-slate-500 mt-1">MFA code requested: Type any 6-digit number</div>
        </div>
      </div>

      {/* Connection Indicator footer */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-50 text-xs font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          Vigil Console Gateway Live
        </span>
        <span className="h-4 w-px bg-white/10" />
        <span>v4.0.1-vigil</span>
      </div>
    </div>
  );
}

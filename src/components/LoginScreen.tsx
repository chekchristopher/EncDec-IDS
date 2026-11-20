/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Key, Mail, User, Eye, EyeOff, Radio, Lock, Unlock, 
  HelpCircle, ShieldCheck, Sparkles, Check, ArrowRight, AlertTriangle, 
  Send, RefreshCw, CheckCircle2, ChevronRight, RotateCcw
} from 'lucide-react';
import { apiRequest, setAuthToken } from '../api.js';
import EncDecLogo from './EncDecLogo.js';
import { signInWithGoogle, getGoogleAccessToken } from '../services/googleAuth.js';
import { sendDirectAuthEmailToGmail } from '../services/authNotification.js';
import { validateSafeBoxPasskey } from '../utils/safeBoxToken.js';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // 3-Step Password Reset Flow:
  // 1: 'enter_email' -> asks for Gmail
  // 2: 'enter_code' -> asks for 6-digit code dispatched to Gmail
  // 3: 'set_new_password' -> asks user to input new password twice and auto-logs them in
  const [forgotStep, setForgotStep] = useState<'enter_email' | 'enter_code' | 'set_new_password'>('enter_email');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAuthNotice, setGoogleAuthNotice] = useState<string | null>(null);

  // MFA verification for login
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  // Admin Safe Box State (Separate 6-token mixed passkey, independent of MFA)
  const [isSafeBoxUnlocked, setIsSafeBoxUnlocked] = useState(false);
  const [safeBoxPasskey, setSafeBoxPasskey] = useState('');
  const [showSafeBoxPasskey, setShowSafeBoxPasskey] = useState(false);
  const [safeBoxError, setSafeBoxError] = useState<string | null>(null);
  const [safeBoxEnabled, setSafeBoxEnabled] = useState<boolean>(true);
  const [safeBoxHasPasskey, setSafeBoxHasPasskey] = useState<boolean>(true);
  const [safeBoxLoading, setSafeBoxLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Cooldown countdown effect for Resend Code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Fetch whether Admin Safe Box is turned ON/OFF for the current/last operator
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const lookupEmail = email.trim() || localStorage.getItem('encdec_last_email') || '';
        const query = lookupEmail ? `?email=${encodeURIComponent(lookupEmail)}` : '';
        const status = await apiRequest(`/api/auth/safebox/status${query}`);
        if (!active) return;
        setSafeBoxEnabled(Boolean(status?.safeBoxEnabled));
        setSafeBoxHasPasskey(Boolean(status?.hasPasskey));
        if (!status?.safeBoxEnabled) {
          setIsSafeBoxUnlocked(false);
          setSafeBoxPasskey('');
          setSafeBoxError(null);
        }
      } catch {
        // Keep current status on transient network failure
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [email]);

  const resetFormState = () => {
    setError(null);
    setMessage(null);
    setGoogleAuthNotice(null);
    setPassword('');
    setMfaCode('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotStep('enter_email');
  };

  const safeBoxValidation = validateSafeBoxPasskey(safeBoxPasskey);

  const handleUnlockSafeBox = async (e: React.FormEvent) => {
    e.preventDefault();
    setSafeBoxError(null);

    if (!safeBoxPasskey) {
      setSafeBoxError('Please enter your separate 6-token Admin Safe Box passkey.');
      return;
    }

    if (!safeBoxValidation.valid) {
      setSafeBoxError(`Access Denied: ${safeBoxValidation.errors.join(' ')}`);
      return;
    }

    setSafeBoxLoading(true);
    try {
      const lookupEmail = email.trim() || localStorage.getItem('encdec_last_email') || '';
      const response = await apiRequest('/api/auth/safebox/verify', 'POST', {
        email: lookupEmail || undefined,
        passkey: safeBoxPasskey,
      });

      if (response?.unlocked) {
        setIsSafeBoxUnlocked(true);
        setSafeBoxError(null);
      } else {
        setSafeBoxError('Access Denied: Incorrect Admin Safe Box passkey.');
      }
    } catch (err: any) {
      setSafeBoxError(err?.message || 'Access Denied: Failed to verify Admin Safe Box passkey.');
    } finally {
      setSafeBoxLoading(false);
    }
  };

  const handleLockSafeBox = () => {
    setIsSafeBoxUnlocked(false);
    setSafeBoxPasskey('');
    setSafeBoxError(null);
  };

  const handleFillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setIsSignUp(false);
    setIsForgotPassword(false);
    setCopiedKey(userEmail);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setMessage(null);
    setGoogleAuthNotice(null);
    setGoogleLoading(true);

    try {
      // Use standard Google Sign-In (basic profile/email only — no restricted Gmail API scopes)
      // so all users can sign in without hitting Google's restricted-scope verification block.
      // Admins connect Gmail API scopes on demand inside Admin Portal / Gmail Console.
      const res = await signInWithGoogle({ includeGmailScopes: false, promptMode: 'select_account' });
      const googleUser = res.user;
      const googleAccessToken = res.accessToken || undefined;

      if (!googleUser?.email) {
        throw new Error('Google account did not return a valid email address.');
      }

      // Call backend Google Auth route
      const authRes = await apiRequest('/api/auth/google', 'POST', {
        email: googleUser.email,
        name: googleUser.displayName || name || googleUser.email.split('@')[0],
        avatarUrl: googleUser.photoURL || undefined,
        googleAccessToken
      });

      if (authRes.user?.email) {
        localStorage.setItem('encdec_last_email', authRes.user.email);
      }
      setAuthToken(authRes.token);

      if (!authRes.emailDelivery?.deliveredToGmail) {
        let clientDelivered = false;
        if (googleAccessToken) {
          const directRes = await sendDirectAuthEmailToGmail({
            email: googleUser.email,
            name: googleUser.displayName || googleUser.email.split('@')[0],
            role: authRes.user.role,
            eventType: authRes.isNewUser ? 'registration' : 'login'
          }).catch(() => ({ delivered: false }));
          clientDelivered = Boolean(directRes?.delivered);
        }
        if (!clientDelivered) {
          sessionStorage.setItem(
            'encdec_pending_login_email',
            JSON.stringify({
              email: authRes.user.email,
              name: authRes.user.name,
              role: authRes.user.role,
              eventType: authRes.isNewUser ? 'registration' : 'login',
              createdAt: Date.now(),
            })
          );
        }
      } else {
        sessionStorage.removeItem('encdec_pending_login_email');
      }

      onLoginSuccess(authRes.user);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        setGoogleAuthNotice('Popup blocked by browser or iframe sandbox. Please allow popups or open the app in a new browser tab.');
      } else if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        setGoogleAuthNotice(
          'Google Sign-In popup closed before completion (auth/popup-closed-by-user). Keep the Google popup open until sign-in finishes—or if running inside an embedded preview iframe, open the Dev/App URL in a new standalone browser tab—or sign in with email & password.'
        );
      } else if (
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('auth/unauthorized-domain')
      ) {
        const currentDomain = window.location.hostname;
        setGoogleAuthNotice(
          `Domain Authorization Notice: "${currentDomain}" needs to be whitelisted in Firebase Console -> Authentication -> Settings -> Authorized Domains. In the meantime, you can log in instantly with standard operator credentials below or unlock the Admin Safe Box.`
        );
      } else if (
        err?.code === 'auth/access-denied' ||
        err?.message?.toLowerCase().includes('access_denied') ||
        err?.message?.toLowerCase().includes('verification process')
      ) {
        setGoogleAuthNotice(
          'Google OAuth Testing Mode Notice: This Google Cloud project is currently in Testing mode and only allows listed Test Users. Publish the OAuth consent screen to Production (or add this email under Test users in Google Cloud Console), or sign in with email & password below.'
        );
      } else {
        setError(err?.message || 'Google Authentication sequence was aborted.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Resend 6-digit Code to Gmail
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/forgot-password', 'POST', { email });
      setMessage(response.message || `A fresh 6-digit code has been dispatched to ${email}.`);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Main Form Submission Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setGoogleAuthNotice(null);
    setLoading(true);

    try {
      // -------------------------------------------------------------
      // 1. FORGOT PASSWORD WORKFLOW (3-STEP GMAIL OTP -> NEW PASSWORD x2)
      // -------------------------------------------------------------
      if (isForgotPassword) {
        
        // STEP 1: User inputs their Gmail to receive the 6-digit OTP
        if (forgotStep === 'enter_email') {
          if (!email || !email.includes('@')) {
            throw new Error('Please enter a valid Gmail address.');
          }

          const response = await apiRequest('/api/auth/forgot-password', 'POST', { email: email.trim() });
          setResetCode('');
          setMessage(response.message || `A 6-digit OTP verification code has been sent to ${email.trim()}. Check your Gmail inbox.`);
          setForgotStep('enter_code');
          setResendCooldown(60);
          setLoading(false);
          return;
        }

        // STEP 2: User inputs the 6-digit OTP from their Gmail inbox
        if (forgotStep === 'enter_code') {
          const cleanCode = resetCode.trim();
          if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
            throw new Error('Please enter the complete 6-digit numeric OTP from your Gmail.');
          }

          try {
            const response = await apiRequest('/api/auth/verify-reset-code', 'POST', {
              email: email.trim(),
              code: cleanCode
            });

            setNewPassword('');
            setConfirmPassword('');
            setMessage(response.message || 'OTP verified! Enter your new password twice below to confirm.');
            setForgotStep('set_new_password');
          } catch (verifyErr: any) {
            if (verifyErr?.message?.toLowerCase().includes('too many incorrect') || verifyErr?.message?.toLowerCase().includes('expired')) {
              setResetCode('');
            }
            throw verifyErr;
          } finally {
            setLoading(false);
          }
          return;
        }

        // STEP 3: User inputs new password and confirms it a second time, then password is changed
        if (forgotStep === 'set_new_password') {
          if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long.');
          }

          if (newPassword !== confirmPassword) {
            throw new Error('Passwords do not match. Please enter the same password both times.');
          }

          const response = await apiRequest('/api/auth/reset-password', 'POST', {
            email: email.trim(),
            code: resetCode.trim(),
            newPassword,
            confirmPassword
          });

          const preservedEmail = response.email || email.trim();
          localStorage.setItem('encdec_last_email', preservedEmail);
          resetFormState();
          setEmail(preservedEmail);
          setIsForgotPassword(false);
          setIsSignUp(false);
          setMfaRequired(false);
          setMessage(
            response.message ||
              `Password changed successfully for ${preservedEmail}! Sign in below with your new password.`
          );
          return;
        }
      }

      // -------------------------------------------------------------
      // 2. STANDARD SIGNUP & LOGIN WORKFLOW
      // -------------------------------------------------------------
      const cachedGoogleToken = await getGoogleAccessToken();

      if (isSignUp) {
        const response = await apiRequest('/api/auth/signup', 'POST', { 
          email, 
          password, 
          name,
          googleAccessToken: cachedGoogleToken || undefined
        });

        if (response.user?.email) {
          localStorage.setItem('encdec_last_email', response.user.email);
        }
        setAuthToken(response.token);

        if (!response.emailDelivery?.deliveredToGmail) {
          if (cachedGoogleToken) {
            sendDirectAuthEmailToGmail({
              email: response.user.email,
              name: response.user.name,
              role: response.user.role,
              eventType: 'registration'
            }).catch(() => {});
          } else {
            sessionStorage.setItem(
              'encdec_pending_login_email',
              JSON.stringify({
                email: response.user.email,
                name: response.user.name,
                role: response.user.role,
                eventType: 'registration',
                createdAt: Date.now(),
              })
            );
          }
        } else {
          sessionStorage.removeItem('encdec_pending_login_email');
        }

        onLoginSuccess(response.user);
      } else {
        const payload: any = { 
          email, 
          password, 
          googleAccessToken: cachedGoogleToken || undefined
        };
        if (mfaRequired) {
          payload.mfaCode = mfaCode;
        }

        const response = await apiRequest('/api/auth/login', 'POST', payload);
        
        if (response.mfaRequired) {
          setMfaRequired(true);
          setLoading(false);
          setMessage('Multi-factor authentication (MFA) required. Please enter your 6-digit verification code.');
          return;
        }

        if (response.user?.email) {
          localStorage.setItem('encdec_last_email', response.user.email);
        }
        setAuthToken(response.token);

        if (!response.emailDelivery?.deliveredToGmail) {
          if (cachedGoogleToken) {
            sendDirectAuthEmailToGmail({
              email: response.user.email,
              name: response.user.name,
              role: response.user.role,
              eventType: 'login'
            }).catch(() => {});
          } else {
            sessionStorage.setItem(
              'encdec_pending_login_email',
              JSON.stringify({
                email: response.user.email,
                name: response.user.name,
                role: response.user.role,
                eventType: 'login',
                createdAt: Date.now(),
              })
            );
          }
        } else {
          sessionStorage.removeItem('encdec_pending_login_email');
        }

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

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/80 transition-all duration-300 hover:border-cyan-500/30">
        
        {/* Brand identity */}
        <div className="flex flex-col items-center mb-6 gap-3 text-center">
          <div className="relative">
            <EncDecLogo size="xl" showGlow={true} />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-[0_0_8px_#34d399]" />
          </div>
          <div>
            <h1 className="font-sans text-2xl font-bold text-white tracking-tight">EncDec IDS</h1>
            <p className="font-mono text-xs text-cyan-400 uppercase tracking-widest mt-1">Vigilant Command Access</p>
          </div>
        </div>

        {/* Title & Dynamic Header for Password Reset / Login */}
        <div className="mb-6">
          {isForgotPassword ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase font-bold">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Password Recovery Protocol</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight font-sans">
                {forgotStep === 'enter_email' && 'Verify Your Gmail Address'}
                {forgotStep === 'enter_code' && 'Enter 6-Digit Gmail OTP'}
                {forgotStep === 'set_new_password' && 'Create New Password'}
              </h2>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                {forgotStep === 'enter_email' && 'Enter your registered Gmail address. We will send a 6-digit one-time password (OTP) to verify your identity.'}
                {forgotStep === 'enter_code' && `Enter the 6-digit OTP sent to ${email} to verify it is you.`}
                {forgotStep === 'set_new_password' && 'Enter your new password and confirm it a second time to complete the password change.'}
              </p>

              {/* Step indicator progress */}
              <div className="flex items-center gap-1.5 pt-2 font-mono text-[10px]">
                <span className={`px-2 py-0.5 rounded ${forgotStep === 'enter_email' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'}`}>
                  1. Gmail
                </span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <span className={`px-2 py-0.5 rounded ${forgotStep === 'enter_code' ? 'bg-cyan-500 text-slate-950 font-bold' : forgotStep === 'set_new_password' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                  2. Gmail OTP
                </span>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <span className={`px-2 py-0.5 rounded ${forgotStep === 'set_new_password' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  3. New Password
                </span>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">
                {mfaRequired ? 'Security Challenge' : isSignUp ? 'Enlist Operator' : 'Operator Credentials'}
              </h2>
              <p className="text-sm text-slate-400">
                {mfaRequired 
                  ? 'Verification required for secure console node entry.' 
                  : 'Identity verification required for secure node entry.'}
              </p>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono" id="auth-error-banner">
            ❌ {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono" id="auth-message-banner">
            ℹ️ {message}
          </div>
        )}
        {googleAuthNotice && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-mono space-y-2" id="google-auth-notice">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Browser Notice</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              {googleAuthNotice}
            </p>
            <div className="pt-1">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 font-bold underline"
              >
                <span>Launch in new tab for Google Sign-In</span> ↗
              </a>
            </div>
          </div>
        )}

        {/* Direct Google Auth Button (Only visible on initial login/signup) */}
        {!mfaRequired && !isForgotPassword && (
          <div className="mb-5 space-y-2.5">
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-white/15 hover:border-cyan-400/50 text-white text-xs font-medium transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              id="google-signin-btn"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>
                {googleLoading
                  ? 'Connecting to Google...'
                  : isSignUp
                  ? 'Sign up with Google'
                  : 'Continue with Google'}
              </span>
            </button>

            {/* Standard Google Auth info badge */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-cyan-400/90 font-mono bg-cyan-950/30 border border-cyan-500/20 py-1.5 px-2.5 rounded-lg">
              <Send className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Standard Google Sign-In · Alerts sent via SOC Gateway</span>
            </div>

            <div className="flex items-center gap-3 my-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Or enter credentials</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MAIN AUTH & PASSWORD RESET FORM                                 */}
        {/* ============================================================== */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          
          {/* ----------------------------------------------------------- */}
          {/* FORGOT PASSWORD: STEP 1 - ASK FOR GMAIL ADDRESS             */}
          {/* ----------------------------------------------------------- */}
          {isForgotPassword && forgotStep === 'enter_email' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="space-y-1">
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="recovery-email-input">
                  YOUR GMAIL / OPERATOR ADDRESS
                </label>
                <div className="relative flex items-center bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500 transition-colors">
                  <Mail className="absolute left-3 w-4 h-4 text-cyan-400" />
                  <input
                    id="recovery-email-input"
                    type="email"
                    required
                    placeholder="e.g. chekchris85@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-300 font-mono flex items-start gap-2">
                <Send className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>We will dispatch a 6-digit verification code directly to this Gmail address.</span>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* FORGOT PASSWORD: STEP 2 - INPUT 6-DIGIT CODE FROM GMAIL     */}
          {/* ----------------------------------------------------------- */}
          {isForgotPassword && forgotStep === 'enter_code' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="reset-code-input">
                    6-DIGIT VERIFICATION CODE
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    Sent to: {email}
                  </span>
                </div>
                
                <div className="relative flex items-center bg-slate-950 rounded-xl border-2 border-cyan-500/50 focus-within:border-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <Key className="absolute left-3 w-4 h-4 text-cyan-400" />
                  <input
                    id="reset-code-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="••••••"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-transparent border-none py-3.5 pl-10 pr-4 text-center text-lg text-white placeholder-slate-600 focus:outline-none focus:ring-0 font-mono tracking-[0.5em] font-bold"
                  />
                </div>
              </div>

              {/* Resend and change email actions */}
              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend 6-Digit Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotStep('enter_email');
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Change email
                </button>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* FORGOT PASSWORD: STEP 3 - INPUT NEW PASSWORD TWICE & LOGIN */}
          {/* ----------------------------------------------------------- */}
          {isForgotPassword && forgotStep === 'set_new_password' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Gmail OTP verified for {email}. Enter and confirm your new password:</span>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="new-password-input">
                  NEW_PASSWORD_CHOICE
                </label>
                <div className="relative flex items-center bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500 transition-colors">
                  <Key className="absolute left-3 w-4 h-4 text-cyan-400/60" />
                  <input
                    id="new-password-input"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent border-none py-3 pl-10 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-slate-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password (Input twice to verify) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="confirm-password-input">
                    CONFIRM_NEW_PASSWORD (INPUT TWICE)
                  </label>
                  {confirmPassword && (
                    <span className={`text-[10px] font-mono font-bold ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                      {newPassword === confirmPassword ? '✓ Passwords Match' : '✗ Must Match'}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500 transition-colors">
                  <Lock className="absolute left-3 w-4 h-4 text-cyan-400/60" />
                  <input
                    id="confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your new password to confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-none py-3 pl-10 pr-12 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-500 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* STANDARD LOGIN / SIGNUP FIELDS                              */}
          {/* ----------------------------------------------------------- */}
          {!isForgotPassword && (
            <>
              {/* Email / Username field */}
              {!mfaRequired && (
                <div className="space-y-1">
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="email-input">
                    OPERATOR_ID
                  </label>
                  <div className="relative flex items-center bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500 transition-colors">
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
                  <div className="relative flex items-center bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500 transition-colors">
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
              {!mfaRequired && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="password-input">
                      ACCESS_TOKEN
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => { 
                          resetFormState(); 
                          setIsForgotPassword(true); 
                          setForgotStep('enter_email');
                        }}
                        className="text-xs text-cyan-400 hover:underline hover:text-cyan-300 cursor-pointer"
                        id="recover-password-btn"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500 transition-colors">
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
                  <div className="relative flex items-center bg-slate-950 rounded-xl border border-white/10 focus-within:border-cyan-500 transition-colors">
                    <Lock className="absolute left-3 w-4 h-4 text-cyan-400/60" />
                    <input
                      id="mfa-input"
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter 6-digit MFA security code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0 tracking-widest font-mono text-center"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono text-center">
                    Security Notice: Enter your 6-digit authenticator or hardware key.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-slate-950 py-3.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(34,211,238,0.2)] active:scale-95 transition-all mt-6 cursor-pointer flex items-center justify-center gap-2"
            id="auth-submit-btn"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Request...</span>
              </span>
            ) : isForgotPassword ? (
              forgotStep === 'enter_email' ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send OTP to Gmail →</span>
                </>
              ) : forgotStep === 'enter_code' ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify OTP Code →</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Change Password →</span>
                </>
              )
            ) : mfaRequired ? (
              'Verify & Enter Console'
            ) : isSignUp ? (
              'Initiate Operator Roll'
            ) : (
              'Initiate Authentication'
            )}
          </button>
        </form>

        {/* Alternate auth triggers */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col items-center gap-2">
          {isForgotPassword ? (
            <button
              onClick={() => { resetFormState(); setIsForgotPassword(false); }}
              className="text-xs text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
              id="back-to-login-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to standard login</span>
            </button>
          ) : mfaRequired ? (
            <button
              onClick={() => { resetFormState(); setMfaRequired(false); }}
              className="text-xs text-red-400 hover:underline cursor-pointer"
              id="abort-mfa-btn"
            >
              Abort security verification
            </button>
          ) : (
            <button
              onClick={() => { resetFormState(); setIsSignUp(!isSignUp); }}
              className="text-xs text-cyan-400 hover:underline cursor-pointer"
              id="toggle-signup-login-btn"
            >
              {isSignUp ? 'Already registered operator? Identify here' : 'New operator? Enroll profile here'}
            </button>
          )}
        </div>

        {/* Admin Safe Box - Independent 6-Token Mixed Passkey Vault */}
        {!safeBoxEnabled ? (
          <div className="mt-6 p-4 rounded-xl border bg-slate-950/60 border-white/10 font-mono text-xs space-y-2" id="admin-safe-box-disabled">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 font-bold">
                <Lock className="w-4 h-4 text-slate-500" />
                <span className="tracking-wider">ADMIN SAFE BOX</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-white/10 text-[10px] uppercase">
                OFF
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Disabled in operator settings. Sign in and turn ON Admin Safe Box in Settings to access or configure your separate vault passkey.
            </p>
          </div>
        ) : (
          <div className={`mt-6 p-4 rounded-xl border transition-all duration-300 font-mono text-xs ${
            isSafeBoxUnlocked 
              ? 'bg-slate-950/95 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
              : 'bg-slate-950/80 border-white/10 hover:border-amber-500/30'
          }`} id="admin-safe-box">
            
            {!isSafeBoxUnlocked ? (
              /* LOCKED VAULT VIEW */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="tracking-wider">ADMIN SAFE BOX</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px] uppercase">
                    Locked Vault
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                  Enter your separate 6-token Admin Safe Box passkey (numbers, alphabet, signs & emoji):
                </p>

                {!safeBoxHasPasskey && (
                  <p className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded px-2.5 py-1.5">
                    No Safe Box passkey is set for this operator yet. Sign in and set your 6-token mixed passkey in Settings.
                  </p>
                )}

                <form onSubmit={handleUnlockSafeBox} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 bg-slate-900 rounded-lg border border-white/15 focus-within:border-amber-400 transition-colors">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400/60" />
                      <input
                        id="safebox-passkey-input"
                        type={showSafeBoxPasskey ? 'text' : 'password'}
                        placeholder="6-token mixed passkey"
                        value={safeBoxPasskey}
                        onChange={(e) => setSafeBoxPasskey(e.target.value)}
                        className="w-full bg-transparent border-none py-2 pl-9 pr-16 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-0 font-mono"
                      />
                      <span className={`absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold ${safeBoxValidation.tokenCount === 6 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {safeBoxValidation.tokenCount}/6
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSafeBoxPasskey(!showSafeBoxPasskey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                        title={showSafeBoxPasskey ? 'Hide passkey' : 'Reveal passkey'}
                      >
                        {showSafeBoxPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={safeBoxLoading}
                      className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-xs transition-all cursor-pointer shrink-0"
                      id="safebox-unlock-btn"
                    >
                      {safeBoxLoading ? 'Checking...' : 'Unlock'}
                    </button>
                  </div>
                  {safeBoxError && (
                    <p className="text-[10px] text-red-400 font-mono" id="safebox-error-text">
                      {safeBoxError}
                    </p>
                  )}
                </form>
              </div>
            ) : (
              /* UNLOCKED VAULT VIEW */
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Unlock className="w-4 h-4 text-emerald-400" />
                    <span className="tracking-wider">ADMIN VAULT UNLOCKED</span>
                  </div>
                  <button
                    onClick={handleLockSafeBox}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Lock Safe Box
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Click any credential below to auto-fill into authentication fields:
                </p>

                <div className="space-y-2">
                  {/* Admin credentials */}
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('chekchris85@gmail.com', 'admin123')}
                    className="w-full text-left p-2.5 rounded bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-400/80 hover:bg-emerald-950/20 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                          Admin Role
                        </span>
                        <span className="text-white font-bold text-xs">chekchris85@gmail.com</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Password: admin123 • Login MFA: 123456</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {copiedKey === 'chekchris85@gmail.com' ? '✓ Filled' : 'Click to Fill'}
                    </span>
                  </button>

                  {/* Analyst credentials */}
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('analyst@enterprise.sec', 'analyst123')}
                    className="w-full text-left p-2.5 rounded bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400/80 hover:bg-cyan-950/20 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Analyst Role
                        </span>
                        <span className="text-white font-bold text-xs">analyst@enterprise.sec</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Password: analyst123</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {copiedKey === 'analyst@enterprise.sec' ? '✓ Filled' : 'Click to Fill'}
                    </span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  ShieldAlert,
  CreditCard,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  LogOut,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../api.js';
import { BillingConfig, PaymentRecord, SubscriptionAccessStatus, User } from '../types.js';
import {
  NOWPAYMENTS_PAYMENT_URL,
  SUBSCRIPTION_PRICE_USD,
  SUBSCRIPTION_CYCLE_MONTHS,
  SUBSCRIPTION_CYCLE_DAYS,
} from '../utils/subscription.js';
import ThemeToggle from './ThemeToggle.jsx';

interface SubscriptionGateProps {
  currentUser: Partial<User>;
  billingConfig?: BillingConfig | null;
  accessStatus: SubscriptionAccessStatus;
  onUnlocked: (verifiedSuccessMessage?: string) => Promise<void> | void;
  onLogout: () => void;
  embedded?: boolean;
}

export default function SubscriptionGate({
  currentUser,
  billingConfig,
  accessStatus,
  onUnlocked,
  onLogout,
  embedded = false,
}: SubscriptionGateProps) {
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutInitiated, setCheckoutInitiated] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [verificationMode, setVerificationMode] = useState<{ liveApiConfigured: boolean; ipnConfigured: boolean } | null>(null);

  const paymentUrl = billingConfig?.nowPaymentsUrl || NOWPAYMENTS_PAYMENT_URL;
  const priceUsd = billingConfig?.priceUsd || SUBSCRIPTION_PRICE_USD;
  const cycleMonths = billingConfig?.billingCycleMonths || SUBSCRIPTION_CYCLE_MONTHS;
  const cycleDays = billingConfig?.billingCycleDays || SUBSCRIPTION_CYCLE_DAYS;

  const fetchBillingStatus = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const res = await apiRequest('/api/billing/status');
        if (Array.isArray(res?.payments)) {
          setPayments(res.payments);
        }
        if (res?.verificationMode) {
          setVerificationMode(res.verificationMode);
        }
        if (res?.access?.hasAccess) {
          const confirmedNowPay = Array.isArray(res?.payments)
            ? res.payments.find((p: PaymentRecord) => p.verifiedByNowPayments && p.status === 'confirmed')
            : null;
          await onUnlocked(
            confirmedNowPay
              ? 'Payment successful! Verified in NOWPayments — your 3-month subscription is active.'
              : undefined
          );
          return;
        }
        if (manual) {
          setFeedback({
            type: 'info',
            message: res?.access?.statusLabel
              ? `Current Status: ${res.access.statusLabel}`
              : 'Subscription is still pending activation.',
          });
        }
      } catch (err: any) {
        if (manual) {
          setFeedback({
            type: 'error',
            message: err?.message || 'Unable to verify subscription status.',
          });
        }
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [onUnlocked]
  );

  useEffect(() => {
    fetchBillingStatus(false);
    const interval = setInterval(() => {
      fetchBillingStatus(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchBillingStatus]);

  const handleCheckoutClick = async () => {
    setCheckoutInitiated(true);
    try {
      const res = await apiRequest('/api/billing/checkout/init', 'POST');
      if (res?.orderId) {
        setLastOrderId(res.orderId);
      }
    } catch {
      // Non-blocking audit log call; external NOWPayments tab still opens cleanly
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = paymentReference.trim();
    if (cleanRef.length < 4) {
      setFeedback({
        type: 'error',
        message: 'Enter a valid NOWPayments Payment ID or transaction hash (minimum 4 characters).',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiRequest('/api/billing/verify-payment', 'POST', {
        paymentReference: cleanRef,
        notes: notes.trim() || undefined,
      });

      if (res?.verified === true && res?.status === 'confirmed') {
        const successMsg =
          res?.message ||
          'Payment successful! Verified in NOWPayments — your 3-month dashboard access is now active.';
        setFeedback({
          type: 'success',
          message: successMsg,
        });
        await onUnlocked(successMsg);
        return;
      }

      if (res?.access?.hasAccess) {
        await onUnlocked();
        return;
      }

      setFeedback({
        type: 'info',
        message:
          res?.message ||
          'Payment is NOT yet verified in NOWPayments. Dashboard stays locked until NOWPayments confirms completion.',
      });
      setPaymentReference('');
      setNotes('');
      await fetchBillingStatus(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'NOWPayments verification failed. Payment could not be confirmed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isRevoked = accessStatus.reason === 'subscription_revoked';
  const isExpired = accessStatus.reason === 'subscription_expired';

  return (
    <div
      className={
        embedded
          ? 'w-full max-w-5xl mx-auto py-2 text-slate-200'
          : 'min-h-screen w-full bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden'
      }
      id={embedded ? 'get-licensed-card' : 'subscription-lock-screen'}
    >
      {/* Top Action Bar (only shown when rendered standalone outside dashboard scaffold) */}
      {!embedded && (
        <div className="w-full max-w-4xl flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5 font-mono text-xs text-slate-400">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-white font-bold tracking-wider uppercase text-xs">EncDec IDS Access Gate</p>
              <p className="text-[10px] text-slate-500">
                Signed in as <span className="text-cyan-400">{currentUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle variant="icon" />
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-mono text-xs cursor-pointer transition-colors"
              id="subscription-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Get Licensed Card */}
      <div
        className={`w-full ${
          embedded ? 'max-w-5xl' : 'max-w-4xl'
        } bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden relative`}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-amber-500 to-cyan-500" />

        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Lock Status & Plan Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  {isRevoked
                    ? 'License Revoked by Administrator'
                    : isExpired
                    ? '3-Month License Expired'
                    : 'Navigation Locked — Get Licensed to Continue'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Get Licensed — Unlock EncDec IDS
              </h1>

              <p className="text-sm text-slate-400 leading-relaxed">
                All navigation menus, Host IDS node monitoring, Live TopoJSON Threat Maps, Incident Correlation, and Reporting modules remain locked until your 3-month subscription is verified in NOWPayments.
              </p>
            </div>

            {/* Pricing Box */}
            <div className="p-5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-400 font-bold block">
                    Quarterly Enterprise Access
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">${priceUsd}</span>
                    <span className="text-xs font-mono text-slate-400">
                      USD / {cycleMonths} Months ({cycleDays} Days)
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase">
                  NOWPayments Crypto Checkout
                </span>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Live Packet & TopoJSON Map</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Unlimited Enrolled Host Nodes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>MITRE ATT&CK Correlation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>SOC Workbook & Reports</span>
                </li>
              </ul>

              <div className="pt-2 space-y-2.5">
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCheckoutClick}
                  className="w-full py-3.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
                  id="nowpayments-checkout-link"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ${priceUsd} via NOWPayments (3 Months)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <p className="text-[11px] font-mono text-slate-500 text-center">
                  Invoice ID: <span className="text-slate-300">{billingConfig?.nowPaymentsInvoiceId || '6215083042'}</span>
                  {lastOrderId ? ` • Order: ${lastOrderId}` : ''}
                </p>
                <p
                  className="text-[10px] font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 text-center leading-relaxed"
                  id="subscription-gate-google-maps-disclosure"
                >
                  Note: Deep Seek Google Maps Satellite &amp; 360° Street View separately require a paid Google Cloud / Google Maps Platform subscription in Google.
                </p>
              </div>
            </div>

            {checkoutInitiated && (
              <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-mono flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  NOWPayments checkout opened in a new tab. After completing the ${priceUsd} payment, submit your NOWPayments Payment ID or transaction hash on the right to verify and unlock your 3-month access.
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Payment Verification & Status Polling */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    Verify in NOWPayments
                  </h2>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                    verificationMode?.liveApiConfigured
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {verificationMode?.liveApiConfigured ? 'Live API Check' : 'IPN / Admin Check'}
                </span>
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : feedback.type === 'error'
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  }`}
                >
                  {feedback.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="nowpayments-ref-input"
                    className="block font-mono text-[11px] uppercase tracking-wider text-slate-400"
                  >
                    NOWPayments Payment ID / Tx Hash
                  </label>
                  <input
                    id="nowpayments-ref-input"
                    type="text"
                    required
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. 5849201432 or 0x..."
                    className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="nowpayments-notes-input"
                    className="block font-mono text-[11px] uppercase tracking-wider text-slate-400"
                  >
                    Optional Payer Note / Currency
                  </label>
                  <input
                    id="nowpayments-notes-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid 500 USDT (TRC20)"
                    className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !paymentReference.trim()}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  id="submit-payment-verification-btn"
                >
                  {submitting ? 'Verifying in NOWPayments...' : 'Verify NOWPayments Payment'}
                </button>
              </form>

              {/* Recent User Submissions */}
              {payments.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Your Payment History
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {payments.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-white/5 font-mono text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white font-semibold truncate">
                            {p.paymentReference || p.id}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                              p.status === 'confirmed' || p.status === 'granted_by_admin'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : p.status === 'rejected' || p.status === 'revoked'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            ${p.amountUsd} / {p.billingCycleMonths} Mo
                            {p.nowPaymentsStatus ? ` • NP: ${p.nowPaymentsStatus}` : ''}
                          </span>
                          <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Status Footer */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => fetchBillingStatus(true)}
                disabled={refreshing}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/15 text-cyan-300 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                id="refresh-subscription-status-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Checking Access...' : 'Refresh Subscription Status'}</span>
              </button>
              <p className="text-[10px] font-mono text-slate-500 text-center">
                Auto-checks every 8s for payment confirmation or admin grants.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

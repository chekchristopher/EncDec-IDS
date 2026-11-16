/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BillingConfig, SubscriptionAccessStatus, User } from '../types.js';

export const NOWPAYMENTS_PAYMENT_URL = 'https://nowpayments.io/payment/?iid=6215083042';
export const NOWPAYMENTS_INVOICE_ID = '6215083042';
export const SUBSCRIPTION_PRICE_USD = 500;
export const SUBSCRIPTION_CYCLE_MONTHS = 3;
export const SUBSCRIPTION_CYCLE_DAYS = 90;

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  subscriptionRequired: true,
  nowPaymentsUrl: NOWPAYMENTS_PAYMENT_URL,
  nowPaymentsInvoiceId: NOWPAYMENTS_INVOICE_ID,
  priceUsd: SUBSCRIPTION_PRICE_USD,
  billingCycleMonths: SUBSCRIPTION_CYCLE_MONTHS,
  billingCycleDays: SUBSCRIPTION_CYCLE_DAYS,
  freeAccessActive: false,
  freeAccessExpiresAt: null,
  freeAccessDurationLabel: undefined,
  updatedAt: new Date(0).toISOString(),
};

/**
 * Evaluates whether an authenticated user currently has access to the SOC dashboard.
 * Priority:
 * 1. Admin role always retains access to manage paywall/subscriptions.
 * 2. If Admin turned subscription payment OFF -> full access.
 * 3. If Admin activated timed free access for all users and timer hasn't expired -> full access.
 * 4. If user has an active, non-expired subscription -> full access.
 * 5. Otherwise -> locked behind NOWPayments $500 / 3-month subscription wall.
 */
export function evaluateSubscriptionAccess(
  user: Partial<User> | null | undefined,
  billingConfig: Partial<BillingConfig> | null | undefined,
  nowMs: number = Date.now()
): SubscriptionAccessStatus {
  const cfg: BillingConfig = {
    ...DEFAULT_BILLING_CONFIG,
    ...(billingConfig || {}),
  };

  if (!user) {
    return {
      hasAccess: false,
      reason: 'subscription_required',
      statusLabel: 'Authentication Required',
    };
  }

  if (user.role === 'admin') {
    return {
      hasAccess: true,
      reason: 'admin_override',
      statusLabel: 'Administrator Access',
    };
  }

  if (!cfg.subscriptionRequired) {
    return {
      hasAccess: true,
      reason: 'payments_disabled',
      statusLabel: 'Open Access (Subscription Paywall OFF)',
    };
  }

  if (cfg.freeAccessActive && cfg.freeAccessExpiresAt) {
    const freeExpMs = Date.parse(cfg.freeAccessExpiresAt);
    if (!Number.isNaN(freeExpMs) && freeExpMs > nowMs) {
      const remainingMs = freeExpMs - nowMs;
      return {
        hasAccess: true,
        reason: 'global_free_access',
        expiresAt: cfg.freeAccessExpiresAt,
        freeAccessRemainingMs: remainingMs,
        daysRemaining: Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24))),
        statusLabel: `Free Access Active (${cfg.freeAccessDurationLabel || 'Promotional Window'})`,
      };
    }
  }

  if (user.subscriptionStatus === 'active' && user.subscriptionExpiresAt) {
    const subExpMs = Date.parse(user.subscriptionExpiresAt);
    if (!Number.isNaN(subExpMs) && subExpMs > nowMs) {
      const remainingMs = subExpMs - nowMs;
      return {
        hasAccess: true,
        reason: 'active_subscription',
        expiresAt: user.subscriptionExpiresAt,
        daysRemaining: Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24))),
        statusLabel: 'Active 3-Month Subscription',
      };
    }
  }

  if (user.subscriptionStatus === 'revoked') {
    return {
      hasAccess: false,
      reason: 'subscription_revoked',
      statusLabel: 'Subscription Revoked by Admin',
    };
  }

  if (user.subscriptionExpiresAt) {
    const subExpMs = Date.parse(user.subscriptionExpiresAt);
    if (!Number.isNaN(subExpMs) && subExpMs <= nowMs) {
      return {
        hasAccess: false,
        reason: 'subscription_expired',
        expiresAt: user.subscriptionExpiresAt,
        daysRemaining: 0,
        statusLabel: '3-Month Subscription Expired',
      };
    }
  }

  return {
    hasAccess: false,
    reason: 'subscription_required',
    statusLabel: 'Subscription Required ($500 / 3 Months)',
  };
}

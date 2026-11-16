/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BILLING_CONFIG,
  NOWPAYMENTS_PAYMENT_URL,
  SUBSCRIPTION_PRICE_USD,
  SUBSCRIPTION_CYCLE_MONTHS,
  evaluateSubscriptionAccess,
} from '../subscription.js';

describe('NOWPayments subscription access evaluator', () => {
  const now = Date.parse('2026-11-15T12:00:00.000Z');

  it('exposes exact NOWPayments link and $500 / 3-month constants', () => {
    expect(NOWPAYMENTS_PAYMENT_URL).toBe('https://nowpayments.io/payment/?iid=6215083042');
    expect(SUBSCRIPTION_PRICE_USD).toBe(500);
    expect(SUBSCRIPTION_CYCLE_MONTHS).toBe(3);
  });

  it('locks unsubscribed analyst users when subscription payment is required', () => {
    const res = evaluateSubscriptionAccess(
      { id: 'usr_2', role: 'analyst', subscriptionStatus: 'inactive' },
      DEFAULT_BILLING_CONFIG,
      now
    );
    expect(res.hasAccess).toBe(false);
    expect(res.reason).toBe('subscription_required');
  });

  it('always grants access to admin role to manage paywall and subscriptions', () => {
    const res = evaluateSubscriptionAccess(
      { id: 'usr_1', role: 'admin', subscriptionStatus: 'inactive' },
      DEFAULT_BILLING_CONFIG,
      now
    );
    expect(res.hasAccess).toBe(true);
    expect(res.reason).toBe('admin_override');
  });

  it('unlocks all users when admin turns subscription payment OFF', () => {
    const res = evaluateSubscriptionAccess(
      { id: 'usr_2', role: 'analyst', subscriptionStatus: 'inactive' },
      { ...DEFAULT_BILLING_CONFIG, subscriptionRequired: false },
      now
    );
    expect(res.hasAccess).toBe(true);
    expect(res.reason).toBe('payments_disabled');
  });

  it('unlocks all users during an active timed global free access window', () => {
    const future = new Date(now + 2 * 60 * 60 * 1000).toISOString();
    const res = evaluateSubscriptionAccess(
      { id: 'usr_2', role: 'analyst', subscriptionStatus: 'inactive' },
      {
        ...DEFAULT_BILLING_CONFIG,
        freeAccessActive: true,
        freeAccessExpiresAt: future,
        freeAccessDurationLabel: '2 hours',
      },
      now
    );
    expect(res.hasAccess).toBe(true);
    expect(res.reason).toBe('global_free_access');
  });

  it('re-locks unsubscribed users once global free access window expires', () => {
    const past = new Date(now - 60 * 1000).toISOString();
    const res = evaluateSubscriptionAccess(
      { id: 'usr_2', role: 'analyst', subscriptionStatus: 'inactive' },
      {
        ...DEFAULT_BILLING_CONFIG,
        freeAccessActive: true,
        freeAccessExpiresAt: past,
        freeAccessDurationLabel: '1 hour',
      },
      now
    );
    expect(res.hasAccess).toBe(false);
    expect(res.reason).toBe('subscription_required');
  });

  it('grants access for an active, unexpired 3-month subscription', () => {
    const future = new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString();
    const res = evaluateSubscriptionAccess(
      {
        id: 'usr_2',
        role: 'analyst',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: future,
      },
      DEFAULT_BILLING_CONFIG,
      now
    );
    expect(res.hasAccess).toBe(true);
    expect(res.reason).toBe('active_subscription');
    expect(res.daysRemaining).toBe(90);
  });

  it('locks user when 3-month subscription is expired', () => {
    const past = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const res = evaluateSubscriptionAccess(
      {
        id: 'usr_2',
        role: 'analyst',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: past,
      },
      DEFAULT_BILLING_CONFIG,
      now
    );
    expect(res.hasAccess).toBe(false);
    expect(res.reason).toBe('subscription_expired');
  });

  it('locks user when subscription was revoked by admin', () => {
    const res = evaluateSubscriptionAccess(
      {
        id: 'usr_2',
        role: 'analyst',
        subscriptionStatus: 'revoked',
        subscriptionExpiresAt: new Date(now).toISOString(),
      },
      DEFAULT_BILLING_CONFIG,
      now
    );
    expect(res.hasAccess).toBe(false);
    expect(res.reason).toBe('subscription_revoked');
  });
});

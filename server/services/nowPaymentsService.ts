/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { PaymentRecord } from '../../src/types.js';
import { NOWPAYMENTS_INVOICE_ID, SUBSCRIPTION_PRICE_USD } from '../../src/utils/subscription.js';

export interface NowPaymentsApiPayment {
  payment_id?: string | number;
  invoice_id?: string | number | null;
  payment_status?: string;
  pay_address?: string;
  price_amount?: number | string;
  price_currency?: string;
  pay_amount?: number | string;
  actually_paid?: number | string;
  pay_currency?: string;
  order_id?: string | null;
  purchase_id?: string | number | null;
  payin_hash?: string | null;
  payer_email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NowPaymentsValidationResult {
  outcome: 'verified' | 'pending' | 'rejected' | 'not_found' | 'api_error';
  paymentStatus?: string;
  paymentData?: NowPaymentsApiPayment;
  reason: string;
}

const VERIFIED_STATUSES = new Set(['finished', 'confirmed']);
const PENDING_STATUSES = new Set(['waiting', 'confirming', 'sending']);
const FAILED_STATUSES = new Set(['failed', 'expired', 'refunded', 'partially_paid']);

function sortObjectKeysDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeysDeep);
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortObjectKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Verifies NOWPayments IPN HMAC-SHA512 signature (`x-nowpayments-sig` header).
 */
export function verifyNowPaymentsIpnSignature(
  payload: Record<string, any>,
  signatureHeader: string,
  ipnSecret: string
): boolean {
  if (!ipnSecret || !signatureHeader) return false;
  const sortedPayload = sortObjectKeysDeep(payload || {});
  const expectedHex = crypto
    .createHmac('sha512', ipnSecret.trim())
    .update(JSON.stringify(sortedPayload))
    .digest('hex');

  const sigBuf = Buffer.from(signatureHeader.trim().toLowerCase(), 'utf8');
  const expBuf = Buffer.from(expectedHex.toLowerCase(), 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Validates a payment object returned by NOWPayments API or IPN webhook
 * against required status, USD currency, $500 minimum amount, and invoice ID.
 */
export function validateNowPaymentsPayload(
  npData: NowPaymentsApiPayment | null | undefined,
  expectedAmountUsd: number = SUBSCRIPTION_PRICE_USD,
  expectedInvoiceId: string = NOWPAYMENTS_INVOICE_ID
): NowPaymentsValidationResult {
  if (!npData || typeof npData !== 'object') {
    return {
      outcome: 'not_found',
      reason: 'Payment record returned by NOWPayments is empty.',
    };
  }

  const rawStatus = String(npData.payment_status || '').trim().toLowerCase();
  const priceCurrency = String(npData.price_currency || '').trim().toLowerCase();
  const priceAmount = Number(npData.price_amount);

  if (priceCurrency && priceCurrency !== 'usd') {
    return {
      outcome: 'rejected',
      paymentStatus: rawStatus || 'invalid_currency',
      paymentData: npData,
      reason: `NOWPayments invoice currency mismatch: expected USD, received ${priceCurrency.toUpperCase()}.`,
    };
  }

  if (!Number.isFinite(priceAmount) || priceAmount < expectedAmountUsd) {
    return {
      outcome: 'rejected',
      paymentStatus: rawStatus || 'underpaid',
      paymentData: npData,
      reason: `NOWPayments payment amount ($${Number.isFinite(priceAmount) ? priceAmount : 0} USD) is below the required $${expectedAmountUsd} USD subscription fee.`,
    };
  }

  if (
    npData.invoice_id !== undefined &&
    npData.invoice_id !== null &&
    String(npData.invoice_id).trim() !== '' &&
    String(npData.invoice_id).trim() !== expectedInvoiceId
  ) {
    return {
      outcome: 'rejected',
      paymentStatus: rawStatus || 'wrong_invoice',
      paymentData: npData,
      reason: `NOWPayments invoice mismatch: expected invoice ${expectedInvoiceId}, got ${npData.invoice_id}.`,
    };
  }

  if (VERIFIED_STATUSES.has(rawStatus)) {
    if (npData.actually_paid !== undefined && npData.actually_paid !== null) {
      const actuallyPaid = Number(npData.actually_paid);
      if (Number.isFinite(actuallyPaid) && actuallyPaid <= 0) {
        return {
          outcome: 'rejected',
          paymentStatus: rawStatus,
          paymentData: npData,
          reason: 'NOWPayments reports zero actual crypto funds received for this payment.',
        };
      }
    }

    return {
      outcome: 'verified',
      paymentStatus: rawStatus,
      paymentData: npData,
      reason: `Verified by NOWPayments (${rawStatus.toUpperCase()} — $${priceAmount} USD).`,
    };
  }

  if (PENDING_STATUSES.has(rawStatus)) {
    return {
      outcome: 'pending',
      paymentStatus: rawStatus,
      paymentData: npData,
      reason: `NOWPayments reports payment status "${rawStatus}". Waiting for blockchain confirmation before unlocking.`,
    };
  }

  if (FAILED_STATUSES.has(rawStatus)) {
    return {
      outcome: 'rejected',
      paymentStatus: rawStatus,
      paymentData: npData,
      reason: `NOWPayments payment is "${rawStatus}" and cannot unlock the dashboard.`,
    };
  }

  return {
    outcome: 'pending',
    paymentStatus: rawStatus || 'unknown',
    paymentData: npData,
    reason: `NOWPayments payment status "${rawStatus || 'unknown'}" is not yet confirmed.`,
  };
}

/**
 * Checks if a NOWPayments reference or NOWPayments payment_id has already been redeemed
 * or is currently queued by a different user (prevents replay/reuse attacks).
 */
export function findConflictingPaymentRecord(
  payments: PaymentRecord[] | undefined,
  reference: string,
  userId: string
): PaymentRecord | undefined {
  const cleanLower = reference.trim().toLowerCase();
  if (!cleanLower || !Array.isArray(payments)) return undefined;

  return payments.find((p) => {
    const existingRef = (p.paymentReference || '').trim().toLowerCase();
    if (!existingRef || existingRef !== cleanLower) return false;
    if (p.status === 'confirmed' || p.status === 'granted_by_admin') {
      return true; // Already redeemed by anyone
    }
    if (p.status === 'pending_verification' && p.userId !== userId) {
      return true; // Already claimed by another operator
    }
    return false;
  });
}

/**
 * Queries the NOWPayments REST API (`GET /v1/payment/:id` or recent payments list)
 * to verify whether a submitted reference is genuinely paid and finished in NOWPayments.
 */
export async function verifyPaymentWithNowPaymentsApi(
  paymentReference: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<NowPaymentsValidationResult> {
  const cleanRef = paymentReference.trim();
  if (!apiKey) {
    return {
      outcome: 'api_error',
      reason: 'NOWPAYMENTS_API_KEY is not configured on the server.',
    };
  }

  try {
    // Direct lookup if reference looks like a NOWPayments numeric payment_id
    if (/^\d{6,20}$/.test(cleanRef)) {
      const npRes = await fetchFn(
        `https://api.nowpayments.io/v1/payment/${encodeURIComponent(cleanRef)}`,
        { headers: { 'x-api-key': apiKey } }
      );

      if (npRes.status === 404 || npRes.status === 400) {
        return {
          outcome: 'not_found',
          reason: `Payment ID "${cleanRef}" was not found in NOWPayments.`,
        };
      }
      if (npRes.status === 401 || npRes.status === 403) {
        return {
          outcome: 'api_error',
          reason: 'NOWPayments API key rejected verification lookup.',
        };
      }
      if (!npRes.ok) {
        return {
          outcome: 'api_error',
          reason: `NOWPayments verification API returned HTTP ${npRes.status}.`,
        };
      }

      const npData = (await npRes.json()) as NowPaymentsApiPayment;
      return validateNowPaymentsPayload(npData);
    }

    // Fallback lookup by transaction hash (payin_hash), purchase_id, or order_id
    const listRes = await fetchFn(
      'https://api.nowpayments.io/v1/payment/?limit=50&sortBy=created_at&orderBy=desc',
      { headers: { 'x-api-key': apiKey } }
    );

    if (listRes.status === 401 || listRes.status === 403) {
      return {
        outcome: 'api_error',
        reason: 'NOWPayments API key rejected verification lookup.',
      };
    }
    if (!listRes.ok) {
      return {
        outcome: 'api_error',
        reason: `NOWPayments payment search API returned HTTP ${listRes.status}.`,
      };
    }

    const listData: any = await listRes.json();
    const candidates: NowPaymentsApiPayment[] = Array.isArray(listData?.data) ? listData.data : [];
    const targetLower = cleanRef.toLowerCase();

    const matched = candidates.find((item) => {
      const pid = item.payment_id !== undefined && item.payment_id !== null ? String(item.payment_id).toLowerCase() : '';
      const hash = item.payin_hash ? String(item.payin_hash).toLowerCase() : '';
      const pur = item.purchase_id !== undefined && item.purchase_id !== null ? String(item.purchase_id).toLowerCase() : '';
      const ord = item.order_id ? String(item.order_id).toLowerCase() : '';
      return pid === targetLower || hash === targetLower || pur === targetLower || ord === targetLower;
    });

    if (!matched) {
      return {
        outcome: 'not_found',
        reason: `No NOWPayments transaction matching "${cleanRef}" was found. Enter your numeric NOWPayments Payment ID or confirmed transaction hash.`,
      };
    }

    return validateNowPaymentsPayload(matched);
  } catch (err: any) {
    return {
      outcome: 'api_error',
      reason: `Unable to reach NOWPayments API for verification: ${err?.message || 'network error'}`,
    };
  }
}

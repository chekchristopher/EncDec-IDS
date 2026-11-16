/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { describe, it, expect } from 'vitest';
import {
  verifyNowPaymentsIpnSignature,
  validateNowPaymentsPayload,
  findConflictingPaymentRecord,
  verifyPaymentWithNowPaymentsApi,
} from '../nowPaymentsService.js';
import { PaymentRecord } from '../../../src/types.js';

describe('NOWPayments strict verification service', () => {
  it('verifies only finished/confirmed $500 USD payments matching invoice 6215083042', () => {
    const ok = validateNowPaymentsPayload({
      payment_id: 5849201432,
      invoice_id: 6215083042,
      payment_status: 'finished',
      price_amount: 500,
      price_currency: 'usd',
      pay_amount: 500,
      actually_paid: 500,
      pay_currency: 'usdttrc20',
    });
    expect(ok.outcome).toBe('verified');
    expect(ok.paymentStatus).toBe('finished');

    const confirmed = validateNowPaymentsPayload({
      payment_id: 5849201433,
      invoice_id: '6215083042',
      payment_status: 'confirmed',
      price_amount: 500,
      price_currency: 'USD',
      actually_paid: 0.015,
    });
    expect(confirmed.outcome).toBe('verified');
  });

  it('keeps waiting/confirming/sending payments as pending and never verified', () => {
    for (const status of ['waiting', 'confirming', 'sending']) {
      const res = validateNowPaymentsPayload({
        payment_id: 5849201434,
        invoice_id: '6215083042',
        payment_status: status,
        price_amount: 500,
        price_currency: 'usd',
      });
      expect(res.outcome).toBe('pending');
      expect(res.paymentStatus).toBe(status);
    }
  });

  it('rejects underpaid, wrong currency, wrong invoice, zero actual paid, and failed statuses', () => {
    expect(
      validateNowPaymentsPayload({
        payment_status: 'finished',
        price_amount: 450,
        price_currency: 'usd',
        invoice_id: '6215083042',
      }).outcome
    ).toBe('rejected');

    expect(
      validateNowPaymentsPayload({
        payment_status: 'finished',
        price_amount: 500,
        price_currency: 'eur',
        invoice_id: '6215083042',
      }).outcome
    ).toBe('rejected');

    expect(
      validateNowPaymentsPayload({
        payment_status: 'finished',
        price_amount: 500,
        price_currency: 'usd',
        invoice_id: '9999999999',
      }).outcome
    ).toBe('rejected');

    expect(
      validateNowPaymentsPayload({
        payment_status: 'finished',
        price_amount: 500,
        price_currency: 'usd',
        invoice_id: '6215083042',
        actually_paid: 0,
      }).outcome
    ).toBe('rejected');

    for (const badStatus of ['failed', 'expired', 'refunded', 'partially_paid']) {
      expect(
        validateNowPaymentsPayload({
          payment_status: badStatus,
          price_amount: 500,
          price_currency: 'usd',
          invoice_id: '6215083042',
        }).outcome
      ).toBe('rejected');
    }
  });

  it('validates NOWPayments HMAC-SHA512 IPN signature over sorted payload keys', () => {
    const secret = 'test-ipn-secret-123';
    const payload = {
      payment_status: 'finished',
      payment_id: 5849201432,
      price_amount: 500,
      price_currency: 'usd',
    };
    const sorted = {
      payment_id: 5849201432,
      payment_status: 'finished',
      price_amount: 500,
      price_currency: 'usd',
    };
    const sig = crypto.createHmac('sha512', secret).update(JSON.stringify(sorted)).digest('hex');

    expect(verifyNowPaymentsIpnSignature(payload, sig, secret)).toBe(true);
    expect(verifyNowPaymentsIpnSignature({ ...payload, price_amount: 10 }, sig, secret)).toBe(false);
    expect(verifyNowPaymentsIpnSignature(payload, 'deadbeef', secret)).toBe(false);
  });

  it('prevents payment reference replay across users or already-confirmed payments', () => {
    const history: PaymentRecord[] = [
      {
        id: 'pay_1',
        userId: 'usr_a',
        userEmail: 'a@sec.io',
        userName: 'User A',
        amountUsd: 500,
        billingCycleMonths: 3,
        provider: 'nowpayments',
        invoiceId: '6215083042',
        paymentReference: '5849201432',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pay_2',
        userId: 'usr_b',
        userEmail: 'b@sec.io',
        userName: 'User B',
        amountUsd: 500,
        billingCycleMonths: 3,
        provider: 'nowpayments',
        invoiceId: '6215083042',
        paymentReference: '999888777',
        status: 'pending_verification',
        createdAt: new Date().toISOString(),
      },
    ];

    expect(findConflictingPaymentRecord(history, '5849201432', 'usr_a')?.id).toBe('pay_1');
    expect(findConflictingPaymentRecord(history, '5849201432', 'usr_c')?.id).toBe('pay_1');
    expect(findConflictingPaymentRecord(history, '999888777', 'usr_c')?.id).toBe('pay_2');
    expect(findConflictingPaymentRecord(history, '999888777', 'usr_b')).toBeUndefined();
  });

  it('queries NOWPayments REST API for numeric IDs and blockchain tx hashes', async () => {
    const fakeFetch = (async (url: string) => {
      if (url.endsWith('/5849201432')) {
        return new Response(
          JSON.stringify({
            payment_id: 5849201432,
            invoice_id: '6215083042',
            payment_status: 'finished',
            price_amount: 500,
            price_currency: 'usd',
            actually_paid: 500,
            pay_currency: 'usdttrc20',
          }),
          { status: 200 }
        );
      }
      if (url.endsWith('/11111111')) {
        return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
      }
      if (url.includes('?limit=50')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                payment_id: 777123456,
                invoice_id: '6215083042',
                payment_status: 'confirming',
                price_amount: 500,
                price_currency: 'usd',
                payin_hash: '0xabc123def456',
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 500 });
    }) as unknown as typeof fetch;

    const ok = await verifyPaymentWithNowPaymentsApi('5849201432', 'np-key', fakeFetch);
    expect(ok.outcome).toBe('verified');

    const missing = await verifyPaymentWithNowPaymentsApi('11111111', 'np-key', fakeFetch);
    expect(missing.outcome).toBe('not_found');

    const txPending = await verifyPaymentWithNowPaymentsApi('0xabc123def456', 'np-key', fakeFetch);
    expect(txPending.outcome).toBe('pending');
    expect(txPending.paymentStatus).toBe('confirming');
  });
});

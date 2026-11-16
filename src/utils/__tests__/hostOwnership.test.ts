/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  filterHostsForUser,
  isHostOwnedByUser,
  sanitizeOwnedHosts,
  filterAlertsForUser,
  filterThreatsForUser,
  isAlertOwnedByUser,
} from '../hostOwnership.js';
import type { Alert, Host, Threat } from '../../types.js';

const sampleHosts: Host[] = [
  {
    id: 'hst_admin_1',
    ownerId: 'usr_1',
    ownerEmail: 'chekchris85@gmail.com',
    name: 'admin-prod-node',
    os: 'linux',
    ipAddress: '10.0.1.10',
    status: 'online',
    lastSeen: '2026-11-16T00:00:00.000Z',
    agentVersion: 'v4.1.2-agent',
    cpuUsage: 15,
    memoryUsage: 30,
    diskUsage: 40,
    createdAt: '2026-11-16T00:00:00.000Z',
  },
  {
    id: 'hst_user_1',
    ownerId: 'usr_2',
    ownerEmail: 'analyst@enterprise.sec',
    name: 'user-edge-node',
    os: 'macos',
    ipAddress: '192.168.10.42',
    status: 'online',
    lastSeen: '2026-11-16T00:00:00.000Z',
    agentVersion: 'v4.1.2-agent',
    cpuUsage: 12,
    memoryUsage: 24,
    diskUsage: 55,
    createdAt: '2026-11-16T00:00:00.000Z',
  },
  {
    id: 'hst_legacy_unowned',
    name: 'portal.coou.edu.ng',
    os: 'linux',
    ipAddress: '104.24.12.83',
    status: 'online',
    lastSeen: '2026-11-16T00:00:00.000Z',
    agentVersion: 'v4.1.2-agent',
    cpuUsage: 20,
    memoryUsage: 40,
    diskUsage: 60,
    createdAt: '2026-11-16T00:00:00.000Z',
  },
];

const sampleAlerts: Alert[] = [
  {
    id: 'alt_real_admin_1',
    ownerId: 'usr_1',
    hostId: 'hst_admin_1',
    timestamp: '2026-11-16T00:00:00.000Z',
    severity: 'critical',
    title: 'Admin Node Alert',
    description: 'Attack on admin node',
    category: 'SQLi',
    source: '185.220.101.42',
    target: 'admin-prod-node',
    status: 'unhandled',
  },
  {
    id: 'alt_real_user_1',
    hostId: 'hst_user_1',
    timestamp: '2026-11-16T00:00:00.000Z',
    severity: 'high',
    title: 'User Edge Alert',
    description: 'Attack on user edge node',
    category: 'XSS',
    source: '45.33.32.156',
    target: '192.168.10.42',
    status: 'unhandled',
  },
  {
    id: 'alt_real_global_server',
    timestamp: '2026-11-16T00:00:00.000Z',
    severity: 'critical',
    title: 'Global Server Poll',
    description: 'Hit localhost:3000',
    category: 'Command Injection',
    source: '105.112.225.13',
    target: 'localhost:3000',
    status: 'unhandled',
  },
];

const sampleThreats: Threat[] = [
  {
    id: 'thr_admin',
    ownerId: 'usr_1',
    timestamp: '2026-11-16T00:00:00.000Z',
    score: 95,
    actor: 'APT',
    vector: 'SQLi',
    status: 'active',
    associatedAlerts: ['alt_real_admin_1'],
  },
  {
    id: 'thr_global',
    timestamp: '2026-11-16T00:00:00.000Z',
    score: 80,
    actor: 'Unknown',
    vector: 'Command Injection',
    status: 'active',
    associatedAlerts: ['alt_real_global_server'],
  },
];

describe('hostOwnership', () => {
  it('returns only hosts belonging to the requested userId and excludes admin & unowned hosts', () => {
    const adminHosts = filterHostsForUser(sampleHosts, 'usr_1');
    expect(adminHosts.map((h) => h.id)).toEqual(['hst_admin_1']);

    const userHosts = filterHostsForUser(sampleHosts, 'usr_2');
    expect(userHosts.map((h) => h.id)).toEqual(['hst_user_1']);

    const newUserHosts = filterHostsForUser(sampleHosts, 'usr_3');
    expect(newUserHosts).toEqual([]);
  });

  it('returns empty array when userId is missing or null', () => {
    expect(filterHostsForUser(sampleHosts, null)).toEqual([]);
    expect(filterHostsForUser(sampleHosts, undefined)).toEqual([]);
    expect(filterHostsForUser(sampleHosts, '')).toEqual([]);
  });

  it('enforces strict per-user ownership check', () => {
    expect(isHostOwnedByUser(sampleHosts[0], 'usr_1')).toBe(true);
    expect(isHostOwnedByUser(sampleHosts[0], 'usr_2')).toBe(false);
    expect(isHostOwnedByUser(sampleHosts[1], 'usr_1')).toBe(false);
    expect(isHostOwnedByUser(sampleHosts[2], 'usr_1')).toBe(false);
  });

  it('strips legacy unowned hosts during sanitization', () => {
    const cleaned = sanitizeOwnedHosts(sampleHosts);
    expect(cleaned.map((h) => h.id)).toEqual(['hst_admin_1', 'hst_user_1']);
  });

  it('returns empty alerts and threats when a user has 0 enrolled nodes', () => {
    expect(filterAlertsForUser(sampleAlerts, [], 'usr_3')).toEqual([]);
    expect(filterAlertsForUser(sampleAlerts, [], 'usr_1')).toEqual([]);
    expect(filterThreatsForUser(sampleThreats, [], [], 'usr_3')).toEqual([]);
  });

  it('isolates alerts and threats strictly to each user own enrolled nodes', () => {
    const adminHosts = filterHostsForUser(sampleHosts, 'usr_1');
    const userHosts = filterHostsForUser(sampleHosts, 'usr_2');

    const adminAlerts = filterAlertsForUser(sampleAlerts, adminHosts, 'usr_1');
    expect(adminAlerts.map((a) => a.id)).toEqual(['alt_real_admin_1']);

    const userAlerts = filterAlertsForUser(sampleAlerts, userHosts, 'usr_2');
    expect(userAlerts.map((a) => a.id)).toEqual(['alt_real_user_1']);

    expect(isAlertOwnedByUser(sampleAlerts[0], userHosts, 'usr_2')).toBe(false);
    expect(isAlertOwnedByUser(sampleAlerts[2], userHosts, 'usr_2')).toBe(false);

    expect(filterThreatsForUser(sampleThreats, adminHosts, adminAlerts, 'usr_1').map((t) => t.id)).toEqual(['thr_admin']);
    expect(filterThreatsForUser(sampleThreats, userHosts, userAlerts, 'usr_2')).toEqual([]);
  });
});

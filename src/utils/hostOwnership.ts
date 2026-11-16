/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Alert, Host, Threat } from '../types.js';

/**
 * Returns only enrolled nodes explicitly owned by the specified userId.
 * Admin and regular users both see strictly their own enrolled nodes.
 */
export function filterHostsForUser(hosts: Host[] | undefined | null, userId?: string | null): Host[] {
  if (!Array.isArray(hosts) || !userId) {
    return [];
  }
  return hosts.filter((host) => Boolean(host && host.ownerId && host.ownerId === userId));
}

/**
 * Checks whether a specific host record belongs to the given userId.
 */
export function isHostOwnedByUser(host: Host | undefined | null, userId?: string | null): boolean {
  return Boolean(host && userId && host.ownerId && host.ownerId === userId);
}

/**
 * Strips legacy/unowned hosts that do not have a valid ownerId.
 */
export function sanitizeOwnedHosts(hosts: Host[] | undefined | null): Host[] {
  if (!Array.isArray(hosts)) {
    return [];
  }
  return hosts.filter((host) => Boolean(host && host.ownerId));
}

/**
 * Checks whether an alert belongs to one of a user's own enrolled nodes.
 * If the user has 0 enrolled nodes, no alerts or incursions are surfaced.
 */
export function isAlertOwnedByUser(
  alert: Alert | undefined | null,
  userHosts: Host[],
  userId?: string | null
): boolean {
  if (!alert || !userId || !Array.isArray(userHosts) || userHosts.length === 0) {
    return false;
  }

  if (alert.ownerId) {
    return alert.ownerId === userId;
  }

  const hostIds = new Set(userHosts.map((h) => h.id));
  if (alert.hostId && hostIds.has(alert.hostId)) {
    return true;
  }

  const targetLower = (alert.target || '').toLowerCase();
  const sourceLower = (alert.source || '').toLowerCase();

  return userHosts.some((host) => {
    const name = (host.name || '').trim().toLowerCase();
    const ip = (host.ipAddress || '').trim().toLowerCase();
    const matchName = Boolean(name && (targetLower === name || targetLower.includes(name) || sourceLower === name));
    const matchIp = Boolean(ip && (targetLower === ip || targetLower.includes(ip) || sourceLower === ip));
    return matchName || matchIp;
  });
}

/**
 * Filters alerts so users only see detections tied to their own enrolled nodes.
 */
export function filterAlertsForUser(
  alerts: Alert[] | undefined | null,
  userHosts: Host[],
  userId?: string | null
): Alert[] {
  if (!Array.isArray(alerts) || !userId || !Array.isArray(userHosts) || userHosts.length === 0) {
    return [];
  }
  return alerts.filter((alert) => isAlertOwnedByUser(alert, userHosts, userId));
}

/**
 * Filters threat vectors so users only see threats correlated to their own enrolled nodes/alerts.
 */
export function filterThreatsForUser(
  threats: Threat[] | undefined | null,
  userHosts: Host[],
  userAlerts: Alert[],
  userId?: string | null
): Threat[] {
  if (!Array.isArray(threats) || !userId || !Array.isArray(userHosts) || userHosts.length === 0) {
    return [];
  }
  const alertIds = new Set(userAlerts.map((a) => a.id));
  return threats.filter(
    (threat) =>
      Boolean(threat) &&
      (threat.ownerId === userId ||
        (Array.isArray(threat.associatedAlerts) && threat.associatedAlerts.some((id) => alertIds.has(id))))
  );
}

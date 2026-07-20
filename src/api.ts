/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper to determine API & WS endpoints dynamically
const protocol = window.location.protocol;
const host = window.location.host;
export const API_BASE = `${protocol}//${host}`;
export const WS_BASE = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/ws`;

// Get stored session token
export function getAuthToken(): string | null {
  return localStorage.getItem('encdec_ids_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('encdec_ids_token', token);
  } else {
    localStorage.removeItem('encdec_ids_token');
  }
}

// Perform authenticated API request
export async function apiRequest(endpoint: string, method = 'GET', body: any = null, customHeaders: Record<string, string> = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

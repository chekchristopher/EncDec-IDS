/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGoogleAccessToken } from './googleAuth.js';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  internalDate: string;
  labelIds: string[];
  isUnread: boolean;
  hasAttachment?: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyText: string;
  bodyHtml?: string;
  headers: Record<string, string>;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

// Encode utf-8 string to base64url
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Decode base64url string to utf-8
function base64UrlDecode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return '';
  }
}

// Helper to execute authenticated Gmail API fetch
async function gmailFetch(endpoint: string, options: RequestInit = {}) {
  const token = await getGoogleAccessToken();
  if (!token) {
    throw new Error('No Google Access Token available. Please connect your Google account.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || `Gmail API error ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

// Fetch user profile stats
export async function getGmailProfile(): Promise<GmailProfile> {
  return gmailFetch('/profile');
}

// Fetch user labels
export async function getGmailLabels(): Promise<GmailLabel[]> {
  const res = await gmailFetch('/labels');
  return res.labels || [];
}

// List messages with search query or label filter
export async function listGmailMessages(
  query: string = '', 
  labelIds: string[] = ['INBOX'], 
  maxResults: number = 25,
  pageToken?: string
): Promise<{ messages: GmailMessageSummary[]; nextPageToken?: string; resultSizeEstimate: number }> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (labelIds && labelIds.length > 0 && !query) {
    labelIds.forEach((lbl) => params.append('labelIds', lbl));
  }
  params.set('maxResults', maxResults.toString());
  if (pageToken) params.set('pageToken', pageToken);

  const res = await gmailFetch(`/messages?${params.toString()}`);
  const rawList: { id: string; threadId: string }[] = res.messages || [];

  if (rawList.length === 0) {
    return { messages: [], nextPageToken: undefined, resultSizeEstimate: 0 };
  }

  // Fetch summaries in parallel (batched limit of max 20)
  const summaries = await Promise.all(
    rawList.slice(0, 20).map(async (item) => {
      try {
        const msg = await gmailFetch(`/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`);
        const headers: Record<string, string> = {};
        (msg.payload?.headers || []).forEach((h: { name: string; value: string }) => {
          headers[h.name.toLowerCase()] = h.value;
        });

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: msg.snippet || '',
          from: headers['from'] || 'Unknown Sender',
          to: headers['to'] || '',
          subject: headers['subject'] || '(No Subject)',
          date: headers['date'] || new Date(parseInt(msg.internalDate || '0')).toLocaleString(),
          internalDate: msg.internalDate,
          labelIds: msg.labelIds || [],
          isUnread: (msg.labelIds || []).includes('UNREAD')
        } as GmailMessageSummary;
      } catch (err) {
        return {
          id: item.id,
          threadId: item.threadId,
          snippet: '',
          from: 'Unknown',
          to: '',
          subject: '(Message unavailable)',
          date: '',
          internalDate: '0',
          labelIds: [],
          isUnread: false
        } as GmailMessageSummary;
      }
    })
  );

  return {
    messages: summaries,
    nextPageToken: res.nextPageToken,
    resultSizeEstimate: res.resultSizeEstimate || summaries.length
  };
}

// Get full message body and details
export async function getGmailMessageDetail(messageId: string): Promise<GmailMessageDetail> {
  const msg = await gmailFetch(`/messages/${messageId}?format=full`);
  const headers: Record<string, string> = {};
  (msg.payload?.headers || []).forEach((h: { name: string; value: string }) => {
    headers[h.name.toLowerCase()] = h.value;
  });

  let bodyText = '';
  let bodyHtml = '';

  const extractBody = (part: any) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText += base64UrlDecode(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml += base64UrlDecode(part.body.data);
    }

    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractBody);
    }
  };

  if (msg.payload) {
    if (msg.payload.body?.data) {
      if (msg.payload.mimeType === 'text/html') {
        bodyHtml = base64UrlDecode(msg.payload.body.data);
      } else {
        bodyText = base64UrlDecode(msg.payload.body.data);
      }
    }
    if (msg.payload.parts) {
      msg.payload.parts.forEach(extractBody);
    }
  }

  // Fallback if only HTML exists
  if (!bodyText && bodyHtml) {
    const tempEl = document.createElement('div');
    tempEl.innerHTML = bodyHtml;
    bodyText = tempEl.textContent || tempEl.innerText || '';
  }

  return {
    id: msg.id,
    threadId: msg.threadId,
    snippet: msg.snippet || '',
    from: headers['from'] || 'Unknown Sender',
    to: headers['to'] || '',
    subject: headers['subject'] || '(No Subject)',
    date: headers['date'] || new Date(parseInt(msg.internalDate || '0')).toLocaleString(),
    internalDate: msg.internalDate,
    labelIds: msg.labelIds || [],
    isUnread: (msg.labelIds || []).includes('UNREAD'),
    bodyText: bodyText || msg.snippet || '(Empty message body)',
    bodyHtml: bodyHtml || undefined,
    headers
  };
}

// Send an email (RFC 2822 format)
export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string;
  bcc?: string;
}): Promise<{ id: string; threadId: string; labelIds: string[] }> {
  const { to, subject, body, isHtml, cc, bcc } = params;

  let emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    isHtml ? 'Content-Type: text/html; charset=UTF-8' : 'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit'
  ];

  if (cc) emailLines.push(`Cc: ${cc}`);
  if (bcc) emailLines.push(`Bcc: ${bcc}`);
  emailLines.push('');
  emailLines.push(body);

  const rawMime = emailLines.join('\r\n');
  const encodedRaw = base64UrlEncode(rawMime);

  return gmailFetch('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: encodedRaw })
  });
}

// Modify labels (e.g., mark as read / unread / star)
export async function modifyGmailMessage(
  messageId: string, 
  addLabelIds: string[] = [], 
  removeLabelIds: string[] = []
): Promise<{ id: string; labelIds: string[] }> {
  return gmailFetch(`/messages/${messageId}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      addLabelIds,
      removeLabelIds
    })
  });
}

// Trash a message (moves to trash)
export async function trashGmailMessage(messageId: string): Promise<{ id: string; threadId: string }> {
  return gmailFetch(`/messages/${messageId}/trash`, {
    method: 'POST'
  });
}

// Permanently delete a message
export async function deleteGmailMessage(messageId: string): Promise<void> {
  await gmailFetch(`/messages/${messageId}`, {
    method: 'DELETE'
  });
}

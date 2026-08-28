/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'analyst', 'operator', 'auditor']).default('analyst'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address format'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address format').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
});

export const mfaToggleSchema = z.object({
  mfaEnabled: z.boolean(),
});

export const hostRegisterSchema = z.object({
  name: z.string().min(2, 'Host name is required'),
  os: z.enum(['linux', 'windows', 'darwin', 'other']),
  ipAddress: z.string().min(3, 'Valid IP Address is required'),
  agentVersion: z.string().default('v4.1.2-agent'),
});

export const ruleCreateSchema = z.object({
  name: z.string().min(3, 'Rule name must be at least 3 characters'),
  type: z.enum(['signature', 'anomaly', 'behavior']),
  target: z.enum(['network', 'host', 'application']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  definition: z.string().min(2, 'Rule definition is required'),
  mitreMapping: z.string().optional(),
});

export const reportGenerateSchema = z.object({
  title: z.string().min(2, 'Report title is required'),
  type: z.enum(['PDF', 'CSV', 'JSON']).default('PDF'),
  timeframe: z.string().default('Last 24 Hours'),
});

export const apiKeyCreateSchema = z.object({
  name: z.string().min(2, 'API Key name is required'),
  role: z.enum(['admin', 'analyst', 'agent']).default('agent'),
  expiresDays: z.number().int().positive().default(365),
});

export const quarantineSchema = z.object({
  hostId: z.string().min(1, 'Host ID is required'),
  action: z.enum(['isolate', 'kill_process', 'quarantine_file', 'block_ip']),
  reason: z.string().min(3, 'Quarantine reason is required'),
});

export const emailTestSchema = z.object({
  to: z.string().email('Valid recipient email required').optional(),
  recipient: z.string().email('Valid recipient email required').optional(),
  subject: z.string().min(1, 'Subject is required').optional(),
  body: z.string().min(1, 'Body is required').optional(),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  role: z.enum(['admin', 'analyst', 'operator', 'auditor']).default('analyst'),
  type: z.enum(['registration', 'login', 'create', 'incident', 'custom']).default('login'),
  threatLevel: z.string().optional(),
  incidentId: z.string().optional(),
});

export const emailDispatchSchema = emailTestSchema;

export const aiEmailGenerateSchema = z.object({
  prompt: z.string().min(2, 'Prompt is required to generate email'),
  recipient: z.string().optional(),
  role: z.enum(['admin', 'analyst', 'operator', 'auditor']).optional(),
  type: z.enum(['registration', 'login', 'create', 'incident', 'custom']).optional(),
  tone: z.enum(['urgent', 'professional', 'technical', 'informative']).optional().default('professional'),
});

export const mssqlConfigureSchema = z.object({
  enabled: z.boolean(),
  server: z.string().min(1, 'MSSQL Server host required'),
  port: z.union([z.number(), z.string()]).transform(v => Number(v) || 1433),
  database: z.string().min(1, 'Database name required'),
  authType: z.enum(['sql', 'windows']),
  domain: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  encrypt: z.boolean().default(false),
  trustServerCertificate: z.boolean().default(true),
});

export const mssqlQuerySchema = z.object({
  query: z.string().min(1, 'SQL query cannot be empty'),
});

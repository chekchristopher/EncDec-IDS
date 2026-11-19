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

export const verifyResetCodeSchema = z.object({
  email: z.string().email('Invalid email address format'),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification OTP must be exactly 6 numeric digits'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address format'),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification OTP must be exactly 6 numeric digits'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match. Please enter the same new password twice.',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.confirmPassword || data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
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

export const safeBoxToggleSchema = z.object({
  enabled: z.boolean(),
});

export const safeBoxPasskeySchema = z.object({
  passkey: z.string().min(1, 'Admin Safe Box passkey is required'),
});

export const safeBoxVerifySchema = z.object({
  email: z.string().email('Invalid email address format').optional().or(z.literal('')),
  passkey: z.string().min(1, 'Admin Safe Box passkey is required'),
});

export const hostRegisterSchema = z.object({
  name: z.string().min(2, 'Host name is required'),
  os: z.enum(['linux', 'windows', 'macos', 'darwin', 'other']),
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

export const verifyPaymentSubmissionSchema = z.object({
  paymentReference: z.string().trim().min(4, 'Enter your NOWPayments Payment ID or transaction hash (min 4 characters).'),
  notes: z.string().trim().max(300).optional(),
});

export const adminGrantSubscriptionSchema = z.object({
  months: z.number().int().min(1).max(36).default(3),
  notes: z.string().trim().max(300).optional(),
});

export const adminBillingToggleSchema = z.object({
  subscriptionRequired: z.boolean(),
});

export const adminFreeAccessSchema = z.object({
  enabled: z.boolean(),
  durationValue: z.number().positive().max(8760).optional(),
  durationUnit: z.enum(['minutes', 'hours', 'days', 'months']).optional(),
  durationLabel: z.string().trim().max(60).optional(),
});

export const adminGmailRefreshModeSchema = z.object({
  refreshMode: z.enum(['auto', 'manual']),
});

export const workbookExamSubmitSchema = z.object({
  attemptId: z.string().trim().min(1, 'Attempt ID is required'),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});

export const workbookExamTimeoutSchema = z.object({
  attemptId: z.string().trim().optional(),
});

export const adminExamQuestionCreateSchema = z.object({
  chapterNumber: z.number().int().min(1).max(10),
  difficulty: z.enum(['Hard', 'Advanced']).default('Hard'),
  question: z.string().trim().min(15, 'Question prompt must be at least 15 characters'),
  options: z.tuple([
    z.string().trim().min(1, 'Option A is required'),
    z.string().trim().min(1, 'Option B is required'),
    z.string().trim().min(1, 'Option C is required'),
    z.string().trim().min(1, 'Option D is required'),
  ]),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(15, 'Academic explanation must be at least 15 characters'),
});

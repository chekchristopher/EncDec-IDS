/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, Host, Rule, Alert, Threat, APIKey, 
  AuditLog, LiveActivity, ThreatIntelFeed, MLModel, QuarantineItem, EmailLog
} from '../../src/types.js';

export interface DbSchema {
  users: User[];
  hosts: Host[];
  rules: Rule[];
  alerts: Alert[];
  threats: Threat[];
  apiKeys: APIKey[];
  auditLogs: AuditLog[];
  liveActivities: LiveActivity[];
  threatIntel: ThreatIntelFeed[];
  mlModels: MLModel[];
  quarantine: QuarantineItem[];
  emailLogs: EmailLog[];
}

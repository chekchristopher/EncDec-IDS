/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sql from 'mssql';
import { MssqlConfig, DualDatabaseStatus } from '../../src/types.js';
import { DbSchema } from './schema.js';

export class MssqlSyncService {
  private pool: sql.ConnectionPool | null = null;
  private connected = false;
  private lastError: string | null = null;
  private lastSynced: string | null = null;

  public config: MssqlConfig = {
    server: process.env.MSSQL_SERVER || 'sqlserver.corp.local',
    port: Number(process.env.MSSQL_PORT) || 1433,
    database: process.env.MSSQL_DATABASE || 'EncDec_SOC_DB',
    authType: (process.env.MSSQL_AUTH_TYPE as any) || 'windows',
    domain: process.env.MSSQL_DOMAIN || 'CORP',
    user: process.env.MSSQL_USER || 'Administrator',
    password: process.env.MSSQL_PASSWORD || '',
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== 'false',
    enabled: process.env.MSSQL_ENABLED === 'true'
  };

  constructor() {
    // Initial connection attempt if enabled
    if (this.config.enabled) {
      this.init().catch(() => {});
    }
  }

  public get isConnected(): boolean {
    return this.connected;
  }

  public get getLastError(): string | null {
    return this.lastError;
  }

  public get getLastSynced(): string | null {
    return this.lastSynced;
  }

  private getConfigObject(cfg: MssqlConfig): sql.config {
    const configObj: any = {
      server: cfg.server,
      port: Number(cfg.port) || 1433,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password || '',
      options: {
        encrypt: cfg.encrypt,
        trustServerCertificate: cfg.trustServerCertificate,
        connectTimeout: 5000,
        requestTimeout: 10000
      }
    };

    if (cfg.authType === 'windows' && cfg.domain) {
      configObj.domain = cfg.domain;
    }

    return configObj;
  }

  private formatError(err: any, serverName: string) {
    const msg = err?.message || String(err || 'Failed to connect to Microsoft SQL Server');
    let hint = 'Verify server hostname/IP, port 1433, and authentication credentials.';
    
    if (msg.includes('getaddrinfo') || msg.includes('EAI_AGAIN') || msg.includes('ENOTFOUND')) {
      hint = `Host '${serverName}' is a local computer or unresolvable hostname. Since this backend runs in cloud containers, use a publicly reachable IP address, FQDN domain, or tunneling endpoint.`;
    } else if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
      hint = `Connection timed out reaching ${serverName}:1433. Ensure TCP Port 1433 is forwarded / allowed through firewall rules.`;
    } else if (msg.includes('Login failed') || msg.includes('ELOGIN')) {
      hint = 'Authentication rejected by SQL Server. Check Windows Domain/User and password.';
    }
    return { message: msg, hint };
  }

  public async init(newConfig?: MssqlConfig): Promise<{ success: boolean; error?: string }> {
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
    }

    if (!this.config.enabled) {
      this.connected = false;
      if (this.pool) {
        try { await this.pool.close(); } catch (_) {}
        this.pool = null;
      }
      return { success: true };
    }

    try {
      const configObj = this.getConfigObject(this.config);
      if (this.pool) {
        try { await this.pool.close(); } catch (_) {}
      }
      this.pool = await sql.connect(configObj);
      this.connected = true;
      this.lastError = null;
      console.log(`[MSSQL] Successfully connected to SQL Server: ${this.config.server}/${this.config.database}`);
      await this.ensureSchema();
      return { success: true };
    } catch (err: any) {
      this.connected = false;
      const { message, hint } = this.formatError(err, this.config.server);
      this.lastError = `${message} (Hint: ${hint})`;
      console.warn(`[MSSQL NOTICE] SQL Server connection attempt: ${this.lastError}`);
      return { success: false, error: this.lastError };
    }
  }

  public async ensureSchema() {
    if (!this.pool || !this.connected) return;
    try {
      const ddl = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_AuditLogs' and xtype='U')
        CREATE TABLE dbo.EncDec_AuditLogs (
          id NVARCHAR(64) PRIMARY KEY,
          timestamp NVARCHAR(64),
          userId NVARCHAR(64),
          userEmail NVARCHAR(256),
          action NVARCHAR(256),
          resource NVARCHAR(256),
          ipAddress NVARCHAR(64),
          status NVARCHAR(32)
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_SecurityAlerts' and xtype='U')
        CREATE TABLE dbo.EncDec_SecurityAlerts (
          id NVARCHAR(64) PRIMARY KEY,
          timestamp NVARCHAR(64),
          severity NVARCHAR(32),
          title NVARCHAR(256),
          description NVARCHAR(MAX),
          category NVARCHAR(128),
          source NVARCHAR(128),
          target NVARCHAR(128),
          status NVARCHAR(32),
          mitreMapping NVARCHAR(64)
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_EmailLogs' and xtype='U')
        CREATE TABLE dbo.EncDec_EmailLogs (
          id NVARCHAR(64) PRIMARY KEY,
          timestamp NVARCHAR(64),
          recipient NVARCHAR(256),
          subject NVARCHAR(256),
          bodyText NVARCHAR(MAX),
          type NVARCHAR(32),
          role NVARCHAR(32),
          status NVARCHAR(32)
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_Users' and xtype='U')
        CREATE TABLE dbo.EncDec_Users (
          id NVARCHAR(64) PRIMARY KEY,
          email NVARCHAR(256),
          name NVARCHAR(128),
          role NVARCHAR(32),
          status NVARCHAR(32),
          mfaEnabled BIT,
          createdAt NVARCHAR(64)
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_Rules' and xtype='U')
        CREATE TABLE dbo.EncDec_Rules (
          id NVARCHAR(64) PRIMARY KEY,
          name NVARCHAR(256),
          category NVARCHAR(128),
          severity NVARCHAR(32),
          action NVARCHAR(32),
          pattern NVARCHAR(MAX),
          enabled BIT,
          hits INT,
          mitreTactic NVARCHAR(128)
        );

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncDec_Hosts' and xtype='U')
        CREATE TABLE dbo.EncDec_Hosts (
          id NVARCHAR(64) PRIMARY KEY,
          hostname NVARCHAR(256),
          ip NVARCHAR(64),
          os NVARCHAR(64),
          status NVARCHAR(32),
          lastSeen NVARCHAR(64),
          cpuUsage FLOAT,
          memoryUsage FLOAT,
          threatScore INT
        );
      `;
      await this.pool.request().batch(ddl);
      console.log('[MSSQL] Table schema validation verified (dbo.EncDec_*).');
    } catch (err) {
      console.error('[MSSQL] Error creating schema tables:', err);
    }
  }

  public async syncAll(dbState: DbSchema): Promise<{ success: boolean; error?: string }> {
    if (!this.pool || !this.connected || !this.config.enabled) {
      return { success: false, error: 'MSSQL connection is not active.' };
    }
    try {
      for (const log of (dbState.auditLogs || []).slice(0, 50)) {
        await this.pool.request()
          .input('id', sql.NVarChar(64), log.id)
          .input('timestamp', sql.NVarChar(64), log.timestamp)
          .input('userId', sql.NVarChar(64), log.userId)
          .input('userEmail', sql.NVarChar(256), log.userEmail)
          .input('action', sql.NVarChar(256), log.action)
          .input('resource', sql.NVarChar(256), log.resource)
          .input('ipAddress', sql.NVarChar(64), log.ipAddress)
          .input('status', sql.NVarChar(32), log.status)
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.EncDec_AuditLogs WHERE id = @id)
              UPDATE dbo.EncDec_AuditLogs SET status = @status WHERE id = @id;
            ELSE
              INSERT INTO dbo.EncDec_AuditLogs (id, timestamp, userId, userEmail, action, resource, ipAddress, status)
              VALUES (@id, @timestamp, @userId, @userEmail, @action, @resource, @ipAddress, @status);
          `);
      }

      for (const alert of (dbState.alerts || []).slice(0, 50)) {
        await this.pool.request()
          .input('id', sql.NVarChar(64), alert.id)
          .input('timestamp', sql.NVarChar(64), alert.timestamp)
          .input('severity', sql.NVarChar(32), alert.severity)
          .input('title', sql.NVarChar(256), alert.title)
          .input('description', sql.NVarChar(sql.MAX), alert.description)
          .input('category', sql.NVarChar(128), alert.category)
          .input('source', sql.NVarChar(128), alert.source)
          .input('target', sql.NVarChar(128), alert.target || '')
          .input('status', sql.NVarChar(32), alert.status)
          .input('mitreMapping', sql.NVarChar(64), alert.mitreMapping || '')
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.EncDec_SecurityAlerts WHERE id = @id)
              UPDATE dbo.EncDec_SecurityAlerts SET status = @status WHERE id = @id;
            ELSE
              INSERT INTO dbo.EncDec_SecurityAlerts (id, timestamp, severity, title, description, category, source, target, status, mitreMapping)
              VALUES (@id, @timestamp, @severity, @title, @description, @category, @source, @target, @status, @mitreMapping);
          `);
      }

      for (const email of (dbState.emailLogs || []).slice(0, 50)) {
        await this.pool.request()
          .input('id', sql.NVarChar(64), email.id)
          .input('timestamp', sql.NVarChar(64), email.timestamp)
          .input('recipient', sql.NVarChar(256), email.recipient)
          .input('subject', sql.NVarChar(256), email.subject)
          .input('bodyText', sql.NVarChar(sql.MAX), email.bodyText)
          .input('type', sql.NVarChar(32), email.type)
          .input('role', sql.NVarChar(32), email.role)
          .input('status', sql.NVarChar(32), email.status)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.EncDec_EmailLogs WHERE id = @id)
              INSERT INTO dbo.EncDec_EmailLogs (id, timestamp, recipient, subject, bodyText, type, role, status)
              VALUES (@id, @timestamp, @recipient, @subject, @bodyText, @type, @role, @status);
          `);
      }

      this.lastSynced = new Date().toISOString();
      return { success: true };
    } catch (err: any) {
      console.error('[MSSQL] Sync error:', err);
      return { success: false, error: err?.message || 'Sync operation failed' };
    }
  }

  public async executeQuery(queryString: string): Promise<any[]> {
    if (!this.pool || !this.connected) {
      throw new Error('MSSQL database is not connected');
    }
    const result = await this.pool.request().query(queryString);
    return result.recordset || [];
  }
}

export const mssqlSyncService = new MssqlSyncService();

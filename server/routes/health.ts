/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { firestoreSyncService } from '../db/firestore.js';
import { mssqlSyncService } from '../db/mssql.js';

export function createHealthRouter(getWsCount: () => number) {
  const router = Router();

  router.get('/health', (req: Request, res: Response) => {
    const memory = process.memoryUsage();
    const isDegraded = firestoreSyncService.isQuotaExceeded;

    res.json({
      status: isDegraded ? 'degraded' : 'ok',
      service: 'EncDec IDS Security Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      },
      services: {
        firestore: {
          available: firestoreSyncService.isConnected,
          quotaExceeded: firestoreSyncService.isQuotaExceeded,
        },
        mssql: {
          enabled: mssqlSyncService.config.enabled,
          connected: mssqlSyncService.isConnected,
          lastSynced: mssqlSyncService.getLastSynced,
          lastError: mssqlSyncService.getLastError,
        },
        websocket: {
          activeClients: getWsCount(),
        },
      },
    });
  });

  router.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  return router;
}

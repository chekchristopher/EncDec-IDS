/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, Firestore } from 'firebase/firestore';
import { DbSchema } from './schema.js';
import { DEFAULT_DB } from './seed.js';

export class FirestoreSyncService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private quotaExceeded = false;
  private lastQuotaWarning = 0;
  private isSyncing = false;
  private pendingSync = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const configFile = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        const firebaseConfig = {
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        };
        this.app = initializeApp(firebaseConfig);
        const dbId = config.firestoreDatabaseId || 'ai-studio-encdecids-bc136ca4-82a5-408e-ae8f-57533ab6060c';
        this.db = dbId ? getFirestore(this.app, dbId) : getFirestore(this.app);
        console.log(`[Firestore] Initialized with project ID: ${config.projectId}, database: ${dbId}`);
      } catch (error) {
        console.error('[Firestore] Initialization error:', error);
      }
    } else {
      console.log('[Firestore] No firebase-applet-config.json found, operating in local persistence mode.');
    }
  }

  public get isConnected(): boolean {
    return !!this.db && !this.quotaExceeded;
  }

  public get isQuotaExceeded(): boolean {
    return this.quotaExceeded;
  }

  private handleError(err: any, context: string) {
    const errMsg = err?.message || String(err || '');
    if (
      errMsg.includes('RESOURCE_EXHAUSTED') || 
      err?.code === 'resource-exhausted' || 
      errMsg.includes('Quota limit exceeded') ||
      errMsg.includes('NOT_FOUND') ||
      errMsg.includes('not-found') ||
      err?.code === 5 ||
      err?.code === 'not-found'
    ) {
      this.quotaExceeded = true;
      const now = Date.now();
      if (now - this.lastQuotaWarning > 60000) {
        console.warn(`[Firestore Status] Cloud Firestore limit reached during ${context}. Operating smoothly with local persistent DB & MSSQL.`);
        this.lastQuotaWarning = now;
      }
    } else {
      console.error(`[Firestore Error] ${context}:`, err);
    }
  }

  public async syncFromFirestore(dbState: DbSchema, onSynced?: () => void): Promise<boolean> {
    if (!this.db || this.quotaExceeded) return false;
    const collectionsList = [
      'users', 'hosts', 'rules', 'alerts', 'threats', 'apiKeys', 'auditLogs', 'liveActivities', 'threatIntel', 'mlModels', 'quarantine', 'emailLogs'
    ];
    let updatedAny = false;

    for (const colName of collectionsList) {
      if (this.quotaExceeded) break;
      try {
        const colRef = collection(this.db, colName);
        const querySnapshot = await getDocs(colRef);
        const items: any[] = [];
        querySnapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() });
        });

        if (items.length > 0) {
          (dbState as any)[colName] = items;
          updatedAny = true;
        } else {
          const defaultItems = (DEFAULT_DB as any)[colName] || [];
          for (const item of defaultItems) {
            if (this.quotaExceeded) break;
            const docId = item.id || 'id_' + Math.random().toString(36).substring(2, 9);
            await setDoc(doc(this.db, colName, docId), item);
          }
          (dbState as any)[colName] = [...defaultItems];
          updatedAny = true;
        }
      } catch (err) {
        this.handleError(err, `syncing collection ${colName}`);
      }
    }

    if (updatedAny && onSynced) {
      onSynced();
    }
    return updatedAny;
  }

  public triggerSync(dbState: DbSchema) {
    if (!this.db || this.quotaExceeded) return;
    if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(() => {
      this.executeSync(dbState).catch(err => this.handleError(err, 'debounced sync'));
    }, 2500);
  }

  private async executeSync(dbState: DbSchema) {
    if (!this.db || this.quotaExceeded) return;
    if (this.isSyncing) {
      this.pendingSync = true;
      return;
    }
    this.isSyncing = true;
    try {
      const collectionsList = [
        'users', 'hosts', 'rules', 'alerts', 'threats', 'apiKeys', 'auditLogs', 'liveActivities', 'threatIntel', 'mlModels', 'quarantine', 'emailLogs'
      ];
      for (const colName of collectionsList) {
        if (this.quotaExceeded) break;
        const items = (dbState as any)[colName] || [];
        const itemsToSync = items.slice(0, 30);
        for (const item of itemsToSync) {
          if (this.quotaExceeded) break;
          if (item && item.id) {
            await setDoc(doc(this.db!, colName, item.id), item);
          }
        }
      }
    } catch (error) {
      this.handleError(error, 'executing Firestore sync');
    } finally {
      this.isSyncing = false;
      if (this.pendingSync && !this.quotaExceeded) {
        this.pendingSync = false;
        await this.executeSync(dbState);
      }
    }
  }

  public async deleteDocument(colName: string, docId: string) {
    if (!this.db || this.quotaExceeded) return;
    try {
      await deleteDoc(doc(this.db, colName, docId));
    } catch (err) {
      this.handleError(err, `deleting ${colName}/${docId}`);
    }
  }
}

export const firestoreSyncService = new FirestoreSyncService();

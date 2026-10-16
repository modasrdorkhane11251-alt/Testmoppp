/// <reference types="node" />
/**
 * Resilient & Atomic Persistent Database Service for SlowMegaBot
 * Handles atomic file writes, automatic backups, recovery on corruption,
 * and seamless synchronization for botStorage and platformStore.
 */

import fs from 'fs';
import path from 'path';

export interface PersistentDataPayload {
  version: string;
  updatedAt: string;
  stats: {
    totalUsers: number;
    telegramUsers: number;
    baleUsers: number;
    rubikaUsers: number;
    totalOrders: number;
    mafiaUsers?: number;
    mafiaTransactions?: number;
  };
  users: any[];
  wallets: any[];
  orders: any[];
  clashVillages: any[];
  seenOrders: any[];
  ownerConfig: any;
  mafiaData?: {
    users: any[];
    transactions: any[];
  };
}

class DatabasePersistenceService {
  private dataDir: string;
  private backupDir: string;
  private dbPath: string;
  private bakPath: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isLoaded: boolean = false;
  private isSaving: boolean = false;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), 'data');
    this.backupDir = path.resolve(this.dataDir, 'backups');
    this.dbPath = path.resolve(this.dataDir, 'bot_database.json');
    this.bakPath = path.resolve(this.dataDir, 'bot_database.json.bak');
    this.ensureDirs();
  }

  private ensureDirs() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    } catch (e) {
      console.error('[Database] Failed to initialize directories:', e);
    }
  }

  /**
   * Loads saved database from disk into botStorage & platformStore on server startup.
   * If the primary file is corrupted, it automatically recovers from the backup file.
   */
  public load(botStorage: any, platformStore?: any): boolean {
    this.ensureDirs();
    let raw: string | null = null;
    let sourceUsed = 'primary';

    // 1. Try reading the primary database file
    if (fs.existsSync(this.dbPath)) {
      try {
        raw = fs.readFileSync(this.dbPath, 'utf-8');
      } catch (err) {
        console.error('[Database] Error reading primary DB file:', err);
      }
    }

    // 2. Fallback to backup if primary is missing or empty
    if (!raw && fs.existsSync(this.bakPath)) {
      try {
        console.warn('[Database] Primary database missing. Attempting recovery from .bak file...');
        raw = fs.readFileSync(this.bakPath, 'utf-8');
        sourceUsed = 'backup';
      } catch (err) {
        console.error('[Database] Error reading backup file:', err);
      }
    }

    // 3. If neither exists, initialize initial dataset
    if (!raw) {
      console.log('[Database] No existing database found. Initializing empty dataset.');
      this.saveNow(botStorage, platformStore);
      this.isLoaded = true;
      return false;
    }

    // 4. Parse JSON with safe recovery
    let data: PersistentDataPayload | null = null;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[Database] Primary JSON is corrupted! Attempting recovery from .bak file...', parseErr);
      if (fs.existsSync(this.bakPath)) {
        try {
          const bakRaw = fs.readFileSync(this.bakPath, 'utf-8');
          data = JSON.parse(bakRaw);
          sourceUsed = 'backup_recovered';
          console.log('[Database] Successfully recovered database from .bak!');
        } catch {
          console.error('[Database] Backup file is also invalid.');
        }
      }
    }

    if (!data) {
      console.error('[Database] Could not recover valid JSON. Creating fresh backup and re-initializing.');
      return false;
    }

    // 5. Hydrate botStorage
    if (botStorage && typeof botStorage.importData === 'function') {
      botStorage.importData(data);
    }

    // 6. Hydrate platformStore (Mafia accounts & transactions)
    if (platformStore && data.mafiaData && typeof platformStore.importData === 'function') {
      platformStore.importData(data.mafiaData);
    }

    console.log(
      `[Database] Loaded ${data.users?.length || 0} users, ${data.wallets?.length || 0} wallets, and ${data.mafiaData?.users?.length || 0} mafia accounts (source: ${sourceUsed}).`
    );

    this.isLoaded = true;
    return true;
  }

  /**
   * Schedules a debounced atomic write (1000ms delay to batch fast updates)
   */
  public scheduleSave(botStorage: any, platformStore?: any) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveNow(botStorage, platformStore);
    }, 1000);
  }

  /**
   * Writes the current state atomically using temporary file + rename.
   * Also updates the .bak file and retains rotational historical backups.
   */
  public saveNow(botStorage: any, platformStore?: any): boolean {
    if (this.isSaving) return false;
    this.isSaving = true;

    try {
      this.ensureDirs();
      if (!botStorage || typeof botStorage.exportData !== 'function') {
        this.isSaving = false;
        return false;
      }

      const payload: PersistentDataPayload = botStorage.exportData();

      // Include platformStore data
      if (platformStore && typeof platformStore.exportData === 'function') {
        const mafiaData = platformStore.exportData();
        payload.mafiaData = mafiaData;
        payload.stats.mafiaUsers = mafiaData.users?.length || 0;
        payload.stats.mafiaTransactions = mafiaData.transactions?.length || 0;
      }

      const jsonString = JSON.stringify(payload, null, 2);
      const tmpPath = `${this.dbPath}.tmp.${Date.now()}`;

      // 1. Atomic write to temporary file
      fs.writeFileSync(tmpPath, jsonString, 'utf-8');

      // 2. Backup existing file before overwriting
      if (fs.existsSync(this.dbPath)) {
        try {
          fs.copyFileSync(this.dbPath, this.bakPath);
        } catch {}
      }

      // 3. Atomic rename
      fs.renameSync(tmpPath, this.dbPath);

      this.isSaving = false;
      return true;
    } catch (err) {
      console.error('[Database] Atomic write failed:', err);
      this.isSaving = false;
      return false;
    }
  }

  /**
   * Creates a manual or scheduled snapshot in data/backups/
   */
  public createSnapshot(botStorage: any, platformStore?: any): string | null {
    try {
      this.ensureDirs();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotPath = path.resolve(this.backupDir, `snapshot_${timestamp}.json`);
      this.saveNow(botStorage, platformStore);
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, snapshotPath);
        this.pruneOldSnapshots(10);
        return snapshotPath;
      }
    } catch (e) {
      console.error('[Database] Failed to create snapshot:', e);
    }
    return null;
  }

  private pruneOldSnapshots(maxKeep = 10) {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter((f: string) => f.startsWith('snapshot_') && f.endsWith('.json'))
        .map((f: string) => ({ name: f, time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime() }))
        .sort((a: {time: number}, b: {time: number}) => b.time - a.time);

      if (files.length > maxKeep) {
        files.slice(maxKeep).forEach((file: {name: string}) => {
          try {
            fs.unlinkSync(path.join(this.backupDir, file.name));
          } catch {}
        });
      }
    } catch {}
  }

  public getDbPath(): string {
    return this.dbPath;
  }

  public getBakPath(): string {
    return this.bakPath;
  }

  public getRawData(): any {
    try {
      if (fs.existsSync(this.dbPath)) {
        return JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
      }
    } catch {}
    return null;
  }

  public checkHealth(): { exists: boolean; writable: boolean; sizeBytes: number; backupExists: boolean } {
    const exists = fs.existsSync(this.dbPath);
    let sizeBytes = 0;
    let writable = false;

    if (exists) {
      try {
        const stat = fs.statSync(this.dbPath);
        sizeBytes = stat.size;
      } catch {}
    }

    try {
      const testFile = path.resolve(this.dataDir, '.write_test');
      fs.writeFileSync(testFile, 'ok', 'utf-8');
      fs.unlinkSync(testFile);
      writable = true;
    } catch {
      writable = false;
    }

    return {
      exists,
      writable,
      sizeBytes,
      backupExists: fs.existsSync(this.bakPath),
    };
  }
}

export const databasePersistenceService = new DatabasePersistenceService();

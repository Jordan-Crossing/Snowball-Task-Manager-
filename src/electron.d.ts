import type { ElectronSyncServerStatus, PairedDevice, ServerLogLevel } from './sync/types';

// Backup types
export interface BackupInfo {
  path: string;
  timestamp: string;
  size: number;
  reason: 'manual' | 'pre-sync' | 'auto';
}

export interface BackupResult {
  success: boolean;
  path?: string;
  error?: string;
}

// Sync server event types
export interface SyncServerEvent {
  type: 'status' | 'started' | 'stopped' | 'log' | 'error' | 'exited' | 'pin-changed' | 'paired-devices' | 'device-unpaired' | 'local-client-token';
  data: unknown;
}

export interface ElectronAPI {
  getUserDataPath: () => Promise<string>;

  // Database operations
  dbExec: (sql: string) => Promise<void>;
  dbRun: (sql: string, params: any[]) => Promise<{ lastID: number; changes: number }>;
  dbGet: (sql: string, params: any[]) => Promise<any>;
  dbAll: (sql: string, params: any[]) => Promise<any[]>;
  dbClose: () => Promise<void>;
  dbReset: () => Promise<void>;

  // Backup operations
  createBackup: (reason: BackupInfo['reason']) => Promise<BackupResult>;
  listBackups: () => Promise<BackupInfo[]>;
  restoreBackup: (backupPath: string) => Promise<BackupResult>;
  deleteBackup: (backupPath: string) => Promise<BackupResult>;

  // Sync server operations
  syncServerStart: () => Promise<ElectronSyncServerStatus>;
  syncServerStop: () => Promise<ElectronSyncServerStatus>;
  syncServerStatus: () => Promise<ElectronSyncServerStatus>;
  syncServerRegeneratePin: () => Promise<void>;
  syncServerGetPairedDevices: () => Promise<PairedDevice[]>;
  syncServerUnpairDevice: (deviceId: string) => Promise<void>;
  syncServerUnpairAll: () => Promise<void>;
  onSyncServerEvent: (callback: (event: SyncServerEvent) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

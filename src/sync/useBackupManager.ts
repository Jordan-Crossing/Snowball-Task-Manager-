/**
 * React hook for using the backup manager
 */

import { useState, useEffect, useCallback } from 'react';
import { getBackupManager } from './backup-manager';
import type { BackupInfo, BackupResult } from '../electron.d';

interface UseBackupManagerResult {
  // Backup list
  backups: BackupInfo[];
  loading: boolean;
  error: string | null;

  // Actions
  createBackup: (reason?: 'pre-sync' | 'manual') => Promise<BackupResult>;
  restoreBackup: (backupPath: string) => Promise<BackupResult>;
  deleteBackup: (backupPath: string) => Promise<BackupResult>;
  refreshBackups: () => Promise<void>;

  // Cleanup
  cleanupOldBackups: () => Promise<number>;

  // Platform check
  isElectron: boolean;
}

export function useBackupManager(): UseBackupManagerResult {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backupManager = getBackupManager();
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Load backups on mount
  useEffect(() => {
    if (isElectron) {
      refreshBackups();
    } else {
      setLoading(false);
    }
  }, [isElectron]);

  // Refresh backup list
  const refreshBackups = useCallback(async () => {
    if (!isElectron) return;

    setLoading(true);
    setError(null);

    try {
      const list = await backupManager.listBackups();
      // Sort by date, newest first
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setBackups(list);
    } catch (err) {
      console.error('[useBackupManager] Failed to list backups:', err);
      setError('Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, [backupManager, isElectron]);

  // Create a new backup
  const createBackup = useCallback(async (reason: 'pre-sync' | 'manual' = 'manual'): Promise<BackupResult> => {
    setError(null);

    try {
      const result = await backupManager.createBackup(reason);
      if (result.success) {
        await refreshBackups();
      }
      return result;
    } catch (err) {
      console.error('[useBackupManager] Failed to create backup:', err);
      const errorResult = { success: false, error: 'Failed to create backup' };
      setError(errorResult.error);
      return errorResult;
    }
  }, [backupManager, refreshBackups]);

  // Restore from a backup
  const restoreBackup = useCallback(async (backupPath: string): Promise<BackupResult> => {
    setError(null);

    try {
      const result = await backupManager.restoreBackup(backupPath);
      return result;
    } catch (err) {
      console.error('[useBackupManager] Failed to restore backup:', err);
      const errorResult = { success: false, error: 'Failed to restore backup' };
      setError(errorResult.error);
      return errorResult;
    }
  }, [backupManager]);

  // Delete a backup
  const deleteBackup = useCallback(async (backupPath: string): Promise<BackupResult> => {
    setError(null);

    try {
      const result = await backupManager.deleteBackup(backupPath);
      if (result.success) {
        await refreshBackups();
      }
      return result;
    } catch (err) {
      console.error('[useBackupManager] Failed to delete backup:', err);
      const errorResult = { success: false, error: 'Failed to delete backup' };
      setError(errorResult.error);
      return errorResult;
    }
  }, [backupManager, refreshBackups]);

  // Cleanup old backups
  const cleanupOldBackups = useCallback(async (): Promise<number> => {
    try {
      const count = await backupManager.cleanupOldBackups();
      await refreshBackups();
      return count;
    } catch (err) {
      console.error('[useBackupManager] Failed to cleanup backups:', err);
      return 0;
    }
  }, [backupManager, refreshBackups]);

  return {
    backups,
    loading,
    error,
    createBackup,
    restoreBackup,
    deleteBackup,
    refreshBackups,
    cleanupOldBackups,
    isElectron,
  };
}

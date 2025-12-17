/**
 * Backup Manager for Sync
 * Handles database backups before sync operations
 */

import type { BackupInfo, BackupResult } from '../electron.d';
import { isElectron } from './platform';

export type { BackupInfo, BackupResult };

/**
 * BackupManager handles database backup/restore operations
 * Uses Electron IPC for file operations when available
 */
export class BackupManager {
  private maxBackups: number = 10;

  /**
   * Check if we're running in Electron
   */
  private isElectron(): boolean {
    return isElectron();
  }

  /**
   * Create a backup before sync
   */
  async createBackup(reason: BackupInfo['reason'] = 'manual'): Promise<BackupResult> {
    if (!this.isElectron()) {
      // On Android/web, backups are handled differently
      return { success: false, error: 'Backups only available in desktop app' };
    }

    try {
      const result = await window.electronAPI!.createBackup(reason);

      if (result.success) {
        // Clean up old backups after creating a new one
        await this.cleanupOldBackups();
      }

      return result;
    } catch (err) {
      console.error('[BackupManager] Failed to create backup:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    if (!this.isElectron()) {
      return [];
    }

    try {
      return await window.electronAPI!.listBackups();
    } catch (err) {
      console.error('[BackupManager] Failed to list backups:', err);
      return [];
    }
  }

  /**
   * Restore from a backup
   */
  async restoreBackup(backupPath: string): Promise<BackupResult> {
    if (!this.isElectron()) {
      return { success: false, error: 'Restore only available in desktop app' };
    }

    try {
      return await window.electronAPI!.restoreBackup(backupPath);
    } catch (err) {
      console.error('[BackupManager] Failed to restore backup:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupPath: string): Promise<BackupResult> {
    if (!this.isElectron()) {
      return { success: false, error: 'Delete only available in desktop app' };
    }

    try {
      return await window.electronAPI!.deleteBackup(backupPath);
    } catch (err) {
      console.error('[BackupManager] Failed to delete backup:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Clean up old backups, keeping only the most recent
   */
  async cleanupOldBackups(): Promise<number> {
    if (!this.isElectron()) {
      return 0;
    }

    try {
      const backups = await this.listBackups();

      // Sort by timestamp descending (newest first)
      const sorted = backups.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Delete backups beyond the max count
      const toDelete = sorted.slice(this.maxBackups);
      let deleted = 0;

      for (const backup of toDelete) {
        const result = await this.deleteBackup(backup.path);
        if (result.success) {
          deleted++;
        }
      }

      return deleted;
    } catch (err) {
      console.error('[BackupManager] Failed to cleanup backups:', err);
      return 0;
    }
  }

  /**
   * Get the number of available backups
   */
  async getBackupCount(): Promise<number> {
    const backups = await this.listBackups();
    return backups.length;
  }

  /**
   * Get the most recent backup
   */
  async getLatestBackup(): Promise<BackupInfo | null> {
    const backups = await this.listBackups();
    if (backups.length === 0) return null;

    // Sort by timestamp descending and get the first one
    const sorted = backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sorted[0];
  }
}

// Singleton instance
let backupManagerInstance: BackupManager | null = null;

export function getBackupManager(): BackupManager {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager();
  }
  return backupManagerInstance;
}

/**
 * Change Tracker for Sync
 * Tracks local database changes for synchronization
 */

import type { Database } from '../db/types';
import type { EntityType, ChangeRecord } from './types';

// Operation type for sync log
export type Operation = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * ChangeTracker tracks local changes to entities for sync
 */
export class ChangeTracker {
  private db: Database;
  private enabled: boolean = true;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Enable or disable change tracking
   * Useful when applying remote changes to avoid creating sync_log entries
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if change tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log a change to an entity
   */
  async logChange(
    entityType: EntityType,
    entityId: number,
    operation: Operation,
    changedData?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.db.run(
        `INSERT INTO sync_log (entity_type, entity_id, operation, changed_data, timestamp, synced)
         VALUES (?, ?, ?, ?, datetime('now'), 0)`,
        [entityType, entityId, operation, changedData ? JSON.stringify(changedData) : null]
      );
    } catch (err) {
      console.error('[ChangeTracker] Failed to log change:', err);
    }
  }

  /**
   * Get all unsynced changes as ChangeRecord[]
   */
  async getUnsyncedChanges(): Promise<ChangeRecord[]> {
    try {
      const rows = await this.db.all<{
        id: number;
        entity_type: string;
        entity_id: number;
        operation: string;
        changed_data: string | null;
        timestamp: string;
      }>('SELECT * FROM sync_log WHERE synced = 0 ORDER BY timestamp');

      return rows.map(row => ({
        id: row.id,
        entityType: row.entity_type as EntityType,
        entityId: row.entity_id,
        operation: row.operation as 'INSERT' | 'UPDATE' | 'DELETE',
        data: row.changed_data ? JSON.parse(row.changed_data) : {},
        timestamp: row.timestamp,
      }));
    } catch (err) {
      console.error('[ChangeTracker] Failed to get unsynced changes:', err);
      return [];
    }
  }

  /**
   * Mark changes as synced
   */
  async markSynced(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    try {
      const placeholders = ids.map(() => '?').join(',');
      await this.db.run(
        `UPDATE sync_log SET synced = 1 WHERE id IN (${placeholders})`,
        ids
      );
    } catch (err) {
      console.error('[ChangeTracker] Failed to mark changes as synced:', err);
    }
  }

  /**
   * Clear all synced changes
   */
  async clearSyncedChanges(): Promise<void> {
    try {
      await this.db.run('DELETE FROM sync_log WHERE synced = 1');
    } catch (err) {
      console.error('[ChangeTracker] Failed to clear synced changes:', err);
    }
  }
}

// Singleton instance
let changeTrackerInstance: ChangeTracker | null = null;

export function getChangeTracker(db?: Database): ChangeTracker {
  if (!changeTrackerInstance && db) {
    changeTrackerInstance = new ChangeTracker(db);
  }
  if (!changeTrackerInstance) {
    throw new Error('ChangeTracker not initialized. Call getChangeTracker with a database instance first.');
  }
  return changeTrackerInstance;
}

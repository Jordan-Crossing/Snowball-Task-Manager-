/**
 * Electron SQLite implementation using IPC bridge
 * Delegates database operations to the main process
 */

import type { Database as DatabaseInterface } from './types';

/**
 * Initialize and return a database interface that communicates via IPC
 *
 * @param _dbPath - Ignored in renderer, handled by main process
 * @returns Promise resolving to Database interface implementation
 */
export async function createElectronDB(_dbPath: string): Promise<DatabaseInterface> {
  // We assume the main process has already initialized the DB
  
  return {
    async exec(sql: string): Promise<void> {
      await window.electronAPI.dbExec(sql);
    },

    async run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
      return await window.electronAPI.dbRun(sql, params || []);
    },

    async get<T>(sql: string, params?: any[]): Promise<T | undefined> {
      return await window.electronAPI.dbGet(sql, params || []);
    },

    async all<T>(sql: string, params?: any[]): Promise<T[]> {
      const result = await window.electronAPI.dbAll(sql, params || []);
      // Ensure we always return an array
      return Array.isArray(result) ? result : [];
    },

    async close(): Promise<void> {
      await window.electronAPI.dbClose();
    },

    async reset(): Promise<void> {
      // Delegate full reset to main process
      await window.electronAPI.dbReset();
    },
  };
}

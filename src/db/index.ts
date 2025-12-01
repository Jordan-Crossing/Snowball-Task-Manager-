/**
 * Database factory - Three-way platform detection and singleton management
 * Supports: Electron (better-sqlite3), Capacitor (native SQLite), Web (sql.js + IndexedDB)
 */

import { Capacitor } from '@capacitor/core';
import type { Database as DatabaseInterface } from './types';

let dbInstance: DatabaseInterface | null = null;

/**
 * Detect if running in Electron environment
 */
function isElectron(): boolean {
  return (
    typeof window !== 'undefined' &&
    (typeof (window as any).electronAPI !== 'undefined' ||
      typeof (window as any).require === 'function' ||
      navigator.userAgent.toLowerCase().includes('electron'))
  );
}

/**
 * Detect if running in Capacitor native environment
 */
function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Get or create the database singleton
 * Automatically detects the platform and loads the appropriate implementation:
 * 1. Electron → better-sqlite3 (native file-based SQLite)
 * 2. Capacitor → Capacitor SQLite plugin (native SQLite)
 * 3. Web → sql.js + IndexedDB (browser-based SQLite)
 *
 * @returns Promise resolving to Database instance
 * @throws Error if database initialization fails
 *
 * @example
 * ```typescript
 * const db = await getDatabase();
 * const tasks = await db.all<Task>('SELECT * FROM tasks');
 * ```
 */
export async function getDatabase(): Promise<DatabaseInterface> {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }

  try {
    if (isElectron()) {
      // Electron: Use better-sqlite3 for native file-based SQLite
      console.log('Detected Electron environment, using better-sqlite3');
      const { createElectronDB } = await import('./electron');
      // We don't need the path for the renderer side anymore as it's handled by main process
      // but we'll keep the variable for logging if needed
      const userDataPath = await (window as any).electronAPI?.getUserDataPath?.() || './data';
      console.log('User data path:', userDataPath);
      const dbPath = `${userDataPath}/todo.db`;
      dbInstance = await createElectronDB(dbPath);
    } else if (isCapacitorNative()) {
      // Capacitor: Use native SQLite plugin
      console.log('Detected Capacitor native environment, using native SQLite');
      const { createCapacitorDB } = await import('./capacitor');
      dbInstance = await createCapacitorDB('todo');
    } else {
      // Web browser: Use sql.js + IndexedDB
      console.log('Detected web browser, using sql.js + IndexedDB');
      const { createWebDB } = await import('./web');
      dbInstance = await createWebDB('todo');
    }

    return dbInstance;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize database: ${message}`);
  }
}

/**
 * Close the database connection and reset the singleton
 * Call this during application shutdown
 *
 * @example
 * ```typescript
 * window.addEventListener('beforeunload', () => {
 *   closeDatabase();
 * });
 * ```
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.close();
    } finally {
      dbInstance = null;
    }
  }
}

/**
 * Reset the database singleton (useful for testing)
 * Forces the next getDatabase() call to create a new instance
 */
export function resetDatabase(): void {
  dbInstance = null;
}

// Export all types from types.ts
export type {
  Settings,
  List,
  Project,
  Task,
  TaskCompletion,
  Tag,
  TaskTag,
  Database,
} from './types';

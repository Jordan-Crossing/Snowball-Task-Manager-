/**
 * Database factory - Platform detection and singleton management
 * This module handles cross-platform database initialization
 */

import type { Database as DatabaseInterface } from './types';

let dbInstance: DatabaseInterface | null = null;

/**
 * Detect if running in Electron environment
 * @returns true if running in Electron, false otherwise
 */
function isElectron(): boolean {
  // Check for Electron-specific globals
  return (
    typeof window !== 'undefined' &&
    (typeof (window as any).electronAPI !== 'undefined' ||
      typeof (window as any).require === 'function' ||
      navigator.userAgent.toLowerCase().includes('electron'))
  );
}

/**
 * Get or create the database singleton
 * Automatically detects the platform and loads the appropriate implementation
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
      // Load Electron implementation
      const { createElectronDB } = await import('./electron');
      const userDataPath = (window as any).electronAPI?.getUserDataPath?.() || './data';
      const dbPath = `${userDataPath}/todo.db`;
      dbInstance = await createElectronDB(dbPath);
    } else {
      // Load Capacitor implementation
      const { createCapacitorDB } = await import('./capacitor');
      dbInstance = await createCapacitorDB('todo');
    }

    return dbInstance;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
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

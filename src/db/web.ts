/**
 * Web browser SQLite implementation using sql.js + IndexedDB
 * Provides in-memory SQLite with persistent IndexedDB storage
 *
 * Why this approach?
 * - sql.js: Compiles SQLite to WebAssembly for browser use
 * - IndexedDB: Persistent storage with higher limits than localStorage
 * - Same Database interface for all platforms (Electron, Capacitor, Web)
 */

import initSqlJs from 'sql.js';
import type { Database as DatabaseInterface } from './types';
import { SCHEMA, INITIAL_DATA } from './schema';

// IndexedDB configuration
const DB_NAME = 'todo-app-db';
const STORE_NAME = 'database';
const DATA_KEY = 'data';

/**
 * Load database binary from IndexedDB
 * @returns Uint8Array of database binary, or null if no database exists
 */
async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      const db = request.result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve(null);
        return;
      }

      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(DATA_KEY);

      getRequest.onerror = () => {
        db.close();
        reject(new Error(`Failed to read from IndexedDB: ${getRequest.error}`));
      };

      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result || null);
      };
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save database binary to IndexedDB
 * @param data - Uint8Array of database binary
 */
async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB for writing: ${request.error}`));
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(data, DATA_KEY);

      putRequest.onerror = () => {
        db.close();
        reject(new Error(`Failed to write to IndexedDB: ${putRequest.error}`));
      };

      putRequest.onsuccess = () => {
        db.close();
        resolve();
      };
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Create and initialize a web-based SQLite database using sql.js + IndexedDB
 * @param _dbName - Name for logging purposes (not used for storage location)
 * @returns Promise resolving to Database interface
 */
export async function createWebDB(_dbName: string): Promise<DatabaseInterface> {
  // Initialize sql.js from CDN
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });

  // Load existing database from IndexedDB or create new
  let dbData: Uint8Array | undefined;
  try {
    const existingData = await loadFromIndexedDB();
    if (existingData) {
      dbData = existingData;
      console.log('Loaded existing database from IndexedDB');
    }
  } catch (error) {
    console.warn('Failed to load from IndexedDB, creating new database:', error);
  }

  // Create or open database
  const db = new SQL.Database(dbData);

  // Initialize schema if new database
  if (!dbData) {
    try {
      db.run(SCHEMA);
      db.run(INITIAL_DATA);
      console.log('Initialized new database with schema');

      // Save to IndexedDB
      const exported = db.export();
      await saveToIndexedDB(exported);
    } catch (error) {
      throw new Error(
        `Failed to initialize database schema: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    // Run migrations on existing database
    try {
      // Migrations removed
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(
        `Failed to run migrations: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Auto-save to IndexedDB
   */
  const autoSave = async (): Promise<void> => {
    try {
      const exported = db.export();
      await saveToIndexedDB(exported);
    } catch (error) {
      console.error('Failed to auto-save database:', error);
    }
  };

  // Return Database interface implementation
  return {
    /**
     * Execute raw SQL without returning results (DDL operations)
     */
    async exec(sql: string): Promise<void> {
      try {
        db.run(sql);
        await autoSave();
      } catch (error) {
        throw new Error(
          `SQL exec failed: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`
        );
      }
    },

    /**
     * Execute SQL that modifies data (INSERT, UPDATE, DELETE)
     */
    async run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params || []);

        // Execute statement
        stmt.step();
        stmt.free();

        // Get last insert ID
        let lastID = 0;
        const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
        if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
          lastID = Number(lastIdResult[0].values[0][0]) || 0;
        }

        // Get changes count
        const changesResult = db.exec('SELECT changes() as changes');
        let changes = 0;
        if (changesResult.length > 0 && changesResult[0].values.length > 0) {
          changes = Number(changesResult[0].values[0][0]) || 0;
        }

        // Auto-save to IndexedDB
        await autoSave();

        return { lastID, changes };
      } catch (error) {
        throw new Error(
          `SQL run failed: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`
        );
      }
    },

    /**
     * Execute SQL that returns a single row
     */
    async get<T>(sql: string, params?: any[]): Promise<T | undefined> {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params || []);

        const result: T | undefined = stmt.step() ? stmt.getAsObject() as T : undefined;
        stmt.free();

        return result;
      } catch (error) {
        throw new Error(
          `SQL get failed: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`
        );
      }
    },

    /**
     * Execute SQL that returns multiple rows
     */
    async all<T>(sql: string, params?: any[]): Promise<T[]> {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params || []);

        const results: T[] = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject() as T);
        }
        stmt.free();

        return results;
      } catch (error) {
        throw new Error(
          `SQL all failed: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`
        );
      }
    },

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
      try {
        // Final save before closing
        await autoSave();
        db.close();
      } catch (error) {
        throw new Error(
          `Failed to close database: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    /**
     * Reset the database to its initial state
     */
    async reset(): Promise<void> {
      try {
        // Drop all tables
        const tables = ['tasks', 'projects', 'lists', 'tags', 'task_tags', 'task_completions', 'settings'];
        for (const table of tables) {
          db.run(`DROP TABLE IF EXISTS ${table}`);
        }
        
        // Re-initialize schema and data
        db.run(SCHEMA);
        db.run(INITIAL_DATA);
        
        await autoSave();
      } catch (error) {
        throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  };
}

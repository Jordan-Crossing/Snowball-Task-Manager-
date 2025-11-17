/**
 * Electron SQLite implementation using better-sqlite3
 * Provides synchronous database operations wrapped in Promise-based API
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseInterface } from './types';
import { SCHEMA, INITIAL_DATA } from './schema';

/**
 * Initialize and return a better-sqlite3 database instance
 * Wraps the sync API to match the async Database interface
 *
 * @param dbPath - File path where the database will be stored
 * @returns Promise resolving to Database interface implementation
 */
export async function createElectronDB(dbPath: string): Promise<DatabaseInterface> {
  // Create or open database file
  const db = new Database(dbPath);

  // Enable foreign keys (required for referential integrity)
  db.pragma('foreign_keys = ON');

  // Initialize schema
  try {
    db.exec(SCHEMA);
    db.exec(INITIAL_DATA);
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Return Database interface implementation
  return {
    /**
     * Execute raw SQL without returning results
     */
    async exec(sql: string): Promise<void> {
      try {
        db.exec(sql);
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
        const info = stmt.run(...(params || []));
        return {
          lastID: Number(info.lastInsertRowid),
          changes: info.changes,
        };
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
        const result = stmt.get(...(params || [])) as T | undefined;
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
        const results = stmt.all(...(params || [])) as T[];
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
        db.close();
      } catch (error) {
        throw new Error(
          `Failed to close database: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };
}

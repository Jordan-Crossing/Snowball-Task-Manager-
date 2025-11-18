/**
 * Electron SQLite implementation using better-sqlite3
 * Provides synchronous database operations wrapped in Promise-based API
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseInterface } from './types';
import { SCHEMA, INITIAL_DATA } from './schema';

/**
 * Check if a column exists in a table
 */
function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return tableInfo.some(col => col.name === columnName);
}

/**
 * Run database migrations safely
 */
function runMigrations(db: Database.Database): void {
  // Migration: Add is_folder column to tasks table
  if (!columnExists(db, 'tasks', 'is_folder')) {
    console.log('Running migration: Adding is_folder column to tasks table');
    db.exec('ALTER TABLE tasks ADD COLUMN is_folder INTEGER DEFAULT 0 NOT NULL;');
  }
}

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
    runMigrations(db);
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

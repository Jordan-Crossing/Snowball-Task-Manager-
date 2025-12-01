/**
 * Capacitor SQLite implementation
 * Provides async database operations using @capacitor-community/sqlite
 */

import { SQLiteConnection, SQLiteDBConnection, CapacitorSQLite } from '@capacitor-community/sqlite';
import type { Database as DatabaseInterface } from './types';
import { SCHEMA, INITIAL_DATA } from './schema';

/**
 * Initialize and return a Capacitor SQLite database instance
 * Uses SQLiteConnection and SQLiteDBConnection for database management
 *
 * @param dbName - Name of the database (without .db extension)
 * @returns Promise resolving to Database interface implementation
 */
export async function createCapacitorDB(dbName: string): Promise<DatabaseInterface> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  let db: SQLiteDBConnection | null = null;

  try {
    // Create a connection to the database
    db = await sqlite.createConnection(
      dbName,
      false, // encrypted
      'no-encryption', // mode
      1, // version
      false // readonly
    );

    // Open the database
    await db.open();

    // Enable foreign keys
    await db.execute('PRAGMA foreign_keys = ON;');

    // Initialize schema - split into individual statements
    const schemaStatements = SCHEMA.split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    // Execute schema statements
    for (const statement of schemaStatements) {
      try {
        await db.execute(statement);
      } catch (error) {
        // Log but don't throw on existing table errors
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (!errorMsg.includes('already exists')) {
          console.error('Schema error:', error);
        }
      }
    }

    // Initialize default data
    const initialDataStatements = INITIAL_DATA.split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    // Execute initial data statements
    for (const statement of initialDataStatements) {
      try {
        await db.execute(statement);
      } catch (error) {
        // Log but don't throw on constraint violations
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (
          !errorMsg.includes('UNIQUE constraint failed') &&
          !errorMsg.includes('AUTOINCREMENT')
        ) {
          console.error('Initial data error:', error);
        }
      }
    }
  } catch (error) {
    if (db) {
      try {
        await db.close();
      } catch (closeError) {
        console.error('Error closing database after initialization failure:', closeError);
      }
    }
    console.error('Failed to initialize Capacitor database:', error);
    throw new Error(
      `Database initialization failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Return Database interface implementation
  return {
    /**
     * Execute raw SQL without returning results
     */
    async exec(sql: string): Promise<void> {
      if (!db) {
        throw new Error('Database connection is closed');
      }
      try {
        await db.execute(sql);
      } catch (error) {
        throw new Error(
          `SQL exec failed: ${
            error instanceof Error ? error.message : String(error)
          }\nSQL: ${sql}`
        );
      }
    },

    /**
     * Execute SQL that modifies data (INSERT, UPDATE, DELETE)
     */
    async run(
      sql: string,
      params?: any[]
    ): Promise<{ lastID: number; changes: number }> {
      if (!db) {
        throw new Error('Database connection is closed');
      }
      try {
        const result = await db.run(sql, params);

        return {
          lastID: result.changes?.lastId || 0,
          changes: result.changes?.changes || 0,
        };
      } catch (error) {
        throw new Error(
          `SQL run failed: ${
            error instanceof Error ? error.message : String(error)
          }\nSQL: ${sql}`
        );
      }
    },

    /**
     * Execute SQL that returns a single row
     */
    async get<T>(sql: string, params?: any[]): Promise<T | undefined> {
      if (!db) {
        throw new Error('Database connection is closed');
      }
      try {
        const result = await db.query(sql, params);

        // Return first row if exists
        return (result.values && result.values.length > 0
          ? result.values[0]
          : undefined) as T | undefined;
      } catch (error) {
        throw new Error(
          `SQL get failed: ${
            error instanceof Error ? error.message : String(error)
          }\nSQL: ${sql}`
        );
      }
    },

    /**
     * Execute SQL that returns multiple rows
     */
    async all<T>(sql: string, params?: any[]): Promise<T[]> {
      if (!db) {
        throw new Error('Database connection is closed');
      }
      try {
        const result = await db.query(sql, params);

        return (result.values || []) as T[];
      } catch (error) {
        throw new Error(
          `SQL all failed: ${
            error instanceof Error ? error.message : String(error)
          }\nSQL: ${sql}`
        );
      }
    },

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
      if (db) {
        try {
          await db.close();
          db = null;
        } catch (error) {
          throw new Error(
            `Failed to close database: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    },

    /**
     * Reset the database to its initial state
     */
    async reset(): Promise<void> {
      if (!db) {
        throw new Error('Database connection is closed');
      }
      try {
        // Drop all tables
        const tables = ['tasks', 'projects', 'lists', 'tags', 'task_tags', 'task_completions', 'settings'];
        for (const table of tables) {
          await db.execute(`DROP TABLE IF EXISTS ${table}`);
        }
        
        // Re-initialize schema and data
        // Split schema into statements
        const schemaStatements = SCHEMA.split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        for (const statement of schemaStatements) {
          await db.execute(statement);
        }

        // Split initial data into statements
        const initialDataStatements = INITIAL_DATA.split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        for (const statement of initialDataStatements) {
          await db.execute(statement);
        }
      } catch (error) {
        throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  };
}

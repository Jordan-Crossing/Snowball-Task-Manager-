/**
 * Capacitor SQLite implementation
 * Provides async database operations using @capacitor-community/sqlite
 */

import { SQLiteConnection, SQLiteDBConnection, CapacitorSQLite } from '@capacitor-community/sqlite';
import type { Database as DatabaseInterface } from './types';
import { allSchemaStatements, seedData, pragmaStatements } from './schema';

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

    // Execute pragma statements
    for (const pragma of pragmaStatements) {
      await db.execute(pragma);
    }

    // Execute schema statements (each is a separate CREATE TABLE/INDEX)
    for (const statement of allSchemaStatements) {
      try {
        await db.execute(statement);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Only ignore "already exists" errors - throw all others
        if (!errorMsg.includes('already exists')) {
          console.error('Schema error:', statement, error);
          throw error;
        }
      }
    }

    // Execute seed data statements (each is a separate INSERT)
    for (const statement of seedData) {
      try {
        await db.execute(statement);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Only ignore constraint violations (data already exists)
        if (
          !errorMsg.includes('UNIQUE constraint failed') &&
          !errorMsg.includes('AUTOINCREMENT') &&
          !errorMsg.includes('already exists')
        ) {
          console.error('Seed data error:', statement, error);
          throw error;
        }
      }
    }

    // Ensure each system list type exists (check by TYPE, not by count)
    // This prevents duplicates by only inserting if no list of that type exists
    const systemLists = [
      { type: 'morning', name: 'Morning', isRepeating: 1, sortOrder: 1 },
      { type: 'cooldown', name: 'Cooldown', isRepeating: 1, sortOrder: 2 },
      { type: 'inbox', name: 'Inbox', isRepeating: 0, sortOrder: 3 },
    ];

    for (const list of systemLists) {
      const existing = await db.query('SELECT id FROM lists WHERE type = ?', [list.type]);
      if (!existing.values || existing.values.length === 0) {
        console.log(`Creating ${list.type} list (not found)`);
        await db.run(
          `INSERT INTO lists (name, type, is_repeating, sort_order) VALUES (?, ?, ?, ?)`,
          [list.name, list.type, list.isRepeating, list.sortOrder]
        );
      }
    }

    // Verify settings exist
    const verifySettings = await db.query('SELECT id FROM settings WHERE id = 1');
    if (!verifySettings.values || verifySettings.values.length === 0) {
      console.log('Creating default settings (not found)');
      await db.execute(`INSERT INTO settings (id, wake_up_time, cooldown_time, sleep_time) VALUES (1, '06:00', '18:00', '22:00')`);
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
        // Drop all tables in correct order (respecting FK constraints)
        const tables = [
          'task_tags', 'task_completions', 'tags',
          'tasks', 'projects', 'lists', 'settings'
        ];
        for (const table of tables) {
          await db.execute(`DROP TABLE IF EXISTS ${table}`);
        }

        // Re-initialize schema (using array of statements)
        for (const statement of allSchemaStatements) {
          await db.execute(statement);
        }

        // Re-initialize seed data (settings only - using array of statements)
        for (const statement of seedData) {
          await db.execute(statement);
        }

        // Re-initialize system lists (check by type to prevent duplicates)
        const systemLists = [
          { type: 'morning', name: 'Morning', isRepeating: 1, sortOrder: 1 },
          { type: 'cooldown', name: 'Cooldown', isRepeating: 1, sortOrder: 2 },
          { type: 'inbox', name: 'Inbox', isRepeating: 0, sortOrder: 3 },
        ];

        for (const list of systemLists) {
          const existing = await db.query('SELECT id FROM lists WHERE type = ?', [list.type]);
          if (!existing.values || existing.values.length === 0) {
            await db.run(
              `INSERT INTO lists (name, type, is_repeating, sort_order) VALUES (?, ?, ?, ?)`,
              [list.name, list.type, list.isRepeating, list.sortOrder]
            );
          }
        }
      } catch (error) {
        throw new Error(`Failed to reset database: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  };
}

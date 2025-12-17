/**
 * Async Migration Runner
 * Handles database migrations for Web and Capacitor platforms
 */

import type {
  Migration,
  MigrationRecord,
  MigrationResult,
  DatabaseExecutor,
} from './types';

/**
 * MigrationRunner handles applying versioned migrations to the database
 * Tracks applied migrations in a _migrations table
 */
export class MigrationRunner {
  private executor: DatabaseExecutor;
  private migrations: Migration[];

  constructor(executor: DatabaseExecutor, migrations: Migration[]) {
    this.executor = executor;
    // Sort migrations by version to ensure correct order
    this.migrations = [...migrations].sort((a, b) => a.version - b.version);
  }

  /**
   * Initialize the _migrations tracking table
   */
  async initMigrationsTable(): Promise<void> {
    await this.executor.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        checksum TEXT NOT NULL,
        execution_time_ms INTEGER
      )
    `);
  }

  /**
   * Get the current database version (highest applied migration)
   */
  async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.executor.get<{ version: number }>(
        'SELECT MAX(version) as version FROM _migrations'
      );
      return result?.version ?? 0;
    } catch {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Get list of all applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      return await this.executor.all<MigrationRecord>(
        'SELECT * FROM _migrations ORDER BY version'
      );
    } catch {
      return [];
    }
  }

  /**
   * Calculate a checksum for a migration (for integrity verification)
   */
  private calculateChecksum(migration: Migration): string {
    const content = JSON.stringify({
      version: migration.version,
      up: migration.up,
    });
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Check if this is an existing database without migration tracking
   * Uses sqlite_master to check if core tables exist
   */
  private async isExistingDatabase(): Promise<boolean> {
    try {
      // Check if tasks table exists (core table that should exist in any initialized database)
      const result = await this.executor.get<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'"
      );
      console.log('[Migrations] isExistingDatabase check result:', result);
      return result !== undefined;
    } catch (err) {
      console.log('[Migrations] isExistingDatabase check error:', err);
      return false;
    }
  }

  /**
   * Run all pending migrations up to the latest version
   */
  async migrate(): Promise<MigrationResult> {
    await this.initMigrationsTable();

    let currentVersion = await this.getCurrentVersion();
    const appliedMigrations: string[] = [];

    // Handle existing databases that predate the migration system
    if (currentVersion === 0 && await this.isExistingDatabase()) {
      console.log('[Migrations] Existing database detected, stamping as version 1');

      // Stamp version 1 as already applied (initial schema exists)
      const initialMigration = this.migrations.find(m => m.version === 1);
      if (initialMigration) {
        await this.executor.run(
          'INSERT INTO _migrations (version, name, checksum, execution_time_ms) VALUES (?, ?, ?, ?)',
          [1, initialMigration.name, 'existing-database', 0]
        );
        currentVersion = 1;
      }
    }

    console.log(`[Migrations] Current version: ${currentVersion}`);

    const pending = this.migrations.filter(m => m.version > currentVersion);
    console.log(`[Migrations] Pending migrations: ${pending.length}`);

    for (const migration of pending) {
      const startTime = Date.now();
      console.log(`[Migrations] Applying: ${migration.version}_${migration.name}`);

      try {
        // Execute each statement in the migration
        for (const sql of migration.up) {
          try {
            await this.executor.exec(sql);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Ignore "table/index already exists" errors
            if (errorMessage.includes('already exists')) {
              console.log(`[Migrations] Skipped (exists): ${sql.substring(0, 50)}...`);
              continue;
            }

            // Ignore "duplicate column" errors
            if (errorMessage.includes('duplicate column')) {
              console.log(`[Migrations] Skipped (column exists): ${sql.substring(0, 50)}...`);
              continue;
            }

            throw error;
          }
        }

        // Record the migration as applied
        const executionTime = Date.now() - startTime;
        const checksum = this.calculateChecksum(migration);

        await this.executor.run(
          'INSERT INTO _migrations (version, name, checksum, execution_time_ms) VALUES (?, ?, ?, ?)',
          [migration.version, migration.name, checksum, executionTime]
        );

        appliedMigrations.push(`${migration.version}_${migration.name}`);
        console.log(`[Migrations] Applied: ${migration.version}_${migration.name} (${executionTime}ms)`);

      } catch (error) {
        console.error(`[Migrations] Failed: ${migration.version}_${migration.name}`, error);
        throw new Error(
          `Migration ${migration.version}_${migration.name} failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const newVersion = await this.getCurrentVersion();
    console.log(`[Migrations] Complete. Version: ${newVersion}`);

    return {
      applied: appliedMigrations.length,
      currentVersion: newVersion,
      appliedMigrations,
    };
  }

  /**
   * Run seed data (initial data that should exist)
   * Handles constraint violations gracefully (data already exists)
   */
  async seed(seedStatements: string[]): Promise<void> {
    console.log('[Migrations] Running seed data...');

    for (const sql of seedStatements) {
      try {
        await this.executor.exec(sql);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Ignore constraint violations (data already exists)
        if (
          errorMessage.includes('UNIQUE constraint') ||
          errorMessage.includes('PRIMARY KEY constraint')
        ) {
          continue;
        }

        console.warn('[Migrations] Seed warning:', errorMessage);
      }
    }

    console.log('[Migrations] Seed complete');
  }

  /**
   * Get migration status information
   */
  async getStatus(): Promise<{
    currentVersion: number;
    latestVersion: number;
    pendingCount: number;
    appliedMigrations: MigrationRecord[];
  }> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = this.migrations.length > 0
      ? Math.max(...this.migrations.map(m => m.version))
      : 0;
    const appliedMigrations = await this.getAppliedMigrations();

    return {
      currentVersion,
      latestVersion,
      pendingCount: this.migrations.filter(m => m.version > currentVersion).length,
      appliedMigrations,
    };
  }
}

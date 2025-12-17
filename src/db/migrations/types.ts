/**
 * Database Migration Types
 * Defines the structure for versioned database migrations
 */

/**
 * A database migration that can be applied to update the schema
 */
export interface Migration {
  /** Unique version number (monotonically increasing) */
  version: number;

  /** Human-readable name for logging/debugging */
  name: string;

  /** Description of what this migration does */
  description: string;

  /** SQL statements to apply (up migration) */
  up: string[];

  /** SQL statements to rollback (down migration) - optional */
  down?: string[];

  /** Whether this migration contains DDL (CREATE/ALTER TABLE) */
  isDDL?: boolean;
}

/**
 * Record of an applied migration stored in _migrations table
 */
export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
  checksum: string;
  execution_time_ms: number;
}

/**
 * Result of running migrations
 */
export interface MigrationResult {
  /** Number of migrations applied */
  applied: number;

  /** Current database version after migrations */
  currentVersion: number;

  /** List of migrations that were applied */
  appliedMigrations: string[];
}

/**
 * Database executor interface for running migrations
 * This abstracts the platform-specific database implementation
 */
export interface DatabaseExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<{ lastID: number; changes: number }>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * Serializable migration data for JSON export (used by Electron main process)
 */
export interface MigrationData {
  version: number;
  name: string;
  description: string;
  up: string[];
  down?: string[];
  isDDL?: boolean;
}

/**
 * JSON export format for migrations
 */
export interface MigrationsExport {
  /** Schema version for the export format */
  formatVersion: number;

  /** When the export was generated */
  generatedAt: string;

  /** All migrations in order */
  migrations: MigrationData[];

  /** Seed data statements */
  seed: string[];
}

/**
 * Database Migrations Index
 * Exports all migrations and the migration runner
 */

// Re-export types
export type {
  Migration,
  MigrationRecord,
  MigrationResult,
  DatabaseExecutor,
  MigrationData,
  MigrationsExport,
} from './types';

// Re-export runner
export { MigrationRunner } from './runner';

// Import all migrations
import { migration as migration0001 } from './0001_initial_schema';

// Ordered list of all migrations
export const migrations = [
  migration0001,
];

// Latest migration version
export const latestVersion = migrations.length > 0
  ? Math.max(...migrations.map(m => m.version))
  : 0;

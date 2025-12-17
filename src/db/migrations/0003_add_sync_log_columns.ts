/**
 * Migration 0003: Add Sync Log Columns
 * Adds missing columns to sync_log table
 *
 * Note: These columns are already included in the initial schema for new databases.
 * This migration exists to upgrade databases created with an older sync_log schema.
 */

import type { Migration } from './types';

export const migration: Migration = {
  version: 3,
  name: 'add_sync_log_columns',
  description: 'Add changed_data and synced columns to sync_log table',
  isDDL: true,

  up: [
    'ALTER TABLE sync_log ADD COLUMN changed_data TEXT',
    'ALTER TABLE sync_log ADD COLUMN synced INTEGER DEFAULT 0',
  ],

  // Note: SQLite doesn't support DROP COLUMN easily
  down: [],
};

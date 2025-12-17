/**
 * Migration 0002: Add Sync Settings
 * Adds sync-related columns to the settings table
 *
 * Note: These columns are already included in the initial schema for new databases.
 * This migration exists to upgrade databases created before sync was implemented.
 */

import type { Migration } from './types';

export const migration: Migration = {
  version: 2,
  name: 'add_sync_settings',
  description: 'Add sync_mode, sync_server_address, and sync_server_token columns to settings table',
  isDDL: true,

  up: [
    'ALTER TABLE settings ADD COLUMN sync_mode TEXT DEFAULT \'none\'',
    'ALTER TABLE settings ADD COLUMN sync_server_address TEXT',
    'ALTER TABLE settings ADD COLUMN sync_server_token TEXT',
  ],

  // Note: SQLite doesn't support DROP COLUMN easily
  // To rollback, would need to recreate table
  down: [],
};

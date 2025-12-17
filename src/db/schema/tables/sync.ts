/**
 * Sync Tables Schema
 * Tables for device sync functionality
 */

export const DEVICE_INFO_TABLE = `
CREATE TABLE IF NOT EXISTS device_info (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`;

export const SYNC_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_data TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  synced INTEGER DEFAULT 0
)`;

export const SYNC_LOG_INDEX = 'CREATE INDEX IF NOT EXISTS idx_sync_log_unsynced ON sync_log(synced, timestamp)';

export const SYNC_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remote_device_id TEXT NOT NULL,
  remote_device_name TEXT,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('push', 'pull', 'bidirectional')),
  changes_sent INTEGER DEFAULT 0,
  changes_received INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
)`;

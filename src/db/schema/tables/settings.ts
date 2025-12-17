/**
 * Settings Table Schema
 * Single row configuration table for app-wide settings
 */

export const SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  wake_up_time TEXT,
  cooldown_time TEXT,
  sleep_time TEXT,
  -- Sync settings (default: no sync)
  sync_mode TEXT DEFAULT 'none' CHECK (sync_mode IN ('none', 'host', 'client')),
  sync_server_address TEXT,
  sync_server_token TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

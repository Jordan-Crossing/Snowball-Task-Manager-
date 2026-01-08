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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

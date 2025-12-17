/**
 * Lists Table Schema
 * Container for grouping tasks (Warmup, Cooldown, Inbox, custom)
 */

export const LISTS_TABLE = `
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warmup', 'cooldown', 'inbox', 'custom')),
  is_repeating BOOLEAN NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

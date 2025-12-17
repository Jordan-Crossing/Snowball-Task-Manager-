/**
 * Tags Table Schema
 * Categorization and labeling for tasks
 */

export const TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const TASK_TAGS_TABLE = `
CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
)`;

export const TASK_TAGS_INDEX = 'CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id)';

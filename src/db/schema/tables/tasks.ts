/**
 * Tasks Table Schema
 * Core task entity with hierarchical and organizational support
 */

export const TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  list_id INTEGER REFERENCES lists(id) ON DELETE SET NULL,
  flagged_for_today BOOLEAN NOT NULL DEFAULT 0,
  is_repeating BOOLEAN NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT 0,
  quadrant TEXT CHECK (quadrant IS NULL OR quadrant IN ('Q1', 'Q2', 'Q3', 'Q4')),
  maslow_category TEXT,
  maslow_subcategory TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

export const TASKS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_flagged_for_today ON tasks(flagged_for_today)',
];

export const TASK_COMPLETIONS_TABLE = `
CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_date TEXT NOT NULL,
  UNIQUE(task_id, completed_date)
)`;

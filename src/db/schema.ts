/**
 * SQLite schema definition for cross-platform todo app
 * This schema is consistent across both Electron and Capacitor implementations
 */

export const SCHEMA = `
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Settings table: Single row configuration table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  wake_up_time TEXT,
  cooldown_time TEXT,
  sleep_time TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Lists table: Container for grouping tasks
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warmup', 'cooldown', 'inbox', 'custom')),
  is_repeating BOOLEAN NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Projects table: Organized by Eisenhower Matrix and Maslow's hierarchy with hierarchy support
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  parent_project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  duration_minutes INTEGER DEFAULT 0,
  quadrant TEXT CHECK (quadrant IS NULL OR quadrant IN ('Q1', 'Q2', 'Q3', 'Q4')),
  maslow_category TEXT,
  maslow_subcategory TEXT,
  archived BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table: Core task entity with hierarchical and organizational support
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
);

-- Create indexes for common queries on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_flagged_for_today ON tasks(flagged_for_today);

-- Task Completions table: Track daily completions of repeating tasks
CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_date TEXT NOT NULL,
  UNIQUE(task_id, completed_date)
);

-- Tags table: Categorization and labeling
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Task Tags junction table: Many-to-many relationship
CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Create index for task_tags queries
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
`;

/**
 * Initialize default data in the database
 * Called after schema creation to ensure settings row exists
 */
export const INITIAL_DATA = `
-- Ensure settings row exists
INSERT OR IGNORE INTO settings (id, wake_up_time, cooldown_time, sleep_time)
VALUES (1, '06:00', '18:00', '22:00');

-- Create default lists
INSERT OR IGNORE INTO lists (name, type, is_repeating, sort_order)
VALUES
  ('Warmup', 'warmup', 1, 1),
  ('Cooldown', 'cooldown', 1, 2),
  ('Inbox', 'inbox', 0, 3);
`;

/**
 * Database migrations for schema updates
 * These run after initial schema creation to update existing databases
 */
export const MIGRATIONS = `
-- Migrations removed
`;

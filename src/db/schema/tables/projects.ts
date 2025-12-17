/**
 * Projects Table Schema
 * Organized by Eisenhower Matrix and Maslow's hierarchy with hierarchy support
 */

export const PROJECTS_TABLE = `
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
)`;

/**
 * Database Schema - Aggregates all table definitions
 */

// Import all tables
import { SETTINGS_TABLE } from './tables/settings';
import { LISTS_TABLE } from './tables/lists';
import { PROJECTS_TABLE } from './tables/projects';
import { TASKS_TABLE, TASKS_INDEXES, TASK_COMPLETIONS_TABLE } from './tables/tasks';
import { TAGS_TABLE, TASK_TAGS_TABLE, TASK_TAGS_INDEX } from './tables/tags';
import { seedData } from './seed';

// Re-export all tables
export {
  SETTINGS_TABLE,
  LISTS_TABLE,
  PROJECTS_TABLE,
  TASKS_TABLE,
  TASKS_INDEXES,
  TASK_COMPLETIONS_TABLE,
  TAGS_TABLE,
  TASK_TAGS_TABLE,
  TASK_TAGS_INDEX,
  seedData,
};

// Pragma statements for SQLite configuration
export const pragmaStatements: string[] = [
  'PRAGMA foreign_keys = ON',
];

// All schema statements in creation order
export const allSchemaStatements: string[] = [
  SETTINGS_TABLE,
  LISTS_TABLE,
  PROJECTS_TABLE,
  TASKS_TABLE,
  ...TASKS_INDEXES,
  TASK_COMPLETIONS_TABLE,
  TAGS_TABLE,
  TASK_TAGS_TABLE,
  TASK_TAGS_INDEX,
];

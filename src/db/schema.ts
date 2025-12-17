/**
 * SQLite schema definition for cross-platform todo app
 * Re-exports from modular schema for backward compatibility
 */

// Re-export all modular schema exports
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
  DEVICE_INFO_TABLE,
  SYNC_LOG_TABLE,
  SYNC_LOG_INDEX,
  SYNC_HISTORY_TABLE,
  seedData,
  pragmaStatements,
  allSchemaStatements,
} from './schema/index';

// Import for building combined schema
import {
  SETTINGS_TABLE,
  LISTS_TABLE,
  PROJECTS_TABLE,
  TASKS_TABLE,
  TASKS_INDEXES,
  TASK_COMPLETIONS_TABLE,
  TAGS_TABLE,
  TASK_TAGS_TABLE,
  TASK_TAGS_INDEX,
  DEVICE_INFO_TABLE,
  SYNC_LOG_TABLE,
  SYNC_LOG_INDEX,
  SYNC_HISTORY_TABLE,
  seedData,
} from './schema/index';

/**
 * Combined SCHEMA for legacy usage (web.ts, capacitor.ts)
 * This provides the complete schema as a single string for non-migration-based initialization
 */
export const SCHEMA = `
-- Enable foreign key support
PRAGMA foreign_keys = ON;

${SETTINGS_TABLE}

${LISTS_TABLE}

${PROJECTS_TABLE}

${TASKS_TABLE}

${TASKS_INDEXES.join('\n')}

${TASK_COMPLETIONS_TABLE}

${TAGS_TABLE}

${TASK_TAGS_TABLE}

${TASK_TAGS_INDEX}

${DEVICE_INFO_TABLE}

${SYNC_LOG_TABLE}

${SYNC_LOG_INDEX}

${SYNC_HISTORY_TABLE}
`;

/**
 * Initial data for legacy usage
 */
export const INITIAL_DATA = seedData.join('\n');

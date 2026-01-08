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
`;

/**
 * Initial data for legacy usage (web.ts)
 * Includes settings and system lists with safe INSERT patterns
 */
export const INITIAL_DATA = `
${seedData.join('\n')}

-- Create default lists (only if they don't exist by type)
INSERT INTO lists (name, type, is_repeating, sort_order)
SELECT 'Morning', 'morning', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM lists WHERE type = 'morning');

INSERT INTO lists (name, type, is_repeating, sort_order)
SELECT 'Cooldown', 'cooldown', 1, 2
WHERE NOT EXISTS (SELECT 1 FROM lists WHERE type = 'cooldown');

INSERT INTO lists (name, type, is_repeating, sort_order)
SELECT 'Inbox', 'inbox', 0, 3
WHERE NOT EXISTS (SELECT 1 FROM lists WHERE type = 'inbox');
`;

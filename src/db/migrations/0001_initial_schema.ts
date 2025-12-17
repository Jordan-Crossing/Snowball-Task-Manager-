/**
 * Migration 0001: Initial Schema
 * Creates all core tables for the application
 */

import type { Migration } from './types';
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
  pragmaStatements,
} from '../schema';

export const migration: Migration = {
  version: 1,
  name: 'initial_schema',
  description: 'Create initial database schema with all core tables',
  isDDL: true,

  up: [
    // Enable foreign keys
    ...pragmaStatements,

    // Core tables
    SETTINGS_TABLE,
    LISTS_TABLE,
    PROJECTS_TABLE,

    // Tasks and related
    TASKS_TABLE,
    ...TASKS_INDEXES,
    TASK_COMPLETIONS_TABLE,

    // Tags
    TAGS_TABLE,
    TASK_TAGS_TABLE,
    TASK_TAGS_INDEX,

    // Sync
    DEVICE_INFO_TABLE,
    SYNC_LOG_TABLE,
    SYNC_LOG_INDEX,
    SYNC_HISTORY_TABLE,
  ],

  down: [
    'DROP TABLE IF EXISTS sync_history',
    'DROP TABLE IF EXISTS sync_log',
    'DROP TABLE IF EXISTS device_info',
    'DROP TABLE IF EXISTS task_tags',
    'DROP TABLE IF EXISTS tags',
    'DROP TABLE IF EXISTS task_completions',
    'DROP TABLE IF EXISTS tasks',
    'DROP TABLE IF EXISTS projects',
    'DROP TABLE IF EXISTS lists',
    'DROP TABLE IF EXISTS settings',
  ],
};

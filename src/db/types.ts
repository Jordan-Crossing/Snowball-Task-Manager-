/**
 * Shared database types and interfaces for cross-platform todo app
 * These types are used by both Electron (sync) and Capacitor (async) implementations
 */

/**
 * Settings table - Single row table storing app-wide configuration
 */
export interface Settings {
  id: 1; // Always 1 (enforced by CHECK constraint)
  wake_up_time?: string; // HH:MM format
  cooldown_time?: string; // HH:MM format
  sleep_time?: string; // HH:MM format
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Lists table - Container for grouping tasks (warmup, cooldown, inbox, custom)
 */
export interface List {
  id: number;
  name: string;
  type: 'warmup' | 'cooldown' | 'inbox' | 'custom';
  is_repeating: boolean;
  sort_order: number;
  created_at: string;
}

/**
 * Projects table - Projects organized by Eisenhower Matrix and Maslow's hierarchy
 */
export interface Project {
  id: number;
  name: string;
  description?: string;
  quadrant?: 'Q1' | 'Q2' | 'Q3' | 'Q4'; // Eisenhower Matrix
  maslow_category?: string; // e.g., "Physiological", "Safety", "Love", "Esteem", "Self-actualization"
  maslow_subcategory?: string; // e.g., "Health", "Security", "Relationships"
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Tasks table - Core task entity with hierarchical support
 */
export interface Task {
  id: number;
  title: string;
  description?: string;
  context?: string; // Long-form notes
  duration_minutes?: number;
  parent_task_id?: number; // For nested tasks (FK to tasks.id)
  project_id?: number; // FK to projects.id
  list_id?: number; // FK to lists.id
  flagged_for_today: boolean;
  is_repeating: boolean;
  quadrant?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  maslow_category?: string;
  maslow_subcategory?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Task Completions table - Track daily completions of repeating tasks
 */
export interface TaskCompletion {
  id: number;
  task_id: number; // FK to tasks.id
  completed_date: string; // YYYY-MM-DD format
}

/**
 * Tags table - Categorization and labeling
 */
export interface Tag {
  id: number;
  name: string; // UNIQUE
  color?: string; // Hex color code (e.g., "#FF5733")
  created_at: string;
}

/**
 * Task Tags junction table - Many-to-many relationship
 */
export interface TaskTag {
  task_id: number; // FK to tasks.id
  tag_id: number; // FK to tags.id
}

/**
 * Database interface - Abstract layer supporting both sync (Electron) and async (Capacitor) operations
 * All methods are async to provide a consistent API across platforms.
 * The Electron implementation will return promises that resolve immediately.
 */
export interface Database {
  /**
   * Execute raw SQL without returning results
   * Useful for DDL operations like schema initialization
   */
  exec(sql: string): Promise<void>;

  /**
   * Execute SQL that modifies data (INSERT, UPDATE, DELETE)
   * @returns Object with lastID and changes count
   */
  run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>;

  /**
   * Execute SQL that returns a single row
   * @returns Single typed result or undefined if no match
   */
  get<T>(sql: string, params?: any[]): Promise<T | undefined>;

  /**
   * Execute SQL that returns multiple rows
   * @returns Array of typed results
   */
  all<T>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;
}

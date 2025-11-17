# SQLite Database Layer Setup

## Overview

Your cross-platform todo app now has a unified SQLite database layer that works seamlessly on both Electron (Linux desktop) and Capacitor (Android).

## Architecture

- **src/db/types.ts** - Shared TypeScript interfaces for all database entities
- **src/db/schema.ts** - SQL schema definition for all tables
- **src/db/electron.ts** - Electron implementation using better-sqlite3 (synchronous)
- **src/db/capacitor.ts** - Capacitor implementation using @capacitor-community/sqlite (asynchronous)
- **src/db/index.ts** - Factory that detects platform and returns the correct implementation

## Usage

### Basic Setup

```typescript
import { getDatabase, closeDatabase, Task, Project, List } from './db';

// Initialize database (happens automatically)
const db = await getDatabase();

// Query tasks
const tasks = await db.all<Task>(
  'SELECT * FROM tasks WHERE flagged_for_today = ? ORDER BY sort_order ASC',
  [1]
);

// Get a single task
const task = await db.get<Task>(
  'SELECT * FROM tasks WHERE id = ?',
  [taskId]
);

// Create a task
const result = await db.run(
  'INSERT INTO tasks (title, project_id, flagged_for_today, sort_order) VALUES (?, ?, ?, ?)',
  ['My Task', projectId, 1, 0]
);
console.log('New task ID:', result.lastID);

// Update a task
await db.run(
  'UPDATE tasks SET completed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  [taskId]
);

// Delete a task
await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);

// Clean up on app exit
window.addEventListener('beforeunload', () => {
  closeDatabase();
});
```

## Database Schema

### Tables

#### settings
Single-row configuration table:
- `id` (PK, CHECK id = 1)
- `wake_up_time`, `cooldown_time`, `sleep_time` (HH:MM format)
- `created_at`, `updated_at`

#### lists
Task grouping containers:
- `id` (auto-increment PK)
- `name`, `type` (warmup/cooldown/inbox/custom)
- `is_repeating` (boolean)
- `sort_order`
- `created_at`

Default lists are created automatically: Warmup, Cooldown, and Inbox.

#### projects
Organized by Eisenhower Matrix and Maslow's hierarchy:
- `id` (auto-increment PK)
- `name`, `description`
- `quadrant` (Q1/Q2/Q3/Q4)
- `maslow_category`, `maslow_subcategory`
- `archived` (boolean)
- `created_at`, `updated_at`

#### tasks
Core task entity with hierarchical support:
- `id` (auto-increment PK)
- `title`, `description`, `context` (long-form notes)
- `duration_minutes`
- `parent_task_id` (self-referencing for nested tasks)
- `project_id`, `list_id` (foreign keys)
- `flagged_for_today`, `is_repeating` (booleans)
- `quadrant`, `maslow_category`, `maslow_subcategory`
- `sort_order`
- `created_at`, `updated_at`

#### task_completions
Track daily completions of repeating tasks:
- `id` (auto-increment PK)
- `task_id` (FK to tasks)
- `completed_date` (YYYY-MM-DD format)
- Unique constraint: (task_id, completed_date)

#### tags
Categorization labels:
- `id` (auto-increment PK)
- `name` (UNIQUE)
- `color` (optional hex color)
- `created_at`

#### task_tags
Many-to-many junction table:
- `task_id` (FK to tasks, composite PK)
- `tag_id` (FK to tags, composite PK)

## Key Features

### Platform Detection

The factory automatically detects whether it's running in:
- **Electron**: Checks for window.electronAPI, require, or Electron user agent
- **Capacitor**: Defaults to Capacitor if not Electron

### Consistent API

All methods return Promises, making the API consistent across platforms:
- `exec(sql)` - Execute raw SQL
- `run(sql, params)` - Execute INSERT/UPDATE/DELETE
- `get<T>(sql, params)` - Get single row
- `all<T>(sql, params)` - Get multiple rows
- `close()` - Close connection

### Foreign Key Support

Foreign key constraints are enabled automatically. Cascading deletes and SET NULL behaviors are configured:
- Parent task deletion cascades to child tasks
- Project/list deletion sets task references to NULL

### Automatic Initialization

The database schema and default data are initialized automatically on first connection.

## Dependencies

- **Electron**: `better-sqlite3@9.4.3+`
- **Capacitor**: `@capacitor-community/sqlite@7.0.2+`

Both are already installed. Run `npm install` to ensure they're available.

## Testing

To test the database layer, you can create a simple test in your App.tsx:

```typescript
import { useEffect } from 'react';
import { getDatabase, Task } from './db';

function App() {
  useEffect(() => {
    const initDb = async () => {
      const db = await getDatabase();
      
      // Test creating a task
      const result = await db.run(
        'INSERT INTO tasks (title, flagged_for_today, sort_order) VALUES (?, ?, ?)',
        ['Test Task', 1, 0]
      );
      console.log('Created task:', result.lastID);
      
      // Test querying tasks
      const tasks = await db.all<Task>(
        'SELECT * FROM tasks ORDER BY created_at DESC LIMIT 10'
      );
      console.log('Tasks:', tasks);
    };
    
    initDb().catch(console.error);
  }, []);

  return (
    // Your app UI
  );
}
```

## Notes

- All dates/timestamps use ISO format (CURRENT_TIMESTAMP in SQLite)
- Text queries use YYYY-MM-DD format for dates
- Parameters are safely bound using prepared statements
- The Electron implementation wraps sync calls in Promises for API consistency
- Empty fields/nullable columns default to NULL

/**
 * Task duration utilities
 * Auto-adjust parent task durations when children exceed parent
 */

import type { Task } from '../db/types';
import type { Database } from '../db/types';

/**
 * Auto-adjust parent task duration if children's total exceeds it
 * Recursively adjusts all ancestors up the hierarchy
 *
 * @param db Database connection
 * @param taskId The task that was just updated
 * @param allTasks All tasks in the system (for hierarchy traversal)
 */
export async function autoAdjustParentDurations(
  db: Database,
  taskId: number,
  allTasks: Task[]
): Promise<void> {
  const task = allTasks.find(t => t.id === taskId);
  if (!task || !task.parent_task_id) {
    return; // No parent to adjust
  }

  const parentId = task.parent_task_id;
  await adjustTaskDuration(db, parentId, allTasks);
}

/**
 * Calculate total duration of all child tasks and update parent if needed
 * Then recursively check the parent's parent
 */
async function adjustTaskDuration(
  db: Database,
  taskId: number,
  allTasks: Task[]
): Promise<void> {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  // Get all direct children
  const children = allTasks.filter(t => t.parent_task_id === taskId);

  if (children.length === 0) {
    return; // No children, nothing to adjust
  }

  // Calculate total duration of all children
  const totalChildDuration = children.reduce((sum, child) => {
    return sum + (child.duration_minutes || 0);
  }, 0);

  // If children total exceeds parent duration, update parent
  const currentParentDuration = task.duration_minutes || 0;

  if (totalChildDuration > currentParentDuration) {
    try {
      // Update parent duration in database
      await db.run(
        'UPDATE tasks SET duration_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [totalChildDuration, taskId]
      );

      // Update the task object for recursive check
      const updatedTask = { ...task, duration_minutes: totalChildDuration };
      const updatedTasks = allTasks.map(t => t.id === taskId ? updatedTask : t);

      // Recursively check if this task's parent needs adjustment
      if (task.parent_task_id) {
        await adjustTaskDuration(db, task.parent_task_id, updatedTasks);
      }
    } catch (error) {
      console.error('Failed to auto-adjust parent duration:', error);
    }
  }
}

/**
 * Trigger auto-adjust for a task and all its ancestors
 * Call this after updating a task's duration
 *
 * @param db Database connection
 * @param taskId The task whose duration changed
 */
export async function triggerDurationAdjustment(
  db: Database,
  taskId: number
): Promise<void> {
  try {
    // Fetch all tasks for hierarchy traversal
    const allTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order');

    await autoAdjustParentDurations(db, taskId, allTasks);
  } catch (error) {
    console.error('Failed to trigger duration adjustment:', error);
  }
}

/**
 * Hook for fetching tasks with filters
 * Handles loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import { getDatabase, type Task } from '../db';

interface UseTasksOptions {
  listId?: number;
  projectId?: number;
  parentTaskId?: number;
  flaggedOnly?: boolean;
  skip?: boolean;
}

export function useTasks(options: UseTasksOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async () => {
    if (options.skip) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = await getDatabase();

      let query = 'SELECT * FROM tasks WHERE 1=1';
      const params: any[] = [];

      if (options.listId !== undefined) {
        query += ' AND list_id = ?';
        params.push(options.listId);
      }

      if (options.projectId !== undefined) {
        query += ' AND project_id = ?';
        params.push(options.projectId);
      }

      if (options.parentTaskId !== undefined) {
        query += ' AND parent_task_id = ?';
        params.push(options.parentTaskId);
      }

      if (options.flaggedOnly) {
        query += ' AND flagged_for_today = 1';
      }

      query += ' ORDER BY sort_order';

      const result = await db.all<Task>(query, params);
      setTasks(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [options.listId, options.projectId, options.parentTaskId, options.flaggedOnly, options.skip]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}

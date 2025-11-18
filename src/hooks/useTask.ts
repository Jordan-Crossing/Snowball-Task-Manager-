/**
 * Hook for fetching a single task by ID
 */

import { useState, useEffect, useCallback } from 'react';
import { getDatabase, type Task } from '../db';

export function useTask(taskId: number | null | undefined) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = await getDatabase();
      const result = await db.get<Task>('SELECT * FROM tasks WHERE id = ?', [taskId]);
      setTask(result || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return { task, loading, error, refetch: fetchTask };
}

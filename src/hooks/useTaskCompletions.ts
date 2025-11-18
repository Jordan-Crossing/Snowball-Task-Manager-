/**
 * Hook to get completion history for a task
 */

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

interface TaskCompletion {
  id: number;
  task_id: number;
  completed_date: string;
}

export function useTaskCompletions(taskId: number | null): {
  completions: TaskCompletion[];
  loading: boolean;
  error: string | null;
} {
  const db = useStore((state) => state.db);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !taskId) {
      setCompletions([]);
      return;
    }

    const fetchCompletions = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await db.all<TaskCompletion>(
          'SELECT * FROM task_completions WHERE task_id = ? ORDER BY completed_date DESC',
          [taskId]
        );
        setCompletions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load completions');
        setCompletions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletions();
  }, [db, taskId]);

  return { completions, loading, error };
}

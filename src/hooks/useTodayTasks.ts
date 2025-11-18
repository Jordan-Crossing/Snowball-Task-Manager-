/**
 * Hook to get tasks flagged for today
 */

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Task } from '../db/types';

export function useTodayTasks(): Task[] {
  const tasks = useStore((state) => state.tasks);

  return useMemo(() => {
    return tasks.filter(task => task.flagged_for_today);
  }, [tasks]);
}

/**
 * Hook to get warmup/morning repeating tasks
 */

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Task } from '../db/types';

export function useMorningTasks(): Task[] {
  const tasks = useStore((state) => state.tasks);
  const lists = useStore((state) => state.lists);

  return useMemo(() => {
    const warmupList = lists.find(l => l.type === 'warmup');
    if (!warmupList) return [];

    return tasks.filter(task => task.list_id === warmupList.id && !task.project_id);
  }, [tasks, lists]);
}

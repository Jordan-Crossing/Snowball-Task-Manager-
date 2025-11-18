/**
 * Hook to get cooldown/evening repeating tasks
 */

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Task } from '../db/types';

export function useCooldownTasks(): Task[] {
  const tasks = useStore((state) => state.tasks);
  const lists = useStore((state) => state.lists);

  return useMemo(() => {
    const cooldownList = lists.find(l => l.type === 'cooldown');
    if (!cooldownList) return [];

    return tasks.filter(task => task.list_id === cooldownList.id);
  }, [tasks, lists]);
}

/**
 * Hook to get a single project with its tasks
 */

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Project, Task } from '../db/types';

interface ProjectWithTasks {
  project: Project;
  tasks: Task[];
  taskCount: number;
}

export function useProject(projectId: number | null): ProjectWithTasks | null {
  const projects = useStore((state) => state.projects);
  const tasks = useStore((state) => state.tasks);

  return useMemo(() => {
    if (!projectId) return null;

    const project = projects.find(p => p.id === projectId);
    if (!project) return null;

    const projectTasks = tasks.filter(t => t.project_id === projectId);

    return {
      project,
      tasks: projectTasks,
      taskCount: projectTasks.length,
    };
  }, [projectId, projects, tasks]);
}

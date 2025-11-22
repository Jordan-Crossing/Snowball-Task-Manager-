import type { Task, TaskWithChildren } from '../db/types';

self.onmessage = (e: MessageEvent<Task[]>) => {
  const tasks = e.data;
  const hierarchy = buildHierarchy(tasks);
  self.postMessage(hierarchy);
};

function buildHierarchy(tasks: Task[]): TaskWithChildren[] {
  const taskMap = new Map<number, TaskWithChildren>();
  const roots: TaskWithChildren[] = [];

  // First pass: create all task nodes
  tasks.forEach((task) => {
    taskMap.set(task.id, { ...task, children: [] });
  });

  // Second pass: build hierarchy
  tasks.forEach((task) => {
    const taskNode = taskMap.get(task.id)!;
    if (task.parent_task_id) {
      const parent = taskMap.get(task.parent_task_id);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(taskNode);
      } else {
        roots.push(taskNode);
      }
    } else {
      roots.push(taskNode);
    }
  });

  // Third pass: calculate durations (bottom-up)
  const calculateDuration = (node: TaskWithChildren): number => {
    if (!node.children || node.children.length === 0) {
      node.totalChildrenDuration = 0;
      return node.duration_minutes || 0;
    }
    
    let childrenSum = 0;
    for (const child of node.children) {
      childrenSum += calculateDuration(child);
    }
    
    node.totalChildrenDuration = childrenSum;
    return Math.max(node.duration_minutes || 0, childrenSum);
  };

  roots.forEach(calculateDuration);

  return roots;
}

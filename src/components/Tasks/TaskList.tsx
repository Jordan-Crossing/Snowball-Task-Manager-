/**
 * Task list component with hierarchy support
 * Displays tasks with proper indentation and grouping
 */

import React, { useState, useMemo } from 'react';
import { List, Box, CircularProgress, Typography } from '@mui/material';
import type { Task } from '../../db/types';
import { TaskItem } from './TaskItem';
import { FilterSortBar } from '../common';

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  onTaskSelect?: (taskId: number) => void;
  onToggleComplete?: (taskId: number) => void;
  onToggleFlag?: (taskId: number) => void;
  onMakeSubtask?: (taskId: number, parentTaskId: number) => void;
  onReorderTask?: (taskId: number, targetTaskId: number, position: 'before' | 'after') => void;
  selectedTaskId?: number | null;
  completedToday?: Set<number>;
  emptyMessage?: string;
}

interface TaskWithChildren extends Task {
  children?: TaskWithChildren[];
}

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

  return roots;
}

function renderTasks(
  tasks: TaskWithChildren[],
  allTasks: Task[],
  depth: number,
  onTaskSelect: (taskId: number) => void,
  onToggleComplete: (taskId: number) => void,
  onToggleFlag: (taskId: number) => void,
  onMakeSubtask: (taskId: number, parentTaskId: number) => void,
  onReorderTask: (taskId: number, targetTaskId: number, position: 'before' | 'after') => void,
  completedToday: Set<number>,
  selectedTaskId?: number | null
): React.ReactNode[] {
  return tasks.flatMap((task) => [
    <TaskItem
      key={task.id}
      task={task}
      allTasks={allTasks}
      depth={depth}
      onSelect={onTaskSelect}
      onToggleComplete={onToggleComplete}
      onToggleFlag={onToggleFlag}
      onMakeSubtask={onMakeSubtask}
      onReorderTask={onReorderTask}
      selected={selectedTaskId === task.id}
      completedToday={completedToday}
    />,
    ...(task.children && task.children.length > 0
      ? renderTasks(
          task.children,
          allTasks,
          depth + 1,
          onTaskSelect,
          onToggleComplete,
          onToggleFlag,
          onMakeSubtask,
          onReorderTask,
          completedToday,
          selectedTaskId
        )
      : []),
  ]);
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading = false,
  onTaskSelect = () => {},
  onToggleComplete = () => {},
  onToggleFlag = () => {},
  onMakeSubtask = () => {},
  onReorderTask = () => {},
  selectedTaskId,
  completedToday = new Set(),
  emptyMessage = 'No tasks yet',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('default');

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.context?.toLowerCase().includes(query)
      );
    }

    // Filter (multiple filters)
    if (filterBy.length > 0) {
      result = result.filter((task) => {
        // Check if task matches any of the selected filters
        return filterBy.some((filter) => {
          if (filter === 'flagged') {
            return task.flagged_for_today;
          } else if (filter === 'completed') {
            return completedToday.has(task.id);
          } else if (filter === 'incomplete') {
            return !completedToday.has(task.id);
          } else if (filter.startsWith('Q')) {
            return task.quadrant === filter;
          } else {
            return task.maslow_category === filter;
          }
        });
      });
    }

    // Sort (only for top-level tasks - hierarchy will be maintained)
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'recent':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'oldest':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'duration':
          return (b.duration_minutes || 0) - (a.duration_minutes || 0);
        case 'duration-asc':
          return (a.duration_minutes || 0) - (b.duration_minutes || 0);
        default:
          return a.sort_order - b.sort_order;
      }
    });

    return result;
  }, [tasks, searchQuery, filterBy, sortBy, completedToday]);

  const hasActiveFilters = searchQuery || filterBy.length > 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hierarchyTasks = buildHierarchy(filteredAndSortedTasks);

  const sortOptions = [
    { value: 'default', label: 'Default Order' },
    { value: 'title', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'recent', label: 'Recently Updated' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'duration', label: 'Longest Duration' },
    { value: 'duration-asc', label: 'Shortest Duration' },
  ];

  const filterOptions = [
    { value: 'flagged', label: 'Flagged for Today' },
    { value: 'completed', label: 'Completed' },
    { value: 'incomplete', label: 'Incomplete' },
    { value: 'Q1', label: 'Q1 - Urgent & Important' },
    { value: 'Q2', label: 'Q2 - Not Urgent & Important' },
    { value: 'Q3', label: 'Q3 - Urgent & Not Important' },
    { value: 'Q4', label: 'Q4 - Not Urgent & Not Important' },
    { value: 'Physiological', label: '🍎 Physiological' },
    { value: 'Safety', label: '🛡️ Safety' },
    { value: 'Love & Belonging', label: '❤️ Love & Belonging' },
    { value: 'Esteem', label: '⭐ Esteem' },
    { value: 'Self-actualization', label: '🎯 Self-actualization' },
  ];

  if (hierarchyTasks.length === 0) {
    return (
      <Box>
        <FilterSortBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search tasks..."
          sortValue={sortBy}
          sortOptions={sortOptions}
          onSortChange={setSortBy}
          filterValues={filterBy}
          filterOptions={filterOptions}
          onFilterChange={setFilterBy}
        />
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary">
            {hasActiveFilters ? 'No tasks match your filters' : emptyMessage}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <FilterSortBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search tasks..."
        sortValue={sortBy}
        sortOptions={sortOptions}
        onSortChange={setSortBy}
        filterValues={filterBy}
        filterOptions={filterOptions}
        onFilterChange={setFilterBy}
      />
      <List sx={{ width: '100%' }}>
        {renderTasks(
          hierarchyTasks,
          tasks,
          0,
          onTaskSelect,
          onToggleComplete,
          onToggleFlag,
          onMakeSubtask,
          onReorderTask,
          completedToday,
          selectedTaskId
        )}
      </List>
    </Box>
  );
};

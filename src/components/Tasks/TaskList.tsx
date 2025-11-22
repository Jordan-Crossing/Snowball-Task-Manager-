/**
 * Task list component with hierarchy support
 * Displays tasks with proper indentation and grouping
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { List, Box, CircularProgress, Typography } from '@mui/material';
import type { Task, Tag, TaskWithChildren } from '../../db/types';
import { TaskItem } from './TaskItem';
import { FilterSortBar, type SortOption } from '../common';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useStore } from '../../store/useStore';

interface TaskListProps {
  tasks: Task[];
  tags?: Tag[];
  taskTags?: Map<number, number[]>;
  loading?: boolean;
  selectedTaskId?: number | null;
  completedToday?: Set<number>;
  emptyMessage?: string;
  hideControls?: boolean;
  separateCompleted?: boolean;
  sortStrategy?: 'default' | 'quadrant-maslow';
}

interface TaskTreeItemProps {
  task: TaskWithChildren;
  allTasksRef: React.MutableRefObject<Task[]>;
  tags: Tag[];
  taskTags: Map<number, number[]>;
  depth: number;
  completedToday: Set<number>;
  selectedTaskId?: number | null;
  selectedTaskIds?: number[];
  colorIndex?: number;
}

const TaskTreeItem: React.FC<TaskTreeItemProps> = React.memo(({
  task,
  allTasksRef,
  tags,
  taskTags,
  depth,
  completedToday,
  selectedTaskId,
  selectedTaskIds = [],
  colorIndex = 0,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLLIElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const el = wrapperRef.current;
    const handle = dragHandleRef.current;
    if (!el || !handle) return;

    return draggable({
      element: el,
      dragHandle: handle,
      getInitialData: () => ({ taskId: task.id, type: 'task' }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });
  }, [task.id]);

  const isSelected = selectedTaskId === task.id || selectedTaskIds.includes(task.id);
  const hasChildren = !!(task.children && task.children.length > 0);

  return (
    <Box ref={wrapperRef} sx={{ opacity: isDragging ? 0.5 : 1 }}>
      <TaskItem
        task={task}
        allTasksRef={allTasksRef}
        tags={tags}
        taskTags={taskTags}
        depth={depth}
        selected={isSelected}
        completedToday={completedToday}
        dragHandleRef={dragHandleRef as React.RefObject<HTMLElement>}
        isDraggable={false} // Handled by wrapper
        isDragging={isDragging}
        totalChildrenDuration={task.totalChildrenDuration}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        colorIndex={colorIndex}
      />
      {isExpanded && hasChildren && (
        <Box>
          {task.children!.map((child) => (
            <TaskTreeItem
              key={child.id}
              task={child}
              allTasksRef={allTasksRef}
              tags={tags}
              taskTags={taskTags}
              depth={depth + 1}
              completedToday={completedToday}
              selectedTaskId={selectedTaskId}
              selectedTaskIds={selectedTaskIds}
              colorIndex={colorIndex}
            />
          ))}
        </Box>
      )}
    </Box>
  );
});

// Helper to render task list recursively
const renderTasks = (
  tasks: TaskWithChildren[],
  allTasksRef: React.MutableRefObject<Task[]>,
  tags: Tag[] | undefined,
  taskTags: Map<number, number[]> | undefined,
  depth: number,
  completedToday: Set<number>,
  selectedTaskId: number | null | undefined,
  selectedTaskIds: number[] = []
) => {
  return tasks.map((task, index) => (
    <TaskTreeItem
      key={task.id}
      task={task}
      allTasksRef={allTasksRef}
      tags={tags || []}
      taskTags={taskTags || new Map()}
      depth={depth}
      completedToday={completedToday}
      selectedTaskId={selectedTaskId}
      selectedTaskIds={selectedTaskIds}
      colorIndex={index}
    />
  ));
};

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  tags,
  taskTags,
  loading = false,
  selectedTaskId,
  completedToday = new Set(),
  emptyMessage = 'No tasks yet',
  hideControls = false,
  separateCompleted = true,
  sortStrategy = 'default',
}) => {
  const selectedTaskIds = useStore(state => state.selectedTaskIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('sort_order-asc');

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
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

    // Sort
    result.sort((a, b) => {
      if (sortStrategy === 'quadrant-maslow') {
        // 1. Quadrant
        const qOrder: Record<string, number> = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
        const qA = qOrder[a.quadrant || ''] || 5;
        const qB = qOrder[b.quadrant || ''] || 5;
        if (qA !== qB) return qA - qB;

        // 2. Maslow
        const mOrder: Record<string, number> = {
          'Physiological': 1,
          'Safety': 2,
          'Love & Belonging': 3,
          'Esteem': 4,
          'Self-actualization': 5
        };
        const mA = mOrder[a.maslow_category || ''] || 6;
        const mB = mOrder[b.maslow_category || ''] || 6;
        if (mA !== mB) return mA - mB;
        
        return a.sort_order - b.sort_order;
      }

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
  }, [tasks, searchQuery, filterBy, sortBy, completedToday, sortStrategy]);

  const hasActiveFilters = searchQuery || filterBy.length > 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const [hierarchyTasks, setHierarchyTasks] = useState<TaskWithChildren[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/hierarchy.worker.ts', import.meta.url));
    workerRef.current.onmessage = (e) => {
      setHierarchyTasks(e.data);
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage(filteredAndSortedTasks);
  }, [filteredAndSortedTasks]);
  
  // Separate completed tasks if requested
  let activeTasks = hierarchyTasks;
  let completedTasks: TaskWithChildren[] = [];

  if (separateCompleted) {
    activeTasks = hierarchyTasks.filter(t => !completedToday.has(t.id));
    completedTasks = hierarchyTasks.filter(t => completedToday.has(t.id));
  }

  const sortOptions: SortOption[] = [
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

  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = filteredAndSortedTasks;
  }, [filteredAndSortedTasks]);

  if (hierarchyTasks.length === 0) {
    return (
      <Box>
        {!hideControls && (
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
        )}
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
      {!hideControls && (
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
      )}

      {separateCompleted && completedTasks.length > 0 && (
        <Box sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ px: 2, mb: 1 }}>
            Completed
          </Typography>
          <List sx={{ width: '100%', opacity: 0.7 }} component="div">
            {renderTasks(
              completedTasks,
              tasksRef,
              tags,
              taskTags,
              0,
              completedToday,
              selectedTaskId,
              selectedTaskIds
            )}
          </List>
        </Box>
      )}

      <List sx={{ width: '100%' }} component="div">
        {renderTasks(
          activeTasks,
          tasksRef,
          tags,
          taskTags,
          0,
          completedToday,
          selectedTaskId,
          selectedTaskIds
        )}
      </List>
    </Box>
  );
};

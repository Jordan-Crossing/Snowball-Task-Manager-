/**
 * Task item component for list views
 * Supports hierarchy indentation, two-line preview, and drag-and-drop
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  ListItem,
  ListItemButton,
  Checkbox,
  Typography,
  Box,
  IconButton,
  Chip,
} from '@mui/material';
import Flag from '@mui/icons-material/Flag';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { Task } from '../../db/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getQuadrantColor, getMaslowEmoji } from '../../constants';
import { formatDuration } from '../../utils/duration';

interface TaskItemProps {
  task: Task;
  allTasks?: Task[];
  depth?: number;
  onToggleComplete: (taskId: number) => void;
  onToggleFlag: (taskId: number) => void;
  onSelect: (taskId: number) => void;
  onMakeSubtask?: (taskId: number, parentTaskId: number) => void;
  onReorderTask?: (taskId: number, targetTaskId: number, position: 'before' | 'after') => void;
  selected?: boolean;
  completedToday?: Set<number>;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  showEnhancedPreview?: boolean; // Show detailed preview with metadata
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  allTasks = [],
  depth = 0,
  onToggleComplete,
  onToggleFlag,
  onSelect,
  onMakeSubtask,
  onReorderTask,
  selected = false,
  completedToday = new Set(),
  isDragging: _isDragging = false,
  onDragStart,
  onDragEnd,
  showEnhancedPreview = true,
}) => {
  const ref = useRef<HTMLLIElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [isDraggingThis, setIsDraggingThis] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  // Check if making taskId a child of parentId would create a circular relationship
  const wouldCreateCircular = (draggedTaskId: number, targetParentId: number): boolean => {
    if (draggedTaskId === targetParentId) return true;

    // Check if targetParentId is a descendant of draggedTaskId
    const isDescendant = (potentialDescendantId: number, ancestorId: number): boolean => {
      if (potentialDescendantId === ancestorId) return true;

      const potentialDescendant = allTasks.find(t => t.id === potentialDescendantId);
      if (!potentialDescendant || !potentialDescendant.parent_task_id) return false;

      return isDescendant(potentialDescendant.parent_task_id, ancestorId);
    };

    return isDescendant(targetParentId, draggedTaskId);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ taskId: task.id, type: 'task' }),
        onDragStart: () => {
          setIsDraggingThis(true);
          onDragStart?.();
        },
        onDrop: () => {
          setIsDraggingThis(false);
          onDragEnd?.();
        },
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input, element }) => {
          const rect = element.getBoundingClientRect();
          const y = input.clientY - rect.top;
          const height = rect.height;

          // Define edge threshold (25% from top or bottom)
          const edgeThreshold = height * 0.25;

          // Only attach edge if we're close to top or bottom
          if (y < edgeThreshold || y > height - edgeThreshold) {
            return attachClosestEdge({ taskId: task.id, type: 'task' }, {
              element,
              input,
              allowedEdges: ['top', 'bottom'],
            });
          }

          // In the middle - no edge attachment (for nesting)
          return { taskId: task.id, type: 'task' };
        },
        canDrop: ({ source }) => {
          const draggedTaskId = source.data.taskId as number;

          // Can't drop on itself
          if (draggedTaskId === task.id) return false;

          // Can't drop if it would create a circular relationship (for subtask operation)
          if (wouldCreateCircular(draggedTaskId, task.id)) return false;

          return source.data.type === 'task';
        },
        onDragEnter: ({ self }) => {
          setIsOver(true);
          const edge = extractClosestEdge(self.data);
          setClosestEdge(edge);
        },
        onDrag: ({ self }) => {
          const edge = extractClosestEdge(self.data);
          setClosestEdge(edge);
        },
        onDragLeave: () => {
          setIsOver(false);
          setClosestEdge(null);
        },
        onDrop: ({ source, self }) => {
          setIsOver(false);
          setClosestEdge(null);
          const draggedTaskId = source.data.taskId as number;
          if (draggedTaskId === task.id) return;

          const edge = extractClosestEdge(self.data);

          // If dropped on top or bottom edge, reorder
          if (edge && onReorderTask) {
            const position = edge === 'top' ? 'before' : 'after';
            onReorderTask(draggedTaskId, task.id, position);
          } else if (onMakeSubtask) {
            // Otherwise, make it a subtask
            onMakeSubtask(draggedTaskId, task.id);
          }
        },
      })
    );
  }, [task.id, allTasks, onDragStart, onDragEnd, onMakeSubtask, onReorderTask]);

  const isCompleted = completedToday.has(task.id);

  return (
    <ListItem
      ref={ref}
      disablePadding
      sx={{
        pl: depth * 2,
        mb: 1,
        backgroundColor: selected
          ? 'action.selected'
          : isOver && !closestEdge
          ? 'primary.light'
          : 'transparent',
        opacity: isDraggingThis ? 0.5 : 1,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: '8px',
        border: isOver && !closestEdge ? '2px dashed' : '2px solid transparent',
        borderColor: isOver && !closestEdge ? 'primary.main' : 'transparent',
        borderTop: isOver && closestEdge === 'top' ? '3px solid' : undefined,
        borderTopColor: isOver && closestEdge === 'top' ? 'primary.main' : undefined,
        borderBottom: isOver && closestEdge === 'bottom' ? '3px solid' : undefined,
        borderBottomColor: isOver && closestEdge === 'bottom' ? 'primary.main' : undefined,
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        },
        '&:hover': {
          backgroundColor: selected
            ? 'action.selected'
            : isOver && !closestEdge
            ? 'primary.light'
            : 'action.hover',
          transform: isDraggingThis ? 'none' : 'translateX(4px)',
        },
      }}
    >
      <ListItemButton
        dense
        selected={selected}
        onClick={() => onSelect(task.id)}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          py: 1.5,
          px: 2,
        }}
      >
        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onToggleComplete(task.id);
          }}
          size="small"
          sx={{ mr: 1.5, mt: -0.5 }}
        />

        {/* Task Content (two-line) */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Line 1: Title */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: isCompleted ? 'line-through' : 'none',
              opacity: isCompleted ? 0.6 : 1,
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {task.title}
          </Typography>

          {/* Line 2: Description and metadata */}
          {showEnhancedPreview && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              {/* Description preview */}
              {task.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    opacity: isCompleted ? 0.5 : 0.7,
                    maxWidth: '300px',
                  }}
                >
                  {task.description}
                </Typography>
              )}

              {/* Metadata badges */}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {/* Duration */}
                {task.duration_minutes && task.duration_minutes > 0 && (
                  <Chip
                    icon={<AccessTimeIcon sx={{ fontSize: '0.9rem' }} />}
                    label={formatDuration(task.duration_minutes, 'long')}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: 0.5 },
                      '& .MuiChip-icon': { ml: 0.5 },
                    }}
                  />
                )}

                {/* Quadrant */}
                {task.quadrant && (
                  <Chip
                    label={task.quadrant}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      backgroundColor: getQuadrantColor(task.quadrant),
                      color: 'white',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                )}

                {/* Maslow Category */}
                {task.maslow_category && (
                  <Chip
                    label={`${getMaslowEmoji(task.maslow_category)} ${task.maslow_category}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* Flag Button */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFlag(task.id);
          }}
          sx={{ ml: 1, mt: -0.5 }}
        >
          {task.flagged_for_today ? (
            <Flag sx={{ fontSize: '1.2rem', color: 'warning.main' }} />
          ) : (
            <FlagOutlined sx={{ fontSize: '1.2rem' }} />
          )}
        </IconButton>
      </ListItemButton>
    </ListItem>
  );
};

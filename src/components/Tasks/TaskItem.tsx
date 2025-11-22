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
  Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import Flag from '@mui/icons-material/Flag';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RepeatIcon from '@mui/icons-material/Repeat';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import type { Task, Tag } from '../../db/types';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getQuadrantColor, getMaslowEmoji } from '../../constants';
import { formatDuration } from '../../utils/duration';
import { useStore } from '../../store/useStore';
import { ConfirmDialog } from '../common';

const PROJECT_BASE_COLORS = [
  '#2196f3', // Blue
  '#4caf50', // Green
  '#9c27b0', // Purple
  '#ff9800', // Orange
  '#e91e63', // Pink
  '#009688', // Teal
  '#ffc107', // Amber
  '#607d8b', // Blue Grey
];

interface TaskItemProps {
  task: Task;
  allTasksRef?: React.MutableRefObject<Task[]>;
  tags?: Tag[];
  taskTags?: Map<number, number[]>;
  depth?: number;
  colorIndex?: number;
  selected?: boolean;
  completedToday?: Set<number>;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  showEnhancedPreview?: boolean; // Show detailed preview with metadata
  dragHandleRef?: React.RefObject<HTMLElement>;
  isDraggable?: boolean;
  totalChildrenDuration?: number;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  hasChildren?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = React.memo(({
  task,
  allTasksRef,
  tags = [],
  taskTags = new Map(),
  depth = 0,
  colorIndex = 0,
  selected = false,
  completedToday = new Set(),
  isDragging: _isDragging = false,
  onDragStart,
  onDragEnd,
  showEnhancedPreview = true,
  dragHandleRef,
  isDraggable = true,
  totalChildrenDuration,
  onToggleExpand,
  isExpanded = true,
  hasChildren = false,
}) => {
  const {
    toggleTaskComplete,
    selectTask,
    deleteTask,
    restoreTask,
    permanentlyDeleteTask,
    reorderTasks,
    updateTask,
    toggleTaskFlag,
    deleteTasks,
    lists,
  } = useStore();
  const selectedTaskIds = useStore(state => state.selectedTaskIds);

  const internalRef = useRef<HTMLLIElement>(null);
  const ref = (dragHandleRef as React.RefObject<HTMLLIElement>) || internalRef;
  const [isOver, setIsOver] = useState(false);
  const [isDraggingThis, setIsDraggingThis] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setMenuAnchorEl(null);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    handleMenuClose(event);
    if (selected && selectedTaskIds.length > 1 && selectedTaskIds.includes(task.id)) {
      setDeleteDialogOpen(true);
    } else {
      deleteTask(task.id);
    }
  };

  const handleConfirmDelete = () => {
    deleteTasks(selectedTaskIds);
  };

  // Use passed isDragging state if available, otherwise local state
  const isDragging = _isDragging || isDraggingThis;

  // Calculate descendant count for drag preview - only needed when dragging
  const descendantCount = React.useMemo(() => {
    if (!isDragging) return 0;
    const allTasks = allTasksRef?.current || [];
    
    const getCount = (taskId: number): number => {
      const children = allTasks.filter(t => t.parent_task_id === taskId);
      let count = children.length;
      children.forEach(child => {
        count += getCount(child.id);
      });
      return count;
    };
    
    return getCount(task.id);
  }, [isDragging, task.id, allTasksRef]);

  // Check if making taskId a child of parentId would create a circular relationship
  const wouldCreateCircular = (draggedTaskId: number, targetParentId: number): boolean => {
    if (draggedTaskId === targetParentId) return true;
    const allTasks = allTasksRef?.current || [];

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
      isDraggable ? draggable({
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
      }) : () => {},
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
          if (edge) {
            const position = edge === 'top' ? 'before' : 'after';
            
            // Update parent_task_id to match the target task's parent
            // This allows moving a child to root level (if target is root)
            // or moving a root task to be a child (if target is child)
            // or moving between different parents
            if (task.parent_task_id !== draggedTaskId) { // Don't parent to self (circular check handles this but good to be safe)
               updateTask(draggedTaskId, { parent_task_id: task.parent_task_id || undefined });
            }

            // Let's use a temporary workaround: we will implement the reorder logic here using the ref
            const allTasks = allTasksRef?.current || [];
            const currentIds = allTasks.map(t => t.id);
            const fromIndex = currentIds.indexOf(draggedTaskId);
            const toIndex = currentIds.indexOf(task.id);
            
            if (fromIndex === -1 || toIndex === -1) return;
            
            const newIds = [...currentIds];
            newIds.splice(fromIndex, 1); // Remove
            
            // Calculate new index
            // If we removed an item before the target, the target index shifted down by 1
            let adjustedToIndex = toIndex;
            if (fromIndex < toIndex) adjustedToIndex--;
            
            if (position === 'before') {
              newIds.splice(adjustedToIndex, 0, draggedTaskId);
            } else {
              newIds.splice(adjustedToIndex + 1, 0, draggedTaskId);
            }
            
            reorderTasks(newIds);
          } else {
            // Otherwise, make it a subtask
            updateTask(draggedTaskId, { parent_task_id: task.id });
          }
        },
      })
    );
  }, [task.id, allTasksRef, onDragStart, onDragEnd, reorderTasks, updateTask]);

  const isCompleted = completedToday.has(task.id);
  const indentWidth = 40; // Increased for better touch target and alignment
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Calculate hierarchy color based on project grouping
  const baseColor = PROJECT_BASE_COLORS[colorIndex % PROJECT_BASE_COLORS.length];
  
  // "deeper ... darker" logic
  // In Dark Mode: Less opacity = Darker (closer to black background)
  // In Light Mode: More opacity = Darker (more color on white background)
  let bgOpacity;
  if (isDark) {
    // Start prominent (0.25) and fade out deeper
    bgOpacity = Math.max(0.05, 0.25 - (depth * 0.05));
  } else {
    // Start light (0.08) and get richer/darker deeper
    bgOpacity = 0.08 + (depth * 0.04);
  }

  const hierarchyBgColor = alpha(baseColor, Math.min(bgOpacity, 0.3));
  const hierarchyHoverColor = alpha(baseColor, Math.min(bgOpacity + 0.1, 0.4));

  return (
    <ListItem
      ref={ref}
      disablePadding
      sx={{
        mb: 1,
        position: 'relative',
        backgroundColor: selected
          ? alpha(baseColor, Math.min(bgOpacity + 0.05, 0.3)) // Keep theme color but slightly darker
          : isOver && !closestEdge
          ? 'primary.light'
          : hierarchyBgColor,
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: '8px',
        border: isOver && !closestEdge ? '2px dashed' : '2px solid transparent',
        borderColor: isOver && !closestEdge ? 'primary.main' : 'transparent',
        borderTop: isOver && closestEdge === 'top' ? '3px solid' : undefined,
        borderTopColor: isOver && closestEdge === 'top' ? 'primary.main' : undefined,
        borderBottom: isOver && closestEdge === 'bottom' ? '3px solid' : undefined,
        borderBottomColor: isOver && closestEdge === 'bottom' ? 'primary.main' : undefined,
        cursor: 'grab',
        
        // Rotating glowing border effect
        '&::after': selected ? {
          content: '""',
          position: 'absolute',
          inset: '-2px', // Match the border-box (parent has 2px border)
          padding: '2px', // Border width
          borderRadius: 'inherit',
          // Gradient from dim -> bright -> dim to ensure full visibility
          background: `conic-gradient(from var(--angle), ${alpha(baseColor, 0.15)} 0%, ${baseColor} 50%, ${alpha(baseColor, 0.15)} 100%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: 'rotate-border 4s linear infinite', // Slightly slower for elegance
          pointerEvents: 'none',
          zIndex: 1,
        } : undefined,

        '&:active': {
          cursor: 'grabbing',
        },
        '&:hover': {
          backgroundColor: selected
            ? alpha(baseColor, Math.min(bgOpacity + 0.1, 0.35))
            : isOver && !closestEdge
            ? 'primary.light'
            : hierarchyHoverColor,
          transform: isDragging ? 'none' : 'translateX(4px)',
        },
      }}
    >
      <ListItemButton
        dense
        selected={selected}
        onClick={(e) => selectTask(task.id, { multi: e.ctrlKey || e.metaKey, range: e.shiftKey })}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'stretch',
          p: 0,
          minHeight: 48,
        }}
      >
        {/* Indentation Columns */}
        {Array.from({ length: depth }).map((_, index) => (
          <Box
            key={index}
            sx={{
              width: indentWidth,
              flexShrink: 0,
            }}
          />
        ))}

        {/* Expand/Collapse Toggle */}
        <Box
          sx={{
            width: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {hasChildren && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              sx={{ p: 0.5 }}
            >
              {isExpanded ? (
                <KeyboardArrowDownIcon fontSize="small" sx={{ opacity: 0.7 }} />
              ) : (
                <KeyboardArrowRightIcon fontSize="small" sx={{ opacity: 0.7 }} />
              )}
            </IconButton>
          )}
        </Box>

        {/* Checkbox Column */}
        <Box
          sx={{
            width: indentWidth,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Checkbox
            checked={isCompleted}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              toggleTaskComplete(task.id);
            }}
            size="small"
            sx={{ 
              p: 0,
              color: alpha(baseColor, 0.6),
              '&.Mui-checked': {
                color: baseColor,
              },
              '&:hover': {
                backgroundColor: alpha(baseColor, 0.1),
              },
            }}
          />
        </Box>

        {/* Task Content */}
        <Box sx={{ flex: 1, minWidth: 0, py: 1.5, pr: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Line 1: Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: depth === 0 ? 600 : 500,
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
            {isDragging && descendantCount > 0 && (
              <Chip
                label={`Moving with ${descendantCount} subtasks`}
                size="small"
                color="primary"
                sx={{ height: 24, fontWeight: 'bold' }}
              />
            )}
          </Box>

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
                {((task.duration_minutes || 0) > 0 || (totalChildrenDuration || 0) > 0) && (
                  <Chip
                    icon={<AccessTimeIcon sx={{ fontSize: '0.9rem' }} />}
                    label={
                      totalChildrenDuration && totalChildrenDuration > (task.duration_minutes || 0)
                        ? `${formatDuration(task.duration_minutes || 0)} (Total: ${formatDuration(totalChildrenDuration)})`
                        : formatDuration(task.duration_minutes || 0, 'long')
                    }
                    size="small"
                    variant="outlined"
                    color={totalChildrenDuration && totalChildrenDuration > (task.duration_minutes || 0) ? "warning" : "default"}
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: 0.5 },
                      '& .MuiChip-icon': { ml: 0.5 },
                    }}
                  />
                )}

                {/* Repeating Indicator */}
                {!!task.is_repeating && (
                  <Chip
                    icon={<RepeatIcon sx={{ fontSize: '0.9rem' }} />}
                    label="Repeat"
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

                {/* Tags */}
                {taskTags.has(task.id) && taskTags.get(task.id)!.map((tagId: number) => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: tag.color || 'primary.main',
                        color: 'white',
                        '& .MuiChip-label': { px: 0.5 },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>

        {/* Flag Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskFlag(task.id);
            }}
          >
            {task.flagged_for_today ? (
              <Flag sx={{ fontSize: '1.2rem', color: 'warning.main' }} />
            ) : (
              <FlagOutlined sx={{ fontSize: '1.2rem' }} />
            )}
          </IconButton>
          
          {/* More Menu */}
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ ml: 0.5 }}
          >
            <MoreVertIcon sx={{ fontSize: '1.2rem' }} />
          </IconButton>
          
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={() => handleMenuClose()}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => {
              handleMenuClose();
              selectTask(task.id);
            }}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>

            {!task.deleted_at && lists.filter(l => ['warmup', 'cooldown', 'inbox'].includes(l.type) && l.id !== task.list_id).length > 0 && (
              <Box>
                <Divider />
                {lists.filter(l => ['warmup', 'cooldown', 'inbox'].includes(l.type) && l.id !== task.list_id).map(list => (
                  <MenuItem key={list.id} onClick={(e) => {
                    handleMenuClose(e);
                    updateTask(task.id, { list_id: list.id });
                  }}>
                    <ListItemIcon>
                      <DriveFileMoveIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Move to {list.name}</ListItemText>
                  </MenuItem>
                ))}
                <Divider />
              </Box>
            )}
            
            {task.deleted_at && (
              <MenuItem onClick={(e) => {
                handleMenuClose(e);
                restoreTask(task.id);
              }}>
                <ListItemIcon>
                  <RestoreFromTrashIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Restore</ListItemText>
              </MenuItem>
            )}

            {!task.deleted_at && (
              <MenuItem onClick={handleDeleteClick}>
                <ListItemIcon>
                  <DeleteOutlineIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
              </MenuItem>
            )}

            {task.deleted_at && (
              <MenuItem onClick={(e) => {
                handleMenuClose(e);
                permanentlyDeleteTask(task.id);
              }}>
                <ListItemIcon>
                  <DeleteForeverIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText sx={{ color: 'error.main' }}>Delete Forever</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </Box>
      </ListItemButton>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={`Delete ${selectedTaskIds.length} tasks?`}
        content="These tasks will be moved to the trash."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialogOpen(false)}
        isDestructive
      />
    </ListItem>
  );
});

/**
 * ProjectItem component - Renders individual project with hierarchy support
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Project, Task } from '../../db/types';
import { getQuadrantColor, getMaslowEmoji } from '../../constants';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

interface ProjectItemProps {
  project: Project;
  tasks: Task[];
  onSelect: (projectId: number) => void;
  selected?: boolean;
  depth?: number; // Indentation level for hierarchy
  hasChildren?: boolean; // Does this project have sub-projects?
  isExpanded?: boolean; // Is the folder expanded?
  onToggleExpand?: () => void; // Toggle expansion
  allProjects?: Project[]; // For calculating descendant count
  onMoveTaskToProject?: (taskId: number, projectId: number) => void;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  project,
  tasks,
  onSelect,
  selected = false,
  depth = 0,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  allProjects = [],
  onMoveTaskToProject,
}) => {
  const ref = useRef<HTMLLIElement>(null);
  const [isDraggingThis, setIsDraggingThis] = useState(false);
  const [isOver, setIsOver] = useState(false);

  // Count direct tasks for this project
  const taskCount = tasks.filter(task => task.project_id === project.id).length;

  // Calculate descendant project count
  const getDescendantCount = (projectId: number): number => {
    const children = allProjects.filter(p => p.parent_project_id === projectId);
    let count = children.length;
    children.forEach(child => {
      count += getDescendantCount(child.id);
    });
    return count;
  };

  const descendantCount = getDescendantCount(project.id);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ projectId: project.id, type: 'project' }),
        onDragStart: () => setIsDraggingThis(true),
        onDrop: () => setIsDraggingThis(false),
      }),
      dropTargetForElements({
        element: el,
        getData: () => ({ projectId: project.id, type: 'project' }),
        canDrop: ({ source }) => source.data.type === 'task',
        onDragEnter: () => setIsOver(true),
        onDragLeave: () => setIsOver(false),
        onDrop: ({ source }) => {
          setIsOver(false);
          const taskId = source.data.taskId as number;
          if (taskId && onMoveTaskToProject) {
            onMoveTaskToProject(taskId, project.id);
          }
        },
      })
    );
  }, [project.id, onMoveTaskToProject]);

  const handleClick = () => {
    onSelect(project.id);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the project
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  return (
    <ListItem
      ref={ref}
      disablePadding
      sx={{
        mb: 0.5,
        pl: depth * 2, // Indent based on depth
        opacity: isDraggingThis ? 0.5 : 1,
        border: isDraggingThis || isOver ? '1px dashed' : 'none',
        borderColor: isOver ? 'primary.main' : (isDraggingThis ? 'text.secondary' : 'transparent'),
        bgcolor: isOver ? 'action.hover' : 'transparent',
        borderRadius: 1,
      }}
    >
      <ListItemButton
        selected={selected}
        onClick={handleClick}
        sx={{
          borderRadius: 1,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          '&.Mui-selected': {
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selected',
            },
          },
        }}
      >
        {/* Expand/Collapse Icon (if has children) */}
        {hasChildren ? (
          <IconButton
            size="small"
            onClick={handleExpandClick}
            sx={{ mr: 0.5, p: 0.5 }}
          >
            {isExpanded ? (
              <ExpandMoreIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </IconButton>
        ) : (
          <Box sx={{ width: 32, mr: 0.5 }} /> // Spacer for alignment
        )}

        {/* Project Icon */}
        <ListItemIcon sx={{ minWidth: 40 }}>
          <AccountTreeIcon color="secondary" />
        </ListItemIcon>

        {/* Project Name */}
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {project.name}
              </Typography>
              {isDraggingThis && descendantCount > 0 && (
                <Chip
                  label={`+ ${descendantCount} sub-projects`}
                  size="small"
                  color="primary"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                {taskCount} tasks
              </Typography>
              {project.quadrant && (
                <Chip
                  label={project.quadrant}
                  size="small"
                  sx={{
                    bgcolor: getQuadrantColor(project.quadrant),
                    color: 'white',
                    fontSize: '0.65rem',
                    height: 18,
                  }}
                />
              )}
              {project.maslow_category && (
                <Chip
                  label={`${getMaslowEmoji(project.maslow_category)} ${project.maslow_category}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.65rem',
                    height: 18,
                  }}
                />
              )}
            </Box>
          }
        />
      </ListItemButton>
    </ListItem>
  );
};

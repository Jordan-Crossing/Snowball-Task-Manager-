/**
 * ProjectItem component - Renders individual project with hierarchy support
 */

import React from 'react';
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
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Project, Task } from '../../db/types';
import { getQuadrantColor, getMaslowEmoji } from '../../constants';

interface ProjectItemProps {
  project: Project;
  tasks: Task[];
  onSelect: (projectId: number) => void;
  selected?: boolean;
  depth?: number; // Indentation level for hierarchy
  hasChildren?: boolean; // Does this project have sub-projects?
  isExpanded?: boolean; // Is the folder expanded?
  onToggleExpand?: () => void; // Toggle expansion
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
}) => {
  // Count direct tasks for this project
  const taskCount = tasks.filter(task => task.project_id === project.id).length;

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
      disablePadding
      sx={{
        mb: 0.5,
        pl: depth * 2, // Indent based on depth
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
          {project.is_folder ? (
            isExpanded ? (
              <FolderOpenIcon color="primary" />
            ) : (
              <FolderIcon color="action" />
            )
          ) : (
            <AccountTreeIcon color="secondary" />
          )}
        </ListItemIcon>

        {/* Project Name and Details */}
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {project.name}
              </Typography>
              {taskCount > 0 && (
                <Chip
                  label={`${taskCount}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
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

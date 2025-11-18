/**
 * Breadcrumbs component - Shows navigation path for folders/projects/tasks
 * Clickable segments to navigate up the hierarchy
 */

import React from 'react';
import { Box, Typography, Breadcrumbs as MuiBreadcrumbs, Link } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import type { Project, Task } from '../../db/types';

interface NavigationItem {
  type: 'project' | 'task';
  id: number;
}

interface BreadcrumbsProps {
  navigationPath: NavigationItem[]; // Array of navigation items from root to current
  projects: Project[]; // All projects for looking up names
  tasks: Task[]; // All tasks for looking up names
  onNavigate: (index: number) => void; // Navigate to specific item in path (clicks breadcrumb at index)
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  navigationPath,
  projects,
  tasks,
  onNavigate,
}) => {
  /**
   * Get the display name and icon for a navigation item
   */
  const getItemInfo = (item: NavigationItem): { name: string; icon: React.ReactElement } | null => {
    if (item.type === 'project') {
      const project = projects.find((p) => p.id === item.id);
      if (!project) return null;

      return {
        name: project.name,
        icon: <AccountTreeIcon fontSize="small" />
      };
    } else {
      const task = tasks.find((t) => t.id === item.id);
      if (!task) return null;

      const icon = task.is_folder ? (
        <FolderIcon fontSize="small" />
      ) : (
        <CheckBoxIcon fontSize="small" />
      );

      return { name: task.title, icon };
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ fontSize: '0.875rem' }}
      >
        {/* Root "Home" breadcrumb */}
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => onNavigate(-1)} // -1 indicates root
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            padding: 0,
            font: 'inherit',
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          <HomeIcon fontSize="small" />
          <span>Projects</span>
        </Link>

        {/* Navigation path breadcrumbs */}
        {navigationPath.map((navItem, index) => {
          const itemInfo = getItemInfo(navItem);
          if (!itemInfo) return null;

          const isLast = index === navigationPath.length - 1;

          if (isLast) {
            // Last item - not clickable
            return (
              <Box
                key={`${navItem.type}-${navItem.id}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {itemInfo.icon}
                <Typography color="text.primary" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {itemInfo.name}
                </Typography>
              </Box>
            );
          } else {
            // Clickable breadcrumb
            return (
              <Link
                key={`${navItem.type}-${navItem.id}`}
                component="button"
                underline="hover"
                color="inherit"
                onClick={() => onNavigate(index)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  font: 'inherit',
                  fontSize: '0.875rem',
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                {itemInfo.icon}
                <span>{itemInfo.name}</span>
              </Link>
            );
          }
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

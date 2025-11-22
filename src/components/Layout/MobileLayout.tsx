/**
 * Mobile-optimized layout component
 * Single column view with hamburger menu and full-screen navigation
 */

import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import type { AppState } from './useAppState';
import { Sidebar } from './Sidebar';

interface MobileLayoutProps {
  state: AppState;
  mobileMenuOpen: boolean;
  onMenuOpen: (open: boolean) => void;
  onNavigate: (view: AppState['currentView'], id?: number) => void;
  onAddTask: () => void;
  onMoveTaskToProject?: (taskId: number, projectId: number) => void;
  onDeleteTask?: (taskId: number) => void;
  projects?: Array<{ id: number; name: string } & any>;
  lists?: Array<{ id: number; name: string } & any>;
  tags?: Array<{ id: number; name: string }>;
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  state,
  mobileMenuOpen,
  onMenuOpen,
  onNavigate,
  onAddTask: _onAddTask,
  onMoveTaskToProject,
  onDeleteTask,
  projects = [],
  lists = [],
  tags = [],
  children,
}) => {
  const theme = useTheme();

  // Render breadcrumb with clickable parts
  const renderBreadcrumb = () => {
    const viewLabels: Record<AppState['currentView'], string> = {
      today: 'Today',
      inbox: 'Inbox',
      lists: 'Lists',
      projects: 'Projects',
      tags: 'Tags',
      settings: 'Settings',
      flagged: 'Flagged',
      trash: 'Trash',
    };

    const baseView = viewLabels[state.currentView] || 'Snowball';
    const textColor = theme.palette.text.primary;
    const secondaryColor = theme.palette.text.secondary;

    // If we have a selected item, show clickable breadcrumb
    if (state.currentView === 'projects' && state.selectedProjectId) {
      // Hide breadcrumb on mobile for projects as it's duplicated in the view
      return null;
    } else if (state.currentView === 'lists' && state.selectedListId) {
      const list = lists.find((l) => l.id === state.selectedListId);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="h6"
            onClick={() => onNavigate('lists')}
            sx={{
              fontWeight: 500,
              fontSize: '1rem',
              cursor: 'pointer',
              color: secondaryColor,
              '&:hover': { color: textColor },
            }}
          >
            {baseView}
          </Typography>
          <Typography variant="h6" sx={{ fontSize: '1rem', color: secondaryColor }}>
            →
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: textColor }}>
            {list?.name || 'List'}
          </Typography>
        </Box>
      );
    } else if (state.currentView === 'tags' && state.selectedTagId) {
      const tag = tags.find((t) => t.id === state.selectedTagId);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="h6"
            onClick={() => onNavigate('tags')}
            sx={{
              fontWeight: 500,
              fontSize: '1rem',
              cursor: 'pointer',
              color: secondaryColor,
              '&:hover': { color: textColor },
            }}
          >
            {baseView}
          </Typography>
          <Typography variant="h6" sx={{ fontSize: '1rem', color: secondaryColor }}>
            →
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: textColor }}>
            {tag?.name || 'Tag'}
          </Typography>
        </Box>
      );
    }

    // No selection, just show base view
    return (
      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem', letterSpacing: 0.2, color: textColor }}>
        {baseView}
      </Typography>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.primary',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <Toolbar sx={{ py: 1.5, minHeight: '56px !important', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => onMenuOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          {renderBreadcrumb()}
        </Toolbar>
      </AppBar>

      {/* Drawer Menu */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => onMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'background.paper',
            p: 0,
            borderRadius: 0, // Remove rounded corners
          },
        }}
      >
        <Sidebar
          state={state}
          onNavigate={(view, id) => {
            onNavigate(view, id);
            onMenuOpen(false);
          }}
          projects={projects}
          lists={lists}
          tags={tags}
          onMoveTaskToProject={onMoveTaskToProject}
          onDeleteTask={onDeleteTask}
        />
      </Drawer>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'background.default',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import type { AppState } from './useAppState';

interface MobileLayoutProps {
  state: AppState;
  mobileMenuOpen: boolean;
  onMenuOpen: (open: boolean) => void;
  onNavigate: (view: AppState['currentView']) => void;
  onAddTask: () => void;
  onMoveTaskToProject?: (taskId: number, projectId: number) => void;
  projects?: Array<{ id: number; name: string }>;
  lists?: Array<{ id: number; name: string }>;
  tags?: Array<{ id: number; name: string }>;
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  state,
  mobileMenuOpen,
  onMenuOpen,
  onNavigate,
  onAddTask: _onAddTask,
  onMoveTaskToProject: _onMoveTaskToProject,
  projects = [],
  lists = [],
  tags = [],
  children,
}) => {
  const menuItems = [
    { label: 'Today', view: 'today' as const },
    { label: 'Inbox', view: 'inbox' as const },
    { label: 'Lists', view: 'lists' as const },
    { label: 'Projects', view: 'projects' as const },
    { label: 'Tags', view: 'tags' as const },
  ];

  // Render breadcrumb with clickable parts
  const renderBreadcrumb = () => {
    const viewLabels: Record<AppState['currentView'], string> = {
      today: 'Today',
      inbox: 'Inbox',
      lists: 'Lists',
      projects: 'Projects',
      tags: 'Tags',
      settings: 'Settings',
    };

    const baseView = viewLabels[state.currentView] || 'Snowball';

    // If we have a selected item, show clickable breadcrumb
    if (state.currentView === 'projects' && state.selectedProjectId) {
      const project = projects.find((p) => p.id === state.selectedProjectId);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="h6"
            onClick={() => onNavigate('projects')}
            sx={{
              fontWeight: 500,
              fontSize: '1rem',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.85)',
              '&:hover': { color: 'rgba(255, 255, 255, 1)' },
            }}
          >
            {baseView}
          </Typography>
          <Typography variant="h6" sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            →
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            {project?.name || 'Project'}
          </Typography>
        </Box>
      );
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
              color: 'rgba(255, 255, 255, 0.85)',
              '&:hover': { color: 'rgba(255, 255, 255, 1)' },
            }}
          >
            {baseView}
          </Typography>
          <Typography variant="h6" sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            →
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
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
              color: 'rgba(255, 255, 255, 0.85)',
              '&:hover': { color: 'rgba(255, 255, 255, 1)' },
            }}
          >
            {baseView}
          </Typography>
          <Typography variant="h6" sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            →
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            {tag?.name || 'Tag'}
          </Typography>
        </Box>
      );
    }

    // No selection, just show base view
    return (
      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem', letterSpacing: 0.2 }}>
        {baseView}
      </Typography>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar
        position="static"
        elevation={2}
        sx={{
          borderRadius: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar sx={{ py: 1.5, minHeight: '56px !important', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => onMenuOpen(true)}
            sx={{
              mr: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
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
            background: 'linear-gradient(to bottom, #f5f5f5 0%, #ffffff 100%)',
          },
        }}
      >
        <Box sx={{ pt: 3, pb: 2 }}>
          {/* App Title in Drawer */}
          <Box sx={{ px: 3, pb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
              ❄️ Snowball
            </Typography>
          </Box>
          <Divider />
          <List sx={{ pt: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.view} disablePadding sx={{ px: 1, py: 0.25 }}>
                <ListItemButton
                  selected={state.currentView === item.view}
                  onClick={() => {
                    onNavigate(item.view);
                    onMenuOpen(false);
                  }}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: state.currentView === item.view ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
          <List>
            <ListItem disablePadding sx={{ px: 1, py: 0.25 }}>
              <ListItemButton
                selected={state.currentView === 'settings'}
                onClick={() => {
                  onNavigate('settings');
                  onMenuOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemText
                  primary="Settings"
                  primaryTypographyProps={{
                    fontWeight: state.currentView === 'settings' ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'background.default',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

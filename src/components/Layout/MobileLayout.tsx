/**
 * Mobile-optimized layout component
 * Single column view with hamburger menu and full-screen navigation
 */

import React, { useState, useEffect } from 'react';
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

const TAB_BACKGROUNDS = {
  morning: 'linear-gradient(180deg, rgba(255, 154, 158, 0.15) 0%, rgba(254, 207, 239, 0.05) 100%)',
  today: 'linear-gradient(180deg, rgba(161, 196, 253, 0.15) 0%, rgba(194, 233, 251, 0.05) 100%)',
  cooldown: 'linear-gradient(180deg, rgba(48, 207, 208, 0.15) 0%, rgba(51, 8, 103, 0.05) 100%)',
};

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
  const [headerBackground, setHeaderBackground] = useState<string>('background.paper');

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const tab = customEvent.detail.tab;
      if (state.currentView === 'today' && TAB_BACKGROUNDS[tab as keyof typeof TAB_BACKGROUNDS]) {
        setHeaderBackground(TAB_BACKGROUNDS[tab as keyof typeof TAB_BACKGROUNDS]);
      } else {
        setHeaderBackground('background.paper');
      }
    };

    window.addEventListener('snowball-tab-change', handleTabChange);
    
    // Reset if view changes
    if (state.currentView !== 'today') {
      setHeaderBackground('background.paper');
    }

    return () => {
      window.removeEventListener('snowball-tab-change', handleTabChange);
    };
  }, [state.currentView]);

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
          background: headerBackground === 'background.paper' 
            ? theme.palette.background.paper 
            : `${headerBackground}, ${theme.palette.background.default}`,
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.primary',
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          borderRadius: 0,
          transition: 'background 0.3s ease',
        }}
      >
        <Toolbar sx={{ py: 1.5, minHeight: '56px !important', px: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => onMenuOpen(true)}
            sx={{ mr: 2 }}
            disableRipple
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

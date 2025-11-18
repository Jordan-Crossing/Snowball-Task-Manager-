/**
 * Desktop multi-column layout component
 * Implements Miller columns pattern with sidebar and detail panel
 */

import React from 'react';
import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';
import type { AppState } from './useAppState';
import type { Project } from '../../db/types';

interface DesktopLayoutProps {
  state: AppState;
  onNavigate: (view: AppState['currentView'], id?: number) => void;
  onAddTask: () => void;
  onMoveTaskToProject?: (taskId: number, projectId: number) => void;
  onSelectProject?: (id: number | null) => void;
  onSelectList?: (id: number | null) => void;
  onSelectTask?: (id: number | null) => void;
  projects?: Project[];
  lists?: Array<{ id: number; name: string; type: string }>;
  tags?: Array<{ id: number; name: string }>;
  children: React.ReactNode;
  detailPanel?: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  state,
  onNavigate,
  onAddTask: _onAddTask,
  onMoveTaskToProject,
  projects,
  lists,
  tags,
  children,
  detailPanel,
}) => {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Sidebar
          state={state}
          onNavigate={onNavigate}
          projects={projects}
          lists={lists}
          tags={tags}
          onMoveTaskToProject={onMoveTaskToProject}
        />

        {/* Miller Columns + Detail Panel */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Content Columns */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: 'background.default',
            }}
          >
            {children}
          </Box>

          {/* Detail Panel */}
          {state.detailPanelOpen && detailPanel && (
            <Box
              sx={{
                width: 400,
                borderLeft: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                overflow: 'auto',
              }}
            >
              {detailPanel}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

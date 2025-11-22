/**
 * Main application shell component
 * Handles responsive layout selection and high-level app structure
 */

import React from 'react';
import { useResponsive } from '../../hooks';
import { MobileLayout } from './MobileLayout';
import { DesktopLayout } from './DesktopLayout';
import { useStore } from '../../store/useStore';
import type { Project } from '../../db/types';

interface AppShellProps {
  children: React.ReactNode;
  detailPanel?: React.ReactNode;
  projects?: Project[];
  lists?: Array<{ id: number; name: string; type: string }>;
  tags?: Array<{ id: number; name: string }>;
  onAddTask: () => void;
  onMoveTaskToProject?: (taskId: number, projectId: number) => Promise<void>;
  onDeleteTask?: (taskId: number) => void;
  inboxCount?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  detailPanel,
  projects,
  lists,
  tags,
  onAddTask,
  onMoveTaskToProject,
  onDeleteTask,
  inboxCount,
}) => {
  const { isMobile, isDesktop } = useResponsive();

  // Get state from Zustand
  const {
    currentView,
    selectedProjectId,
    selectedListId,
    selectedTaskId,
    selectedTagId,
    detailPanelOpen,
    mobileMenuOpen,
    navigateTo,
    setMobileMenuOpen,
  } = useStore();

  const state = {
    currentView,
    selectedProjectId,
    selectedListId,
    selectedTaskId,
    selectedTagId,
    detailPanelOpen,
    mobileMenuOpen,
    navigationStack: [],
  };

  if (isMobile) {
    return (
      <MobileLayout
        state={state}
        mobileMenuOpen={mobileMenuOpen}
        onMenuOpen={setMobileMenuOpen}
        onNavigate={navigateTo}
        onAddTask={onAddTask}
        onMoveTaskToProject={onMoveTaskToProject}
        projects={projects}
        lists={lists}
        tags={tags}
      >
        {children}
      </MobileLayout>
    );
  }

  if (isDesktop) {
    return (
      <DesktopLayout
        state={state}
        onNavigate={navigateTo}
        onAddTask={onAddTask}
        onMoveTaskToProject={onMoveTaskToProject}
        onDeleteTask={onDeleteTask}
        projects={projects}
        lists={lists}
        tags={tags}
        detailPanel={detailPanel}
        inboxCount={inboxCount}
      >
        {children}
      </DesktopLayout>
    );
  }

  // Fallback for tablet or intermediate sizes (use mobile for now)
  return (
    <MobileLayout
      state={state}
      mobileMenuOpen={mobileMenuOpen}
      onMenuOpen={setMobileMenuOpen}
      onNavigate={navigateTo}
      onAddTask={onAddTask}
      onMoveTaskToProject={onMoveTaskToProject}
      projects={projects}
      lists={lists}
      tags={tags}
    >
      {children}
    </MobileLayout>
  );
};

/**
 * Central app state management
 * Tracks navigation, selected items, and UI state
 */

import { useState, useCallback } from 'react';

export interface AppState {
  // Navigation
  currentView: 'today' | 'inbox' | 'projects' | 'lists' | 'tags' | 'settings' | 'flagged' | 'trash';
  selectedProjectId: number | null;
  selectedListId: number | null;
  selectedTaskId: number | null;
  selectedTagId?: number | null;
  navigationStack: Array<{ view: string; id?: number }>;

  // UI State
  detailPanelOpen: boolean;
  mobileMenuOpen: boolean;
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    currentView: 'today',
    selectedProjectId: null,
    selectedListId: null,
    selectedTaskId: null,
    navigationStack: [],
    detailPanelOpen: false,
    mobileMenuOpen: false,
  });

  // Navigation actions
  const navigateTo = useCallback((view: AppState['currentView'], id?: number) => {
    setState(prev => ({
      ...prev,
      currentView: view,
      navigationStack: [...prev.navigationStack, { view, id }],
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.navigationStack.length <= 1) return prev;
      const newStack = prev.navigationStack.slice(0, -1);
      const previousState = newStack[newStack.length - 1];
      return {
        ...prev,
        currentView: previousState.view as AppState['currentView'],
        navigationStack: newStack,
      };
    });
  }, []);

  const selectProject = useCallback((projectId: number | null) => {
    setState(prev => ({ ...prev, selectedProjectId: projectId }));
  }, []);

  const selectList = useCallback((listId: number | null) => {
    setState(prev => ({ ...prev, selectedListId: listId }));
  }, []);

  const selectTask = useCallback((taskId: number | null) => {
    setState(prev => ({ ...prev, selectedTaskId: taskId }));
  }, []);

  const setDetailPanelOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, detailPanelOpen: open }));
  }, []);

  const setMobileMenuOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, mobileMenuOpen: open }));
  }, []);

  return {
    state,
    navigateTo,
    goBack,
    selectProject,
    selectList,
    selectTask,
    setDetailPanelOpen,
    setMobileMenuOpen,
  };
}

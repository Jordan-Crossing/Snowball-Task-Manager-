/**
 * Zustand store - Central state management for the entire app
 * Manages navigation, database data, UI state, and theme
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Database, Task, Settings, List, Project, Tag } from '../db/types';

// View types
type View = 'today' | 'inbox' | 'projects' | 'lists' | 'tags' | 'settings';

// Store interface
interface AppStore {
  // ===== Database & Data State =====
  db: Database | null;
  dbInitialized: boolean;
  loading: boolean;

  // Data
  tasks: Task[];
  settings: Settings | null;
  lists: List[];
  projects: Project[];
  tags: Tag[];
  taskTags: Map<number, number[]>; // Map of task_id -> tag_id[]
  completedToday: Set<number>;

  // Actions
  setDb: (db: Database) => void;
  setDbInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setTasks: (tasks: Task[]) => void;
  setSettings: (settings: Settings | null) => void;
  setLists: (lists: List[]) => void;
  setProjects: (projects: Project[]) => void;
  setTags: (tags: Tag[]) => void;
  setTaskTags: (taskTags: Map<number, number[]>) => void;
  setCompletedToday: (completed: Set<number>) => void;
  addCompletedTask: (taskId: number) => void;
  removeCompletedTask: (taskId: number) => void;

  // ===== Navigation State =====
  currentView: View;
  selectedProjectId: number | null;
  selectedListId: number | null;
  selectedTaskId: number | null;
  selectedTagId: number | null;
  navigationStack: Array<{ view: string; id?: number }>;

  // Navigation actions
  navigateTo: (view: View, id?: number) => void;
  goBack: () => void;
  selectProject: (projectId: number | null) => void;
  selectList: (listId: number | null) => void;
  selectTask: (taskId: number | null) => void;
  selectTag: (tagId: number | null) => void;

  // ===== UI State =====
  detailPanelOpen: boolean;
  mobileMenuOpen: boolean;
  themeMode: 'light' | 'dark';

  // UI actions
  setDetailPanelOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
}

// Create the store
export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ===== Initial Database & Data State =====
      db: null,
      dbInitialized: false,
      loading: true,
      tasks: [],
      settings: null,
      lists: [],
      projects: [],
      tags: [],
      taskTags: new Map<number, number[]>(),
      completedToday: new Set<number>(),

      // Database actions
      setDb: (db) => set({ db }),
      setDbInitialized: (initialized) => set({ dbInitialized: initialized }),
      setLoading: (loading) => set({ loading }),
      setTasks: (tasks) => set({ tasks }),
      setSettings: (settings) => set({ settings }),
      setLists: (lists) => set({ lists }),
      setProjects: (projects) => set({ projects }),
      setTags: (tags) => set({ tags }),
      setTaskTags: (taskTags) => set({ taskTags }),
      setCompletedToday: (completed) => set({ completedToday: completed }),

      addCompletedTask: (taskId) => {
        const newSet = new Set(get().completedToday);
        newSet.add(taskId);
        set({ completedToday: newSet });
      },

      removeCompletedTask: (taskId) => {
        const newSet = new Set(get().completedToday);
        newSet.delete(taskId);
        set({ completedToday: newSet });
      },

      // ===== Initial Navigation State =====
      currentView: 'today',
      selectedProjectId: null,
      selectedListId: null,
      selectedTaskId: null,
      selectedTagId: null,
      navigationStack: [],

      // Navigation actions
      navigateTo: (view, id) => set((state) => {
        return {
          currentView: view,
          navigationStack: [...state.navigationStack, { view, id }],
          selectedProjectId: view === 'projects' ? (id !== undefined ? id : null) : state.selectedProjectId,
          selectedListId: view === 'lists' ? (id !== undefined ? id : null) : state.selectedListId,
          selectedTagId: view === 'tags' ? (id !== undefined ? id : null) : state.selectedTagId,
        };
      }),

      goBack: () => set((state) => {
        if (state.navigationStack.length <= 1) return state;
        const newStack = state.navigationStack.slice(0, -1);
        const previousState = newStack[newStack.length - 1];
        return {
          currentView: previousState.view as View,
          navigationStack: newStack,
        };
      }),

      selectProject: (projectId) => set({ selectedProjectId: projectId }),
      selectList: (listId) => set({ selectedListId: listId }),
      selectTask: (taskId) => set({ selectedTaskId: taskId }),
      selectTag: (tagId) => set({ selectedTagId: tagId }),

      // ===== Initial UI State =====
      detailPanelOpen: false,
      mobileMenuOpen: false,
      themeMode: 'light',

      // UI actions
      setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

      toggleTheme: () => set((state) => ({
        themeMode: state.themeMode === 'light' ? 'dark' : 'light',
      })),

      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'snowball-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist theme and navigation preferences
      partialize: (state) => ({
        themeMode: state.themeMode,
        currentView: state.currentView,
      }),
    }
  )
);

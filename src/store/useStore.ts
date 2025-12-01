/**
 * Zustand store - Central state management for the entire app
 * Manages navigation, database data, UI state, and theme
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Database, Task, Settings, List, Project, Tag } from '../db/types';

// View types
type View = 'today' | 'inbox' | 'projects' | 'lists' | 'tags' | 'settings' | 'flagged' | 'trash';

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

  // ===== Mutations =====
  addTask: (task: Partial<Task>) => Promise<Task | undefined>;
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  deleteTasks: (ids: number[]) => Promise<void>;
  restoreTask: (id: number) => Promise<void>;
  permanentlyDeleteTask: (id: number) => Promise<void>;
  emptyTrash: () => Promise<void>;
  moveTask: (taskId: number, projectId: number) => Promise<void>;
  reorderTasks: (orderedTaskIds: number[]) => Promise<void>;
  toggleTaskComplete: (id: number) => Promise<void>;
  toggleTaskFlag: (id: number) => Promise<void>;
  
  // UI Actions
  addProject: (project: Partial<Project>) => Promise<void>;
  updateProject: (id: number, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  
  addList: (list: Partial<List>) => Promise<void>;
  updateList: (id: number, updates: Partial<List>) => Promise<void>;
  deleteList: (id: number) => Promise<void>;
  
  addTag: (tag: Partial<Tag>) => Promise<Tag | undefined>;
  updateTag: (id: number, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  updateTaskTags: (taskId: number, tagIds: number[]) => Promise<void>;
  
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  resetDatabase: () => Promise<void>;

  // ===== Navigation State =====
  currentView: View;
  selectedProjectId: number | null;
  selectedListId: number | null;
  selectedTaskId: number | null;
  selectedTaskIds: number[];
  selectedTagId: number | null;
  navigationStack: Array<{ view: string; id?: number }>;

  // Navigation actions
  navigateTo: (view: View, id?: number) => void;
  goBack: () => void;
  selectProject: (projectId: number | null) => void;
  selectList: (listId: number | null) => void;
  selectTask: (taskId: number | null, options?: { multi?: boolean; range?: boolean }) => void;
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

      // ===== Mutations =====
      addTask: async (task) => {
        const db = get().db;
        if (!db) return;
        
        const now = new Date().toISOString();

        // Calculate sort_order if not provided
        let sortOrder = task.sort_order;
        if (sortOrder === undefined) {
          const currentTasks = get().tasks;
          const maxSortOrder = currentTasks.reduce((max, t) => Math.max(max, t.sort_order || 0), 0);
          sortOrder = maxSortOrder + 1;
        }

        const newTask = {
          title: task.title || 'New Task',
          description: task.description || null,
          duration_minutes: task.duration_minutes || 0,
          parent_task_id: task.parent_task_id || null,
          project_id: task.project_id || null,
          list_id: task.list_id || 1,
          flagged_for_today: task.flagged_for_today ? 1 : 0,
          is_repeating: task.is_repeating ? 1 : 0,
          completed: 0,
          quadrant: task.quadrant || null,
          maslow_category: task.maslow_category || null,
          maslow_subcategory: task.maslow_subcategory || null,
          sort_order: sortOrder,
          created_at: now,
          updated_at: now,
        };

        try {
          const result = await db.run(
            `INSERT INTO tasks (
              title, description, duration_minutes, parent_task_id, 
              project_id, list_id, flagged_for_today, is_repeating, completed,
              quadrant, maslow_category, maslow_subcategory, sort_order, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newTask.title, newTask.description, newTask.duration_minutes,
              newTask.parent_task_id, newTask.project_id, newTask.list_id,
              newTask.flagged_for_today, newTask.is_repeating, newTask.completed,
              newTask.quadrant, newTask.maslow_category, newTask.maslow_subcategory,
              newTask.sort_order, newTask.created_at, newTask.updated_at
            ]
          );

          const createdTask: Task = { 
            ...newTask, 
            id: result.lastID, 
            description: newTask.description || undefined,
            parent_task_id: newTask.parent_task_id || undefined,
            project_id: newTask.project_id || undefined,
            list_id: newTask.list_id || undefined,
            quadrant: newTask.quadrant || undefined,
            maslow_category: newTask.maslow_category || undefined,
            maslow_subcategory: newTask.maslow_subcategory || undefined,
            flagged_for_today: !!newTask.flagged_for_today, 
            is_repeating: !!newTask.is_repeating, 
            completed: false,
          };
          
          set((state) => ({ tasks: [...state.tasks, createdTask] }));
          return createdTask;
        } catch (error) {
          console.error('Failed to add task:', error);
          return undefined;
        }
      },

      updateTask: async (id, updates) => {
        const db = get().db;
        if (!db) return;

        // Optimistic update
        const oldTasks = get().tasks;
        set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
        }));

        try {
          const updateFields = Object.entries(updates)
            .filter(([key]) => key !== 'id')
            .map(([key]) => {
              // Handle boolean conversion for DB
              if (['flagged_for_today', 'is_repeating', 'completed'].includes(key)) {
                return `${key} = ?`;
              }
              return `${key} = ?`;
            })
            .join(', ');
          
          const values = Object.entries(updates)
            .filter(([key]) => key !== 'id')
            .map(([_key, value]) => {
              if (typeof value === 'boolean') return value ? 1 : 0;
              return value;
            });

          if (updateFields) {
            await db.run(
              `UPDATE tasks SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [...values, id]
            );
          }
        } catch (error) {
          console.error('Failed to update task:', error);
          set({ tasks: oldTasks }); // Rollback
        }
      },

      deleteTask: async (id: number) => {
        const db = get().db;
        if (!db) return;

        const state = get();
        const tasks = state.tasks;
        const now = new Date().toISOString();

        // Helper to find all descendants
        const getDescendants = (parentId: number): number[] => {
          const children = tasks.filter(t => t.parent_task_id === parentId && !t.deleted_at);
          let descendants: number[] = [];
          children.forEach(child => {
            descendants.push(child.id);
            descendants = [...descendants, ...getDescendants(child.id)];
          });
          return descendants;
        };

        const idsToDelete = [id, ...getDescendants(id)];
        
        // Soft delete in state
        set((state) => ({
          tasks: state.tasks.map(t => idsToDelete.includes(t.id) ? { ...t, deleted_at: now } : t)
        }));

        try {
          // Soft delete in DB
          const placeholders = idsToDelete.map(() => '?').join(',');
          await db.run(`UPDATE tasks SET deleted_at = ? WHERE id IN (${placeholders})`, [now, ...idsToDelete]);
        } catch (error) {
          console.error('Failed to delete task:', error);
          // Refresh from DB to ensure consistency
          const allTasks = await db.all<Task>('SELECT * FROM tasks');
          set({ tasks: allTasks });
        }
      },

      deleteTasks: async (ids: number[]) => {
        const db = get().db;
        if (!db) return;

        const state = get();
        const tasks = state.tasks;
        const now = new Date().toISOString();

        // Helper to find all descendants for multiple parents
        const getDescendants = (parentIds: number[]): number[] => {
          let allDescendants: number[] = [];
          
          // Find direct children of any of the parentIds
          const children = tasks.filter(t => t.parent_task_id && parentIds.includes(t.parent_task_id) && !t.deleted_at);
          
          if (children.length > 0) {
            const childIds = children.map(c => c.id);
            allDescendants = [...childIds, ...getDescendants(childIds)];
          }
          
          return allDescendants;
        };

        const descendants = getDescendants(ids);
        const allIdsToDelete = [...new Set([...ids, ...descendants])]; // Unique IDs
        
        // Soft delete in state (Optimistic)
        set((state) => ({
          tasks: state.tasks.map(t => allIdsToDelete.includes(t.id) ? { ...t, deleted_at: now } : t),
          selectedTaskIds: [] // Clear selection
        }));

        try {
          // Soft delete in DB
          const placeholders = allIdsToDelete.map(() => '?').join(',');
          await db.run(`UPDATE tasks SET deleted_at = ? WHERE id IN (${placeholders})`, [now, ...allIdsToDelete]);
        } catch (error) {
          console.error('Failed to delete tasks:', error);
          // Refresh from DB to ensure consistency
          const allTasks = await db.all<Task>('SELECT * FROM tasks');
          set({ tasks: allTasks });
        }
      },

      restoreTask: async (id: number) => {
        const db = get().db;
        if (!db) return;

        const oldTasks = get().tasks;
        
        // Restore in state
        set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, deleted_at: undefined } : t)
        }));

        try {
          await db.run('UPDATE tasks SET deleted_at = NULL WHERE id = ?', [id]);
        } catch (error) {
          console.error('Failed to restore task:', error);
          set({ tasks: oldTasks });
        }
      },

      permanentlyDeleteTask: async (id: number) => {
        const db = get().db;
        if (!db) return;

        const oldTasks = get().tasks;
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== id)
        }));

        try {
          await db.run('DELETE FROM tasks WHERE id = ?', [id]);
        } catch (error) {
          console.error('Failed to permanently delete task:', error);
          set({ tasks: oldTasks });
        }
      },

      emptyTrash: async () => {
        const db = get().db;
        if (!db) return;

        const oldTasks = get().tasks;
        set((state) => ({
          tasks: state.tasks.filter(t => !t.deleted_at)
        }));

        try {
          await db.run('DELETE FROM tasks WHERE deleted_at IS NOT NULL');
        } catch (error) {
          console.error('Failed to empty trash:', error);
          set({ tasks: oldTasks });
        }
      },

      moveTask: async (taskId: number, projectId: number) => {
        const db = get().db;
        if (!db) return;
        
        const state = get();
        const tasks = state.tasks;

        // Helper to find all descendants
        const getDescendants = (parentId: number): number[] => {
          const children = tasks.filter(t => t.parent_task_id === parentId);
          let descendants: number[] = [];
          children.forEach(child => {
            descendants.push(child.id);
            descendants = [...descendants, ...getDescendants(child.id)];
          });
          return descendants;
        };

        const idsToMove = [taskId, ...getDescendants(taskId)];

        // Update state
        set((state) => ({
          tasks: state.tasks.map(t => idsToMove.includes(t.id) ? { ...t, project_id: projectId, deleted_at: undefined } : t)
        }));

        try {
          const placeholders = idsToMove.map(() => '?').join(',');
          // Update project_id and clear deleted_at
          await db.run(`UPDATE tasks SET project_id = ?, deleted_at = NULL WHERE id IN (${placeholders})`, [projectId, ...idsToMove]);
        } catch (error) {
          console.error('Failed to move task:', error);
          // Refresh
          const allTasks = await db.all<Task>('SELECT * FROM tasks');
          set({ tasks: allTasks });
        }
      },

      toggleTaskComplete: async (id) => {
        const state = get();
        const { tasks, completedToday } = state;
        const db = state.db;
        
        const targetTask = tasks.find(t => t.id === id);
        if (!targetTask) return;

        const isCurrentlyCompleted = completedToday.has(id) || targetTask.completed;
        const shouldBeCompleted = !isCurrentlyCompleted;

        // Helper to find all descendants
        const getDescendants = (parentId: number): number[] => {
          const children = tasks.filter(t => t.parent_task_id === parentId && !t.deleted_at);
          let descendants: number[] = [];
          children.forEach(child => {
            descendants.push(child.id);
            descendants = [...descendants, ...getDescendants(child.id)];
          });
          return descendants;
        };

        const idsToUpdate = [id, ...getDescendants(id)];
        const today = new Date().toISOString().split('T')[0];

        // 1. Prepare new state
        const newCompletedToday = new Set(completedToday);
        const tasksToUpdateInDb: { id: number, isRepeating: boolean }[] = [];
        
        const newTasks = tasks.map(t => {
            if (idsToUpdate.includes(t.id)) {
                const taskIsCompleted = completedToday.has(t.id) || t.completed;
                // Only update if state is different
                if ((shouldBeCompleted && !taskIsCompleted) || (!shouldBeCompleted && taskIsCompleted)) {
                    
                    if (shouldBeCompleted) {
                        newCompletedToday.add(t.id);
                    } else {
                        newCompletedToday.delete(t.id);
                    }

                    tasksToUpdateInDb.push({ id: t.id, isRepeating: !!t.is_repeating });

                    if (!t.is_repeating) {
                        return { ...t, completed: shouldBeCompleted };
                    }
                }
            }
            return t;
        });

        // 2. Apply state update
        set({
            tasks: newTasks,
            completedToday: newCompletedToday
        });

        // 3. Perform DB updates
        if (!db) return;

        try {
            const promises = tasksToUpdateInDb.map(async ({ id, isRepeating }) => {
                if (shouldBeCompleted) {
                    if (isRepeating) {
                        await db.run('INSERT INTO task_completions (task_id, completed_date) VALUES (?, ?)', [id, today]);
                    } else {
                        await db.run('UPDATE tasks SET completed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
                    }
                } else {
                    if (isRepeating) {
                        await db.run('DELETE FROM task_completions WHERE task_id = ? AND completed_date = ?', [id, today]);
                    } else {
                        await db.run('UPDATE tasks SET completed = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
                    }
                }
            });
            
            await Promise.all(promises);
        } catch (error) {
            console.error('Failed to toggle tasks:', error);
            // Refresh from DB to ensure consistency
            const allTasks = await db.all<Task>('SELECT * FROM tasks');
            set({ tasks: allTasks });
        }
      },

      toggleTaskFlag: async (id) => {
        const state = get();
        const tasks = state.tasks;
        const task = tasks.find(t => t.id === id);
        
        if (task) {
          const newFlaggedState = !task.flagged_for_today;
          
          // Helper to find all descendants
          const getDescendants = (parentId: number): number[] => {
            const children = tasks.filter(t => t.parent_task_id === parentId && !t.deleted_at);
            let descendants: number[] = [];
            children.forEach(child => {
              descendants.push(child.id);
              descendants = [...descendants, ...getDescendants(child.id)];
            });
            return descendants;
          };

          const idsToUpdate = [id, ...getDescendants(id)];
          
          // Update all tasks in the hierarchy
          for (const taskId of idsToUpdate) {
            await get().updateTask(taskId, { flagged_for_today: newFlaggedState });
          }
        }
      },

      reorderTasks: async (orderedTaskIds) => {
        const db = get().db;
        if (!db) return;

        const oldTasks = get().tasks;
        set((state) => {
          const updatedTasks = [...state.tasks];
          // Update sort_order based on new order
          orderedTaskIds.forEach((id, index) => {
            const task = updatedTasks.find(t => t.id === id);
            if (task) {
              task.sort_order = index;
            }
          });
          return { tasks: updatedTasks };
        });

        try {
          // Update the database with the new order
          const promises = orderedTaskIds.map((id, index) => {
            return db.run(
              `UPDATE tasks SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [index, id]
            );
          });
          await Promise.all(promises);
        } catch (error) {
          console.error('Failed to reorder tasks:', error);
          set({ tasks: oldTasks }); // Rollback
        }
      },

      addProject: async (project) => {
        const db = get().db;
        if (!db) return;
        
        const now = new Date().toISOString();
        const newProject = {
          name: project.name || 'New Project',
          description: project.description || null,
          parent_project_id: project.parent_project_id || null,
          duration_minutes: project.duration_minutes || 0,
          quadrant: project.quadrant || null,
          maslow_category: project.maslow_category || null,
          maslow_subcategory: project.maslow_subcategory || null,
          archived: project.archived ? 1 : 0,
          created_at: now,
          updated_at: now,
        };

        try {
          const result = await db.run(
            `INSERT INTO projects (
              name, description, parent_project_id, duration_minutes,
              quadrant, maslow_category, maslow_subcategory, archived,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newProject.name, newProject.description, newProject.parent_project_id,
              newProject.duration_minutes, newProject.quadrant,
              newProject.maslow_category, newProject.maslow_subcategory, newProject.archived,
              newProject.created_at, newProject.updated_at
            ]
          );

          const createdProject: Project = { 
            ...newProject, 
            id: result.lastID, 
            archived: !!newProject.archived,
            description: newProject.description || undefined,
            parent_project_id: newProject.parent_project_id || undefined,
            quadrant: newProject.quadrant as any,
            maslow_category: newProject.maslow_category || undefined,
            maslow_subcategory: newProject.maslow_subcategory || undefined
          };
          set((state) => ({ projects: [...state.projects, createdProject] }));
        } catch (error) {
          console.error('Failed to add project:', error);
        }
      },

      updateProject: async (id, updates) => {
        const db = get().db;
        if (!db) return;

        const oldProjects = get().projects;
        set((state) => ({
          projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
        }));

        try {
          const updateFields = Object.entries(updates)
            .filter(([key]) => key !== 'id')
            .map(([key]) => `${key} = ?`)
            .join(', ');
          
          const values = Object.entries(updates)
            .filter(([key]) => key !== 'id')
            .map(([_key, value]) => {
              if (typeof value === 'boolean') return value ? 1 : 0;
              return value;
            });

          if (updateFields) {
            await db.run(
              `UPDATE projects SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [...values, id]
            );
          }
        } catch (error) {
          console.error('Failed to update project:', error);
          set({ projects: oldProjects });
        }
      },

      deleteProject: async (id) => {
        const db = get().db;
        if (!db) return;

        const oldProjects = get().projects;
        set((state) => ({
          projects: state.projects.filter(p => p.id !== id)
        }));

        try {
          await db.run('DELETE FROM projects WHERE id = ?', [id]);
        } catch (error) {
          console.error('Failed to delete project:', error);
          set({ projects: oldProjects });
        }
      },

      addList: async (list) => {
        const db = get().db;
        if (!db) return;
        
        const now = new Date().toISOString();
        const newList = {
          name: list.name || 'New List',
          type: list.type || 'custom',
          is_repeating: list.is_repeating ? 1 : 0,
          sort_order: list.sort_order || 0,
          created_at: now,
        };

        try {
          const result = await db.run(
            `INSERT INTO lists (name, type, is_repeating, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
            [newList.name, newList.type, newList.is_repeating, newList.sort_order, newList.created_at]
          );

          const createdList: List = { 
            ...newList, 
            id: result.lastID, 
            is_repeating: !!newList.is_repeating,
            type: newList.type as any
          };
          set((state) => ({ lists: [...state.lists, createdList] }));
        } catch (error) {
          console.error('Failed to add list:', error);
        }
      },

      updateList: async (id, updates) => {
        const db = get().db;
        if (!db) return;

        const oldLists = get().lists;
        set((state) => ({
          lists: state.lists.map(l => l.id === id ? { ...l, ...updates } : l)
        }));

        try {
          const updateFields = Object.entries(updates)
            .filter(([key]) => key !== 'id')
            .map(([key]) => `${key} = ?`)
            .join(', ');
          
          const values = Object.entries(updates)
            .filter(([key]) => key !== 'id')
            .map(([_key, value]) => {
              if (typeof value === 'boolean') return value ? 1 : 0;
              return value;
            });

          if (updateFields) {
            await db.run(
              `UPDATE lists SET ${updateFields} WHERE id = ?`,
              [...values, id]
            );
          }
        } catch (error) {
          console.error('Failed to update list:', error);
          set({ lists: oldLists });
        }
      },

      deleteList: async (id) => {
        const db = get().db;
        if (!db) return;

        const oldLists = get().lists;
        set((state) => ({
          lists: state.lists.filter(l => l.id !== id)
        }));

        try {
          await db.run('DELETE FROM lists WHERE id = ?', [id]);
        } catch (error) {
          console.error('Failed to delete list:', error);
          set({ lists: oldLists });
        }
      },

      addTag: async (tag) => {
        const db = get().db;
        if (!db) return undefined;
        
        const now = new Date().toISOString();
        const newTag = {
          name: tag.name || 'New Tag',
          color: tag.color || '#808080',
          created_at: now,
        };

        try {
          const result = await db.run(
            `INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)`,
            [newTag.name, newTag.color, newTag.created_at]
          );

          const createdTag: Tag = { ...newTag, id: result.lastID };
          set((state) => ({ tags: [...state.tags, createdTag] }));
          return createdTag;
        } catch (error) {
          console.error('Failed to add tag:', error);
          return undefined;
        }
      },

      updateTag: async (id, updates) => {
        const db = get().db;
        if (!db) return;

        const oldTags = get().tags;
        set((state) => ({
          tags: state.tags.map(t => t.id === id ? { ...t, ...updates } : t)
        }));

        try {
          const updateFields = Object.entries(updates)
            .filter(([key]) => key !== 'id')
            .map(([key]) => `${key} = ?`)
            .join(', ');
          
          const values = Object.entries(updates)
            .filter(([key]) => key !== 'id')
            .map(([_key, value]) => value);

          if (updateFields) {
            await db.run(
              `UPDATE tags SET ${updateFields} WHERE id = ?`,
              [...values, id]
            );
          }
        } catch (error) {
          console.error('Failed to update tag:', error);
          set({ tags: oldTags });
        }
      },

      deleteTag: async (id) => {
        const db = get().db;
        if (!db) return;

        const oldTags = get().tags;
        set((state) => ({
          tags: state.tags.filter(t => t.id !== id)
        }));

        try {
          await db.run('DELETE FROM tags WHERE id = ?', [id]);
        } catch (error) {
          console.error('Failed to delete tag:', error);
          set({ tags: oldTags });
        }
      },

      updateTaskTags: async (taskId, tagIds) => {
        const db = get().db;
        if (!db) return;

        const oldTaskTags = get().taskTags;
        const taskTags = new Map(oldTaskTags);

        // Update the taskTags map
        taskTags.set(taskId, tagIds);

        set({ taskTags });

        try {
          // First, delete existing tags for the task
          await db.run('DELETE FROM task_tags WHERE task_id = ?', [taskId]);

          // Then, insert the new set of tags
          const insertPromises = tagIds.map(tagId => {
            return db.run('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId]);
          });
          await Promise.all(insertPromises);
        } catch (error) {
          console.error('Failed to update task tags:', error);
          set({ taskTags: oldTaskTags }); // Rollback
        }
      },

      updateSettings: async (updates) => {
        const db = get().db;
        if (!db) return;

        const oldSettings = get().settings;
        set((state) => ({
          settings: state.settings ? { ...state.settings, ...updates } : null
        }));

        try {
          const updateFields = Object.entries(updates)
            .map(([key]) => `${key} = ?`)
            .join(', ');
          
          const values = Object.entries(updates)
            .map(([_, value]) => value);

          if (updateFields) {
            await db.run(
              `UPDATE settings SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
              [...values]
            );
          }
        } catch (error) {
          console.error('Failed to update settings:', error);
          set({ settings: oldSettings });
        }
      },

      resetDatabase: async () => {
        const db = get().db;
        if (!db) return;

        try {
          await db.reset();
          window.location.reload();
        } catch (error) {
          console.error('Failed to reset database:', error);
        }
      },

      // ===== Navigation State =====
      currentView: 'today',
      selectedProjectId: null,
      selectedListId: null,
      selectedTaskId: null,
      selectedTaskIds: [],
      selectedTagId: null,
      navigationStack: [],

      navigateTo: (view, id) => set((state) => {
        const stack = [...state.navigationStack];
        // Don't push if it's the same view
        if (stack.length === 0 || stack[stack.length - 1].view !== view || stack[stack.length - 1].id !== id) {
             stack.push({ view: state.currentView, id: state.currentView === 'projects' ? state.selectedProjectId || undefined : undefined });
        }
        
        return {
          currentView: view,
          selectedProjectId: view === 'projects' && id ? id : state.selectedProjectId,
          selectedListId: view === 'lists' && id ? id : state.selectedListId,
          selectedTagId: view === 'tags' && id ? id : state.selectedTagId,
          navigationStack: stack,
          detailPanelOpen: false
        };
      }),

      goBack: () => set((state) => {
        const stack = [...state.navigationStack];
        const prev = stack.pop();
        if (!prev) return {};
        
        return {
          currentView: prev.view as View,
          selectedProjectId: prev.view === 'projects' ? prev.id || null : state.selectedProjectId,
          navigationStack: stack
        };
      }),

      selectProject: (projectId) => set({ selectedProjectId: projectId }),
      selectList: (listId) => set({ selectedListId: listId }),
      selectTask: (taskId, options = {}) => set((state) => {
        const { multi = false } = options;
        
        if (taskId === null) {
           return { selectedTaskId: null, selectedTaskIds: [], detailPanelOpen: false };
        }

        let newSelectedIds = multi ? [...state.selectedTaskIds] : [];
        
        if (multi) {
          if (newSelectedIds.includes(taskId)) {
            newSelectedIds = newSelectedIds.filter(id => id !== taskId);
          } else {
            newSelectedIds.push(taskId);
          }
        } else {
          newSelectedIds = [taskId];
        }
        
        // Determine primary selected task
        let newSelectedTaskId: number | null = taskId;
        if (multi && !newSelectedIds.includes(taskId)) {
            // We just deselected the target task
            newSelectedTaskId = newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : null;
        }
        
        return { 
          selectedTaskId: newSelectedTaskId, 
          selectedTaskIds: newSelectedIds, 
          detailPanelOpen: !!newSelectedTaskId 
        };
      }),

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


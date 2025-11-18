/**
 * ProjectsView - Routes between project list and project detail view
 */

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { Project, Task } from '../../db/types';
import { ProjectList } from './ProjectList';
import { ProjectDetailView } from './ProjectDetailView';
import { FilterSortBar } from '../common/FilterSortBar';
import { ProjectDetail } from './ProjectDetail';
import { Box, Stack, Typography } from '@mui/material';

export const ProjectsView: React.FC = () => {
  // Get data from store
  const projects = useStore((state) => state.projects);
  const tasks = useStore((state) => state.tasks);
  const selectProject = useStore((state) => state.selectProject);
  const selectedProjectId = useStore((state) => state.selectedProjectId);
  const selectTask = useStore((state) => state.selectTask);
  const completedToday = useStore((state) => state.completedToday);
  const db = useStore((state) => state.db);
  const setProjects = useStore((state) => state.setProjects);
  const setTasks = useStore((state) => state.setTasks);

  // Local state for filters (only used in list view)
  const [searchValue, setSearchValue] = useState('');
  const [sortValue, setSortValue] = useState('name-asc');
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Get selected project
  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

  // Parse sort/filter values
  const [sortBy, sortDirection] = sortValue.split('-') as ['name' | 'date' | 'count', 'asc' | 'desc'];
  const quadrantFilter = filterValues.find((f) => f.startsWith('Q')) || null;
  const maslowFilter = filterValues.find((f) => !f.startsWith('Q')) || null;

  const handleToggleComplete = async (taskId: number) => {
    if (!db) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const existing = await db.get<{ id: number }>(
        'SELECT id FROM task_completions WHERE task_id = ? AND completed_date = ?',
        [taskId, today]
      );

      if (existing) {
        await db.run(
          'DELETE FROM task_completions WHERE task_id = ? AND completed_date = ?',
          [taskId, today]
        );
      } else {
        await db.run(
          'INSERT INTO task_completions (task_id, completed_date) VALUES (?, ?)',
          [taskId, today]
        );
      }

      // Update store
      const [updatedTasks, completionsData] = await Promise.all([
        db.all<Task>('SELECT * FROM tasks ORDER BY sort_order'),
        db.all<{ task_id: number }>('SELECT task_id FROM task_completions WHERE completed_date = ?', [today])
      ]);

      setTasks(updatedTasks);
      useStore.getState().setCompletedToday(new Set(completionsData.map(c => c.task_id)));
    } catch (error) {
      console.error('Failed to toggle completion:', error);
    }
  };

  const handleToggleFlag = async (taskId: number) => {
    if (!db) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      await db.run(
        'UPDATE tasks SET flagged_for_today = ? WHERE id = ?',
        [task.flagged_for_today ? 0 : 1, taskId]
      );

      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order');
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setEditDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditDialogOpen(true);
  };

  const handleUpdateProject = async (projectId: number, updates: Partial<Project>) => {
    if (!db) return;

    try {
      const updateFields = Object.entries(updates)
        .filter(([_, value]) => value !== undefined)
        .map(([key]) => `${key} = ?`)
        .join(', ');

      const values = Object.entries(updates)
        .filter(([_, value]) => value !== undefined)
        .map(([_, value]) => value);

      if (updateFields) {
        await db.run(
          `UPDATE projects SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [...values, projectId]
        );
      }

      // Refresh projects
      const updatedProjects = await db.all<Project>('SELECT * FROM projects WHERE archived = 0 ORDER BY name');
      setProjects(updatedProjects);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleSaveProject = async (updates: Partial<Project>) => {
    if (!db) return;

    try {
      if (editingProject) {
        // Update existing
        const updateFields = Object.entries(updates)
          .filter(([_, value]) => value !== undefined)
          .map(([key]) => `${key} = ?`)
          .join(', ');

        const values = Object.entries(updates)
          .filter(([_, value]) => value !== undefined)
          .map(([_, value]) => value);

        if (updateFields) {
          await db.run(
            `UPDATE projects SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [...values, editingProject.id]
          );
        }
      } else {
        // Create new
        await db.run(
          `INSERT INTO projects (name, description, quadrant, maslow_category, parent_project_id, is_folder)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            updates.name,
            updates.description || null,
            updates.quadrant || null,
            updates.maslow_category || null,
            selectedProjectId || null, // If viewing a project, new project becomes sub-project
            0, // is_folder defaults to false
          ]
        );
      }

      // Refresh
      const updatedProjects = await db.all<Project>('SELECT * FROM projects WHERE archived = 0 ORDER BY name');
      setProjects(updatedProjects);
      setEditDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleDeleteProject = async () => {
    if (!db || !editingProject) return;

    if (window.confirm('Delete this project? Tasks will be unassigned but not deleted.')) {
      try {
        await db.run('DELETE FROM projects WHERE id = ?', [editingProject.id]);

        const [updatedProjects, updatedTasks] = await Promise.all([
          db.all<Project>('SELECT * FROM projects WHERE archived = 0 ORDER BY name'),
          db.all<Task>('SELECT * FROM tasks ORDER BY sort_order'),
        ]);

        setProjects(updatedProjects);
        setTasks(updatedTasks);
        setEditDialogOpen(false);
        setEditingProject(null);
        selectProject(null);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleNavigateToProject = (projectId: number | null) => {
    selectProject(projectId);
  };

  const handleAddTask = async (title: string) => {
    if (!db || !selectedProjectId) return;

    try {
      await db.run(
        'INSERT INTO tasks (title, project_id, sort_order) VALUES (?, ?, ?)',
        [title, selectedProjectId, tasks.length]
      );

      // Refresh tasks
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order');
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleAddSubProject = () => {
    setEditingProject(null);
    setEditDialogOpen(true);
    // The save handler will use selectedProjectId as parent_project_id
  };

  const handleMakeSubtask = async (taskId: number, parentTaskId: number) => {
    if (!db) return;

    // Prevent circular relationships
    const isDescendant = (potentialDescendantId: number, ancestorId: number): boolean => {
      if (potentialDescendantId === ancestorId) return true;

      const potentialDescendant = tasks.find(t => t.id === potentialDescendantId);
      if (!potentialDescendant || !potentialDescendant.parent_task_id) return false;

      return isDescendant(potentialDescendant.parent_task_id, ancestorId);
    };

    if (isDescendant(parentTaskId, taskId)) {
      console.warn('Cannot create circular parent-child relationship');
      return;
    }

    try {
      await db.run(
        'UPDATE tasks SET parent_task_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [parentTaskId, taskId]
      );

      // Refresh tasks
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order');
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to make subtask:', error);
    }
  };

  const handleReorderTask = async (taskId: number, targetTaskId: number, position: 'before' | 'after') => {
    if (!db) return;

    try {
      // Get the dragged task and target task
      const draggedTask = tasks.find(t => t.id === taskId);
      const targetTask = tasks.find(t => t.id === targetTaskId);

      if (!draggedTask || !targetTask) return;

      // Get all sibling tasks (same parent)
      const siblings = tasks
        .filter(t => t.parent_task_id === draggedTask.parent_task_id && t.id !== taskId)
        .sort((a, b) => a.sort_order - b.sort_order);

      // Find the target task's index among siblings
      const targetIndex = siblings.findIndex(t => t.id === targetTaskId);

      // Insert the dragged task at the appropriate position
      if (position === 'before') {
        siblings.splice(targetIndex, 0, draggedTask);
      } else {
        siblings.splice(targetIndex + 1, 0, draggedTask);
      }

      // Update sort_order for all affected tasks
      const updates = siblings.map((task, index) =>
        db.run('UPDATE tasks SET sort_order = ? WHERE id = ?', [index, task.id])
      );

      await Promise.all(updates);

      // Refresh tasks
      const updatedTasks = await db.all<Task>('SELECT * FROM tasks ORDER BY sort_order');
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to reorder task:', error);
    }
  };

  // Sort options
  const sortOptions = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'date-asc', label: 'Date (Oldest)' },
    { value: 'date-desc', label: 'Date (Newest)' },
    { value: 'count-desc', label: 'Tasks (Most)' },
    { value: 'count-asc', label: 'Tasks (Least)' },
  ];

  // Filter options
  const filterOptions = [
    { value: 'Q1', label: 'Q1 - Urgent & Important' },
    { value: 'Q2', label: 'Q2 - Not Urgent & Important' },
    { value: 'Q3', label: 'Q3 - Urgent & Not Important' },
    { value: 'Q4', label: 'Q4 - Not Urgent & Not Important' },
    { value: 'Physiological', label: 'Physiological' },
    { value: 'Safety', label: 'Safety' },
    { value: 'Love/Belonging', label: 'Love/Belonging' },
    { value: 'Esteem', label: 'Esteem' },
    { value: 'Self-actualization', label: 'Self-actualization' },
  ];

  // Show detail view if project selected, otherwise show list
  if (selectedProject) {
    return (
      <>
        <ProjectDetailView
          project={selectedProject}
          projects={projects}
          tasks={tasks}
          completedToday={completedToday}
          onNavigateToProject={handleNavigateToProject}
          onEditProject={handleEditProject}
          onUpdateProject={handleUpdateProject}
          onTaskSelect={selectTask}
          onToggleComplete={handleToggleComplete}
          onToggleFlag={handleToggleFlag}
          onAddTask={handleAddTask}
          onAddSubProject={handleAddSubProject}
          onMakeSubtask={handleMakeSubtask}
          onReorderTask={handleReorderTask}
        />

        {/* Edit Project Dialog */}
        <ProjectDetail
          project={editingProject}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
          onDelete={editingProject ? handleDeleteProject : undefined}
        />
      </>
    );
  }

  // Show project list
  return (
    <>
      <Stack sx={{ height: '100%', width: '100%', overflow: 'hidden' }}>
        {/* Breadcrumbs */}
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Projects
          </Typography>
        </Box>

        {/* Search/Filter/Sort */}
        <Box sx={{ px: 3, pb: 2 }}>
          <FilterSortBar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            sortValue={sortValue}
            sortOptions={sortOptions}
            onSortChange={setSortValue}
            filterValues={filterValues}
            filterOptions={filterOptions}
            onFilterChange={setFilterValues}
            searchPlaceholder="Search projects..."
          />
        </Box>

        {/* Project List */}
        <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
          <ProjectList
            projects={projects}
            tasks={tasks}
            onProjectSelect={(id) => selectProject(id)}
            onCreateProject={handleCreateProject}
            selectedProjectId={selectedProjectId}
            searchQuery={searchValue}
            quadrantFilter={quadrantFilter}
            maslowFilter={maslowFilter}
            sortBy={sortBy}
            sortDirection={sortDirection}
          />
        </Box>
      </Stack>

      {/* Edit Project Dialog */}
      <ProjectDetail
        project={editingProject}
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        onDelete={editingProject ? handleDeleteProject : undefined}
      />
    </>
  );
};

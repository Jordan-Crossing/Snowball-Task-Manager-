/**
 * ProjectsView - Routes between project list and project detail view
 */

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { Project } from '../../db/types';
import { ProjectList } from './ProjectList';
import { ProjectDetailView } from './ProjectDetailView';
import { FilterSortBar } from '../common/FilterSortBar';
import { ProjectDetail } from './ProjectDetail';
import { Box, Typography } from '@mui/material';

export const ProjectsView: React.FC = () => {
  // Get data from store
  const projects = useStore((state) => state.projects);
  const allTasks = useStore((state) => state.tasks);
  // Filter out deleted tasks for the view
  const tasks = React.useMemo(() => allTasks.filter(t => !t.deleted_at), [allTasks]);
  
  const selectProject = useStore((state) => state.selectProject);
  const selectedProjectId = useStore((state) => state.selectedProjectId);
  const completedToday = useStore((state) => state.completedToday);
  const tags = useStore((state) => state.tags);
  const taskTags = useStore((state) => state.taskTags);
  
  // Actions
  const addProject = useStore((state) => state.addProject);
  const updateProject = useStore((state) => state.updateProject);
  const deleteProject = useStore((state) => state.deleteProject);
  const addTask = useStore((state) => state.addTask);
  const moveTask = useStore((state) => state.moveTask);

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

  const handleCreateProject = () => {
    setEditingProject(null);
    setEditDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditDialogOpen(true);
  };

  const handleUpdateProject = async (projectId: number, updates: Partial<Project>) => {
    await updateProject(projectId, updates);
  };

  const handleSaveProject = async (updates: Partial<Project>) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, updates);
      } else {
        await addProject({
          ...updates,
          parent_project_id: selectedProjectId || undefined,
        });
      }
      setEditDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleDeleteProject = async () => {
    if (!editingProject) return;

    if (window.confirm('Delete this project? Tasks will be unassigned but not deleted.')) {
      try {
        await deleteProject(editingProject.id);
        setEditDialogOpen(false);
        setEditingProject(null);
        selectProject(null);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleAddTask = async (title: string) => {
    if (!selectedProjectId) return;
    await addTask({
      title,
      project_id: selectedProjectId,
      list_id: 1, // Default to inbox list ID
    });
  };

  const renderProjectList = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <FilterSortBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        sortValue={sortValue}
        onSortChange={setSortValue}
        filterValues={filterValues}
        onFilterChange={setFilterValues}
      />
      <ProjectList
        projects={projects}
        tasks={tasks}
        onProjectSelect={(id) => selectProject(id)}
        onCreateProject={handleCreateProject}
        onMoveTaskToProject={moveTask}
        selectedProjectId={selectedProjectId}
        searchQuery={searchValue}
        quadrantFilter={quadrantFilter}
        maslowFilter={maslowFilter}
        sortBy={sortBy}
        sortDirection={sortDirection}
      />
      <ProjectDetail
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
        project={editingProject || undefined}
      />
    </Box>
  );

  const renderProjectDetail = () => (
    selectedProject ? (
      <ProjectDetailView
        project={selectedProject}
        projects={projects}
        tasks={tasks}
        completedToday={completedToday}
        onNavigateToProject={selectProject}
        onEditProject={handleEditProject}
        onUpdateProject={handleUpdateProject}
        onAddTask={handleAddTask}
        onAddSubProject={handleCreateProject}
        tags={tags}
        taskTags={taskTags}
      />
    ) : (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Select a project to view details</Typography>
      </Box>
    )
  );

  if (selectedProject) {
    return renderProjectDetail();
  }

  return renderProjectList();
};

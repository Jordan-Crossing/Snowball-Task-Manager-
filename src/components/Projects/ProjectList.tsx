/**
 * ProjectList component - Hierarchical tree list of projects
 * Supports search, filtering, sorting, expandable folders
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  List,
  Typography,
  CircularProgress,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { Project, Task } from '../../db/types';
import { ProjectItem } from './ProjectItem';

interface ProjectListProps {
  projects: Project[];
  tasks: Task[];
  loading?: boolean;
  onProjectSelect: (projectId: number) => void;
  onCreateProject: () => void;
  selectedProjectId?: number | null;
  // Search/filter/sort from parent
  searchQuery?: string;
  quadrantFilter?: string | null;
  maslowFilter?: string | null;
  sortBy?: 'name' | 'date' | 'count';
  sortDirection?: 'asc' | 'desc';
}

interface ProjectWithChildren extends Project {
  children?: ProjectWithChildren[];
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  tasks,
  loading = false,
  onProjectSelect,
  onCreateProject,
  selectedProjectId,
  searchQuery = '',
  quadrantFilter = null,
  maslowFilter = null,
  sortBy = 'name',
  sortDirection = 'asc',
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // Toggle folder expansion
  const toggleFolder = (projectId: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Build hierarchical tree structure
  const buildProjectTree = (
    projectsList: Project[],
    parentId: number | null = null
  ): ProjectWithChildren[] => {
    const children: ProjectWithChildren[] = [];

    projectsList.forEach((project) => {
      const matchesParent = parentId === null
        ? !project.parent_project_id
        : project.parent_project_id === parentId;

      if (matchesParent) {
        const projectChildren = buildProjectTree(projectsList, project.id);
        children.push({
          ...project,
          children: projectChildren.length > 0 ? projectChildren : undefined,
        });
      }
    });

    return children;
  };

  // Apply search, filters, and sorting
  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query)
      );
    }

    // Filter by quadrant
    if (quadrantFilter) {
      result = result.filter((project) => project.quadrant === quadrantFilter);
    }

    // Filter by Maslow
    if (maslowFilter) {
      result = result.filter((project) => project.maslow_category === maslowFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'count') {
        // Count tasks in each project
        const aCount = tasks.filter((t) => t.project_id === a.id).length;
        const bCount = tasks.filter((t) => t.project_id === b.id).length;
        comparison = aCount - bCount;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [projects, searchQuery, quadrantFilter, maslowFilter, sortBy, sortDirection, tasks]);

  // Build tree from filtered projects
  const projectTree = useMemo(() => {
    return buildProjectTree(filteredAndSortedProjects);
  }, [filteredAndSortedProjects]);

  const hasActiveFilters = searchQuery || quadrantFilter || maslowFilter;

  // Recursive render function for tree
  const renderProjectTree = (
    projectNodes: ProjectWithChildren[],
    depth: number = 0
  ): React.ReactNode => {
    return projectNodes.map((project) => (
      <React.Fragment key={project.id}>
        <ProjectItem
          project={project}
          tasks={tasks}
          onSelect={onProjectSelect}
          selected={selectedProjectId === project.id}
          depth={depth}
          hasChildren={!!project.children && project.children.length > 0}
          isExpanded={expandedFolders.has(project.id)}
          onToggleExpand={() => toggleFolder(project.id)}
        />
        {/* Render children if expanded */}
        {project.children &&
          project.children.length > 0 &&
          expandedFolders.has(project.id) &&
          renderProjectTree(project.children, depth + 1)}
      </React.Fragment>
    ));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* New Project Button */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateProject}
          fullWidth
        >
          New Project
        </Button>
      </Box>

      {/* Project List */}
      <List sx={{ flex: 1, overflow: 'auto', px: 3 }}>
        {projectTree.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="textSecondary" gutterBottom>
              {hasActiveFilters ? 'No projects match your filters' : 'No projects yet'}
            </Typography>
            {!hasActiveFilters && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Click "New Project" to create your first project
              </Typography>
            )}
          </Box>
        ) : (
          renderProjectTree(projectTree)
        )}
      </List>
    </Box>
  );
};

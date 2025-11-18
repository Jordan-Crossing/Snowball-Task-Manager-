/**
 * ProjectDetailView - Full-page view of a single project
 * Shows project details, sub-projects, and tasks with hierarchy
 * Supports inline editing of all fields
 */

import React, { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Divider,
  Button,
  Chip,
  Breadcrumbs as MuiBreadcrumbs,
  Link,
  TextField,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { Project, Task } from '../../db/types';
import { TaskList } from '../Tasks/TaskList';
import { getQuadrantColor, getMaslowEmoji, getQuadrants, getMaslowCategories } from '../../constants';
import { parseDuration, formatDuration, formatAsWorkDays, isValidDuration } from '../../utils/duration';

interface ProjectDetailViewProps {
  project: Project;
  projects: Project[]; // All projects for finding parents and children
  tasks: Task[];
  completedToday: Set<number>;
  onNavigateToProject: (projectId: number | null) => void;
  onEditProject: (project: Project) => void;
  onUpdateProject: (projectId: number, updates: Partial<Project>) => Promise<void>;
  onTaskSelect: (taskId: number) => void;
  onToggleComplete: (taskId: number) => void;
  onToggleFlag: (taskId: number) => void;
  onAddTask: (title: string) => void;
  onAddSubProject: () => void;
  onMakeSubtask: (taskId: number, parentTaskId: number) => void;
  onReorderTask: (taskId: number, targetTaskId: number, position: 'before' | 'after') => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  projects,
  tasks,
  completedToday,
  onNavigateToProject,
  onEditProject,
  onUpdateProject,
  onTaskSelect,
  onToggleComplete,
  onToggleFlag,
  onAddTask,
  onAddSubProject,
  onMakeSubtask,
  onReorderTask,
}) => {
  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Quick-add task state
  const [quickAddInput, setQuickAddInput] = useState<string>('');

  // Build breadcrumb path by walking up parent_project_id
  const buildBreadcrumbPath = (): Project[] => {
    const path: Project[] = [];
    let current: Project | undefined = project;

    while (current) {
      path.unshift(current);
      current = current.parent_project_id
        ? projects.find(p => p.id === current!.parent_project_id)
        : undefined;
    }

    return path;
  };

  const breadcrumbPath = buildBreadcrumbPath();

  // Get sub-projects (projects where parent_project_id = this project's id)
  const subProjects = projects.filter(p => p.parent_project_id === project.id);

  // Get all tasks in this project (including subtasks for hierarchy display)
  const projectTasks = tasks.filter(t => t.project_id === project.id);

  // Calculate total duration for all tasks in this project (including subtasks)
  const calculateTotalDuration = (): number => {
    const allProjectTasks = tasks.filter(t => t.project_id === project.id);
    return allProjectTasks.reduce((sum, task) => sum + (task.duration_minutes || 0), 0);
  };

  const totalDuration = calculateTotalDuration();

  // Start inline editing
  const startEdit = (field: string, currentValue: string | undefined | null) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  // Cancel inline editing
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Save inline edit
  const saveEdit = async (field: string) => {
    const updates: Partial<Project> = {};

    if (field === 'name') {
      if (!editValue.trim()) {
        cancelEdit();
        return; // Name required
      }
      updates.name = editValue.trim();
    } else if (field === 'description') {
      updates.description = editValue.trim() || undefined;
    } else if (field === 'duration') {
      if (!isValidDuration(editValue)) {
        alert('Invalid duration format. Use: 1w3d2h32m');
        return;
      }
      updates.duration_minutes = parseDuration(editValue);
    }

    await onUpdateProject(project.id, updates);
    cancelEdit();
  };

  // Save dropdown selections
  const saveDropdown = async (field: string, value: string) => {
    const updates: Partial<Project> = {};

    if (field === 'quadrant') {
      updates.quadrant = (value || undefined) as 'Q1' | 'Q2' | 'Q3' | 'Q4' | undefined;
    } else if (field === 'maslow_category') {
      updates.maslow_category = value || undefined;
    }

    await onUpdateProject(project.id, updates);
  };

  return (
    <Stack sx={{ height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Breadcrumbs */}
      <Box sx={{ px: 3, pt: 2, pb: 1 }}>
        <MuiBreadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          {/* Root "Projects" link */}
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => onNavigateToProject(null)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              padding: 0,
              font: 'inherit',
            }}
          >
            Projects
          </Link>

          {/* Parent projects in path */}
          {breadcrumbPath.slice(0, -1).map((p) => (
            <Link
              key={p.id}
              component="button"
              underline="hover"
              color="inherit"
              onClick={() => onNavigateToProject(p.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                padding: 0,
                font: 'inherit',
              }}
            >
              {p.is_folder ? <FolderIcon fontSize="small" /> : <AccountTreeIcon fontSize="small" />}
              <span>{p.name}</span>
            </Link>
          ))}

          {/* Current project (not clickable) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {project.is_folder ? <FolderIcon fontSize="small" /> : <AccountTreeIcon fontSize="small" />}
            <Typography color="text.primary" sx={{ fontWeight: 600 }}>
              {project.name}
            </Typography>
          </Box>
        </MuiBreadcrumbs>
      </Box>

      <Divider />

      {/* Project Header - Inline Editable */}
      <Box sx={{ px: 3, pt: 2, pb: 2 }}>
        {/* Project Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {editingField === 'name' ? (
            <>
              <TextField
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                size="small"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit('name');
                  if (e.key === 'Escape') cancelEdit();
                }}
                sx={{ flex: 1 }}
              />
              <IconButton size="small" onClick={() => saveEdit('name')} color="primary">
                <CheckIcon />
              </IconButton>
              <IconButton size="small" onClick={cancelEdit}>
                <CloseIcon />
              </IconButton>
            </>
          ) : (
            <>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                  px: 1,
                  borderRadius: 1,
                  flex: 1,
                }}
                onClick={() => startEdit('name', project.name)}
              >
                {project.name}
              </Typography>
              <IconButton onClick={() => onEditProject(project)} size="small">
                <EditIcon />
              </IconButton>
            </>
          )}
        </Box>

        {/* Total Duration Counter */}
        {totalDuration > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AccessTimeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Total estimate: <strong>{formatAsWorkDays(totalDuration)}</strong> ({formatDuration(totalDuration, 'long')})
            </Typography>
          </Box>
        )}

        {/* Project Metadata - Inline Editable */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {/* Quadrant Selector */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={project.quadrant || ''}
              onChange={(e) => saveDropdown('quadrant', e.target.value)}
              displayEmpty
              renderValue={(value) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {value ? (
                    <Chip
                      label={value}
                      size="small"
                      sx={{
                        bgcolor: getQuadrantColor(value),
                        color: 'white',
                        height: 24,
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Set Quadrant
                    </Typography>
                  )}
                </Box>
              )}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {getQuadrants().map((q) => (
                <MenuItem key={q.value} value={q.value}>
                  {q.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Maslow Selector */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={project.maslow_category || ''}
              onChange={(e) => saveDropdown('maslow_category', e.target.value)}
              displayEmpty
              renderValue={(value) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {value ? (
                    <Chip
                      label={`${getMaslowEmoji(value)} ${value}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 24 }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Set Maslow
                    </Typography>
                  )}
                </Box>
              )}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {getMaslowCategories().map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Duration Editor */}
          {editingField === 'duration' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                size="small"
                placeholder="e.g., 1w3d2h30m"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit('duration');
                  if (e.key === 'Escape') cancelEdit();
                }}
                sx={{ width: 150 }}
              />
              <IconButton size="small" onClick={() => saveEdit('duration')} color="primary">
                <CheckIcon />
              </IconButton>
              <IconButton size="small" onClick={cancelEdit}>
                <CloseIcon />
              </IconButton>
            </Box>
          ) : (
            <Chip
              icon={<AccessTimeIcon />}
              label={project.duration_minutes ? formatDuration(project.duration_minutes, 'long') : 'Set duration'}
              size="small"
              onClick={() => startEdit('duration', project.duration_minutes ? formatDuration(project.duration_minutes) : '')}
              sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
            />
          )}
        </Box>

        {/* Description - Inline Editable */}
        {editingField === 'description' ? (
          <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
            <TextField
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              size="small"
              multiline
              rows={3}
              fullWidth
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            <Box>
              <IconButton size="small" onClick={() => saveEdit('description')} color="primary">
                <CheckIcon />
              </IconButton>
              <IconButton size="small" onClick={cancelEdit}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'action.hover' },
              px: 1,
              py: 0.5,
              borderRadius: 1,
              minHeight: 40,
            }}
            onClick={() => startEdit('description', project.description)}
          >
            {project.description || 'Click to add description...'}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Main content area (scrollable) */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
        {/* Sub-projects Section */}
        {subProjects.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Sub-projects ({subProjects.length})
            </Typography>
            <Stack spacing={1}>
              {subProjects.map((subProject) => (
                <Box
                  key={subProject.id}
                  onClick={() => onNavigateToProject(subProject.id)}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {subProject.is_folder ? (
                      <FolderIcon color="primary" />
                    ) : (
                      <AccountTreeIcon color="secondary" />
                    )}
                    <Typography sx={{ fontWeight: 500 }}>{subProject.name}</Typography>
                  </Box>
                  {subProject.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {subProject.description}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddSubProject}
              sx={{ mt: 2 }}
              fullWidth
            >
              Add Sub-project
            </Button>
          </Box>
        )}

        {/* Tasks Section */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Tasks ({projectTasks.length})
          </Typography>

          {/* Task list */}
          <TaskList
            tasks={projectTasks}
            onTaskSelect={onTaskSelect}
            onToggleComplete={onToggleComplete}
            onToggleFlag={onToggleFlag}
            onMakeSubtask={onMakeSubtask}
            onReorderTask={onReorderTask}
            completedToday={completedToday}
            emptyMessage="No tasks in this project yet"
          />

          {/* Quick-add task input - at bottom */}
          <TextField
            fullWidth
            size="small"
            placeholder="Add task..."
            value={quickAddInput}
            onChange={(e) => setQuickAddInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && quickAddInput.trim()) {
                onAddTask(quickAddInput.trim());
                setQuickAddInput('');
              }
            }}
            sx={{ mt: 2 }}
          />
        </Box>
      </Box>
    </Stack>
  );
};

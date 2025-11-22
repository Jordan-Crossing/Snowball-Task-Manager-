/**
 * Task detail panel/full screen view
 * Shows full edit form for task details including subtasks
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stack,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Task, List, Project, Tag } from '../../db/types';
import { getMaslowCategories, getQuadrants, getQuadrantColor } from '../../constants';
import { TagSelector } from '../Tags/TagSelector';
import { ConfirmDialog } from '../common';

interface TaskDetailProps {
  task?: Task;
  lists?: List[];
  projects?: Project[];
  tasks?: Task[]; // All tasks for parent/subtask selection
  tags?: Tag[]; // All available tags
  taskTags?: Map<number, number[]>; // Map of task_id -> tag_id[]
  selectedTags?: number[]; // Tag IDs for this task
  loading?: boolean;
  onClose?: () => void;
  onSave?: (task: Partial<Task>, tagIds?: number[], newTagNames?: string[]) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onCreateSubtask?: () => void;
  isFullScreen?: boolean;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  lists: _lists = [],
  projects = [],
  tasks = [],
  tags = [],
  taskTags,
  selectedTags: _initialSelectedTags = [],
  loading = false,
  onClose,
  onSave,
  onDelete,
  onCreateSubtask,
  isFullScreen = false,
}) => {
  const [formData, setFormData] = useState<Partial<Task>>(
    task || {
      title: '',
      description: '',
      duration_minutes: 0,
      quadrant: undefined,
      maslow_category: undefined,
      parent_task_id: undefined,
      project_id: undefined,
      list_id: undefined,
      flagged_for_today: false,
      is_repeating: false,
    }
  );

  const [isSaving] = useState(false);
  const [selectedTags, setSelectedTags] = useState<(Tag | string)[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Sync formData when task changes
  useEffect(() => {
    if (task) {
      setFormData(task);
    }
  }, [task?.id]);

  // Sync selectedTags when task, tags, or taskTags changes
  useEffect(() => {
    if (task && taskTags && tags.length > 0) {
      const taskTagIds = taskTags.get(task.id) || [];
      const taskTagObjects = tags.filter((tag) => taskTagIds.includes(tag.id));
      setSelectedTags(taskTagObjects);
    } else {
      setSelectedTags([]);
    }
  }, [task, tags, taskTags]);

  const performSave = (data: Partial<Task>, tags: (Tag | string)[]) => {
    if (!task?.id) return;

    const existingTagIds: number[] = [];
    const newTagNames: string[] = [];

    tags.forEach((tag) => {
      if (typeof tag === 'string') {
        newTagNames.push(tag);
      } else {
        existingTagIds.push(tag.id);
      }
    });

    onSave?.(data, existingTagIds, newTagNames);
  };

  const handleTagsChange = (newTags: (Tag | string)[]) => {
    setSelectedTags(newTags);
    performSave(formData, newTags);
  };

  // Get parent task if exists
  const parentTask = task?.parent_task_id
    ? tasks.find((t) => t.id === task.parent_task_id)
    : undefined;

  // Get subtasks if exists
  const subtasks = task ? tasks.filter((t) => t.parent_task_id === task.id) : [];

  // Get available parent tasks (exclude self and subtasks)
  const availableParentTasks = tasks.filter(
    (t) => t.id !== task?.id && t.parent_task_id !== task?.id
  );

  const handleDeleteClick = () => {
    if (onDelete && task) {
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (onDelete && task) {
      // @ts-ignore - onDelete signature mismatch in props vs usage
      onDelete();
    }
  };

  const handleChange = (field: keyof Task, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    if (!task?.id) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const immediateFields = ['duration_minutes', 'quadrant', 'maslow_category', 'list_id', 'project_id', 'flagged_for_today', 'is_repeating', 'parent_task_id'];
    
    if (immediateFields.includes(field)) {
      performSave(newFormData, selectedTags);
    } else {
      saveTimeoutRef.current = setTimeout(() => {
        performSave(newFormData, selectedTags);
      }, 500);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  const contentSx = isFullScreen
    ? { p: 3, maxWidth: 'md' }
    : { p: 2 };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ ...contentSx, flex: 1, overflow: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h6">
          {task ? 'Edit Task' : 'New Task'}
        </Typography>
        {onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Form */}
      <Stack spacing={2}>
        {/* Parent Task Info */}
        {parentTask && (
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Subtask of:
            </Typography>
            <Typography variant="body2">{parentTask.title}</Typography>
          </Box>
        )}

        {/* Title */}
        <TextField
          label="Task Title"
          fullWidth
          variant="outlined"
          value={formData.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          disabled={isSaving}
          required
        />

        {/* Description */}
        <TextField
          label="Description"
          fullWidth
          multiline
          rows={2}
          variant="outlined"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={isSaving}
        />

        {/* Project Selector */}
        <FormControl fullWidth>
          <InputLabel>Project</InputLabel>
          <Select
            label="Project"
            value={formData.project_id || ''}
            onChange={(e) => handleChange('project_id', e.target.value || undefined)}
            disabled={isSaving}
          >
            <MenuItem value="">None</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {project.quadrant && (
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: getQuadrantColor(project.quadrant),
                      }}
                    />
                  )}
                  {project.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Parent Task Selector */}
        <FormControl fullWidth>
          <InputLabel>Parent Task (make this a subtask)</InputLabel>
          <Select
            label="Parent Task (make this a subtask)"
            value={formData.parent_task_id || ''}
            onChange={(e) => handleChange('parent_task_id', e.target.value || undefined)}
            disabled={isSaving}
          >
            <MenuItem value="">None (top-level task)</MenuItem>
            {availableParentTasks.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Duration */}
        <TextField
          label="Duration (minutes)"
          type="number"
          variant="outlined"
          value={formData.duration_minutes ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            handleChange('duration_minutes', val === '' ? undefined : parseInt(val));
          }}
          disabled={isSaving}
          inputProps={{ min: 0, step: 15 }}
        />

        {/* Quadrant */}
        <FormControl fullWidth>
          <InputLabel>Eisenhower Quadrant</InputLabel>
          <Select
            label="Eisenhower Quadrant"
            value={formData.quadrant || ''}
            onChange={(e) => handleChange('quadrant', e.target.value || undefined)}
            disabled={isSaving}
          >
            <MenuItem value="">None</MenuItem>
            {getQuadrants().map((q) => (
              <MenuItem key={q.value} value={q.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: q.color,
                    }}
                  />
                  <Typography>{q.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Maslow Category */}
        <FormControl fullWidth>
          <InputLabel>Maslow's Hierarchy Category</InputLabel>
          <Select
            label="Maslow's Hierarchy Category"
            value={formData.maslow_category || ''}
            onChange={(e) => handleChange('maslow_category', e.target.value || undefined)}
            disabled={isSaving}
          >
            <MenuItem value="">None</MenuItem>
            {getMaslowCategories().map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '1.2rem' }}>{cat.emoji}</Typography>
                  <Typography>{cat.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Tags */}
        <TagSelector
          tags={tags}
          selectedTags={selectedTags}
          onChange={handleTagsChange}
          disabled={isSaving}
        />

        {/* Flags */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.flagged_for_today || false}
                onChange={(e) => handleChange('flagged_for_today', e.target.checked)}
                disabled={isSaving}
              />
            }
            label="Flag for today"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_repeating || false}
                onChange={(e) => handleChange('is_repeating', e.target.checked)}
                disabled={isSaving}
              />
            }
            label="Repeating task"
          />
        </Box>

        {/* Subtasks Section */}
        {task && subtasks.length > 0 && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Subtasks ({subtasks.length})
            </Typography>
            <Stack spacing={1}>
              {subtasks.map((subtask) => (
                <Chip
                  key={subtask.id}
                  label={subtask.title}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Add Subtask Button */}
        {task && onCreateSubtask && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onCreateSubtask}
            size="small"
          >
            Add Subtask
          </Button>
        )}

        {/* Delete Button */}
        {task && onDelete && (
          <Box sx={{ pt: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteClick}
              disabled={isSaving}
            >
              Delete Task
            </Button>
          </Box>
        )}
      </Stack>
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Task?"
        content="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialogOpen(false)}
        isDestructive
      />
    </Box>
  );
};

/**
 * Task detail panel/full screen view
 * Shows full edit form for task details including subtasks
 */

import React, { useState, useEffect } from 'react';
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
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { Task, List, Project, Tag } from '../../db/types';
import { getMaslowCategories, getQuadrants, getQuadrantColor } from '../../constants';

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
  lists = [],
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
      context: '',
      duration_minutes: 0,
      quadrant: undefined,
      maslow_category: undefined,
      parent_task_id: undefined,
      project_id: undefined,
      list_id: undefined,
      flagged_for_today: false,
      is_repeating: false,
      is_folder: false,
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [selectedTags, setSelectedTags] = useState<(Tag | string)[]>([]);

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

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Separate existing tag IDs from new tag names
      const existingTagIds: number[] = [];
      const newTagNames: string[] = [];

      selectedTags.forEach((tag) => {
        if (typeof tag === 'string') {
          newTagNames.push(tag);
        } else {
          existingTagIds.push(tag.id);
        }
      });

      await onSave?.(formData, existingTagIds, newTagNames);
      onClose?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete?.();
        onClose?.();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
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
    <Box sx={{ ...contentSx, height: '100%', overflow: 'auto' }}>
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

        {/* Context */}
        <TextField
          label="Context / Notes"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={formData.context || ''}
          onChange={(e) => handleChange('context', e.target.value)}
          disabled={isSaving}
          helperText="Long-form notes about this task"
        />

        {/* List Selector */}
        <FormControl fullWidth>
          <InputLabel>List</InputLabel>
          <Select
            label="List"
            value={formData.list_id || ''}
            onChange={(e) => handleChange('list_id', e.target.value || undefined)}
            disabled={isSaving}
          >
            <MenuItem value="">None</MenuItem>
            {lists.map((list) => (
              <MenuItem key={list.id} value={list.id}>
                {list.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
          value={formData.duration_minutes || 0}
          onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || 0)}
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
        <Autocomplete
          multiple
          freeSolo
          options={tags}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            if ('name' in option) return option.name;
            return '';
          }}
          isOptionEqualToValue={(option, value) => {
            if (typeof option === 'string' && typeof value === 'string') {
              return option === value;
            }
            if (typeof option === 'object' && typeof value === 'object' && 'id' in option && 'id' in value) {
              return option.id === value.id;
            }
            return false;
          }}
          value={selectedTags}
          onChange={(_, newValue) => {
            setSelectedTags(newValue as (Tag | string)[]);
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const tagName = typeof option === 'string' ? option : option.name;
              const tagColor = typeof option === 'string' ? undefined : option.color;
              return (
                <Chip
                  label={tagName}
                  {...getTagProps({ index })}
                  size="small"
                  sx={{
                    bgcolor: tagColor || 'primary.main',
                    color: 'white',
                  }}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags"
              placeholder={selectedTags.length === 0 ? "Type to add tags..." : ""}
              helperText={`${tags.length} tags available. Type and press Enter to create new.`}
            />
          )}
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
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_folder || false}
                onChange={(e) => handleChange('is_folder', e.target.checked)}
                disabled={isSaving}
              />
            }
            label="Folder (container for other tasks)"
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

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, pt: 2 }}>
          {task && onDelete && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
              disabled={isSaving}
            >
              Delete
            </Button>
          )}
          {onClose && (
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving || !formData.title?.trim()}
            sx={{ flex: 1 }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

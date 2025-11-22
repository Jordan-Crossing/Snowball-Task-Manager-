/**
 * Tags management view
 * Shows all tags with their associated tasks
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Chip,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LabelIcon from '@mui/icons-material/Label';
import CheckIcon from '@mui/icons-material/Check';
import { useStore } from '../../store/useStore';
import type { Task } from '../../db/types';
import { TaskList } from '../Tasks/TaskList';

const PRESET_COLORS = [
  '#ef5350', // Red
  '#ffa726', // Orange
  '#ffee58', // Yellow
  '#66bb6a', // Green
  '#42a5f5', // Blue
  '#ab47bc', // Purple
  '#ec407a', // Pink
  '#8d6e63', // Brown
  '#78909c', // Blue Grey
  '#bdbdbd', // Grey
];

export const TagsView: React.FC = () => {
  const tags = useStore((state) => state.tags);
  const tasks = useStore((state) => state.tasks);
  const taskTags = useStore((state) => state.taskTags);
  const selectedTagId = useStore((state) => state.selectedTagId);
  const selectTag = useStore((state) => state.selectTag);
  const updateTag = useStore((state) => state.updateTag);
  const deleteTag = useStore((state) => state.deleteTag);
  const addTag = useStore((state) => state.addTag);
  

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState(PRESET_COLORS[4]);

  // Get task count per tag
  const getTaskCountForTag = (tagId: number): number => {
    let count = 0;
    taskTags.forEach((tagIds) => {
      if (tagIds.includes(tagId)) count++;
    });
    return count;
  };

  // Get tasks for selected tag
  const getTasksForTag = (tagId: number): Task[] => {
    const taskIds: number[] = [];
    taskTags.forEach((tagIds, taskId) => {
      if (tagIds.includes(tagId)) {
        taskIds.push(taskId);
      }
    });
    return tasks.filter((task) => taskIds.includes(task.id));
  };

  const selectedTag = tags.find((t) => t.id === selectedTagId);
  const selectedTasks = selectedTagId ? getTasksForTag(selectedTagId) : [];

  const handleCreateClick = () => {
    setTagName('');
    setTagColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditClick = () => {
    if (selectedTag) {
      setTagName(selectedTag.name);
      setTagColor(selectedTag.color || PRESET_COLORS[4]);
      setIsEditing(true);
      setDialogOpen(true);
    }
  };

  const handleSave = async () => {
    if (!tagName.trim()) return;

    if (isEditing && selectedTag) {
      await updateTag(selectedTag.id, {
        name: tagName.trim(),
        color: tagColor,
      });
    } else {
      const newTag = await addTag({
        name: tagName.trim(),
        color: tagColor,
      });
      if (newTag) {
        selectTag(newTag.id);
      }
    }
    setDialogOpen(false);
  };

  const handleDeleteClick = async () => {
    if (selectedTag) {
      if (window.confirm(`Delete tag "${selectedTag.name}"? It will be removed from all tasks.`)) {
        await deleteTag(selectedTag.id);
        selectTag(null);
      }
    }
  };

  if (tags.length === 0 && !dialogOpen) {
    return (
      <Box
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
        }}
      >
        <LabelIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
        <Typography variant="h5" gutterBottom>
          No tags yet
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: 400 }}>
          Tags help you organize your tasks across different projects and lists.
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleCreateClick}
          size="large"
        >
          Create First Tag
        </Button>
        
        {/* Dialog needs to be rendered here too for the create action to work */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          {/* ... (Dialog content will be shared) */}
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, height: '100%', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
      {/* Tags List */}
      <Paper 
        elevation={0}
        variant="outlined"
        sx={{ 
          flex: { xs: 'none', md: 1 }, 
          height: { xs: 'auto', md: '100%' },
          maxHeight: { xs: '200px', md: 'none' },
          overflow: 'auto', 
          maxWidth: { md: 300 },
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">Tags</Typography>
          <Tooltip title="Create Tag">
            <IconButton size="small" onClick={handleCreateClick} color="primary">
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <List sx={{ p: 1 }}>
          {tags.map((tag) => {
            const taskCount = getTaskCountForTag(tag.id);
            const isSelected = selectedTagId === tag.id;
            return (
              <ListItem key={tag.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => selectTag(tag.id)}
                  sx={{ 
                    borderRadius: 2,
                    borderLeft: isSelected ? `4px solid ${tag.color || 'primary.main'}` : '4px solid transparent',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: tag.color || 'text.secondary' 
                      }} 
                    />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: isSelected ? 600 : 400,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {tag.name}
                    </Typography>
                    <Chip 
                      label={taskCount} 
                      size="small" 
                      variant={isSelected ? "filled" : "outlined"}
                      sx={{ 
                        height: 20, 
                        minWidth: 20,
                        fontSize: '0.7rem',
                        '& .MuiChip-label': { px: 0.5 }
                      }} 
                    />
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Tag Details */}
      {selectedTag ? (
        <Paper 
          elevation={0}
          variant="outlined"
          sx={{ 
            flex: 2, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: 3,
            height: '100%'
          }}
        >
          <Box sx={{ 
            p: 3, 
            borderBottom: 1, 
            borderColor: 'divider', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            bgcolor: selectedTag.color ? `${selectedTag.color}15` : 'transparent'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LabelIcon sx={{ color: selectedTag.color || 'text.secondary', fontSize: 28 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {selectedTag.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Tooltip title="Edit Tag">
                <IconButton onClick={handleEditClick} size="small" sx={{ mr: 1 }}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Tag">
                <IconButton onClick={handleDeleteClick} size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {selectedTasks.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                <Typography variant="body1">
                  No tasks with this tag yet.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Add this tag to tasks to see them here.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                <TaskList
                  tasks={selectedTasks}
                  tags={tags}
                  taskTags={taskTags}
                  completedToday={useStore.getState().completedToday}
                  hideControls
                />
              </Box>
            )}
          </Box>
        </Paper>
      ) : (
        <Box
          sx={{
            flex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.5,
            flexDirection: 'column',
            gap: 2
          }}
        >
          <LabelIcon sx={{ fontSize: 64 }} />
          <Typography variant="h6">
            Select a tag to view its tasks
          </Typography>
        </Box>
      )}

      {/* Edit/Create Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{isEditing ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Tag Name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              fullWidth
              autoFocus
              variant="outlined"
            />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>Color</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {PRESET_COLORS.map((color) => (
                  <Box
                    key={color}
                    onClick={() => setTagColor(color)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: tagColor === color ? '2px solid white' : '2px solid transparent',
                      boxShadow: tagColor === color ? '0 0 0 2px #2196f3' : 'none',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      }
                    }}
                  >
                    {tagColor === color && <CheckIcon sx={{ color: 'white', fontSize: 20 }} />}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">Preview:</Typography>
              <Chip
                label={tagName || 'Tag Name'}
                sx={{
                  bgcolor: tagColor,
                  color: 'white',
                  fontWeight: 500
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={!tagName.trim()}
          >
            {isEditing ? 'Save Changes' : 'Create Tag'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

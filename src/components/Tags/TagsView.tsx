/**
 * Tags management view
 * Shows all tags with their associated tasks
 */

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Paper,
} from '@mui/material';
import type { Tag, Task } from '../../db/types';

interface TagsViewProps {
  tags: Tag[];
  tasks: Task[];
  taskTags: Map<number, number[]>;
  selectedTagId?: number | null;
  onTagSelect?: (tagId: number) => void;
  onCreateTag?: () => void;
}

export const TagsView: React.FC<TagsViewProps> = ({
  tags,
  tasks,
  taskTags,
  selectedTagId,
  onTagSelect,
  onCreateTag: _onCreateTag,
}) => {
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

  if (tags.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <Typography variant="h6" gutterBottom>
          No tags yet
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Tags help you organize and categorize your tasks
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3, textAlign: 'center' }}>
          You can create tags when editing a task - just type a tag name in the Tags field and press Enter
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', gap: 3 }}>
      {/* Tags List */}
      <Paper sx={{ flex: 1, overflow: 'auto', maxWidth: 300 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">All Tags</Typography>
        </Box>
        <List>
          {tags.map((tag) => {
            const taskCount = getTaskCountForTag(tag.id);
            return (
              <ListItem key={tag.id} disablePadding>
                <ListItemButton
                  selected={selectedTagId === tag.id}
                  onClick={() => onTagSelect?.(tag.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Chip
                      label={tag.name}
                      size="small"
                      sx={{
                        bgcolor: tag.color || 'primary.main',
                        color: 'white',
                      }}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" color="textSecondary">
                      {taskCount} task{taskCount !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Tag Details */}
      {selectedTag ? (
        <Paper sx={{ flex: 2, overflow: 'auto' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={selectedTag.name}
                sx={{
                  bgcolor: selectedTag.color || 'primary.main',
                  color: 'white',
                }}
              />
              <Typography variant="body2" color="textSecondary">
                {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ p: 2 }}>
            {selectedTasks.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No tasks with this tag yet
              </Typography>
            ) : (
              <List>
                {selectedTasks.map((task) => (
                  <ListItem key={task.id} disablePadding>
                    <ListItemText
                      primary={task.title}
                      secondary={task.description}
                    />
                  </ListItem>
                ))}
              </List>
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
          }}
        >
          <Typography variant="body1" color="textSecondary">
            Select a tag to view its tasks
          </Typography>
        </Box>
      )}
    </Box>
  );
};

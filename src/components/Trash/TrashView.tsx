import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useStore } from '../../store/useStore';
import { TaskList } from '../Tasks/TaskList';

export const TrashView: React.FC = () => {
  const tasks = useStore((state) => state.tasks);
  const tags = useStore((state) => state.tags);
  const taskTags = useStore((state) => state.taskTags);
  const emptyTrash = useStore((state) => state.emptyTrash);
  const selectedTaskId = useStore((state) => state.selectedTaskId);

  const deletedTasks = tasks.filter((t) => t.deleted_at);

  const handleEmptyTrash = async () => {
    if (window.confirm('Are you sure you want to permanently delete all items in the rubbish? This cannot be undone.')) {
      await emptyTrash();
    }
  };

  if (deletedTasks.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          opacity: 0.6,
        }}
      >
        <DeleteSweepIcon sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h6">Rubbish is empty</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Rubbish ({deletedTasks.length})</Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteSweepIcon />}
          onClick={handleEmptyTrash}
        >
          Empty Rubbish
        </Button>
      </Box>
      
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TaskList
          tasks={deletedTasks}
          tags={tags}
          taskTags={taskTags}
          selectedTaskId={selectedTaskId}
          emptyMessage="Rubbish is empty"
        />
      </Box>
    </Box>
  );
};

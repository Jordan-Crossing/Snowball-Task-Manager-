/**
 * Quick Add button component
 * Floating action button for quickly adding tasks to inbox
 */

import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface QuickAddButtonProps {
  onAdd: (title: string) => void | Promise<void>;
  loading?: boolean;
  position?: 'bottom-right' | 'center';
}

export const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  onAdd,
  position = 'bottom-right',
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setTitle('');
  };

  const handleAdd = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onAdd(title);
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const fabSx = {
    'bottom-right': {
      position: 'fixed',
      bottom: 24,
      right: 24,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'scale(1.1) translateY(-4px)',
        boxShadow: '0 12px 24px rgba(99, 102, 241, 0.4)',
      },
      '&:active': {
        transform: 'scale(0.95)',
      },
    },
    'center': { margin: 'auto' },
  };

  return (
    <>
      {/* Fab Button */}
      <Tooltip title="Quick Add to Inbox" placement="left">
        <Fab
          color="primary"
          aria-label="add to inbox"
          onClick={handleOpen}
          sx={fabSx[position]}
          size="large"
        >
          <AddIcon sx={{ fontSize: '1.5rem' }} />
        </Fab>
      </Tooltip>

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Quick Add Task</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Task Title"
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              disabled={isSaving}
              placeholder="What do you need to do?"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? 'Adding...' : 'Add to Inbox'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

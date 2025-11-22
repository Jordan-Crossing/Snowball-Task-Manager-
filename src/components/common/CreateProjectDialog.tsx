/**
 * CreateProjectDialog - Modal for creating projects or folders
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import ProjectIcon from '@mui/icons-material/AccountTree';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset name when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
    }
  }, [open]);

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      console.log('Creating project:', name.trim());
      await onCreate(name.trim());
      console.log('Project created successfully');
      handleClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <ProjectIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Create New Project
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Project Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            disabled={isSaving}
            placeholder="e.g., Website Redesign, Marketing Campaign"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!name.trim() || isSaving}
        >
          {isSaving ? 'Creating...' : 'Create Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

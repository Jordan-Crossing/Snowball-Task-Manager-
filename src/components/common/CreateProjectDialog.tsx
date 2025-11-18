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
import FolderIcon from '@mui/icons-material/Folder';
import ProjectIcon from '@mui/icons-material/AccountTree';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
  type: 'project' | 'folder';
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onClose,
  onCreate,
  type,
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
      console.log(`Creating ${type}:`, name.trim());
      await onCreate(name.trim());
      console.log(`${type} created successfully`);
      handleClose();
    } catch (error) {
      console.error(`Failed to create ${type}:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {type === 'folder' ? (
          <>
            <FolderIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Create New Folder
          </>
        ) : (
          <>
            <ProjectIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Create New Project
          </>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label={type === 'folder' ? 'Folder Name' : 'Project Name'}
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            disabled={isSaving}
            placeholder={
              type === 'folder'
                ? 'e.g., Work, Personal, Archive'
                : 'e.g., Website Redesign, Marketing Campaign'
            }
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
          {isSaving ? 'Creating...' : `Create ${type === 'folder' ? 'Folder' : 'Project'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

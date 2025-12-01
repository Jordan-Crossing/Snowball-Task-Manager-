/**
 * ProjectDetail component - Create/Edit project with full details
 */

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  IconButton,
  Typography,
  Stack,
  Divider,
} from '@mui/material';
import { Close as CloseIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Project } from '../../db/types';
import { getMaslowCategories, getQuadrants } from '../../constants';
import { parseDuration, formatDuration, isValidDuration } from '../../utils/duration';

interface ProjectDetailProps {
  project?: Project | null;
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Project>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  open,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quadrant, setQuadrant] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | ''>('');
  const [maslowCategory, setMaslowCategory] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const isNewProject = !project;

  // Initialize form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setQuadrant(project.quadrant || '');
      setMaslowCategory(project.maslow_category || '');
      setDuration(project.duration_minutes ? formatDuration(project.duration_minutes) : '');
    } else {
      // Clear form for new project
      setName('');
      setDescription('');
      setQuadrant('');
      setMaslowCategory('');
      setDuration('');
    }
  }, [project, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      return; // Name is required
    }

    // Validate duration if provided
    if (duration && !isValidDuration(duration)) {
      alert('Invalid duration format. Use: 1w3d2h30m');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        quadrant: (quadrant || undefined) as 'Q1' | 'Q2' | 'Q3' | 'Q4' | undefined,
        maslow_category: maslowCategory || undefined,
        maslow_subcategory: undefined, // Not using subcategories
        duration_minutes: duration ? parseDuration(duration) : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !project) return;

    if (window.confirm('Are you sure you want to delete this project? Tasks will be unassigned but not deleted.')) {
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0, 0, 0, 0.3)' } },
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 450, md: 500 },
          maxWidth: '100vw',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">
          {isNewProject ? 'Create New Project' : 'Edit Project'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Stack spacing={3}>
          {/* Name */}
          <TextField
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            required
            fullWidth
            autoFocus
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />

          {/* Quadrant */}
          <FormControl fullWidth>
            <InputLabel>Eisenhower Quadrant</InputLabel>
            <Select
              value={quadrant}
              onChange={(e) => setQuadrant(e.target.value)}
              label="Eisenhower Quadrant"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
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
            <InputLabel>Maslow Category</InputLabel>
            <Select
              value={maslowCategory}
              onChange={(e) => setMaslowCategory(e.target.value)}
              label="Maslow Category"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
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

          {/* Duration */}
          <TextField
            label="Duration (e.g., 1w3d2h30m)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            fullWidth
            helperText="Format: weeks (w), days (d), hours (h), minutes (m)"
          />
        </Stack>
      </Box>

      {/* Footer Actions */}
      <Divider />
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        {!isNewProject && onDelete && (
          <Button
            onClick={handleDelete}
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ mr: 'auto' }}
          >
            Delete
          </Button>
        )}
        <Button onClick={onClose} disabled={saving} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim() || saving}
          sx={{ flex: 1 }}
        >
          {saving ? 'Saving...' : isNewProject ? 'Create' : 'Save'}
        </Button>
      </Box>
    </Drawer>
  );
};

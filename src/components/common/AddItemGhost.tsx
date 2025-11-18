/**
 * AddItemGhost - Inline ghost creation element
 * Appears at the bottom of lists for adding items inline
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface AddItemGhostProps {
  /** Label text (e.g., "Add Project or Folder", "Add Task") */
  label: string;
  /** Called when user confirms creation (presses Enter) */
  onAdd: (name: string) => void | Promise<void>;
  /** Optional icon to show (defaults to AddIcon) */
  icon?: React.ReactElement;
  /** Optional placeholder for the input field */
  placeholder?: string;
}

export const AddItemGhost: React.FC<AddItemGhostProps> = ({
  label,
  onAdd,
  icon = <AddIcon />,
  placeholder = 'Enter name...',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when entering add mode
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleClick = () => {
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setValue('');
  };

  const handleSubmit = async () => {
    if (value.trim() === '' || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(value.trim());
      setValue('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isAdding) {
    return (
      <ListItem
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: 'action.hover',
        }}
      >
        <ListItemIcon>{icon}</ListItemIcon>
        <Box sx={{ flexGrow: 1 }}>
          <TextField
            inputRef={inputRef}
            size="small"
            fullWidth
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCancel}
            placeholder={placeholder}
            disabled={isSubmitting}
            variant="standard"
            sx={{
              '& .MuiInput-root': {
                fontSize: '0.875rem',
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Press Enter to add, Esc to cancel
          </Typography>
        </Box>
      </ListItem>
    );
  }

  return (
    <ListItem
      disablePadding
      sx={{
        borderTop: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
        opacity: 0.7,
        transition: 'opacity 0.2s',
        '&:hover': {
          opacity: 1,
          backgroundColor: 'action.hover',
        },
      }}
    >
      <ListItemButton onClick={handleClick}>
        <ListItemIcon sx={{ color: 'text.secondary' }}>{icon}</ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          }
        />
      </ListItemButton>
    </ListItem>
  );
};

import React, { useState } from 'react';
import { Paper, InputBase, IconButton, Divider, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface AddTaskInputProps {
  onAdd: (title: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

export const AddTaskInput: React.FC<AddTaskInputProps> = ({ 
  onAdd, 
  placeholder = "Add a task...",
  icon = <AddIcon />
}) => {
  const [value, setValue] = useState('');

  const submit = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      variant="outlined"
      sx={{
        p: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        mb: 2,
        borderRadius: 2,
        borderColor: 'divider',
        '&:focus-within': {
          borderColor: 'primary.main',
          boxShadow: '0 0 0 1px var(--mui-palette-primary-main)',
        },
        transition: 'all 0.2s ease'
      }}
    >
      <Box sx={{ p: 1, display: 'flex', color: 'text.secondary' }}>
        {icon}
      </Box>
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        inputProps={{ 'aria-label': 'add task' }}
      />
      <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
      <IconButton color="primary" sx={{ p: '10px' }} aria-label="add" type="submit" disabled={!value.trim()}>
        <AddIcon />
      </IconButton>
    </Paper>
  );
};

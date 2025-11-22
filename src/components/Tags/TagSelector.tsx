import React from 'react';
import { Autocomplete, TextField, Chip, Box } from '@mui/material';
import type { Tag } from '../../db/types';

interface TagSelectorProps {
  tags: Tag[];
  selectedTags: (Tag | string)[];
  onChange: (tags: (Tag | string)[]) => void;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  selectedTags,
  onChange,
  disabled = false,
}) => {
  return (
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
        onChange(newValue as (Tag | string)[]);
      }}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <li key={key} {...otherProps}>
            <Box
              component="span"
              sx={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: typeof option === 'string' ? 'grey.500' : (option.color || 'primary.main'),
                mr: 1.5,
                flexShrink: 0,
              }}
            />
            {typeof option === 'string' ? option : option.name}
          </li>
        );
      }}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          const label = typeof option === 'string' ? option : option.name;
          const color = typeof option !== 'string' ? option.color : undefined;
          
          return (
            <Chip
              key={key}
              {...tagProps}
              label={label}
              size="small"
              sx={{ 
                bgcolor: color || undefined,
                color: color ? 'white' : undefined,
                fontWeight: 500,
              }}
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Tags"
          placeholder="Add tags..."
          disabled={disabled}
        />
      )}
      disabled={disabled}
    />
  );
};

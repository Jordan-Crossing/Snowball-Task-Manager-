/**
 * Reusable filter, sort, and search bar component
 */

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSortBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortValue?: string;
  sortOptions?: SortOption[];
  onSortChange?: (value: string) => void;
  filterValues?: string[];
  filterOptions?: FilterOption[];
  onFilterChange?: (values: string[]) => void;
  searchPlaceholder?: string;
}

export const FilterSortBar: React.FC<FilterSortBarProps> = ({
  searchValue,
  onSearchChange,
  sortValue,
  sortOptions = [],
  onSortChange,
  filterValues = [],
  filterOptions = [],
  onFilterChange,
  searchPlaceholder = 'Search...',
}) => {
  const handleFilterChange = (event: any) => {
    const value = event.target.value;
    onFilterChange?.(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        mb: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {/* Search */}
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ flex: 1, minWidth: 200 }}
      />

      {/* Filter - Multi-select with checkboxes */}
      {filterOptions.length > 0 && onFilterChange && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            multiple
            value={filterValues}
            onChange={handleFilterChange}
            input={<OutlinedInput label="Filter" />}
            renderValue={(selected) => {
              if (selected.length === 0) return 'All';
              if (selected.length === 1) {
                const option = filterOptions.find((o) => o.value === selected[0]);
                return option?.label || selected[0];
              }
              return `${selected.length} filters`;
            }}
            startAdornment={
              <InputAdornment position="start">
                <FilterListIcon fontSize="small" />
              </InputAdornment>
            }
          >
            {filterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={filterValues.indexOf(option.value) > -1} size="small" />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Sort */}
      {sortOptions.length > 0 && onSortChange && (
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortValue || ''}
            label="Sort by"
            onChange={(e) => onSortChange(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <SortIcon fontSize="small" />
              </InputAdornment>
            }
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
};

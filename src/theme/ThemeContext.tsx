/**
 * Theme Provider using Zustand
 * Provides theme to Material-UI based on Zustand store state
 */

import React, { useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from './theme';
import { useStore } from '../store/useStore';

/**
 * Theme Provider Component
 * Wraps the app and provides theme from Zustand store
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { themeMode, setThemeMode } = useStore();

  // Initialize theme from system preference on first load
  useEffect(() => {
    const initTheme = () => {
      // Only set if not already persisted
      const stored = localStorage.getItem('snowball-storage');
      if (!stored) {
        // Check system preference
        if (typeof window !== 'undefined' && window.matchMedia) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setThemeMode(prefersDark ? 'dark' : 'light');
        }
      }
    };
    initTheme();
  }, [setThemeMode]);

  // Update document attribute when theme changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
};

/**
 * Hook to use theme from Zustand store
 */
export const useTheme = () => {
  const { themeMode, toggleTheme, setThemeMode } = useStore();
  return {
    mode: themeMode,
    toggleTheme,
    setTheme: setThemeMode,
  };
};

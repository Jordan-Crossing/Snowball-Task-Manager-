/**
 * Material-UI Theme Configuration
 * Provides light and dark themes for modern, polished UI
 */

import { createTheme, type ThemeOptions } from '@mui/material/styles';

/**
 * Color palette - Modern, professional design
 */
const colors = {
  primary: '#6366f1', // Indigo - Modern primary color
  primaryDark: '#4f46e5',
  secondary: '#ec4899', // Pink - Accent color
  success: '#10b981', // Green
  warning: '#f59e0b', // Amber
  error: '#ef4444', // Red
  info: '#3b82f6', // Blue
};

/**
 * Light theme configuration
 */
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      dark: colors.primaryDark,
      light: '#818cf8',
    },
    secondary: {
      main: colors.secondary,
      light: '#f472b6',
      dark: '#be185d',
    },
    success: {
      main: colors.success,
    },
    warning: {
      main: colors.warning,
    },
    error: {
      main: colors.error,
    },
    info: {
      main: colors.info,
    },
    background: {
      default: '#f8fafc', // Light blue-gray
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // Dark slate
      secondary: '#64748b', // Medium slate
      disabled: '#cbd5e1',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.01em' },
    h3: { fontWeight: 700, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1.1rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.95rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 24px',
          fontSize: '1rem',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 20px rgba(99, 102, 241, 0.15)',
          },
        },
        contained: {
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            transition: 'all 0.3s ease',
            '&:hover fieldset': {
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: '0 16px 16px 0',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 0',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 500,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #e2e8f0',
        },
        indicator: {
          borderRadius: '3px 3px 0 0',
          height: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
          },
        },
      },
    },
  },
};

/**
 * Dark theme configuration
 */
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: colors.primary,
      dark: '#818cf8',
      light: '#a5b4fc',
    },
    secondary: {
      main: colors.secondary,
      light: '#f472b6',
      dark: '#be185d',
    },
    success: {
      main: colors.success,
    },
    warning: {
      main: colors.warning,
    },
    error: {
      main: colors.error,
    },
    info: {
      main: colors.info,
    },
    background: {
      default: '#0f172a', // Very dark blue
      paper: '#1e293b', // Dark slate
    },
    text: {
      primary: '#f1f5f9', // Light slate
      secondary: '#cbd5e1', // Medium light slate
      disabled: '#64748b',
    },
    divider: '#334155',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem', letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.01em' },
    h3: { fontWeight: 700, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1.1rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.95rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 24px',
          fontSize: '1rem',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 20px rgba(99, 102, 241, 0.25)',
          },
        },
        contained: {
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          border: '1px solid #334155',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            transition: 'all 0.3s ease',
            '&:hover fieldset': {
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e293b',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1e293b',
          borderRadius: '0 16px 16px 0',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 0',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(99, 102, 241, 0.25)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 500,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #334155',
        },
        indicator: {
          borderRadius: '3px 3px 0 0',
          height: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
          },
        },
      },
    },
  },
};

export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);

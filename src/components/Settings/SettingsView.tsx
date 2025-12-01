/**
 * Settings View Component
 * Manage app settings including theme preference and time settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  Typography,
  FormControlLabel,
  Switch,
  Divider,
  Stack,
  Paper,
  Button,
  TextField,
  Alert,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SaveIcon from '@mui/icons-material/Save';
import { useTheme } from '../../theme';
import { useStore } from '../../store/useStore';

export const SettingsView: React.FC = () => {
  const { mode, toggleTheme } = useTheme();
  const { settings, updateSettings, resetDatabase } = useStore();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Form state
  const [wakeUpTime, setWakeUpTime] = useState('07:00');
  const [cooldownTime, setCooldownTime] = useState('21:00');
  const [sleepTime, setSleepTime] = useState('22:00');

  // Load settings on mount or when settings change
  useEffect(() => {
    if (settings) {
      setWakeUpTime(settings.wake_up_time || '07:00');
      setCooldownTime(settings.cooldown_time || '21:00');
      setSleepTime(settings.sleep_time || '22:00');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        wake_up_time: wakeUpTime,
        cooldown_time: cooldownTime,
        sleep_time: sleepTime,
      });
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const state = useStore.getState();
    const data = {
      version: 1,
      timestamp: new Date().toISOString(),
      settings: state.settings,
      lists: state.lists,
      projects: state.projects,
      tasks: state.tasks,
      tags: state.tags,
      taskTags: Array.from(state.taskTags.entries()),
      completedToday: Array.from(state.completedToday)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snowball-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Page Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Settings
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Customize your app experience
        </Typography>
      </Box>

      {/* Save Message */}
      {saveMessage && (
        <Alert severity={saveMessage.includes('success') ? 'success' : 'error'} sx={{ mb: 3 }}>
          {saveMessage}
        </Alert>
      )}

      {/* Time Settings Section */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon />
              Time Settings
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Set your wake up, cooldown, and sleep times for smart tab switching in Today view
            </Typography>
          </Box>

          <Divider />

          {/* Wake Up Time */}
          <TextField
            label="Wake Up Time"
            type="time"
            value={wakeUpTime}
            onChange={(e) => setWakeUpTime(e.target.value)}
            disabled={saving}
            InputLabelProps={{ shrink: true }}
            helperText="Your typical morning start time"
            fullWidth
          />

          {/* Cooldown Time */}
          <TextField
            label="Cooldown Time"
            type="time"
            value={cooldownTime}
            onChange={(e) => setCooldownTime(e.target.value)}
            disabled={saving}
            InputLabelProps={{ shrink: true }}
            helperText="When you start winding down for the evening"
            fullWidth
          />

          {/* Sleep Time */}
          <TextField
            label="Sleep Time"
            type="time"
            value={sleepTime}
            onChange={(e) => setSleepTime(e.target.value)}
            disabled={saving}
            InputLabelProps={{ shrink: true }}
            helperText="Your typical bedtime"
            fullWidth
          />

          {/* Save Button */}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            fullWidth
            sx={{ mt: 2 }}
          >
            {saving ? 'Saving...' : 'Save Time Settings'}
          </Button>
        </Stack>
      </Card>

      {/* Appearance Section */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              {mode === 'light' ? <Brightness7Icon /> : <Brightness4Icon />}
              Appearance
            </Typography>
          </Box>

          <Divider />

          {/* Theme Toggle */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 2,
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Dark Mode
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                {mode === 'dark'
                  ? 'Dark mode is enabled for easier reading in low light'
                  : 'Light mode for better visibility in bright environments'}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={mode === 'dark'}
                  onChange={toggleTheme}
                  size="medium"
                />
              }
              label=""
            />
          </Box>

          <Divider />

          {/* Theme Preview */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>
              Current Theme: <strong>{mode === 'dark' ? 'Dark' : 'Light'}</strong>
            </Typography>
            <Stack direction="row" spacing={2}>
              <Paper
                elevation={3}
                sx={{
                  flex: 1,
                  p: 2,
                  textAlign: 'center',
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2">Primary Color</Typography>
              </Paper>
              <Paper
                elevation={3}
                sx={{
                  flex: 1,
                  p: 2,
                  textAlign: 'center',
                  backgroundColor: 'success.main',
                  color: 'success.contrastText',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2">Success Color</Typography>
              </Paper>
              <Paper
                elevation={3}
                sx={{
                  flex: 1,
                  p: 2,
                  textAlign: 'center',
                  backgroundColor: 'warning.main',
                  color: 'warning.contrastText',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2">Warning Color</Typography>
              </Paper>
            </Stack>
          </Box>
        </Stack>
      </Card>

      {/* Data Management Section */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Data Management
          </Typography>
          <Divider />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={handleExport}>
              Export Data
            </Button>
            <Button variant="outlined" disabled>
              Import Data (Coming Soon)
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={() => {
                if (window.confirm('Are you sure you want to reset the database? This will delete ALL data and cannot be undone.')) {
                  resetDatabase();
                }
              }}
            >
              Reset Database
            </Button>
          </Box>
        </Stack>
      </Card>

      {/* About Section */}
      <Card sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            About
          </Typography>

          <Divider />

          <Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              <strong>Snowball Task Manager</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              A modern, cross-platform task management application with smart Today view, time progress tracking, and beautiful UI.
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              Features
            </Typography>
            <Typography variant="body2" color="textSecondary" component="div" sx={{ mb: 1 }}>
              ✓ Responsive design (mobile, tablet, desktop)<br />
              ✓ Smart Today view with 4 intelligent tabs<br />
              ✓ Real-time task database with persistence<br />
              ✓ Dark and light themes<br />
              ✓ Cross-platform support (web, electron, android)<br />
              ✓ Modern, beautiful UI with smooth animations
            </Typography>

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small">
                Documentation
              </Button>
              <Button variant="outlined" size="small">
                Report Issue
              </Button>
            </Box>
          </Box>
        </Stack>
      </Card>
    </Container>
  );
};

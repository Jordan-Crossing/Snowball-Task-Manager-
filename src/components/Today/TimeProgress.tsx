/**
 * Time progress component for Today view
 * Shows visual progress of the day and remaining time
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Box, LinearProgress, Typography, Card } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface TimeProgressProps {
  wakeUpTime?: string; // HH:MM format
  cooldownTime?: string; // HH:MM format
  sleepTime?: string; // HH:MM format
  totalTaskDurationMinutes?: number;
  incompleteTasks?: number;
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export const TimeProgress: React.FC<TimeProgressProps> = ({
  wakeUpTime = '06:00',
  cooldownTime = '18:00',
  totalTaskDurationMinutes = 0,
  incompleteTasks = 0,
}) => {
  // Update current time every minute
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const progress = useMemo(() => {
    const wakeMinutes = parseTime(wakeUpTime);
    const cooldownMinutes = parseTime(cooldownTime);
    const currentMinutes = getCurrentMinutes();

    const totalMinutes = cooldownMinutes - wakeMinutes;
    const elapsedMinutes = currentMinutes - wakeMinutes;
    const progressPercent = Math.max(0, Math.min(100, (elapsedMinutes / totalMinutes) * 100));

    const remaining = cooldownMinutes - currentMinutes;

    return {
      percent: progressPercent,
      remaining: Math.max(0, remaining),
      elapsed: Math.max(0, elapsedMinutes),
      total: totalMinutes,
    };
  }, [wakeUpTime, cooldownTime, currentTime]);

  // Determine health status based on available time vs task duration
  const healthStatus = useMemo(() => {
    if (totalTaskDurationMinutes === 0) return 'good';
    const available = progress.remaining;
    const utilization = totalTaskDurationMinutes / available;

    if (utilization <= 0.8) return 'good'; // Green
    if (utilization <= 1.0) return 'warning'; // Yellow
    return 'danger'; // Red
  }, [progress.remaining, totalTaskDurationMinutes]);

  const healthColor = {
    good: '#4caf50',
    warning: '#ff9800',
    danger: '#f44336',
  }[healthStatus];

  return (
    <Card sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, transparent 100%)' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            Day Progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress.percent}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: healthColor,
              },
            }}
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            {Math.round(progress.percent)}% to cooldown
          </Typography>
        </Box>

        {/* Time Remaining and Incomplete Tasks */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon fontSize="small" color="action" />
            <Box>
              <Typography variant="caption" color="textSecondary">
                Time until cooldown
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {formatTime(progress.remaining)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Incomplete tasks
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {incompleteTasks} tasks
            </Typography>
          </Box>
        </Box>

        {/* Tasks Duration */}
        {totalTaskDurationMinutes > 0 && (
          <Box
            sx={{
              p: 2,
              backgroundColor: `${healthColor}15`,
              borderLeft: `4px solid ${healthColor}`,
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="textSecondary">
              Total estimated time
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: healthColor,
                mt: 0.5,
              }}
            >
              {formatTime(totalTaskDurationMinutes)}
              {healthStatus === 'good' && ' ✓ On track'}
              {healthStatus === 'warning' && ' ⚠ Getting tight'}
              {healthStatus === 'danger' && ' ✗ Overloaded'}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};

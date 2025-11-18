/**
 * Today view with smart tab logic
 * Shows Morning, Today, Cooldown, and Fun tabs with intelligent default selection
 */

import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Container, Typography, CircularProgress } from '@mui/material';
import { TimeProgress } from './TimeProgress';
import { TaskList } from '../Tasks/TaskList';
import { useTodayTabLogic, type TodayTab } from '../../hooks';
import type { Task } from '../../db/types';

interface TodayViewProps {
  settings?: {
    wake_up_time?: string;
    cooldown_time?: string;
    sleep_time?: string;
  };
  morningTasks?: Task[];
  todayTasks?: Task[];
  cooldownTasks?: Task[];
  funTasks?: Task[];
  morningTasksComplete?: boolean;
  cooldownTasksComplete?: boolean;
  totalTaskDurationMinutes?: number;
  incompleteTasks?: number;
  loading?: boolean;
  onTaskSelect?: (taskId: number) => void;
  onToggleComplete?: (taskId: number) => void | Promise<void>;
  onToggleFlag?: (taskId: number) => void | Promise<void>;
  selectedTaskId?: number | null;
  completedToday?: Set<number>;
}

export const TodayView: React.FC<TodayViewProps> = ({
  settings = {},
  morningTasks = [],
  todayTasks = [],
  cooldownTasks = [],
  funTasks = [],
  morningTasksComplete = false,
  cooldownTasksComplete = false,
  totalTaskDurationMinutes = 0,
  incompleteTasks = 0,
  loading = false,
  onTaskSelect,
  onToggleComplete,
  onToggleFlag,
  selectedTaskId,
  completedToday = new Set(),
}) => {
  const { defaultTab } = useTodayTabLogic(
    {
      wakeUpTime: settings.wake_up_time,
      cooldownTime: settings.cooldown_time,
      sleepTime: settings.sleep_time,
    },
    {
      morningTasksComplete,
      cooldownTasksComplete,
    }
  );

  const [activeTab, setActiveTab] = useState<TodayTab>(defaultTab);

  // Update active tab when default tab changes (e.g., time passes or tasks completed)
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const tabs: Array<{ id: TodayTab; label: string; description: string }> = [
    { id: 'morning', label: 'Morning', description: 'Warmup repeating tasks' },
    { id: 'today', label: 'Today', description: 'Flagged tasks' },
    { id: 'cooldown', label: 'Cooldown', description: 'Evening repeating tasks' },
    { id: 'fun', label: 'Fun', description: 'Fun + flagged tasks' },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Time Progress */}
      <TimeProgress
        wakeUpTime={settings.wake_up_time}
        cooldownTime={settings.cooldown_time}
        sleepTime={settings.sleep_time}
        totalTaskDurationMinutes={totalTaskDurationMinutes}
        incompleteTasks={incompleteTasks}
      />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="today view tabs"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              value={tab.id}
              icon={activeTab === tab.id ? '●' : undefined}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Content Area */}
      <Box sx={{ minHeight: '400px' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {activeTab === 'morning' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Morning Warmup
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Start your day with these warmup tasks
                </Typography>
                <TaskList
                  tasks={morningTasks}
                  onTaskSelect={onTaskSelect}
                  onToggleComplete={onToggleComplete}
                  onToggleFlag={onToggleFlag}
                  selectedTaskId={selectedTaskId}
                  completedToday={completedToday}
                  emptyMessage="No morning warmup tasks yet"
                />
              </Box>
            )}

            {activeTab === 'today' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Today's Flagged Tasks
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Tasks marked for today
                </Typography>
                <TaskList
                  tasks={todayTasks}
                  onTaskSelect={onTaskSelect}
                  onToggleComplete={onToggleComplete}
                  onToggleFlag={onToggleFlag}
                  selectedTaskId={selectedTaskId}
                  completedToday={completedToday}
                  emptyMessage="No tasks flagged for today"
                />
              </Box>
            )}

            {activeTab === 'cooldown' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Evening Cooldown
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Wind down with your evening routine
                </Typography>
                <TaskList
                  tasks={cooldownTasks}
                  onTaskSelect={onTaskSelect}
                  onToggleComplete={onToggleComplete}
                  onToggleFlag={onToggleFlag}
                  selectedTaskId={selectedTaskId}
                  completedToday={completedToday}
                  emptyMessage="No cooldown tasks yet"
                />
              </Box>
            )}

            {activeTab === 'fun' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Fun Time
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Relax and enjoy your leisure activities
                </Typography>
                <TaskList
                  tasks={funTasks}
                  onTaskSelect={onTaskSelect}
                  onToggleComplete={onToggleComplete}
                  onToggleFlag={onToggleFlag}
                  selectedTaskId={selectedTaskId}
                  completedToday={completedToday}
                  emptyMessage="No fun tasks for today"
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

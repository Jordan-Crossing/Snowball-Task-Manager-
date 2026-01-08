/**
 * Today view with smart tab logic
 * Shows Morning, Today, Cooldown, and Fun tabs with intelligent default selection
 */

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
// import { TimeProgress } from './TimeProgress';
import { TaskList } from '../Tasks/TaskList';
import { useTodayTabLogic, type TodayTab } from '../../hooks';
import type { Task, Tag } from '../../db/types';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightlightIcon from '@mui/icons-material/Nightlight';
import TodayIcon from '@mui/icons-material/Today';

interface TodayViewProps {
  settings?: {
    wake_up_time?: string;
    cooldown_time?: string;
    sleep_time?: string;
  };
  morningTasks?: Task[];
  todayTasks?: Task[];
  cooldownTasks?: Task[];
  tags?: Tag[];
  taskTags?: Map<number, number[]>;
  morningTasksComplete?: boolean;
  cooldownTasksComplete?: boolean;
  totalTaskDurationMinutes?: number;
  incompleteTasks?: number;
  loading?: boolean;
  selectedTaskId?: number | null;
  completedToday?: Set<number>;
}

const TAB_GRADIENTS = {
  morning: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)',
  today: 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
  cooldown: 'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
};

const BG_GRADIENTS = {
  morning: 'linear-gradient(180deg, rgba(255, 154, 158, 0.15) 0%, rgba(254, 207, 239, 0.05) 100%)',
  today: 'linear-gradient(180deg, rgba(161, 196, 253, 0.15) 0%, rgba(194, 233, 251, 0.05) 100%)',
  cooldown: 'linear-gradient(180deg, rgba(48, 207, 208, 0.15) 0%, rgba(51, 8, 103, 0.05) 100%)',
};

export const TodayView: React.FC<TodayViewProps> = ({
  settings = {},
  morningTasks = [],
  todayTasks = [],
  cooldownTasks = [],
  tags = [],
  taskTags = new Map(),
  morningTasksComplete = false,
  cooldownTasksComplete = false,
  // totalTaskDurationMinutes = 0,
  // incompleteTasks = 0,
  loading = false,
  selectedTaskId,
  completedToday = new Set(),
}) => {
  const theme = useTheme();
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
  // const [prevTab, setPrevTab] = useState<TodayTab>(defaultTab);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  // const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

  // Update active tab when default tab changes (e.g., time passes or tasks completed)
  useEffect(() => {
    if (defaultTab !== activeTab) {
      // setPrevTab(activeTab);
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Expose active tab to parent via custom event for header color change
  useEffect(() => {
    const event = new CustomEvent('snowball-tab-change', { detail: { tab: activeTab } });
    window.dispatchEvent(event);
  }, [activeTab]);

  const handleTabChange = (newTab: TodayTab) => {
    // const tabsOrder: TodayTab[] = ['morning', 'today', 'cooldown'];
    // const currentIndex = tabsOrder.indexOf(activeTab);
    // const newIndex = tabsOrder.indexOf(newTab);
    // setSlideDirection(newIndex > currentIndex ? 'left' : 'right');
    // setPrevTab(activeTab);
    setActiveTab(newTab);
  };

  const tabs: Array<{ id: TodayTab; label: string; icon: React.ReactNode }> = [
    { id: 'morning', label: 'Morning', icon: <WbSunnyIcon fontSize="small" /> },
    { id: 'today', label: 'Today', icon: <TodayIcon fontSize="small" /> },
    { id: 'cooldown', label: 'Cooldown', icon: <NightlightIcon fontSize="small" /> },
  ];

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.findIndex(t => t.id === activeTab);
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        handleTabChange(tabs[currentIndex + 1].id);
      }
      if (isRightSwipe && currentIndex > 0) {
        handleTabChange(tabs[currentIndex - 1].id);
      }
    }
  };

  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: BG_GRADIENTS[activeTab],
        transition: 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Background Gradient Orbs */}
      <Box
        sx={{
          position: 'absolute',
          top: -150,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: TAB_GRADIENTS[activeTab],
          opacity: 0.1,
          filter: 'blur(80px)',
          zIndex: 0,
          transition: 'background 0.8s ease',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: TAB_GRADIENTS[activeTab],
          opacity: 0.08,
          filter: 'blur(60px)',
          zIndex: 0,
          transition: 'background 0.8s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Time Progress - Removed as per request */}
      {/* <Box sx={{ p: 2, pb: 0, zIndex: 1 }}>
        <TimeProgress
          wakeUpTime={settings.wake_up_time}
          cooldownTime={settings.cooldown_time}
          sleepTime={settings.sleep_time}
          totalTaskDurationMinutes={totalTaskDurationMinutes}
          incompleteTasks={incompleteTasks}
        />
      </Box> */}

      {/* Content Area with Swipe */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'hidden', // Hide overflow for slide animation
          p: 2, 
          pb: 10, // Space for floating tabs
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box 
            key={activeTab}
            sx={{ 
              flex: 1,
              height: '100%',
              overflow: 'auto',
              // Animation removed as per request
            }}
          >
            {activeTab === 'morning' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: '800', letterSpacing: '-0.5px', background: TAB_GRADIENTS.morning, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', width: 'fit-content' }}>
                  Morning
                </Typography>
                <TaskList
                  tasks={morningTasks}
                  tags={tags}
                  taskTags={taskTags}
                  selectedTaskId={selectedTaskId}
                  completedToday={completedToday}
                  emptyMessage="No morning tasks yet"
                  hideControls
                  separateCompleted
                />
              </Box>
            )}

            {activeTab === 'today' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: '800', letterSpacing: '-0.5px', background: TAB_GRADIENTS.today, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', width: 'fit-content' }}>
                  Today's Focus
                </Typography>
                <TaskList
                  tasks={todayTasks}
                  tags={tags}
                  taskTags={taskTags}
                  selectedTaskId={selectedTaskId}
                  completedToday={completedToday}
                  emptyMessage="No tasks flagged for today"
                  hideControls
                  separateCompleted
                  sortStrategy="quadrant-maslow"
                />
              </Box>
            )}

            {activeTab === 'cooldown' && (
              <Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: '800', letterSpacing: '-0.5px', background: TAB_GRADIENTS.cooldown, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', width: 'fit-content' }}>
                  Evening Cooldown
                </Typography>
                <TaskList
                  tasks={cooldownTasks}
                  tags={tags}
                  taskTags={taskTags}
                  selectedTaskId={selectedTaskId}
                  completedToday={completedToday}
                  emptyMessage="No cooldown tasks yet"
                  hideControls
                  separateCompleted
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Floating Tab Bar */}
      <Box 
        sx={{ 
          position: 'absolute', 
          bottom: 24, 
          left: '50%', 
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: 'auto',
          maxWidth: '90%',
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            p: 0.75,
            display: 'flex',
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(20px)',
            background: theme.palette.mode === 'dark' ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
            position: 'relative',
          }}
        >
          {/* Animated Active Indicator */}
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              bottom: 6,
              left: 6,
              borderRadius: 50,
              background: TAB_GRADIENTS[activeTab],
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: `calc((100% - 12px) / 3)`,
              transform: `translateX(${tabs.findIndex(t => t.id === activeTab) * 100}%)`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 0,
            }}
          />

          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Box
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 50,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  transition: 'color 0.2s ease',
                  color: isActive ? (tab.id === 'morning' ? '#5d4037' : '#fff') : 'text.secondary',
                  fontWeight: isActive ? 600 : 500,
                  zIndex: 1,
                  flex: 1,
                  minWidth: 100,
                  userSelect: 'none',
                  '&:hover': {
                    color: !isActive ? 'text.primary' : undefined,
                  },
                }}
              >
                <Box sx={{ transition: 'transform 0.2s', transform: isActive ? 'scale(1.1)' : 'scale(1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tab.icon}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 'inherit', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

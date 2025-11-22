/**
 * Hook for Today view smart tab selection logic
 * Automatically determines which tab should be shown based on time and task completion
 */

import { useMemo, useState, useEffect } from 'react';

export type TodayTab = 'morning' | 'today' | 'cooldown';

interface TimeConfig {
  wakeUpTime?: string; // HH:MM format
  cooldownTime?: string; // HH:MM format
  sleepTime?: string; // HH:MM format
}

interface TaskCompletion {
  morningTasksComplete: boolean;
  cooldownTasksComplete: boolean;
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getTimeUntil(targetMinutes: number): { hours: number; minutes: number } {
  const current = getCurrentMinutes();
  let diff = targetMinutes - current;
  if (diff < 0) {
    diff += 24 * 60;
  }
  return {
    hours: Math.floor(diff / 60),
    minutes: diff % 60,
  };
}

export function useTodayTabLogic(
  timeConfig: TimeConfig,
  taskCompletion: TaskCompletion
): { defaultTab: TodayTab; timeUntilCooldown: { hours: number; minutes: number } } {
  // Update current time every minute to trigger tab recalculation
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const defaultTab = useMemo<TodayTab>(() => {
    const cooldownTime = timeConfig.cooldownTime || '17:00';

    const cooldownMinutes = parseTime(cooldownTime);
    const currentMinutes = getCurrentMinutes();

    // 1. If morning tasks not complete → show Morning tab
    if (!taskCompletion.morningTasksComplete) {
      return 'morning';
    }

    // 2. If past cooldown time AND cooldown not complete → show Cooldown tab
    if (currentMinutes >= cooldownMinutes && !taskCompletion.cooldownTasksComplete) {
      return 'cooldown';
    }

    // 3. Otherwise → show Today tab
    return 'today';
  }, [timeConfig, taskCompletion, currentTime]);

  const timeUntilCooldown = useMemo(() => {
    const cooldownTime = timeConfig.cooldownTime || '18:00';
    const cooldownMinutes = parseTime(cooldownTime);
    return getTimeUntil(cooldownMinutes);
  }, [timeConfig.cooldownTime, currentTime]);

  return { defaultTab, timeUntilCooldown };
}

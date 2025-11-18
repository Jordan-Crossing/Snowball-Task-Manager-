/**
 * Duration parsing and formatting utilities
 * Supports format: 1w3d2h32m (weeks, days, hours, minutes)
 */

/**
 * Parse duration string to total minutes
 * Examples: "1w" = 10080min, "2d" = 2880min, "1h30m" = 90min, "1w3d2h32m" = 15152min
 */
export function parseDuration(input: string): number {
  if (!input || input.trim() === '') return 0;

  const str = input.toLowerCase().trim();
  let totalMinutes = 0;

  // Match patterns: 1w, 2d, 3h, 4m
  const weekMatch = str.match(/(\d+)w/);
  const dayMatch = str.match(/(\d+)d/);
  const hourMatch = str.match(/(\d+)h/);
  const minMatch = str.match(/(\d+)m/);

  if (weekMatch) {
    totalMinutes += parseInt(weekMatch[1]) * 7 * 24 * 60; // weeks to minutes
  }
  if (dayMatch) {
    totalMinutes += parseInt(dayMatch[1]) * 24 * 60; // days to minutes
  }
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60; // hours to minutes
  }
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1]); // minutes
  }

  return totalMinutes;
}

/**
 * Format minutes to human-readable duration
 * @param minutes Total minutes
 * @param format 'short' (2d 4h) or 'long' (2 days 4 hours)
 */
export function formatDuration(minutes: number, format: 'short' | 'long' = 'short'): string {
  if (minutes === 0) return format === 'short' ? '0m' : '0 minutes';

  const weeks = Math.floor(minutes / (7 * 24 * 60));
  const days = Math.floor((minutes % (7 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];

  if (weeks > 0) {
    parts.push(format === 'short' ? `${weeks}w` : `${weeks} week${weeks > 1 ? 's' : ''}`);
  }
  if (days > 0) {
    parts.push(format === 'short' ? `${days}d` : `${days} day${days > 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(format === 'short' ? `${hours}h` : `${hours} hour${hours > 1 ? 's' : ''}`);
  }
  if (mins > 0) {
    parts.push(format === 'short' ? `${mins}m` : `${mins} minute${mins > 1 ? 's' : ''}`);
  }

  return parts.join(' ');
}

/**
 * Format minutes as work days estimate (8 hour workday)
 * Examples: 480min = "1 day", 720min = "1.5 days", 2880min = "6 days"
 */
export function formatAsWorkDays(minutes: number): string {
  if (minutes === 0) return '0 days';

  const workDayMinutes = 8 * 60; // 8 hour workday
  const days = minutes / workDayMinutes;

  if (days < 1) {
    // Less than a day, show in hours
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours}h`;
  } else if (days % 1 === 0) {
    // Whole number of days
    return `${days} day${days > 1 ? 's' : ''}`;
  } else {
    // Fractional days
    const wholeDays = Math.floor(days);
    const remainingHours = Math.round(((days % 1) * 8) * 10) / 10;

    if (remainingHours === 0) {
      return `${wholeDays} day${wholeDays > 1 ? 's' : ''}`;
    } else {
      return `${wholeDays}d ${remainingHours}h`;
    }
  }
}

/**
 * Validate duration string format
 */
export function isValidDuration(input: string): boolean {
  if (!input || input.trim() === '') return true; // Empty is valid (means 0)

  const str = input.toLowerCase().trim();
  // Must match pattern: optional number+w, optional number+d, optional number+h, optional number+m
  const pattern = /^(\d+w)?(\d+d)?(\d+h)?(\d+m)?$/;
  return pattern.test(str) && str.length > 0;
}

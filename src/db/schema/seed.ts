/**
 * Seed Data
 * Initial data inserted after schema creation
 *
 * NOTE: System lists (Warmup, Cooldown, Inbox) are NOT seeded here.
 * They are created in the platform-specific initialization code with
 * proper type-based duplicate checking. See capacitor.ts for the logic.
 */

export const seedData: string[] = [
  // Default settings row
  `INSERT OR IGNORE INTO settings (id, wake_up_time, cooldown_time, sleep_time)
   VALUES (1, '06:00', '18:00', '22:00')`,
];

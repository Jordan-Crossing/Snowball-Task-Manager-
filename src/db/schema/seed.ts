/**
 * Seed Data
 * Initial data inserted after schema creation
 */

export const seedData: string[] = [
  // Default settings row
  `INSERT OR IGNORE INTO settings (id, wake_up_time, cooldown_time, sleep_time)
   VALUES (1, '06:00', '18:00', '22:00')`,

  // Default lists
  `INSERT OR IGNORE INTO lists (name, type, is_repeating, sort_order)
   VALUES ('Warmup', 'warmup', 1, 1)`,

  `INSERT OR IGNORE INTO lists (name, type, is_repeating, sort_order)
   VALUES ('Cooldown', 'cooldown', 1, 2)`,

  `INSERT OR IGNORE INTO lists (name, type, is_repeating, sort_order)
   VALUES ('Inbox', 'inbox', 0, 3)`,
];

/**
 * Hook for fetching and updating app settings
 */

import { useState, useEffect, useCallback } from 'react';
import { getDatabase, type Settings } from '../db';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const db = await getDatabase();
      const result = await db.get<Settings>('SELECT * FROM settings WHERE id = 1');
      setSettings(result || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      try {
        const db = await getDatabase();

        const updateFields = Object.entries(updates)
          .filter(([_, value]) => value !== undefined)
          .map(([key]) => `${key} = ?`)
          .join(', ');

        const values = Object.entries(updates)
          .filter(([_, value]) => value !== undefined)
          .map(([_, value]) => value);

        if (updateFields) {
          await db.run(`UPDATE settings SET ${updateFields} WHERE id = 1`, values);
          await fetchSettings();
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [fetchSettings]
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, error, refetch: fetchSettings, updateSettings };
}

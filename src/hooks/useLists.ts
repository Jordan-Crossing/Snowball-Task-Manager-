/**
 * Hook for fetching lists
 */

import { useState, useEffect, useCallback } from 'react';
import { getDatabase, type List } from '../db';

export function useLists() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const db = await getDatabase();
      const result = await db.all<List>('SELECT * FROM lists ORDER BY sort_order');
      setLists(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  return { lists, loading, error, refetch: fetchLists };
}

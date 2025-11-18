/**
 * Hook for fetching projects
 */

import { useState, useEffect, useCallback } from 'react';
import { getDatabase, type Project } from '../db';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const db = await getDatabase();
      const result = await db.all<Project>(
        'SELECT * FROM projects WHERE archived = 0 ORDER BY name'
      );
      setProjects(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}

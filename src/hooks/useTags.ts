/**
 * Hook to get all tags with usage counts
 */

import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Tag } from '../db/types';

interface TagWithCount extends Tag {
  usageCount: number;
}

export function useTags(): TagWithCount[] {
  const tags = useStore((state) => state.tags);
  const taskTags = useStore((state) => state.taskTags);

  return useMemo(() => {
    return tags.map(tag => {
      // Count how many tasks use this tag
      let usageCount = 0;
      taskTags.forEach((tagIds) => {
        if (tagIds.includes(tag.id)) {
          usageCount++;
        }
      });

      return {
        ...tag,
        usageCount,
      };
    });
  }, [tags, taskTags]);
}

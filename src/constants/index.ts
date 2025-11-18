/**
 * Application constants for Maslow's Hierarchy and Eisenhower Matrix
 */

// Eisenhower Matrix Quadrants
export const QUADRANTS = {
  Q1: { label: 'Q1: Urgent & Important', value: 'Q1', color: '#f44336', description: 'Do First - Critical and time-sensitive' },
  Q2: { label: 'Q2: Not Urgent & Important', value: 'Q2', color: '#2196f3', description: 'Schedule - Important but not immediate' },
  Q3: { label: 'Q3: Urgent & Not Important', value: 'Q3', color: '#ff9800', description: 'Delegate - Time-sensitive but low value' },
  Q4: { label: 'Q4: Not Urgent & Not Important', value: 'Q4', color: '#9e9e9e', description: 'Eliminate - Low priority' },
} as const;

export type QuadrantKey = keyof typeof QUADRANTS;

// Maslow's Hierarchy of Needs
export const MASLOW_CATEGORIES = {
  physiological: {
    label: 'Physiological',
    value: 'Physiological',
    emoji: '🍎',
    color: '#d32f2f',
    description: 'Basic survival needs',
    subcategories: [
      { label: 'Food & Water', value: 'Food & Water' },
      { label: 'Sleep & Rest', value: 'Sleep & Rest' },
      { label: 'Health & Exercise', value: 'Health & Exercise' },
      { label: 'Shelter & Comfort', value: 'Shelter & Comfort' },
    ],
  },
  safety: {
    label: 'Safety',
    value: 'Safety',
    emoji: '🛡️',
    color: '#f57c00',
    description: 'Security and stability',
    subcategories: [
      { label: 'Financial Security', value: 'Financial Security' },
      { label: 'Physical Safety', value: 'Physical Safety' },
      { label: 'Health & Wellness', value: 'Health & Wellness' },
      { label: 'Job Security', value: 'Job Security' },
    ],
  },
  love: {
    label: 'Love & Belonging',
    value: 'Love & Belonging',
    emoji: '❤️',
    color: '#fbc02d',
    description: 'Social connections',
    subcategories: [
      { label: 'Family', value: 'Family' },
      { label: 'Friendship', value: 'Friendship' },
      { label: 'Romantic Relationship', value: 'Romantic Relationship' },
      { label: 'Community', value: 'Community' },
    ],
  },
  esteem: {
    label: 'Esteem',
    value: 'Esteem',
    emoji: '⭐',
    color: '#388e3c',
    description: 'Achievement and recognition',
    subcategories: [
      { label: 'Self-Confidence', value: 'Self-Confidence' },
      { label: 'Achievement', value: 'Achievement' },
      { label: 'Respect from Others', value: 'Respect from Others' },
      { label: 'Recognition', value: 'Recognition' },
    ],
  },
  selfActualization: {
    label: 'Self-Actualization',
    value: 'Self-Actualization',
    emoji: '🎯',
    color: '#1976d2',
    description: 'Personal growth and fulfillment',
    subcategories: [
      { label: 'Creativity', value: 'Creativity' },
      { label: 'Problem-Solving', value: 'Problem-Solving' },
      { label: 'Personal Growth', value: 'Personal Growth' },
      { label: 'Purpose & Meaning', value: 'Purpose & Meaning' },
      { label: 'Fun & Leisure', value: 'Fun & Leisure' },
    ],
  },
} as const;

export type MaslowCategoryKey = keyof typeof MASLOW_CATEGORIES;

// Helper to get all Maslow category values
export const getMaslowCategories = () =>
  Object.values(MASLOW_CATEGORIES).map(cat => ({
    label: cat.label,
    value: cat.value,
    emoji: cat.emoji,
    color: cat.color,
  }));

// Helper to get subcategories for a specific category
export const getMaslowSubcategories = (category: string) => {
  const cat = Object.values(MASLOW_CATEGORIES).find(c => c.value === category);
  return cat?.subcategories || [];
};

// Helper to get all quadrants as array
export const getQuadrants = () =>
  Object.values(QUADRANTS).map(q => ({
    label: q.label,
    value: q.value,
    color: q.color,
    description: q.description,
  }));

// Helper to get color for quadrant
export const getQuadrantColor = (quadrant?: string | null) => {
  if (!quadrant) return undefined;
  const q = Object.values(QUADRANTS).find(quad => quad.value === quadrant);
  return q?.color;
};

// Helper to get color for Maslow category
export const getMaslowColor = (category?: string | null) => {
  if (!category) return undefined;
  const cat = Object.values(MASLOW_CATEGORIES).find(c => c.value === category);
  return cat?.color;
};

// Helper to get emoji for Maslow category
export const getMaslowEmoji = (category?: string | null) => {
  if (!category) return undefined;
  const cat = Object.values(MASLOW_CATEGORIES).find(c => c.value === category);
  return cat?.emoji;
};

/**
 * Hook for View Transitions API integration
 * Provides smooth animations between view changes with fallback for unsupported browsers
 */

export function useViewTransition() {
  const transitionView = (updateDOM: () => void) => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(updateDOM);
    } else {
      // Fallback for browsers without View Transitions API
      updateDOM();
    }
  };

  return { transitionView };
}

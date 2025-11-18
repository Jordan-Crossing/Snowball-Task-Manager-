/**
 * Hook for responsive breakpoint detection
 * Detects screen size and provides breakpoint information
 */

import { useState, useEffect } from 'react';

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [width, setWidth] = useState<number | undefined>();

  useEffect(() => {
    const updateBreakpoint = () => {
      const w = window.innerWidth;
      setWidth(w);

      if (w < BREAKPOINTS.mobile) {
        setBreakpoint('mobile');
      } else if (w < BREAKPOINTS.tablet) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    width,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  };
}

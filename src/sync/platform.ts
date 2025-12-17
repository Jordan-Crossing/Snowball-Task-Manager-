/**
 * Platform detection utilities for sync functionality
 * Provides consistent platform detection across the sync module
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if running in Electron (desktop app)
 */
export function isElectron(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).electronAPI !== 'undefined'
  );
}

/**
 * Check if running in Capacitor (mobile app)
 */
export function isCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Check if running in a web browser (not Electron or Capacitor)
 */
export function isWeb(): boolean {
  return !isElectron() && !isCapacitor();
}

/**
 * Get the current platform type
 */
export function getPlatformType(): 'electron' | 'capacitor' | 'web' {
  if (isElectron()) return 'electron';
  if (isCapacitor()) return 'capacitor';
  return 'web';
}

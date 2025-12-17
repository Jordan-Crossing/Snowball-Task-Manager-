/**
 * React hook for using the sync client
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSyncClient, SyncClient } from './client';
import type { SyncClientState, ElectronSyncServerStatus, Resolution, SyncMessage, ChangeRecord, ServerLogEntry, ServerLogLevel, PairedDevice } from './types';
import { LOCAL_CLIENT_DEVICE_ID } from './types';
import type { Database } from '../db/types';
import { useStore } from '../store/useStore';
import { isElectron as checkIsElectron } from './platform';

// Max number of logs to keep
const MAX_LOGS = 200;

interface UseSyncClientResult {
  // Client state
  state: SyncClientState;
  client: SyncClient;

  // Connection actions
  connect: (serverUrl: string, pin?: string, token?: string) => void;
  disconnect: () => void;

  // Sync actions
  requestSync: () => Promise<void>;
  confirmSync: () => Promise<void>;
  cancelSync: () => void;
  resolveConflicts: (resolutions: Resolution[]) => void;
  resetSyncState: () => void;

  // Electron server status (only on desktop)
  electronServerStatus: ElectronSyncServerStatus | null;
  startElectronServer: () => Promise<void>;
  stopElectronServer: () => Promise<void>;
  refreshElectronServerStatus: () => Promise<void>;

  // PIN and pairing management (Electron only)
  regeneratePin: () => Promise<void>;
  pairedDevices: PairedDevice[];
  refreshPairedDevices: () => Promise<void>;
  unpairDevice: (deviceId: string) => Promise<void>;
  unpairAllDevices: () => Promise<void>;

  // Device info
  deviceId: string;
  deviceName: string;
  setDeviceName: (name: string) => void;

  // Platform detection
  isElectron: boolean;

  // Debug logs
  serverLogs: ServerLogEntry[];
  clearServerLogs: () => void;

  // Desktop local client connection (desktop syncs as a client to its own server)
  desktopClientConnected: boolean;
  connectAsLocalClient: () => Promise<void>;
}

export function useSyncClient(): UseSyncClientResult {
  const client = getSyncClient();
  const db = useStore((state) => state.db);
  const reloadAllData = useStore((state) => state.reloadAllData);
  const updateSettings = useStore((state) => state.updateSettings);
  const settings = useStore((state) => state.settings);

  const [state, setState] = useState<SyncClientState>(client.getState());
  const [electronServerStatus, setElectronServerStatus] = useState<ElectronSyncServerStatus | null>(null);
  const [deviceName, setDeviceNameState] = useState(client.getDeviceName());
  const [serverLogs, setServerLogs] = useState<ServerLogEntry[]>([]);
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [localClientToken, setLocalClientToken] = useState<string | null>(null);
  const [desktopClientConnected, setDesktopClientConnected] = useState(false);

  // Use ref to avoid stale closure in event handlers
  const serverLogsRef = useRef<ServerLogEntry[]>([]);
  const localClientTokenRef = useRef<string | null>(null);

  // Platform detection - use shared utility for consistency
  const isElectron = checkIsElectron();

  // Helper to add a log entry
  const addLog = useCallback((level: ServerLogLevel, source: 'main' | 'server' | 'ipc' | 'client', message: string, data?: unknown) => {
    const entry: ServerLogEntry = {
      timestamp: new Date(),
      level,
      source,
      message,
      data,
    };
    serverLogsRef.current = [...serverLogsRef.current.slice(-(MAX_LOGS - 1)), entry];
    setServerLogs(serverLogsRef.current);
  }, []);

  // Clear logs
  const clearServerLogs = useCallback(() => {
    serverLogsRef.current = [];
    setServerLogs([]);
  }, []);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = client.onStateChange((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [client]);

  // Handle messages from server including saving auth token to settings
  useEffect(() => {
    const handleMessage = async (message: SyncMessage) => {
      if (message.type === 'APPLY_CHANGE' && db) {
        const change = (message as { type: 'APPLY_CHANGE'; change: ChangeRecord }).change;
        await applyChangeToDb(db, change);
      }

      // Reload all data from database after sync completes
      if (message.type === 'SYNC_COMPLETE') {
        await reloadAllData();
      }

      // Save auth token to settings when in client mode (not local host client)
      // This enables auto-reconnect on app restart
      if (message.type === 'AUTH_OK' && settings?.sync_mode === 'client') {
        const authMsg = message as { type: 'AUTH_OK'; token?: string; deviceId?: string; deviceName?: string };
        if (authMsg.token) {
          console.log('[useSyncClient] Saving auth token to settings for auto-reconnect');
          await updateSettings({ sync_server_token: authMsg.token });
        }
      }
    };

    const unsubscribe = client.onMessage(handleMessage);
    return unsubscribe;
  }, [client, db, reloadAllData, settings?.sync_mode, updateSettings]);

  // Subscribe to Electron server events
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onSyncServerEvent) return;

    const cleanup = window.electronAPI.onSyncServerEvent((event) => {
      // Handle log events
      if (event.type === 'log') {
        const logData = event.data as { level: ServerLogLevel; source: 'main' | 'server' | 'ipc'; message: string; data?: unknown };
        addLog(logData.level, logData.source, logData.message, logData.data);
        return;
      }

      console.log('[useSyncClient] Electron server event:', event.type, event.data);

      if (event.type === 'status' || event.type === 'started' || event.type === 'stopped') {
        const statusData = event.data as ElectronSyncServerStatus;
        setElectronServerStatus(statusData);

        // Also extract localClientToken from status if present
        if (statusData.localClientToken && !localClientTokenRef.current) {
          console.log('[useSyncClient] Got local client token from status event');
          setLocalClientToken(statusData.localClientToken);
          localClientTokenRef.current = statusData.localClientToken;
        }
      }

      // Handle PIN changes
      if (event.type === 'pin-changed') {
        const pinData = event.data as { pin: string | null; timeRemaining?: number };
        setElectronServerStatus(prev => prev ? {
          ...prev,
          pin: pinData.pin,
          pinTimeRemaining: pinData.timeRemaining || 0,
        } : null);
      }

      // Handle paired devices list
      if (event.type === 'paired-devices') {
        const devicesData = event.data as { devices: PairedDevice[] };
        setPairedDevices(devicesData.devices || []);
      }

      // Handle device unpaired
      if (event.type === 'device-unpaired') {
        const unpairedData = event.data as { deviceId: string };
        setPairedDevices(prev => prev.filter(d => d.deviceId !== unpairedData.deviceId));
      }

      // Handle local client token for desktop sync
      if (event.type === 'local-client-token') {
        const tokenData = event.data as { token: string };
        setLocalClientToken(tokenData.token);
        localClientTokenRef.current = tokenData.token;
        console.log('[useSyncClient] Received local client token for desktop sync');
      }

      // Also add a log entry for non-log events
      if (event.type === 'error') {
        addLog('error', 'server', `Event: ${event.type}`, event.data);
      } else if (event.type === 'exited') {
        addLog('warning', 'main', `Server process exited`, event.data);
      }
    });

    return cleanup;
  }, [isElectron, addLog]);

  // Get initial server status on mount (separate effect to avoid stale reference)
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.syncServerStatus) return;

    // Fetch initial status
    const fetchInitialStatus = async () => {
      try {
        const status = await window.electronAPI!.syncServerStatus();
        console.log('[useSyncClient] Initial server status:', status);
        setElectronServerStatus(status);

        // If server has a local client token, store it
        if (status.localClientToken) {
          setLocalClientToken(status.localClientToken);
          localClientTokenRef.current = status.localClientToken;
        }
      } catch (err) {
        console.error('[useSyncClient] Failed to get initial server status:', err);
      }
    };

    fetchInitialStatus();
  }, [isElectron]);

  // Connect desktop as a local client when server is running and we have a token
  const connectAsLocalClient = useCallback(async () => {
    if (!isElectron || !electronServerStatus?.running || !localClientToken) {
      console.log('[useSyncClient] Cannot connect as local client:', {
        isElectron,
        serverRunning: electronServerStatus?.running,
        hasToken: !!localClientToken,
      });
      return;
    }

    // Already connected as local client
    if (state.connectionState === 'authenticated' && desktopClientConnected) {
      console.log('[useSyncClient] Already connected as local client');
      return;
    }

    // Always use wss:// for secure connection (TLS required)
    const serverUrl = `wss://localhost:${electronServerStatus.port}`;
    console.log('[useSyncClient] Connecting desktop as local client to:', serverUrl);

    // Set the device ID to the special local client ID
    client.setDeviceId(LOCAL_CLIENT_DEVICE_ID);
    client.setAutoReconnect(true);
    client.connect(serverUrl, undefined, localClientToken);
    setDesktopClientConnected(true);
  }, [isElectron, electronServerStatus, localClientToken, state.connectionState, desktopClientConnected, client]);

  // Auto-connect as local client when server starts
  useEffect(() => {
    console.log('[useSyncClient] Auto-connect check:', {
      isElectron,
      serverRunning: electronServerStatus?.running,
      hasToken: !!localClientToken,
      desktopClientConnected,
    });

    if (isElectron && electronServerStatus?.running && localClientToken && !desktopClientConnected) {
      console.log('[useSyncClient] Conditions met, scheduling auto-connect...');
      // Small delay to ensure server is fully ready
      const timer = setTimeout(() => {
        console.log('[useSyncClient] Executing auto-connect now');
        connectAsLocalClient();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isElectron, electronServerStatus?.running, localClientToken, desktopClientConnected, connectAsLocalClient]);

  // Connection actions
  const connect = useCallback((serverUrl: string, pin?: string, token?: string) => {
    client.setAutoReconnect(true);
    client.connect(serverUrl, pin, token);
  }, [client]);

  const disconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  // Sync actions
  const requestSync = useCallback(async () => {
    await client.requestSync();
  }, [client]);

  const confirmSync = useCallback(async () => {
    await client.confirmSync();
  }, [client]);

  const cancelSync = useCallback(() => {
    client.cancelSync();
  }, [client]);

  const resolveConflicts = useCallback((resolutions: Resolution[]) => {
    client.resolveConflicts(resolutions);
  }, [client]);

  const resetSyncState = useCallback(() => {
    client.resetSyncState();
  }, [client]);

  // Electron server actions
  const startElectronServer = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.syncServerStart) return;

    try {
      const status = await window.electronAPI.syncServerStart();
      setElectronServerStatus(status);
    } catch (err) {
      console.error('[useSyncClient] Failed to start Electron server:', err);
    }
  }, [isElectron]);

  const stopElectronServer = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.syncServerStop) return;

    try {
      const status = await window.electronAPI.syncServerStop();
      setElectronServerStatus(status);
    } catch (err) {
      console.error('[useSyncClient] Failed to stop Electron server:', err);
    }
  }, [isElectron]);

  const refreshElectronServerStatus = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.syncServerStatus) return;

    try {
      const status = await window.electronAPI.syncServerStatus();
      setElectronServerStatus(status);
    } catch (err) {
      console.error('[useSyncClient] Failed to get Electron server status:', err);
    }
  }, [isElectron]);

  // PIN regeneration
  const regeneratePin = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.syncServerRegeneratePin) return;

    try {
      await window.electronAPI.syncServerRegeneratePin();
    } catch (err) {
      console.error('[useSyncClient] Failed to regenerate PIN:', err);
    }
  }, [isElectron]);

  // Paired devices management
  const refreshPairedDevices = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.syncServerGetPairedDevices) return;

    try {
      await window.electronAPI.syncServerGetPairedDevices();
    } catch (err) {
      console.error('[useSyncClient] Failed to get paired devices:', err);
    }
  }, [isElectron]);

  const unpairDevice = useCallback(async (deviceId: string) => {
    if (!isElectron || !window.electronAPI?.syncServerUnpairDevice) return;

    try {
      await window.electronAPI.syncServerUnpairDevice(deviceId);
    } catch (err) {
      console.error('[useSyncClient] Failed to unpair device:', err);
    }
  }, [isElectron]);

  const unpairAllDevices = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.syncServerUnpairAll) return;

    try {
      await window.electronAPI.syncServerUnpairAll();
      setPairedDevices([]);
    } catch (err) {
      console.error('[useSyncClient] Failed to unpair all devices:', err);
    }
  }, [isElectron]);

  // Device name
  const setDeviceName = useCallback((name: string) => {
    client.setDeviceName(name);
    setDeviceNameState(name);
  }, [client]);

  return {
    state,
    client,
    connect,
    disconnect,
    requestSync,
    confirmSync,
    cancelSync,
    resolveConflicts,
    resetSyncState,
    electronServerStatus,
    startElectronServer,
    stopElectronServer,
    refreshElectronServerStatus,
    regeneratePin,
    pairedDevices,
    refreshPairedDevices,
    unpairDevice,
    unpairAllDevices,
    deviceId: client.getDeviceId(),
    deviceName,
    setDeviceName,
    isElectron,
    serverLogs,
    clearServerLogs,
    // Desktop local client connection
    desktopClientConnected,
    connectAsLocalClient,
  };
}

/**
 * Apply a single change to the local database
 */
async function applyChangeToDb(db: Database, change: ChangeRecord): Promise<void> {
  const { entityType, entityId, operation, data } = change;

  let tableName: string;
  switch (entityType) {
    case 'task': tableName = 'tasks'; break;
    case 'project': tableName = 'projects'; break;
    case 'list': tableName = 'lists'; break;
    case 'tag': tableName = 'tags'; break;
    case 'settings': tableName = 'settings'; break;
    case 'task_completion': tableName = 'task_completions'; break;
    case 'task_tag': tableName = 'task_tags'; break;
    default: return;
  }

  try {
    if (operation === 'DELETE') {
      // Check if soft delete or hard delete
      if (data.permanent) {
        await db.run(`DELETE FROM ${tableName} WHERE id = ?`, [entityId]);
      } else if (tableName === 'tasks') {
        // Soft delete for tasks
        await db.run(
          `UPDATE tasks SET deleted_at = ? WHERE id = ?`,
          [data.deleted_at || new Date().toISOString(), entityId]
        );
      } else {
        await db.run(`DELETE FROM ${tableName} WHERE id = ?`, [entityId]);
      }
    } else if (operation === 'INSERT') {
      // Check if entity already exists (upsert logic)
      const existing = await db.get(`SELECT id FROM ${tableName} WHERE id = ?`, [entityId]);
      if (existing) {
        // Entity exists, update instead
        await applyUpdate(db, tableName, entityId, data);
      } else {
        await applyInsert(db, tableName, data);
      }
    } else if (operation === 'UPDATE') {
      await applyUpdate(db, tableName, entityId, data);
    }

    console.log(`[useSyncClient] Applied ${operation} to ${tableName}:${entityId}`);
  } catch (err) {
    console.error(`[useSyncClient] Failed to apply change to ${tableName}:${entityId}`, err);
    throw err;
  }
}

async function applyInsert(db: Database, tableName: string, data: Record<string, unknown>): Promise<void> {
  const columns = Object.keys(data);
  if (columns.length === 0) return;

  const values = columns.map(k => {
    const v = data[k];
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });
  const placeholders = columns.map(() => '?').join(', ');

  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  await db.run(sql, values);
}

async function applyUpdate(db: Database, tableName: string, entityId: number, data: Record<string, unknown>): Promise<void> {
  const columns = Object.keys(data).filter(k => k !== 'id');
  if (columns.length === 0) return;

  const setClause = columns.map(k => `${k} = ?`).join(', ');
  const values = columns.map(k => {
    const v = data[k];
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });

  const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
  await db.run(sql, [...values, entityId]);
}

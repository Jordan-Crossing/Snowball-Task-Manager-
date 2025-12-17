/**
 * WebSocket Sync Client
 * Connects to the Snowball sync server from Android/web clients
 */

import type { SyncMessage, SyncClientState, ChangeRecord, Resolution, ConflictRecord } from './types';
import { getChangeTracker } from './change-tracker';

type MessageHandler = (message: SyncMessage) => void;
type StateChangeHandler = (state: SyncClientState) => void;

// Generate a simple device ID (in production, persist this)
function generateDeviceId(): string {
  const stored = localStorage.getItem('snowball-device-id');
  if (stored) return stored;

  const id = 'android-' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('snowball-device-id', id);
  return id;
}

// Get device name
function getDeviceName(): string {
  const stored = localStorage.getItem('snowball-device-name');
  if (stored) return stored;

  // Try to detect device type
  const ua = navigator.userAgent;
  let name = 'Unknown Device';

  if (/Android/i.test(ua)) {
    name = 'Android Device';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    name = 'iOS Device';
  } else if (/Windows/i.test(ua)) {
    name = 'Windows PC';
  } else if (/Mac/i.test(ua)) {
    name = 'Mac';
  } else if (/Linux/i.test(ua)) {
    name = 'Linux Device';
  }

  localStorage.setItem('snowball-device-name', name);
  return name;
}

export class SyncClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();

  private state: SyncClientState = {
    connectionState: 'disconnected',
    serverUrl: null,
    serverDeviceId: null,
    serverDeviceName: null,
    lastError: null,
    lastSyncTime: localStorage.getItem('snowball-last-sync') || null,
    isElectronServer: false,
    syncProgress: 'idle',
    syncPreview: null,
    pendingConflicts: [],
    receivedChanges: [],
  };

  private deviceId: string;
  private deviceName: string;
  private autoReconnect: boolean = true;
  private pendingPin: string | null = null;  // PIN for initial pairing
  private authToken: string | null = null;    // Token for returning connections

  constructor() {
    this.deviceId = generateDeviceId();
    this.deviceName = getDeviceName();
    // Load saved auth token if available
    this.authToken = localStorage.getItem('snowball-auth-token');
  }

  /**
   * Get current client state
   */
  getState(): SyncClientState {
    return { ...this.state };
  }

  /**
   * Get this device's ID
   */
  getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Get this device's name
   */
  getDeviceName(): string {
    return this.deviceName;
  }

  /**
   * Set device name (persisted)
   */
  setDeviceName(name: string): void {
    this.deviceName = name;
    localStorage.setItem('snowball-device-name', name);
  }

  /**
   * Set device ID (for local client connections)
   */
  setDeviceId(id: string): void {
    this.deviceId = id;
  }

  /**
   * Subscribe to messages from server
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    // Immediately call with current state
    handler(this.getState());
    return () => this.stateChangeHandlers.delete(handler);
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<SyncClientState>): void {
    this.state = { ...this.state, ...updates };
    for (const handler of this.stateChangeHandlers) {
      try {
        handler(this.getState());
      } catch (err) {
        console.error('[SyncClient] State handler error:', err);
      }
    }
  }

  /**
   * Connect to sync server
   * @param serverUrl - The WebSocket URL (ws:// or wss://)
   * @param pin - Optional PIN for initial pairing (required for first connection)
   * @param token - Optional token for local client authentication
   */
  connect(serverUrl: string, pin?: string, token?: string): void {
    if (this.ws) {
      console.log('[SyncClient] Already connected, disconnecting first...');
      this.disconnect();
    }

    console.log('[SyncClient] Connecting to:', serverUrl);
    this.pendingPin = pin || null;  // Store PIN for use after AUTH_REQUIRED

    // If a token is provided directly (for local client), use it
    if (token) {
      this.authToken = token;
    }

    this.updateState({
      connectionState: 'connecting',
      serverUrl,
      lastError: null,
    });

    try {
      this.ws = new WebSocket(serverUrl);

      this.ws.onopen = () => {
        console.log('[SyncClient] WebSocket connected');
        this.updateState({ connectionState: 'connected' });

        // Don't send AUTH immediately - wait for AUTH_REQUIRED from server
        // The server will send AUTH_REQUIRED with its device info

        // Start ping interval
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SyncMessage;
          console.log('[SyncClient] Received:', message.type);
          this.handleMessage(message);
        } catch (err) {
          console.error('[SyncClient] Failed to parse message:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[SyncClient] WebSocket closed:', event.code, event.reason);
        this.cleanup();
        this.updateState({
          connectionState: 'disconnected',
          serverDeviceId: null,
          serverDeviceName: null,
        });

        // Auto-reconnect after 5 seconds
        if (this.autoReconnect && this.state.serverUrl) {
          console.log('[SyncClient] Will reconnect in 5 seconds...');
          this.reconnectTimer = window.setTimeout(() => {
            if (this.state.serverUrl) {
              this.connect(this.state.serverUrl);
            }
          }, 5000);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[SyncClient] WebSocket error:', error);
        this.updateState({
          connectionState: 'error',
          lastError: 'Connection failed',
        });
      };

    } catch (err) {
      console.error('[SyncClient] Failed to create WebSocket:', err);
      this.updateState({
        connectionState: 'error',
        lastError: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    console.log('[SyncClient] Disconnecting...');
    this.autoReconnect = false;
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.updateState({
      connectionState: 'disconnected',
      serverDeviceId: null,
      serverDeviceName: null,
    });
  }

  /**
   * Cleanup timers
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Start ping interval for keepalive
   */
  private startPingInterval(): void {
    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING', timestamp: Date.now() });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: SyncMessage): void {
    switch (message.type) {
      case 'AUTH_REQUIRED':
        console.log('[SyncClient] Server requires authentication');
        // Send AUTH message with PIN or token
        if (this.authToken) {
          // Try to authenticate with saved token
          console.log('[SyncClient] Authenticating with saved token');
          this.send({
            type: 'AUTH',
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            token: this.authToken,
          });
        } else if (this.pendingPin) {
          // Authenticate with PIN (first-time pairing)
          console.log('[SyncClient] Authenticating with PIN');
          this.send({
            type: 'AUTH',
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            pin: this.pendingPin,
          });
          this.pendingPin = null;  // Clear after use
        } else {
          // No token or PIN - authentication will fail
          console.error('[SyncClient] No PIN or token available for authentication');
          this.updateState({
            connectionState: 'error',
            lastError: 'No PIN provided for pairing',
          });
        }
        break;

      case 'AUTH_OK':
        console.log('[SyncClient] Authenticated with server:', message.deviceName);
        // Save token if provided (for future connections)
        if (message.token) {
          console.log('[SyncClient] Saving auth token for future connections');
          this.authToken = message.token;
          localStorage.setItem('snowball-auth-token', message.token);
        }
        this.updateState({
          connectionState: 'authenticated',
          serverDeviceId: message.deviceId,
          serverDeviceName: message.deviceName,
        });
        break;

      case 'AUTH_FAILED':
        console.error('[SyncClient] Authentication failed:', message.reason);
        // Clear saved token if it was rejected
        if (this.authToken) {
          console.log('[SyncClient] Clearing invalid auth token');
          this.authToken = null;
          localStorage.removeItem('snowball-auth-token');
        }
        this.updateState({
          connectionState: 'error',
          lastError: `Auth failed: ${message.reason}`,
        });
        this.disconnect();
        break;

      case 'PONG':
        // Keepalive response, just log latency
        const latency = Date.now() - message.timestamp;
        console.log(`[SyncClient] Ping latency: ${latency}ms`);
        break;

      case 'SYNC_COMPLETE':
        console.log('[SyncClient] Sync completed at:', message.newSyncTime);
        localStorage.setItem('snowball-last-sync', message.newSyncTime);
        this.updateState({
          lastSyncTime: message.newSyncTime,
          syncProgress: 'complete',
          syncPreview: null,
          pendingConflicts: [],
          receivedChanges: [],
        });
        break;

      case 'SYNC_PREVIEW':
        console.log('[SyncClient] Sync preview received:', message.summary);
        this.updateState({
          syncProgress: 'preview',
          syncPreview: message.summary,
        });
        break;

      case 'CHANGES':
        console.log('[SyncClient] Received changes:', message.changes.length);
        // Store received changes for later application
        const existingChanges = this.state.receivedChanges || [];
        this.updateState({
          receivedChanges: [...existingChanges, ...message.changes],
        });
        // Acknowledge receipt
        this.send({
          type: 'CHANGES_ACK',
          receivedIds: message.changes.map(c => c.id),
        });
        break;

      case 'CONFLICT':
        console.log('[SyncClient] Conflicts detected:', message.conflicts.length);
        this.updateState({
          syncProgress: 'resolving',
          pendingConflicts: message.conflicts,
        });
        break;

      case 'CHANGES_ACK':
        console.log('[SyncClient] Server acknowledged changes:', message.receivedIds.length);
        // Mark local changes as synced
        this.markChangesAsSynced(message.receivedIds);
        break;
    }

    // Notify all message handlers
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (err) {
        console.error('[SyncClient] Message handler error:', err);
      }
    }
  }

  /**
   * Send message to server
   */
  send(message: SyncMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('[SyncClient] Sent:', message.type);
      return true;
    } else {
      console.warn('[SyncClient] Cannot send - not connected');
      return false;
    }
  }

  /**
   * Request a sync from the server
   */
  async requestSync(): Promise<void> {
    this.updateState({
      syncProgress: 'requesting',
      syncPreview: null,
      pendingConflicts: [],
      receivedChanges: [],
    });

    // Send sync request
    this.send({
      type: 'SYNC_REQUEST',
      lastSyncTime: this.state.lastSyncTime,
    });

    // Send our local changes to the server
    await this.sendLocalChanges();
  }

  /**
   * Send local unsynced changes to the server
   */
  private async sendLocalChanges(): Promise<void> {
    try {
      const changeTracker = getChangeTracker();
      const unsyncedChanges = await changeTracker.getUnsyncedChanges();

      if (unsyncedChanges.length > 0) {
        console.log('[SyncClient] Sending local changes:', unsyncedChanges.length);
        this.send({
          type: 'CHANGES',
          changes: unsyncedChanges,
        });
      } else {
        console.log('[SyncClient] No local changes to send');
      }
    } catch (err) {
      console.error('[SyncClient] Failed to get local changes:', err);
    }
  }

  /**
   * Mark changes as synced in local database
   */
  private async markChangesAsSynced(changeIds: number[]): Promise<void> {
    try {
      const changeTracker = getChangeTracker();
      await changeTracker.markSynced(changeIds);
      console.log('[SyncClient] Marked', changeIds.length, 'changes as synced');
    } catch (err) {
      console.error('[SyncClient] Failed to mark changes as synced:', err);
    }
  }

  /**
   * Confirm sync after preview - applies received changes
   */
  async confirmSync(): Promise<void> {
    this.updateState({ syncProgress: 'syncing' });

    // Apply received changes to local database
    await this.applyReceivedChanges();

    // Tell server to proceed
    this.send({ type: 'SYNC_CONFIRM' });
  }

  /**
   * Apply received changes to the local database
   */
  private async applyReceivedChanges(): Promise<void> {
    const changes = this.state.receivedChanges;
    if (!changes || changes.length === 0) {
      console.log('[SyncClient] No received changes to apply');
      return;
    }

    console.log('[SyncClient] Applying', changes.length, 'received changes');

    try {
      const changeTracker = getChangeTracker();

      // Disable change tracking while applying remote changes
      // to avoid creating sync_log entries for changes we're receiving
      changeTracker.setEnabled(false);

      for (const change of changes) {
        try {
          await this.applySingleChange(change);
        } catch (err) {
          console.error('[SyncClient] Failed to apply change:', change, err);
        }
      }

      // Re-enable change tracking
      changeTracker.setEnabled(true);

      console.log('[SyncClient] Successfully applied received changes');
    } catch (err) {
      console.error('[SyncClient] Error applying changes:', err);
      const changeTracker = getChangeTracker();
      changeTracker.setEnabled(true);
    }
  }

  /**
   * Apply a single change to the local database
   */
  private async applySingleChange(change: ChangeRecord): Promise<void> {
    // This needs access to the database - we'll use the store's db
    // For now, we emit an event that the app can listen to
    // The actual application happens through message handlers
    console.log('[SyncClient] Applying change:', change.entityType, change.entityId, change.operation);

    // Emit to message handlers which have access to the store
    for (const handler of this.messageHandlers) {
      try {
        handler({
          type: 'APPLY_CHANGE',
          change,
        } as unknown as SyncMessage);
      } catch (err) {
        console.error('[SyncClient] Change handler error:', err);
      }
    }
  }

  /**
   * Cancel sync
   */
  cancelSync(): void {
    this.send({ type: 'SYNC_CANCEL' });
    this.updateState({
      syncProgress: 'idle',
      syncPreview: null,
      pendingConflicts: [],
      receivedChanges: [],
    });
  }

  /**
   * Resolve conflicts and continue sync
   */
  resolveConflicts(resolutions: Resolution[]): void {
    console.log('[SyncClient] Sending conflict resolutions:', resolutions.length);
    this.send({
      type: 'CONFLICT_RESOLVED',
      resolutions,
    });
    this.updateState({
      syncProgress: 'syncing',
      pendingConflicts: [],
    });
  }

  /**
   * Get current sync progress
   */
  getSyncProgress(): SyncClientState['syncProgress'] {
    return this.state.syncProgress;
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): ConflictRecord[] {
    return this.state.pendingConflicts;
  }

  /**
   * Get sync preview
   */
  getSyncPreview(): SyncClientState['syncPreview'] {
    return this.state.syncPreview;
  }

  /**
   * Reset sync state (e.g., after error)
   */
  resetSyncState(): void {
    this.updateState({
      syncProgress: 'idle',
      syncPreview: null,
      pendingConflicts: [],
      receivedChanges: [],
    });
  }

  /**
   * Check if connected and authenticated
   */
  isConnected(): boolean {
    return this.state.connectionState === 'authenticated';
  }

  /**
   * Enable/disable auto-reconnect
   */
  setAutoReconnect(enabled: boolean): void {
    this.autoReconnect = enabled;
  }
}

// Singleton instance
let clientInstance: SyncClient | null = null;

export function getSyncClient(): SyncClient {
  if (!clientInstance) {
    clientInstance = new SyncClient();
  }
  return clientInstance;
}

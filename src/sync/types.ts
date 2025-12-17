/**
 * Sync protocol types for client-side use
 */

// Entity types that can be synced
export type EntityType = 'task' | 'project' | 'list' | 'tag' | 'settings' | 'task_completion' | 'task_tag';

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error';

// All possible message types (subset for client)
export type SyncMessage =
  | AuthRequiredMessage
  | AuthMessage
  | AuthOkMessage
  | AuthFailedMessage
  | SyncRequestMessage
  | SyncPreviewMessage
  | SyncConfirmMessage
  | SyncCancelMessage
  | SyncCompleteMessage
  | ChangesMessage
  | ChangesAckMessage
  | ConflictMessage
  | ConflictResolvedMessage
  | ApplyChangeMessage
  | PingMessage
  | PongMessage;

// Authentication messages
export interface AuthRequiredMessage {
  type: 'AUTH_REQUIRED';
  serverDeviceId: string;
  serverDeviceName: string;
  fingerprint?: string;  // TLS certificate fingerprint for verification
}

export interface AuthMessage {
  type: 'AUTH';
  deviceId: string;
  deviceName: string;
  pin?: string;    // For initial pairing
  token?: string;  // For returning paired devices
}

export interface AuthOkMessage {
  type: 'AUTH_OK';
  deviceId: string;
  deviceName: string;
  token?: string;  // Returned on successful PIN auth for future connections
}

export interface AuthFailedMessage {
  type: 'AUTH_FAILED';
  reason: string;
}

// Sync messages
export interface SyncRequestMessage {
  type: 'SYNC_REQUEST';
  lastSyncTime: string | null;
}

export interface SyncSummary {
  toSend: { inserts: number; updates: number; deletes: number };
  toReceive: { inserts: number; updates: number; deletes: number };
  conflicts: number;
  suggestedSource: 'LOCAL' | 'REMOTE';
}

export interface SyncPreviewMessage {
  type: 'SYNC_PREVIEW';
  summary: SyncSummary;
}

export interface SyncConfirmMessage {
  type: 'SYNC_CONFIRM';
}

export interface SyncCancelMessage {
  type: 'SYNC_CANCEL';
}

export interface SyncCompleteMessage {
  type: 'SYNC_COMPLETE';
  newSyncTime: string;
}

// Data transfer
export interface ChangeRecord {
  id: number;
  entityType: EntityType;
  entityId: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface ChangesMessage {
  type: 'CHANGES';
  changes: ChangeRecord[];
}

export interface ChangesAckMessage {
  type: 'CHANGES_ACK';
  receivedIds: number[];
}

// Conflict types
export interface ConflictRecord {
  entityType: EntityType;
  entityId: number;
  localChange: ChangeRecord;
  remoteChange: ChangeRecord;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
}

export interface Resolution {
  entityType: EntityType;
  entityId: number;
  winner: 'LOCAL' | 'REMOTE' | 'MERGED';
  mergedData?: Record<string, unknown>;
}

export interface ConflictMessage {
  type: 'CONFLICT';
  conflicts: ConflictRecord[];
}

export interface ConflictResolvedMessage {
  type: 'CONFLICT_RESOLVED';
  resolutions: Resolution[];
}

// Internal message for applying individual changes
export interface ApplyChangeMessage {
  type: 'APPLY_CHANGE';
  change: ChangeRecord;
}

// Keepalive
export interface PingMessage {
  type: 'PING';
  timestamp: number;
}

export interface PongMessage {
  type: 'PONG';
  timestamp: number;
}

// Sync progress state
export type SyncProgress = 'idle' | 'requesting' | 'preview' | 'syncing' | 'resolving' | 'complete' | 'error';

// Client state
export interface SyncClientState {
  connectionState: ConnectionState;
  serverUrl: string | null;
  serverDeviceId: string | null;
  serverDeviceName: string | null;
  lastError: string | null;
  lastSyncTime: string | null;
  isElectronServer: boolean;
  // Sync progress
  syncProgress: SyncProgress;
  syncPreview: SyncSummary | null;
  pendingConflicts: ConflictRecord[];
  receivedChanges: ChangeRecord[];
}

// Server info from Electron
export interface ElectronSyncServerStatus {
  running: boolean;
  port: number;
  ipAddresses: string[];  // Local IPv4 addresses for mobile devices to connect
  deviceId: string;
  deviceName: string;
  connectedClients: number;
  clients?: Array<{
    deviceName: string;
    deviceId: string;
    authenticated: boolean;
  }>;
  // Security features
  secure?: boolean;           // Whether WSS (TLS) is enabled
  useTls?: boolean;           // Whether TLS is configured (can be disabled for Android compatibility)
  pin?: string | null;        // Current pairing PIN (null if expired)
  pinTimeRemaining?: number;  // Seconds until PIN expires
  fingerprint?: string | null; // TLS certificate fingerprint
  localClientToken?: string | null; // Token for desktop client to authenticate
}

// Special device ID for local desktop client
export const LOCAL_CLIENT_DEVICE_ID = 'local-desktop-client';

// Paired device info
export interface PairedDevice {
  deviceId: string;
  deviceName: string;
  pairedAt: string;
  lastSeen?: string;
}

// Debug log entry for server events
export type ServerLogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface ServerLogEntry {
  timestamp: Date;
  level: ServerLogLevel;
  source: 'main' | 'server' | 'ipc' | 'client';
  message: string;
  data?: unknown;
}

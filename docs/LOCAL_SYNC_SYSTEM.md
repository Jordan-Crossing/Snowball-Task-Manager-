# Local Network Sync System

This document describes how to implement peer-to-peer data synchronization between the Snowball Task Manager Android app and Linux desktop (Electron) app over a local network.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Device Discovery](#device-discovery)
4. [PIN-Based Pairing](#pin-based-pairing)
5. [WebSocket Protocol](#websocket-protocol)
6. [Sync Algorithm](#sync-algorithm)
7. [Conflict Resolution](#conflict-resolution)
8. [Backup & Rollback System](#backup--rollback-system)
9. [Implementation Guide](#implementation-guide)
10. [Security Considerations](#security-considerations)

---

## Overview

### Goals

- Sync task data between Android and Linux desktop over local WiFi
- No cloud server required - direct peer-to-peer communication
- PIN-based authentication for secure pairing
- Automatic sync when devices are on the same network
- Manual conflict resolution with user confirmation
- Automatic backups before each sync for rollback capability

### High-Level Flow

```
┌─────────────────┐         Local Network         ┌─────────────────┐
│                 │◄────────────────────────────► │                 │
│  Linux Desktop  │       WebSocket (WSS)         │  Android Phone  │
│   (Electron)    │                               │   (Capacitor)   │
│                 │◄────────────────────────────► │                 │
└─────────────────┘         mDNS Discovery        └─────────────────┘
        │                                                  │
        ▼                                                  ▼
   ┌─────────┐                                       ┌─────────┐
   │ SQLite  │                                       │ SQLite  │
   │ (local) │                                       │ (local) │
   └─────────┘                                       └─────────┘
```

---

## Architecture

### Components

```
┌────────────────────────────────────────────────────────────────────┐
│                        SYNC SERVICE LAYER                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │   Discovery  │  │   Pairing    │  │    Sync Engine           │ │
│  │   Service    │  │   Manager    │  │                          │ │
│  │              │  │              │  │  ┌────────┐ ┌──────────┐ │ │
│  │  - mDNS      │  │  - PIN gen   │  │  │ Change │ │ Conflict │ │ │
│  │  - Manual IP │  │  - PIN verify│  │  │Tracker │ │ Resolver │ │ │
│  │              │  │  - Key store │  │  └────────┘ └──────────┘ │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                       TRANSPORT LAYER                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    WebSocket Server/Client                    │ │
│  │                                                               │ │
│  │  Desktop: ws (npm package) server on port 8765               │ │
│  │  Android: Native WebSocket client                            │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │   Database   │  │   Backup     │  │    Sync Metadata         │ │
│  │   (SQLite)   │  │   Manager    │  │                          │ │
│  │              │  │              │  │  - device_id             │ │
│  │  - tasks     │  │  - auto save │  │  - last_sync_time        │ │
│  │  - projects  │  │  - restore   │  │  - sync_log table        │ │
│  │  - lists     │  │  - cleanup   │  │  - paired_devices table  │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### New Database Tables

Add these tables to support sync functionality:

```sql
-- Unique identifier for this device
CREATE TABLE IF NOT EXISTS device_info (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  device_id TEXT NOT NULL,           -- UUID generated on first run
  device_name TEXT NOT NULL,         -- User-friendly name (e.g., "John's Laptop")
  created_at TEXT DEFAULT (datetime('now'))
);

-- Devices that have been paired via PIN
CREATE TABLE IF NOT EXISTS paired_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL UNIQUE,    -- Remote device's UUID
  device_name TEXT NOT NULL,         -- Remote device's friendly name
  shared_secret TEXT NOT NULL,       -- Derived from PIN pairing (hashed)
  last_seen TEXT,                    -- Last successful connection
  last_sync TEXT,                    -- Last successful sync completion
  created_at TEXT DEFAULT (datetime('now'))
);

-- Log of all local changes for sync
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,         -- 'task', 'project', 'list', 'tag', 'settings'
  entity_id INTEGER NOT NULL,
  operation TEXT NOT NULL,           -- 'INSERT', 'UPDATE', 'DELETE'
  changed_fields TEXT,               -- JSON array of field names that changed
  old_values TEXT,                   -- JSON of previous values (for conflicts)
  new_values TEXT,                   -- JSON of new values
  timestamp TEXT DEFAULT (datetime('now')),
  synced_to TEXT DEFAULT '[]'        -- JSON array of device_ids that received this change
);

-- Index for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, entity_id);
```

---

## Device Discovery

### Option 1: mDNS (Recommended for Auto-Discovery)

mDNS allows devices to automatically find each other on the local network without knowing IP addresses.

#### Linux (Electron) - Avahi/Bonjour

```typescript
// src/sync/discovery.ts
import { Bonjour } from 'bonjour-service';

const SERVICE_TYPE = 'snowball-sync';
const SERVICE_PORT = 8765;

export class DiscoveryService {
  private bonjour = new Bonjour();
  private browser: any = null;
  private service: any = null;

  // Advertise this device as available for sync
  async advertise(deviceName: string): Promise<void> {
    this.service = this.bonjour.publish({
      name: deviceName,
      type: SERVICE_TYPE,
      port: SERVICE_PORT,
      txt: {
        version: '1',
        deviceId: await this.getDeviceId()
      }
    });
  }

  // Discover other Snowball devices on the network
  discover(onFound: (device: DiscoveredDevice) => void): void {
    this.browser = this.bonjour.find({ type: SERVICE_TYPE }, (service) => {
      onFound({
        name: service.name,
        host: service.host,
        port: service.port,
        deviceId: service.txt?.deviceId
      });
    });
  }

  stop(): void {
    this.browser?.stop();
    this.service?.stop();
  }
}

interface DiscoveredDevice {
  name: string;
  host: string;
  port: number;
  deviceId: string;
}
```

#### Android (Capacitor) - Network Service Discovery

Use the `@anthropic/capacitor-nsd` plugin or implement native NSD:

```typescript
// src/sync/discovery.android.ts
import { registerPlugin } from '@capacitor/core';

interface NsdPlugin {
  startDiscovery(options: { serviceType: string }): Promise<void>;
  stopDiscovery(): Promise<void>;
  registerService(options: {
    serviceName: string;
    serviceType: string;
    port: number;
    txtRecords: Record<string, string>;
  }): Promise<void>;
  addListener(event: 'serviceFound', callback: (service: any) => void): void;
}

const Nsd = registerPlugin<NsdPlugin>('Nsd');

export class AndroidDiscoveryService {
  async discover(): Promise<void> {
    Nsd.addListener('serviceFound', (service) => {
      console.log('Found device:', service.name, service.host);
    });

    await Nsd.startDiscovery({ serviceType: '_snowball-sync._tcp.' });
  }
}
```

### Option 2: Manual IP Entry (Fallback)

For networks where mDNS doesn't work (some corporate networks, VPNs):

```typescript
// UI component for manual connection
interface ManualConnectProps {
  onConnect: (ip: string, port: number) => void;
}

function ManualConnectDialog({ onConnect }: ManualConnectProps) {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8765');

  return (
    <Dialog>
      <TextField
        label="IP Address"
        value={ip}
        onChange={e => setIp(e.target.value)}
        placeholder="192.168.1.100"
      />
      <TextField
        label="Port"
        value={port}
        onChange={e => setPort(e.target.value)}
      />
      <Button onClick={() => onConnect(ip, parseInt(port))}>
        Connect
      </Button>
    </Dialog>
  );
}
```

---

## PIN-Based Pairing

### Pairing Flow

```
┌──────────────┐                              ┌──────────────┐
│   Device A   │                              │   Device B   │
│  (Initiator) │                              │  (Joiner)    │
└──────┬───────┘                              └──────┬───────┘
       │                                              │
       │  1. User selects "Start Pairing"             │
       │  2. Generate 6-digit PIN                     │
       │  3. Display PIN on screen                    │
       │◄─────────────────────────────────────────────│
       │                                              │
       │         4. User enters PIN on Device B       │
       │                                              │
       │  5. Devices exchange public keys             │
       │◄────────────────────────────────────────────►│
       │                                              │
       │  6. Derive shared secret from PIN + keys     │
       │  7. Verify with challenge/response           │
       │◄────────────────────────────────────────────►│
       │                                              │
       │  8. Store pairing in paired_devices table    │
       │  9. Connection established!                  │
       │◄────────────────────────────────────────────►│
       ▼                                              ▼
```

### Implementation

```typescript
// src/sync/pairing.ts
import crypto from 'crypto';

export class PairingManager {
  // Generate a 6-digit PIN for display
  generatePin(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Derive a shared secret from PIN (simplified PAKE-like approach)
  deriveSharedSecret(pin: string, deviceId: string, remoteDeviceId: string): string {
    // Sort device IDs to ensure both sides derive the same secret
    const sortedIds = [deviceId, remoteDeviceId].sort().join(':');

    // Use PBKDF2 to derive a strong key from the PIN
    const salt = Buffer.from(sortedIds);
    const key = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');

    return key.toString('hex');
  }

  // Generate a challenge to verify the shared secret
  generateChallenge(): { challenge: string; expectedResponse: string } {
    const challenge = crypto.randomBytes(32).toString('hex');
    return { challenge, expectedResponse: '' }; // Response computed after
  }

  // Compute response to a challenge using the shared secret
  computeChallengeResponse(challenge: string, sharedSecret: string): string {
    return crypto
      .createHmac('sha256', sharedSecret)
      .update(challenge)
      .digest('hex');
  }

  // Verify the response matches what we expected
  verifyResponse(response: string, expectedResponse: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(response, 'hex'),
      Buffer.from(expectedResponse, 'hex')
    );
  }
}
```

### Pairing Protocol Messages

```typescript
// Pairing message types
type PairingMessage =
  | { type: 'PAIR_REQUEST'; deviceId: string; deviceName: string }
  | { type: 'PAIR_ACCEPT'; deviceId: string; deviceName: string }
  | { type: 'PAIR_CHALLENGE'; challenge: string }
  | { type: 'PAIR_RESPONSE'; response: string }
  | { type: 'PAIR_SUCCESS' }
  | { type: 'PAIR_FAILED'; reason: string };
```

---

## WebSocket Protocol

### Connection Setup

#### Desktop (Electron) - WebSocket Server

```typescript
// electron/sync-server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'https';
import { readFileSync } from 'fs';

const SYNC_PORT = 8765;

export class SyncServer {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocket> = new Map();

  constructor(private onMessage: (deviceId: string, message: SyncMessage) => void) {
    // Create HTTPS server for secure WebSocket (WSS)
    const server = createServer({
      cert: readFileSync('path/to/cert.pem'),
      key: readFileSync('path/to/key.pem')
    });

    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    server.listen(SYNC_PORT, '0.0.0.0', () => {
      console.log(`Sync server listening on port ${SYNC_PORT}`);
    });
  }

  private handleConnection(ws: WebSocket, req: any): void {
    let deviceId: string | null = null;

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as SyncMessage;

      if (message.type === 'AUTH') {
        deviceId = message.deviceId;
        this.connections.set(deviceId, ws);
      }

      if (deviceId) {
        this.onMessage(deviceId, message);
      }
    });

    ws.on('close', () => {
      if (deviceId) {
        this.connections.delete(deviceId);
      }
    });
  }

  send(deviceId: string, message: SyncMessage): void {
    const ws = this.connections.get(deviceId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: SyncMessage): void {
    for (const [, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}
```

#### Android/Universal - WebSocket Client

```typescript
// src/sync/sync-client.ts
export class SyncClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;

  constructor(
    private serverUrl: string,
    private deviceId: string,
    private sharedSecret: string,
    private onMessage: (message: SyncMessage) => void
  ) {}

  connect(): void {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.onopen = () => {
      // Authenticate immediately after connecting
      this.send({
        type: 'AUTH',
        deviceId: this.deviceId,
        token: this.generateAuthToken()
      });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as SyncMessage;
      this.onMessage(message);
    };

    this.ws.onclose = () => {
      // Auto-reconnect after 5 seconds
      this.reconnectTimer = window.setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private generateAuthToken(): string {
    const timestamp = Date.now().toString();
    const hmac = crypto
      .createHmac('sha256', this.sharedSecret)
      .update(timestamp)
      .digest('hex');
    return `${timestamp}:${hmac}`;
  }

  send(message: SyncMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
  }
}
```

### Message Types

```typescript
// src/sync/types.ts
export type SyncMessage =
  // Authentication
  | { type: 'AUTH'; deviceId: string; token: string }
  | { type: 'AUTH_OK' }
  | { type: 'AUTH_FAILED'; reason: string }

  // Sync negotiation
  | { type: 'SYNC_REQUEST'; lastSyncTime: string | null }
  | { type: 'SYNC_START'; direction: 'PUSH' | 'PULL' | 'MERGE' }

  // Data transfer
  | { type: 'CHANGES'; changes: ChangeRecord[] }
  | { type: 'CHANGES_ACK'; receivedIds: number[] }

  // Conflict resolution
  | { type: 'CONFLICT'; conflicts: ConflictRecord[] }
  | { type: 'CONFLICT_RESOLVED'; resolutions: Resolution[] }

  // Confirmation
  | { type: 'SYNC_PREVIEW'; summary: SyncSummary }
  | { type: 'SYNC_CONFIRM' }
  | { type: 'SYNC_CANCEL' }
  | { type: 'SYNC_COMPLETE'; newSyncTime: string };

export interface ChangeRecord {
  id: number;                    // sync_log.id
  entityType: EntityType;
  entityId: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, any>;     // Full entity data for INSERT/UPDATE
  timestamp: string;
}

export interface ConflictRecord {
  entityType: EntityType;
  entityId: number;
  localChange: ChangeRecord;
  remoteChange: ChangeRecord;
  localData: Record<string, any>;
  remoteData: Record<string, any>;
}

export interface Resolution {
  entityType: EntityType;
  entityId: number;
  winner: 'LOCAL' | 'REMOTE' | 'MERGED';
  mergedData?: Record<string, any>;  // For manual merges
}

export interface SyncSummary {
  toSend: { inserts: number; updates: number; deletes: number };
  toReceive: { inserts: number; updates: number; deletes: number };
  conflicts: number;
  suggestedSource: 'LOCAL' | 'REMOTE';  // Based on most recent edit
}

export type EntityType = 'task' | 'project' | 'list' | 'tag' | 'settings' | 'task_completion';
```

---

## Sync Algorithm

### Change Tracking

Modify the Zustand store to log changes:

```typescript
// src/sync/change-tracker.ts
export class ChangeTracker {
  constructor(private db: Database) {}

  async logChange(
    entityType: EntityType,
    entityId: number,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    changedFields?: string[],
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<void> {
    await this.db.run(
      `INSERT INTO sync_log
       (entity_type, entity_id, operation, changed_fields, old_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        operation,
        changedFields ? JSON.stringify(changedFields) : null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null
      ]
    );
  }

  async getChangesSince(lastSyncTime: string | null): Promise<ChangeRecord[]> {
    const sql = lastSyncTime
      ? `SELECT * FROM sync_log WHERE timestamp > ? ORDER BY timestamp`
      : `SELECT * FROM sync_log ORDER BY timestamp`;

    const rows = await this.db.all(sql, lastSyncTime ? [lastSyncTime] : []);

    return rows.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      data: JSON.parse(row.new_values || '{}'),
      timestamp: row.timestamp
    }));
  }

  async markSynced(changeIds: number[], deviceId: string): Promise<void> {
    for (const id of changeIds) {
      const row = await this.db.get('SELECT synced_to FROM sync_log WHERE id = ?', [id]);
      const syncedTo = JSON.parse(row?.synced_to || '[]');

      if (!syncedTo.includes(deviceId)) {
        syncedTo.push(deviceId);
        await this.db.run(
          'UPDATE sync_log SET synced_to = ? WHERE id = ?',
          [JSON.stringify(syncedTo), id]
        );
      }
    }
  }
}
```

### Sync Engine

```typescript
// src/sync/sync-engine.ts
export class SyncEngine {
  constructor(
    private db: Database,
    private changeTracker: ChangeTracker,
    private backupManager: BackupManager
  ) {}

  async performSync(
    remoteChanges: ChangeRecord[],
    localChanges: ChangeRecord[]
  ): Promise<{
    toApply: ChangeRecord[];
    conflicts: ConflictRecord[];
    summary: SyncSummary;
  }> {
    const conflicts: ConflictRecord[] = [];
    const toApply: ChangeRecord[] = [];

    // Build a map of local changes by entity
    const localChangeMap = new Map<string, ChangeRecord>();
    for (const change of localChanges) {
      const key = `${change.entityType}:${change.entityId}`;
      localChangeMap.set(key, change);
    }

    // Process remote changes
    for (const remoteChange of remoteChanges) {
      const key = `${remoteChange.entityType}:${remoteChange.entityId}`;
      const localChange = localChangeMap.get(key);

      if (localChange) {
        // Both sides modified the same entity - CONFLICT
        const localData = await this.getEntityData(
          remoteChange.entityType,
          remoteChange.entityId
        );

        conflicts.push({
          entityType: remoteChange.entityType,
          entityId: remoteChange.entityId,
          localChange,
          remoteChange,
          localData,
          remoteData: remoteChange.data
        });
      } else {
        // No conflict - apply remote change
        toApply.push(remoteChange);
      }
    }

    // Determine suggested source based on most recent edit
    const latestLocal = localChanges.length > 0
      ? Math.max(...localChanges.map(c => new Date(c.timestamp).getTime()))
      : 0;
    const latestRemote = remoteChanges.length > 0
      ? Math.max(...remoteChanges.map(c => new Date(c.timestamp).getTime()))
      : 0;

    const summary: SyncSummary = {
      toSend: this.countOperations(localChanges),
      toReceive: this.countOperations(toApply),
      conflicts: conflicts.length,
      suggestedSource: latestLocal > latestRemote ? 'LOCAL' : 'REMOTE'
    };

    return { toApply, conflicts, summary };
  }

  async applyChanges(changes: ChangeRecord[]): Promise<void> {
    for (const change of changes) {
      switch (change.operation) {
        case 'INSERT':
          await this.insertEntity(change.entityType, change.data);
          break;
        case 'UPDATE':
          await this.updateEntity(change.entityType, change.entityId, change.data);
          break;
        case 'DELETE':
          await this.deleteEntity(change.entityType, change.entityId);
          break;
      }
    }
  }

  private countOperations(changes: ChangeRecord[]): { inserts: number; updates: number; deletes: number } {
    return {
      inserts: changes.filter(c => c.operation === 'INSERT').length,
      updates: changes.filter(c => c.operation === 'UPDATE').length,
      deletes: changes.filter(c => c.operation === 'DELETE').length
    };
  }

  // ... entity CRUD methods
}
```

---

## Conflict Resolution

### Conflict Resolution UI

When conflicts are detected, show a dialog for manual resolution:

```typescript
// src/components/Sync/ConflictResolver.tsx
interface ConflictResolverProps {
  conflicts: ConflictRecord[];
  suggestedSource: 'LOCAL' | 'REMOTE';
  onResolve: (resolutions: Resolution[]) => void;
  onCancel: () => void;
}

function ConflictResolver({ conflicts, suggestedSource, onResolve, onCancel }: ConflictResolverProps) {
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(new Map());

  // Pre-select suggested source for all conflicts
  useEffect(() => {
    const initial = new Map();
    for (const conflict of conflicts) {
      const key = `${conflict.entityType}:${conflict.entityId}`;
      initial.set(key, {
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        winner: suggestedSource
      });
    }
    setResolutions(initial);
  }, [conflicts, suggestedSource]);

  return (
    <Dialog open fullWidth maxWidth="md">
      <DialogTitle>
        Resolve Sync Conflicts ({conflicts.length} conflicts)
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          The {suggestedSource.toLowerCase()} device has more recent changes.
          We suggest using {suggestedSource.toLowerCase()} as the source, but you
          can choose for each item.
        </Alert>

        {conflicts.map((conflict) => (
          <ConflictItem
            key={`${conflict.entityType}:${conflict.entityId}`}
            conflict={conflict}
            resolution={resolutions.get(`${conflict.entityType}:${conflict.entityId}`)}
            onChange={(resolution) => {
              const key = `${conflict.entityType}:${conflict.entityId}`;
              setResolutions(new Map(resolutions.set(key, resolution)));
            }}
          />
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel Sync</Button>
        <Button
          variant="contained"
          onClick={() => onResolve(Array.from(resolutions.values()))}
        >
          Apply Resolutions
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ConflictItem({ conflict, resolution, onChange }: {
  conflict: ConflictRecord;
  resolution?: Resolution;
  onChange: (r: Resolution) => void;
}) {
  const title = conflict.localData.title || conflict.localData.name || `ID: ${conflict.entityId}`;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold">
        {conflict.entityType}: {title}
      </Typography>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={6}>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Typography variant="caption" color="text.secondary">
              LOCAL (This Device)
            </Typography>
            <Typography variant="body2">
              Modified: {new Date(conflict.localChange.timestamp).toLocaleString()}
            </Typography>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>
              {JSON.stringify(conflict.localData, null, 2)}
            </pre>
          </Paper>
        </Grid>

        <Grid item xs={6}>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Typography variant="caption" color="text.secondary">
              REMOTE (Other Device)
            </Typography>
            <Typography variant="body2">
              Modified: {new Date(conflict.remoteChange.timestamp).toLocaleString()}
            </Typography>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>
              {JSON.stringify(conflict.remoteData, null, 2)}
            </pre>
          </Paper>
        </Grid>
      </Grid>

      <RadioGroup
        row
        value={resolution?.winner || 'LOCAL'}
        onChange={(e) => onChange({
          entityType: conflict.entityType,
          entityId: conflict.entityId,
          winner: e.target.value as 'LOCAL' | 'REMOTE'
        })}
      >
        <FormControlLabel value="LOCAL" control={<Radio />} label="Keep Local" />
        <FormControlLabel value="REMOTE" control={<Radio />} label="Use Remote" />
      </RadioGroup>
    </Paper>
  );
}
```

---

## Backup & Rollback System

### Automatic Backups

Create a backup before each sync operation:

```typescript
// src/sync/backup-manager.ts
import { format } from 'date-fns';

export class BackupManager {
  private readonly MAX_BACKUPS = 10;
  private backupDir: string;

  constructor(userDataPath: string) {
    this.backupDir = `${userDataPath}/sync-backups`;
  }

  async createBackup(reason: 'pre-sync' | 'manual'): Promise<string> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `backup_${reason}_${timestamp}.db`;
    const backupPath = `${this.backupDir}/${filename}`;

    // For Electron: Copy the database file
    if (window.electronAPI) {
      await window.electronAPI.copyFile(
        await window.electronAPI.getUserDataPath() + '/todo.db',
        backupPath
      );
    }

    // For Capacitor: Export database to file
    // (implementation depends on capacitor-sqlite capabilities)

    // Cleanup old backups
    await this.cleanupOldBackups();

    return backupPath;
  }

  async listBackups(): Promise<BackupInfo[]> {
    // List all backup files with metadata
    const files = await this.getBackupFiles();

    return files.map(file => ({
      path: file.path,
      timestamp: this.parseTimestamp(file.name),
      reason: file.name.includes('pre-sync') ? 'pre-sync' : 'manual',
      size: file.size
    }));
  }

  async restoreBackup(backupPath: string): Promise<void> {
    // Create a backup of current state first
    await this.createBackup('manual');

    // Restore the selected backup
    if (window.electronAPI) {
      await window.electronAPI.closeDatabase();
      await window.electronAPI.copyFile(
        backupPath,
        await window.electronAPI.getUserDataPath() + '/todo.db'
      );
      await window.electronAPI.reinitializeDatabase();
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();

    // Sort by timestamp descending
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Delete backups beyond MAX_BACKUPS
    for (const backup of backups.slice(this.MAX_BACKUPS)) {
      await this.deleteBackup(backup.path);
    }
  }
}

interface BackupInfo {
  path: string;
  timestamp: Date;
  reason: 'pre-sync' | 'manual';
  size: number;
}
```

### Backup UI in Settings

```typescript
// Add to src/components/Settings/SettingsView.tsx
function BackupSection() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    const manager = new BackupManager(await getUserDataPath());
    setBackups(await manager.listBackups());
  };

  const handleRestore = async (backup: BackupInfo) => {
    if (!confirm(`Restore database from ${backup.timestamp.toLocaleString()}? Current data will be backed up first.`)) {
      return;
    }

    setRestoring(true);
    try {
      const manager = new BackupManager(await getUserDataPath());
      await manager.restoreBackup(backup.path);
      window.location.reload(); // Reload to reinitialize with restored data
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6">Sync Backups</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Automatic backups are created before each sync. You can restore to any previous state.
      </Typography>

      <List>
        {backups.map((backup) => (
          <ListItem
            key={backup.path}
            secondaryAction={
              <Button
                size="small"
                onClick={() => handleRestore(backup)}
                disabled={restoring}
              >
                Restore
              </Button>
            }
          >
            <ListItemText
              primary={backup.timestamp.toLocaleString()}
              secondary={`${backup.reason} - ${formatBytes(backup.size)}`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
```

---

## Implementation Guide

### File Structure

```
src/
├── sync/
│   ├── index.ts              # Main sync service exports
│   ├── types.ts              # TypeScript types for sync
│   ├── discovery.ts          # mDNS device discovery
│   ├── pairing.ts            # PIN-based pairing logic
│   ├── sync-client.ts        # WebSocket client
│   ├── sync-engine.ts        # Core sync algorithm
│   ├── change-tracker.ts     # Database change logging
│   └── backup-manager.ts     # Backup/restore functionality
├── components/
│   └── Sync/
│       ├── SyncStatus.tsx    # Sync status indicator
│       ├── PairingDialog.tsx # PIN pairing UI
│       ├── DeviceList.tsx    # Paired devices management
│       ├── ConflictResolver.tsx  # Conflict resolution UI
│       └── SyncPreview.tsx   # Pre-sync confirmation dialog
electron/
├── main.ts                   # Add IPC handlers for file operations
├── sync-server.ts            # WebSocket server (desktop only)
└── preload.ts                # Expose sync APIs to renderer
```

### Implementation Steps

1. **Add sync database tables** (schema changes)
   - Add `device_info`, `paired_devices`, `sync_log` tables
   - Add migration or schema update

2. **Implement change tracking**
   - Modify Zustand store mutations to log changes
   - Create `ChangeTracker` class

3. **Add discovery service**
   - Implement mDNS discovery for desktop (bonjour-service)
   - Add Capacitor plugin for Android NSD
   - Add fallback manual IP entry UI

4. **Implement pairing**
   - Create `PairingManager` class
   - Build `PairingDialog` component
   - Store paired devices in database

5. **Build WebSocket layer**
   - Create `SyncServer` for Electron main process
   - Create `SyncClient` for renderer/Capacitor
   - Implement authentication handshake

6. **Implement sync engine**
   - Build `SyncEngine` with conflict detection
   - Create `SyncPreview` confirmation dialog
   - Build `ConflictResolver` component

7. **Add backup system**
   - Create `BackupManager` class
   - Add backup UI to Settings
   - Integrate pre-sync backups

8. **Add UI components**
   - Sync status indicator in header/sidebar
   - Device management in Settings
   - Sync history/log view

### Dependencies to Add

```json
{
  "dependencies": {
    "ws": "^8.x",                    // WebSocket server (Electron)
    "bonjour-service": "^1.x",       // mDNS discovery
    "uuid": "^9.x"                   // Device ID generation
  },
  "devDependencies": {
    "@types/ws": "^8.x"
  }
}
```

For Capacitor/Android, you may need a custom plugin or use:
- `@anthropic/capacitor-nsd` (if available) or custom native module

---

## Security Considerations

### Transport Security

1. **Use WSS (WebSocket Secure)** even on local network
   - Generate self-signed certificates on first run
   - Store in user data directory
   - Accept self-signed certs for local connections

2. **Message authentication**
   - All messages include HMAC using shared secret
   - Timestamp included to prevent replay attacks

### PIN Security

1. **PIN entropy**: 6-digit PIN = 1 million combinations
   - Rate limit PIN attempts (3 failures = 5 minute lockout)
   - PIN expires after 2 minutes

2. **Shared secret derivation**
   - Use PBKDF2 with high iteration count
   - Include both device IDs in salt

### Data Protection

1. **No sensitive data in sync log**
   - Don't log actual passwords or tokens
   - Only log entity IDs and operation types

2. **Backup encryption** (optional enhancement)
   - Encrypt backup files with user-provided password
   - Use AES-256-GCM

### Network Isolation

1. **Local network only**
   - Bind WebSocket server to local interfaces only
   - Reject connections from non-local IPs

2. **Firewall recommendations**
   - Document required port (8765)
   - Only accept connections from local subnet

---

## Appendix: Complete Sync Flow

```
┌──────────────────┐                                    ┌──────────────────┐
│     Desktop      │                                    │     Android      │
│    (Server)      │                                    │    (Client)      │
└────────┬─────────┘                                    └────────┬─────────┘
         │                                                       │
         │  ══════════════ DISCOVERY PHASE ══════════════       │
         │                                                       │
         │ 1. Advertise via mDNS                                │
         │◄──────────────────────────────────────────────────────│
         │                                                       │
         │ 2. Discover service                                   │
         │────────────────────────────────────────────────────► │
         │                                                       │
         │  ══════════════ PAIRING PHASE ════════════════       │
         │  (Only for first-time connection)                     │
         │                                                       │
         │ 3. User initiates pairing, displays PIN: 482651       │
         │                                                       │
         │ 4. User enters PIN on Android                         │
         │◄──────────────── PAIR_REQUEST ────────────────────────│
         │                                                       │
         │ 5. Verify PIN, derive shared secret                   │
         │───────────────── PAIR_ACCEPT ────────────────────────►│
         │                                                       │
         │ 6. Challenge/response verification                    │
         │◄──────────────── PAIR_CHALLENGE ──────────────────────│
         │───────────────── PAIR_RESPONSE ──────────────────────►│
         │◄──────────────── PAIR_SUCCESS ────────────────────────│
         │                                                       │
         │  ══════════════ SYNC PHASE ═══════════════════       │
         │  (Automatic when both online)                         │
         │                                                       │
         │ 7. Connect WebSocket                                  │
         │◄──────────────── AUTH ────────────────────────────────│
         │───────────────── AUTH_OK ────────────────────────────►│
         │                                                       │
         │ 8. Request sync                                       │
         │◄──────────────── SYNC_REQUEST ────────────────────────│
         │                                                       │
         │ 9. Exchange changes                                   │
         │───────────────── CHANGES ────────────────────────────►│
         │◄──────────────── CHANGES ─────────────────────────────│
         │                                                       │
         │ 10. Detect conflicts, compute summary                 │
         │───────────────── SYNC_PREVIEW ───────────────────────►│
         │                                                       │
         │ 11. User confirms (or resolves conflicts)             │
         │◄──────────────── SYNC_CONFIRM ────────────────────────│
         │                                                       │
         │ 12. Create backup, apply changes                      │
         │                                                       │
         │ 13. Confirm completion                                │
         │───────────────── SYNC_COMPLETE ──────────────────────►│
         │                                                       │
         ▼                                                       ▼
```

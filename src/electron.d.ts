export interface ElectronAPI {
  getUserDataPath: () => Promise<string>;
  dbExec: (sql: string) => Promise<void>;
  dbRun: (sql: string, params: any[]) => Promise<{ lastID: number; changes: number }>;
  dbGet: (sql: string, params: any[]) => Promise<any>;
  dbAll: (sql: string, params: any[]) => Promise<any[]>;
  dbClose: () => Promise<void>;
  dbReset: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

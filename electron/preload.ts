import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  dbExec: (sql: string) => ipcRenderer.invoke('db-exec', sql),
  dbRun: (sql: string, params: any[]) => ipcRenderer.invoke('db-run', sql, params),
  dbGet: (sql: string, params: any[]) => ipcRenderer.invoke('db-get', sql, params),
  dbAll: (sql: string, params: any[]) => ipcRenderer.invoke('db-all', sql, params),
  dbClose: () => ipcRenderer.invoke('db-close'),
  dbReset: () => ipcRenderer.invoke('db-reset'),
});

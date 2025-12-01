import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import Database from 'better-sqlite3';
import { SCHEMA, INITIAL_DATA } from './schema.js';

// In CommonJS, __dirname is available globally
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

let db: Database.Database | null = null;

function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'todo.db');
  console.log('[Main] Initializing database at:', dbPath);
  
  try {
    db = new Database(dbPath, { verbose: console.log });
    console.log('[Main] Database opened successfully');
    
    // Enable foreign keys
    console.log('[Main] Enabling foreign keys');
    db.pragma('foreign_keys = ON');
    
    // Performance optimizations
    console.log('[Main] Setting pragmas');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    db.pragma('cache_size = -64000');
    db.pragma('mmap_size = 30000000000');

    // Initialize schema
    console.log('[Main] Executing SCHEMA');
    try {
      db.exec(SCHEMA);
      console.log('[Main] SCHEMA executed successfully');
    } catch (e) {
      console.error('[Main] Error executing SCHEMA:', e);
      throw e;
    }

    console.log('[Main] Executing INITIAL_DATA');
    try {
      db.exec(INITIAL_DATA);
      console.log('[Main] INITIAL_DATA executed successfully');
    } catch (e) {
      console.error('[Main] Error executing INITIAL_DATA:', e);
      // Don't throw here, maybe data already exists or unique constraint
    }
    
    console.log('[Main] Database initialization complete');
  } catch (error) {
    console.error('[Main] Failed to initialize database schema:', error);
  }
}

function createWindow() {
  console.log('[Main] Creating window');
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // In development, load from Vite dev server
  // In production, load from built files
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC Handlers
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('db-exec', async (_, sql) => {
  console.log('[Main] db-exec:', sql);
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
});

ipcMain.handle('db-run', async (_, sql, params) => {
  console.log('[Main] db-run:', sql, params);
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  const result = stmt.run(params || []);
  console.log('[Main] db-run result:', result);
  return {
    lastID: Number(result.lastInsertRowid),
    changes: result.changes
  };
});

ipcMain.handle('db-get', async (_, sql, params) => {
  // console.log('[Main] db-get:', sql, params);
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  return stmt.get(params || []);
});

ipcMain.handle('db-all', async (_, sql, params) => {
  // console.log('[Main] db-all:', sql, params);
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  return stmt.all(params || []);
});

ipcMain.handle('db-close', async () => {
  if (db) {
    db.close();
    db = null;
  }
});

ipcMain.handle('db-reset', async () => {
  console.log('[Main] db-reset called');
  try {
    if (db) {
      console.log('[Main] Closing existing database connection');
      db.close();
    }
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'todo.db');
    
    console.log('[Main] Re-opening database at', dbPath);
    db = new Database(dbPath, { verbose: console.log });
    
    // Re-apply pragmas
    console.log('[Main] Re-applying pragmas');
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    db.pragma('cache_size = -64000');
    db.pragma('mmap_size = 30000000000');
    
    // Drop all tables
    const tables = ['tasks', 'projects', 'lists', 'tags', 'task_tags', 'task_completions', 'settings'];
    console.log('[Main] Dropping tables:', tables.join(', '));
    
    // Disable foreign keys temporarily to allow dropping tables in any order
    db.pragma('foreign_keys = OFF');
    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
    db.pragma('foreign_keys = ON');
    
    // Re-initialize schema
    console.log('[Main] Re-initializing schema');
    db.exec(SCHEMA);
    
    console.log('[Main] Re-initializing data');
    db.exec(INITIAL_DATA);
    
    console.log('[Main] Database reset complete');
    return true;
  } catch (error) {
    console.error('[Main] Database reset failed:', error);
    throw error;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

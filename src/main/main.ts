import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { cloneRepository, buildGame } from '../../scripts/clone_build';
import { launchNativeGame, launchHtml5Game } from '../../scripts/launcher';

const isDev = process.env.NODE_ENV === 'development';
const appDataPath = app.getPath('userData');
const defaultInstallPath = path.join(app.getPath('home'), 'OfflineGames');

// Ensure default install path exists
if (!fs.existsSync(defaultInstallPath)) {
  fs.mkdirSync(defaultInstallPath, { recursive: true });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-app-data-path', () => appDataPath);

ipcMain.handle('get-install-path', () => {
  // Try to read from settings, fallback to default
  const settingsPath = path.join(appDataPath, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings.installPath) return settings.installPath;
    } catch (e) {}
  }
  return defaultInstallPath;
});

ipcMain.handle('set-install-path', (event, newPath: string) => {
  const settingsPath = path.join(appDataPath, 'settings.json');
  let settings: any = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {}
  }
  settings.installPath = newPath;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return true;
});

ipcMain.handle('select-directory', async (event) => {
  const window = BrowserWindow.getFocusedWindow();
  if (!window) return null;
  const result = await dialog.showOpenDialog(window, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('read-library', () => {
  // Read the embedded game-db.json
  const dbPath = path.join(__dirname, '../../../game-db.json');
  if (fs.existsSync(dbPath)) {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
  return [];
});

ipcMain.handle('clone-game', async (event, cloneCmd: string, destPath: string) => {
  return await cloneRepository(cloneCmd, destPath, (msg) => {
    event.sender.send('clone-progress', { url: destPath, message: msg });
  });
});

ipcMain.handle('build-game', async (event, gameId: string, buildCmd: string, cwd: string) => {
  return await buildGame(buildCmd, cwd, (msg) => {
    event.sender.send('build-output', { gameId, message: msg });
  });
});

ipcMain.handle('launch-game', (event, type: string, execPath: string, cwd: string) => {
  if (type === 'html5') {
    launchHtml5Game(execPath);
  } else {
    launchNativeGame(execPath, cwd, (msg) => {
      console.log(`[Launch ${path.basename(execPath)}] ${msg}`);
    });
  }
});

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  launchGame: (type: string, execPath: string, cwd: string) => ipcRenderer.invoke('launch-game', type, execPath, cwd),
  cloneGame: (cloneCmd: string, destPath: string) => ipcRenderer.invoke('clone-game', cloneCmd, destPath),
  buildGame: (gameId: string, buildCmd: string, cwd: string) => ipcRenderer.invoke('build-game', gameId, buildCmd, cwd),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  readLibrary: () => ipcRenderer.invoke('read-library'),
  saveLibrary: (data: any) => ipcRenderer.invoke('save-library', data),
  getInstallPath: () => ipcRenderer.invoke('get-install-path'),
  setInstallPath: (p: string) => ipcRenderer.invoke('set-install-path', p),
  onCloneProgress: (cb: (event: any, data: any) => void) => ipcRenderer.on('clone-progress', cb),
  onBuildOutput: (cb: (event: any, data: any) => void) => ipcRenderer.on('build-output', cb),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
});

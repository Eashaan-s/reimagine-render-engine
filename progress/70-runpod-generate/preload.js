const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reimagine', {
  generateRender: (data) => ipcRenderer.invoke('trigger-generation', data),
  exportImage: (data) => ipcRenderer.invoke('export-image', data),
  getConfig: () => ipcRenderer.invoke('get-config'),
  openRendersFolder: () => ipcRenderer.invoke('open-renders-folder'),
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  onGenerationProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('generation-progress', listener);
    return () => ipcRenderer.removeListener('generation-progress', listener);
  },
});

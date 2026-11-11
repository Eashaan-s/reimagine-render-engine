const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0b0e',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
}

function rendersDir() {
  const dir = path.join(app.getPath('pictures'), 'Reimagine Renders');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('get-config', () => ({
  phase: 30,
  hasRunPodConfig: false,
  generateAvailable: false,
  readyMessage: '30% — UI shell only. Generate is not connected to RunPod.',
}));

ipcMain.handle('window-control', (_event, action) => {
  if (!mainWindow) return;
  if (action === 'minimize') mainWindow.minimize();
  else if (action === 'maximize') {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  } else if (action === 'close') mainWindow.close();
});

ipcMain.handle('open-renders-folder', async () => {
  const dir = rendersDir();
  await shell.openPath(dir);
  return { opened: true, dir };
});

ipcMain.handle('trigger-generation', async () => {
  throw new Error(
    'This 30% milestone is the UI shell only. Workflow mapping is 50%; RunPod generation is 70%.'
  );
});

ipcMain.handle('export-image', async (_event, payload) => {
  if (!payload?.imageBase64) return { saved: false };

  const defaultName = payload.defaultName || `reimagine-${Date.now()}.png`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export render',
    defaultPath: path.join(rendersDir(), defaultName),
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });

  if (canceled || !filePath) return { saved: false };

  let base64 = payload.imageBase64;
  const match = String(base64).match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  if (match) base64 = match[1];
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { saved: true, filePath };
});

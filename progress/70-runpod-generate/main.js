const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

const { createRunPodClient } = require('./src/services/runpodClient');
const { buildWorkflowPayload } = require('./src/services/workflowBuilder');

const BASE_IMAGE_NAME = 'reimagine_base.png';
const STYLE_IMAGE_NAME = 'reimagine_style.png';

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

function hasRunPodConfig() {
  const key = process.env.RUNPOD_API_KEY;
  return Boolean(
    key &&
      key !== 'your_runpod_api_key_here' &&
      process.env.RUNPOD_ENDPOINT_ID &&
      process.env.RUNPOD_ENDPOINT_ID !== 'your_runpod_endpoint_id_here'
  );
}

function stripDataUrlPrefix(value) {
  if (!value || typeof value !== 'string') return value;
  const match = value.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  return match ? match[1] : value;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('get-config', () => ({
  phase: 70,
  hasRunPodConfig: hasRunPodConfig(),
  endpointId: process.env.RUNPOD_ENDPOINT_ID || null,
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

ipcMain.handle('trigger-generation', async (_event, payload) => {
  if (!payload?.baseImageBase64) {
    throw new Error('Base structure image is required.');
  }

  if (!hasRunPodConfig()) {
    throw new Error('Set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID in your .env file.');
  }

  const hasStyle = Boolean(payload.styleImageBase64);
  const { workflow, seed, prompt } = buildWorkflowPayload({
    baseImageName: BASE_IMAGE_NAME,
    styleImageName: hasStyle ? STYLE_IMAGE_NAME : null,
    texturePrompt: payload.texturePrompt,
    stylePreset: payload.stylePreset,
    elements: payload.elements,
    lighting: payload.lighting,
    steps: payload.steps,
    cfg: payload.cfg,
    samplerName: payload.samplerName,
    seed: payload.seed,
  });

  const images = [{ name: BASE_IMAGE_NAME, image: payload.baseImageBase64 }];
  if (hasStyle) {
    images.push({ name: STYLE_IMAGE_NAME, image: payload.styleImageBase64 });
  }

  const client = createRunPodClient();
  const { imageBase64 } = await client.generate({
    workflow,
    images,
    onProgress: (status) => {
      const state = String(status?.status || status?.state || '').toUpperCase();
      mainWindow?.webContents.send('generation-progress', { status: state });
    },
  });

  return { imageBase64, seed, prompt };
});

ipcMain.handle('export-image', async (_event, payload) => {
  if (!payload?.imageBase64) {
    return { saved: false };
  }

  const defaultName = payload.defaultName || `reimagine-${Date.now()}.png`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export render',
    defaultPath: path.join(rendersDir(), defaultName),
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });

  if (canceled || !filePath) {
    return { saved: false };
  }

  const base64 = stripDataUrlPrefix(payload.imageBase64);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { saved: true, filePath };
});

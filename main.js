const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

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
    backgroundColor: '#0f0f12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('Failed to load UI:', code, description);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

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

ipcMain.handle('get-config', () => ({
  hasRunPodConfig: hasRunPodConfig(),
  endpointId: process.env.RUNPOD_ENDPOINT_ID || null,
}));

ipcMain.handle('trigger-generation', async (_event, payload) => {
  if (!payload?.baseImageBase64) {
    throw new Error('Base structure image is required.');
  }
  if (!payload?.styleImageBase64) {
    throw new Error('Style reference image is required.');
  }
  if (!hasRunPodConfig()) {
    throw new Error('Set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID in your .env file.');
  }

  const client = createRunPodClient();

  const { workflow, seed, prompt } = buildWorkflowPayload({
    baseImageName: BASE_IMAGE_NAME,
    styleImageName: STYLE_IMAGE_NAME,
    texturePrompt: payload.texturePrompt,
    stylePreset: payload.stylePreset,
    elements: payload.elements,
    lighting: payload.lighting,
    steps: payload.steps,
    cfg: payload.cfg,
    samplerName: payload.samplerName,
    seed: payload.seed,
  });

  const images = [
    { name: BASE_IMAGE_NAME, image: payload.baseImageBase64 },
    { name: STYLE_IMAGE_NAME, image: payload.styleImageBase64 },
  ];

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

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export render',
    defaultPath: payload.defaultName || `reimagine-${Date.now()}.png`,
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });

  if (canceled || !filePath) {
    return { saved: false };
  }

  const base64 = stripDataUrlPrefix(payload.imageBase64);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));

  return { saved: true, filePath };
});

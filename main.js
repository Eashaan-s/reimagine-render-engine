const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

// When packaged, load .env from next to the app (resources/) so it stays
// editable by the user; in development load it from the project root.
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

const { createRunPodClient } = require('./src/services/runpodClient');
const { createLocalComfyClient } = require('./src/services/localComfyClient');
const { buildWorkflowPayload } = require('./src/services/workflowBuilder');
const comfyProcess = require('./src/services/comfyProcess');

const BASE_IMAGE_NAME = 'reimagine_base.png';
const STYLE_IMAGE_NAME = 'reimagine_style.png';

let mainWindow = null;
let splashWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0b0e',
    frame: false,
    show: false,
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

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    resizable: false,
    backgroundColor: '#0a0b0e',
    alwaysOnTop: true,
    center: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'splash.html'));
}

function setSplashStatus(message) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const safe = JSON.stringify(String(message));
  splashWindow.webContents
    .executeJavaScript(`(function(){var s=document.getElementById('status'); if(s){s.textContent=${safe};}})();`)
    .catch(() => {});
}

function revealMainWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * Option A: if we're on the local backend and a ComfyUI path is configured,
 * silently start (or reuse) ComfyUI behind a splash screen so the app feels
 * standalone. Any failure falls back to showing the app with the usual
 * "Cannot reach ComfyUI" handling on Generate.
 */
async function startEngineThenReveal() {
  const backend = resolveBackend();
  const comfyPath = process.env.COMFYUI_PATH;
  const launchCmd = process.env.COMFYUI_LAUNCH_CMD;

  const shouldManage = backend === 'local' && (comfyPath || launchCmd);
  if (!shouldManage) {
    revealMainWindow();
    return;
  }

  try {
    await comfyProcess.ensure({
      url: comfyUrl(),
      comfyPath,
      launchCmd,
      logPath: path.join(app.getPath('userData'), 'comfyui-engine.log'),
      readyTimeoutMs: Number(process.env.ENGINE_READY_TIMEOUT_MS || 180000),
      onStatus: setSplashStatus,
    });
  } catch (err) {
    setSplashStatus(`Engine not started: ${err.message}`);
    // Brief pause so the message is readable, then continue into the app.
    await new Promise((r) => setTimeout(r, 2500));
  } finally {
    revealMainWindow();
  }
}

app.whenReady().then(async () => {
  createSplash();
  createWindow();
  await startEngineThenReveal();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  comfyProcess.stop();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    mainWindow.once('ready-to-show', () => mainWindow.show());
  }
});

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

function comfyUrl() {
  return process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
}

/**
 * Decide which render backend to use. Set RENDER_BACKEND=local|runpod to force
 * one. When unset, fall back to RunPod if it's configured (dev laptop), else
 * local ComfyUI (the offline target machine).
 */
function resolveBackend() {
  const explicit = String(process.env.RENDER_BACKEND || '').toLowerCase();
  if (explicit === 'local' || explicit === 'runpod') return explicit;
  return hasRunPodConfig() ? 'runpod' : 'local';
}

function createRenderClient(backend) {
  return backend === 'local' ? createLocalComfyClient() : createRunPodClient();
}

function stripDataUrlPrefix(value) {
  if (!value || typeof value !== 'string') return value;
  const match = value.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
  return match ? match[1] : value;
}

ipcMain.handle('get-config', () => {
  const backend = resolveBackend();
  return {
    backend,
    hasRunPodConfig: hasRunPodConfig(),
    endpointId: process.env.RUNPOD_ENDPOINT_ID || null,
    comfyUrl: comfyUrl(),
  };
});

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
  try {
    return await runGeneration(payload);
  } catch (err) {
    throw new Error(err?.message || String(err));
  }
});

async function runGeneration(payload) {
  if (!payload?.baseImageBase64) {
    throw new Error('Base structure image is required.');
  }

  const backend = resolveBackend();

  if (backend === 'runpod' && !hasRunPodConfig()) {
    throw new Error('Set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID in your .env file.');
  }

  const client = createRenderClient(backend);

  if (backend === 'local') {
    let reachable = await client.checkConnection();

    // Self-heal: if the engine is app-managed but not currently up (e.g. it was
    // never started or crashed), try to (re)start it hidden before failing.
    if (!reachable && (process.env.COMFYUI_PATH || process.env.COMFYUI_LAUNCH_CMD)) {
      mainWindow?.webContents.send('generation-progress', { status: 'STARTING ENGINE' });
      try {
        await comfyProcess.ensure({
          url: comfyUrl(),
          comfyPath: process.env.COMFYUI_PATH,
          launchCmd: process.env.COMFYUI_LAUNCH_CMD,
          logPath: path.join(app.getPath('userData'), 'comfyui-engine.log'),
          readyTimeoutMs: Number(process.env.ENGINE_READY_TIMEOUT_MS || 180000),
        });
        reachable = await client.checkConnection();
      } catch (_e) {
        reachable = false;
      }
    }

    if (!reachable) {
      throw new Error(
        `Cannot reach ComfyUI at ${comfyUrl()}. Check COMFYUI_PATH in your .env, or start ComfyUI manually.`
      );
    }
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

  const { imageBase64 } = await client.generate({
    workflow,
    images,
    onProgress: (status) => {
      const state = String(status?.status || status?.state || '').toUpperCase();
      mainWindow?.webContents.send('generation-progress', { status: state });
    },
  });

  return { imageBase64, seed, prompt };
}

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

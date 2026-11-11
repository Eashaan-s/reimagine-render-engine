const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Manages a local ComfyUI server process for "Option A":
 *  - Reuse an already-running ComfyUI (e.g. one the user started themselves).
 *  - Otherwise launch the user's installed ComfyUI as a HIDDEN background
 *    process (no console window), wait until it's ready, and shut down ONLY
 *    the process we started when the app exits.
 *
 * Configuration (env, read by main.js and passed in):
 *  - COMFYUI_URL         : where the server listens (default http://127.0.0.1:8188)
 *  - COMFYUI_PATH        : ComfyUI install folder (portable root or ComfyUI dir)
 *  - COMFYUI_LAUNCH_CMD  : optional full launch command override
 */

let child = null;
let startedByUs = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portFromUrl(url) {
  try {
    return Number(new URL(url).port) || 8188;
  } catch (_e) {
    return 8188;
  }
}

async function isRunning(url) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/system_stats`);
    return res.ok;
  } catch (_e) {
    return false;
  }
}

/**
 * Figure out how to launch ComfyUI from COMFYUI_PATH. Supports the Windows
 * portable layout (python_embeded\python.exe + ComfyUI\main.py) as well as a
 * path pointing directly at the ComfyUI folder.
 * @returns {{command: string, args: string[], cwd: string} | null}
 */
function resolveLaunch(comfyPath, port) {
  if (!comfyPath) return null;

  const portArgs = ['--port', String(port), '--listen', '127.0.0.1'];

  // Layout 1: portable root containing python_embeded\ and ComfyUI\
  const pyEmbed = path.join(comfyPath, 'python_embeded', 'python.exe');
  const mainInSub = path.join(comfyPath, 'ComfyUI', 'main.py');
  if (fs.existsSync(pyEmbed) && fs.existsSync(mainInSub)) {
    return { command: pyEmbed, args: ['-s', mainInSub, ...portArgs], cwd: comfyPath };
  }

  // Layout 2: path points directly at the ComfyUI folder (has main.py)
  const mainHere = path.join(comfyPath, 'main.py');
  if (fs.existsSync(mainHere)) {
    const pyEmbedSibling = path.join(comfyPath, '..', 'python_embeded', 'python.exe');
    if (fs.existsSync(pyEmbedSibling)) {
      return { command: pyEmbedSibling, args: ['-s', mainHere, ...portArgs], cwd: path.dirname(comfyPath) };
    }
    // Fall back to a python on PATH
    return { command: 'python', args: ['-s', mainHere, ...portArgs], cwd: comfyPath };
  }

  return null;
}

/**
 * Parse a full launch-command override string into command + args (naive split,
 * supports double-quoted segments).
 */
function parseLaunchCmd(cmd) {
  const matches = cmd.match(/"[^"]+"|\S+/g) || [];
  const parts = matches.map((p) => p.replace(/^"|"$/g, ''));
  if (!parts.length) return null;
  return { command: parts[0], args: parts.slice(1), cwd: undefined };
}

/**
 * Ensure a ComfyUI server is reachable at `url`. Launches the user's ComfyUI
 * hidden if needed.
 *
 * @returns {Promise<{started: boolean, alreadyRunning: boolean}>}
 */
async function ensure({
  url,
  comfyPath,
  launchCmd,
  logPath,
  readyTimeoutMs = 180000,
  onStatus,
} = {}) {
  const status = (msg) => {
    if (typeof onStatus === 'function') onStatus(msg);
  };

  if (await isRunning(url)) {
    startedByUs = false;
    status('Connected to ComfyUI');
    return { started: false, alreadyRunning: true };
  }

  const launch = launchCmd
    ? parseLaunchCmd(launchCmd)
    : resolveLaunch(comfyPath, portFromUrl(url));

  if (!launch) {
    throw new Error(
      'ComfyUI was not found. Set COMFYUI_PATH in .env to your ComfyUI folder.'
    );
  }

  status('Starting engine…');

  let stdio = 'ignore';
  let logFd = null;
  if (logPath) {
    try {
      logFd = fs.openSync(logPath, 'a');
      stdio = ['ignore', logFd, logFd];
    } catch (_e) {
      stdio = 'ignore';
    }
  }

  child = spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    windowsHide: true,
    detached: false,
    stdio,
  });
  startedByUs = true;

  child.on('error', (err) => {
    // Surfaced via the readiness timeout below; just record state.
    child = null;
  });
  child.on('exit', () => {
    child = null;
  });

  const started = Date.now();
  while (Date.now() - started < readyTimeoutMs) {
    if (await isRunning(url)) {
      status('Engine ready');
      return { started: true, alreadyRunning: false };
    }
    if (!child) {
      throw new Error(
        'ComfyUI failed to start. Check COMFYUI_PATH and the engine log.'
      );
    }
    await sleep(1500);
  }

  // Timed out: stop whatever we launched so we don't leak a process.
  stop();
  throw new Error('ComfyUI did not become ready in time.');
}

/** Stop ComfyUI, but only if we were the ones who started it. */
function stop() {
  if (child && startedByUs) {
    const pid = child.pid;
    try {
      if (process.platform === 'win32') {
        // Kill the whole tree so no python child lingers.
        spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
      } else {
        child.kill('SIGTERM');
      }
    } catch (_e) {
      // best effort
    }
  }
  child = null;
  startedByUs = false;
}

module.exports = { ensure, stop, isRunning };

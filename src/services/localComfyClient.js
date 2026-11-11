const crypto = require('crypto');

const DEFAULT_BASE_URL = 'http://127.0.0.1:8188';
const DEFAULT_POLL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 1800000;

/**
 * Client for a ComfyUI instance running on the local machine.
 *
 * Exposes the same `generate({ workflow, images, onProgress })` interface as
 * runpodClient so main.js can swap backends without other changes. Talks to
 * ComfyUI's native HTTP API (upload/image, prompt, history, view) using the
 * Node built-in fetch/FormData/Blob — no extra dependencies, fully offline.
 */
function createLocalComfyClient(config = {}) {
  const baseUrl = (config.baseUrl || process.env.COMFYUI_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const pollIntervalMs = Number(config.pollIntervalMs || process.env.POLL_INTERVAL_MS || DEFAULT_POLL_MS);
  const pollTimeoutMs = Number(config.pollTimeoutMs || process.env.POLL_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const clientId = config.clientId || crypto.randomUUID();

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeBase64(value) {
    if (!value) return value;
    const match = value.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
    return match ? match[1] : value;
  }

  /** Quick reachability check so we can show a friendly error if ComfyUI is down. */
  async function checkConnection() {
    try {
      const res = await fetch(`${baseUrl}/system_stats`, { method: 'GET' });
      return res.ok;
    } catch (_err) {
      return false;
    }
  }

  /** Upload an input image so LoadImage nodes can reference it by name. */
  async function uploadImage({ name, image }) {
    const buffer = Buffer.from(normalizeBase64(image), 'base64');
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: 'image/png' }), name);
    form.append('overwrite', 'true');

    const res = await fetch(`${baseUrl}/upload/image`, { method: 'POST', body: form });
    if (!res.ok) {
      throw new Error(`ComfyUI image upload failed (${res.status}): ${await res.text()}`);
    }
    return res.json();
  }

  /** Queue a workflow for execution. Returns the prompt id. */
  async function queuePrompt(workflow) {
    const res = await fetch(`${baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    });

    if (!res.ok) {
      throw new Error(`ComfyUI rejected the workflow (${res.status}): ${await res.text()}`);
    }

    const data = await res.json();
    if (!data || !data.prompt_id) {
      throw new Error(`ComfyUI did not return a prompt id: ${JSON.stringify(data)}`);
    }
    return data.prompt_id;
  }

  /** Fetch the history entry for a prompt. Returns null while still running. */
  async function getHistory(promptId) {
    const res = await fetch(`${baseUrl}/history/${promptId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[promptId] || null;
  }

  function extractOutputImageRef(historyEntry) {
    const outputs = historyEntry?.outputs || {};
    for (const nodeId of Object.keys(outputs)) {
      const images = outputs[nodeId]?.images;
      if (Array.isArray(images)) {
        for (const img of images) {
          if (img?.filename) return img;
        }
      }
    }
    return null;
  }

  /** Download a produced image and return it as base64. */
  async function fetchImageAsBase64({ filename, subfolder = '', type = 'output' }) {
    const params = new URLSearchParams({ filename, subfolder: subfolder || '', type: type || 'output' });
    const res = await fetch(`${baseUrl}/view?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch render image (${res.status})`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }

  async function pollUntilComplete(promptId, onProgress) {
    const started = Date.now();
    let seenRunning = false;

    while (Date.now() - started < pollTimeoutMs) {
      const entry = await getHistory(promptId);

      if (entry) {
        const status = entry.status || {};
        if (status.status_str === 'error') {
          throw new Error(`ComfyUI execution failed: ${JSON.stringify(status.messages || status)}`);
        }

        const imageRef = extractOutputImageRef(entry);
        if (!imageRef) {
          throw new Error('Workflow finished but produced no output image.');
        }

        if (onProgress) onProgress({ status: 'COMPLETED' });
        const imageBase64 = await fetchImageAsBase64(imageRef);
        return { status: entry, imageBase64 };
      }

      if (onProgress) onProgress({ status: seenRunning ? 'IN_PROGRESS' : 'IN_QUEUE' });
      seenRunning = true;
      await sleep(pollIntervalMs);
    }

    throw new Error(`ComfyUI render timed out after ${pollTimeoutMs}ms`);
  }

  async function generate({ workflow, images, onProgress }) {
    for (const img of images || []) {
      await uploadImage(img);
    }

    if (onProgress) onProgress({ status: 'IN_QUEUE' });
    const promptId = await queuePrompt(workflow);
    return pollUntilComplete(promptId, onProgress);
  }

  return {
    baseUrl,
    clientId,
    checkConnection,
    uploadImage,
    queuePrompt,
    getHistory,
    fetchImageAsBase64,
    pollUntilComplete,
    generate,
  };
}

module.exports = { createLocalComfyClient };

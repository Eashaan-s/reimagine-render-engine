const http = require('http');
const https = require('https');
const axios = require('axios');

const DEFAULT_POLL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 600000;
const SUBMIT_RETRIES = 3;

const ipv4HttpAgent = new http.Agent({ family: 4, keepAlive: true });
const ipv4HttpsAgent = new https.Agent({ family: 4, keepAlive: true });

function collectErrorParts(err, into = []) {
  if (!err) return into;
  if (typeof err === 'string') {
    into.push(err);
    return into;
  }
  if (err.code) into.push(String(err.code));
  if (err.message && err.message !== 'AggregateError') into.push(String(err.message));
  if (Array.isArray(err.errors)) {
    for (const nested of err.errors) collectErrorParts(nested, into);
  }
  if (err.cause && err.cause !== err) collectErrorParts(err.cause, into);
  return into;
}

function isRetryableNetworkError(err) {
  if (err.response?.status) return false;
  const blob = collectErrorParts(err).join(' ');
  return /ECONNRESET|ECONNABORTED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|AggregateError|socket hang up/i.test(
    blob
  );
}

function wrapRunPodHttpError(err, action) {
  const status = err.response?.status;
  const body = err.response?.data;
  const detail = typeof body === 'string' ? body : body?.error || body?.message;

  if (status === 402) {
    return new Error(
      'RunPod returned 402 Payment Required. Add credits in the RunPod console (Billing), then Generate again.'
    );
  }
  if (status === 401) {
    return new Error('RunPod rejected the API key (401). Check RUNPOD_API_KEY in .env.');
  }
  if (status === 404) {
    return new Error('RunPod endpoint not found (404). Check RUNPOD_ENDPOINT_ID in .env.');
  }
  if (status === 409) {
    return new Error(
      'RunPod endpoint is paused (409). In the console, set Max workers to 1, wait 30 seconds, then Generate again.'
    );
  }

  if (status) {
    const extra = detail ? `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : '';
    return new Error(`RunPod ${action} failed (${status})${extra}`);
  }

  const joined = [...new Set(collectErrorParts(err))].filter(Boolean).join(' — ') || 'unknown network error';
  if (/ECONNRESET|socket hang up/i.test(joined)) {
    return new Error(
      'Connection to RunPod was reset. Use a phone hotspot or smaller images, then Generate again.'
    );
  }
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH/i.test(joined)) {
    return new Error('Could not reach api.runpod.ai. Check Wi-Fi or VPN, then Generate again.');
  }
  if (/timeout|ETIMEDOUT|ECONNABORTED/i.test(joined)) {
    return new Error('Could not reach RunPod (timeout). Check internet, then Generate again.');
  }
  return new Error(`RunPod ${action} failed: ${joined}`);
}

function createRunPodClient(config = {}) {
  const apiKey = config.apiKey || process.env.RUNPOD_API_KEY;
  const endpointId = config.endpointId || process.env.RUNPOD_ENDPOINT_ID;
  const baseUrl = config.baseUrl || process.env.RUNPOD_BASE_URL || 'https://api.runpod.ai/v2';
  const pollIntervalMs = Number(config.pollIntervalMs || process.env.POLL_INTERVAL_MS || DEFAULT_POLL_MS);
  const pollTimeoutMs = Number(config.pollTimeoutMs || process.env.POLL_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  if (!apiKey || !endpointId) {
    throw new Error('RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID must be set in .env');
  }

  const client = axios.create({
    baseURL: `${baseUrl}/${endpointId}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 180000,
    family: 4,
    httpAgent: ipv4HttpAgent,
    httpsAgent: ipv4HttpsAgent,
  });

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Strip data-URL prefix if present.
   */
  function normalizeBase64(value) {
    if (!value) return value;
    const match = value.match(/^data:image\/[a-zA-Z+]+;base64,(.+)$/);
    return match ? match[1] : value;
  }

  /**
   * Submit a ComfyUI workflow job to RunPod.
   * Adjust `input` shape if your RunPod template uses a different schema.
   */
  async function submitJob({ workflow, images }) {
    const payload = {
      input: {
        workflow,
        images: images.map(({ name, image }) => ({
          name,
          image: normalizeBase64(image),
        })),
      },
    };

    let lastErr;
    for (let attempt = 1; attempt <= SUBMIT_RETRIES; attempt += 1) {
      try {
        const { data } = await client.post('/run', payload);
        const jobId = data.id || data.jobId;

        if (!jobId) {
          throw new Error(`RunPod did not return a job id: ${JSON.stringify(data)}`);
        }

        return jobId;
      } catch (err) {
        lastErr = err;
        if (attempt < SUBMIT_RETRIES && isRetryableNetworkError(err)) {
          await sleep(1500 * attempt);
          continue;
        }
        throw wrapRunPodHttpError(err, 'submit');
      }
    }

    throw wrapRunPodHttpError(lastErr, 'submit');
  }

  async function getJobStatus(jobId) {
    try {
      const { data } = await client.get(`/status/${jobId}`);
      return data;
    } catch (err) {
      throw wrapRunPodHttpError(err, 'status');
    }
  }

  function extractOutputImage(statusPayload) {
    const output = statusPayload.output || statusPayload.result || statusPayload;

    if (typeof output === 'string' && output.length > 100) {
      return output;
    }

    const imageCollections = [
      output?.images,
      output?.message?.images,
      output?.output?.images,
      Array.isArray(output) ? output : null,
    ].filter(Boolean);

    for (const collection of imageCollections) {
      for (const item of collection) {
        if (typeof item === 'string' && item.length > 100) return item;
        if (item?.data) return item.data;
        if (item?.image) return item.image;
        if (item?.base64) return item.base64;
      }
    }

    return null;
  }

  async function pollUntilComplete(jobId, onProgress) {
    const started = Date.now();

    while (Date.now() - started < pollTimeoutMs) {
      const status = await getJobStatus(jobId);
      const state = (status.status || status.state || '').toUpperCase();

      if (onProgress) onProgress(status);

      if (state === 'COMPLETED') {
        const imageBase64 = extractOutputImage(status);
        if (!imageBase64) {
          throw new Error('Job completed but no output image was found in the response.');
        }
        return { status, imageBase64 };
      }

      if (state === 'FAILED' || state === 'CANCELLED') {
        const message = status.error || status.message || JSON.stringify(status);
        throw new Error(`RunPod job ${state}: ${message}`);
      }

      await sleep(pollIntervalMs);
    }

    throw new Error(`RunPod job timed out after ${pollTimeoutMs}ms`);
  }

  async function generate({ workflow, images, onProgress }) {
    const jobId = await submitJob({ workflow, images });
    return pollUntilComplete(jobId, onProgress);
  }

  return {
    submitJob,
    getJobStatus,
    pollUntilComplete,
    generate,
    extractOutputImage,
  };
}

module.exports = { createRunPodClient };

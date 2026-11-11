const axios = require('axios');

const DEFAULT_POLL_MS = 3000;
const DEFAULT_TIMEOUT_MS = 600000;

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
    timeout: 120000,
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

    const { data } = await client.post('/run', payload);
    const jobId = data.id || data.jobId;

    if (!jobId) {
      throw new Error(`RunPod did not return a job id: ${JSON.stringify(data)}`);
    }

    return jobId;
  }

  async function getJobStatus(jobId) {
    const { data } = await client.get(`/status/${jobId}`);
    return data;
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

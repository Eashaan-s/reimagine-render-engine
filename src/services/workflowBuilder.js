const fs = require('fs');
const path = require('path');

const WORKFLOW_API_PATH = path.join(__dirname, '..', '..', 'workflows', 'workflow-api.json');

/** ComfyUI node IDs from REIMAGINE WORKFLOW */
const NODES = {
  BASE_IMAGE: '370',
  STYLE_IMAGE: '371',
  PROMPT: '377',
  SAMPLER: '368',
  UNET: '376',
  VAE: '362',
};

/** TextEncodeQwenImageEditPlus nodes that reference the style image via image2 */
const STYLE_ENCODER_NODES = ['377', '378'];

const DEFAULTS = {
  steps: 4,
  cfg: 1.0,
  sampler_name: 'euler',
  scheduler: 'simple',
  denoise: 1,
};

let cachedWorkflow = null;

function loadBaseWorkflow() {
  if (cachedWorkflow) return structuredClone(cachedWorkflow);

  if (!fs.existsSync(WORKFLOW_API_PATH)) {
    throw new Error(
      'workflow-api.json not found. Run: npm run convert-workflow'
    );
  }

  cachedWorkflow = JSON.parse(fs.readFileSync(WORKFLOW_API_PATH, 'utf8'));
  return structuredClone(cachedWorkflow);
}

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function assemblePrompt({ texturePrompt, stylePreset, elements, lighting, hasStyle = true }) {
  const styles = toList(stylePreset);
  const tags = toList(elements);
  const lights = toList(lighting);

  const lead = hasStyle
    ? 'Replace the rendering in image 1 with the style in image 2.'
    : 'Transform the architectural rendering in image 1 into a photorealistic render.';

  const parts = [
    lead,
    styles.length && `Style preset: ${styles.join(', ')}.`,
    tags.length && `Elements: ${tags.join(', ')}.`,
    lights.length && `Lighting: ${lights.join(', ')}.`,
    texturePrompt?.trim(),
  ].filter(Boolean);

  return parts.join('\n\n');
}

function randomSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/**
 * Override the UNet/VAE filenames so the workflow matches whatever models the
 * target ComfyUI actually has. Defaults (when the env vars are unset) leave the
 * filenames baked into workflow-api.json untouched, so the RunPod backend keeps
 * working. On a local machine, set COMFY_UNET_NAME / COMFY_VAE_NAME in .env to
 * the exact filenames present there.
 */
function applyModelOverrides(workflow) {
  const unetName = process.env.COMFY_UNET_NAME;
  const vaeName = process.env.COMFY_VAE_NAME;

  if (unetName && workflow[NODES.UNET]?.inputs) {
    workflow[NODES.UNET].inputs.unet_name = unetName;
  }
  if (vaeName && workflow[NODES.VAE]?.inputs) {
    workflow[NODES.VAE].inputs.vae_name = vaeName;
  }
}

/**
 * @param {object} params
 * @param {string} params.baseImageName - filename referenced by LoadImage node 370
 * @param {string} params.styleImageName - filename referenced by LoadImage node 371
 * @param {string} params.texturePrompt
 * @param {string} [params.stylePreset]
 * @param {string[]} [params.elements]
 * @param {string} [params.lighting]
 * @param {number} [params.steps]
 * @param {number} [params.cfg]
 * @param {string} [params.samplerName]
 * @param {number} [params.seed]
 */
function buildWorkflowPayload(params) {
  const workflow = loadBaseWorkflow();
  const hasStyle = Boolean(params.styleImageName);
  const prompt = assemblePrompt({ ...params, hasStyle });

  if (!workflow[NODES.PROMPT]) {
    throw new Error(`Prompt node ${NODES.PROMPT} missing from workflow-api.json`);
  }
  if (!workflow[NODES.SAMPLER]) {
    throw new Error(`Sampler node ${NODES.SAMPLER} missing from workflow-api.json`);
  }
  if (!workflow[NODES.BASE_IMAGE]) {
    throw new Error(`Base image node ${NODES.BASE_IMAGE} missing from workflow-api.json`);
  }

  applyModelOverrides(workflow);

  workflow[NODES.PROMPT].inputs.prompt = prompt;
  workflow[NODES.BASE_IMAGE].inputs.image = params.baseImageName;

  if (hasStyle) {
    if (!workflow[NODES.STYLE_IMAGE]) {
      throw new Error(`Style image node ${NODES.STYLE_IMAGE} missing from workflow-api.json`);
    }
    workflow[NODES.STYLE_IMAGE].inputs.image = params.styleImageName;
  } else {
    // No reference image: detach the optional image2 input from the encoders
    // and drop the now-orphaned LoadImage node so the worker doesn't try to
    // load a non-existent file. Qwen still renders from image1 + the prompt.
    STYLE_ENCODER_NODES.forEach((id) => {
      if (workflow[id]?.inputs) delete workflow[id].inputs.image2;
    });
    delete workflow[NODES.STYLE_IMAGE];
  }

  const seed = params.seed ?? randomSeed();
  workflow[NODES.SAMPLER].inputs.seed = seed;
  workflow[NODES.SAMPLER].inputs.steps = params.steps ?? DEFAULTS.steps;
  workflow[NODES.SAMPLER].inputs.cfg = params.cfg ?? DEFAULTS.cfg;
  workflow[NODES.SAMPLER].inputs.sampler_name =
    params.samplerName ?? DEFAULTS.sampler_name;
  workflow[NODES.SAMPLER].inputs.scheduler = DEFAULTS.scheduler;
  workflow[NODES.SAMPLER].inputs.denoise = DEFAULTS.denoise;

  return { workflow, seed, prompt };
}

module.exports = {
  NODES,
  DEFAULTS,
  assemblePrompt,
  buildWorkflowPayload,
  loadBaseWorkflow,
};

const fs = require('fs');
const path = require('path');

const WORKFLOW_API_PATH = path.join(__dirname, '..', '..', 'workflows', 'workflow-api.json');

/** ComfyUI node IDs from REIMAGINE WORKFLOW */
const NODES = {
  BASE_IMAGE: '370',
  STYLE_IMAGE: '371',
  PROMPT: '377',
  SAMPLER: '368',
};

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

function assemblePrompt({ texturePrompt, stylePreset, elements, lighting }) {
  const parts = [
    'Replace the rendering in image 1 with the style in image 2.',
    stylePreset && `Style preset: ${stylePreset}.`,
    elements?.length && `Elements: ${elements.join(', ')}.`,
    lighting && `Lighting: ${lighting}.`,
    texturePrompt?.trim(),
  ].filter(Boolean);

  return parts.join('\n\n');
}

function randomSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
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
  const prompt = assemblePrompt(params);

  if (!workflow[NODES.PROMPT]) {
    throw new Error(`Prompt node ${NODES.PROMPT} missing from workflow-api.json`);
  }
  if (!workflow[NODES.SAMPLER]) {
    throw new Error(`Sampler node ${NODES.SAMPLER} missing from workflow-api.json`);
  }
  if (!workflow[NODES.BASE_IMAGE]) {
    throw new Error(`Base image node ${NODES.BASE_IMAGE} missing from workflow-api.json`);
  }
  if (!workflow[NODES.STYLE_IMAGE]) {
    throw new Error(`Style image node ${NODES.STYLE_IMAGE} missing from workflow-api.json`);
  }

  workflow[NODES.PROMPT].inputs.prompt = prompt;
  workflow[NODES.BASE_IMAGE].inputs.image = params.baseImageName;
  workflow[NODES.STYLE_IMAGE].inputs.image = params.styleImageName;

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

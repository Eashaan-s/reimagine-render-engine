const STYLE_PRESETS = ['Exterior', 'Interior', 'Modern', 'Classic', 'Minimal'];
const ELEMENTS = ['Building', 'Pond', 'Garden', 'Pool', 'Driveway', 'Trees'];
const LIGHTING = ['Morning', 'Midday', 'Evening', 'Night', 'Overcast'];

const state = {
  baseImageBase64: null,
  styleImageBase64: null,
  currentOutputBase64: null,
  history: [],
  isGenerating: false,
};

const els = {
  texturePrompt: document.getElementById('texture-prompt'),
  styleDropzone: document.getElementById('style-dropzone'),
  styleInput: document.getElementById('style-input'),
  stylePreview: document.getElementById('style-preview'),
  stylePresets: document.getElementById('style-presets'),
  elementsTags: document.getElementById('elements-tags'),
  lightingTags: document.getElementById('lighting-tags'),
  generateBtn: document.getElementById('generate-btn'),
  baseDropzone: document.getElementById('base-dropzone'),
  baseInput: document.getElementById('base-input'),
  basePreview: document.getElementById('base-preview'),
  advancedToggle: document.getElementById('advanced-toggle'),
  advancedControls: document.getElementById('advanced-controls'),
  samplerName: document.getElementById('sampler-name'),
  steps: document.getElementById('steps'),
  seed: document.getElementById('seed'),
  cfg: document.getElementById('cfg'),
  outputViewer: document.getElementById('output-viewer'),
  outputPreview: document.getElementById('output-preview'),
  outputLoading: document.getElementById('output-loading'),
  exportBtn: document.getElementById('export-btn'),
  historyStrip: document.getElementById('history-strip'),
  statusPill: document.getElementById('status-pill'),
};

function setStatus(text, tone = 'idle') {
  els.statusPill.textContent = text;
  els.statusPill.className = `status-pill ${tone}`;
}

function createTags(container, options, { single = false } = {}) {
  options.forEach((label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag';
    button.textContent = label;
    button.dataset.value = label;

    button.addEventListener('click', () => {
      if (single) {
        container.querySelectorAll('.tag').forEach((tag) => tag.classList.remove('active'));
        button.classList.add('active');
      } else {
        button.classList.toggle('active');
      }
    });

    container.appendChild(button);
  });
}

function getSelectedTags(container, { multiple = false } = {}) {
  const active = [...container.querySelectorAll('.tag.active')].map((el) => el.dataset.value);
  if (multiple) return active;
  return active[0] || null;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupDropzone({ zone, input, preview, onFile }) {
  const showPreview = (dataUrl) => {
    preview.src = dataUrl;
    preview.classList.remove('hidden');
    zone.querySelector('.dropzone-placeholder, .canvas-placeholder')?.classList.add('hidden');
  };

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await fileToBase64(file);
    showPreview(dataUrl);
    onFile(dataUrl);
  };

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });

  input.addEventListener('change', () => handleFiles(input.files));

  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(event.dataTransfer.files);
  });
}

function renderHistory() {
  els.historyStrip.innerHTML = '';

  if (!state.history.length) {
    const empty = document.createElement('span');
    empty.className = 'history-empty';
    empty.textContent = 'No generations yet';
    els.historyStrip.appendChild(empty);
    return;
  }

  state.history.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `history-item${item.id === state.currentHistoryId ? ' active' : ''}`;

    const img = document.createElement('img');
    img.src = item.dataUrl;
    img.alt = `Generation ${index + 1}`;

    button.appendChild(img);
    button.addEventListener('click', () => selectHistoryItem(item.id));
    els.historyStrip.appendChild(button);
  });
}

function selectHistoryItem(id) {
  const item = state.history.find((entry) => entry.id === id);
  if (!item) return;

  state.currentHistoryId = id;
  state.currentOutputBase64 = item.dataUrl;
  els.outputPreview.src = item.dataUrl;
  els.outputPreview.classList.remove('hidden');
  els.outputViewer.querySelector('.canvas-placeholder')?.classList.add('hidden');
  els.exportBtn.disabled = false;
  renderHistory();
}

function addToHistory(dataUrl, meta = {}) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  state.history.unshift({ id, dataUrl, ...meta });
  state.currentHistoryId = id;
  if (state.history.length > 24) state.history.pop();
  renderHistory();
  return id;
}

function showOutput(dataUrl) {
  els.outputPreview.src = dataUrl;
  els.outputPreview.classList.remove('hidden');
  els.outputViewer.querySelector('.canvas-placeholder')?.classList.add('hidden');
  els.exportBtn.disabled = false;
}

async function handleGenerate() {
  if (state.isGenerating) return;

  if (!state.baseImageBase64) {
    setStatus('Upload a base wireframe first', 'error');
    return;
  }

  if (!state.styleImageBase64) {
    setStatus('Upload a style reference first', 'error');
    return;
  }

  state.isGenerating = true;
  els.generateBtn.disabled = true;
  els.outputLoading.classList.remove('hidden');
  setStatus('Submitting to RunPod...', 'busy');

  const seedValue = els.seed.value.trim();
  const payload = {
    baseImageBase64: state.baseImageBase64,
    styleImageBase64: state.styleImageBase64,
    texturePrompt: els.texturePrompt.value,
    stylePreset: getSelectedTags(els.stylePresets),
    elements: getSelectedTags(els.elementsTags, { multiple: true }),
    lighting: getSelectedTags(els.lightingTags),
    steps: Number(els.steps.value),
    cfg: Number(els.cfg.value),
    samplerName: els.samplerName.value,
    seed: seedValue ? Number(seedValue) : undefined,
  };

  try {
    const result = await window.reimagine.generateRender(payload);
    const dataUrl = result.imageBase64.startsWith('data:')
      ? result.imageBase64
      : `data:image/png;base64,${result.imageBase64}`;

    state.currentOutputBase64 = dataUrl;
    showOutput(dataUrl);
    addToHistory(dataUrl, { seed: result.seed, prompt: result.prompt });
    setStatus(`Complete · seed ${result.seed}`, 'success');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Generation failed', 'error');
  } finally {
    state.isGenerating = false;
    els.generateBtn.disabled = false;
    els.outputLoading.classList.add('hidden');
  }
}

async function handleExport() {
  if (!state.currentOutputBase64) return;

  const result = await window.reimagine.exportImage({
    imageBase64: state.currentOutputBase64,
    defaultName: `reimagine-${Date.now()}.png`,
  });

  if (result.saved) {
    setStatus(`Exported to ${result.filePath}`, 'success');
  }
}

function setupAdvancedToggle() {
  els.advancedToggle.addEventListener('click', () => {
    const expanded = els.advancedToggle.getAttribute('aria-expanded') === 'true';
    els.advancedToggle.setAttribute('aria-expanded', String(!expanded));
    els.advancedControls.classList.toggle('hidden', expanded);
  });
}

async function bootstrap() {
  createTags(els.stylePresets, STYLE_PRESETS, { single: true });
  createTags(els.elementsTags, ELEMENTS, { single: false });
  createTags(els.lightingTags, LIGHTING, { single: true });

  setupDropzone({
    zone: els.baseDropzone,
    input: els.baseInput,
    preview: els.basePreview,
    onFile: (dataUrl) => {
      state.baseImageBase64 = dataUrl;
    },
  });

  setupDropzone({
    zone: els.styleDropzone,
    input: els.styleInput,
    preview: els.stylePreview,
    onFile: (dataUrl) => {
      state.styleImageBase64 = dataUrl;
    },
  });

  setupAdvancedToggle();
  renderHistory();

  els.generateBtn.addEventListener('click', handleGenerate);
  els.exportBtn.addEventListener('click', handleExport);

  window.reimagine.onGenerationProgress(({ status }) => {
    if (status) setStatus(`RunPod: ${status}`, 'busy');
  });

  try {
    const config = await window.reimagine.getConfig();
    if (!config.hasRunPodConfig) {
      setStatus('Configure .env with RunPod credentials', 'warning');
    }
  } catch {
    // noop in browser-only preview
  }
}

bootstrap();

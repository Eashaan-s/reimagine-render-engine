const PRESETS = {
  style: [
    'Exterior',
    'Interior',
    'Modern',
    'Contemporary',
    'Classic',
    'Minimal',
    'Industrial',
    'Scandinavian',
    'Luxury',
  ],
  tags: [
    'Building',
    'Pond',
    'Grass',
    'Garden',
    'Pool',
    'Driveway',
    'Trees',
    'Plants',
    'Sky',
    'Water',
    'People',
    'Cars',
  ],
  lighting: [
    'Morning',
    'Midday',
    'Evening',
    'Night',
    'Overcast',
    'Golden Hour',
    'Blue Hour',
    'Sunny',
  ],
};

const state = {
  baseImageBase64: null,
  baseStem: 'Render',
  styleImageBase64: null,
  currentOutputBase64: null,
  currentHistoryId: null,
  history: [],
  isGenerating: false,
  outputSeq: 0,
  timerId: null,
};

const chips = {};

const els = {
  texturePrompt: document.getElementById('texture-prompt'),
  styleDropzone: document.getElementById('style-dropzone'),
  styleInput: document.getElementById('style-input'),
  stylePreview: document.getElementById('style-preview'),
  styleClear: document.getElementById('style-clear'),
  generateBtn: document.getElementById('generate-btn'),
  baseDropzone: document.getElementById('base-dropzone'),
  baseInput: document.getElementById('base-input'),
  basePreview: document.getElementById('base-preview'),
  baseClear: document.getElementById('base-clear'),
  importBtn: document.getElementById('import-btn'),
  inputRes: document.getElementById('input-res'),
  inputName: document.getElementById('input-name'),
  controlsMode: document.getElementById('controls-mode'),
  advancedControls: document.getElementById('advanced-controls'),
  samplerName: document.getElementById('sampler-name'),
  steps: document.getElementById('steps'),
  seed: document.getElementById('seed'),
  cfg: document.getElementById('cfg'),
  outputViewer: document.getElementById('output-viewer'),
  outputPreview: document.getElementById('output-preview'),
  outputLoading: document.getElementById('output-loading'),
  outputRes: document.getElementById('output-res'),
  outputName: document.getElementById('output-name'),
  outputTime: document.getElementById('output-time'),
  exportBtn: document.getElementById('export-btn'),
  historyStrip: document.getElementById('history-strip'),
  historyFolder: document.getElementById('history-folder'),
  statusDot: document.getElementById('status-dot'),
  statusState: document.getElementById('status-state'),
  statusMessage: document.getElementById('status-message'),
};

/* ------------------------------------------------------------------ */
/* Status bar                                                          */
/* ------------------------------------------------------------------ */
function setStatus(stateText, message, tone = 'idle') {
  els.statusState.textContent = stateText;
  els.statusMessage.textContent = message;
  els.statusDot.className = `status-dot ${tone}`;
}

/* ------------------------------------------------------------------ */
/* Multi-select dropdowns                                              */
/* ------------------------------------------------------------------ */
function createMultiSelect(container, options, placeholder) {
  const selected = [];

  const control = document.createElement('div');
  control.className = 'ms-control';

  const values = document.createElement('div');
  values.className = 'ms-values';

  const arrow = document.createElement('span');
  arrow.className = 'ms-arrow';
  arrow.textContent = '\u25BE';

  control.appendChild(values);
  control.appendChild(arrow);

  const menu = document.createElement('div');
  menu.className = 'ms-menu hidden';

  container.appendChild(control);
  container.appendChild(menu);

  function toggle(value) {
    const i = selected.indexOf(value);
    if (i > -1) selected.splice(i, 1);
    else selected.push(value);
    renderValues();
    renderMenu();
  }

  function renderValues() {
    values.innerHTML = '';
    if (!selected.length) {
      const ph = document.createElement('span');
      ph.className = 'ms-placeholder';
      ph.textContent = placeholder;
      values.appendChild(ph);
      return;
    }
    selected.forEach((value) => {
      const chip = document.createElement('span');
      chip.className = 'chip';

      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'chip-x';
      x.textContent = '\u00D7';
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle(value);
      });

      const label = document.createElement('span');
      label.textContent = value;

      chip.appendChild(x);
      chip.appendChild(label);
      values.appendChild(chip);
    });
  }

  function renderMenu() {
    menu.innerHTML = '';
    options.forEach((opt) => {
      const isSelected = selected.includes(opt);
      const item = document.createElement('div');
      item.className = `ms-item${isSelected ? ' selected' : ''}`;

      const check = document.createElement('span');
      check.className = 'ms-check';
      check.textContent = isSelected ? '\u2713' : '';

      const label = document.createElement('span');
      label.textContent = opt;

      item.appendChild(check);
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle(opt);
      });
      menu.appendChild(item);
    });
  }

  function close() {
    menu.classList.add('hidden');
    container.classList.remove('open');
  }

  control.addEventListener('click', () => {
    if (menu.classList.contains('hidden')) {
      renderMenu();
      menu.classList.remove('hidden');
      container.classList.add('open');
    } else {
      close();
    }
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) close();
  });

  renderValues();

  return { getValues: () => [...selected] };
}

/* ------------------------------------------------------------------ */
/* Image helpers                                                       */
/* ------------------------------------------------------------------ */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function stripExt(name) {
  return name.replace(/\.[^.]+$/, '');
}

function setupDropzone({ zone, input, preview, placeholderSelector, clearBtn, onFile, onClear }) {
  const placeholder = zone.querySelector(placeholderSelector);

  const showPreview = (dataUrl) => {
    preview.src = dataUrl;
    preview.classList.remove('hidden');
    placeholder?.classList.add('hidden');
    clearBtn?.classList.remove('hidden');
  };

  const clear = () => {
    preview.removeAttribute('src');
    preview.classList.add('hidden');
    placeholder?.classList.remove('hidden');
    clearBtn?.classList.add('hidden');
    input.value = '';
    onClear?.();
  };

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await fileToBase64(file);
    showPreview(dataUrl);
    onFile({ dataUrl, file });
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

  clearBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    clear();
  });
}

/* ------------------------------------------------------------------ */
/* Render time                                                         */
/* ------------------------------------------------------------------ */
function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function startTimer() {
  const start = performance.now();
  els.outputTime.textContent = '00:00:00';
  state.timerId = setInterval(() => {
    els.outputTime.textContent = formatDuration(performance.now() - start);
  }, 1000);
  return start;
}

function stopTimer(start) {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  return formatDuration(performance.now() - start);
}

/* ------------------------------------------------------------------ */
/* Output / history                                                    */
/* ------------------------------------------------------------------ */
function nextOutputName() {
  state.outputSeq += 1;
  const seq = String(state.outputSeq).padStart(4, '0');
  return `${state.baseStem || 'Render'}_SFR_${seq}.png`;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read uploaded image'));
    img.src = dataUrl;
  });
}

/** Labeled exhibit for the Output panel: proves mapping + export, not a GPU render. */
async function buildMappingExhibit(baseDataUrl, styleDataUrl, meta) {
  const baseImg = await loadImage(baseDataUrl);
  const styleImg = styleDataUrl ? await loadImage(styleDataUrl) : null;
  const banner = 56;
  const colW = 640;
  const colH = 480;
  const gap = 16;
  const width = styleImg ? colW * 2 + gap + 48 : colW + 48;
  const height = banner + colH + 72;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0b0e';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#1f4fd6';
  ctx.fillRect(0, 0, width, banner);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Segoe UI, sans-serif';
  ctx.fillText('MAPPED JOB  ·  GPU worker not attached', 20, 36);
  ctx.fillStyle = '#8b92a0';
  ctx.font = '14px Segoe UI, sans-serif';
  const line = `nodes 370 / 371 / 377 / 368   seed ${meta.seed}   ${elapsedSafe(meta.elapsed)}`;
  ctx.fillText(line, 20, banner + 22);

  function drawCol(img, x, title) {
    ctx.fillStyle = '#f3f5f8';
    ctx.font = 'bold 13px Segoe UI, sans-serif';
    ctx.fillText(title, x, banner + 48);
    const boxY = banner + 56;
    ctx.fillStyle = '#07080a';
    ctx.fillRect(x, boxY, colW, colH);
    const scale = Math.min(colW / img.width, colH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, x + (colW - w) / 2, boxY + (colH - h) / 2, w, h);
  }

  drawCol(baseImg, 24, 'INPUT  ·  node 370  (drawing)');
  if (styleImg) {
    drawCol(styleImg, 24 + colW + gap, 'STYLE  ·  node 371  (reference)');
  }
  return canvas.toDataURL('image/png');
}

function elapsedSafe(value) {
  return value || '—';
}

function showOutput(dataUrl, meta = {}) {
  els.outputPreview.onload = () => {
    els.outputRes.textContent = `${els.outputPreview.naturalWidth}\u00D7${els.outputPreview.naturalHeight}`;
  };
  els.outputPreview.src = dataUrl;
  els.outputPreview.classList.remove('hidden');
  els.outputViewer.querySelector('.canvas-placeholder')?.classList.add('hidden');
  els.exportBtn.disabled = false;

  if (meta.name) els.outputName.textContent = meta.name;
  if (meta.time) els.outputTime.textContent = meta.time;
  if (meta.resolution) els.outputRes.textContent = meta.resolution;
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
  els.outputName.textContent = item.name || '\u2014';
  els.outputTime.textContent = item.time || '\u2014';
  els.outputRes.textContent = item.resolution || '\u2014';
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

/* ------------------------------------------------------------------ */
/* Generate                                                            */
/* ------------------------------------------------------------------ */
async function handleGenerate() {
  if (state.isGenerating) return;

  if (!state.baseImageBase64) {
    setStatus('Error', 'Upload a base render in the Input panel', 'error');
    return;
  }

  state.isGenerating = true;
  els.generateBtn.disabled = true;
  els.outputLoading.classList.remove('hidden');
  setStatus('Mapping', 'Building ComfyUI workflow payload...', 'busy');

  const seedValue = els.seed.value.trim();
  const payload = {
    baseImageBase64: state.baseImageBase64,
    styleImageBase64: state.styleImageBase64,
    texturePrompt: els.texturePrompt.value,
    stylePreset: chips.style.getValues(),
    elements: chips.tags.getValues(),
    lighting: chips.lighting.getValues(),
    steps: Number(els.steps.value),
    cfg: Number(els.cfg.value),
    samplerName: els.samplerName.value,
    seed: seedValue && seedValue !== '-1' ? Number(seedValue) : undefined,
  };

  const start = startTimer();

  try {
    const result = await window.reimagine.generateRender(payload);
    const elapsed = stopTimer(start);

    if (result.mapped) {
      const exhibit = await buildMappingExhibit(
        state.baseImageBase64,
        state.styleImageBase64,
        { seed: result.seed, elapsed }
      );
      const name = `${state.baseStem || 'Render'}_MAPPED_${String(state.outputSeq + 1).padStart(4, '0')}.png`;
      state.outputSeq += 1;
      state.currentOutputBase64 = exhibit;
      showOutput(exhibit, { name, time: elapsed });
      addToHistory(exhibit, {
        name,
        time: elapsed,
        seed: result.seed,
        prompt: result.prompt,
      });
      setStatus(
        'Mapped',
        `Exhibit in Output (not a GPU render) · seed ${result.seed} · JSON saved`,
        'idle'
      );
      return;
    }

    const dataUrl = result.imageBase64.startsWith('data:')
      ? result.imageBase64
      : `data:image/png;base64,${result.imageBase64}`;

    const name = nextOutputName();

    state.currentOutputBase64 = dataUrl;
    showOutput(dataUrl, { name, time: elapsed });
    addToHistory(dataUrl, {
      name,
      time: elapsed,
      seed: result.seed,
      prompt: result.prompt,
    });
    setStatus('Idle', `Done in ${elapsed} \u00B7 seed ${result.seed}`, 'idle');
  } catch (error) {
    console.error(error);
    stopTimer(start);
    els.outputTime.textContent = '\u2014';
    setStatus('Error', error.message || 'Generation failed', 'error');
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
    defaultName: els.outputName.textContent.includes('_SFR_')
      ? els.outputName.textContent
      : `reimagine-${Date.now()}.png`,
  });
  if (result.saved) {
    setStatus('Idle', `Exported to ${result.filePath}`, 'idle');
  }
}

/* ------------------------------------------------------------------ */
/* Controls toggle                                                     */
/* ------------------------------------------------------------------ */
function setupControlsToggle() {
  els.controlsMode.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg');
    if (!btn) return;
    els.controlsMode.querySelectorAll('.seg').forEach((s) => s.classList.remove('active'));
    btn.classList.add('active');
    els.advancedControls.classList.toggle('hidden', btn.dataset.mode !== 'advance');
  });
}

/* ------------------------------------------------------------------ */
/* Window controls                                                     */
/* ------------------------------------------------------------------ */
function setupWindowControls() {
  document.getElementById('win-min').addEventListener('click', () =>
    window.reimagine.windowControl('minimize')
  );
  document.getElementById('win-max').addEventListener('click', () =>
    window.reimagine.windowControl('maximize')
  );
  document.getElementById('win-close').addEventListener('click', () =>
    window.reimagine.windowControl('close')
  );
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */
async function bootstrap() {
  chips.style = createMultiSelect(
    document.getElementById('style-presets'),
    PRESETS.style,
    'Select style presets'
  );
  chips.tags = createMultiSelect(document.getElementById('tags'), PRESETS.tags, 'Select tags');
  chips.lighting = createMultiSelect(
    document.getElementById('lighting'),
    PRESETS.lighting,
    'Select lighting style'
  );

  setupDropzone({
    zone: els.baseDropzone,
    input: els.baseInput,
    preview: els.basePreview,
    placeholderSelector: '.canvas-placeholder',
    clearBtn: els.baseClear,
    onFile: ({ dataUrl, file }) => {
      state.baseImageBase64 = dataUrl;
      state.baseStem = stripExt(file.name);
      els.inputName.textContent = file.name;
      els.basePreview.onload = () => {
        els.inputRes.textContent = `${els.basePreview.naturalWidth}\u00D7${els.basePreview.naturalHeight}`;
      };
    },
    onClear: () => {
      state.baseImageBase64 = null;
      state.baseStem = 'Render';
      els.inputName.textContent = '\u2014';
      els.inputRes.textContent = '\u2014';
    },
  });

  setupDropzone({
    zone: els.styleDropzone,
    input: els.styleInput,
    preview: els.stylePreview,
    placeholderSelector: '.dropzone-placeholder',
    clearBtn: els.styleClear,
    onFile: ({ dataUrl }) => {
      state.styleImageBase64 = dataUrl;
    },
    onClear: () => {
      state.styleImageBase64 = null;
    },
  });

  els.importBtn.addEventListener('click', () => els.baseInput.click());

  setupControlsToggle();
  setupWindowControls();
  renderHistory();

  els.generateBtn.addEventListener('click', handleGenerate);
  els.exportBtn.addEventListener('click', handleExport);
  els.historyFolder.addEventListener('click', () => window.reimagine.openRendersFolder());

  window.reimagine.onGenerationProgress(({ status }) => {
    if (status && state.isGenerating) setStatus('Generating', `RunPod: ${status}`, 'busy');
  });

  try {
    const config = await window.reimagine.getConfig();
    setStatus('Idle', config.readyMessage || '50% — workflow mapping', 'idle');
  } catch {
    setStatus('Idle', '50% — workflow mapping', 'idle');
  }
}

bootstrap();

# Sidma Labs Reimagine Render Engine

Electron desktop app that sends architectural wireframes and style references to a RunPod ComfyUI worker (`qwen_image_edit_2511` + Lightning LoRA) and displays photorealistic renders.

## Quick start

```bash
cd reimagine-render-engine
npm install
npm run convert-workflow
cp .env.example .env
# Edit .env with RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID
npm start
```

## Architecture

| Layer | Role |
|-------|------|
| `src/renderer/` | Three-column UI (controls, input canvas, output canvas) |
| `preload.js` | Secure IPC bridge — exposes `window.reimagine` (`generateRender`, `exportImage`, `getConfig`, `onGenerationProgress`) |
| `main.js` | IPC handlers (generation, PNG export dialog, config check) |
| `src/services/workflowBuilder.js` | Injects UI values into ComfyUI API nodes |
| `src/services/runpodClient.js` | POST `/run`, poll `/status/{id}` with configurable interval + timeout |
| `scripts/convert-workflow.js` | Converts a ComfyUI UI export into the API prompt format |
| `workflows/workflow.json` | ComfyUI UI export (your uploaded file) |
| `workflows/workflow-api.json` | Generated API prompt (run `npm run convert-workflow`) |

## Workflow node mapping

| UI input | ComfyUI node | Field |
|----------|--------------|-------|
| Base wireframe | **370** (`LoadImage`) | `inputs.image` |
| Style reference | **371** (`LoadImage`) | `inputs.image` |
| Tags + texture prompt | **377** (`TextEncodeQwenImageEditPlus`) | `inputs.prompt` |
| Steps / CFG / Sampler / Seed | **368** (`KSampler`) | `inputs.steps`, `inputs.cfg`, `inputs.sampler_name`, `inputs.seed` |

Defaults: 4 steps, CFG 1.0, sampler `euler`, random seed.

## RunPod payload

The client sends:

```json
{
  "input": {
    "workflow": { "...": "ComfyUI API prompt" },
    "images": [
      { "name": "reimagine_base.png", "image": "<base64>" },
      { "name": "reimagine_style.png", "image": "<base64>" }
    ]
  }
}
```

If your RunPod template uses a different input schema, adjust `src/services/runpodClient.js` → `submitJob()`.

## Figma

UI layout follows the [Render Engine design](https://www.figma.com/design/1ykPlNHOzuI1eowd5ZKxtA/Render-Egine?node-id=0-1&m=dev).

## Updating the workflow

1. Export an updated workflow from ComfyUI into `workflows/workflow.json`
2. Run `npm run convert-workflow`
3. Confirm nodes **368**, **370**, **371**, and **377** still exist
